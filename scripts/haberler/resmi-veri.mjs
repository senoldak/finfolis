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
//  - TCMB EVDS (ücretsiz anahtar, EVDS_API_KEY; doğrulandı 22.10.2026): konut fiyat endeksi (TCMB) ve mevsimsellikten
//      arındırılmış işsizlik oranı (TÜİK). Yıllık değişim EVDS'nin kendi formülüyle (formulas=3) alınır, burada hesaplanmaz.
//      Anahtar yoksa bu iki bölüm atlanır, son bilinen değer kalır.
//    Piyasa Katılımcıları Anketi (TCMB, EVDS; doğrulandı 27.10.2026): 12 ve 24 ay sonrası yıllık TÜFE beklentisi. Anket
//      sonucudur, sitenin tahmini değildir; kur ve faiz beklentileri bilerek alınmaz.
//    Kira, kartlı harcama, tüketici güveni, reel efektif kur, TCMB rezervleri, kapasite kullanımı, haftalık kur, kredi ve
//      mevduat faizleri, konut birim fiyat ve kiraları, arındırılmış TÜFE; yabancıların portföy akımları, cari denge,
//      dış borç, dış ticaret, sanayi üretimi, genel bütçe ve kredi hacmi: evds-ek.mjs.
//
// Altın (gram) için resmi, ücretsiz bir günlük kaynak bulunamadı. BIST 100 EVDS'de var ama Borsa İstanbul verisinin
// yeniden yayımı lisansa bağlı; bu yüzden ikisi de burada yoktur.
//
// Bir kaynak alınamazsa o bölümün son bilinen değeri kendi tarihleriyle kalır. Veri değişmediyse dosyaya
// dokunulmaz (bot her çalıştığında boş commit oluşmasın).
//
// Kullanım: node scripts/haberler/resmi-veri.mjs [--yaz] [--gun 45]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin } from './lib.mjs';
import { tcmbSonKarar, tufeSatirlari, TUFE_URL } from './piyasa-verisi.mjs';
import { rezerviAl } from './tcmb-rezerv.mjs';
import { piyasaFaizleriniAl } from './tcmb-piyasa-faizleri.mjs';
import { mevduatiAl } from './tcmb-mevduat.mjs';
import {
  kiraAl,
  kartAl,
  guvenAl,
  rekAl,
  kapasiteAl,
  brutRezervAl,
  kurHaftalikAl,
  makasAl,
  birimFiyatAl,
  tufeArindirilmisAl,
  portfoyHaftalikAl,
  portfoyAylikAl,
  cariAl,
  disBorcAl,
  disTicaretAl,
  sanayiAl,
  butceAl,
  krediAl,
} from './evds-ek.mjs';

const DOSYA = fileURLToPath(new URL('../../src/data/resmi.json', import.meta.url));
export const KUR_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
export const REPO_URL =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/1+Hafta+Repo';
const arsivUrl = (g) => `https://www.tcmb.gov.tr/kurlar/${g.slice(0, 4)}${g.slice(5, 7)}/${g.slice(8, 10)}${g.slice(5, 7)}${g.slice(0, 4)}.xml`;

// Geçmişi tutulan kurlar (dolar, euro, sterlin sayfaları); geçmiş en fazla bu kadar iş günü.
export const GECMIS_KURLAR = ['USD', 'EUR', 'GBP'];
const GECMIS_UZUNLUK = 30;

export const EVDS_URL = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
// Konut fiyat endeksi: Türkiye ve üç büyük il (İBBS 2. düzey bölge kodları).
export const KONUT_BOLGELERI = [
  { kod: 'TR', ad: 'Türkiye' },
  { kod: 'TR10', ad: 'İstanbul' },
  { kod: 'TR51', ad: 'Ankara' },
  { kod: 'TR31', ad: 'İzmir' },
];
export const ISSIZLIK_SERISI = 'TP.TIG08';
const EVDS_AY = 36;
export const BEKLENTI_SERILERI = { ay12: 'TP.PKAUO.S01.E.U', ay24: 'TP.PKAUO.S01.F.U' };
const BEKLENTI_AY = 120;

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

// EVDS seri isteği: [{ yil, ay, <alan>: sayı | null }] eskiden yeniye. Alan adı seri kodunun noktası alt çizgi olmuş
// hâlidir, formüllü seride sonuna '-<formül>' eklenir (TP_KFE_TR-3).
export async function evdsAylik(seriler, formuller, simdi, anahtar, ay = EVDS_AY) {
  const g = (d) => `01-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
  const bas = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth() - ay, 1));
  const url = `${EVDS_URL}/series=${seriler.join('-')}&startDate=${g(bas)}&endDate=${g(simdi)}&type=json&formulas=${formuller.join('-')}`;
  const veri = JSON.parse(await hentMetin(url, { headers: { key: anahtar } }));
  if (!Array.isArray(veri?.items)) throw new Error('EVDS yanıtı ayrıştırılamadı');
  return veri.items
    .map((it) => {
      const m = String(it.Tarih ?? '').match(/^(\d{4})-(\d{1,2})$/);
      if (!m) return null;
      const satir = { yil: Number(m[1]), ay: Number(m[2]) };
      seriler.forEach((sr, i) => {
        const alan = sr.replaceAll('.', '_') + (formuller[i] ? `-${formuller[i]}` : '');
        const n = it[alan] == null || it[alan] === '' ? NaN : Number(it[alan]);
        satir[alan] = Number.isFinite(n) ? n : null;
      });
      return satir;
    })
    .filter(Boolean)
    .sort((a, b) => a.yil * 12 + a.ay - (b.yil * 12 + b.ay));
}

// Değeri henüz yayımlanmamış son aylar (null) atılır; ortada boşluk olan seri güncellenmez.
function kesintisiz(satirlar, dolu, ad) {
  const s = satirlar.filter(dolu);
  for (let i = 1; i < s.length; i++) {
    if (s[i].yil * 12 + s[i].ay !== s[i - 1].yil * 12 + s[i - 1].ay + 1) throw new Error(`${ad} serisinde boşluk`);
  }
  return s;
}

async function konutuAl(simdi, anahtar) {
  const seriler = KONUT_BOLGELERI.map((b) => `TP.KFE.${b.kod}`);
  const ham = await evdsAylik([...seriler, ...seriler], [...seriler.map(() => 0), ...seriler.map(() => 3)], simdi, anahtar);
  const satirlar = kesintisiz(
    ham.map((h) => ({
      yil: h.yil,
      ay: h.ay,
      bolgeler: Object.fromEntries(
        KONUT_BOLGELERI.map((b) => [b.kod, { endeks: h[`TP_KFE_${b.kod}`], yillik: h[`TP_KFE_${b.kod}-3`] }]),
      ),
    })),
    (s) => Object.values(s.bolgeler).every((v) => v.endeks != null && v.yillik != null),
    'Konut fiyat endeksi',
  );
  if (satirlar.length < 12) throw new Error('Konut fiyat endeksi yetersiz');
  return {
    kaynak: { ad: 'TCMB, Konut Fiyat Endeksi (EVDS)', url: 'https://evds3.tcmb.gov.tr/' },
    bolgeler: KONUT_BOLGELERI,
    satirlar: satirlar.slice(-24),
  };
}

async function issizligiAl(simdi, anahtar) {
  const alan = ISSIZLIK_SERISI.replaceAll('.', '_');
  const ham = await evdsAylik([ISSIZLIK_SERISI], [0], simdi, anahtar);
  const satirlar = kesintisiz(ham, (h) => h[alan] != null, 'İşsizlik oranı');
  if (satirlar.length < 13) throw new Error('İşsizlik serisi yetersiz');
  return {
    kaynak: { ad: 'TÜİK verisi, TCMB EVDS temel işgücü göstergeleri (mevsimsellikten arındırılmış)', url: 'https://evds3.tcmb.gov.tr/' },
    satirlar: satirlar.slice(-25).map((h) => ({ yil: h.yil, ay: h.ay, oran: h[alan] })),
  };
}

async function beklentiyiAl(simdi, anahtar) {
  const alan = Object.fromEntries(Object.entries(BEKLENTI_SERILERI).map(([k, sr]) => [k, sr.replaceAll('.', '_')]));
  const ham = await evdsAylik(Object.values(BEKLENTI_SERILERI), [0, 0], simdi, anahtar, BEKLENTI_AY);
  const satirlar = kesintisiz(ham, (h) => h[alan.ay12] != null && h[alan.ay24] != null, 'Enflasyon beklentisi');
  if (satirlar.length < 24) throw new Error('Enflasyon beklentisi serisi yetersiz');
  return {
    kaynak: { ad: 'TCMB, Piyasa Katılımcıları Anketi (EVDS)', url: 'https://evds3.tcmb.gov.tr/' },
    satirlar: satirlar.map((h) => ({ yil: h.yil, ay: h.ay, ay12: h[alan.ay12], ay24: h[alan.ay24] })),
  };
}

// Bölümün verisi değiştiyse yeni hâli ve alınma zamanı; değişmediyse eskisi aynen (alınma zamanı dahil).
function birlestir(eski, yeni, iso) {
  if (!yeni) return eski;
  const { alinma: _a, ...eskiVeri } = eski ?? {};
  if (eski && JSON.stringify(eskiVeri) === JSON.stringify(yeni)) return eski;
  return { ...yeni, alinma: iso };
}

export async function guncelle(eski, simdi = new Date(), { gun = 14, evdsAnahtari = process.env.EVDS_API_KEY?.replace(/^﻿/, '').trim() } = {}) {
  const iso = simdi.toISOString();
  const dene = async (ad, f) => {
    try {
      return await f();
    } catch (e) {
      console.error(`[resmi] ${ad} alınamadı, son bilinen değer kalıyor: ${e.message}`);
      return null;
    }
  };
  const evds = (ad, f) =>
    evdsAnahtari ? dene(ad, () => f(simdi, evdsAnahtari)) : (console.error(`[resmi] EVDS_API_KEY yok, ${ad} atlandı`), null);
  const [
    kur,
    faiz,
    enflasyon,
    konut,
    issizlik,
    rezerv,
    piyasaFaizleri,
    mevduat,
    beklenti,
    kira,
    kart,
    guven,
    rek,
    brutRezerv,
    kapasite,
    kurHaftalik,
    makas,
    birimFiyat,
    tufeArindirilmis,
    portfoyHaftalik,
    portfoyAylik,
    cari,
    disBorc,
    disTicaret,
    sanayi,
    butce,
    kredi,
  ] =
    await Promise.all([
      dene('kurlar', () => kurlariAl(eski?.kur, simdi, gun)),
      dene('faiz', () => faiziAl(simdi)),
      dene('enflasyon', () => enflasyonuAl()),
      evds('konut', konutuAl),
      evds('issizlik', issizligiAl),
      evds('rezerv', (s, key) => rezerviAl(s, key, eski?.rezerv)),
      evds('piyasaFaizleri', (s, key) => piyasaFaizleriniAl(s, key, eski?.faiz?.gecmis, eski?.piyasaFaizleri)),
      evds('mevduat', (s, key) => mevduatiAl(s, key, eski?.mevduat)),
      evds('beklenti', beklentiyiAl),
      evds('kira', kiraAl),
      evds('kart', kartAl),
      evds('guven', guvenAl),
      evds('rek', rekAl),
      evds('brutRezerv', brutRezervAl),
      evds('kapasite', kapasiteAl),
      evds('kurHaftalik', kurHaftalikAl),
      evds('makas', makasAl),
      evds('birimFiyat', birimFiyatAl),
      evds('tufeArindirilmis', tufeArindirilmisAl),
      evds('portfoyHaftalik', portfoyHaftalikAl),
      evds('portfoyAylik', portfoyAylikAl),
      evds('cari', cariAl),
      evds('disBorc', disBorcAl),
      evds('disTicaret', disTicaretAl),
      evds('sanayi', sanayiAl),
      evds('butce', butceAl),
      evds('kredi', krediAl),
    ]);
  const sonuc = {};
  for (const [ad, yeni] of Object.entries({
    kur,
    faiz,
    enflasyon,
    konut,
    issizlik,
    rezerv,
    piyasaFaizleri,
    mevduat,
    beklenti,
    kira,
    kart,
    guven,
    rek,
    brutRezerv,
    kapasite,
    kurHaftalik,
    makas,
    birimFiyat,
    tufeArindirilmis,
    portfoyHaftalik,
    portfoyAylik,
    cari,
    disBorc,
    disTicaret,
    sanayi,
    butce,
    kredi,
  })) {
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
