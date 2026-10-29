// Tahmin sayfası (/veri/tahmin/) için ek resmi seriler, TCMB EVDS'den (doğrulandı 29.10.2026):
//  - İTO İstanbul ücretliler geçinme endeksinin aylık değişimi. 2024 Ocak'a kadar 1995=100 serisi (TP.FG.B01.95), sonrası
//      2023=100 serisi (TP.FG.IST1.23); oran EVDS'nin kendi formülüyle (formulas=1) alınır. src/data/ito-enflasyon.json'da
//      zaten bulunan aylar (İTO'nun duyurduğu rakamlar) değiştirilmez, yalnız eksik aylar eklenir.
//  - Piyasa Katılımcıları Anketi: cari ay, 1 ay ve 2 ay sonrası aylık TÜFE beklentisi, 12 ay sonrası yıllık TÜFE
//      beklentisi (2013'ten). Anket sonucudur, sitenin tahmini değildir; kur ve faiz beklentileri alınmaz.
//  - ABD doları gösterge alış kurunun aylık ortalaması (TCMB), TÜFE köprüsünün kur değişimi terimi için.
// Sonuç src/data/tahmin-girdi.json. Kaynak alınamazsa dosyalara dokunulmaz, çıkış kodu 1 olur.
//
// Kullanım: node scripts/veri/tahmin-veri.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { evdsCek } from '../haberler/evds-ek.mjs';

const GIRDI_DOSYA = fileURLToPath(new URL('../../src/data/tahmin-girdi.json', import.meta.url));
const ITO_DOSYA = fileURLToPath(new URL('../../src/data/ito-enflasyon.json', import.meta.url));
const ITO_ESKI = 'TP.FG.B01.95';
const ITO_YENI = 'TP.FG.IST1.23';
// 2023=100 serisinin ilk aylık değişimi Şubat 2024'tür; Ocak 2024 ve öncesi eski seriden.
const ITO_GECIS = 2024 * 12 + 2;
export const PKA_SERILERI = [
  { kod: 'TP.PKAUO.S01.A.U', alan: 'pkaCari', ad: 'Cari ayın aylık TÜFE beklentisi' },
  { kod: 'TP.PKAUO.S01.B.U', alan: 'pka1', ad: '1 ay sonrasının aylık TÜFE beklentisi' },
  { kod: 'TP.PKAUO.S01.C.U', alan: 'pka2', ad: '2 ay sonrasının aylık TÜFE beklentisi' },
  { kod: 'TP.PKAUO.S01.E.U', alan: 'pka12', ad: '12 ay sonrasının yıllık TÜFE beklentisi' },
];
const USD = 'TP.DK.USD.A.YTL';
const alanAdi = (seri, formul) => seri.replaceAll('.', '_') + (formul ? `-${formul}` : '');
const ak = (s) => s.yil * 12 + s.ay;
const yuvarla = (n, b = 4) => (n == null ? null : Math.round(n * 10 ** b) / 10 ** b);

export function itoBirlestir(eskiSatirlar, evdsSatirlar) {
  const var_ = new Map(eskiSatirlar.map((s) => [ak(s), s]));
  for (const s of evdsSatirlar) {
    if (var_.has(ak(s))) continue;
    const deger = ak(s) < ITO_GECIS ? s[alanAdi(ITO_ESKI, 1)] : s[alanAdi(ITO_YENI, 1)];
    if (deger != null) var_.set(ak(s), { yil: s.yil, ay: s.ay, aylik: yuvarla(deger, 2) });
  }
  const satirlar = [...var_.values()].sort((a, b) => ak(a) - ak(b));
  for (let i = 1; i < satirlar.length; i++) {
    if (ak(satirlar[i]) !== ak(satirlar[i - 1]) + 1) throw new Error(`İTO serisinde boşluk: ${satirlar[i - 1].yil}-${satirlar[i - 1].ay}`);
  }
  return satirlar;
}

// Dosyanın elle yazılmış biçimi korunur: her ay tek satır.
export const itoJson = (v) => {
  const kaynak = JSON.stringify(v.kaynak, null, 2).replaceAll('\n', '\n  ');
  const satirlar = v.satirlar.map((s) => `    { "yil": ${s.yil}, "ay": ${s.ay}, "aylik": ${s.aylik} }`).join(',\n');
  return `{\n  "kaynak": ${kaynak},\n  "satirlar": [\n${satirlar}\n  ]\n}\n`;
};

export async function tahminVerisiAl(simdi, anahtar) {
  const bit = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth(), 1));
  const [ito, pka, usd] = await Promise.all([
    evdsCek([ITO_ESKI, ITO_YENI], [1, 1], new Date(Date.UTC(1996, 1, 1)), bit, anahtar),
    evdsCek(PKA_SERILERI.map((s) => s.kod), PKA_SERILERI.map(() => 0), new Date(Date.UTC(2013, 0, 1)), bit, anahtar),
    evdsCek([USD], [0], new Date(Date.UTC(2004, 11, 1)), bit, anahtar, '&frequency=5&aggregationTypes=avg'),
  ]);
  const usdMap = new Map(usd.map((s) => [ak(s), s[alanAdi(USD, 0)]]));
  const pkaMap = new Map(pka.map((s) => [ak(s), s]));
  const anahtarlar = [...new Set([...usdMap.keys(), ...pkaMap.keys()])].sort((a, b) => a - b);
  const satirlar = anahtarlar
    .map((k) => {
      const p = pkaMap.get(k);
      const s = { yil: Math.floor((k - 1) / 12), ay: ((k - 1) % 12) + 1, usd: yuvarla(usdMap.get(k) ?? null) };
      for (const t of PKA_SERILERI) s[t.alan] = p ? p[alanAdi(t.kod, 0)] : null;
      return s;
    })
    .filter((s) => s.usd != null || PKA_SERILERI.some((t) => s[t.alan] != null));
  if (satirlar.filter((s) => s.pkaCari != null).length < 120) throw new Error('PKA cari ay serisi yetersiz');
  if (satirlar.filter((s) => s.usd != null).length < 200) throw new Error('Aylık kur serisi yetersiz');
  return {
    girdi: {
      kaynak: {
        ad: 'TCMB, Piyasa Katılımcıları Anketi ve gösterge niteliğindeki döviz kurları (EVDS)',
        url: 'https://evds3.tcmb.gov.tr/',
      },
      seriler: [...PKA_SERILERI.map(({ alan, ad }) => ({ alan, ad })), { alan: 'usd', ad: 'ABD doları alış kuru, aylık ortalama' }],
      satirlar,
    },
    ito,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const anahtar = process.env.EVDS_API_KEY?.replace(/^﻿/, '').trim();
  if (!anahtar) {
    console.error('[tahmin-veri] EVDS_API_KEY yok, atlandı');
    process.exit(0);
  }
  try {
    const simdi = new Date();
    const { girdi, ito } = await tahminVerisiAl(simdi, anahtar);
    const itoEski = JSON.parse(await readFile(ITO_DOSYA, 'utf8'));
    const itoYeni = {
      ...itoEski,
      kaynak: {
        ad: 'İstanbul Ticaret Odası (İTO) İstanbul Ücretliler Geçinme İndeksi',
        url: 'https://www.ito.org.tr/',
        not: 'Eski aylar TCMB EVDS’den (2024 Ocak’a kadar 1995=100, sonrası 2023=100 endeksi).',
      },
      satirlar: itoBirlestir(itoEski.satirlar ?? [], ito),
    };
    let girdiEski = null;
    try {
      girdiEski = JSON.parse(await readFile(GIRDI_DOSYA, 'utf8'));
    } catch {}
    const { alinma: _a, ...eskiVeri } = girdiEski ?? {};
    const girdiYeni = JSON.stringify(eskiVeri) === JSON.stringify(girdi) ? girdiEski : { ...girdi, alinma: simdi.toISOString() };
    if (process.argv.includes('--yaz')) {
      if (JSON.stringify(itoEski) !== JSON.stringify(itoYeni)) await writeFile(ITO_DOSYA, itoJson(itoYeni));
      if (girdiYeni !== girdiEski) await writeFile(GIRDI_DOSYA, JSON.stringify(girdiYeni, null, 2) + '\n');
      console.log(`[tahmin-veri] İTO ${itoYeni.satirlar.length} ay, girdi ${girdi.satirlar.length} ay`);
    } else {
      console.log(JSON.stringify({ itoAy: itoYeni.satirlar.length, son: girdi.satirlar.at(-1) }, null, 2));
    }
  } catch (e) {
    console.error(`[tahmin-veri] alınamadı, dosyalar korunuyor: ${e.message}`);
    process.exit(1);
  }
}
