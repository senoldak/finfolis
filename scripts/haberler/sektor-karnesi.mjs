// BIST Sektör ve Tematik Endeks Karnesi:
// Endekslerin güncel değerleri, günlük ve dönemsel getirileri (günlük, haftalık, aylık, YTD),
// piyasa değerleri ve zengin editoryal rehber bilgilerini (tanım, lokomotif şirketler, piyasa dinamiği) derler.
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
  {
    kod: 'XFINK',
    ad: 'BIST Fin. Kir. Faktoring',
    kategori: 'mali',
    aciklama: 'Finansal Kiralama ve Faktoring',
    tanim: 'Finansal kiralama (leasing) ve alacak finansmanı (faktoring) şirketlerinin paylarını kapsar.',
    hisseler: ['VAKFN', 'GARFA', 'SEKFK', 'CRDFA', 'ISFIN'],
    dinamik: 'Kredi hacimleri, faiz marjları ve ticari tahsilat risklerine en duyarlı mali alt sektördür.',
  },
  {
    kod: 'XHARZ',
    ad: 'BIST Halka Arz',
    kategori: 'tema',
    aciklama: 'Halka Arz Edilen Şirketler',
    tanim: 'Son 2 yıl içinde Borsa İstanbul’da ilk defa halka arz edilip işlem görmeye başlayan şirketlerden oluşur.',
    hisseler: ['TABGD', 'EBEBK', 'REEDR', 'KLYVN', 'AGROT'],
    dinamik: 'Küçük ve bireysel yatırımcı ilgisinin, piyasadaki genel likidite ve risk iştahının temel barometresidir.',
  },
  {
    kod: 'XBANA',
    ad: 'BIST Ana',
    kategori: 'pazar',
    aciklama: 'BIST Ana Pazar Hisseleri',
    tanim: 'Yıldız Pazar büyüklük kriterlerini sağlamayan ancak Borsa İstanbul kotunda işlem gören orta ölçekli şirketler.',
    hisseler: ['ALBRK', 'CEMTS', 'KARTN', 'KLMSN', 'PARSN'],
    dinamik: 'BIST 100 dışı likidite hareketlerinden ve yerli yatırımcı spekülasyonlarından doğrudan etkilenir.',
  },
  {
    kod: 'XAKUR',
    ad: 'BIST Aracı Kurumlar',
    kategori: 'mali',
    aciklama: 'Menkul Kıymet Aracı Kurumları',
    tanim: 'Sermaye piyasalarında aracılık, portföy yöneticiliği ve yatırım danışmanlığı yapan halka açık kurumlar.',
    hisseler: ['ISMEN', 'INFO', 'OSMEN', 'GEDIK', 'TERA'],
    dinamik: 'Borsanın günlük toplam işlem hacmi, komisyon gelirleri ve faiz ortamı doğrudan kârlılığı belirler.',
  },
  {
    kod: 'XELOT',
    ad: 'BIST 50-30',
    kategori: 'endeks',
    aciklama: 'BIST 50 Hariç BIST 30 Dışı Paylar',
    tanim: 'BIST 50 içinde yer alan fakat BIST 30 en büyük şirketleri arasında bulunmayan 20 şirketi içerir.',
    hisseler: ['MGROS', 'TAVHL', 'CCOLA', 'OYAKC', 'AEFES'],
    dinamik: 'Genişleme dönemlerinde büyük endeks hisselerine kıyasla daha yüksek büyüme ve getiri potansiyeli sunar.',
  },
  {
    kod: 'XYUZO',
    ad: 'BIST 100-30',
    kategori: 'endeks',
    aciklama: 'BIST 100 Hariç BIST 30 Dışı Paylar',
    tanim: 'BIST 100’ün BIST 30 haricinde kalan 70 orta-büyük ölçekli şirketinin performansını ölçer.',
    hisseler: ['SOKM', 'CIMSA', 'BERA', 'OTKAR', 'VESBE'],
    dinamik: 'Ana endeks rallilerinin genele yayılıp yayılmadığını anlamak için en çok takip edilen endekstir.',
  },
  {
    kod: 'XTUMY',
    ad: 'BIST Tüm-100',
    kategori: 'endeks',
    aciklama: 'BIST Tüm Hariç BIST 100 Dışı Paylar',
    tanim: 'Borsa İstanbul’daki tüm hisseler içerisinden BIST 100 haricindeki daha küçük ölçekli tüm şirketler.',
    hisseler: ['GSDHO', 'KAREL', 'DESPC', 'DITAS', 'EUKYO'],
    dinamik: 'Yerli küçük yatırımcı iştahını ve yan tahta hareketliliğini gösterir; likiditesi düşüktür.',
  },
  {
    kod: 'XINSA',
    ad: 'BIST İnşaat',
    kategori: 'sinai',
    aciklama: 'İnşaat ve Bayındırlık Şirketleri',
    tanim: 'Altyapı, üstyapı, gayrimenkul geliştirme ve taahhüt projeleri yürüten inşaat şirketleri.',
    hisseler: ['ENKAI', 'TKFEN', 'CWENE', 'YEOTK', 'GESAN'],
    dinamik: 'Kamu yatırımları, yurt dışı müteahhitlik ihaleleri ve faiz oranlarındaki dalgalanmalar yön verir.',
  },
  {
    kod: 'XGMYO',
    ad: 'BIST Gayrimenkul YO',
    kategori: 'mali',
    aciklama: 'Gayrimenkul Yatırım Ortaklıkları',
    tanim: 'Gayrimenkul portföyü, konut ve ticari arsa projeleri yöneten ve kurumlar vergisinden muaf ortaklıklar.',
    hisseler: ['EKGYO', 'TRGYO', 'ISGYO', 'KLGYO', 'SNGYO'],
    dinamik: 'Konut kredisi faizleri, gayrimenkul fiyat endeksi ve enflasyon beklentileri ana tetikleyicidir.',
  },
  {
    kod: 'XK100',
    ad: 'BIST Katılım 100',
    kategori: 'tema',
    aciklama: 'Katılım Finans İlkelerine Uygun 100 Şirket',
    tanim: 'Faizli borç ve gelir kriterleri ile faaliyet alanı katılım finans (faizsiz) ilkelerine uyan 100 şirket.',
    hisseler: ['BIMAS', 'THYAO', 'ASELS', 'FROTO', 'TUPRS'],
    dinamik: 'Bireysel ve kurumsal katılım fonlarının zorunlu portföy tercihi nedeniyle güçlü düzenli fon akışı alır.',
  },
  {
    kod: 'XUMAL',
    ad: 'BIST Mali',
    kategori: 'ana-sektor',
    aciklama: 'Mali Sektörün Tamamı',
    tanim: 'Bankalar, sigortalar, holdingler, aracı kurumlar ve GYO’ların tamamını kapsayan çatı endeks.',
    hisseler: ['GARAN', 'AKBNK', 'KCHOL', 'SAHOL', 'ISCTR'],
    dinamik: 'Türkiye ekonomisinin finansal nabzıdır; TCMB politika faizi ve makroekonomik istikrara en bağımlı sektördür.',
  },
  {
    kod: 'XUTEK',
    ad: 'BIST Teknoloji',
    kategori: 'teknoloji',
    aciklama: 'Bilişim ve Yazılım Şirketleri',
    tanim: 'Yazılım geliştirme, telekomünikasyon altyapısı, savunma elektroniği ve donanım üreticileri.',
    hisseler: ['ASELS', 'LOGO', 'MIATK', 'KFEIN', 'ARDYZ'],
    dinamik: 'Ar-Ge teşvikleri, dijitalleşme projeleri ve ihracat potansiyeliyle yüksek çarpanlarla değerlenir.',
  },
  {
    kod: 'XHOLD',
    ad: 'BIST Holding ve Yatırım',
    kategori: 'mali',
    aciklama: 'Holding ve Yatırım Şirketleri',
    tanim: 'Farklı sektörlerdeki iştirakleri tek çatı altında toplayan Türkiye’nin en köklü sanayi ve finans holdingleri.',
    hisseler: ['KCHOL', 'SAHOL', 'SISE', 'AGHOL', 'DOHOL'],
    dinamik: 'Çeşitlendirilmiş gelir modeli sayesinde tekil sektör krizlerine karşı defansif bir yapı sergiler.',
  },
  {
    kod: 'XGIDA',
    ad: 'BIST Gıda İçecek',
    kategori: 'sinai',
    aciklama: 'Gıda, İçecek ve Tütün Üreticileri',
    tanim: 'Temel gıda maddeleri, içecek, unlu mamuller, süt ürünleri ve tarımsal sanayi üreticileri.',
    hisseler: ['CCOLA', 'AEFES', 'ULKER', 'TATGD', 'PNSUT'],
    dinamik: 'Talep esnekliği düşük olduğu için kriz ve enflasyon dönemlerinde defansif (güvenli liman) nitelik taşır.',
  },
  {
    kod: 'XUSIN',
    ad: 'BIST Sınai',
    kategori: 'ana-sektor',
    aciklama: 'İmalat ve Sanayi Şirketleri',
    tanim: 'Türkiye imalat sanayisinin kalbini oluşturan otomotiv, beyaz eşya, kimya, çelik ve tekstil devleri.',
    hisseler: ['FROTO', 'TOASO', 'EREGL', 'TUPRS', 'ARCLK'],
    dinamik: 'Sanayi üretimi kapasite kullanım oranı, ihracat pazarları (özellikle AB) ve emtia fiyatlarına duyarlıdır.',
  },
  {
    kod: 'XULAS',
    ad: 'BIST Ulaştırma',
    kategori: 'hizmet',
    aciklama: 'Havacılık ve Taşımacılık',
    tanim: 'Havayolu taşımacılığı, havaalanı işletmeciliği, yer hizmetleri ve lojistik şirketleri.',
    hisseler: ['THYAO', 'PGSUS', 'TAVHL', 'CLEBI', 'RYSAS'],
    dinamik: 'Turizm sezonu, yolcu doluluk oranları, jet yakıtı maliyetleri ve küresel hava sahası jeopolitiği yönlendirir.',
  },
  {
    kod: 'XUHIZ',
    ad: 'BIST Hizmetler',
    kategori: 'ana-sektor',
    aciklama: 'Hizmetler Sektörü Şirketleri',
    tanim: 'Perakende ticaret, telekomünikasyon, ulaştırma, enerji ve turizm gibi imalat dışı tüm hizmet şirketleri.',
    hisseler: ['BIMAS', 'THYAO', 'TCELL', 'TTKOM', 'PGSUS'],
    dinamik: 'İç tüketim canlılığı ve hanehalkı harcamalarının doğrudan yansıdığı lokomotif çatı endekstir.',
  },
  {
    kod: 'XU100',
    ad: 'BIST 100',
    kategori: 'ana-endeks',
    aciklama: 'Borsa İstanbul Gösterge Endeksi',
    tanim: 'Piyasa değeri ve işlem hacmi en yüksek 100 paydan oluşan, Türkiye sermaye piyasalarının ana göstergesi.',
    hisseler: ['THYAO', 'BIMAS', 'GARAN', 'KCHOL', 'ASELS'],
    dinamik: 'Yabancı sermaye giriş-çıkışları, küresel risk iştahı ve makro ekonomik göstergelerin birincil özetidir.',
  },
  {
    kod: 'XU050',
    ad: 'BIST 50',
    kategori: 'ana-endeks',
    aciklama: 'En Yüksek Hacimli 50 Şirket',
    tanim: 'BIST 100 içindeki likiditesi ve piyasa değeri en yüksek 50 şirketin performansını ölçer.',
    hisseler: ['TUPRS', 'EREGL', 'SAHOL', 'AKBNK', 'FROTO'],
    dinamik: 'VİOP vadeli işlem kontratlarına ve varantlara dayanak oluşturan temel çekirdek şirketler grubudur.',
  },
  {
    kod: 'XTMTU',
    ad: 'BIST Temettü',
    kategori: 'tema',
    aciklama: 'Düzenli Temettü Dağıtan Şirketler',
    tanim: 'Son 3 yılda kâr payı dağıtan ve yatırımcısına nakit temettü verimi sağlayan şirketler.',
    hisseler: ['FROTO', 'TTRAK', 'TOASO', 'TUPRS', 'ISMEN'],
    dinamik: 'Uzun vadeli değer ve gelir yatırımcılarının ana sığınağıdır; temettü sezonunda (Mart-Mayıs) talep artar.',
  },
  {
    kod: 'XUGRA',
    ad: 'BIST Geri Alım',
    kategori: 'tema',
    aciklama: 'Kendi Paylarını Geri Alan Şirketler',
    tanim: 'Borsada hisse fiyatının şirket değerini yansıtmadığı gerekçesiyle hisse geri alım programı uygulayan ortaklıklar.',
    hisseler: ['SAHOL', 'THYAO', 'BIMAS', 'MPARK', 'SISE'],
    dinamik: 'Şirket yönetiminin hissesine güvendiğini ve fiyat tabanı oluşturma iradesini simgeler.',
  },
  {
    kod: 'X10XB',
    ad: 'BIST Banka Dışı Likit 10',
    kategori: 'tema',
    aciklama: 'Banka Dışı En Likit 10 Şirket',
    tanim: 'Bankacılık hisseleri hariç tutularak, piyasa değeri ve likiditesi en yüksek 10 sanayi ve hizmet devi.',
    hisseler: ['THYAO', 'TUPRS', 'BIMAS', 'KCHOL', 'ASELS'],
    dinamik: 'Bankacılık regülasyonlarından ve faiz baskısından bağımsız reel sektör rüzgarını gösterir.',
  },
  {
    kod: 'XU030',
    ad: 'BIST 30',
    kategori: 'ana-endeks',
    aciklama: 'Piyasa Değeri En Büyük 30 Şirket',
    tanim: 'Borsa İstanbul’un en yüksek piyasa değerine sahip, yabancı fonların en çok işlem yaptığı 30 amiral gemisi.',
    hisseler: ['THYAO', 'BIMAS', 'GARAN', 'AKBNK', 'KCHOL'],
    dinamik: 'Türkiye borsa toplam piyasa değerinin yaklaşık %75’ini temsil eder; en derin ve en likit pazardır.',
  },
  {
    kod: 'XBANK',
    ad: 'BIST Banka',
    kategori: 'mali',
    aciklama: 'Bankacılık Sektörü Payları',
    tanim: 'Kamu ve özel sermayeli tüm mevduat ve kalkınma bankalarının paylarından oluşur.',
    hisseler: ['GARAN', 'AKBNK', 'ISCTR', 'YKBNK', 'VAKBN'],
    dinamik: 'TCMB faiz kararları, net faiz marjı, kredi büyümesi ve ülke risk primi (CDS) ile doğrudan koreledir.',
  },
  {
    kod: 'XLBNK',
    ad: 'BIST Likit Banka',
    kategori: 'tema',
    aciklama: 'Likiditesi En Yüksek Bankalar',
    tanim: 'Bankacılık sektörü içinde işlem hacmi ve serbest dolaşım büyüklüğü en üstte yer alan seçkin bankalar.',
    hisseler: ['GARAN', 'AKBNK', 'ISCTR', 'YKBNK'],
    dinamik: 'Yabancı kurumsal yatırımcıların bankacılık sektörüne giriş-çıkışlarında ilk kullandığı enstrümandır.',
  },
  {
    kod: 'XPTIC',
    ad: 'BIST Perakende Ticaret',
    kategori: 'hizmet',
    aciklama: 'Zincir Marketler ve Mağazacılık',
    tanim: 'Süpermarket zincirleri, indirim mağazaları ve organize perakende ticaret şirketleri.',
    hisseler: ['BIMAS', 'MGROS', 'SOKM', 'BIZIM'],
    dinamik: 'Hızlı nakit akışı ve enflasyonu fiyatlara hızlı yansıtma kabiliyeti sayesinde enflasyonist dönemlerin lideridir.',
  },
];

const yuvarla = (n, o = 2) => Math.round(n * 10 ** o) / 10 ** o;

export function sectorVerisiBirlestir(def, yahooMeta, eskiSektor) {
// Haftalık, aylık, yılbaşı getirisi ve piyasa değeri canlı veriden hesaplanmadığı için tutulmaz (29.10.2026'da elle
// yazılmış değerler kaldırıldı). Yalnız Yahoo'nun verdiği son fiyat ve günlük değişim; alınamazsa önceki kayıt kendi
// zamanıyla kalır.
  const fiyat = yahooMeta?.regularMarketPrice ?? eskiSektor?.deger ?? 0;
  const gunlukDegisim = yahooMeta?.regularMarketChangePercent != null
    ? yuvarla(yahooMeta.regularMarketChangePercent, 1)
    : (eskiSektor?.gunluk ?? 0);

  return {
    kod: def.kod,
    ad: def.ad,
    kategori: def.kategori,
    aciklama: def.aciklama,
    tanim: def.tanim,
    hisseler: def.hisseler ?? [],
    dinamik: def.dinamik,
    deger: yuvarla(fiyat, 2),
    gunluk: gunlukDegisim,
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
        sonuclar.push(sectorVerisiBirlestir(def, null, null));
      }
    }
  }

  return {
    guncelleme: simdi.toISOString(),
    donemEtiketi: 'BIST Sektör Performans Karnesi',
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
    console.log('Örnek sektör:');
    console.log(cikti.sektorler[0]);
    console.log('\nDosyaya yazmak için: node scripts/haberler/sektor-karnesi.mjs --yaz');
  }
}
