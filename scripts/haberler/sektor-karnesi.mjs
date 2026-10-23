// BIST Sektör ve Tematik Endeks Karnesi:
// Endekslerin güncel değerleri, günlük ve dönemsel getirileri ile piyasa değerlerini derler.
//
// Kaynaklar:
//  - Yahoo Finance Chart API (anahtarsız): https://query1.finance.yahoo.com/v8/finance/chart/<SEMBOL>.IS
//  - Borsa İstanbul Bülteni ve Piyasa Değeri referansları
//
// Kullanım:
//   node scripts/haberler/sektor-karnesi.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentJson } from './lib.mjs';

const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';
const DOSYA = fileURLToPath(new URL('../../src/data/sektorler.json', import.meta.url));

export const SEKTOR_TANIMLARI = [
  { kod: 'XFINK', ad: 'BIST Fin. Kir. Faktoring', kategori: 'mali', aciklama: 'Finansal Kiralama ve Faktoring', piyasaDegeri: 436169713843, aylik: -40.6 },
  { kod: 'XHARZ', ad: 'BIST Halka Arz', kategori: 'tema', aciklama: 'Halka Arz Edilen Şirketler', piyasaDegeri: 1343548047108, aylik: -39.6 },
  { kod: 'XBANA', ad: 'BIST Ana', kategori: 'pazar', aciklama: 'BIST Ana Pazar Hisseleri', piyasaDegeri: 1357906040834, aylik: -39.0 },
  { kod: 'XAKUR', ad: 'BIST Aracı Kurumlar', kategori: 'mali', aciklama: 'Menkul Kıymet Aracı Kurumları', piyasaDegeri: 145431107853, aylik: -37.9 },
  { kod: 'XELOT', ad: 'BIST 50-30', kategori: 'endeks', aciklama: 'BIST 50 Hariç BIST 30 Dışı Paylar', piyasaDegeri: 1418954990720, aylik: -30.1 },
  { kod: 'XYUZO', ad: 'BIST 100-30', kategori: 'endeks', aciklama: 'BIST 100 Hariç BIST 30 Dışı Paylar', piyasaDegeri: 2999939470029, aylik: -29.1 },
  { kod: 'XTUMY', ad: 'BIST Tüm-100', kategori: 'endeks', aciklama: 'BIST Tüm Hariç BIST 100 Dışı Paylar', piyasaDegeri: 4991096988778, aylik: -28.5 },
  { kod: 'XINSA', ad: 'BIST İnşaat', kategori: 'sinai', aciklama: 'İnşaat ve Bayındırlık Şirketleri', piyasaDegeri: 713362107366, aylik: -24.0 },
  { kod: 'XGMYO', ad: 'BIST Gayrimenkul YO', kategori: 'mali', aciklama: 'Gayrimenkul Yatırım Ortaklıkları', piyasaDegeri: 781747203477, aylik: -21.9 },
  { kod: 'XK100', ad: 'BIST Katılım 100', kategori: 'tema', aciklama: 'Faizsiz Finans İlkelerine Uygun 100 Şirket', piyasaDegeri: 5576524648219, aylik: -19.9 },
  { kod: 'XUMAL', ad: 'BIST Mali', kategori: 'ana-sektor', aciklama: 'Mali Sektörün Tamamı', piyasaDegeri: 6097618452500, aylik: -18.7 },
  { kod: 'XUTEK', ad: 'BIST Teknoloji', kategori: 'teknoloji', aciklama: 'Bilişim ve Yazılım Şirketleri', piyasaDegeri: 1995909519050, aylik: -18.6 },
  { kod: 'XHOLD', ad: 'BIST Holding ve Yatırım', kategori: 'mali', aciklama: 'Holding ve Yatırım Şirketleri', piyasaDegeri: 1995713604071, aylik: -17.7 },
  { kod: 'XGIDA', ad: 'BIST Gıda İçecek', kategori: 'sinai', aciklama: 'Gıda, İçecek ve Tütün Üreticileri', piyasaDegeri: 707132563161, aylik: -16.1 },
  { kod: 'XUSIN', ad: 'BIST Sınai', kategori: 'ana-sektor', aciklama: 'İmalat ve Sanayi Şirketleri', piyasaDegeri: 5074384076493, aylik: -13.7 },
  { kod: 'XULAS', ad: 'BIST Ulaştırma', kategori: 'hizmet', aciklama: 'Havacılık, Kara ve Deniz Taşımacılığı', piyasaDegeri: 641218610262, aylik: -13.3 },
  { kod: 'XUHIZ', ad: 'BIST Hizmetler', kategori: 'ana-sektor', aciklama: 'Hizmetler Sektörü Şirketleri', piyasaDegeri: 4186224768897, aylik: -11.2 },
  { kod: 'XU100', ad: 'BIST 100', kategori: 'ana-endeks', aciklama: 'Borsa İstanbul Gösterge Endeksi', piyasaDegeri: 12363039828161, aylik: -10.0 },
  { kod: 'XU050', ad: 'BIST 50', kategori: 'ana-endeks', aciklama: 'En Yüksek Hacimli 50 Şirket', piyasaDegeri: 10782055348852, aylik: -6.6 },
  { kod: 'XTMTU', ad: 'BIST Temettü', kategori: 'tema', aciklama: 'Düzenli Temettü Dağıtan Şirketler', piyasaDegeri: 9028344984781, aylik: -5.0 },
  { kod: 'XUGRA', ad: 'BIST Geri Alım', kategori: 'tema', aciklama: 'Kendi Paylarını Geri Alan Şirketler', piyasaDegeri: 1642706356016, aylik: -4.7 },
  { kod: 'X10XB', ad: 'BIST Banka Dışı Likit 10', kategori: 'tema', aciklama: 'Banka Dışı Likiditesi En Yüksek 10 Şirket', piyasaDegeri: 4370558512444, aylik: -3.7 },
  { kod: 'XU030', ad: 'BIST 30', kategori: 'ana-endeks', aciklama: 'Piyasa Değeri En Büyük 30 Şirket', piyasaDegeri: 9363100358132, aylik: -3.0 },
  { kod: 'XBANK', ad: 'BIST Banka', kategori: 'mali', aciklama: 'Bankacılık Sektörü Payları', piyasaDegeri: 2306407483852, aylik: 0.0 },
  { kod: 'XLBNK', ad: 'BIST Likit Banka', kategori: 'tema', aciklama: 'Likiditesi En Yüksek Bankalar', piyasaDegeri: 2210833556352, aylik: 0.8 },
  { kod: 'XPTIC', ad: 'BIST Perakende Ticaret', kategori: 'hizmet', aciklama: 'Zincir Marketler ve Mağazacılık', piyasaDegeri: 805375463996, aylik: 3.4 },
];

const yuvarla = (n, o = 2) => Math.round(n * 10 ** o) / 10 ** o;

export function sectorVerisiBirlestir(def, yahooMeta, eskiSektor) {
  const fiyat = yahooMeta?.regularMarketPrice ?? eskiSektor?.deger ?? 0;
  const gunlukDegisim = yahooMeta?.regularMarketChangePercent != null
    ? yuvarla(yahooMeta.regularMarketChangePercent, 1)
    : (eskiSektor?.gunluk ?? 0);

  const piyasaDegeri = def.piyasaDegeri ?? eskiSektor?.piyasaDegeri ?? null;
  const aylik = eskiSektor?.aylik ?? def.aylik ?? 0;

  return {
    kod: def.kod,
    ad: def.ad,
    kategori: def.kategori,
    aciklama: def.aciklama,
    deger: yuvarla(fiyat, 2),
    gunluk: gunlukDegisim,
    aylik: yuvarla(aylik, 1),
    piyasaDegeri,
    oncekiKapanis: yahooMeta?.chartPreviousClose ? yuvarla(yahooMeta.chartPreviousClose, 2) : (eskiSektor?.oncekiKapanis ?? null),
    zaman: new Date((yahooMeta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

export async function tumSektorleriGuncelle(eskiVeri = null, simdi = new Date()) {
  const sonuclar = [];

  for (const def of SEKTOR_TANIMLARI) {
    const sembol = `${def.kod}.IS`;
    const eski = eskiVeri?.sektorler?.find((s) => s.kod === def.kod);

    try {
      const url = `${YAHOO}/${encodeURIComponent(sembol)}?range=1d&interval=1d`;
      const res = await hentJson(url);
      const meta = res?.chart?.result?.[0]?.meta;

      if (!meta || !meta.regularMarketPrice) {
        throw new Error('Fiyat okunamadı');
      }

      sonuclar.push(sectorVerisiBirlestir(def, meta, eski));
    } catch (e) {
      console.warn(`[sektor] ${def.kod} canlı veri alınamadı (${e.message}), eski veya varsayılan değer kullanılıyor.`);
      if (eski) {
        sonuclar.push(eski);
      } else {
        sonuclar.push({
          kod: def.kod,
          ad: def.ad,
          kategori: def.kategori,
          aciklama: def.aciklama,
          deger: 0,
          gunluk: 0,
          aylik: def.aylik ?? 0,
          piyasaDegeri: def.piyasaDegeri ?? null,
          oncekiKapanis: null,
          zaman: simdi.toISOString(),
        });
      }
    }
  }

  return {
    guncelleme: simdi.toISOString(),
    donemEtiketi: 'Aylık Getiri',
    kaynak: {
      ad: 'Borsa İstanbul & Piyasa Verisi',
      url: 'https://finfolis.com/yayin-ilkeleri/#piyasa-verisi',
    },
    sektorler: sonuclar,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let eski;
  try {
    eski = JSON.parse(await readFile(DOSYA, 'utf8'));
  } catch {}

  console.log('BIST Sektör verileri güncelleniyor...');
  const cikti = await tumSektorleriGuncelle(eski);
  console.log(`Tamamlandı: ${cikti.sektorler.length} endeks hazırlandı.`);

  const json = JSON.stringify(cikti, null, 2) + '\n';
  if (process.argv.includes('--yaz')) {
    await writeFile(DOSYA, json);
    console.log(`Yazıldı: ${DOSYA}`);
  } else {
    console.log('Örnek 5 sektör:');
    console.log(cikti.sektorler.slice(0, 5));
    console.log('\nDosyaya yazmak için: node scripts/haberler/sektor-karnesi.mjs --yaz');
  }
}
