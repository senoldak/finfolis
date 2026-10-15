// SEC EDGAR "getcurrent" Atom beslemeleri: halka arz başvuruları (S-1/F-1), fiyatlanan halka arzlar (424B4)
// ve yeni ETF/fon başvuruları (N-1A/485APOS). Yalnızca teklif büyüklüğü belgede okunabilenler aday olur.
import { sleep, hentMetin, USER_AGENT } from '../lib.mjs';
import { rakamKapagi, kaynakKapagi } from '../../kapak/kapak.mjs';
import { atomGirdileri, htmlMetni, trSayi } from './ortak.mjs';

const AZAMI_ADAY = 5; // halka arz
const AZAMI_ETF = 2; // ETF/fon kotası (halka arz sınırından ayrı)
const AZAMI_FON_DENEME = 10;
const FON_FORMLARI = ['N-1A', '485APOS'];
const AZAMI_DENEME = 14; // belge indirme sayısı üst sınırı (SEC hız sınırına saygı)
const AZAMI_BAYT = 300_000; // belgenin yalnızca başı okunur; kapak sayfasında büyüklük bulunur
const ARA_MS = 150;

const FORMLAR = [
  { tur: 'S-1', onem: 3 },
  { tur: 'F-1', onem: 3 },
  { tur: '424B4', onem: 4 },
  { tur: 'N-1A', onem: 2 },
  { tur: '485APOS', onem: 2 },
];
const beslemeUrl = (tur) => `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=${encodeURIComponent(tur)}&count=40&output=atom`;

// Belgenin ilk AZAMI_BAYT baytı (sunucu Range'i yok sayarsa akış erken kapatılır).
async function belgeBasi(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Range: `bytes=0-${AZAMI_BAYT - 1}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  const okuyucu = res.body.getReader();
  const parcalar = [];
  let toplam = 0;
  while (toplam < AZAMI_BAYT) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value);
    toplam += value.length;
  }
  await okuyucu.cancel().catch(() => {});
  return Buffer.concat(parcalar).toString('utf8');
}

// "$100 million" / "$6,000,000" -> dolar cinsinden sayı
function dolarDegeri(s) {
  const m = s.match(/\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s*(million|billion))?/i);
  if (!m) return NaN;
  const n = Number(m[1].replace(/,/g, ''));
  const k = m[2]?.toLowerCase();
  return k === 'billion' ? n * 1e9 : k === 'million' ? n * 1e6 : n;
}

// Belge metninden YALNIZCA açıkça etiketlenmiş teklif tutarını okur: { metin: '$100 million', deger }.
// Etiketsiz ilk dolar tutarı tahmin edilmez; bulunamazsa null.
export function teklifBuyuklugu(metin) {
  const m = metin.match(/(?:maximum aggregate offering price|aggregate offering price|gross proceeds)[^$]{0,150}(\$\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:million|billion))?)/i);
  if (!m) return null;
  const deger = dolarDegeri(m[1]);
  return deger >= 1_000_000 ? { metin: m[1].replace(/\s+/g, ' ').trim(), deger } : null;
}

// 6_000_000 -> "$6 milyon", 1_250_000_000 -> "$1,25 milyar"
function kisaTutar(deger) {
  const [bolen, birim] = deger >= 1e9 ? [1e9, 'milyar'] : [1e6, 'milyon'];
  return `$${trSayi(Math.round((deger / bolen) * 100) / 100)} ${birim}`;
}

// Dizin sayfasından ana belge bağlantısı (görsel ve düz .txt hariç).
function anaBelge(indexHtml) {
  for (const m of indexHtml.matchAll(/href="(\/Archives\/[^"]+\.html?)"/gi)) {
    if (!/-index\.html?$/i.test(m[1])) return new URL(m[1], 'https://www.sec.gov').href;
  }
  return null;
}

function baslikOlustur(tur, sirket, etf) {
  if (etf) return `${sirket} yeni ETF/fon için SEC'e ${tur} başvurusu yaptı`;
  if (tur === '424B4') return `${sirket} halka arzı için nihai izahname (424B4) SEC'e sunuldu`;
  return `${sirket} halka arz için SEC'e ${tur} başvurusu yaptı`;
}

const ALT = { 'S-1': 'Halka arz başvurusu (S-1)', 'F-1': 'Halka arz başvurusu (F-1)', '424B4': 'Halka arz nihai izahname (424B4)', 'N-1A': 'Yeni fon başvurusu (N-1A)', '485APOS': 'Yeni fon/ETF başvurusu (485APOS)' };
const ETF_AD_RE = /\bETFs?\b/; // fon/başvuran adında "ETF" (büyük harf)
// Belgenin kendi tanımı: "the Fund is an exchange-traded fund", "is an ETF", "shares of the Fund are listed on <borsa>".
// Yalnızca "ETF'lere yatırım yapar" gibi geçiş anmaları ETF sayılmaz.
const ETF_TANIM_RE = /\b(?:is|are) an? (?:[\w-]+ ){0,3}(?:exchange[- ]traded fund|ETF)\b|\bshares of the (?:fund|trust)\b[^.]{0,60}\b(?:are|will be) listed\b[^.]{0,80}\b(?:exchange|NYSE|Nasdaq|Cboe)/i;
export function etfMi(ad, belge, fonFormu) {
  if (ETF_AD_RE.test(ad)) return true;
  return fonFormu && ETF_TANIM_RE.test(belge); // halka arz formları adında ETF yoksa halka arz kalır
}

const IPO_RE = /initial public offering/i;

// Dönüş: { tip: 'ipo' | 'etf', aday } ya da null (kanıt yoksa).
async function adayla(g, form) {
  const sirket = g.baslik.match(/^\S+\s+-\s+(.+?)\s+\(\d{6,10}\)\s+\(/)?.[1] ?? g.baslik;
  const acc = g.kimlik.match(/accession-number=([\d-]+)/)?.[1];
  if (!acc) return null;
  const belgeUrl = anaBelge(await hentMetin(g.url));
  if (!belgeUrl) return null;
  await sleep(ARA_MS);
  const belge = htmlMetni(await belgeBasi(belgeUrl));
  const fonFormu = form.tur === 'N-1A' || form.tur === '485APOS';
  const etf = etfMi(sirket, belge, fonFormu);
  // Halka arz çerçevesi için belgede "initial public offering" geçmeli; fon için ETF ifadesi.
  if (fonFormu ? !etf : !etf && !IPO_RE.test(belge)) return null;
  const tip = etf ? 'etf' : 'ipo';
  // Teklif büyüklüğü belgeden güvenilir okunamıyor (ör. 424B4'te başka bir "$700 million" yakalandı,
  // gerçek büyüklük 45 milyon dolardı). Kapak ve kaynak özeti rakam taşımaz; rakamlar yalnızca
  // yazıda, belge metniyle doğrulanarak yer alır.
  const tutar = null;
  const tarihStr = g.tarih.toISOString().slice(0, 10);
  const kaynakMetni = [
    `${form.tur} filing by ${sirket}. Filed: ${tarihStr}. Accession number: ${acc}.${tutar ? ` Offering size: ${tutar.metin}.` : ''}`,
    belge.slice(0, 4000),
  ].join('\n');
  const kisaAd = sirket.length > 34 ? `${sirket.slice(0, 33)}…` : sirket;
  const kaynak = 'SEC EDGAR · sec.gov';
  const alt = ALT[form.tur];
  const kapak = tutar
    ? rakamKapagi({ kategori: 'borsa', ust: kisaAd, rakam: kisaTutar(tutar.deger), alt: `${alt} · teklif büyüklüğü`, kaynak })
    : kaynakKapagi({ kategori: 'borsa', konu: kisaAd, alt, kaynak });
  return {
    tip,
    aday: {
      id: `sec:${acc}`,
      baslik: baslikOlustur(form.tur, sirket, tip === 'etf'),
      tarih: g.tarih,
      onem: tip === 'etf' ? 2 : form.onem,
      kategori: 'borsa',
      bolge: 'abd',
      ucretli: false,
      kaynakMetni,
      kaynaklar: [{ ad: 'SEC EDGAR', url: g.url }],
      kapak,
      kapakAlt: tutar ? `${sirket}, ${alt}, teklif büyüklüğü ${kisaTutar(tutar.deger)}` : `${sirket}, ${alt}`,
    },
  };
}

export default {
  ad: 'sec',
  async hent(ctx = {}) {
    const sonuc = await Promise.allSettled(FORMLAR.map(async (f) => ({ f, girdiler: atomGirdileri(await hentMetin(beslemeUrl(f.tur))) })));
    for (const r of sonuc) if (r.status === 'rejected') console.error(`[sec] besleme alınamadı: ${r.reason?.message}`);
    if (sonuc.every((r) => r.status === 'rejected')) throw sonuc[0].reason;

    // Aynı başvuru tek sefer; "S-1/A" gibi değişiklikler elenir. İki kuyruk: halka arz formları ve fon formları.
    const gorulen = new Set();
    const ipoKuyruk = [];
    const fonKuyruk = [];
    for (const r of sonuc) {
      if (r.status !== 'fulfilled') continue;
      for (const g of r.value.girdiler) {
        if (g.tur !== r.value.f.tur || gorulen.has(g.kimlik)) continue;
        gorulen.add(g.kimlik);
        (FON_FORMLARI.includes(g.tur) ? fonKuyruk : ipoKuyruk).push({ g, f: r.value.f });
      }
    }
    const sirala = (k) => k.sort((a, b) => b.f.onem - a.f.onem || b.g.tarih - a.g.tarih);
    const sayac = { ipo: 0, etf: 0 };
    const kota = { ipo: AZAMI_ADAY, etf: AZAMI_ETF };
    const adaylar = [];
    for (const [kuyruk, azamiDeneme] of [[sirala(ipoKuyruk), AZAMI_DENEME], [sirala(fonKuyruk), AZAMI_FON_DENEME]]) {
      let deneme = 0;
      for (const { g, f } of kuyruk) {
        if (deneme >= azamiDeneme || (sayac.ipo >= kota.ipo && sayac.etf >= kota.etf)) break;
        deneme++;
        try {
          const r = await adayla(g, f);
          if (r && sayac[r.tip] < kota[r.tip]) {
            sayac[r.tip]++;
            adaylar.push(r.aday);
          }
        } catch (e) {
          console.error(`[sec] başvuru atlandı (${g.kimlik}): ${e.message}`);
        }
        await sleep(ARA_MS);
      }
    }
    return adaylar;
  },
};
