// Merkez bankası duyuruları: Fed, ECB, BoJ (RSS) ve TCMB (PPK karar metni).
// Faiz kararı onem 100, diğer para politikası duyuruları onem 60 (0–100 ölçeği); geri kalanı atılır.
// Kapak: Fed, ECB ve TCMB'de politika faizinin son beş yıllık grafiği (grafik-kapak.mjs); alınamazsa faiz rakamı ya da
// konu kartı. BoJ için resmî, anahtarsız günlük seri yok: rakam/konu kartı.
import { hentMetin } from '../lib.mjs';
import { tcmbSonKarar } from '../piyasa-verisi.mjs';
import { kaynakKapagi, rakamKapagi } from '../../kapak/kapak.mjs';
import { faizGrafigi } from '../grafik-kapak.mjs';
import { rssOgeleri, htmlMetni, trSayi } from './ortak.mjs';

const GUN_MS = 86400000;
const AZAMI_GUN = 7; // bundan eski duyurular aday olmaz
const AZAMI_METIN = 15000;
const BOLGE = { Fed: 'abd', ECB: 'avrupa', BoJ: 'asya' };

const FED = { kurum: 'Fed', ad: 'Federal Reserve', rss: 'https://www.federalreserve.gov/feeds/press_all.xml' };
const ECB = { kurum: 'ECB', ad: 'Avrupa Merkez Bankası', rss: 'https://www.ecb.europa.eu/rss/press.html' };
const BOJ = { kurum: 'BoJ', ad: 'Japonya Merkez Bankası', rss: 'https://www.boj.or.jp/en/rss/whatsnew.xml' };

// Duyuruyu sınıflar: 'karar' (faiz kararı), 'politika' (diğer para politikası) ya da null.
function siniflandir(kurum, o) {
  const b = o.baslik;
  if (kurum === 'Fed') {
    if (/FOMC statement|Federal Open Market Committee (?:statement|announces)/i.test(b)) return 'karar';
    if (/FOMC|monetary policy|discount rate|open market|minutes/i.test(b) || /monetary/i.test(o.kategori)) return 'politika';
  } else if (kurum === 'ECB') {
    if (/^monetary policy decisions?\b/i.test(b)) return 'karar';
    if (/monetary policy|key ECB interest rates/i.test(b) || /\/press\/accounts\//.test(o.url)) return 'politika';
  } else if (kurum === 'BoJ') {
    if (/Statement on Monetary Policy/i.test(b)) return 'karar';
    if (/monetary policy|outlook for economic activity|minutes/i.test(b)) return 'politika';
  }
  return null;
}

// "3-1/2" -> 3.5, "4" -> 4
function kesirliSayi(s) {
  const m = s.match(/^(\d+)(?:-(\d+)\/(\d+))?$/);
  if (!m) return NaN;
  return Number(m[1]) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
}

// Metinden politika faizini ayrıştırır: { rakam: '%3,50–3,75', ust } ya da null.
export function faizCoz(kurum, metin) {
  if (kurum === 'Fed') {
    const m = metin.match(/target range for the federal funds rate (?:at|to) (\d+(?:-\d+\/\d+)?) to (\d+(?:-\d+\/\d+)?) percent/i);
    if (m) {
      const [a, b] = [kesirliSayi(m[1]), kesirliSayi(m[2])];
      if (Number.isFinite(a) && Number.isFinite(b)) return { dusuk: a, yuksek: b, rakam: `%${trSayi(a, 2)}–${trSayi(b, 2)}`, ust: 'Fed politika faizi (hedef aralık)', index: m.index };
    }
  } else if (kurum === 'ECB') {
    const m = metin.match(/interest rate on the deposit facility[^.]*?(?:to|at)\s+(\d+(?:\.\d+)?)\s?%/i);
    if (m) return { dusuk: Number(m[1]), yuksek: Number(m[1]), rakam: `%${trSayi(m[1])}`, ust: 'ECB mevduat faizi', index: m.index };
  }
  return null;
}

async function kapakUret({ kurum, ad, tur, faiz, url, tarih, grafik = faizGrafigi }) {
  const kategori = tur === 'karar' ? 'piyasalar' : 'ekonomi';
  const kaynak = `${ad} · ${new URL(url).hostname}`;
  const konu = tur === 'karar' ? `${ad} faiz kararı` : `${ad} para politikası duyurusu`;
  const g = await grafik({ kurum, konu, kategori, tarih: tarih instanceof Date && !Number.isNaN(tarih.getTime()) ? tarih : new Date(), yeni: faiz?.yuksek });
  if (g) return g;
  if (faiz) return { kapak: rakamKapagi({ kategori, ust: faiz.ust, rakam: faiz.rakam, alt: `${ad} faiz kararı`, kaynak }), kapakAlt: `${faiz.ust} ${faiz.rakam}` };
  // Alt satıra kaynağın İngilizce başlığı yazılmaz; kapakta yalnızca Türkçe konu durur.
  return { kapak: kaynakKapagi({ kategori, konu, kaynak }), kapakAlt: konu };
}

// Uzun metni keser ama faiz cümlesi (index) her zaman pencerede kalır.
export function pencere(metin, index) {
  if (metin.length <= AZAMI_METIN) return metin;
  if (index == null || index < AZAMI_METIN - 1500) return metin.slice(0, AZAMI_METIN);
  return `${metin.slice(0, AZAMI_METIN / 2)} … ${metin.slice(Math.max(0, index - 1500), index + 1500)}`;
}

// Fed tutanak bülteni yalnızca "tutanak yayımlandı" der; asıl metin linklenen sayfadadır.
const FED_TUTANAK = /href="([^"]*\/monetarypolicy\/fomcminutes\d{8}\.htm)"/i;

// Tam sayfa metni (script/style atılmış) ve varsa takip edilen asıl belgenin URL'si;
// kesme çağıranda pencere() ile yapılır.
async function govdeMetni(url, baslik) {
  if (/\.pdf($|\?)/i.test(url)) return { metin: baslik }; // PDF metni ayrıştırılmaz
  let html;
  try {
    html = await hentMetin(url);
  } catch {
    return { metin: baslik }; // gövde alınamazsa başlıkla devam; rakam içermeyen haber zaten doğrulamadan geçer
  }
  const link = html.match(FED_TUTANAK)?.[1];
  if (link) {
    const belge = new URL(link, url).href;
    try {
      const metin = htmlMetni(await hentMetin(belge));
      if (metin) return { metin, belge };
    } catch {
      // tutanak sayfası alınamazsa bülten metniyle devam
    }
  }
  return { metin: htmlMetni(html) || baslik };
}

async function rssKaynagi(k, simdi, grafik) {
  const ogeler = rssOgeleri(await hentMetin(k.rss));
  const adaylar = [];
  for (const o of ogeler) {
    try {
      if (simdi - o.tarih > AZAMI_GUN * GUN_MS) continue;
      const tur = siniflandir(k.kurum, o);
      if (!tur) continue;
      const { metin: tam, belge } = await govdeMetni(o.url, o.baslik);
      const faiz = tur === 'karar' ? faizCoz(k.kurum, tam) : null;
      const kaynakMetni = pencere(tam, faiz?.index);
      adaylar.push({
        id: `${k.kurum.toLowerCase()}:${o.url}`,
        baslik: o.baslik,
        tarih: o.tarih,
        onem: tur === 'karar' ? 100 : 60,
        kategori: tur === 'karar' ? 'piyasalar' : 'ekonomi',
        bolge: BOLGE[k.kurum],
        ucretli: false,
        kaynakMetni,
        kaynaklar: belge ? [{ ad: k.ad, url: o.url }, { ad: `${k.ad} tutanak metni`, url: belge }] : [{ ad: k.ad, url: o.url }],
        ...(await kapakUret({ kurum: k.kurum, ad: k.ad, tur, faiz, url: o.url, tarih: o.tarih, grafik })),
      });
    } catch (e) {
      console.error(`[${k.kurum}] kayıt atlandı: ${e.message}`);
    }
  }
  return adaylar;
}

async function tcmbKaynagi(simdi, grafik = faizGrafigi) {
  const k = await tcmbSonKarar(simdi);
  const tarih = new Date(`${k.tarih}T00:00:00+03:00`);
  if (simdi - tarih > AZAMI_GUN * GUN_MS) return [];
  const rakam = `%${trSayi(k.faiz, 1)}`;
  const ad = 'TCMB Para Politikası Kurulu';
  const g = await grafik({ kurum: 'TCMB', konu: `TCMB politika faizi ${rakam}`, kategori: 'piyasalar', tarih, yeni: k.faiz });
  return [
    {
      id: `tcmb:${k.url}`,
      baslik: 'TCMB politika faizini açıkladı',
      tarih,
      onem: 100,
      kategori: 'piyasalar',
      bolge: 'kuresel',
      ucretli: false,
      kaynakMetni: pencere(k.metin, k.metin.search(/bir hafta vadeli repo ihale faiz/i)),
      kaynaklar: [{ ad, url: k.url }],
      ...(g ?? {
        kapak: rakamKapagi({ kategori: 'piyasalar', ust: 'TCMB politika faizi', rakam, alt: 'Para Politikası Kurulu kararı', kaynak: 'TCMB · tcmb.gov.tr' }),
        kapakAlt: `TCMB politika faizi ${rakam}`,
      }),
    },
  ];
}

export default {
  ad: 'merkez-bankalari',
  // Bir kaynak çökerse diğerleri çalışır; hepsi çökerse hata fırlatılır (orkestratör karar verir).
  async hent(ctx = {}) {
    const simdi = ctx.simdi ?? new Date();
    const grafik = ctx.faizGrafigi ?? faizGrafigi;
    const gorevler = [rssKaynagi(FED, simdi, grafik), rssKaynagi(ECB, simdi, grafik), rssKaynagi(BOJ, simdi, grafik), tcmbKaynagi(simdi, grafik)];
    const sonuc = await Promise.allSettled(gorevler);
    for (const r of sonuc) if (r.status === 'rejected') console.error(`[merkez-bankalari] kaynak alınamadı: ${r.reason?.message}`);
    if (sonuc.every((r) => r.status === 'rejected')) throw sonuc[0].reason;
    return sonuc.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
