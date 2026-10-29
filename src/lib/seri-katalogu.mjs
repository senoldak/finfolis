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
const MTL = 'milyon TL';

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
  paraPiyasasi: '/veri/para-piyasasi/',
  paraArzi: '/veri/para-arzi/',
  kkm: '/veri/kur-korumali-mevduat/',
  tcmbBilanco: '/veri/tcmb-bilancosu/',
  faizAyrinti: '/veri/piyasa-faizleri/',
  dovizHacmi: '/veri/doviz-piyasasi/',
  elektrik: '/veri/elektrik-tuketimi/',
  cek: '/veri/karsiliksiz-cek/',
  banknot: '/veri/banknotlar/',
  odeme: '/veri/odeme-sistemleri/',
  turizm: '/veri/turizm/',
  uyp: '/veri/yatirim-pozisyonu/',
  reelGuven: '/veri/reel-kesim-guveni/',
  ticariGayrimenkul: '/veri/ticari-gayrimenkul/',
  krediEgilim: '/veri/kredi-egilim-anketi/',
  otomotiv: '/veri/sanayi-uretimi/#otomotiv',
  disTicaretAyrinti: '/veri/dis-ticaret/#endeksler',
  borcCevirme: '/veri/dis-borc/#cevirme',
  butceAyrinti: '/veri/butce-dengesi/#ayrinti',
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
  t('paraPiyasasi', 'Faiz', SAYFA.paraPiyasasi, [
    ['borcVerme', 'borc-verme', 'TCMB gecelik borç verme faizi (haftalık ortalama)', YZ],
    ['borcAlma', 'borc-alma', 'TCMB gecelik borç alma faizi (haftalık ortalama)', YZ],
    ['repo', 'repo', 'TCMB bir haftalık repo faizi (haftalık ortalama)', YZ],
    ['bankalararasi', 'bankalararasi', 'TCMB bankalararası piyasası, gecelik ağırlıklı ortalama faiz (haftalık ortalama)', YZ],
    ['aofm', 'aofm', 'TCMB ağırlıklı ortalama fonlama maliyeti (haftalık ortalama)', YZ],
    ['fonlama', 'fonlama', 'TCMB toplam fonlama (haftalık ortalama)', MTL],
    ['sterilizasyon', 'sterilizasyon', 'TCMB toplam sterilizasyon (haftalık ortalama)', MTL],
    ['net', 'net', 'TCMB net fonlama (haftalık ortalama)', MTL],
  ], { siklik: 'hafta' }),
  t('paraArzi', 'Bankacılık', SAYFA.paraArzi, [
    ['m1', 'm1', 'M1 para arzı', BTL],
    ['m2', 'm2', 'M2 para arzı', BTL],
    ['m3', 'm3', 'M3 para arzı', BTL],
    ['m1Yillik', 'm1-yillik', 'M1 para arzı, yıllık değişim', YZ],
    ['m2Yillik', 'm2-yillik', 'M2 para arzı, yıllık değişim', YZ],
    ['m3Yillik', 'm3-yillik', 'M3 para arzı, yıllık değişim', YZ],
    ['dolasim', 'dolasim', 'Dolaşımdaki para', BTL],
    ['vadesizTl', 'vadesiz-tl', 'Vadesiz mevduat (TL)', BTL],
    ['vadesizYp', 'vadesiz-yp', 'Vadesiz mevduat (YP)', BTL],
    ['vadeliTl', 'vadeli-tl', 'Vadeli mevduat (TL)', BTL],
    ['vadeliYp', 'vadeli-yp', 'Vadeli mevduat (YP)', BTL],
    ['repo', 'repo', 'Repo (M3 bileşeni)', BTL],
    ['ppf', 'ppf', 'Para piyasası fonları (M3 bileşeni)', BTL],
    ['menkul', 'menkul', 'İhraç edilen menkul kıymetler (M3 bileşeni)', BTL],
  ], { siklik: 'hafta' }),
  t('kkm', 'Bankacılık', SAYFA.kkm, [
    ['dd', 'dd', 'Döviz dönüşümlü kur korumalı mevduat, toplam', MYUSD],
    ['ddGercek', 'dd-gercek', 'Döviz dönüşümlü kur korumalı mevduat, gerçek kişiler', MYUSD],
    ['ddTuzel', 'dd-tuzel', 'Döviz dönüşümlü kur korumalı mevduat, tüzel kişiler', MYUSD],
    ['tl', 'tl', 'TL kur korumalı mevduat, toplam', 'milyar TL'],
  ]),
  t('tcmbBilanco', 'Bankacılık', SAYFA.tcmbBilanco, [
    ['aktif', 'aktif', 'TCMB aktif toplamı (haftanın son iş günü)', BTL],
    ['disVarlik', 'dis-varlik', 'TCMB dış varlıkları (haftanın son iş günü)', BTL],
    ['icVarlik', 'ic-varlik', 'TCMB iç varlıkları (haftanın son iş günü)', BTL],
    ['hazine', 'hazine', 'TCMB, Hazine borçları (haftanın son iş günü)', BTL],
    ['bankaKredi', 'banka-kredi', 'TCMB, bankacılık sektörüne açılan nakit krediler (haftanın son iş günü)', BTL],
    ['degerleme', 'degerleme', 'TCMB, değerleme hesabı (haftanın son iş günü)', BTL],
    ['dovizYuk', 'doviz-yuk', 'TCMB toplam döviz yükümlülükleri (haftanın son iş günü)', BTL],
    ['mbParasi', 'mb-parasi', 'Merkez bankası parası (haftanın son iş günü)', BTL],
    ['rezervPara', 'rezerv-para', 'Rezerv para (haftanın son iş günü)', BTL],
    ['emisyon', 'emisyon', 'Emisyon (haftanın son iş günü)', BTL],
    ['zorunlu', 'zorunlu', 'Zorunlu karşılıklar (TCMB bilançosu) (haftanın son iş günü)', BTL],
    ['serbest', 'serbest', 'Bankaların TCMB’deki serbest mevduatı (haftanın son iş günü)', BTL],
    ['api', 'api', 'TCMB, açık piyasa işlemleri (pasif) (haftanın son iş günü)', BTL],
    ['kamuMevduat', 'kamu-mevduat', 'TCMB’deki kamu mevduatı (haftanın son iş günü)', BTL],
  ], { siklik: 'hafta' }),
  t('faizAyrinti', 'Faiz', SAYFA.faizAyrinti, [
    ['tl1a', 'tl-1a', 'TL mevduat faizi, 1 aya kadar vadeli (akım)', YZ],
    ['tl3a', 'tl-3a', 'TL mevduat faizi, 3 aya kadar vadeli (akım)', YZ],
    ['tl6a', 'tl-6a', 'TL mevduat faizi, 6 aya kadar vadeli (akım)', YZ],
    ['tl1y', 'tl-1y', 'TL mevduat faizi, 1 yıla kadar vadeli (akım)', YZ],
    ['tlUzun', 'tl-uzun', 'TL mevduat faizi, 1 yıl ve daha uzun vadeli (akım)', YZ],
    ['tlToplam', 'tl-toplam', 'TL mevduat faizi, toplam (akım)', YZ],
    ['tlTasarruf', 'tl-tasarruf', 'TL tasarruf mevduatı faizi (akım)', YZ],
    ['tlTicari', 'tl-ticari', 'TL ticari mevduat faizi (akım)', YZ],
    ['usd', 'usd', 'ABD doları mevduat faizi (akım)', YZ],
    ['eur', 'eur', 'Euro mevduat faizi (akım)', YZ],
    ['tuketici', 'tuketici', 'Tüketici kredisi faizi (ihtiyaç, taşıt, konut) (akım)', YZ],
    ['tuketiciKmh', 'tuketici-kmh', 'Tüketici kredisi faizi, KMH dahil (akım)', YZ],
    ['ihtiyacKmh', 'ihtiyac-kmh', 'İhtiyaç kredisi faizi, KMH dahil (akım)', YZ],
    ['ticari', 'ticari', 'Ticari kredi faizi (TL) (akım)', YZ],
    ['ticariKmhHaric', 'ticari-kmh-haric', 'Ticari kredi faizi (TL), KMH ve kurumsal kart hariç (akım)', YZ],
    ['ticariUsd', 'ticari-usd', 'Ticari kredi faizi (ABD doları) (akım)', YZ],
    ['ticariEur', 'ticari-eur', 'Ticari kredi faizi (euro) (akım)', YZ],
  ], { siklik: 'hafta' }),
  t('faizAyrinti', 'Faiz', SAYFA.faizAyrinti, [
    ['ticari', 'ticari', 'Finansman şirketleri, ticari kredi faizi (stok)', YZ],
    ['tuketici', 'tuketici', 'Finansman şirketleri, tüketici kredisi faizi (stok)', YZ],
  ], { satirlar: 'finansman', idOnek: 'finansman-faiz' }),
  t('dovizHacmi', 'Kur', SAYFA.dovizHacmi, [
    ['spot', 'spot', 'Bankaların spot döviz işlem hacmi (haftalık günlük ortalama)', MUSD],
    ['swap', 'swap', 'Bankaların swap işlem hacmi (haftalık günlük ortalama)', MUSD],
    ['vadeli', 'vadeli', 'Bankaların vadeli döviz işlem hacmi (haftalık günlük ortalama)', MUSD],
    ['yurtDisiSwap', 'yurt-disi-swap', 'Yurt dışı taraflarla swap işlem hacmi (haftalık günlük ortalama)', MUSD],
    ['musteriSpot', 'musteri-spot', 'Yurt içi müşterilerle spot döviz işlem hacmi (haftalık günlük ortalama)', MUSD],
    ['efektif', 'efektif', 'Efektif (banknot) işlem hacmi (haftalık günlük ortalama)', MUSD],
  ], { siklik: 'hafta' }),
  t('elektrik', 'Sanayi', SAYFA.elektrik, [
    ['tuketim', 'tuketim', 'Elektrik tüketimi (haftalık günlük ortalama)', 'MWh'],
    ['uretim', 'uretim', 'Elektrik üretimi (haftalık günlük ortalama)', 'MWh'],
    ['ithalat', 'ithalat', 'Elektrik ithalatı (haftalık günlük ortalama)', 'MWh'],
    ['ihracat', 'ihracat', 'Elektrik ihracatı (haftalık günlük ortalama)', 'MWh'],
  ], { siklik: 'hafta' }),
  t('cek', 'Bankacılık', SAYFA.cek, [
    ['ibrazAdet', 'ibraz-adet', 'Takas odalarına ibraz edilen çek adedi', ADET],
    ['ibrazTutar', 'ibraz-tutar', 'Takas odalarına ibraz edilen çek tutarı', BTL],
    ['karsiliksizAdet', 'karsiliksiz-adet', 'Karşılıksız çek adedi', ADET],
    ['karsiliksizTutar', 'karsiliksiz-tutar', 'Karşılıksız çek tutarı', BTL],
  ]),
  t('banknot', 'Bankacılık', SAYFA.banknot, [
    ['k200Adet', 'k200-adet', 'Tedavüldeki banknot, 200 TL, adet', ADET],
    ['k100Adet', 'k100-adet', 'Tedavüldeki banknot, 100 TL, adet', ADET],
    ['k50Adet', 'k50-adet', 'Tedavüldeki banknot, 50 TL, adet', ADET],
    ['k20Adet', 'k20-adet', 'Tedavüldeki banknot, 20 TL, adet', ADET],
    ['k10Adet', 'k10-adet', 'Tedavüldeki banknot, 10 TL, adet', ADET],
    ['k5Adet', 'k5-adet', 'Tedavüldeki banknot, 5 TL, adet', ADET],
    ['toplamAdet', 'toplam-adet', 'Tedavüldeki banknot, Toplam, adet', ADET],
    ['k200Tutar', 'k200-tutar', 'Tedavüldeki banknot, 200 TL, tutar', TL],
    ['k100Tutar', 'k100-tutar', 'Tedavüldeki banknot, 100 TL, tutar', TL],
    ['k50Tutar', 'k50-tutar', 'Tedavüldeki banknot, 50 TL, tutar', TL],
    ['k20Tutar', 'k20-tutar', 'Tedavüldeki banknot, 20 TL, tutar', TL],
    ['k10Tutar', 'k10-tutar', 'Tedavüldeki banknot, 10 TL, tutar', TL],
    ['k5Tutar', 'k5-tutar', 'Tedavüldeki banknot, 5 TL, tutar', TL],
    ['toplamTutar', 'toplam-tutar', 'Tedavüldeki banknot, Toplam, tutar', TL],
  ]),
  t('odeme', 'Bankacılık', SAYFA.odeme, [
    ['fastAdet', 'fast-adet', 'FAST, aylık ödeme adedi', ADET],
    ['fastTutar', 'fast-tutar', 'FAST, aylık ödeme tutarı', TL],
    ['eftAdet', 'eft-adet', 'Bireysel EFT (perakende ödeme sistemi), aylık ödeme adedi', ADET],
    ['eftTutar', 'eft-tutar', 'Bireysel EFT (perakende ödeme sistemi), aylık ödeme tutarı', TL],
    ['buyukAdet', 'buyuk-adet', 'EFT-EMKT, aylık ödeme adedi', ADET],
    ['buyukTutar', 'buyuk-tutar', 'EFT-EMKT, aylık ödeme tutarı', TL],
  ]),
  t('turizm', 'Dış denge', SAYFA.turizm, [
    ['toplam', 'toplam', 'Yabancı ziyaretçi sayısı', ADET],
    ['toplamYillik', 'toplam-yillik', 'Yabancı ziyaretçi sayısı, yıllık değişim', YZ],
    ['avrupa', 'avrupa', 'Avrupa’dan gelen ziyaretçi', ADET],
    ['asya', 'asya', 'Asya’dan gelen ziyaretçi', ADET],
    ['amerika', 'amerika', 'Amerika’dan gelen ziyaretçi', ADET],
    ['afrika', 'afrika', 'Afrika’dan gelen ziyaretçi', ADET],
    ['okyanusya', 'okyanusya', 'Okyanusya’dan gelen ziyaretçi', ADET],
    ['almanya', 'almanya', 'Almanya’dan gelen ziyaretçi', ADET],
    ['rusya', 'rusya', 'Rusya’dan gelen ziyaretçi', ADET],
    ['ingiltere', 'ingiltere', 'İngiltere’den gelen ziyaretçi', ADET],
    ['iran', 'iran', 'İran’dan gelen ziyaretçi', ADET],
  ]),
  t('turizm', 'Dış denge', SAYFA.turizm, [
    ['gelir', 'gelir', 'Turizm geliri', BUSD],
    ['gider', 'gider', 'Turizm gideri', BUSD],
  ], { satirlar: 'gelir', idOnek: 'turizm-gelir' }),
  t('uyp', 'Dış denge', SAYFA.uyp, [
    ['net', 'net', 'Uluslararası yatırım pozisyonu, net', MUSD],
    ['varlik', 'varlik', 'Uluslararası yatırım pozisyonu, varlıklar', MUSD],
    ['yukumluluk', 'yukumluluk', 'Uluslararası yatırım pozisyonu, yükümlülükler', MUSD],
    ['vDogrudan', 'v-dogrudan', 'UYP varlıklar, doğrudan yatırımlar', MUSD],
    ['vPortfoy', 'v-portfoy', 'UYP varlıklar, portföy yatırımları', MUSD],
    ['vTurev', 'v-turev', 'UYP varlıklar, finansal türevler', MUSD],
    ['vDiger', 'v-diger', 'UYP varlıklar, diğer yatırımlar', MUSD],
    ['rezerv', 'rezerv', 'UYP rezerv varlıklar', MUSD],
    ['yDogrudan', 'y-dogrudan', 'UYP yükümlülükler, doğrudan yatırımlar', MUSD],
    ['yPortfoy', 'y-portfoy', 'UYP yükümlülükler, portföy yatırımları', MUSD],
    ['yHisse', 'y-hisse', 'UYP yükümlülükler, hisse senetleri ve fon payları', MUSD],
    ['yBorcSenedi', 'y-borc-senedi', 'UYP yükümlülükler, borç senetleri', MUSD],
    ['yTurev', 'y-turev', 'UYP yükümlülükler, finansal türevler', MUSD],
    ['yDiger', 'y-diger', 'UYP yükümlülükler, diğer yatırımlar', MUSD],
  ], { satirlar: 'ceyrekler' }),
  t('reelGuven', 'Anketler', SAYFA.reelGuven, [
    ['endeks', 'endeks', 'Reel kesim güven endeksi (arındırılmış)', END],
    ['ham', 'ham', 'Reel kesim güven endeksi (arındırılmamış)', END],
    ['siparis', 'siparis', 'RKGE, toplam sipariş, mevcut durum', END],
    ['stok', 'stok', 'RKGE, mamul mal stoku', END],
    ['uretim', 'uretim', 'RKGE, üretim hacmi, gelecek üç ay', END],
    ['istihdam', 'istihdam', 'RKGE, toplam istihdam, gelecek üç ay', END],
    ['siparisSon3', 'siparis-son3', 'RKGE, toplam sipariş, son üç ay', END],
    ['ihracat', 'ihracat', 'RKGE, ihracat siparişi, gelecek üç ay', END],
    ['yatirim', 'yatirim', 'RKGE, sabit sermaye yatırım harcaması', END],
    ['gidisat', 'gidisat', 'RKGE, genel gidişat', END],
  ]),
  t('reelGuven', 'Anketler', SAYFA.reelGuven, [
    ['endeks', 'endeks', 'Finansal hizmetler güven endeksi', END],
    ['isDurumu', 'is-durumu', 'Finansal hizmetler, iş durumu, son üç ay', END],
    ['talepSon3', 'talep-son3', 'Finansal hizmetler, talep, son üç ay', END],
    ['talepGelecek3', 'talep-gelecek3', 'Finansal hizmetler, talep, gelecek üç ay', END],
  ], { satirlar: 'finans', idOnek: 'finans-guven' }),
  t('ticariGayrimenkul', 'Konut', SAYFA.ticariGayrimenkul, [
    ['tg', 'tg', 'Ticari gayrimenkul fiyat endeksi, Türkiye', END],
    ['tgYillik', 'tg-yillik', 'Ticari gayrimenkul fiyat endeksi, Türkiye, yıllık değişim', YZ],
    ['tgIst', 'tg-ist', 'Ticari gayrimenkul fiyat endeksi, İstanbul, yıllık değişim', YZ],
    ['tgAnk', 'tg-ank', 'Ticari gayrimenkul fiyat endeksi, Ankara, yıllık değişim', YZ],
    ['tgIzm', 'tg-izm', 'Ticari gayrimenkul fiyat endeksi, İzmir, yıllık değişim', YZ],
    ['dukkan', 'dukkan', 'Dükkân fiyat endeksi, Türkiye', END],
    ['dukkanYillik', 'dukkan-yillik', 'Dükkân fiyat endeksi, Türkiye, yıllık değişim', YZ],
    ['dukkanIst', 'dukkan-ist', 'Dükkân fiyat endeksi, İstanbul, yıllık değişim', YZ],
    ['dukkanAnk', 'dukkan-ank', 'Dükkân fiyat endeksi, Ankara, yıllık değişim', YZ],
    ['dukkanIzm', 'dukkan-izm', 'Dükkân fiyat endeksi, İzmir, yıllık değişim', YZ],
    ['ofis', 'ofis', 'Ofis fiyat endeksi, Türkiye', END],
    ['ofisYillik', 'ofis-yillik', 'Ofis fiyat endeksi, Türkiye, yıllık değişim', YZ],
    ['ofisIst', 'ofis-ist', 'Ofis fiyat endeksi, İstanbul, yıllık değişim', YZ],
    ['ofisAnk', 'ofis-ank', 'Ofis fiyat endeksi, Ankara, yıllık değişim', YZ],
    ['ofisIzm', 'ofis-izm', 'Ofis fiyat endeksi, İzmir, yıllık değişim', YZ],
  ], { satirlar: 'ceyrekler' }),
  t('ticariGayrimenkul', 'Konut', SAYFA.ticariGayrimenkul, [
    ['yeni', 'yeni', 'Yeni konutlar fiyat endeksi', END],
    ['yeniYillik', 'yeni-yillik', 'Yeni konutlar fiyat endeksi, yıllık değişim', YZ],
    ['eski', 'eski', 'Yeni olmayan konutlar fiyat endeksi', END],
    ['eskiYillik', 'eski-yillik', 'Yeni olmayan konutlar fiyat endeksi, yıllık değişim', YZ],
  ], { satirlar: 'konut', idOnek: 'yeni-konut' }),
  t('krediEgilim', 'Anketler', SAYFA.krediEgilim, [
    ['isStandart', 'is-standart', 'İşletme kredi standartları, net yüzde (artı gevşeme)', YZ],
    ['kobiStandart', 'kobi-standart', 'KOBİ kredi standartları, net yüzde', YZ],
    ['buyukStandart', 'buyuk-standart', 'Büyük işletme kredi standartları, net yüzde', YZ],
    ['isTalep', 'is-talep', 'İşletme kredi talebi, net yüzde (artı artış)', YZ],
    ['isStandartBeklenti', 'is-standart-beklenti', 'İşletme kredi standartları, gelecek üç ay beklentisi, net yüzde', YZ],
    ['isTalepBeklenti', 'is-talep-beklenti', 'İşletme kredi talebi, gelecek üç ay beklentisi, net yüzde', YZ],
    ['konutStandart', 'konut-standart', 'Konut kredisi standartları, net yüzde', YZ],
    ['tasitStandart', 'tasit-standart', 'Taşıt kredisi standartları, net yüzde', YZ],
    ['digerStandart', 'diger-standart', 'Diğer bireysel kredi standartları, net yüzde', YZ],
    ['konutTalep', 'konut-talep', 'Konut kredisi talebi, net yüzde', YZ],
    ['tasitTalep', 'tasit-talep', 'Taşıt kredisi talebi, net yüzde', YZ],
    ['digerTalep', 'diger-talep', 'Diğer bireysel kredi talebi, net yüzde', YZ],
  ], { satirlar: 'ceyrekler' }),
  t('otomotiv', 'Sanayi', SAYFA.otomotiv, [
    ['binek', 'binek', 'Otomotiv üretimi, Binek otomobil', ADET],
    ['kamyonet', 'kamyonet', 'Otomotiv üretimi, Kamyonet', ADET],
    ['kamyon', 'kamyon', 'Otomotiv üretimi, Kamyon', ADET],
    ['cekici', 'cekici', 'Otomotiv üretimi, Çekici', ADET],
    ['otobus', 'otobus', 'Otomotiv üretimi, Otobüs', ADET],
    ['midibus', 'midibus', 'Otomotiv üretimi, Midibüs', ADET],
    ['minibus', 'minibus', 'Otomotiv üretimi, Minibüs', ADET],
    ['traktor', 'traktor', 'Otomotiv üretimi, Traktör', ADET],
  ]),
  t('disTicaretAyrinti', 'Dış denge', SAYFA.disTicaretAyrinti, [
    ['ihrBirim', 'ihr-birim', 'İhracat birim değer endeksi', END],
    ['ithBirim', 'ith-birim', 'İthalat birim değer endeksi', END],
    ['ihrMiktar', 'ihr-miktar', 'İhracat miktar endeksi', END],
    ['ithMiktar', 'ith-miktar', 'İthalat miktar endeksi', END],
  ], { satirlar: 'endeksler', idOnek: 'dis-ticaret-endeks' }),
  t('borcCevirme', 'Dış denge', SAYFA.borcCevirme, [
    ['banka', 'banka', 'Dış borç çevirme oranı, bankalar (tahvil hariç)', YZ],
    ['diger', 'diger', 'Dış borç çevirme oranı, diğer sektörler (tahvil hariç)', YZ],
    ['bankaTahvil', 'banka-tahvil', 'Dış borç çevirme oranı, bankalar (tahvil dahil)', YZ],
    ['digerTahvil', 'diger-tahvil', 'Dış borç çevirme oranı, diğer sektörler (tahvil dahil)', YZ],
  ]),
  t('butceAyrinti', 'Bütçe', SAYFA.butceAyrinti, [
    ['vergi', 'vergi', 'Merkezi yönetim, vergi gelirleri', BTL],
    ['gelirVergisi', 'gelir-vergisi', 'Gelir vergisi', BTL],
    ['kurumlar', 'kurumlar', 'Kurumlar vergisi', BTL],
    ['kdvDahil', 'kdv-dahil', 'Dahilde alınan KDV', BTL],
    ['kdvIthal', 'kdv-ithal', 'İthalde alınan KDV', BTL],
    ['otv', 'otv', 'Özel tüketim vergisi', BTL],
    ['bsmv', 'bsmv', 'Banka ve sigorta muameleleri vergisi', BTL],
    ['damga', 'damga', 'Damga vergisi', BTL],
    ['harc', 'harc', 'Harçlar', BTL],
    ['gider', 'gider', 'Merkezi yönetim bütçe giderleri', BTL],
    ['personel', 'personel', 'Bütçe, personel giderleri', BTL],
    ['sgk', 'sgk', 'Bütçe, SGK devlet primi', BTL],
    ['malHizmet', 'mal-hizmet', 'Bütçe, mal ve hizmet alımları', BTL],
    ['cariTransfer', 'cari-transfer', 'Bütçe, cari transferler', BTL],
    ['sermaye', 'sermaye', 'Bütçe, sermaye giderleri', BTL],
    ['faiz', 'faiz', 'Merkezi yönetim, faiz giderleri', BTL],
  ]),
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
