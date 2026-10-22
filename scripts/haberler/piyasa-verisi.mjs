// Gerçek, gecikmeli piyasa verisini src/data/piyasa.json'a yazar. Örnek/tahmini değer üretilmez.
//
// Kaynaklar (doğrulandı 2026-10-10):
//  - Frankfurter (AECB referans kurları, anahtarsız): https://api.frankfurter.dev/v1/
//      /v1/<başlangıç>..<bitiş>?base=X&symbols=TRY  -> son iki iş günü (günlük değişim)
//      /v1/<tarih>?base=X&symbols=TRY               -> bir yıl öncesi (en yakın önceki iş günü)
//  - TCMB politika faizi: PPK 2026 sayfası (kurul karar duyurularının bağlantıları) ->
//      en son karar duyurusu -> "politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde N"
//      .../Para+Politikasi/PPK/<yıl> (yıl simdi'den türetilir; ocakta önceki yıl da taranır)
//  - BIST 100 ve ons altın: Yahoo Finance grafik API (XU100.IS, GC=F) -> son kapanış, günlük değişim, 3 aylık geçmiş
//  - Yıllık enflasyon (TÜİK TÜFE): TÜİK sayfaları JavaScript ile çiziliyor (nsiws 401, API 403), bu yüzden
//    TCMB "Enflasyon Verileri / Tüketici Fiyatları" tablosundan okunur (Ay-Yıl | yıllık % | aylık %).
//
// Kullanım: node scripts/haberler/piyasa-verisi.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentJson, hentMetin } from './lib.mjs';
import { YAHOO_KAYNAK } from './yahoo-seri.mjs'; // okura görünen nötr etiket

const FRANKFURTER = 'https://api.frankfurter.dev/v1';
const ppkUrl = (yil) =>
  `https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/PPK/${yil}`;
export const TUFE_URL =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Enflasyon+Verileri/Tuketici+Fiyatlari';
const TCMB = 'https://www.tcmb.gov.tr';
const DOSYA = fileURLToPath(new URL('../../src/data/piyasa.json', import.meta.url));

const FRANKFURTER_KAYNAK = { ad: 'Avrupa Merkez Bankası referans kuru', url: 'https://www.frankfurter.dev/' };
const TCMB_KAYNAK_AD = 'TCMB Para Politikası Kurulu';

// Kur göstergeleri. carpan: gösterilen birim (yen 100 birim başına).
const KURLAR = [
  { id: 'dolar', ad: 'Dolar / TL', base: 'USD', carpan: 1, simgeDegeri: 2, renk: 'blue', anlamAd: 'Doların' },
  { id: 'euro', ad: 'Euro / TL', base: 'EUR', carpan: 1, simgeDegeri: 2, renk: 'ochre', anlamAd: 'Euronun' },
  { id: 'yen', ad: '100 Japon yeni / TL', base: 'JPY', carpan: 100 },
];

// Borsa ve emtia göstergeleri: Yahoo Finance grafik verisi (anahtarsız). Günlük değişim ve son üç ay geçmişi buradan.
const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BORSA = [
  { id: 'bist100', ad: 'BIST 100', sembol: 'XU100.IS', simge: 'fabrika' },
  { id: 'altin', ad: 'Ons altın (USD)', sembol: 'GC=F', simge: 'altigen', onEk: '$' },
];

const yuvarla = (n, o) => Math.round(n * 10 ** o) / 10 ** o;
const gunStr = (d) => d.toISOString().slice(0, 10);

async function kurGostergesi(k, simdi) {
  const bitis = gunStr(simdi);
  // 90 günlük aralık: hem son iki iş günü (değişim) hem de mini grafik için geçmiş tek istekte alınır.
  const baslangic = gunStr(new Date(simdi.getTime() - 90 * 86400000));
  const yilOnce = gunStr(new Date(Date.UTC(simdi.getUTCFullYear() - 1, simdi.getUTCMonth(), simdi.getUTCDate())));
  const q = `base=${k.base}&symbols=TRY`;
  const [aralik, yil] = await Promise.all([
    hentJson(`${FRANKFURTER}/${baslangic}..${bitis}?${q}`),
    hentJson(`${FRANKFURTER}/${yilOnce}?${q}`),
  ]);
  const gunler = Object.keys(aralik.rates).sort();
  const son = gunler.at(-1);
  const oncekiGun = gunler.at(-2);
  const deger = aralik.rates[son].TRY * k.carpan;
  const onceki = yil.rates.TRY * k.carpan;
  if (!(deger > 0) || !(onceki > 0)) throw new Error(`Geçersiz kur: ${k.id}`);
  const g = {
    id: k.id,
    ad: k.ad,
    deger: yuvarla(deger, 4),
    ondalik: 2,
    simge: 'lira',
    onceki: yuvarla(onceki, 4),
    oncekiEtiket: 'Bir yıl önce',
    kaynak: FRANKFURTER_KAYNAK,
    zaman: `${son}T00:00:00+03:00`,
    gecerlilik: 'kur',
  };
  if (oncekiGun) g.degisim = yuvarla(((aralik.rates[son].TRY - aralik.rates[oncekiGun].TRY) / aralik.rates[oncekiGun].TRY) * 100, 1);
  g.gecmis = gunler.map((tarih) => ({ tarih, deger: yuvarla(aralik.rates[tarih].TRY * k.carpan, 4) }));
  if (k.simgeDegeri) {
    g.renk = k.renk;
    g.simgeDegeri = k.simgeDegeri;
    g.simgeEtiket = `${k.simgeDegeri} TL`;
    const yuzde = Math.round(((deger - onceki) / onceki) * 100);
    g.anlam = `${k.anlamAd} fiyatı bir yılda yüzde ${Math.abs(yuzde)} ${yuzde >= 0 ? 'arttı' : 'azaldı'}.`;
  }
  return g;
}

// Yahoo grafik yanıtını göstergeye çevirir: son kapanış, bir önceki kapanışa göre değişim, 90 gün geçmiş.
export function borsaGostergesiYanitindan(b, veri, simdi) {
  const sonuc = veri?.chart?.result?.[0];
  const kapanislar = sonuc?.indicators?.quote?.[0]?.close;
  if (!sonuc?.timestamp || !kapanislar) throw new Error(`Yahoo yanıtı geçersiz: ${b.sembol}`);
  const saatDilimi = sonuc.meta?.exchangeTimezoneName || 'Europe/Istanbul';
  const noktalar = sonuc.timestamp
    .map((t, i) => ({
      tarih: new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: saatDilimi }),
      deger: kapanislar[i],
    }))
    .filter((p) => p.deger > 0)
    .map((p) => ({ tarih: p.tarih, deger: yuvarla(p.deger, 4) }));
  if (noktalar.length < 2) throw new Error(`Yahoo geçmişi yetersiz: ${b.sembol}`);
  const sinir = gunStr(new Date(simdi.getTime() - 90 * 86400000));
  const son = noktalar.at(-1);
  const onceki = noktalar.at(-2);
  const g = {
    id: b.id,
    ad: b.ad,
    deger: son.deger,
    ondalik: 2,
    simge: b.simge,
    kaynak: YAHOO_KAYNAK,
    zaman: `${son.tarih}T00:00:00+03:00`,
    gecerlilik: 'kur',
    degisim: yuvarla(((son.deger - onceki.deger) / onceki.deger) * 100, 1),
    gecmis: noktalar.filter((p) => p.tarih >= sinir),
  };
  if (b.onEk) g.onEk = b.onEk;
  return g;
}

async function borsaGostergesi(b, simdi) {
  const veri = await hentJson(`${YAHOO}/${encodeURIComponent(b.sembol)}?range=3mo&interval=1d`);
  return borsaGostergesiYanitindan(b, veri, simdi);
}

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

// PPK sayfasındaki karar bağlantıları: [{ tarih: 'YYYY-MM-DD', href }]
export function kararBaglantilari(html) {
  const out = [];
  for (const m of html.matchAll(/<a[^>]*href="([^"]*basin\/\d{4}\/[^"]*)"[^>]*>\s*(\d{1,2})(?:\s|&nbsp;)+([^\s<&]+)(?:\s|&nbsp;)+(\d{4})\s*<\/a>/gi)) {
    const ay = AYLAR.indexOf(m[3].toLocaleLowerCase('tr-TR'));
    if (ay < 0) continue;
    out.push({ tarih: `${m[4]}-${String(ay + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`, href: m[1] });
  }
  return out.sort((a, b) => a.tarih.localeCompare(b.tarih));
}

// En yeni TCMB PPK karar metni: { tarih, url, metin, faiz }. Alınamaz/ayrıştırılamazsa hata fırlatır.
export async function tcmbSonKarar(simdi) {
  // Yıl simdi'den türetilir; ocakta önceki yılın listesine de bakılır.
  const yil = simdi.getUTCFullYear();
  const yillar = simdi.getUTCMonth() === 0 ? [yil, yil - 1] : [yil];
  const sayfalar = await Promise.allSettled(yillar.map((y) => hentMetin(ppkUrl(y))));
  const baglantilar = sayfalar
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => kararBaglantilari(r.value))
    .filter((b) => b.tarih <= gunStr(simdi))
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (sayfalar.every((r) => r.status === 'rejected')) throw new Error('PPK sayfası alınamadı');
  // Yalnızca en yeni KARAR metni kullanılır; toplantı özetleri atlanır. Alınamazsa ya da ayrıştırılamazsa
  // hata fırlatılır: eski bir karar güncelmiş gibi yayımlanmaz.
  for (const b of baglantilar) {
    const url = new URL(b.href, TCMB).href;
    const ham = await hentMetin(url);
    if (/<title>[^<]*Özeti/i.test(ham)) continue;
    const metin = ham.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
    // Değişiklik kararında metin "yüzde 37’den yüzde 36’ya" der: yeni oran ikinci sayıdır.
    const m = metin.match(/bir hafta vadeli repo ihale faiz oran\S*\s+yüzde\s+(\d+(?:,\d+)?)(?:\S*\s+yüzde\s+(\d+(?:,\d+)?))?/i);
    if (!m) throw new Error(`TCMB karar metni ayrıştırılamadı: ${url}`);
    const oran = m[2] ?? m[1];
    return { tarih: b.tarih, url, metin: metin.replace(/\s+/g, ' ').trim(), faiz: Number(oran.replace(',', '.')) };
  }
  throw new Error('TCMB karar duyurusu bulunamadı');
}

async function faizGostergesi(simdi) {
  const k = await tcmbSonKarar(simdi);
  return {
    id: 'faiz',
    ad: 'Politika faizi',
    deger: k.faiz,
    ondalik: 1,
    onEk: '%',
    simge: 'banka',
    kaynak: { ad: TCMB_KAYNAK_AD, url: k.url },
    zaman: `${k.tarih}T00:00:00+03:00`,
    gecerlilik: 'aciklama',
  };
}

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trSayi = (n) => String(n).replace('.', ',');

// TCMB "Enflasyon Verileri / Tüketici Fiyatları" tablosu: Ay-Yıl | TÜFE yıllık % | TÜFE aylık % (TÜİK verisi).
export function tufeSatirlari(html) {
  const out = [];
  for (const m of html.matchAll(
    /<td[^>]*>\s*(\d{2})-(\d{4})\s*<\/td>\s*<td[^>]*>\s*(-?\d+(?:\.\d+)?)\s*<\/td>(?:\s*<td[^>]*>\s*(-?\d+(?:\.\d+)?)\s*<\/td>)?/g,
  )) {
    const satir = { ay: Number(m[1]), yil: Number(m[2]), yillik: Number(m[3]) };
    if (m[4] != null) satir.aylik = Number(m[4]);
    out.push(satir);
  }
  return out;
}

async function enflasyonGostergesi() {
  const satirlar = tufeSatirlari(await hentMetin(TUFE_URL));
  if (satirlar.length === 0) throw new Error('TÜFE tablosu ayrıştırılamadı');
  const son = satirlar.reduce((a, b) => (b.yil * 12 + b.ay > a.yil * 12 + a.ay ? b : a));
  const once = satirlar.find((r) => r.yil === son.yil - 1 && r.ay === son.ay);
  if (!once) throw new Error('Bir yıl önceki TÜFE satırı yok');
  return {
    id: 'enflasyon',
    ad: 'Yıllık enflasyon',
    deger: son.yillik,
    // Aylık değişim: enflasyon karnesi (karne.mjs) aylık getirileri bununla karşılaştırır.
    ...(Number.isFinite(son.aylik) && { aylik: son.aylik }),
    ondalik: 1,
    onEk: '%',
    simge: 'sepet',
    renk: 'red',
    simgeDegeri: 3,
    simgeEtiket: '3 puan',
    onceki: once.yillik,
    oncekiEtiket: 'Bir yıl önce',
    anlam: `Fiyatlar bir yılda yüzde ${trSayi(son.yillik)} arttı. Bir yıl önce yıllık artış yüzde ${trSayi(once.yillik)} idi.`,
    kaynak: { ad: 'TÜİK, TCMB aracılığıyla', url: TUFE_URL },
    zamanEtiket: `${AY_ADLARI[son.ay - 1]} ${son.yil} verisi`,
    zaman: `${son.yil}-${String(son.ay).padStart(2, '0')}-01T00:00:00+03:00`,
    gecerlilik: 'aciklama',
  };
}

// Sıra: vitrin (dolar, enflasyon, euro) sonra çizelge. Bir kaynak başarısız olursa eski gerçek değer
// zamanıyla korunur; hiç alınmamış değer eklenmez.
export async function guncelle(eski, simdi = new Date()) {
  const gorevler = [
    ...KURLAR.map((k) => ({ id: k.id, al: () => kurGostergesi(k, simdi) })),
    { id: 'enflasyon', al: () => enflasyonGostergesi() },
    { id: 'faiz', al: () => faizGostergesi(simdi) },
    ...BORSA.map((b) => ({ id: b.id, al: () => borsaGostergesi(b, simdi) })),
  ];
  const sonuc = await Promise.all(
    gorevler.map(async ({ id, al }) => {
      try {
        return await al();
      } catch (e) {
        console.error(`[piyasa] ${id} alınamadı: ${e.message}`);
        return eski?.gostergeler?.find((g) => g.id === id);
      }
    }),
  );
  const gostergeler = sonuc.filter(Boolean);
  // Değerler değişmediyse zaman damgası da değişmez: aksi hâlde her tur piyasa.json'ı değiştirip yazısız turda
  // bile tam yayın tetikliyordu (ücretsiz plan denetimi B2, 21 Ekim). guncelleme = son veri değişimi.
  if (eski?.guncelleme && JSON.stringify(eski.gostergeler) === JSON.stringify(gostergeler)) return eski;
  return { guncelleme: simdi.toISOString(), gostergeler };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let eski;
  try {
    eski = JSON.parse(await readFile(DOSYA, 'utf8'));
  } catch {}
  const veri = await guncelle(eski);
  const json = JSON.stringify(veri, null, 2) + '\n';
  if (process.argv.includes('--yaz')) {
    await writeFile(DOSYA, json);
    console.log(`Yazıldı: ${DOSYA} (${veri.gostergeler.length} gösterge)`);
  } else {
    console.log(json);
  }
}
