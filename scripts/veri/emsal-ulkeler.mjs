// Emsal ülkeler tablosu çekici: Türkiye ile 22 ekonominin temel göstergeleri.
// Kaynaklar (yalnız uluslararası kurumlar):
//  - GSYH çeyreklik ve yıllık büyüme, işsizlik, 10 yıllık tahvil getirisi:
//    OECD, Key Short-Term Economic Indicators (OECD.SDD.STES,DSD_KEI@DF_KEI), sdmx.oecd.org
//    (ölçüler B1GQ_Q, UNEMP, IRLT)
//  - TÜFE (tüm kalemler) ve çekirdek TÜFE (gıda ve enerji hariç), yıllık değişim:
//    OECD, Consumer price indices, COICOP 2018 (OECD.SDD.TPS,DSD_PRICES_COICOP2018@DF_PRICES_C2018_ALL) ve
//    COICOP 1999 (OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL); iki akıştan her ülkenin en yeni gözlemi alınır
//  - Politika faizi: BIS WS_CBPOL (sayfa 1 ile aynı veri, scripts/veri/dunya-faizleri.mjs)
// Veri olmayan hücre null kalır; elle yazılmış ya da tahmin edilmiş değer yoktur.
//
// Kullanım: node scripts/veri/emsal-ulkeler.mjs [--yaz]
// Kaynak düşerse ya da çekirdek göstergelerden biri hiçbir ülke için gelmezse eski JSON ezilmez, çıkış kodu 1 olur.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep } from '../haberler/lib.mjs';
import { ULKELER, faizSatiri, tcmbIleUzat, reelFaiz } from '../../src/lib/dunya-faizleri.mjs';
import { csvAyristir, emsalSatiri, baslikDonemleri } from '../../src/lib/emsal-ulkeler.mjs';
import { bisFaizSerileri } from './dunya-faizleri.mjs';

const HEDEF_DOSYA = fileURLToPath(new URL('../../src/data/emsal-ulkeler.json', import.meta.url));
const OECD = 'https://sdmx.oecd.org/public/rest/data';
const KEI_SURUM = '4.0';
const KABUL = { Accept: 'application/vnd.sdmx.data+csv; charset=utf-8' };

const bugunIso = () => new Date().toISOString().slice(0, 10);
const ayOnce = (bugun, n) => {
  const t = Number(bugun.slice(0, 4)) * 12 + Number(bugun.slice(5, 7)) - 1 - n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

// Hangi göstergenin hangi uçtan alındığı; JSON'a ve sayfaya aynen yazılır.
export const GOSTERGELER = [
  { anahtar: 'gsyhCeyrek', ad: 'GSYH çeyreklik değişim (%)', kaynak: 'OECD, Key Short-Term Economic Indicators', uc: 'OECD.SDD.STES,DSD_KEI@DF_KEI', olcu: 'B1GQ_Q, çeyreklik (G1), mevsim ve takvim etkisinden arındırılmış' },
  { anahtar: 'gsyhYillik', ad: 'GSYH yıllık değişim (%)', kaynak: 'OECD, Key Short-Term Economic Indicators', uc: 'OECD.SDD.STES,DSD_KEI@DF_KEI', olcu: 'B1GQ_Q, bir önceki yılın aynı dönemine göre (GY)' },
  { anahtar: 'tufe', ad: 'TÜFE yıllık (%)', kaynak: 'OECD, Consumer price indices', uc: 'OECD.SDD.TPS,DSD_PRICES_COICOP2018@DF_PRICES_C2018_ALL ve OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL', olcu: 'CPI, tüm kalemler (_T), yıllık değişim (GY)' },
  { anahtar: 'cekirdek', ad: 'Çekirdek TÜFE yıllık (%)', kaynak: 'OECD, Consumer price indices', uc: 'OECD.SDD.TPS,DSD_PRICES_COICOP2018@DF_PRICES_C2018_ALL ve OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL', olcu: 'CPI, gıda ve enerji hariç (_TXCP01_NRG), yıllık değişim (GY)' },
  { anahtar: 'issizlik', ad: 'İşsizlik (%)', kaynak: 'OECD, Key Short-Term Economic Indicators', uc: 'OECD.SDD.STES,DSD_KEI@DF_KEI', olcu: 'UNEMP, işgücüne oran; aylık varsa aylık, yoksa çeyreklik' },
  { anahtar: 'faiz', ad: 'Politika faizi (%)', kaynak: 'BIS, merkez bankası politika faizleri', uc: 'WS_CBPOL (stats.bis.org)', olcu: 'günlük, son gözlem' },
  { anahtar: 'tahvil', ad: '10 yıllık tahvil getirisi (%)', kaynak: 'OECD, Key Short-Term Economic Indicators', uc: 'OECD.SDD.STES,DSD_KEI@DF_KEI', olcu: 'IRLT, uzun vadeli devlet tahvili getirisi, aylık' },
  { anahtar: 'reel', ad: 'Reel faiz (puan)', kaynak: 'Hesaplama', uc: 'politika faizi (BIS) − TÜFE (OECD)', olcu: 'aynı satırdaki iki değerin farkı' },
];

// OECD, eşleşme bulamayınca 404 döner; bu hata değil, boş sonuçtur. Aralıklı 5xx / 429 yanıtları için 3 kez denenir;
// OECD'nin istek sınırı çok dar: 429'da 60 sn, diğer hatalarda 15/30 sn beklenir; sorgular arası 20 sn.
async function oecdCek(yol) {
  let son;
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      return csvAyristir(await hentMetin(`${OECD}/${yol}`, { timeout: 120000, headers: KABUL }));
    } catch (e) {
      if (String(e?.message).startsWith('404')) return [];
      son = e;
      if (deneme < 3) await sleep(String(e?.message).startsWith('429') ? 60000 : 15000 * deneme);
    }
  }
  throw son;
}

export async function emsalUlkelerUret() {
  const bugun = bugunIso();
  const bas = ayOnce(bugun, 18);
  // KEI akışı sürümsüz sorguda her seferinde 500 veriyor (26 Kasım 2026'da doğrulandı: aynı sorgu ",4.0" ile 200);
  // sürüm belirtilir. Sürüm emekliye ayrılırsa (404 → boş) sürümsüz sorgu denenir.
  const keiSorgu = `.+M+Q.B1GQ_Q+UNEMP+IRLT....?startPeriod=${bas}&dimensionAtObservation=AllDimensions`;
  // OECD, GitHub sunucularından gelen isteklere kararsız yanıt veriyor (26 Kasım: yedi turun her birinde KEI ya da
  // fiyat sorgusu 500; aynı sorgular bazen 200). Göstergeler ayda/çeyrekte bir değiştiği için her tur şart değil: düşen
  // akışın değerleri önceki dosyadan kendi dönem tarihleriyle korunur, BIS faizleri yine güncellenir. Her akışın son
  // başarılı alınışı dosyada (oecdAlinma); betik yalnız bir akış ESKIME_SAAT'ten uzun süredir alınamıyorsa hata
  // koduyla biter (veri alarmı, veri-durumu-bildir.mjs). Böylece tek turluk 500 Telegram'a aç-kapa alarmı göndermez.
  let eskiDosya = null;
  try {
    eskiDosya = JSON.parse(await readFile(HEDEF_DOSYA, 'utf8'));
  } catch {
    // Önceki dosya yoksa düşen akışın değerleri boş kalır.
  }
  const onceki = Object.fromEntries((eskiDosya?.satirlar ?? []).map((s) => [s.kod, s]));
  const eskiAlinma = eskiDosya?.oecdAlinma ?? { kei: eskiDosya?.alinma ?? null, fiyat: eskiDosya?.alinma ?? null };
  let kei = [];
  let keiHatasi = null;
  try {
    kei = await oecdCek(`OECD.SDD.STES,DSD_KEI@DF_KEI,${KEI_SURUM}/${keiSorgu}`);
    if (!kei.length) kei = await oecdCek(`OECD.SDD.STES,DSD_KEI@DF_KEI/${keiSorgu}`);
    if (!kei.length) throw new Error('KEI yanıtı boş');
  } catch (e) {
    keiHatasi = e?.message ?? String(e);
    console.warn(`OECD KEI alınamadı, GSYH/işsizlik/tahvil önceki dosyadan: ${keiHatasi}`);
  }
  await sleep(20000);
  let fiyat2018 = [];
  let fiyatHatasi = null;
  try {
    fiyat2018 = await oecdCek(`OECD.SDD.TPS,DSD_PRICES_COICOP2018@DF_PRICES_C2018_ALL/.M.N+HICP.CPI.PA._T+_TXCP01_NRG.N.GY?startPeriod=${bas}`);
  } catch (e) {
    fiyatHatasi = e?.message ?? String(e);
    console.warn(`OECD fiyat akışı (COICOP 2018) alınamadı, eski akış denenecek: ${fiyatHatasi}`);
  }
  await sleep(20000);
  // Eski COICOP 1999 akışı: yalnız 2018 akışında TÜFE ya da çekirdek TÜFE'si olmayan ülkeler sorulur.
  // Bütün ülkeleri isteyen geniş sorgu bu akışta zaman aşımıyla 500 veriyordu (28 Ekim–25 Kasım).
  const var2018 = new Set(fiyat2018.filter((r) => r.MEASURE === 'CPI').map((r) => `${r.REF_AREA}|${r.EXPENDITURE}`));
  // Ülke başına: kodlarından hiçbiri iki seriyi birden vermiyorsa sorulur. EA21/EA19 eski akışta yok (404), sorulmaz.
  const tam = (k) => var2018.has(`${k}|_T`) && var2018.has(`${k}|_TXCP01_NRG`);
  // 2018 akışı hiç gelmediyse eski akışla bütün ülkeler sorulmaz (OECD o an kararsız, adım uzar): hepsinin TÜFE'si
  // önceki dosyadan kalır.
  const eksik = fiyatHatasi
    ? []
    : [...new Set(ULKELER.filter((u) => !(u.oecd ?? []).some(tam)).flatMap((u) => (u.oecd ?? []).filter((k) => k !== 'EA21' && k !== 'EA19')))];
  // Bu akış kararsız (aynı sorgu bir kez 200, bir kez 500); dörder ülkelik parçalar, aralarında 20 sn.
  // Düşen parçanın ülkelerinde TÜFE/çekirdek önceki dosyadan, kendi dönem tarihiyle korunur; tablo her değerin dönemini gösterir.
  const fiyat1999 = [];
  const dusen = new Set(fiyatHatasi ? ULKELER.flatMap((u) => u.oecd ?? []) : []);
  for (let i = 0; i < eksik.length; i += 4) {
    if (i) await sleep(20000);
    const parca = eksik.slice(i, i + 4);
    try {
      fiyat1999.push(...(await oecdCek(`OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL/${parca.join('+')}.M.N+HICP.CPI.PA._T+_TXCP01_NRG.N.GY?startPeriod=${bas}`)));
    } catch (e) {
      console.warn(`OECD eski fiyat akışı düştü (${parca.join('+')}): ${e?.message ?? e}`);
      parca.forEach((k) => dusen.add(k));
    }
  }
  const seriler = await bisFaizSerileri();
  // Türkiye: BIS'in son gözleminden sonraki TCMB kararları finfolis'in TCMB verisinden (dunya-faizleri.mjs ile aynı).
  try {
    const resmi = JSON.parse(await readFile(new URL('../../src/data/resmi.json', import.meta.url), 'utf8'));
    if (seriler.TR) seriler.TR = tcmbIleUzat(seriler.TR, resmi.faiz?.gecmis);
  } catch {
    // resmi.json okunamazsa BIS serisi olduğu gibi kalır.
  }
  const fiyat = [...fiyat2018, ...fiyat1999];
  const oncekiVar = Object.keys(onceki).length > 0;
  if (!fiyat.length && !oncekiVar) throw new Error(`OECD fiyat verisi alınamadı ve önceki dosya yok: ${fiyatHatasi ?? 'boş yanıt'}`);
  if (keiHatasi && !oncekiVar) throw new Error(`OECD KEI alınamadı ve önceki dosya yok: ${keiHatasi}`);
  const simdi = new Date().toISOString();
  // Fiyat akışı tam alındıysa (2018 akışı geldi, eski akışın hiçbir parçası düşmedi) zaman damgası yenilenir.
  const oecdAlinma = { kei: keiHatasi ? eskiAlinma.kei : simdi, fiyat: fiyatHatasi || dusen.size ? eskiAlinma.fiyat : simdi };

  const ref = ULKELER.map((u) => seriler[u.bis]?.at(-1)?.t).filter(Boolean).sort().at(-1);
  const satirlar = ULKELER.map((u) => {
    const faiz = seriler[u.bis]?.length ? faizSatiri({ ulke: u, seri: seriler[u.bis], tufe: null, ref, bugun }) : null;
    const satir = emsalSatiri({ ulke: u, kei, fiyat, faiz, bugun });
    const eski = onceki[u.kod];
    if (eski && keiHatasi) {
      for (const k of ['gsyhCeyrek', 'gsyhYillik', 'issizlik', 'tahvil']) satir[k] ??= eski[k] ?? null;
    }
    if (eski && (u.oecd ?? []).some((k) => dusen.has(k))) {
      satir.tufe ??= eski.tufe ?? null;
      satir.cekirdek ??= eski.cekirdek ?? null;
      if (!satir.reel && satir.faiz && satir.tufe) {
        satir.reel = { deger: reelFaiz(satir.faiz.deger, satir.tufe.deger), tufeDonem: satir.tufe.donem };
      }
    }
    return satir;
  });

  const donemler = baslikDonemleri(satirlar);
  // Çekirdek göstergelerden biri hiç gelmediyse kaynak bozuk sayılır.
  for (const k of ['gsyhCeyrek', 'gsyhYillik', 'tufe', 'issizlik', 'faiz']) {
    if (satirlar.filter((s) => s[k]).length < 10) throw new Error(`Gösterge yetersiz geldi: ${k}`);
  }
  if (!satirlar.find((s) => s.kod === 'TUR')?.tufe) throw new Error('Türkiye TÜFE verisi gelmedi');

  return {
    alinma: simdi,
    oecdAlinma,
    referansTarih: ref,
    kaynaklar: [
      { ad: 'OECD Veri Gezgini, sdmx.oecd.org', url: 'https://data-explorer.oecd.org/' },
      { ad: 'BIS, merkez bankası politika faizleri (WS_CBPOL)', url: 'https://data.bis.org/topics/CBPOL' },
    ],
    gostergeler: GOSTERGELER,
    baslikDonemleri: donemler,
    satirlar,
    // Dosyaya yazılmaz (main siler).
    hatalar: [keiHatasi && `KEI: ${keiHatasi}`, fiyatHatasi && `fiyat: ${fiyatHatasi}`, dusen.size && `eski fiyat akışı: ${[...dusen].join('+')}`].filter(Boolean),
  };
}

// Bir OECD akışı bu kadar saattir alınamıyorsa veri alarmı açılır (tek turluk 500'ler alarm sayılmaz).
export const ESKIME_SAAT = 72;
export function eskimis(oecdAlinma, simdi = Date.now(), saat = ESKIME_SAAT) {
  return ['kei', 'fiyat'].filter((k) => {
    const t = Date.parse(oecdAlinma?.[k] ?? '');
    return !Number.isFinite(t) || simdi - t > saat * 3600e3;
  });
}

const f = (g) => (g ? `${g.deger}` + ` (${g.donem ?? g.tarih})` : '–');

async function main() {
  const yaz = process.argv.includes('--yaz');
  console.log('OECD ve BIS verisi çekiliyor...');
  const veri = await emsalUlkelerUret();
  for (const s of veri.satirlar) {
    console.log(
      `${s.kod.padEnd(4)} gsyhÇ:${f(s.gsyhCeyrek)} gsyhY:${f(s.gsyhYillik)} tüfe:${f(s.tufe)} çek:${f(s.cekirdek)} işs:${f(s.issizlik)} faiz:${f(s.faiz)} tahvil:${f(s.tahvil)} reel:${s.reel ? `${s.reel.deger}` : '–'}`,
    );
  }
  console.log('Başlık dönemleri:', JSON.stringify(veri.baslikDonemleri));
  const { hatalar, ...kayit } = veri;
  if (yaz) {
    await writeFile(HEDEF_DOSYA, `${JSON.stringify(kayit, null, 2)}\n`, 'utf-8');
    console.log(`Veri kaydedildi: ${HEDEF_DOSYA}`);
  } else {
    console.log('Veriyi kaydetmek için --yaz parametresini ekleyin.');
  }
  if (hatalar.length) console.warn(`OECD uyarısı (önceki değerlerle sürdü): ${hatalar.join(' | ')}`);
  const eski = eskimis(veri.oecdAlinma);
  if (eski.length) {
    console.error(`Hata: OECD verisi ${ESKIME_SAAT} saattir alınamıyor: ${eski.join(', ')}. ${hatalar.join(' | ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((hata) => {
    console.error('Hata:', hata?.message ?? hata);
    process.exit(1);
  });
}
