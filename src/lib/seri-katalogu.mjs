// Seri gezgini kataloğu: sitenin veri dosyalarındaki (src/data/*.json) zaman serilerini tek listeye döker.
// Saf fonksiyon (dosya okumaz, ağ yok): kaynaklar dışarıdan verilir, derlemede /veri/seri-gezgini.json üretilir.
// Hangi alanın seri olacağı aşağıdaki TANIMLAR tablosunda yazılıdır; kaynakta olmayan değer üretilmez, türetilmiş
// seri eklenmez. Tek istisna veri sayfasıyla aynı olan politika faizi grafiğidir: TCMB'nin yayımladığı değişiklik
// tarihlerinden ay sonu geçerli oran (src/lib/turetilmis.mjs ayinFaizi, /veri/politika-faizi/ ile aynı yöntem).
import { ayinFaizi } from './turetilmis.mjs';

// Birim kısaltmaları (aynı yazım = aynı birim; gezgin farklı birimleri bu yazıma göre ayırt eder).
const YZ = '%';
const MUSD = 'milyon ABD doları';
const MYUSD = 'milyar ABD doları';
const BTL = 'bin TL';
const BUSD = 'bin ABD doları';
const END = 'endeks';
const PUAN = 'puan';
const TL = 'TL';
const ADET = 'adet';
const M2 = 'm²';

const SAYFA = {
  enflasyon: '/veri/enflasyon/',
  enfHiz: '/veri/enflasyon-hizi/',
  konut: '/veri/konut-fiyat-endeksi/',
  kira: '/veri/kira-endeksi/',
  kiraCarpani: '/veri/kira-carpani/',
  issizlik: '/veri/issizlik-orani/',
  piyasaFaizleri: '/veri/piyasa-faizleri/',
  makas: '/veri/kredi-mevduat-makasi/',
  mevduat: '/veri/doviz-mevduatlari/',
  beklenti: '/veri/enflasyon-beklentisi/',
  guven: '/veri/tuketici-guveni/',
  rek: '/veri/reel-efektif-kur/',
  rezerv: '/veri/tcmb-rezervleri/',
  kapasite: '/veri/kapasite-kullanimi/',
  kurHiz: '/veri/kur-degisim-hizi/',
  kur: '/veri/doviz-kurlari/',
  sanayi: '/veri/sanayi-uretimi/',
  buyume: '/veri/buyume/',
  konutSatis: '/veri/konut-satislari/',
  ufe: '/veri/uretici-fiyatlari/',
  insaatIzin: '/veri/insaat-izinleri/',
  kesimBeklenti: '/veri/beklenti-anketleri/',
  portfoy: '/veri/yabanci-portfoy-akimlari/',
  cari: '/veri/cari-denge/',
  disBorc: '/veri/dis-borc/',
  disTicaret: '/veri/dis-ticaret/',
  butce: '/veri/butce-dengesi/',
  kredi: '/veri/kredi-hacmi/',
  kart: '/veri/kartli-harcamalar/',
  netPoz: '/veri/net-doviz-pozisyonu/',
  faiz: '/veri/politika-faizi/',
  dunya: '/veri/dunya-politika-faizleri/',
  abdTahvil: '/veri/abd-tahvilleri/',
  abdAkim: '/veri/abd-tahvil-akimlari/',
  swap: '/veri/swap-payi/',
  altin: '/veri/altin-kazanci/',
  reelBist: '/veri/reel-bist-30/',
  bistTufe: '/veri/bist-100-tufe/',
};

const BOLGE = { TR: 'Türkiye', TR10: 'İstanbul', TR51: 'Ankara', TR31: 'İzmir' };
const SEKTOR = {
  KT1: 'Toplam',
  KT16: 'Market ve alışveriş merkezleri',
  KT5: 'Çeşitli gıda',
  KT24: 'Yemek',
  KT4: 'Benzin ve yakıt istasyonları',
  KT9: 'Giyim ve aksesuar',
  KT8: 'Elektrik-elektronik eşya, bilgisayar',
  KT19: 'Sağlık, sağlık ürünleri, kozmetik',
  KT12: 'Konaklama',
  KT10: 'Havayolları',
  KT50: 'İnternet üzerinden alışveriş',
};
const ILLER = ['Türkiye', 'İstanbul', 'Ankara', 'İzmir'];

// Resmi bölüm tanımı. alanlar: [alanYolu, idSonu, ad, birim]. Yol noktalıdır ('bolgeler.TR.endeks').
// satirlar: bölümde satır dizisinin adı; siklik: satırda `tarih` varsa 'gun' ya da 'hafta' (ay/çeyrek satırdan anlaşılır).
const t = (bolum, grup, sayfa, alanlar, ek = {}) => ({ kaynak: 'resmi', bolum, grup, sayfa, alanlar, ...ek });

const SLUG = { Türkiye: 'turkiye', İstanbul: 'istanbul', Ankara: 'ankara', İzmir: 'izmir' };

const bolgeAlanlari = (endeksAd, yillikAd) =>
  Object.entries(BOLGE).flatMap(([kod, il]) => [
    [`bolgeler.${kod}.endeks`, `endeks.${kod.toLowerCase()}`, `${endeksAd}, ${il}`, END],
    [`bolgeler.${kod}.yillik`, `yillik.${kod.toLowerCase()}`, `${yillikAd}, ${il}`, YZ],
  ]);

export const TANIMLAR = [
  t('enflasyon', 'Enflasyon', SAYFA.enflasyon, [
    ['yillik', 'yillik', 'Yıllık enflasyon (TÜFE)', YZ],
    ['aylik', 'aylik', 'Aylık enflasyon (TÜFE)', YZ],
  ]),
  t('tufeArindirilmis', 'Enflasyon', SAYFA.enfHiz, [['aylik', 'aylik', 'Aylık enflasyon (TÜFE), mevsimsellikten arındırılmış', YZ]]),
  t('beklenti', 'Enflasyon', SAYFA.beklenti, [
    ['ay12', 'ay12', '12 ay sonrası yıllık enflasyon beklentisi', YZ],
    ['ay24', 'ay24', '24 ay sonrası yıllık enflasyon beklentisi', YZ],
  ]),
  t('konut', 'Konut', SAYFA.konut, bolgeAlanlari('Konut fiyat endeksi', 'Konut fiyatları, yıllık değişim')),
  t(
    'kira',
    'Konut',
    SAYFA.kira,
    Object.entries(BOLGE).flatMap(([kod, il]) => [
      [`bolgeler.${kod}.endeks`, `endeks.${kod.toLowerCase()}`, `Yeni kiracı kira endeksi, ${il}`, END],
      [`bolgeler.${kod}.yillik`, `yillik.${kod.toLowerCase()}`, `Yeni kiracı kira endeksi, yıllık değişim, ${il}`, YZ],
    ]),
  ),
  t(
    'birimFiyat',
    'Konut',
    SAYFA.kiraCarpani,
    ILLER.flatMap((il) => [
      [`iller.${il}.fiyat`, `fiyat.${SLUG[il]}`, `Konut birim fiyatı, ${il}`, 'TL/m²'],
      [`iller.${il}.kira`, `kira.${SLUG[il]}`, `Konut birim kirası, ${il}`, 'TL/m²'],
    ]),
  ),
  t('issizlik', 'İşgücü', SAYFA.issizlik, [['oran', 'oran', 'İşsizlik oranı, mevsimsellikten arındırılmış', YZ]]),
  t('guven', 'Anketler', SAYFA.guven, [
    ['endeks', 'endeks', 'Tüketici güven endeksi', END],
    ['haneGecmis', 'hane-gecmis', 'Hanenin maddi durumu, son 12 ay', END],
    ['haneBeklenti', 'hane-beklenti', 'Hanenin maddi durumu, gelecek 12 ay beklentisi', END],
    ['ekonomiBeklenti', 'ekonomi-beklenti', 'Genel ekonomik durum, gelecek 12 ay beklentisi', END],
  ]),
  t('kapasite', 'Sanayi', SAYFA.kapasite, [
    ['arindirilmis', 'arindirilmis', 'Kapasite kullanım oranı, mevsimsellikten arındırılmış', YZ],
    ['ham', 'ham', 'Kapasite kullanım oranı, arındırılmamış', YZ],
    ['tuketim', 'tuketim', 'Kapasite kullanım oranı, tüketim malları', YZ],
    ['ara', 'ara', 'Kapasite kullanım oranı, ara malları', YZ],
    ['yatirim', 'yatirim', 'Kapasite kullanım oranı, yatırım malları', YZ],
  ]),
  t('sanayi', 'Sanayi', SAYFA.sanayi, [
    ['endeks', 'endeks', 'Sanayi üretim endeksi (2021=100), arındırılmış', END],
    ['imalat', 'imalat', 'İmalat sanayi üretim endeksi (2021=100), arındırılmış', END],
    ['aylik', 'aylik', 'Sanayi üretimi, aylık değişim', YZ],
    ['yillik', 'yillik', 'Sanayi üretimi, yıllık değişim', YZ],
  ]),
  t('buyume', 'Büyüme', SAYFA.buyume, [
    ['yillik', 'yillik', 'GSYH büyümesi, yıllık değişim', YZ],
    ['ceyreklik', 'ceyreklik', 'GSYH büyümesi, çeyreklik değişim, arındırılmış', YZ],
    ['endeks', 'endeks', 'GSYH hacim endeksi (2009=100), arındırılmış', END],
    ['hanehalki', 'hanehalki', 'Hanehalkı tüketimi, yıllık değişim', YZ],
    ['devlet', 'devlet', 'Devletin nihai tüketimi, yıllık değişim', YZ],
    ['yatirim', 'yatirim', 'Gayrisafi sabit sermaye oluşumu (yatırım), yıllık değişim', YZ],
    ['ihracat', 'ihracat', 'Mal ve hizmet ihracatı, yıllık değişim', YZ],
    ['ithalat', 'ithalat', 'Mal ve hizmet ithalatı, yıllık değişim', YZ],
    ['tarim', 'tarim', 'Tarım, ormancılık ve balıkçılık, yıllık değişim', YZ],
    ['sanayi', 'sanayi', 'Sanayi (GSYH sektörü), yıllık değişim', YZ],
    ['insaat', 'insaat', 'İnşaat, yıllık değişim', YZ],
    ['hizmetler', 'hizmetler', 'Ticaret, ulaştırma, konaklama, yıllık değişim', YZ],
    ['bilgi', 'bilgi', 'Bilgi ve iletişim, yıllık değişim', YZ],
    ['finans', 'finans', 'Finans ve sigorta, yıllık değişim', YZ],
    ['gayrimenkul', 'gayrimenkul', 'Gayrimenkul faaliyetleri, yıllık değişim', YZ],
    ['mesleki', 'mesleki', 'Mesleki, idari ve destek hizmetleri, yıllık değişim', YZ],
    ['kamu', 'kamu', 'Kamu yönetimi, eğitim, sağlık, yıllık değişim', YZ],
    ['diger', 'diger', 'Diğer hizmetler (GSYH sektörü), yıllık değişim', YZ],
  ]),
  t('konutSatis', 'Konut', SAYFA.konutSatis, [
    ['toplam', 'toplam', 'Toplam konut satışı', ADET],
    ['toplamYillik', 'toplam-yillik', 'Toplam konut satışı, yıllık değişim', YZ],
    ['arindirilmis', 'arindirilmis', 'Toplam konut satışı, mevsim ve takvim etkilerinden arındırılmış', ADET],
    ['ilkEl', 'ilk-el', 'İlk el konut satışı', ADET],
    ['ikinciEl', 'ikinci-el', 'İkinci el konut satışı', ADET],
    ['ipotekli', 'ipotekli', 'İpotekli konut satışı', ADET],
    ['isyeri', 'isyeri', 'Toplam iş yeri satışı', ADET],
  ]),
  t('ufe', 'Enflasyon', SAYFA.ufe, [
    ['endeks', 'endeks', 'Yurt içi üretici fiyat endeksi (2003=100)', END],
    ['aylik', 'aylik', 'Yurt içi üretici fiyatları (Yİ-ÜFE), aylık değişim', YZ],
    ['yillik', 'yillik', 'Yurt içi üretici fiyatları (Yİ-ÜFE), yıllık değişim', YZ],
    ['madencilik', 'madencilik', 'Yİ-ÜFE, madencilik ve taşocakçılığı, yıllık değişim', YZ],
    ['imalat', 'imalat', 'Yİ-ÜFE, imalat, yıllık değişim', YZ],
    ['enerji', 'enerji', 'Yİ-ÜFE, elektrik, gaz, buhar ve iklimlendirme, yıllık değişim', YZ],
    ['su', 'su', 'Yİ-ÜFE, su temini, kanalizasyon, atık yönetimi, yıllık değişim', YZ],
    ['gida', 'gida', 'Yİ-ÜFE, gıda ürünleri (imalat), yıllık değişim', YZ],
    ['petrol', 'petrol', 'Yİ-ÜFE, kok ve rafine petrol ürünleri, yıllık değişim', YZ],
    ['metal', 'metal', 'Yİ-ÜFE, ana metaller, yıllık değişim', YZ],
  ]),
  t('ufe', 'Enflasyon', SAYFA.ufe, [
    ['aylik', 'aylik', 'Hizmet üretici fiyat endeksi (ticaret, finans ve sigorta hariç), aylık değişim', YZ],
    ['yillik', 'yillik', 'Hizmet üretici fiyat endeksi (ticaret, finans ve sigorta hariç), yıllık değişim', YZ],
  ], { satirlar: 'hizmet', idOnek: 'ufe-hizmet' }),
  t('ufe', 'Enflasyon', SAYFA.ufe, [
    ['aylik', 'aylik', 'Tarım ürünleri üretici fiyat endeksi, aylık değişim', YZ],
    ['yillik', 'yillik', 'Tarım ürünleri üretici fiyat endeksi, yıllık değişim', YZ],
  ], { satirlar: 'tarim', idOnek: 'ufe-tarim' }),
  t('ufe', 'Enflasyon', SAYFA.ufe, [
    ['aylik', 'aylik', 'Tarımsal girdi fiyat endeksi, aylık değişim', YZ],
    ['yillik', 'yillik', 'Tarımsal girdi fiyat endeksi, yıllık değişim', YZ],
  ], { satirlar: 'tarimGirdi', idOnek: 'ufe-tarim-girdi' }),
  t('insaatIzin', 'Konut', SAYFA.insaatIzin, [
    ['ruhsatDaire', 'ruhsat-daire', 'Yapı ruhsatı, daire sayısı', ADET],
    ['ruhsatAlan', 'ruhsat-alan', 'Yapı ruhsatı, yüzölçümü', M2],
    ['ruhsatYapi', 'ruhsat-yapi', 'Yapı ruhsatı, yapı sayısı', ADET],
    ['ruhsatApartman', 'ruhsat-apartman', 'Yapı ruhsatı, iki ve daha fazla daireli konut binaları, yüzölçümü', M2],
    ['ruhsatMustakil', 'ruhsat-mustakil', 'Yapı ruhsatı, tek daireli konut binaları, yüzölçümü', M2],
    ['ruhsatToplu', 'ruhsat-toplu', 'Yapı ruhsatı, topluluklara ait ikamet binaları, yüzölçümü', M2],
    ['ruhsatOtel', 'ruhsat-otel', 'Yapı ruhsatı, otel ve benzeri binalar, yüzölçümü', M2],
    ['ruhsatOfis', 'ruhsat-ofis', 'Yapı ruhsatı, ofis (iş yeri) binaları, yüzölçümü', M2],
    ['ruhsatTicaret', 'ruhsat-ticaret', 'Yapı ruhsatı, toptan ve perakende ticaret binaları, yüzölçümü', M2],
    ['ruhsatUlastirma', 'ruhsat-ulastirma', 'Yapı ruhsatı, ulaştırma ve iletişim binaları, yüzölçümü', M2],
    ['ruhsatSanayi', 'ruhsat-sanayi', 'Yapı ruhsatı, sanayi binaları ve depolar, yüzölçümü', M2],
    ['ruhsatKamu', 'ruhsat-kamu', 'Yapı ruhsatı, eğitim, sağlık, kültür ve eğlence binaları, yüzölçümü', M2],
    ['ruhsatDiger', 'ruhsat-diger', 'Yapı ruhsatı, diğer binalar, yüzölçümü', M2],
    ['iskanDaire', 'iskan-daire', 'İskân, daire sayısı', ADET],
    ['iskanAlan', 'iskan-alan', 'İskân, yüzölçümü', M2],
    ['iskanYapi', 'iskan-yapi', 'İskân, yapı sayısı', ADET],
    ['iskanApartman', 'iskan-apartman', 'İskân, iki ve daha fazla daireli konut binaları, yüzölçümü', M2],
    ['iskanMustakil', 'iskan-mustakil', 'İskân, tek daireli konut binaları, yüzölçümü', M2],
    ['iskanToplu', 'iskan-toplu', 'İskân, topluluklara ait ikamet binaları, yüzölçümü', M2],
    ['iskanOtel', 'iskan-otel', 'İskân, otel ve benzeri binalar, yüzölçümü', M2],
    ['iskanOfis', 'iskan-ofis', 'İskân, ofis (iş yeri) binaları, yüzölçümü', M2],
    ['iskanTicaret', 'iskan-ticaret', 'İskân, toptan ve perakende ticaret binaları, yüzölçümü', M2],
    ['iskanUlastirma', 'iskan-ulastirma', 'İskân, ulaştırma ve iletişim binaları, yüzölçümü', M2],
    ['iskanSanayi', 'iskan-sanayi', 'İskân, sanayi binaları ve depolar, yüzölçümü', M2],
    ['iskanKamu', 'iskan-kamu', 'İskân, eğitim, sağlık, kültür ve eğlence binaları, yüzölçümü', M2],
    ['iskanDiger', 'iskan-diger', 'İskân, diğer binalar, yüzölçümü', M2],
  ]),
  t('kesimBeklenti', 'Enflasyon', SAYFA.kesimBeklenti, [
    ['piyasa', 'piyasa', '12 ay sonrası enflasyon beklentisi, piyasa katılımcıları', YZ],
    ['reel', 'reel', '12 ay sonrası enflasyon beklentisi, reel kesim', YZ],
    ['hanehalki', 'hanehalki', '12 ay sonrası enflasyon beklentisi, hanehalkı', YZ],
  ]),
  t('kesimBeklenti', 'Enflasyon', SAYFA.kesimBeklenti, [
    ['altinda', 'altinda', 'Hanehalkı: enflasyonun düşmesini bekleyenlerin payı', YZ],
    ['ayni', 'ayni', 'Hanehalkı: enflasyonun aynı kalmasını bekleyenlerin payı', YZ],
    ['uzerinde', 'uzerinde', 'Hanehalkı: enflasyonun artmasını bekleyenlerin payı', YZ],
    ['gecmisGida', 'gecmis-gida', 'Hanehalkı: son bir yılda en çok artan grup, gıda (seçimlerin payı)', YZ],
    ['gecmisEnerji', 'gecmis-enerji', 'Hanehalkı: son bir yılda en çok artan grup, yakıt ve enerji (seçimlerin payı)', YZ],
    ['gecmisLokanta', 'gecmis-lokanta', 'Hanehalkı: son bir yılda en çok artan grup, otel, lokanta vb. hizmetler (seçimlerin payı)', YZ],
    ['gecmisKira', 'gecmis-kira', 'Hanehalkı: son bir yılda en çok artan grup, kiralar (seçimlerin payı)', YZ],
    ['gecmisDayanikli', 'gecmis-dayanikli', 'Hanehalkı: son bir yılda en çok artan grup, dayanıklı tüketim malları (seçimlerin payı)', YZ],
    ['gecmisEgitim', 'gecmis-egitim', 'Hanehalkı: son bir yılda en çok artan grup, eğitim (seçimlerin payı)', YZ],
    ['gecmisDiger', 'gecmis-diger', 'Hanehalkı: son bir yılda en çok artan grup, diğer (seçimlerin payı)', YZ],
    ['gelecekGida', 'gelecek-gida', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, gıda (seçimlerin payı)', YZ],
    ['gelecekEnerji', 'gelecek-enerji', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, yakıt ve enerji (seçimlerin payı)', YZ],
    ['gelecekLokanta', 'gelecek-lokanta', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, otel, lokanta vb. hizmetler (seçimlerin payı)', YZ],
    ['gelecekKira', 'gelecek-kira', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, kiralar (seçimlerin payı)', YZ],
    ['gelecekDayanikli', 'gelecek-dayanikli', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, dayanıklı tüketim malları (seçimlerin payı)', YZ],
    ['gelecekEgitim', 'gelecek-egitim', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, eğitim (seçimlerin payı)', YZ],
    ['gelecekDiger', 'gelecek-diger', 'Hanehalkı: gelecek 12 ayda en çok artacak grup, diğer (seçimlerin payı)', YZ],
  ], { satirlar: 'hane', idOnek: 'hane-beklenti' }),
  t('makas', 'Faiz', SAYFA.makas, [
    ['ihtiyac', 'ihtiyac', 'İhtiyaç kredisi faizi', YZ],
    ['tasit', 'tasit', 'Taşıt kredisi faizi', YZ],
    ['konut', 'konut', 'Konut kredisi faizi', YZ],
    ['mevduat', 'mevduat', '3 aya kadar vadeli TL mevduat faizi', YZ],
  ], { siklik: 'hafta' }),
  t('piyasaFaizleri', 'Faiz', SAYFA.piyasaFaizleri, [
    ['politika', 'politika', 'Politika faizi (haftalık, piyasa faizleri tablosu)', YZ],
    ['tahvil5Y', 'tahvil5y', '5 yıllık devlet tahvili faizi', YZ],
  ], { siklik: 'hafta' }),
  t('mevduat', 'Bankacılık', SAYFA.mevduat, [
    ['toplam', 'toplam', 'Döviz ve altın mevduatı, toplam', MUSD],
    ['yurtIci', 'yurtici', 'Döviz ve altın mevduatı, yurt içi yerleşikler', MUSD],
    ['bireysel', 'bireysel', 'Döviz ve altın mevduatı, bireysel', MUSD],
    ['tuzel', 'tuzel', 'Döviz ve altın mevduatı, tüzel', MUSD],
    ['altin', 'altin', 'Altın mevduatı', MUSD],
  ], { siklik: 'hafta' }),
  t('kredi', 'Bankacılık', SAYFA.kredi, [
    ['toplam', 'toplam', 'Toplam yurt içi kredi', BTL],
    ['toplamYillik', 'toplam-yillik', 'Toplam yurt içi kredi, yıllık değişim', YZ],
    ['haneMevduat', 'hane-mevduat', 'Hanehalkı kredisi, mevduat bankaları', BTL],
    ['haneKalkinma', 'hane-kalkinma', 'Hanehalkı kredisi, kalkınma ve yatırım bankaları', BTL],
    ['haneKatilim', 'hane-katilim', 'Hanehalkı kredisi, katılım bankaları', BTL],
    ['sirketMevduat', 'sirket-mevduat', 'Şirket kredisi, mevduat bankaları', BTL],
    ['sirketKalkinma', 'sirket-kalkinma', 'Şirket kredisi, kalkınma ve yatırım bankaları', BTL],
    ['sirketKatilim', 'sirket-katilim', 'Şirket kredisi, katılım bankaları', BTL],
  ]),
  t(
    'kart',
    'Harcama',
    SAYFA.kart,
    Object.entries(SEKTOR).flatMap(([kod, ad]) => [
      [`sektorler.${kod}.tutar`, `tutar.${kod.toLowerCase()}`, `Kartlı harcama tutarı, ${ad}`, BTL],
      [`sektorler.${kod}.yillik`, `yillik.${kod.toLowerCase()}`, `Kartlı harcama, yıllık değişim, ${ad}`, YZ],
    ]),
    { siklik: 'hafta' },
  ),
  t('rek', 'Kur', SAYFA.rek, [
    ['genel', 'genel', 'Reel efektif döviz kuru (2025=100), genel', END],
    ['gelismekte', 'gelismekte', 'Reel efektif döviz kuru (2025=100), gelişmekte olan ülkeler', END],
    ['gelismis', 'gelismis', 'Reel efektif döviz kuru (2025=100), gelişmiş ülkeler', END],
  ]),
  t('kurHaftalik', 'Kur', SAYFA.kurHiz, [
    ['usd', 'usd', 'Dolar satış kuru (haftalık)', TL],
    ['eur', 'eur', 'Euro satış kuru (haftalık)', TL],
  ], { siklik: 'hafta' }),
  t('brutRezerv', 'Rezerv', SAYFA.rezerv, [
    ['toplam', 'toplam', 'TCMB rezervleri, toplam', MUSD],
    ['altin', 'altin', 'TCMB rezervleri, altın', MUSD],
    ['doviz', 'doviz', 'TCMB rezervleri, döviz', MUSD],
  ], { siklik: 'hafta' }),
  t('portfoyHaftalik', 'Yabancı portföy', SAYFA.portfoy, [
    ['hisse', 'hisse', 'Yurt dışı yerleşiklerin hisse senedi alım-satımı (haftalık)', MUSD],
    ['dibs', 'dibs', 'Yurt dışı yerleşiklerin DİBS alım-satımı (haftalık)', MUSD],
    ['ost', 'ost', 'Yurt dışı yerleşiklerin özel sektör borçlanma senedi alım-satımı (haftalık)', MUSD],
    ['toplam', 'toplam', 'Yurt dışı yerleşiklerin menkul kıymet alım-satımı, toplam (haftalık)', MUSD],
    ['hisseStok', 'hisse-stok', 'Yurt dışı yerleşiklerin hisse senedi stoku', MUSD],
    ['dibsStok', 'dibs-stok', 'Yurt dışı yerleşiklerin DİBS stoku', MUSD],
  ], { siklik: 'hafta' }),
  t('portfoyAylik', 'Yabancı portföy', SAYFA.portfoy, [
    ['hisse', 'hisse', 'Yurt dışı yerleşiklerin hisse senedi alım-satımı (aylık)', MUSD],
    ['dibs', 'dibs', 'Yurt dışı yerleşiklerin DİBS alım-satımı (aylık)', MUSD],
  ]),
  t('cari', 'Dış denge', SAYFA.cari, [
    ['cari', 'cari', 'Cari işlemler dengesi', MUSD],
    ['altinHaric', 'altin-haric', 'Cari denge, altın hariç', MUSD],
    ['enerjiHaric', 'enerji-haric', 'Cari denge, enerji hariç', MUSD],
    ['cekirdek', 'cekirdek', 'Cari denge, altın ve enerji hariç', MUSD],
    ['altin', 'altin', 'Parasal olmayan altın, net', MUSD],
    ['enerji', 'enerji', 'Enerji, net', MUSD],
    ['seyahat', 'seyahat', 'Seyahat geliri', MUSD],
  ]),
  t('disBorc', 'Dış denge', SAYFA.disBorc, [
    ['kalanVade', 'kalan-vade', 'Kısa vadeli dış borç, kalan vadeye göre', MUSD],
    ['orijinalVade', 'orijinal-vade', 'Kısa vadeli dış borç stoku', MUSD],
    ['rezerv', 'rezerv', 'Resmi rezerv varlıklar', MUSD],
  ]),
  t('disBorc', 'Dış denge', SAYFA.disBorc, [
    ['brut', 'brut', 'Brüt dış borç stoku', MUSD],
    ['net', 'net', 'Net dış borç stoku', MUSD],
  ], { satirlar: 'ceyrekler', idOnek: 'disborc-ceyrek' }),
  t('disTicaret', 'Dış denge', SAYFA.disTicaret, [
    ['ihracat', 'ihracat', 'İhracat', BUSD],
    ['ithalat', 'ithalat', 'İthalat', BUSD],
    ['yatirim', 'yatirim', 'Dış ticaret, yatırım (sermaye) malları', BUSD],
    ['ara', 'ara', 'Dış ticaret, ara malları (hammadde)', BUSD],
    ['tuketim', 'tuketim', 'Dış ticaret, tüketim malları', BUSD],
  ]),
  t('butce', 'Bütçe', SAYFA.butce, [
    ['gelir', 'gelir', 'Genel bütçe gelirleri', BTL],
    ['harcama', 'harcama', 'Genel bütçe harcamaları', BTL],
    ['faiz', 'faiz', 'Genel bütçe faiz harcamaları', BTL],
    ['faizDisi', 'faiz-disi', 'Genel bütçe faiz dışı denge', BTL],
    ['denge', 'denge', 'Genel bütçe dengesi', BTL],
  ]),
  t('kur', 'Kur', SAYFA.kur, [
    ['USD.satis', 'usd', 'Dolar döviz satış kuru (günlük)', TL],
    ['EUR.satis', 'eur', 'Euro döviz satış kuru (günlük)', TL],
    ['GBP.satis', 'gbp', 'İngiliz sterlini döviz satış kuru (günlük)', TL],
  ], { satirlar: 'gecmis', siklik: 'gun' }),
  t('rezerv', 'Rezerv', SAYFA.netPoz, [['deger', 'net-doviz-pozisyonu', 'TCMB net döviz pozisyonu (günlük, Analitik Bilanço)', MYUSD]], {
    satirlar: 'gecmis',
    siklik: 'gun',
  }),
];

// Diğer veri dosyaları. satir: kaynak dosyadan satır dizisini ve tarih biçimini veren işlev; alanlar yukarıdakiyle aynı.
export const DIGER_TANIMLAR = [
  {
    kaynak: 'bistTufe',
    grup: 'Borsa',
    sayfa: SAYFA.bistTufe,
    siklik: 'gun',
    onek: 'bist-tufe',
    kaynakBilgisi: { ad: 'Borsa İstanbul (BİST 100) ve TÜİK (TÜFE), finfolis hesaplaması', url: null },
    satirlar: (k) => k.noktalar,
    alanlar: [
      ['bist', 'bist100', 'BİST 100 kapanışı (günlük)', END],
      ['deger', 'reel', 'BİST 100 / TÜFE, enflasyondan arındırılmış değer (günlük)', END],
    ],
  },
  {
    kaynak: 'reelBist',
    grup: 'Borsa',
    sayfa: SAYFA.reelBist,
    siklik: 'ay',
    onek: 'reel-bist',
    satirlar: (k) => k.noktalar,
    alanlar: [
      ['reelEndeks', 'reel-endeks', 'Reel BİST 30 endeksi (Eylül 2014=100)', END],
      ['bistKapanis', 'bist30', 'BİST 30 aylık kapanış', END],
    ],
  },
  {
    kaynak: 'altin',
    grup: 'Rezerv',
    sayfa: SAYFA.altin,
    siklik: 'gun',
    onek: 'altin',
    kaynakBilgisi: (k) => ({ ad: k.kaynak, url: null }),
    satirlar: (k) => k.seri,
    alanlar: [
      ['ons_fiyat_usd', 'ons', 'Ons altın fiyatı (günlük)', 'ABD doları'],
      ['kazanc_milyar_usd', 'kazanc', 'TCMB altın rezervi değerleme kazancı (günlük)', MYUSD],
    ],
  },
  {
    kaynak: 'netPozisyon',
    grup: 'Rezerv',
    sayfa: SAYFA.netPoz,
    siklik: 'gun',
    onek: 'net-pozisyon',
    kaynakBilgisi: (k) => ({ ad: k.kaynak, url: null }),
    satirlar: (k) => k.seri,
    tarihBicimi: 'gunAyYil',
    alanlar: [
      ['net_rezerv_milyar_usd', 'net-rezerv', 'TCMB net rezervi (günlük)', MYUSD],
      ['ham_degisim_milyar_usd', 'ham-degisim', 'TCMB net rezervi, günlük değişim', MYUSD],
      ['degisim_altin_arindirilmis_milyar_usd', 'degisim-altinsiz', 'TCMB net rezervi, günlük değişim (altın değerlemesinden arındırılmış)', MYUSD],
      ['usd_kuru', 'usd-kuru', 'Dolar kuru (günlük)', TL],
      ['altin_ons_usd', 'ons', 'Ons altın (günlük)', 'ABD doları'],
    ],
  },
  {
    kaynak: 'swap',
    grup: 'Rezerv',
    sayfa: SAYFA.swap,
    siklik: 'ay',
    onek: 'swap',
    kaynakBilgisi: (k) => ({ ad: k.kaynak, url: null }),
    satirlar: (k) => k.seri,
    tarihBicimi: 'yilAy',
    alanlar: [
      ['toplam_rezerv_milyar_usd', 'toplam-rezerv', 'TCMB toplam rezervi', MYUSD],
      ['doviz_rezervi_milyar_usd', 'doviz-rezervi', 'TCMB döviz rezervi', MYUSD],
      ['altin_rezervi_milyar_usd', 'altin-rezervi', 'TCMB altın rezervi', MYUSD],
      ['swap_stoku_milyar_usd', 'swap-stoku', 'TCMB swap stoku', MYUSD],
      ['swap_payi_toplam_yuzde', 'pay-toplam', 'Swap payı, toplam rezerv içinde', YZ],
      ['swap_payi_doviz_yuzde', 'pay-doviz', 'Swap payı, döviz rezervi içinde', YZ],
    ],
  },
  {
    kaynak: 'abdTahvilleri',
    grup: 'Dış denge',
    sayfa: SAYFA.abdTahvil,
    siklik: 'ay',
    onek: 'abd-tahvil',
    kaynakBilgisi: { ad: 'ABD Hazine Bakanlığı, Treasury International Capital (TIC) ve FRED', url: 'https://ticdata.treasury.gov/' },
    satirlar: (k) => k.noktalar,
    alanlar: [
      ['toplamUSD', 'toplam', 'Türkiye’nin elindeki ABD tahvilleri, toplam', MUSD],
      ['kisaUSD', 'kisa', 'Türkiye’nin elindeki ABD tahvilleri, kısa vadeli', MUSD],
      ['uzunUSD', 'uzun', 'Türkiye’nin elindeki ABD tahvilleri, uzun vadeli', MUSD],
    ],
  },
  {
    kaynak: 'abdTahvil',
    grup: 'Dış denge',
    sayfa: SAYFA.abdAkim,
    siklik: 'ay',
    onek: 'abd-akim',
    kaynakBilgisi: { ad: 'ABD Hazine Bakanlığı, Treasury International Capital (TIC) ve FRED', url: 'https://ticdata.treasury.gov/' },
    satirlar: (k) => k.seri,
    tarihBicimi: 'donem',
    alanlar: [['netAkim', 'net-akim', 'Türkiye’nin ABD tahvili net alım-satımı (aylık)', MUSD]],
  },
  {
    kaynak: 'ito',
    grup: 'Enflasyon',
    sayfa: SAYFA.enflasyon,
    siklik: 'ay',
    onek: 'ito',
    kaynakBilgisi: (k) => k.kaynak,
    satirlar: (k) => k.satirlar,
    alanlar: [['aylik', 'aylik', 'İTO İstanbul ücretliler geçinme indeksi, aylık değişim', YZ]],
  },
];

const iki = (n) => String(n).padStart(2, '0');

// Satırdan ISO tarih ve sıklık; çözülemezse null.
export function satirTarihi(satir, bicim = null, siklikVarsayilan = 'gun') {
  if (bicim === 'gunAyYil') {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(satir.tarih ?? '');
    return m ? { tarih: `${m[3]}-${m[2]}-${m[1]}`, siklik: 'gun' } : null;
  }
  if (bicim === 'yilAy') {
    const m = /^(\d{4})-(\d{1,2})$/.exec(satir.tarih ?? '');
    return m ? { tarih: `${m[1]}-${iki(m[2])}-01`, siklik: 'ay' } : null;
  }
  if (bicim === 'donem') {
    const m = /^(\d{4})-(\d{2})$/.exec(satir.donem ?? '');
    return m ? { tarih: `${m[1]}-${m[2]}-01`, siklik: 'ay' } : null;
  }
  if (typeof satir.tarih === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(satir.tarih)) return { tarih: satir.tarih, siklik: siklikVarsayilan };
    if (/^\d{4}-\d{2}$/.test(satir.tarih)) return { tarih: `${satir.tarih}-01`, siklik: 'ay' };
    return null;
  }
  if (Number.isInteger(satir.yil) && Number.isInteger(satir.ay)) return { tarih: `${satir.yil}-${iki(satir.ay)}-01`, siklik: 'ay' };
  if (Number.isInteger(satir.yil) && Number.isInteger(satir.ceyrek)) return { tarih: `${satir.yil}-${iki((satir.ceyrek - 1) * 3 + 1)}-01`, siklik: 'ceyrek' };
  return null;
}

// "bolgeler.TR.endeks" gibi yoldan değer; sonlu sayı değilse null.
export function yoldanDeger(nesne, yol) {
  let o = nesne;
  for (const p of yol.split('.')) {
    if (o == null || typeof o !== 'object') return null;
    o = o[p];
  }
  return typeof o === 'number' && Number.isFinite(o) ? o : null;
}

function seriKur({ id, ad, grup, birim, sayfa, kaynak, satirlar, alan, bicim, siklikVarsayilan }) {
  const noktalar = [];
  let siklik = null;
  for (const s of satirlar ?? []) {
    const d = satirTarihi(s, bicim, siklikVarsayilan);
    const v = yoldanDeger(s, alan);
    if (!d || v == null) continue;
    siklik ??= d.siklik;
    noktalar.push([d.tarih, v]);
  }
  if (!noktalar.length) return null;
  noktalar.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { id, ad, bolum: grup, birim, siklik, kaynak, sayfa, noktalar };
}

// Politika faizi: veri sayfasıyla aynı, her ayın son günü geçerli oran (TCMB değişiklik tarihlerinden).
function faizSerisi(faiz) {
  const gecmis = faiz?.gecmis;
  if (!gecmis?.length || !faiz.alinma) return null;
  const ay = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
  const ilk = ay(gecmis[0].tarih);
  const son = ay(faiz.alinma);
  const noktalar = [];
  for (let m = ilk; m <= son; m++) {
    const o = ayinFaizi(gecmis, Math.floor(m / 12), (m % 12) + 1);
    if (o != null) noktalar.push([`${Math.floor(m / 12)}-${iki((m % 12) + 1)}-01`, o]);
  }
  return {
    id: 'faiz.politika',
    ad: 'Politika faizi (TCMB, ay sonu geçerli oran)',
    bolum: 'Faiz',
    birim: YZ,
    siklik: 'ay',
    kaynak: faiz.kaynak,
    sayfa: SAYFA.faiz,
    noktalar,
  };
}

// kaynaklar: { resmi, bistTufe, reelBist, altin, netPozisyon, swap, abdTahvilleri, abdTahvil, ito, dunya }
export function seriKatalogu(kaynaklar) {
  const out = [];
  const r = kaynaklar.resmi ?? {};
  const faiz = faizSerisi(r.faiz);
  if (faiz) out.push(faiz);

  for (const tn of TANIMLAR) {
    const bolum = r[tn.bolum];
    if (!bolum) continue;
    const satirlar = bolum[tn.satirlar ?? 'satirlar'];
    for (const [alan, idSonu, ad, birim] of tn.alanlar) {
      const s = seriKur({
        id: `${tn.idOnek ?? tn.bolum.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}.${idSonu}`,
        ad,
        grup: tn.grup,
        birim,
        sayfa: tn.sayfa,
        kaynak: { ad: bolum.kaynak.ad, url: bolum.kaynak.url },
        satirlar,
        alan,
        siklikVarsayilan: tn.siklik ?? 'gun',
      });
      if (s) out.push(s);
    }
  }

  for (const tn of DIGER_TANIMLAR) {
    const dosya = kaynaklar[tn.kaynak];
    if (!dosya) continue;
    const kb = typeof tn.kaynakBilgisi === 'function' ? tn.kaynakBilgisi(dosya) : tn.kaynakBilgisi;
    for (const [alan, idSonu, ad, birim] of tn.alanlar) {
      const s = seriKur({
        id: `${tn.onek}.${idSonu}`,
        ad,
        grup: tn.grup,
        birim,
        sayfa: tn.sayfa,
        kaynak: kb ?? { ad: dosya.kaynaklar?.[0]?.ad ?? '', url: dosya.kaynaklar?.[0]?.url ?? null },
        satirlar: tn.satirlar(dosya),
        alan,
        bicim: tn.tarihBicimi,
        siklikVarsayilan: tn.siklik,
      });
      if (s) out.push(s);
    }
  }

  // Dünya politika faizleri: sayfadaki aylık grafik tablosu, sütunlar grafik.seriIdleri sırasında.
  const d = kaynaklar.dunya;
  if (d?.grafik?.noktalar?.length && kaynaklar.ulkeler) {
    const ad = new Map(kaynaklar.ulkeler.map((u) => [u.kod, u.ad]));
    const bis = d.kaynaklar?.[0] ?? { ad: 'BIS', url: null };
    d.grafik.seriIdleri.forEach((kod, i) => {
      const noktalar = [];
      for (const n of d.grafik.noktalar) {
        const v = n[i + 1];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        const ayNo = n[0];
        noktalar.push([`${Math.floor(ayNo / 12)}-${iki((ayNo % 12) + 1)}-01`, v]);
      }
      if (noktalar.length)
        out.push({
          id: `dunya-faiz.${kod.toLowerCase()}`,
          ad: `Politika faizi, ${ad.get(kod) ?? kod}`,
          bolum: 'Faiz',
          birim: YZ,
          siklik: 'ay',
          kaynak: { ad: bis.ad, url: bis.url },
          sayfa: SAYFA.dunya,
          noktalar,
        });
    });
  }

  const gorulen = new Set();
  for (const s of out) {
    if (gorulen.has(s.id)) throw new Error(`Yinelenen seri kimliği: ${s.id}`);
    gorulen.add(s.id);
  }
  return out;
}
