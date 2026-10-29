// Dünya politika faizleri çekici: 23 ekonominin merkez bankası politika faizi.
// Kaynaklar (Uluslararası Ödemeler Bankası, BIS veri portalı):
//  - WS_CBPOL: günlük politika faizi (https://stats.bis.org/api/v1/data/WS_CBPOL/D.<ülkeler>/all, csv)
//  - WS_LONG_CPI: aylık TÜFE, yıllık değişim (birim 771) (https://stats.bis.org/api/v1/data/WS_LONG_CPI/M.<ülkeler>.771/all, csv)
// Türkiye için BIS serisi TCMB kararlarının gerisinde kalabilir; BIS'in son gözleminden sonraki TCMB kararları
// finfolis'in TCMB verisinden (src/data/resmi.json, 1 hafta repo tablosu) eklenir.
//
// Kullanım: node scripts/veri/dunya-faizleri.mjs [--yaz]
// Kaynak düşerse ya da bir ülkenin serisi eksik gelirse eski JSON ezilmez, çıkış kodu 1 olur.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin } from '../haberler/lib.mjs';
import { ULKELER, bisSeriler, tufeSonlari, faizSatiri, ayinSonu, ayAnahtari, ayEkle, cogunlukDonemi, tcmbIleUzat } from '../../src/lib/dunya-faizleri.mjs';

const HEDEF_DOSYA = fileURLToPath(new URL('../../src/data/dunya-faizleri.json', import.meta.url));
const RESMI_DOSYA = fileURLToPath(new URL('../../src/data/resmi.json', import.meta.url));
const BIS = 'https://stats.bis.org/api/v1/data';
const BIS_PORTAL = 'https://data.bis.org/';
const GRAFIK_AY = 36;
// Grafikte yer alan ülkeler (ZamanGrafik grup başına en çok dört seri çizer).
export const GRAFIK_GRUPLARI = [
  { id: 'secili', ad: 'Seçili bankalar', kodlar: ['TUR', 'USA', 'XM', 'BRA'] },
  { id: 'gelismekte', ad: 'Gelişmekte olanlar', kodlar: ['TUR', 'BRA', 'MEX', 'ZAF'] },
  { id: 'gelismis', ad: 'Gelişmişler', kodlar: ['USA', 'XM', 'GBR', 'JPN'] },
];

const bugunIso = () => new Date().toISOString().slice(0, 10);
const bisKodlari = () => ULKELER.map((u) => u.bis).join('+');

// BIS günlük politika faizi serileri, BIS ülke koduyla.
export async function bisFaizSerileri({ baslangic = '2018-01-01' } = {}) {
  const csv = await hentMetin(`${BIS}/WS_CBPOL/D.${bisKodlari()}/all?startPeriod=${baslangic}&format=csv&detail=dataonly`, { timeout: 90000 });
  return bisSeriler(csv);
}

export async function dunyaFaizleriUret() {
  const bugun = bugunIso();
  const tufeBas = ayEkle(`${bugun.slice(0, 7)}-01`, -18).slice(0, 7);
  const [seriler, tufeCsv] = await Promise.all([
    bisFaizSerileri(),
    hentMetin(`${BIS}/WS_LONG_CPI/M.${bisKodlari()}.771/all?startPeriod=${tufeBas}&format=csv&detail=dataonly`, { timeout: 90000 }),
  ]);
  const tufeler = tufeSonlari(tufeCsv);

  const eksik = ULKELER.filter((u) => !seriler[u.bis]?.length).map((u) => u.kod);
  if (eksik.length) throw new Error(`BIS politika faizi serisi eksik: ${eksik.join(', ')}`);

  // Türkiye: BIS'in son gözleminden sonraki TCMB kararları finfolis'in TCMB verisinden eklenir.
  let resmi = null;
  try {
    resmi = JSON.parse(await readFile(RESMI_DOSYA, 'utf8'));
  } catch {
    // resmi.json okunamazsa BIS serisi olduğu gibi kalır.
  }
  const bisTrSon = seriler.TR.at(-1);
  seriler.TR = tcmbIleUzat(seriler.TR, resmi?.faiz?.gecmis);
  // Türkiye TÜFE'si de BIS'in gerisinde kalabilir; TÜİK'in daha yeni ayı (resmi.json enflasyon) varsa o kullanılır,
  // böylece reel faiz emsal ülkeler sayfasıyla aynı çıkar.
  const tufeSon = resmi?.enflasyon?.satirlar?.at(-1);
  if (tufeSon && typeof tufeSon.yillik === 'number') {
    const donem = `${tufeSon.yil}-${String(tufeSon.ay).padStart(2, '0')}`;
    if (!tufeler.TR || donem > tufeler.TR.donem) tufeler.TR = { donem, deger: tufeSon.yillik };
  }

  const ref = ULKELER.map((u) => seriler[u.bis].at(-1).t).sort().at(-1);
  const satirlar = ULKELER.map((u) => faizSatiri({ ulke: u, seri: seriler[u.bis], tufe: tufeler[u.bis] ?? null, ref, bugun }));
  const tufeCogunluk = cogunlukDonemi(satirlar.map((s) => s.tufe?.donem));

  // Grafik: son GRAFIK_AY ayın ay sonu değeri.
  const kodlar = [...new Set(GRAFIK_GRUPLARI.flatMap((g) => g.kodlar))];
  const sonAy = ref.slice(0, 7);
  const ilkAy = ayEkle(`${sonAy}-01`, -(GRAFIK_AY - 1)).slice(0, 7);
  const aylik = Object.fromEntries(
    kodlar.map((k) => [k, new Map(ayinSonu(seriler[ULKELER.find((u) => u.kod === k).bis]).map((o) => [o.ay, o.v]))]),
  );
  const noktalar = [];
  for (let ay = ilkAy; ay <= sonAy; ay = ayEkle(`${ay}-01`, 1).slice(0, 7)) {
    noktalar.push([ayAnahtari(ay), ...kodlar.map((k) => aylik[k].get(ay) ?? null)]);
  }

  // TCMB karşılaştırması: Türkiye satırı TCMB verisiyle uzatıldıysa sayfa bunu not olarak yazar; uzatmadan sonra
  // da fark kalırsa (TCMB tablosu BIS'ten eskiyse) uyarı verir.
  let tcmbKarsilastirma = null;
  const f = resmi?.faiz;
  const tr = satirlar.find((s) => s.kod === 'TUR');
  if (f && typeof f.oran === 'number' && tr) {
    tcmbKarsilastirma = {
      oran: f.oran,
      gecerlilik: f.gecerlilik,
      kaynak: f.kaynak ?? null,
      bisOran: bisTrSon.v,
      bisTarih: bisTrSon.t,
      uzatildi: seriler.TR.at(-1).kaynak === 'tcmb',
      farkli: Math.abs(f.oran - tr.faiz) > 1e-9,
    };
  }

  return {
    alinma: new Date().toISOString(),
    referansTarih: ref,
    tufeCogunluk,
    kaynaklar: [
      { ad: 'BIS, merkez bankası politika faizleri (WS_CBPOL)', url: 'https://data.bis.org/topics/CBPOL' },
      { ad: 'BIS, uzun dönemli tüketici fiyatları (WS_LONG_CPI)', url: 'https://data.bis.org/topics/CPI' },
    ],
    satirlar,
    grafik: { seriIdleri: kodlar, gruplar: GRAFIK_GRUPLARI, noktalar },
    tcmbKarsilastirma,
  };
}

async function main() {
  const yaz = process.argv.includes('--yaz');
  console.log('BIS politika faizleri ve TÜFE çekiliyor...');
  const veri = await dunyaFaizleriUret();
  for (const s of veri.satirlar) {
    console.log(
      `${s.kod.padEnd(4)} %${String(s.faiz).padEnd(6)} ${s.tarih}  12ay:${s.degisim12Ay ?? '–'}bp  faz:${s.faz.padEnd(12)} TÜFE:${s.tufe ? `${s.tufe.deger} (${s.tufe.donem})` : '–'}  reel:${s.reel ?? '–'}`,
    );
  }
  console.log(`Referans tarih: ${veri.referansTarih}, TÜFE çoğunluk dönemi: ${veri.tufeCogunluk}`);
  if (veri.tcmbKarsilastirma?.farkli) {
    console.log(`UYARI: BIS Türkiye %${veri.tcmbKarsilastirma.bisOran} (${veri.tcmbKarsilastirma.bisTarih}); finfolis TCMB verisi %${veri.tcmbKarsilastirma.oran} (${veri.tcmbKarsilastirma.gecerlilik}).`);
  }
  if (yaz) {
    await writeFile(HEDEF_DOSYA, `${JSON.stringify(veri, null, 2)}\n`, 'utf-8');
    console.log(`Veri kaydedildi: ${HEDEF_DOSYA}`);
  } else {
    console.log('Veriyi kaydetmek için --yaz parametresini ekleyin.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((hata) => {
    console.error('Hata:', hata?.message ?? hata);
    process.exit(1);
  });
}
