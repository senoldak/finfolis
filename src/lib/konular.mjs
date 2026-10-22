// Konu sayfaları (/konu/<slug>/): kurum, şirket ve temalar için otomatik derleme sayfaları.
// Bir yazı bir konuya, konu adı başlıkta ya da spotta geçiyorsa veya gövdede en az iki kez geçiyorsa bağlanır.
// En az ESIK haberi olmayan konunun sayfası üretilmez (zayıf içerik olmasın). Bülten konu sayısına girmez.
// Giriş metinleri kısa, tarafsız ve doğrulanabilir bilgilerdir; rakam ve güncel değer içermez.
// sameAs: Wikidata kimlikleri (15.10.2026 Wikidata API ile doğrulandı); emin olunmayan konuda alan boş bırakılır.
// Düz JS: site derlemesi ve node --test (scripts/site/konular.test.mjs) aynı kodu kullanır.

export const KONU_ESIGI = 3;

const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Özel ad: büyük/küçük harf duyarlı; yalnızca kesme işaretli ek alır (Fed'in, Nvidia'nın).
const ozel = (...adlar) =>
  new RegExp(`(?<![\\p{L}\\d])(?:${adlar.map(kacis).join('|')})(?:['’]\\p{L}+)?(?![\\p{L}\\d])`, 'gu');
// Cins ad: harf duyarsız; Türkçe ek bitişik gelir (petrolün, yapay zekânın).
const cins = (...kokler) => new RegExp(`(?<![\\p{L}\\d])(?:${kokler.map(kacis).join('|')})\\p{L}*`, 'giu');

/**
 * @typedef {{ slug: string, ad: string, tamAd: string, tur: 'kurum' | 'sirket' | 'kripto' | 'tema',
 *   schema: 'Organization' | 'Corporation' | 'GovernmentOrganization' | 'Thing' | 'FinancialProduct',
 *   sameAs?: string, desen: RegExp, giris: string }} Konu
 * @type {Konu[]}
 */
export const KONULAR = [
  // Merkez bankaları ve uluslararası kurumlar
  {
    slug: 'fed',
    ad: 'Fed',
    tamAd: 'Federal Reserve (ABD Merkez Bankası)',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q53536',
    desen: ozel('Fed', 'Federal Reserve', 'FOMC', 'ABD Merkez Bankası'),
    giris:
      'Federal Reserve (Fed), Amerika Birleşik Devletleri’nin merkez bankası sistemidir ve 1913’te kuruldu. Politika faizini, yani federal fon oranı için hedef aralığı, Federal Açık Piyasa Komitesi (FOMC) belirler. Yasal görevi azami istihdamı ve fiyat istikrarını birlikte gözetmektir. Doların dünya ticaretindeki ağırlığı nedeniyle Fed kararları Türkiye dahil gelişmekte olan piyasaları da etkileyebilir.',
  },
  {
    slug: 'avrupa-merkez-bankasi',
    ad: 'Avrupa Merkez Bankası',
    tamAd: 'Avrupa Merkez Bankası (ECB)',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q8901',
    desen: ozel('ECB', 'Avrupa Merkez Bankası', 'AMB'),
    giris:
      'Avrupa Merkez Bankası (ECB), euroyu ortak para birimi olarak kullanan euro bölgesi ülkelerinin para politikasını yürütür. Merkezi Frankfurt’tadır ve 1998’de kuruldu. Temel görevi fiyat istikrarıdır; orta vadede yüzde 2’lik enflasyonu hedefler. Faiz kararları euro kurunu ve Avrupa’ya ihracat yapan ülkeleri yakından ilgilendirir.',
  },
  {
    slug: 'tcmb',
    ad: 'TCMB',
    tamAd: 'Türkiye Cumhuriyet Merkez Bankası',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q580829',
    desen: ozel('TCMB', 'Türkiye Cumhuriyet Merkez Bankası', 'Türkiye Merkez Bankası'),
    giris:
      'Türkiye Cumhuriyet Merkez Bankası (TCMB), Türkiye’nin para politikasından sorumlu kurumdur ve 1930’da kuruldu. Kanundaki temel amacı fiyat istikrarını sağlamaktır. Politika faizini Para Politikası Kurulu belirler; politika faizi olarak bir hafta vadeli repo ihale faiz oranı kullanılır. TCMB ayrıca her iş günü gösterge niteliğindeki döviz kurlarını ilan eder ve resmi rezervleri yönetir.',
  },
  {
    slug: 'ingiltere-merkez-bankasi',
    ad: 'İngiltere Merkez Bankası',
    tamAd: 'İngiltere Merkez Bankası (Bank of England)',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q183231',
    desen: ozel('İngiltere Merkez Bankası', 'Bank of England', 'BoE'),
    giris:
      'İngiltere Merkez Bankası (Bank of England), Birleşik Krallık’ın merkez bankasıdır ve 1694’te kuruldu. Faiz kararlarını Para Politikası Kurulu alır; hükümetin belirlediği enflasyon hedefi yüzde 2’dir. Kararları sterlin kurunu ve İngiltere’deki kredi maliyetlerini doğrudan etkiler.',
  },
  {
    slug: 'japonya-merkez-bankasi',
    ad: 'Japonya Merkez Bankası',
    tamAd: 'Japonya Merkez Bankası (Bank of Japan)',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q333101',
    desen: ozel('Japonya Merkez Bankası', 'Bank of Japan', 'BoJ'),
    giris:
      'Japonya Merkez Bankası (Bank of Japan, BoJ), Japonya’nın merkez bankasıdır ve 1882’de kuruldu. Yüzde 2’lik fiyat istikrarı hedefini gözetir. Japonya uzun yıllar çok düşük, hatta negatif faiz uyguladığı için BoJ’un kararları yen kurunu ve küresel fon akımlarını etkileyebilir.',
  },
  {
    slug: 'imf',
    ad: 'IMF',
    tamAd: 'Uluslararası Para Fonu (IMF)',
    tur: 'kurum',
    schema: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q7804',
    desen: ozel('IMF', 'Uluslararası Para Fonu'),
    giris:
      'Uluslararası Para Fonu (IMF), 1944’teki Bretton Woods konferansında kurulan ve merkezi Washington’da bulunan uluslararası bir kuruluştur. Üye ülkelerin ekonomilerini izler, ödemeler dengesi sorunu yaşayan ülkelere koşullu kredi verir ve teknik destek sağlar. Yılda iki kez yayımladığı Dünya Ekonomik Görünüm raporundaki büyüme tahminleri yakından takip edilir.',
  },
  {
    slug: 'dunya-bankasi',
    ad: 'Dünya Bankası',
    tamAd: 'Dünya Bankası',
    tur: 'kurum',
    schema: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q7164',
    desen: ozel('Dünya Bankası', 'World Bank'),
    giris:
      'Dünya Bankası, 1944’te IMF ile birlikte kurulan ve merkezi Washington’da bulunan uluslararası bir finans kuruluşudur. Gelişmekte olan ülkelere altyapı, eğitim, sağlık gibi kalkınma projeleri için kredi, hibe ve danışmanlık sağlar. Ülkeler ve küresel ekonomi için büyüme tahminleri de yayımlar.',
  },
  {
    slug: 'opec',
    ad: 'OPEC',
    tamAd: 'Petrol İhraç Eden Ülkeler Örgütü (OPEC)',
    tur: 'kurum',
    schema: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q7795',
    desen: ozel('OPEC'),
    giris:
      'Petrol İhraç Eden Ülkeler Örgütü (OPEC), 1960’ta Bağdat’ta kurulan ve merkezi Viyana’da bulunan bir uluslararası örgüttür. Üye ülkeler petrol üretim politikalarını koordine eder. OPEC üyeleri ile Rusya gibi bazı üretici ülkelerin birlikte aldığı kararlar OPEC+ olarak anılır ve petrol fiyatlarını etkileyebilir.',
  },
  // Türkiye'deki düzenleyiciler ve kurumlar
  {
    slug: 'spk',
    ad: 'SPK',
    tamAd: 'Sermaye Piyasası Kurulu',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q5035620',
    desen: ozel('SPK', 'Sermaye Piyasası Kurulu'),
    giris:
      'Sermaye Piyasası Kurulu (SPK), Türkiye’de sermaye piyasalarını düzenleyen ve denetleyen kamu kurumudur; 1981’de kuruldu. Halka arzları onaylar, aracı kurumları, yatırım fonlarını ve borsada işlem gören şirketlerin kamuyu aydınlatma yükümlülüklerini denetler. Amacı yatırımcının korunması ve piyasanın güvenilir, şeffaf işlemesidir.',
  },
  {
    slug: 'bddk',
    ad: 'BDDK',
    tamAd: 'Bankacılık Düzenleme ve Denetleme Kurumu',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q6047532',
    desen: ozel('BDDK', 'Bankacılık Düzenleme ve Denetleme Kurumu'),
    giris:
      'Bankacılık Düzenleme ve Denetleme Kurumu (BDDK), Türkiye’de bankaları ve finansal kiralama, faktoring, finansman şirketleri gibi kuruluşları düzenleyen ve denetleyen bağımsız kurumdur. Kredi vade sınırları ve bankaların sermaye yeterliliği gibi konularda düzenleme yapar. Bankacılık sektörüne ait istatistikleri de yayımlar.',
  },
  {
    slug: 'tuik',
    ad: 'TÜİK',
    tamAd: 'Türkiye İstatistik Kurumu',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q1375058',
    desen: ozel('TÜİK', 'Türkiye İstatistik Kurumu'),
    giris:
      'Türkiye İstatistik Kurumu (TÜİK), Türkiye’nin resmi istatistiklerini derleyen ve yayımlayan kamu kurumudur. Tüketici fiyat endeksi (TÜFE) ile ölçülen enflasyon, gayrisafi yurt içi hasıla (büyüme), işsizlik ve dış ticaret gibi temel göstergeler TÜİK tarafından açıklanır. Açıklama tarihleri önceden yayımlanan bir takvime göre belirlenir.',
  },
  {
    slug: 'borsa-istanbul',
    ad: 'Borsa İstanbul',
    tamAd: 'Borsa İstanbul',
    tur: 'kurum',
    schema: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q1407995',
    desen: ozel('Borsa İstanbul', 'BIST 100', 'BIST 30', 'BIST'),
    giris:
      'Borsa İstanbul, Türkiye’nin hisse senedi, borçlanma araçları, vadeli işlem ve kıymetli maden piyasalarını tek çatı altında toplayan borsasıdır. 2013’te İstanbul Menkul Kıymetler Borsası, İstanbul Altın Borsası ve Vadeli İşlem ve Opsiyon Borsası’nın birleşmesiyle kuruldu. En çok izlenen göstergesi, büyük şirketlerin hisselerinden oluşan BIST 100 endeksidir.',
  },
  {
    slug: 'sec',
    ad: 'SEC',
    tamAd: 'ABD Menkul Kıymetler ve Borsa Komisyonu (SEC)',
    tur: 'kurum',
    schema: 'GovernmentOrganization',
    sameAs: 'https://www.wikidata.org/wiki/Q953944',
    desen: ozel('SEC', 'Menkul Kıymetler ve Borsa Komisyonu'),
    giris:
      'ABD Menkul Kıymetler ve Borsa Komisyonu (SEC), Amerika Birleşik Devletleri’nde sermaye piyasalarını düzenleyen federal kurumdur ve 1934’te kuruldu. Halka açık şirketlerin bilgi açıklamalarını, borsaları, aracı kurumları ve fon yöneticilerini denetler; menkul kıymet mevzuatına aykırılıklarda yaptırım uygular. Kripto varlıklar ve borsa yatırım fonlarına ilişkin kararları da piyasalarda yakından izlenir.',
  },
  // Şirketler
  {
    slug: 'apple',
    ad: 'Apple',
    tamAd: 'Apple Inc.',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q312',
    desen: ozel('Apple'),
    giris:
      'Apple, merkezi Kaliforniya’nın Cupertino kentinde bulunan ABD’li teknoloji şirketidir ve 1976’da kuruldu. iPhone, Mac, iPad gibi cihazların yanında App Store ve abonelik hizmetlerinden de gelir elde eder. Hisseleri Nasdaq’ta işlem görür ve piyasa değeri en yüksek şirketler arasında yer alır.',
  },
  {
    slug: 'microsoft',
    ad: 'Microsoft',
    tamAd: 'Microsoft Corporation',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q2283',
    desen: ozel('Microsoft'),
    giris:
      'Microsoft, merkezi Washington eyaletinin Redmond kentinde bulunan ABD’li yazılım ve bulut bilişim şirketidir; 1975’te kuruldu. Windows işletim sistemi ve Office uygulamalarının yanı sıra Azure bulut hizmetleriyle tanınır. Yapay zekâ alanında OpenAI’ın büyük yatırımcılarındandır.',
  },
  {
    slug: 'nvidia',
    ad: 'Nvidia',
    tamAd: 'Nvidia Corporation',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q182477',
    desen: ozel('Nvidia', 'NVIDIA'),
    giris:
      'Nvidia, merkezi Kaliforniya’nın Santa Clara kentinde bulunan ABD’li çip tasarım şirketidir ve 1993’te kuruldu. Grafik işlemcileri (GPU) ile tanınır; bu çipler bugün yapay zekâ modellerinin eğitiminde ve veri merkezlerinde yaygın olarak kullanılır. Şirketin çeyreklik sonuçları, yapay zekâ yatırımlarının seyrine dair bir gösterge olarak izlenir.',
  },
  {
    slug: 'amazon',
    ad: 'Amazon',
    tamAd: 'Amazon.com, Inc.',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q3884',
    desen: ozel('Amazon'),
    giris:
      'Amazon, merkezi Seattle’da bulunan ABD’li e-ticaret ve teknoloji şirketidir; 1994’te kuruldu. Çevrim içi perakendenin yanında Amazon Web Services (AWS) adlı bulut bilişim birimi şirketin en önemli kâr kaynaklarındandır. Hisseleri Nasdaq’ta işlem görür.',
  },
  {
    slug: 'alphabet',
    ad: 'Alphabet (Google)',
    tamAd: 'Alphabet Inc.',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q20800404',
    desen: ozel('Alphabet', 'Google'),
    giris:
      'Alphabet, Google’ın ana şirketidir ve 2015’te Google’ın yeniden yapılanmasıyla kuruldu; merkezi Kaliforniya’nın Mountain View kentindedir. Gelirinin büyük kısmı Google arama ve YouTube reklamlarından gelir; Google Cloud bulut hizmetleri ve yapay zekâ çalışmaları da önemli iş kollarıdır.',
  },
  {
    slug: 'meta',
    ad: 'Meta',
    tamAd: 'Meta Platforms, Inc.',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q380',
    desen: ozel('Meta Platforms', 'Meta'),
    giris:
      'Meta Platforms, Facebook, Instagram ve WhatsApp’ın sahibi olan ABD’li teknoloji şirketidir. 2004’te Facebook adıyla kuruldu, 2021’de adını Meta olarak değiştirdi. Gelirinin büyük bölümü reklamlardan gelir; yapay zekâ ve sanal gerçeklik alanlarına da yatırım yapar.',
  },
  {
    slug: 'openai',
    ad: 'OpenAI',
    tamAd: 'OpenAI',
    tur: 'sirket',
    schema: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q21708200',
    desen: ozel('OpenAI'),
    giris:
      'OpenAI, merkezi San Francisco’da bulunan ABD’li yapay zekâ şirketidir ve 2015’te kuruldu. ChatGPT sohbet uygulaması ve GPT dil modelleriyle tanınır. Halka açık değildir; yatırım turları ve ortaklıkları yapay zekâ sektörünün değerlemelerine dair önemli bir gösterge olarak izlenir.',
  },
  {
    slug: 'anthropic',
    ad: 'Anthropic',
    tamAd: 'Anthropic',
    tur: 'sirket',
    schema: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q116758847',
    desen: ozel('Anthropic'),
    giris:
      'Anthropic, merkezi San Francisco’da bulunan ABD’li yapay zekâ şirketidir ve 2021’de kuruldu. Claude adlı yapay zekâ modellerini geliştirir. Halka açık değildir; finansman turları ve bulut ortaklıkları yapay zekâ sektöründeki yatırım eğiliminin göstergeleri arasında izlenir.',
  },
  {
    slug: 'jpmorgan',
    ad: 'JPMorgan',
    tamAd: 'JPMorgan Chase & Co.',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q192314',
    desen: ozel('JPMorgan Chase', 'JPMorgan', 'JP Morgan'),
    giris:
      'JPMorgan Chase, merkezi New York’ta bulunan ve varlık büyüklüğüne göre ABD’nin en büyük bankası olan finans kuruluşudur. Bireysel bankacılık, yatırım bankacılığı ve varlık yönetimi alanlarında faaliyet gösterir. Çeyreklik bilançoları ABD bankacılık sektörünün ve tüketici harcamalarının durumuna dair erken bir işaret olarak izlenir.',
  },
  {
    slug: 'goldman-sachs',
    ad: 'Goldman Sachs',
    tamAd: 'The Goldman Sachs Group, Inc.',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q193326',
    desen: ozel('Goldman Sachs', 'Goldman'),
    giris:
      'Goldman Sachs, merkezi New York’ta bulunan ABD’li yatırım bankası ve finansal hizmetler şirketidir; 1869’da kuruldu. Birleşme ve satın alma danışmanlığı, halka arz aracılığı, alım satım ve varlık yönetimi alanlarında faaliyet gösterir. Ekonomistlerinin piyasa ve faiz tahminleri sıkça haberlere konu olur.',
  },
  {
    slug: 'bank-of-america',
    ad: 'Bank of America',
    tamAd: 'Bank of America Corporation',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q487907',
    desen: ozel('Bank of America', 'BofA'),
    giris:
      'Bank of America, merkezi Kuzey Carolina’nın Charlotte kentinde bulunan ve ABD’nin en büyük bankaları arasında yer alan finans kuruluşudur. Bireysel ve kurumsal bankacılık, yatırım bankacılığı ve varlık yönetimi hizmetleri sunar. Fon yöneticileri anketleri ve sektör raporları piyasalarda takip edilir.',
  },
  {
    slug: 'morgan-stanley',
    ad: 'Morgan Stanley',
    tamAd: 'Morgan Stanley',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q334204',
    desen: ozel('Morgan Stanley'),
    giris:
      'Morgan Stanley, merkezi New York’ta bulunan ABD’li yatırım bankası ve varlık yönetimi şirketidir; 1935’te kuruldu. Kurumsal finansman, alım satım ve servet yönetimi alanlarında faaliyet gösterir.',
  },
  {
    slug: 'wells-fargo',
    ad: 'Wells Fargo',
    tamAd: 'Wells Fargo & Company',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q744149',
    desen: ozel('Wells Fargo'),
    giris:
      'Wells Fargo, 1852’de kurulan ve ABD’nin en büyük bankaları arasında yer alan finans kuruluşudur; merkezi San Francisco’dadır. Ağırlıklı olarak bireysel bankacılık, konut kredisi ve ticari bankacılık alanlarında faaliyet gösterir.',
  },
  {
    slug: 'samsung',
    ad: 'Samsung',
    tamAd: 'Samsung Electronics',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q20718',
    desen: ozel('Samsung'),
    giris:
      'Samsung Electronics, Güney Kore’nin en büyük şirketler grubu Samsung’un elektronik şirketidir. Dünyanın önde gelen bellek çipi üreticilerinden biridir; akıllı telefon, televizyon ve ev aletleri de üretir. Bellek çipi fiyatları ve yapay zekâ kaynaklı talep, şirketin kârlılığını yakından etkiler.',
  },
  {
    slug: 'tsmc',
    ad: 'TSMC',
    tamAd: 'Taiwan Semiconductor Manufacturing Company',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q713418',
    desen: ozel('TSMC', 'Taiwan Semiconductor'),
    giris:
      'TSMC (Taiwan Semiconductor Manufacturing Company), 1987’de Tayvan’da kurulan ve başka şirketlerin tasarladığı çipleri üreten dünyanın en büyük sözleşmeli çip üreticisidir. Apple ve Nvidia gibi şirketlerin ileri teknoloji işlemcilerini üretir. Aylık satış rakamları küresel çip talebinin göstergesi olarak izlenir.',
  },
  {
    slug: 'intel',
    ad: 'Intel',
    tamAd: 'Intel Corporation',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q248',
    desen: ozel('Intel'),
    giris:
      'Intel, merkezi Kaliforniya’nın Santa Clara kentinde bulunan ABD’li yarı iletken şirketidir ve 1968’de kuruldu. Kişisel bilgisayar ve sunucu işlemcileriyle tanınır; başka şirketler için çip üretimi (dökümhane) hizmeti de sunar.',
  },
  {
    slug: 'oracle',
    ad: 'Oracle',
    tamAd: 'Oracle Corporation',
    tur: 'sirket',
    schema: 'Corporation',
    sameAs: 'https://www.wikidata.org/wiki/Q19900',
    desen: ozel('Oracle'),
    giris:
      'Oracle, 1977’de kurulan ABD’li yazılım ve bulut bilişim şirketidir. Veritabanı yazılımlarıyla tanınır; son yıllarda yapay zekâ şirketlerine veri merkezi kapasitesi sağlayan bulut altyapısı işini büyütmektedir.',
  },
  // Kripto varlıklar
  {
    slug: 'bitcoin',
    ad: 'Bitcoin',
    tamAd: 'Bitcoin (BTC)',
    tur: 'kripto',
    schema: 'FinancialProduct',
    sameAs: 'https://www.wikidata.org/wiki/Q131723',
    desen: ozel('Bitcoin', 'BTC'),
    giris:
      'Bitcoin, 2009’da Satoshi Nakamoto takma adlı kişi ya da kişilerce başlatılan ilk ve piyasa değeri en büyük kripto paradır. İşlemler blokzincir adı verilen herkese açık bir kayıt defterinde tutulur ve merkezi bir ihraççısı yoktur. Toplam arzı protokolle 21 milyon adetle sınırlıdır; fiyatı oynaklığı yüksek bir varlık olarak bilinir.',
  },
  {
    slug: 'ethereum',
    ad: 'Ethereum',
    tamAd: 'Ethereum (ETH)',
    tur: 'kripto',
    schema: 'FinancialProduct',
    sameAs: 'https://www.wikidata.org/wiki/Q16783523',
    desen: ozel('Ethereum', 'Ether'),
    giris:
      'Ethereum, 2015’te faaliyete geçen ve akıllı sözleşmeler çalıştırabilen bir blokzincir ağıdır; ağın kripto parası ether (ETH) olarak adlandırılır. Merkeziyetsiz finans uygulamaları ve sabit kripto paraların önemli bölümü bu ağ üzerinde çalışır.',
  },
  // Temalar
  {
    slug: 'petrol',
    ad: 'Petrol',
    tamAd: 'Petrol piyasası',
    tur: 'tema',
    schema: 'Thing',
    sameAs: 'https://www.wikidata.org/wiki/Q22656',
    desen: cins('petrol'),
    giris:
      'Ham petrol fiyatları, enerji maliyetleri üzerinden enflasyonu ve petrol ithal eden Türkiye gibi ülkelerin dış ticaret dengesini doğrudan etkiler. Uluslararası piyasada en çok izlenen referans fiyatlar Kuzey Denizi kaynaklı Brent ve ABD kaynaklı WTI petrolüdür. Fiyatlar arz kararları, stok verileri, küresel büyüme beklentileri ve üretim bölgelerindeki jeopolitik gelişmelerle değişir.',
  },
  {
    slug: 'yapay-zeka',
    ad: 'Yapay zekâ',
    tamAd: 'Yapay zekâ ekonomisi',
    tur: 'tema',
    schema: 'Thing',
    sameAs: 'https://www.wikidata.org/wiki/Q11660',
    desen: cins('yapay zeka', 'yapay zekâ'),
    giris:
      'Yapay zekâ, son yıllarda teknoloji şirketlerinin yatırım harcamalarını, çip talebini ve borsa değerlemelerini en çok etkileyen tema hâline geldi. Bu sayfada yapay zekâ şirketlerinin finansmanı, veri merkezi ve çip yatırımları, düzenlemeler ve yapay zekânın ekonomiye etkisine dair haberler bir arada yer alır.',
  },
];

export const KONU_TURLERI = /** @type {const} */ ([
  { tur: 'kurum', ad: 'Kurumlar' },
  { tur: 'sirket', ad: 'Şirketler' },
  { tur: 'kripto', ad: 'Kripto varlıklar' },
  { tur: 'tema', ad: 'Temalar' },
]);

const say = (desen, metin) => (String(metin ?? '').match(new RegExp(desen.source, desen.flags)) ?? []).length;

/**
 * Yazının bağlandığı konuların slug'ları: başlık/spotta bir kez ya da gövdede en az iki kez geçmesi gerekir.
 * @param {{ baslik: string, spot?: string, govde?: string }} yazi
 * @returns {string[]}
 */
export function konulariBul({ baslik, spot = '', govde = '' }) {
  return KONULAR.filter((k) => say(k.desen, `${baslik}\n${spot}`) > 0 || say(k.desen, govde) >= 2).map((k) => k.slug);
}

/**
 * Konu → yazı id listesi; yalnızca en az `esik` yazısı olan konular döner (KONULAR sırasıyla).
 * @param {{ id: string, baslik: string, spot?: string, govde?: string }[]} yazilar
 */
export function konuDizini(yazilar, esik = KONU_ESIGI) {
  const harita = new Map(KONULAR.map((k) => [k.slug, /** @type {string[]} */ ([])]));
  for (const y of yazilar) for (const s of konulariBul(y)) harita.get(s)?.push(y.id);
  return KONULAR.filter((k) => (harita.get(k.slug)?.length ?? 0) >= esik).map((k) => ({ konu: k, idler: harita.get(k.slug) ?? [] }));
}
