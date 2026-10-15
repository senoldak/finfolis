// Veri sayfaları (/veri/…) ve hesaplayıcılar için resmi verileri src/data/resmi.json'a yazar.
// Yalnızca resmi, ücretsiz ve anahtarsız kaynaklar; değer asla tahmin edilmez ya da türetilmez.
//
// Kaynaklar (doğrulandı 15.10.2026):
//  - TCMB gösterge niteliğindeki döviz kurları: https://www.tcmb.gov.tr/kurlar/today.xml
//      geçmiş iş günleri: https://www.tcmb.gov.tr/kurlar/YYYYMM/GGAAYYYY.xml (tatil/hafta sonu 404)
//  - TCMB bir hafta vadeli repo ihale faiz oranı değişiklikleri (politika faizi geçmişi):
//      .../Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/1+Hafta+Repo (Tarih | Borç alma | Borç verme)
//  - Son PPK karar metni: piyasa-verisi.mjs tcmbSonKarar (PPK yıl sayfası -> karar duyurusu)
//  - TÜFE (TÜİK verisi) aylık ve yıllık değişim: TCMB "Enflasyon Verileri / Tüketici Fiyatları" tablosu
//
// Altın (gram) ve BIST 100 için resmi, ücretsiz ve anahtarsız bir kaynak bulunamadı (TCMB EVDS anahtar ister);
// bu yüzden burada yoktur.
//
// Bir kaynak alınamazsa o bölümün son bilinen değeri kendi tarihleriyle kalır. Veri değişmediyse dosyaya
// dokunulmaz (bot her çalıştığında boş commit oluşmasın).
//
// Kullanım: node scripts/haberler/resmi-veri.mjs [--yaz] [--gun 45]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin } from './lib.mjs';
import { tcmbSonKarar, tufeSatirlari, TUFE_URL } from './piyasa-verisi.mjs';

const DOSYA = fileURLToPath(new URL('../../src/data/resmi.json', import.meta.url));
export const KUR_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
export const REPO_URL =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/1+Hafta+Repo';
const arsivUrl = (g) => `https://www.tcmb.gov.tr/kurlar/${g.slice(0, 4)}${g.slice(5, 7)}/${g.slice(8, 10)}${g.slice(5, 7)}${g.slice(0, 4)}.xml`;

// Geçmişi tutulan kurlar (dolar, euro, sterlin sayfaları); geçmiş en fazla bu kadar iş günü.
export const GECMIS_KURLAR = ['USD', 'EUR', 'GBP'];
const GECMIS_UZUNLUK = 30;

const sayi = (s) => {
  const n = Number(String(s ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

// TCMB kur XML'i: { tarih: 'YYYY-MM-DD', bultenNo, kurlar: [{ kod, ad, birim, dovizAlis, dovizSatis, efektifAlis, efektifSatis }] }
export function kurXml(xml) {
  const bas = xml.match(/<Tarih_Date[^>]*\bTarih="(\d{2})\.(\d{2})\.(\d{4})"[^>]*>/);
  if (!bas) throw new Error('TCMB kur XML tarihi yok');
  const bulten = xml.match(/Bulten_No="([^"]*)"/)?.[1] ?? '';
  const kurlar = [];
  for (const m of xml.matchAll(/<Currency\b[^>]*\bKod="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g)) {
    const alan = (ad) => m[2].match(new RegExp(`<${ad}>([^<]*)</${ad}>`))?.[1]?.trim();
    const k = {
      kod: m[1],
      ad: alan('Isim') ?? m[1],
      birim: Number(alan('Unit') ?? 1) || 1,
      dovizAlis: sayi(alan('ForexBuying')),
      dovizSatis: sayi(alan('ForexSelling')),
      efektifAlis: sayi(alan('BanknoteBuying')),
      efektifSatis: sayi(alan('BanknoteSelling')),
    };
    // Döviz alış/satışı olmayan satırlar (ör. SDR) listeye girmez.
    if (k.dovizAlis && k.dovizSatis) kurlar.push(k);
  }
  if (!kurlar.some((k) => k.kod === 'USD')) throw new Error('TCMB kur XML ayrıştırılamadı');
  return { tarih: `${bas[3]}-${bas[2]}-${bas[1]}`, bultenNo: bulten, kurlar };
}

const gecmisSatiri = (b) => ({
  tarih: b.tarih,
  ...Object.fromEntries(
    GECMIS_KURLAR.map((kod) => {
      const k = b.kurlar.find((x) => x.kod === kod);
      return [kod, k ? { alis: k.dovizAlis, satis: k.dovizSatis } : null];
    }),
  ),
});

const gunStr = (d) => d.toISOString().slice(0, 10);

// Bugünün bülteni + eksik iş günlerinin arşivi. eskiGecmis'teki en son tarihten sonrası (yoksa son `gun` gün) doldurulur.
export async function kurlariAl(eski, simdi, gun = 14) {
  const bugun = kurXml(await hentMetin(KUR_URL));
  const gecmis = new Map((eski?.gecmis ?? []).map((s) => [s.tarih, s]));
  gecmis.set(bugun.tarih, gecmisSatiri(bugun));
  const sonBilinen = (eski?.gecmis ?? []).map((s) => s.tarih).sort().at(-1);
  const alt = gunStr(new Date(simdi.getTime() - gun * 86400000));
  const baslangic = sonBilinen && sonBilinen > alt ? sonBilinen : alt;
  for (let t = new Date(`${baslangic}T12:00:00Z`); gunStr(t) < bugun.tarih; t = new Date(t.getTime() + 86400000)) {
    const g = gunStr(t);
    const hafta = t.getUTCDay();
    if (gecmis.has(g) || hafta === 0 || hafta === 6) continue;
    try {
      const b = kurXml(await hentMetin(arsivUrl(g)));
      if (b.tarih === g) gecmis.set(g, gecmisSatiri(b));
    } catch {
      // Resmi tatil ya da arşivde olmayan gün: atlanır.
    }
  }
  return {
    tarih: bugun.tarih,
    bultenNo: bugun.bultenNo,
    kaynak: { ad: 'TCMB gösterge niteliğindeki döviz kurları', url: KUR_URL },
    liste: bugun.kurlar,
    gecmis: [...gecmis.values()].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, GECMIS_UZUNLUK),
  };
}

// TCMB 1 Hafta Repo tablosu: [{ tarih: 'YYYY-MM-DD', oran }] eskiden yeniye. Borç verme sütunu okunur.
export function repoSatirlari(html) {
  const out = [];
  for (const m of html.matchAll(
    /<tr[^>]*>\s*<td[^>]*>\s*(\d{2})\.(\d{2})\.(\d{4})\s*<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>\s*(\d+(?:[.,]\d+)?)\s*<\/td>/g,
  )) {
    out.push({ tarih: `${m[3]}-${m[2]}-${m[1]}`, oran: Number(m[4].replace(',', '.')) });
  }
  return out.sort((a, b) => a.tarih.localeCompare(b.tarih));
}

async function faiziAl(simdi) {
  const gecmis = repoSatirlari(await hentMetin(REPO_URL));
  if (gecmis.length < 5) throw new Error('TCMB repo tablosu ayrıştırılamadı');
  const son = gecmis.at(-1);
  let sonKarar = null;
  try {
    const k = await tcmbSonKarar(simdi);
    sonKarar = { tarih: k.tarih, oran: k.faiz, url: k.url };
  } catch (e) {
    console.error(`[resmi] son PPK kararı alınamadı: ${e.message}`);
  }
  // Karar metnindeki oran tablodaki son oranla uyuşmuyorsa (tablo henüz güncellenmemiş olabilir) karar metni yazılmaz;
  // sayfada çelişkili iki rakam görünmesin.
  if (sonKarar && sonKarar.oran !== son.oran) {
    console.error(`[resmi] karar metni (%${sonKarar.oran}) ile tablo (%${son.oran}) uyuşmuyor; karar bağlantısı atlandı`);
    sonKarar = null;
  }
  return {
    oran: son.oran,
    gecerlilik: son.tarih,
    sonKarar,
    kaynak: { ad: 'TCMB, bir hafta vadeli repo ihale faiz oranı', url: REPO_URL },
    gecmis,
  };
}

async function enflasyonuAl() {
  const satirlar = tufeSatirlari(await hentMetin(TUFE_URL))
    .filter((s) => Number.isFinite(s.yillik) && Number.isFinite(s.aylik))
    .sort((a, b) => a.yil * 12 + a.ay - (b.yil * 12 + b.ay));
  if (satirlar.length < 24) throw new Error('TÜFE tablosu ayrıştırılamadı');
  // Aylar kesintisiz olmalı: hesaplayıcı aylık değişimleri zincirler, eksik ay yanlış sonuç verir.
  for (let i = 1; i < satirlar.length; i++) {
    const a = satirlar[i - 1];
    const b = satirlar[i];
    if (b.yil * 12 + b.ay !== a.yil * 12 + a.ay + 1) throw new Error(`TÜFE tablosunda boşluk: ${a.ay}-${a.yil} → ${b.ay}-${b.yil}`);
  }
  return {
    kaynak: { ad: 'TÜİK verisi, TCMB Tüketici Fiyatları tablosu', url: TUFE_URL },
    satirlar: satirlar.map(({ yil, ay, yillik, aylik }) => ({ yil, ay, yillik, aylik })),
  };
}

// Bölümün verisi değiştiyse yeni hâli ve alınma zamanı; değişmediyse eskisi aynen (alınma zamanı dahil).
function birlestir(eski, yeni, iso) {
  if (!yeni) return eski;
  const { alinma: _a, ...eskiVeri } = eski ?? {};
  if (eski && JSON.stringify(eskiVeri) === JSON.stringify(yeni)) return eski;
  return { ...yeni, alinma: iso };
}

export async function guncelle(eski, simdi = new Date(), { gun = 14 } = {}) {
  const iso = simdi.toISOString();
  const dene = async (ad, f) => {
    try {
      return await f();
    } catch (e) {
      console.error(`[resmi] ${ad} alınamadı, son bilinen değer kalıyor: ${e.message}`);
      return null;
    }
  };
  const [kur, faiz, enflasyon] = await Promise.all([
    dene('kurlar', () => kurlariAl(eski?.kur, simdi, gun)),
    dene('faiz', () => faiziAl(simdi)),
    dene('enflasyon', () => enflasyonuAl()),
  ]);
  const sonuc = {};
  for (const [ad, yeni] of Object.entries({ kur, faiz, enflasyon })) {
    const b = birlestir(eski?.[ad], yeni, iso);
    if (b) sonuc[ad] = b;
  }
  return sonuc;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let eski;
  try {
    eski = JSON.parse(await readFile(DOSYA, 'utf8'));
  } catch {}
  const gi = process.argv.indexOf('--gun');
  const gun = gi > 0 ? Number(process.argv[gi + 1]) || 14 : 14;
  const veri = await guncelle(eski, new Date(), { gun });
  const json = JSON.stringify(veri, null, 2) + '\n';
  if (process.argv.includes('--yaz')) {
    if (eski && JSON.stringify(eski, null, 2) + '\n' === json) console.log('Resmi veri değişmedi.');
    else {
      await writeFile(DOSYA, json);
      console.log(`Yazıldı: ${DOSYA} (${Object.keys(veri).join(', ')})`);
    }
  } else {
    console.log(json);
  }
}
