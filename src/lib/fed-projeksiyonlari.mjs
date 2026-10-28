// Fed Ekonomik Projeksiyonlar Özeti (SEP) ayrıştırıcısı. Kaynak yalnız federalreserve.gov:
//  - FOMC takvim sayfası: her toplantının "Projection Materials" bağlantıları (fomcprojtablYYYYMMDD.htm)
//  - Her SEP'in erişilebilir HTML sayfası: Tablo 1 (medyanlar), Şekil 2 (nokta grafiği dağılımı)
// Gerçekleşen faiz için FRED'in DFEDTARU / DFEDTARL serileri (hedef aralığın üst/alt sınırı) kullanılır.
// Burada hiçbir rakam elle yazılmaz; kaynakta olmayan hücre null kalır.
import { fredCsvAyristir } from './abd-tahvilleri.mjs';

export const FED_ORIJIN = 'https://www.federalreserve.gov';
export const TAKVIM_URL = `${FED_ORIJIN}/monetarypolicy/fomccalendars.htm`;
// 2023 Mart'tan bu yana (kullanıcı kapsamı).
export const ILK_TARIH = '2023-01-01';

const DEGISKENLER = ['gsyh', 'issizlik', 'pce', 'cekirdekPce', 'faiz'];

// HTML hücresinden düz metin: etiketler, dipnot üst simgeleri ve varlıklar atılır.
function duzMetin(h) {
  return h
    .replace(/<sup[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/−/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// "2.3" -> 2.3, "2.2–2.4" -> [2.2, 2.4], boş -> null.
export function degerAyristir(metin) {
  const m = String(metin ?? '').trim();
  if (!m) return null;
  if (/^-?\d+(\.\d+)?$/.test(m)) return Number(m);
  const r = m.match(/^(-?\d+(?:\.\d+)?)\s*[–—]\s*(-?\d+(?:\.\d+)?)$/);
  if (r) return [Number(r[1]), Number(r[2])];
  return null;
}

// Sayfadaki "tablehead" başlıklı tabloları [{ baslik, satirlar: [{ hucreler, ongoru }] }] olarak verir.
export function tablolariAyir(html) {
  const sonuc = [];
  const re = /<h4[^>]*class="tablehead"[^>]*>([\s\S]*?)<\/h4>((?:(?!<h4)[\s\S])*?)<table[^>]*>([\s\S]*?)<\/table>/g;
  for (const m of html.matchAll(re)) {
    const satirlar = [];
    for (const tr of m[3].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const hucreler = [...tr[1].matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/g)].map((c) => ({
        etiket: c[1],
        nitelik: c[2],
        metin: duzMetin(c[3]),
      }));
      if (hucreler.length) satirlar.push(hucreler);
    }
    sonuc.push({ baslik: duzMetin(m[1]), satirlar });
  }
  return sonuc;
}

const yilEtiketi = (s) => (/^longer run$/i.test(s) ? 'uzun' : /^\d{4}$/.test(s) ? Number(s) : null);

function degiskenAdi(etiket) {
  if (/^Change in real GDP/i.test(etiket)) return 'gsyh';
  if (/^Unemployment rate/i.test(etiket)) return 'issizlik';
  if (/^Core PCE/i.test(etiket)) return 'cekirdekPce';
  if (/^PCE inflation/i.test(etiket)) return 'pce';
  if (/^Federal funds rate/i.test(etiket)) return 'faiz';
  return null;
}

// Tablo 1: her değişken için medyan, bir önceki SEP'in medyanı, orta eğilim ve aralık (yıl sırasıyla).
export function tablo1Ayristir(tablo) {
  const baslikSatiri = tablo.satirlar.find((s) => s.filter((h) => yilEtiketi(h.metin) != null).length >= 3);
  if (!baslikSatiri) throw new Error('Tablo 1: yıl başlıkları bulunamadı');
  const tumYillar = baslikSatiri.map((h) => yilEtiketi(h.metin)).filter((y) => y != null);
  const n = tumYillar.length / 3;
  if (!Number.isInteger(n) || n < 2) throw new Error(`Tablo 1: beklenmeyen sütun sayısı ${tumYillar.length}`);
  const yillar = tumYillar.slice(0, n);
  const degiskenler = {};
  let sonAd = null;
  for (const satir of tablo.satirlar) {
    const [stub, ...veri] = satir;
    if (!stub || stub.etiket !== 'th' || veri.length !== 3 * n) continue;
    const onceki = /\bin1\b/.test(stub.nitelik);
    const ad = onceki ? sonAd : degiskenAdi(stub.metin);
    if (!ad) continue;
    const d = veri.map((h) => degerAyristir(h.metin));
    const bolum = (k) => d.slice(k * n, (k + 1) * n);
    if (onceki) {
      degiskenler[ad].onceki = bolum(0);
      if (ad === 'faiz') degiskenler[ad].oncekiAralik = bolum(2);
    } else {
      sonAd = ad;
      degiskenler[ad] = { medyan: bolum(0), onceki: null, ortaEgilim: bolum(1), aralik: bolum(2) };
    }
  }
  for (const ad of DEGISKENLER) {
    if (!degiskenler[ad]) throw new Error(`Tablo 1: "${ad}" satırı yok`);
    // Medyan hücreleri sayı olmalı (ya da kaynakta boşsa null); aralık gibi bir şey gelirse ayrıştırma bozuk demektir.
    if (degiskenler[ad].medyan.some((v) => Array.isArray(v))) throw new Error(`Tablo 1: "${ad}" medyanı sayı değil`);
  }
  return { yillar, degiskenler };
}

// Şekil 2: nokta grafiği dağılımı. Her satır bir orta nokta oranı, her sütun bir yıl; hücre katılımcı sayısı.
export function sekil2Ayristir(tablo) {
  const [baslik, ...govde] = tablo.satirlar;
  const yillar = baslik.slice(1).map((h) => yilEtiketi(h.metin));
  if (!yillar.length || yillar.some((y) => y == null)) throw new Error('Şekil 2: yıl başlıkları bulunamadı');
  const satirlar = [];
  for (const s of govde) {
    const oran = degerAyristir(s[0].metin);
    if (typeof oran !== 'number') continue;
    const sayilar = yillar.map((_, i) => {
      const v = degerAyristir(s[i + 1]?.metin);
      return typeof v === 'number' ? v : null;
    });
    if (sayilar.some((v) => v != null)) satirlar.push({ oran, sayilar });
  }
  if (!satirlar.length) throw new Error('Şekil 2: dağılım boş');
  // En yüksek orandan en düşüğe, Fed'in çizimindeki sırayla.
  satirlar.sort((a, b) => b.oran - a.oran);
  return { yillar, satirlar };
}

// Dağılımdan sütun başına katılımcı sayısı.
export function katilimciSayilari(nokta) {
  return nokta.yillar.map((_, i) => nokta.satirlar.reduce((t, s) => t + (s.sayilar[i] ?? 0), 0));
}

// Dağılımdan sütunun medyanı (çift sayıda katılımcıda ortadaki ikisinin ortalaması). Kontrol amaçlı.
export function noktaMedyani(nokta, sutun) {
  const dizi = [];
  for (const s of nokta.satirlar) for (let k = 0; k < (s.sayilar[sutun] ?? 0); k++) dizi.push(s.oran);
  if (!dizi.length) return null;
  dizi.sort((a, b) => a - b);
  const o = dizi.length >> 1;
  return dizi.length % 2 ? dizi[o] : (dizi[o - 1] + dizi[o]) / 2;
}

// Bir SEP sayfasından sayfa bağlantısı ve tarihle birlikte tüm kayıt.
export function sepAyristir(html, { tarih, url }) {
  const tablolar = tablolariAyir(html);
  const t1 = tablolar.find((t) => /^Table 1\b/.test(t.baslik));
  const s2 = tablolar.find((t) => /^Figure 2\b/.test(t.baslik));
  if (!t1) throw new Error('Tablo 1 yok');
  if (!s2) throw new Error('Şekil 2 yok');
  const { yillar, degiskenler } = tablo1Ayristir(t1);
  const nokta = sekil2Ayristir(s2);
  // Şekil 2 sütunları Tablo 1 yıllarıyla aynı olmalı.
  if (JSON.stringify(nokta.yillar) !== JSON.stringify(yillar)) throw new Error('Şekil 2 ve Tablo 1 yılları uyuşmuyor');
  return { tarih, url, yillar, degiskenler, nokta, katilimci: katilimciSayilari(nokta) };
}

// Takvim sayfasındaki SEP bağlantıları: tarihe göre eskiden yeniye, ILK_TARIH'ten itibaren.
export function takvimLinkleri(html, ilk = ILK_TARIH) {
  const gorulen = new Map();
  for (const m of html.matchAll(/href="((?:https:\/\/www\.federalreserve\.gov)?\/monetarypolicy\/fomcprojtabl(\d{4})(\d{2})(\d{2})\.htm)"/g)) {
    const tarih = `${m[2]}-${m[3]}-${m[4]}`;
    if (tarih < ilk) continue;
    gorulen.set(tarih, { tarih, url: m[1].startsWith('http') ? m[1] : `${FED_ORIJIN}${m[1]}` });
  }
  return [...gorulen.values()].sort((a, b) => a.tarih.localeCompare(b.tarih));
}

// FRED DFEDTARU (üst) ve DFEDTARL (alt) günlük serilerinden: yıl sonu ve çeyrek sonu orta noktalar ve son gözlem.
// Orta nokta = (üst + alt) / 2, Fed'in SEP'te kullandığı ölçü.
export function gerceklesenFaiz(ustCsv, altCsv) {
  const ust = fredCsvAyristir(ustCsv);
  const alt = fredCsvAyristir(altCsv);
  const gunler = [...ust.keys()].filter((g) => alt.has(g)).sort();
  if (!gunler.length) throw new Error('FRED serisi boş');
  const orta = (g) => Math.round(((ust.get(g) + alt.get(g)) / 2) * 1e4) / 1e4;
  const son = gunler.at(-1);
  // Verilen tarihe (dahil) kadarki son gözlem.
  const kadar = (tarih) => {
    let bulunan = null;
    for (const g of gunler) {
      if (g <= tarih) bulunan = g;
      else break;
    }
    return bulunan;
  };
  const yilSonu = {};
  const ceyrekSonu = [];
  const ilkYil = Number(gunler[0].slice(0, 4));
  const sonYil = Number(son.slice(0, 4));
  for (let y = ilkYil; y <= sonYil; y++) {
    const bitis = `${y}-12-31`;
    const g = kadar(bitis);
    if (g && g.slice(0, 4) === String(y)) {
      yilSonu[y] = { tarih: g, ust: ust.get(g), alt: alt.get(g), orta: orta(g), tamam: son >= bitis };
    }
    for (let c = 1; c <= 4; c++) {
      const ay = c * 3;
      const gunSayisi = new Date(Date.UTC(y, ay, 0)).getUTCDate();
      const ceyrekBitis = `${y}-${String(ay).padStart(2, '0')}-${String(gunSayisi).padStart(2, '0')}`;
      if (son < ceyrekBitis) continue; // çeyrek bitmedi
      const gc = kadar(ceyrekBitis);
      if (gc) ceyrekSonu.push({ yil: y, ceyrek: c, tarih: gc, orta: orta(gc) });
    }
  }
  return { sonGozlem: { tarih: son, ust: ust.get(son), alt: alt.get(son), orta: orta(son) }, yilSonu, ceyrekSonu };
}

// SEP tarihinden yıl (projeksiyonun "bu yıl" sütunu) ve çeyrek (1–4: Mart, Haziran, Eylül, Aralık).
export function sepDonemi(tarih) {
  const yil = Number(tarih.slice(0, 4));
  const ay = Number(tarih.slice(5, 7));
  return { yil, ceyrek: Math.ceil(ay / 3) };
}

// Her SEP'in "bu yıl sonu" faiz medyanı ile gerçekleşen yıl sonu orta noktası karşılaştırması.
export function gecmisKarsilastirma(sepler, gerceklesen) {
  return sepler.map((s) => {
    const { yil, ceyrek } = sepDonemi(s.tarih);
    const sutun = s.yillar.indexOf(yil);
    const medyan = sutun >= 0 ? s.degiskenler.faiz.medyan[sutun] : null;
    const g = gerceklesen?.yilSonu?.[yil] ?? null;
    let gercek = null;
    let tamam = false;
    let gercekTarih = null;
    if (g) {
      gercek = g.orta;
      tamam = g.tamam;
      gercekTarih = g.tarih;
    } else if (gerceklesen?.sonGozlem?.tarih.startsWith(String(yil))) {
      gercek = gerceklesen.sonGozlem.orta;
      gercekTarih = gerceklesen.sonGozlem.tarih;
    }
    const fark = medyan != null && gercek != null ? Math.round((gercek - medyan) * 1e3) / 1e3 : null;
    return { tarih: s.tarih, yil, ceyrek, medyan, gercek, gercekTarih, tamam, fark };
  });
}
