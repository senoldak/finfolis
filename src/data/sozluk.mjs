// Finans sözlüğü (/sozluk/ ve /sozluk/<slug>/). Tanımlar finfolis için özgün yazıldı; güncel değer (oran, fiyat)
// içermez, çünkü sayfa tarihsizdir. Her tanım 80-200 kelimedir (scripts/site/sozluk.test.mjs denetler).
//
// bagla: haber metinlerinde bu terime bağlantı verilecek ifadeler (düzenli ifade kaynağı, sınırlar otomatik eklenir).
//   Küçük harfli ifadeler harf duyarsız aranır ve Türkçe ek alabilir; harf: true olan terimler (kısaltmalar) harfe
//   duyarlıdır ve yalnızca kesmeli ek alır (TÜFE'nin). Boş bagla: terim sözlükte vardır ama haberlerde bağlanmaz.
// Düz JS: site, rehype eklentisi (src/lib/sozluk-bagla.mjs) ve testler aynı veriyi okur.

/** @typedef {{ slug: string, terim: string, bagla: string[], harf?: boolean, tanim: string[], ilgili: string[] }} Terim */

/** @type {Terim[]} */
export const TERIMLER = [
  {
    slug: 'enflasyon',
    terim: 'Enflasyon',
    bagla: ['enflasyon\\p{L}*'],
    tanim: [
      'Enflasyon, mal ve hizmet fiyatlarının genel düzeyinin sürekli olarak artmasıdır. Tek bir ürünün pahalanması enflasyon sayılmaz; önemli olan fiyatların geniş bir sepette birlikte yükselmesidir. Enflasyon yükseldikçe aynı miktar parayla daha az şey alınabilir, yani paranın satın alma gücü azalır.',
      'Türkiye’de resmi enflasyon, TÜİK’in her ay açıkladığı tüketici fiyat endeksiyle (TÜFE) ölçülür ve genellikle bir önceki yılın aynı ayına göre yıllık yüzde değişim olarak duyurulur. Enflasyonun nedenleri arasında talebin üretimden hızlı artması, enerji ve hammadde gibi maliyetlerin yükselmesi, kurdaki değer kaybı ve beklentiler sayılabilir. Merkez bankaları enflasyonu düşürmek için çoğunlukla faiz artırımı gibi para politikası araçlarını kullanır.',
    ],
    ilgili: ['tufe', 'cekirdek-enflasyon', 'dezenflasyon', 'reel-faiz'],
  },
  {
    slug: 'tufe',
    terim: 'TÜFE (Tüketici fiyat endeksi)',
    bagla: ['TÜFE'],
    harf: true,
    tanim: [
      'TÜFE, yani tüketici fiyat endeksi, hanelerin satın aldığı mal ve hizmetlerin fiyatlarındaki değişimi ölçen göstergedir. Türkiye’de TÜİK tarafından hesaplanır ve resmi enflasyon oranı bu endeksteki değişimden elde edilir.',
      'Endeks, gıda, konut, ulaştırma, giyim, sağlık ve eğitim gibi gruplardan oluşan bir sepetin fiyatını izler. Her grubun sepetteki ağırlığı, hanelerin harcamalarında o grubun payına göre belirlenir ve düzenli olarak güncellenir. TÜFE her ay açıklanır; aylık değişim bir önceki aya, yıllık değişim ise bir önceki yılın aynı ayına göre hesaplanır. Ortalama bir sepeti yansıttığı için bir kişinin kendi harcamalarındaki artış TÜFE’den farklı olabilir. Kira artışları ve bazı ücret ayarlamalarında da TÜFE değişimi referans alınır.',
    ],
    ilgili: ['enflasyon', 'ufe', 'cekirdek-enflasyon'],
  },
  {
    slug: 'ufe',
    terim: 'ÜFE (Üretici fiyat endeksi)',
    bagla: ['ÜFE', 'Yİ-ÜFE'],
    harf: true,
    tanim: [
      'ÜFE, üretici fiyat endeksidir ve üreticilerin sattığı ürünlerin fiyatlarındaki değişimi ölçer. Türkiye’de TÜİK tarafından Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE) adıyla her ay açıklanır. Fiyatlar, vergiler ve dağıtım maliyetleri eklenmeden, üretim yerinden çıkış aşamasında ölçülür.',
      'ÜFE’deki artış, hammadde, enerji ve ara malı maliyetlerinin yükseldiğini gösterir. Üreticiler bu maliyetleri zamanla satış fiyatlarına yansıtabildiği için ÜFE, tüketici enflasyonunun yönü hakkında erken bir işaret olarak izlenir. Ancak her maliyet artışı tüketiciye aynı ölçüde yansımaz; talep koşulları ve rekabet bu geçişi etkiler. ÜFE ile TÜFE arasındaki farka bakılarak şirketlerin kâr marjları üzerindeki baskı da yorumlanabilir.',
    ],
    ilgili: ['tufe', 'enflasyon'],
  },
  {
    slug: 'cekirdek-enflasyon',
    terim: 'Çekirdek enflasyon',
    bagla: ['çekirdek enflasyon\\p{L}*'],
    tanim: [
      'Çekirdek enflasyon, fiyatları sert ve geçici dalgalanmalar gösteren kalemler çıkarıldıktan sonra hesaplanan enflasyondur. Amaç, mevsim, hava koşulları ya da dünya piyasalarındaki ani hareketlerden etkilenen kalemleri ayıklayarak fiyat artışlarının temel eğilimini görmektir.',
      'Türkiye’de TÜİK, özel kapsamlı TÜFE göstergeleri yayımlar. Bunlardan en çok izlenen C endeksi; enerji, gıda ve alkolsüz içecekler, alkollü içecekler, tütün ürünleri ve altını kapsam dışında bırakır. Merkez bankaları faiz kararlarında manşet enflasyonun yanında çekirdek göstergelere de bakar; çünkü çekirdek enflasyonun yüksek kalması, fiyat artışlarının ekonomiye yayıldığını ve kalıcılaştığını gösterebilir. Çekirdek enflasyon, manşet enflasyondan daha yavaş değişme eğilimindedir.',
    ],
    ilgili: ['enflasyon', 'tufe', 'politika-faizi'],
  },
  {
    slug: 'dezenflasyon',
    terim: 'Dezenflasyon',
    bagla: ['dezenflasyon\\p{L}*'],
    tanim: [
      'Dezenflasyon, enflasyon oranının düşmesidir; yani fiyatlar artmaya devam eder ama eskisinden daha yavaş artar. Örneğin yıllık enflasyonun yüzde 40’tan yüzde 30’a gerilemesi dezenflasyondur: fiyatlar hâlâ yükselmektedir, yalnızca artış hızı azalmıştır.',
      'Dezenflasyon, fiyat düzeyinin gerçekten düştüğü deflasyonla karıştırılmamalıdır. Deflasyonda fiyatlar bir önceki döneme göre ucuzlar; bu durum talebin çok zayıfladığı dönemlerde görülür ve ekonomi için ayrı riskler taşır. Merkez bankalarının sıkı para politikası uyguladığı dönemler genellikle dezenflasyon sürecini hedefler. Bu süreçte ücretler ve faizler gibi değişkenlerin enflasyondaki düşüşe nasıl uyum sağladığı yakından izlenir.',
    ],
    ilgili: ['enflasyon', 'parasal-sikilastirma', 'stagflasyon'],
  },
  {
    slug: 'stagflasyon',
    terim: 'Stagflasyon',
    bagla: ['stagflasyon\\p{L}*'],
    tanim: [
      'Stagflasyon, ekonomik büyümenin durduğu ya da çok yavaşladığı bir dönemde enflasyonun yüksek seyretmesidir. Adı, durgunluk anlamındaki İngilizce stagnation ile enflasyon kelimelerinin birleşiminden gelir. Bu durumda işsizlik de genellikle yükselir.',
      'Stagflasyon politika yapıcılar için zor bir tablodur. Enflasyonla mücadele için faizi artırmak büyümeyi daha da zayıflatabilir; büyümeyi desteklemek için faizi düşürmek ise enflasyonu besleyebilir. En bilinen örnek, petrol fiyatlarının hızla yükseldiği 1970’lerde birçok gelişmiş ülkenin yaşadığı dönemdir. Enerji gibi temel girdilerdeki ani maliyet artışları, hem üretimi azaltıp hem fiyatları yükselterek stagflasyon riskini artırabilir.',
    ],
    ilgili: ['enflasyon', 'resesyon', 'brent-petrol'],
  },
  {
    slug: 'faiz',
    terim: 'Faiz',
    bagla: [],
    tanim: [
      'Faiz, bir süreliğine kullanılan paranın bedelidir. Borç alan, aldığı tutarın yanında faiz öder; parasını bankaya yatıran ya da borç veren ise faiz geliri elde eder. Faiz genellikle yıllık yüzde oran olarak ifade edilir, ancak kredi kartı ve tüketici kredilerinde aylık oran da kullanılır.',
      'Faiz oranları; merkez bankasının politika faizi, enflasyon beklentisi, borçlunun riski ve vade gibi etkenlere göre belirlenir. Basit faizde getiri yalnızca anapara üzerinden hesaplanır; bileşik faizde ise kazanılan faiz de yeniden faiz kazanır. Faizdeki değişim tasarruf, kredi, yatırım ve kur gibi birçok ekonomik karar üzerinde etkili olduğu için ekonomideki en önemli fiyatlardan biri sayılır.',
    ],
    ilgili: ['politika-faizi', 'reel-faiz', 'vadeli-mevduat'],
  },
  {
    slug: 'politika-faizi',
    terim: 'Politika faizi',
    bagla: ['politika faiz\\p{L}*'],
    tanim: [
      'Politika faizi, bir merkez bankasının para politikasını yönlendirmek için belirlediği temel faiz oranıdır. Merkez bankası bu oranı değiştirerek bankaların borçlanma maliyetini, dolayısıyla ekonomideki kredi ve mevduat faizlerini etkiler.',
      'Türkiye Cumhuriyet Merkez Bankası politika faizi olarak bir hafta vadeli repo ihale faiz oranını kullanır ve kararları Para Politikası Kurulu (PPK) toplantılarında verir. ABD’de bunun karşılığı Fed’in belirlediği federal fon oranı hedef aralığıdır. Politika faizinin artırılması genellikle talebi yavaşlatarak enflasyonu düşürmeyi amaçlar; indirilmesi ise kredi ve harcamayı destekler. Kararın etkisi ekonomiye aylar içinde ve kademeli olarak yayılır.',
    ],
    ilgili: ['repo', 'para-politikasi', 'parasal-sikilastirma', 'reel-faiz'],
  },
  {
    slug: 'reel-faiz',
    terim: 'Reel faiz',
    bagla: ['reel faiz\\p{L}*'],
    tanim: [
      'Reel faiz, enflasyonun etkisi çıkarıldıktan sonra kalan faizdir. Bankanın ya da piyasanın ilan ettiği oran nominal faizdir; reel faiz ise paranın satın alma gücünün gerçekte ne kadar arttığını gösterir.',
      'Basit bir yaklaşımla reel faiz, nominal faizden enflasyon oranı çıkarılarak bulunur. Daha kesin hesapta (1 + nominal faiz) / (1 + enflasyon) − 1 formülü kullanılır. Örneğin yüzde 40 faiz alınan bir yılda enflasyon yüzde 30 ise reel getiri yaklaşık yüzde 7,7 olur. Reel faiz negatifse, faiz geliri enflasyonun gerisinde kalır ve birikimin satın alma gücü azalır. Merkez bankalarının duruşunu değerlendirirken politika faizinin beklenen enflasyona göre konumu, yani ileriye dönük reel faiz izlenir.',
    ],
    ilgili: ['faiz', 'enflasyon', 'politika-faizi'],
  },
  {
    slug: 'repo',
    terim: 'Repo',
    bagla: ['repo(?:da|dan|nun|ya|lar\\p{L}*)?'],
    tanim: [
      'Repo, bir menkul kıymetin ileri bir tarihte geri alınmak üzere satılmasıdır. Pratikte kısa vadeli, teminatlı bir borçlanmadır: para ihtiyacı olan taraf elindeki tahvil ya da bonoyu teminat olarak verir, belirlenen vadede faiziyle birlikte parayı ödeyip kıymeti geri alır. İşlemin karşı tarafı için aynı işlem ters repo olarak adlandırılır.',
      'Repo, bankalar arasında ve merkez bankası ile bankalar arasında likidite yönetimi için yaygın olarak kullanılır. TCMB’nin politika faizi de bir hafta vadeli repo ihalelerinde uygulanan orandır. Bireysel yatırımcılar da bankalar ve aracı kurumlar üzerinden genellikle gecelik repo işlemi yapabilir. Teminat olarak devlet tahvili kullanıldığı için repo, düşük riskli bir kısa vadeli yatırım aracı sayılır.',
    ],
    ilgili: ['politika-faizi', 'likidite', 'tahvil'],
  },
  {
    slug: 'swap',
    terim: 'Swap',
    bagla: ['swap\\p{L}*'],
    tanim: [
      'Swap, iki tarafın belirli nakit akışlarını önceden kararlaştırılan koşullarla değiş tokuş ettiği bir türev sözleşmedir. Kelime İngilizcede takas anlamına gelir. En yaygın türleri döviz swapı ve faiz swapıdır.',
      'Döviz swapında taraflar bugün iki farklı para birimini değiştirir ve vade sonunda önceden belirlenen kurdan ters işlem yapar. Böylece kur riski almadan bir süreliğine başka bir para birimine erişilir. Faiz swapında ise taraflardan biri sabit faiz, diğeri değişken faiz ödemesi yapar. Merkez bankaları swap işlemlerini bankalarla ve diğer merkez bankalarıyla likidite sağlamak için kullanır. TCMB’nin rezerv hesaplarında swaplar, brüt rezervi artırıp net rezervi değiştirmeyen kalemler olarak ayrıca izlenir.',
    ],
    ilgili: ['rezerv', 'likidite', 'cds'],
  },
  {
    slug: 'zorunlu-karsilik',
    terim: 'Zorunlu karşılık',
    bagla: ['zorunlu karşılık\\p{L}*', 'zorunlu karşılığ\\p{L}*'],
    tanim: [
      'Zorunlu karşılık, bankaların topladıkları mevduat ve benzeri yükümlülüklerin belirli bir oranını merkez bankasında tutmak zorunda olduğu tutardır. Merkez bankası bu oranları belirleyerek bankaların kredi verebileceği kaynak miktarını etkiler.',
      'Zorunlu karşılık oranlarının artırılması bankaların elindeki serbest parayı azaltır ve kredi büyümesini yavaşlatabilir; düşürülmesi ise bankalara kaynak sağlar. Oranlar mevduatın vadesine ve para birimine göre farklılaştırılabilir. TCMB, zorunlu karşılığı faizin yanında tamamlayıcı bir para politikası aracı olarak kullanır. Zorunlu karşılık aynı zamanda bankacılık sisteminde ani likidite sıkışıklıklarına karşı bir tampon işlevi görür.',
    ],
    ilgili: ['para-politikasi', 'likidite', 'vadeli-mevduat'],
  },
  {
    slug: 'parasal-sikilastirma',
    terim: 'Parasal sıkılaştırma',
    bagla: ['parasal sıkılaştırma\\p{L}*', 'parasal sıkılaşma\\p{L}*'],
    tanim: [
      'Parasal sıkılaştırma, merkez bankasının ekonomideki para ve kredi miktarını azaltmaya, borçlanmayı pahalılaştırmaya yönelik adımlarının genel adıdır. En bilinen aracı politika faizinin artırılmasıdır. Zorunlu karşılık oranlarını yükseltmek, piyasaya verilen likiditeyi azaltmak ya da merkez bankasının elindeki tahvilleri azaltması da sıkılaştırma sayılır.',
      'Amaç genellikle enflasyonu düşürmektir: kredi pahalandıkça harcama ve talep yavaşlar, fiyat artışları da zamanla azalır. Sıkılaştırmanın bedeli büyümenin yavaşlaması olabilir. Bunun tersi olan para politikası gevşemesi ise faiz indirimi ve likidite artışıyla ekonomiyi canlandırmayı hedefler. Merkez bankaları sıkılaştırmanın ne kadar süreceğini, yayımladıkları metinlerdeki yönlendirmelerle piyasaya duyurmaya çalışır.',
    ],
    ilgili: ['politika-faizi', 'niceliksel-genisleme', 'zorunlu-karsilik'],
  },
  {
    slug: 'niceliksel-genisleme',
    terim: 'Niceliksel genişleme',
    bagla: ['niceliksel genişleme\\p{L}*', 'parasal genişleme\\p{L}*'],
    tanim: [
      'Niceliksel genişleme, bir merkez bankasının piyasadan büyük miktarda devlet tahvili ve başka finansal varlıklar satın alarak ekonomiye para sürmesidir. Faizlerin sıfıra yakın olduğu ve daha fazla indirilemediği dönemlerde kullanılan alışılmadık bir para politikası aracıdır.',
      'Merkez bankası tahvil aldıkça tahvil fiyatları yükselir, uzun vadeli faizler düşer; bankaların elindeki likidite artar. Bu yolla kredi ve yatırımın desteklenmesi amaçlanır. Fed, 2008 küresel finans krizinden sonra ve 2020 salgın döneminde geniş çaplı varlık alımları yaptı; Avrupa Merkez Bankası ve Japonya Merkez Bankası da benzer programlar uyguladı. Bunun tersine, merkez bankasının bilançosunu küçülttüğü sürece niceliksel sıkılaştırma denir.',
    ],
    ilgili: ['parasal-sikilastirma', 'tahvil-getirisi', 'likidite'],
  },
  {
    slug: 'para-politikasi',
    terim: 'Para politikası',
    bagla: ['para politikası\\p{L}*', 'para politikas\\p{L}*'],
    tanim: [
      'Para politikası, merkez bankasının fiyat istikrarı başta olmak üzere ekonomik hedeflere ulaşmak için faiz, likidite ve para miktarı üzerinde aldığı kararların bütünüdür. Temel aracı politika faizidir; zorunlu karşılıklar, açık piyasa işlemleri ve döviz müdahaleleri de para politikasının araçları arasında yer alır.',
      'Türkiye’de para politikasından TCMB sorumludur ve kanundaki temel amacı fiyat istikrarıdır. Para politikası kararları genellikle önceden açıklanan bir takvime göre yapılan kurul toplantılarında alınır ve gerekçeleriyle birlikte duyurulur. Para politikası, devletin vergi ve harcama kararlarından oluşan maliye politikasından ayrıdır; ikisinin uyumlu olması enflasyonla mücadelenin başarısı için önemlidir.',
    ],
    ilgili: ['politika-faizi', 'maliye-politikasi', 'parasal-sikilastirma'],
  },
  {
    slug: 'maliye-politikasi',
    terim: 'Maliye politikası',
    bagla: ['maliye politika\\p{L}*'],
    tanim: [
      'Maliye politikası, devletin vergi, harcama ve borçlanma kararları aracılığıyla ekonomiyi etkilemesidir. Türkiye’de bu alandan Hazine ve Maliye Bakanlığı sorumludur; temel çerçeve her yıl yasalaşan merkezi yönetim bütçesiyle çizilir.',
      'Kamu harcamalarını artırmak ya da vergileri düşürmek talebi canlandırır; buna genişletici maliye politikası denir. Harcamaları kısmak ya da vergileri artırmak ise talebi yavaşlatır ve bütçe açığını azaltır. Maliye politikası, merkez bankasının yürüttüğü para politikasından ayrıdır ama ikisi birbirini etkiler: enflasyonla mücadele dönemlerinde gevşek bir maliye politikası, faiz artışlarının etkisini zayıflatabilir. Bütçe açığı ve kamu borcu gibi göstergeler bu politikanın sonuçlarını izlemek için kullanılır.',
    ],
    ilgili: ['butce-acigi', 'para-politikasi', 'gsyh'],
  },
  {
    slug: 'rezerv',
    terim: 'Rezerv (merkez bankası rezervleri)',
    bagla: ['brüt rezerv\\p{L}*', 'net rezerv\\p{L}*', 'döviz rezerv\\p{L}*', 'rezervler\\p{L}*'],
    tanim: [
      'Merkez bankası rezervleri, bir ülkenin merkez bankasının elinde tuttuğu döviz ve altın varlıklarıdır. Rezervler kurdaki sert dalgalanmalara karşı müdahale, dış borç ödemeleri ve finansal krizlere karşı güvence için kullanılır.',
      'Brüt rezerv, merkez bankasının elindeki tüm döviz ve altın varlıklarını gösterir. Net rezerv ise bu varlıklardan merkez bankasının dövizle ilgili kısa vadeli yükümlülükleri düşülerek hesaplanır. Bankalardan swap yoluyla alınan döviz brüt rezervi artırır ama geri ödeneceği için net rezervi artırmaz; bu nedenle swap hariç net rezerv ayrıca izlenir. TCMB rezervlerini haftalık olarak yayımlar. Rezervlerin güçlü olması, ülkenin dış şoklara dayanıklılığı hakkında yatırımcılara olumlu bir işaret verir.',
    ],
    ilgili: ['swap', 'doviz-kuru', 'cari-acik'],
  },
  {
    slug: 'doviz-kuru',
    terim: 'Döviz kuru',
    bagla: ['döviz kur\\p{L}*'],
    tanim: [
      'Döviz kuru, bir para biriminin başka bir para birimi cinsinden fiyatıdır. Örneğin dolar/TL kuru, bir ABD dolarını almak için kaç Türk lirası ödendiğini gösterir. Kurun yükselmesi liranın dolara karşı değer kaybettiği anlamına gelir.',
      'Türkiye’de dalgalı kur rejimi uygulanır; kur, piyasadaki arz ve talebe göre belirlenir. Faiz farkları, enflasyon, cari denge, yabancı yatırımcı girişleri ve küresel risk iştahı kurları etkileyen başlıca unsurlardır. TCMB her iş günü saat 15.30’da gösterge niteliğindeki döviz kurlarını ilan eder; bankaların uyguladığı kurlar bundan farklı olabilir. Alış ve satış kurları arasındaki fark makas olarak adlandırılır. Kur hareketleri ithal ürün fiyatları üzerinden enflasyonu da etkiler.',
    ],
    ilgili: ['devaluasyon', 'rezerv', 'carry-trade'],
  },
  {
    slug: 'devaluasyon',
    terim: 'Devalüasyon',
    bagla: ['devalüasyon\\p{L}*'],
    tanim: [
      'Devalüasyon, sabit ya da yönetilen kur rejiminde ulusal paranın değerinin hükümet veya merkez bankası kararıyla düşürülmesidir. Örneğin bir merkez bankası, paranın dolara karşı sabitlendiği kuru resmi olarak yükseltirse devalüasyon yapmış olur.',
      'Kurun piyasada serbestçe belirlendiği dalgalı kur rejiminde paranın değer kaybetmesi teknik olarak devalüasyon değil, değer kaybı ya da İngilizce karşılığıyla depresiyasyon olarak adlandırılır; ancak günlük dilde ikisi sıkça birbirinin yerine kullanılır. Devalüasyon ihracatı ucuzlatıp ithalatı pahalılaştırarak dış dengeyi düzeltmeyi amaçlayabilir. Öte yandan ithal ürünlerin fiyatını artırdığı için enflasyonu yükseltir ve dövizle borçlanmış olanların yükünü ağırlaştırır.',
    ],
    ilgili: ['doviz-kuru', 'cari-acik', 'enflasyon'],
  },
  {
    slug: 'carry-trade',
    terim: 'Carry trade',
    bagla: ['carry trade\\p{L}*'],
    tanim: [
      'Carry trade, faizi düşük bir para biriminden borçlanıp faizi yüksek bir para birimindeki varlıklara yatırım yaparak aradaki faiz farkından kazanç elde etmeye çalışan stratejidir. Örneğin düşük faizli yen ya da dolarla borçlanıp yüksek faizli bir gelişmekte olan ülke parasının tahvillerine yatırım yapmak bu türden bir işlemdir.',
      'Stratejinin temel riski kurdur: yüksek faizli para birimi kısa sürede sert değer kaybederse faiz kazancı silinebilir ve zarar oluşabilir. Bu nedenle carry trade işlemleri kurların sakin, risk iştahının yüksek olduğu dönemlerde artar; piyasada ani bir panik olduğunda ise hızla geri çekilir. Bu ani çıkışlar, ilgili para birimlerinde sert kur hareketlerine yol açabilir.',
    ],
    ilgili: ['doviz-kuru', 'reel-faiz', 'volatilite'],
  },
  {
    slug: 'tahvil',
    terim: 'Tahvil',
    bagla: ['tahvil\\p{L}*'],
    tanim: [
      'Tahvil, devletin ya da şirketlerin borçlanmak için çıkardığı, vadesi genellikle bir yıldan uzun olan borçlanma senedidir. Tahvili satın alan yatırımcı, ihraççıya borç vermiş olur; karşılığında belirli dönemlerde faiz (kupon) ödemesi ve vade sonunda anaparasını alır.',
      'Devletin çıkardığı tahvillere devlet iç borçlanma senedi ya da hazine tahvili, şirketlerinkine özel sektör tahvili denir. Tahviller vadesinden önce piyasada alınıp satılabilir; fiyatları faizlerle ters yönde hareket eder. Faizler yükseldiğinde mevcut tahvillerin fiyatı düşer, faizler düştüğünde yükselir. Tahvilin riski, ihraççının borcunu ödeme gücüne bağlıdır; bu risk kredi notlarıyla ve faiz farklarıyla ölçülür.',
    ],
    ilgili: ['bono', 'tahvil-getirisi', 'eurobond', 'kredi-notu'],
  },
  {
    slug: 'bono',
    terim: 'Bono',
    bagla: ['hazine bono\\p{L}*', 'bono(?:su|lar\\p{L}*|ları\\p{L}*)'],
    tanim: [
      'Bono, vadesi bir yıl ya da daha kısa olan borçlanma senedidir. Uzun vadeli borçlanma senedi olan tahvilin kısa vadeli karşılığı olarak düşünülebilir. Devletin çıkardığı kısa vadeli senetlere hazine bonosu, şirketlerin çıkardıklarına finansman bonosu denir.',
      'Bonolar genellikle kupon ödemez; yatırımcıya vadedeki değerinin altında, yani iskontolu satılır. Satın alma fiyatı ile vadede ödenen tutar arasındaki fark yatırımcının getirisidir. Vadesi kısa olduğu için faiz değişimlerinden tahvillere göre daha az etkilenir. Kısa vadeli bono faizleri, piyasadaki para politikası beklentilerinin göstergelerinden biri olarak izlenir. Bonolar genellikle daha kısa vadeli, tahviller ise daha uzun vadeli borçlanma araçlarıdır.',
    ],
    ilgili: ['tahvil', 'tahvil-getirisi', 'repo'],
  },
  {
    slug: 'tahvil-getirisi',
    terim: 'Tahvil getirisi',
    bagla: ['tahvil getiri\\p{L}*', 'tahvil faiz\\p{L}*'],
    tanim: [
      'Tahvil getirisi, bir tahvili bugünkü piyasa fiyatından alıp vadesine kadar tutan yatırımcının elde edeceği yıllık getiri oranıdır. Haberlerde genellikle tahvil faizi olarak da anılır. Getiri, tahvilin kupon oranından farklıdır; çünkü piyasa fiyatı zamanla değişir.',
      'Tahvil fiyatı ile getirisi ters yönde hareket eder: tahvil fiyatı düştüğünde yeni alıcının elde edeceği getiri yükselir. Getirileri; politika faizi beklentileri, enflasyon beklentisi, ülke riski ve tahvile olan talep belirler. Piyasalarda çoğunlukla belirli vadelerdeki gösterge tahviller izlenir; örneğin ABD’nin 10 yıl vadeli tahvil getirisi küresel faiz ortamının temel göstergelerinden biridir. Yükselen tahvil getirileri, şirketlerin ve hanelerin borçlanma maliyetini de artırır.',
    ],
    ilgili: ['tahvil', 'getiri-egrisi', 'politika-faizi'],
  },
  {
    slug: 'getiri-egrisi',
    terim: 'Getiri eğrisi',
    bagla: ['getiri eğri\\p{L}*'],
    tanim: [
      'Getiri eğrisi, aynı ihraççının farklı vadelerdeki tahvillerinin getirilerini vadeye göre sıralayan grafiktir. Genellikle devlet tahvilleri için çizilir ve kısa vadeden uzun vadeye doğru faizlerin nasıl değiştiğini gösterir.',
      'Olağan dönemlerde uzun vadeli faizler kısa vadelilerden yüksektir, çünkü yatırımcı parasını daha uzun süre bağladığı için ek getiri ister; bu durumda eğri yukarı eğimlidir. Kısa vadeli faizlerin uzun vadelilerin üstüne çıkmasına ters getiri eğrisi denir. ABD’de ters dönen getiri eğrisi geçmişte birçok resesyondan önce görüldüğü için piyasalarda bir uyarı işareti olarak izlenir; ancak her ters dönmenin ardından resesyon gelmesi kesin değildir.',
    ],
    ilgili: ['tahvil-getirisi', 'resesyon', 'politika-faizi'],
  },
  {
    slug: 'eurobond',
    terim: 'Eurobond',
    bagla: ['eurobond\\p{L}*', 'euro tahvil\\p{L}*'],
    tanim: [
      'Eurobond, bir devletin ya da şirketin kendi ülkesinin para birimi dışındaki bir para biriminde, uluslararası piyasalarda çıkardığı tahvildir. Adındaki euro, Avrupa para birimini değil, tahvilin ihraççının ülkesi dışındaki piyasada satıldığını anlatır; bu yüzden dolar cinsinden eurobond da olabilir.',
      'Türkiye Hazinesi ve büyük Türk şirketleri dolar ve euro cinsinden eurobond ihraç ederek yurt dışından borçlanır. Eurobond getirileri, yatırımcıların ihraççı ülkeye ve şirkete biçtiği riski gösterir; ülke riski arttığında bu tahvillerin fiyatı düşer, getirisi yükselir. Döviz cinsinden borçlanma, yerel paranın değer kaybetmesi durumunda geri ödemenin yerel para karşılığını artırır.',
    ],
    ilgili: ['tahvil', 'cds', 'kredi-notu'],
  },
  {
    slug: 'cds',
    terim: 'CDS (Kredi temerrüt takası)',
    bagla: ['CDS'],
    harf: true,
    tanim: [
      'CDS, İngilizce credit default swap ifadesinin kısaltmasıdır ve Türkçede kredi temerrüt takası olarak bilinir. Bir borçlunun, örneğin bir devletin ya da şirketin, borcunu ödeyememesi riskine karşı alınan sigortaya benzeyen bir türev sözleşmedir.',
      'CDS alan taraf düzenli bir prim öder; borçlu temerrüde düşerse zararını karşı taraftan tazmin eder. Bu prim baz puan olarak ifade edilir ve CDS primi adıyla anılır. Primin yükselmesi, piyasanın o borçlunun ödeme riskini daha yüksek gördüğünü gösterir. Ülkelerin 5 yıl vadeli CDS primleri, ülke riskinin en çok izlenen göstergelerinden biridir; yükselen CDS primi, o ülkenin yurt dışından borçlanma maliyetini de artırır.',
    ],
    ilgili: ['kredi-notu', 'eurobond', 'swap'],
  },
  {
    slug: 'kredi-notu',
    terim: 'Kredi notu',
    bagla: ['kredi not\\p{L}*'],
    tanim: [
      'Kredi notu, bir devletin ya da şirketin borçlarını zamanında ödeme kapasitesine ilişkin bağımsız bir değerlendirmedir. Kredi derecelendirme kuruluşları tarafından harf notlarıyla verilir; dünyada en çok bilinenleri S&P Global, Moody’s ve Fitch’tir.',
      'Notlar en yüksek kredi kalitesini gösteren AAA’dan (Moody’s’te Aaa) temerrüt durumunu gösteren notlara kadar uzanır. BBB− (Moody’s’te Baa3) ve üzerindeki notlar yatırım yapılabilir seviye, altındakiler ise spekülatif seviye olarak adlandırılır. Kuruluşlar notun yanında görünüm de açıklar; pozitif ya da negatif görünüm, notun ileride hangi yönde değişebileceğine işaret eder. Not artışı genellikle borçlanma maliyetini düşürür.',
    ],
    ilgili: ['cds', 'eurobond', 'tahvil'],
  },
  {
    slug: 'gsyh',
    terim: 'GSYH (Gayrisafi yurt içi hasıla)',
    bagla: ['GSYH'],
    harf: true,
    tanim: [
      'GSYH, gayrisafi yurt içi hasıla, bir ülkenin sınırları içinde belirli bir dönemde üretilen tüm nihai mal ve hizmetlerin piyasa değeridir. Bir ekonominin büyüklüğünü ve büyüme hızını ölçmek için kullanılan temel göstergedir.',
      'Türkiye’de GSYH’yi TÜİK üç aylık dönemler hâlinde açıklar. Ekonomik büyüme, GSYH’nin bir önceki yılın aynı dönemine ya da bir önceki çeyreğe göre değişimiyle ifade edilir. Fiyat artışlarının etkisinin çıkarıldığı zincirlenmiş hacim hesabı reel büyümeyi, cari fiyatlarla hesaplanan değer ise ekonominin parasal büyüklüğünü gösterir. GSYH; harcama yöntemiyle tüketim, yatırım, kamu harcaması ve net ihracat bileşenlerine ayrılarak da incelenir.',
    ],
    ilgili: ['resesyon', 'issizlik-orani', 'cari-acik'],
  },
  {
    slug: 'resesyon',
    terim: 'Resesyon',
    bagla: ['resesyon\\p{L}*'],
    tanim: [
      'Resesyon, ekonomik faaliyetin belirgin ve yaygın biçimde daraldığı dönemdir. Üretim, istihdam, gelir ve satışlar birlikte azalır. Kamuoyunda en sık kullanılan pratik tanım, gayrisafi yurt içi hasılanın art arda iki çeyrek boyunca daralmasıdır.',
      'Bu pratik tanım her ülkede resmi ölçüt değildir. Örneğin ABD’de resesyonun başlangıç ve bitiş tarihlerini, yalnızca GSYH’ye değil istihdam ve gelir gibi birçok göstergeye bakan Ulusal Ekonomik Araştırmalar Bürosu (NBER) belirler. Resesyon dönemlerinde işsizlik artar, şirket kârları azalır; merkez bankaları genellikle faiz indirerek, hükümetler ise harcamalarını artırarak ekonomiyi desteklemeye çalışır.',
    ],
    ilgili: ['gsyh', 'stagflasyon', 'getiri-egrisi'],
  },
  {
    slug: 'issizlik-orani',
    terim: 'İşsizlik oranı',
    bagla: ['işsizlik oran\\p{L}*'],
    tanim: [
      'İşsizlik oranı, çalışmak isteyip iş arayan ancak iş bulamayanların işgücüne oranıdır. İşgücü, çalışanlar ile iş arayan işsizlerin toplamından oluşur; iş aramayan öğrenciler, emekliler ya da ev işleriyle uğraşanlar işgücüne dahil edilmez.',
      'Türkiye’de işsizlik oranı TÜİK’in hanehalkı işgücü anketiyle hesaplanır ve aylık olarak açıklanır. Yalnızca işsizlik oranına bakmak tabloyu eksik gösterebilir; bu yüzden işgücüne katılma oranı, istihdam oranı ve zamana bağlı eksik istihdamı da kapsayan atıl işgücü oranı birlikte izlenir. ABD’de aylık tarım dışı istihdam raporu ve işsizlik oranı, Fed’in faiz kararları üzerindeki etkisi nedeniyle küresel piyasaların en çok izlediği veriler arasındadır.',
    ],
    ilgili: ['gsyh', 'resesyon', 'enflasyon'],
  },
  {
    slug: 'cari-acik',
    terim: 'Cari açık',
    bagla: ['cari açık\\p{L}*', 'cari açığ\\p{L}*', 'cari işlemler açığ\\p{L}*'],
    tanim: [
      'Cari açık, bir ülkenin yurt dışına yaptığı ödemelerin yurt dışından elde ettiği gelirleri aştığı durumu anlatır. Cari işlemler hesabı; mal ticareti, turizm ve taşımacılık gibi hizmet gelir ve giderleri, yatırım gelirleri ile faiz ödemeleri ve işçi gelirleri gibi transferlerden oluşur.',
      'Cari açık veren bir ülke aradaki farkı yabancı yatırım, dış borçlanma ya da rezervlerini kullanarak finanse etmek zorundadır. Bu nedenle yüksek ve kalıcı cari açık, ülkeyi dış finansman koşullarındaki değişimlere karşı kırılgan hâle getirebilir. Türkiye’de enerji ve altın ithalatı cari dengeyi belirleyen önemli kalemlerdir; turizm gelirleri ise açığı azaltır. Ödemeler dengesi verisini TCMB her ay yayımlar.',
    ],
    ilgili: ['dis-ticaret-acigi', 'rezerv', 'doviz-kuru'],
  },
  {
    slug: 'dis-ticaret-acigi',
    terim: 'Dış ticaret açığı',
    bagla: ['dış ticaret açık\\p{L}*', 'dış ticaret açığ\\p{L}*'],
    tanim: [
      'Dış ticaret açığı, bir ülkenin belirli bir dönemde yaptığı mal ithalatının mal ihracatını aşan kısmıdır. İhracatın ithalattan fazla olması ise dış ticaret fazlası olarak adlandırılır. İhracatın ithalatı karşılama oranı da aynı ilişkiyi yüzde olarak gösterir.',
      'Dış ticaret dengesi yalnızca mal ticaretini kapsar; turizm gibi hizmet gelirleri bu hesaba girmez. Bu yüzden dış ticaret açığı, daha geniş kapsamlı cari açığın en büyük bileşeni olsa da onunla aynı şey değildir. Türkiye’de dış ticaret verileri her ay önce Ticaret Bakanlığı tarafından öncü veri olarak, ardından TÜİK tarafından açıklanır. Enerji fiyatları ve kurdaki değişimler dış ticaret dengesini belirgin biçimde etkiler.',
    ],
    ilgili: ['cari-acik', 'doviz-kuru', 'brent-petrol'],
  },
  {
    slug: 'butce-acigi',
    terim: 'Bütçe açığı',
    bagla: ['bütçe açık\\p{L}*', 'bütçe açığ\\p{L}*'],
    tanim: [
      'Bütçe açığı, devletin belirli bir dönemdeki harcamalarının gelirlerini aşmasıdır. Gelirlerin harcamalardan fazla olması bütçe fazlası olarak adlandırılır. Açık, genellikle borçlanma yoluyla, yani tahvil ve bono ihracıyla kapatılır.',
      'Faiz ödemeleri hariç tutularak hesaplanan dengeye faiz dışı denge denir ve devletin borç ödemeleri dışındaki mali duruşunu gösterir. Bütçe açığı çoğunlukla gayrisafi yurt içi hasılaya oranla değerlendirilir, böylece farklı yıllar ve ülkeler karşılaştırılabilir. Türkiye’de merkezi yönetim bütçe sonuçlarını Hazine ve Maliye Bakanlığı her ay açıklar. Büyük ve kalıcı açıklar borç yükünü artırır ve enflasyonla mücadeleyi zorlaştırabilir.',
    ],
    ilgili: ['maliye-politikasi', 'gsyh', 'tahvil'],
  },
  {
    slug: 'vadeli-mevduat',
    terim: 'Vadeli mevduat',
    bagla: ['vadeli mevduat\\p{L}*'],
    tanim: [
      'Vadeli mevduat, bankaya belirli bir süre için yatırılan ve bu sürenin sonunda faiziyle birlikte geri alınan paradır. Vade 1 aydan 1 yıla ya da daha uzun sürelere kadar seçilebilir. Vadesiz hesaptan farkı, paranın vade boyunca bağlı kalması ve karşılığında faiz kazanmasıdır.',
      'Vade dolmadan para çekilirse genellikle faiz hakkı kaybedilir ya da azalır. Türk lirası mevduatta faiz yılı 365 gün sayarak hesaplanır ve faiz gelirinden stopaj kesilir. Türkiye’de tasarruf mevduatı, belirli bir tutara kadar Tasarruf Mevduatı Sigorta Fonu (TMSF) güvencesi altındadır. Mevduatın gerçek kazancını görmek için net faiz oranını enflasyonla karşılaştırmak, yani reel getiriye bakmak gerekir.',
    ],
    ilgili: ['stopaj', 'faiz', 'reel-faiz', 'kur-korumali-mevduat'],
  },
  {
    slug: 'kur-korumali-mevduat',
    terim: 'Kur korumalı mevduat (KKM)',
    bagla: ['kur korumalı mevduat\\p{L}*', 'KKM'],
    tanim: [
      'Kur korumalı mevduat (KKM), Aralık 2021’de başlatılan ve Türk lirası mevduatı kur artışına karşı koruyan bir mevduat ürünüdür. Vade sonunda dolar/TL kurundaki artış hesaba yatırılan faizden fazla olursa, aradaki fark mevduat sahibine ayrıca ödenir.',
      'Uygulamanın amacı, dövize yönelen tasarrufları Türk lirasında tutmak ve kur üzerindeki baskıyı azaltmaktı. Kur farkı ödemeleri kamu kaynaklarından ve TCMB’den karşılandığı için bütçe ve merkez bankası üzerinde maliyet oluşturdu. Haziran 2023’ten itibaren uygulanan politikalarla KKM bakiyesinin azaltılması ve tasarrufların standart Türk lirası mevduata geçirilmesi hedeflendi. Ürünün koşulları dönem içinde birçok kez değiştirildi.',
    ],
    ilgili: ['vadeli-mevduat', 'doviz-kuru', 'rezerv'],
  },
  {
    slug: 'stopaj',
    terim: 'Stopaj',
    bagla: ['stopaj\\p{L}*'],
    tanim: [
      'Stopaj, bir gelir ödenirken vergisinin kaynağında kesilmesidir; Türkçede tevkifat olarak da geçer. Geliri ödeyen kurum, örneğin banka, vergiyi tutarın içinden keser ve doğrudan devlete öder. Gelirin sahibi eline vergisi düşülmüş net tutarı alır.',
      'Mevduat faizi, yatırım fonu kazançları, temettü ve kira gibi gelirlerde stopaj uygulanır. Mevduat faizindeki stopaj oranı vadeye ve hesabın para birimine göre farklılaşabilir; oranlar Cumhurbaşkanı kararıyla değiştirilebildiği için zaman içinde sık sık güncellenmiştir. Brüt faiz oranından stopaj düşüldüğünde net faiz oranı bulunur. Yatırım getirilerini karşılaştırırken her araçtaki stopaj oranına bakmak gerekir.',
    ],
    ilgili: ['vadeli-mevduat', 'temettu', 'yatirim-fonu'],
  },
  {
    slug: 'kkdf',
    terim: 'KKDF (Kaynak Kullanımını Destekleme Fonu)',
    bagla: ['KKDF'],
    harf: true,
    tanim: [
      'KKDF, Kaynak Kullanımını Destekleme Fonu’nun kısaltmasıdır. Bazı kredi işlemlerinde, faiz tutarı ya da kredi tutarı üzerinden alınan bir fon kesintisidir. Bireysel kredilerde banka bu kesintiyi taksitlere yansıtarak tahsil eder ve devlete aktarır.',
      'KKDF oranları kredi türüne ve kullanım amacına göre farklıdır ve Cumhurbaşkanı kararıyla değiştirilebilir. Konut kredileri gibi bazı krediler KKDF’den muaf tutulabilir; bazı dönemlerde ise belirli dış finansman işlemlerine KKDF getirilerek kredi büyümesi yavaşlatılmaya çalışılmıştır. Tüketici kredisi maliyetini hesaplarken faiz oranının yanında KKDF ve BSMV’nin de eklenmesi gerekir; bankaların ödeme planlarında bu kalemler ayrıca gösterilir.',
    ],
    ilgili: ['bsmv', 'faiz', 'stopaj'],
  },
  {
    slug: 'bsmv',
    terim: 'BSMV (Banka ve Sigorta Muameleleri Vergisi)',
    bagla: ['BSMV'],
    harf: true,
    tanim: [
      'BSMV, Banka ve Sigorta Muameleleri Vergisi’nin kısaltmasıdır. Bankaların ve sigorta şirketlerinin yaptıkları işlemler nedeniyle lehlerine aldıkları paralar, örneğin kredi faizleri ve bazı komisyonlar, üzerinden alınan bir vergidir.',
      'Bireysel kredilerde BSMV, faiz tutarı üzerinden hesaplanır ve taksitlere eklenerek müşteriden tahsil edilir. Oranlar işlem türüne göre farklıdır ve Cumhurbaşkanı kararıyla değiştirilebilir. Konut kredileri gibi bazı işlemler BSMV’den muaf olabilir. Döviz satışlarında da dönem dönem BSMV uygulanmıştır. Bir kredinin gerçek maliyetini görmek için faiz oranının yanında KKDF ve BSMV’nin etkisini de içeren yıllık maliyet oranına bakılır.',
    ],
    ilgili: ['kkdf', 'faiz', 'stopaj'],
  },
  {
    slug: 'hisse-senedi',
    terim: 'Hisse senedi',
    bagla: ['hisse senedi\\p{L}*', 'hisse senetler\\p{L}*', 'hisse senetleri'],
    tanim: [
      'Hisse senedi, bir anonim şirketin sermayesindeki ortaklık payını temsil eden kıymettir. Hisse senedi alan yatırımcı, aldığı pay oranında şirketin ortağı olur; şirketin kârından temettü alma ve genel kurulda oy kullanma gibi haklar kazanır.',
      'Halka açık şirketlerin hisseleri borsada alınıp satılır ve fiyatları arz ile talebe göre her işlem gününde değişir. Hisse fiyatını şirketin kârlılığı, büyüme beklentileri, sektördeki gelişmeler, faizler ve genel piyasa koşulları etkiler. Hisse senedi yatırımının getirisi hem fiyat artışından hem de dağıtılan temettüden gelir; ancak fiyat düşebileceği için yatırılan paranın bir kısmını kaybetme riski de vardır.',
    ],
    ilgili: ['halka-arz', 'temettu', 'piyasa-degeri', 'borsa-endeksi'],
  },
  {
    slug: 'halka-arz',
    terim: 'Halka arz',
    bagla: ['halka arz\\p{L}*'],
    tanim: [
      'Halka arz, bir şirketin paylarını ilk kez geniş yatırımcı kitlesine satarak borsada işlem görmeye başlamasıdır. Şirket yeni pay çıkararak sermaye toplayabilir ya da mevcut ortaklar ellerindeki payların bir bölümünü satabilir; çoğu halka arzda iki yöntem birlikte kullanılır.',
      'Türkiye’de halka arz için Sermaye Piyasası Kurulu’nun izahnameyi onaylaması gerekir; paylar ardından Borsa İstanbul’da işlem görmeye başlar. Yatırımcılar talep toplama döneminde aracı kurumlar üzerinden talepte bulunur ve paylar belirlenen dağıtım yöntemine göre dağıtılır. ABD’de şirketler halka arz başvurusunu SEC’e kayıt belgesiyle yapar. İzahname; şirketin faaliyetleri, finansal durumu, riskleri ve toplanan paranın nasıl kullanılacağı hakkında bilgi verir.',
    ],
    ilgili: ['hisse-senedi', 'piyasa-degeri', 'bedelsiz-sermaye-artirimi'],
  },
  {
    slug: 'temettu',
    terim: 'Temettü',
    bagla: ['temettü\\p{L}*', 'kâr payı\\p{L}*'],
    tanim: [
      'Temettü, bir şirketin elde ettiği kârın bir bölümünü ortaklarına nakit ya da pay olarak dağıtmasıdır; Türkçede kâr payı olarak da adlandırılır. Hissedarlar, sahip oldukları pay sayısı oranında temettü alır.',
      'Temettü dağıtılıp dağıtılmayacağına ve tutarına şirketin genel kurulu karar verir. Bazı şirketler kârlarını büyümeye yatırmak için temettü dağıtmaz, bazıları ise düzenli ödeme yapmayı tercih eder. Hisse başına temettünün hisse fiyatına oranı temettü verimi olarak adlandırılır. Temettü ödendiği gün hisse fiyatı genellikle ödenen tutar kadar düzeltilir, dolayısıyla temettü yatırımcıya bedava para anlamına gelmez. Nakit temettüden stopaj kesilebilir.',
    ],
    ilgili: ['hisse-senedi', 'stopaj', 'fiyat-kazanc-orani'],
  },
  {
    slug: 'bedelsiz-sermaye-artirimi',
    terim: 'Bedelsiz sermaye artırımı',
    bagla: ['bedelsiz sermaye artırım\\p{L}*'],
    tanim: [
      'Bedelsiz sermaye artırımı, bir şirketin sermayesini ortaklardan yeni para almadan, kendi iç kaynaklarını sermayeye ekleyerek artırmasıdır. Bu iç kaynaklar geçmiş yıllardan kalan kârlar, yedekler ya da yeniden değerleme fonları olabilir. Ortaklara, mevcut payları oranında ücretsiz yeni pay verilir.',
      'Bedelsiz artırım şirketin toplam değerini değiştirmez; yalnızca pay sayısı artar. Bu yüzden işlem günü hisse fiyatı, artış oranına göre aşağı doğru düzeltilir. Örneğin yüzde 100 bedelsizde pay sayısı iki katına çıkar, fiyat yaklaşık yarıya iner ve yatırımcının elindeki payların toplam değeri değişmez. Bedelli sermaye artırımında ise ortaklar yeni payları para ödeyerek alır ve şirkete yeni kaynak girer.',
    ],
    ilgili: ['hisse-senedi', 'temettu', 'halka-arz'],
  },
  {
    slug: 'piyasa-degeri',
    terim: 'Piyasa değeri',
    bagla: ['piyasa değer\\p{L}*'],
    tanim: [
      'Piyasa değeri, borsada işlem gören bir şirketin toplam pay sayısının güncel hisse fiyatıyla çarpılmasıyla bulunan değerdir. Şirketin borsada ne kadar değer biçildiğini gösterir ve şirketlerin büyüklüğünü karşılaştırmak için kullanılır.',
      'Piyasa değeri hisse fiyatıyla birlikte her işlem gününde değişir. Şirketin defter değerinden, yani bilançodaki öz kaynaklarından farklıdır; çünkü yatırımcıların gelecekteki kâr beklentilerini de yansıtır. Dünyanın en büyük şirketleri arasındaki sıralama genellikle piyasa değerine göre yapılır. Birçok borsa endeksinde şirketlerin ağırlığı da piyasa değerine, çoğunlukla da yalnızca borsada serbestçe dolaşan paylara göre belirlenir.',
    ],
    ilgili: ['hisse-senedi', 'fiyat-kazanc-orani', 'borsa-endeksi'],
  },
  {
    slug: 'fiyat-kazanc-orani',
    terim: 'Fiyat/kazanç oranı (F/K)',
    bagla: ['F/K', 'fiyat/kazanç oran\\p{L}*'],
    tanim: [
      'Fiyat/kazanç oranı (F/K), bir hisse senedinin fiyatının hisse başına kâra bölünmesiyle bulunur. Aynı hesap şirketin piyasa değerinin yıllık net kârına bölünmesiyle de yapılabilir. Oran, yatırımcıların şirketin bir liralık kârı için kaç lira ödemeye razı olduğunu gösterir.',
      'Yüksek F/K, yatırımcıların şirketten güçlü kâr büyümesi beklediğine ya da hissenin pahalı olabileceğine işaret edebilir; düşük F/K ise ucuzluk ya da kârların düşeceği beklentisi anlamına gelebilir. Oran tek başına yorumlanmamalı, aynı sektördeki şirketlerle ve şirketin kendi geçmişiyle karşılaştırılmalıdır. Zarar eden şirketlerde F/K anlamlı bir değer vermez. Enflasyonun yüksek olduğu dönemlerde muhasebe kârları da bozulabildiği için dikkatli yorumlanmalıdır.',
    ],
    ilgili: ['piyasa-degeri', 'bilanco', 'hisse-senedi'],
  },
  {
    slug: 'bilanco',
    terim: 'Bilanço',
    bagla: ['bilanço\\p{L}*'],
    tanim: [
      'Bilanço, bir şirketin belirli bir tarihteki varlıklarını, borçlarını ve öz kaynaklarını gösteren temel mali tablodur. Bir tarafta şirketin sahip olduğu nakit, alacak, stok ve duran varlıklar; diğer tarafta bunların nasıl finanse edildiği, yani borçlar ve ortakların öz kaynakları yer alır. İki tarafın toplamı her zaman eşittir.',
      'Günlük piyasa dilinde bilanço kelimesi, şirketlerin üç aylık ya da yıllık finansal sonuçlarının tamamı için de kullanılır; bu dönemlere bilanço dönemi denir. Bu sonuçların içinde satış gelirlerini, giderleri ve kârı gösteren gelir tablosu da bulunur. Türkiye’de borsada işlem gören şirketler finansal tablolarını Kamuyu Aydınlatma Platformu’nda (KAP) yayımlar.',
    ],
    ilgili: ['fiyat-kazanc-orani', 'piyasa-degeri', 'temettu'],
  },
  {
    slug: 'borsa-endeksi',
    terim: 'Borsa endeksi',
    bagla: ['borsa endeks\\p{L}*', 'BIST 100'],
    tanim: [
      'Borsa endeksi, belirli bir hisse grubunun fiyatlarındaki ortalama değişimi tek bir sayıyla gösteren göstergedir. Piyasanın genel yönünü izlemeyi ve yatırım fonlarının performansını karşılaştırmayı kolaylaştırır.',
      'Borsa İstanbul’un en çok izlenen endeksi BIST 100’dür ve büyük, işlem hacmi yüksek 100 şirketin hisselerinden oluşur. ABD’de S&P 500, Dow Jones Sanayi Ortalaması ve Nasdaq Bileşik endeksleri; Almanya’da DAX, Japonya’da Nikkei 225 öne çıkan endekslerdir. Endekslerin çoğunda şirketlerin ağırlığı piyasa değerine göre belirlenir; bu nedenle büyük şirketlerin fiyat hareketleri endeksi daha fazla etkiler. Endeksin bileşimi belirli aralıklarla gözden geçirilir.',
    ],
    ilgili: ['hisse-senedi', 'borsa-yatirim-fonu', 'piyasa-degeri'],
  },
  {
    slug: 'yatirim-fonu',
    terim: 'Yatırım fonu',
    bagla: ['yatırım fon\\p{L}*'],
    tanim: [
      'Yatırım fonu, birçok yatırımcının parasının bir havuzda toplanıp profesyonel yöneticiler tarafından hisse senedi, tahvil, para piyasası araçları ya da altın gibi varlıklara yatırıldığı bir yatırım aracıdır. Yatırımcı fonun payını alır; payın değeri fondaki varlıkların değerine göre her gün yeniden hesaplanır.',
      'Türkiye’de yatırım fonlarını portföy yönetim şirketleri kurar ve yönetir; fonlar Sermaye Piyasası Kurulu’nun denetimine tabidir. Fonun ne tür varlıklara yatırım yapacağı izahnamesinde yazılıdır. Yatırım fonları küçük tutarlarla çeşitlendirilmiş bir portföye erişim sağlar; karşılığında yönetim ücreti alınır. Fon getirileri geçmişte iyi olsa bile gelecekte aynı olacağı anlamına gelmez.',
    ],
    ilgili: ['borsa-yatirim-fonu', 'hisse-senedi', 'stopaj'],
  },
  {
    slug: 'borsa-yatirim-fonu',
    terim: 'Borsa yatırım fonu (BYF / ETF)',
    bagla: ['borsa yatırım fon\\p{L}*', 'ETF', 'BYF'],
    harf: false,
    tanim: [
      'Borsa yatırım fonu (BYF), payları borsada hisse senedi gibi gün içinde alınıp satılabilen yatırım fonudur. İngilizcedeki adı exchange-traded fund olduğu için kısaca ETF olarak da bilinir. Çoğu borsa yatırım fonu belirli bir endeksi, emtiayı ya da varlık grubunu izler.',
      'Örneğin bir BIST 100 fonu endeksteki hisseleri aynı ağırlıklarla tutarak endeksin getirisine yakın bir getiri sağlamayı amaçlar; altın fonları ise altın fiyatını izler. Borsa yatırım fonlarının yönetim ücretleri genellikle aktif yönetilen fonlardan düşüktür. ABD’de SEC’in onayladığı spot bitcoin fonları gibi yeni ürünler, kripto varlıkların geleneksel yatırımcılar tarafından alınıp satılmasını kolaylaştırmıştır.',
    ],
    ilgili: ['yatirim-fonu', 'borsa-endeksi', 'kripto-para'],
  },
  {
    slug: 'vadeli-islem',
    terim: 'Vadeli işlem',
    bagla: ['vadeli işlem\\p{L}*', 'VİOP'],
    tanim: [
      'Vadeli işlem sözleşmesi, bir varlığın ileri bir tarihte, bugünden belirlenen fiyattan alınıp satılmasını öngören standart bir sözleşmedir. Dayanak varlık bir hisse senedi, endeks, döviz, faiz, altın ya da petrol gibi bir emtia olabilir.',
      'Vadeli işlemler hem fiyat riskinden korunmak hem de fiyat hareketlerinden kazanç sağlamak amacıyla kullanılır. Sözleşmenin tamamı ödenmez, yalnızca teminat yatırılır; bu nedenle işlemler kaldıraçlıdır ve küçük fiyat hareketleri büyük kâr ya da zarara yol açabilir. Türkiye’de vadeli işlemler Borsa İstanbul’un Vadeli İşlem ve Opsiyon Piyasası’nda (VİOP) yapılır. Petrol ve altın fiyatları için haberlerde verilen rakamlar çoğunlukla vadeli sözleşme fiyatlarıdır.',
    ],
    ilgili: ['opsiyon', 'kaldirac', 'brent-petrol'],
  },
  {
    slug: 'opsiyon',
    terim: 'Opsiyon',
    bagla: ['opsiyon\\p{L}*'],
    tanim: [
      'Opsiyon, sahibine bir varlığı belirli bir tarihte ya da tarihe kadar, önceden belirlenen fiyattan alma veya satma hakkı veren, ancak yükümlülük getirmeyen bir türev sözleşmedir. Alma hakkı veren opsiyona alım (call), satma hakkı verene satım (put) opsiyonu denir.',
      'Opsiyonu alan taraf bu hak için prim öder. Fiyat beklediği yönde gitmezse hakkını kullanmaz ve kaybı ödediği primle sınırlı kalır. Opsiyonu satan taraf ise primi alır, ama alıcı hakkını kullanırsa yükümlülüğünü yerine getirmek zorundadır ve kaybı çok daha büyük olabilir. Opsiyonlar riskten korunma için kullanıldığı gibi, opsiyon fiyatlarından piyasanın beklediği oynaklık da hesaplanır.',
    ],
    ilgili: ['vadeli-islem', 'volatilite', 'kaldirac'],
  },
  {
    slug: 'kaldirac',
    terim: 'Kaldıraç',
    bagla: ['kaldıraç\\p{L}*'],
    tanim: [
      'Kaldıraç, bir yatırımın kendi sermayesinden daha büyük bir pozisyonla, yani borç ya da teminat kullanarak yapılmasıdır. Örneğin 10 kat kaldıraçla 1.000 liralık teminatla 10.000 liralık pozisyon açılabilir.',
      'Kaldıraç kazancı da kaybı da aynı oranda büyütür. Fiyat beklenen yönde yüzde 1 hareket ettiğinde 10 kat kaldıraçlı yatırımcı sermayesinin yüzde 10’u kadar kazanır; ters yönde aynı hareket sermayesinin yüzde 10’unu kaybettirir. Kayıplar teminatı belirli bir seviyenin altına düşürürse pozisyon otomatik olarak kapatılabilir. Vadeli işlemler, kaldıraçlı alım satım işlemleri ve bazı kripto ürünleri yüksek kaldıraç içerir. Şirketler için kaldıraç, borcun öz kaynağa oranını anlatır.',
    ],
    ilgili: ['vadeli-islem', 'aciga-satis', 'volatilite'],
  },
  {
    slug: 'aciga-satis',
    terim: 'Açığa satış',
    bagla: ['açığa satış\\p{L}*'],
    tanim: [
      'Açığa satış, yatırımcının sahip olmadığı bir hisseyi ödünç alarak satması ve ileride daha düşük fiyattan geri alıp ödünç verene iade etmeyi planlamasıdır. Fiyatın düşeceği beklentisiyle yapılır; fiyat düşerse aradaki fark kazanç olur.',
      'Fiyat beklenenin tersine yükselirse yatırımcı hisseyi daha pahalıya geri almak zorunda kalır. Bir hissenin fiyatı teorik olarak sınırsız yükselebileceği için açığa satışın zararı da sınırsız olabilir. Açığa satış, piyasalarda fiyatların daha verimli oluşmasına katkı sağladığı gerekçesiyle serbesttir, ancak düzenleyiciler sert düşüş dönemlerinde bu işlemleri geçici olarak kısıtlayabilir. Türkiye’de açığa satış kuralları Sermaye Piyasası Kurulu ve Borsa İstanbul düzenlemeleriyle belirlenir.',
    ],
    ilgili: ['kaldirac', 'hisse-senedi', 'boga-ve-ayi-piyasasi'],
  },
  {
    slug: 'boga-ve-ayi-piyasasi',
    terim: 'Boğa ve ayı piyasası',
    bagla: ['boğa piyasa\\p{L}*', 'ayı piyasa\\p{L}*'],
    tanim: [
      'Boğa piyasası, fiyatların uzun bir süre boyunca genel olarak yükseldiği ve yatırımcıların iyimser olduğu dönemi anlatır. Ayı piyasası ise fiyatların uzun süre düştüğü, karamsarlığın hâkim olduğu dönemdir. Adların boğanın boynuzlarını yukarı, ayının pençesini aşağı savurmasından geldiği söylenir.',
      'Piyasa dilinde, bir endeksin zirvesinden yüzde 20 veya daha fazla düşmesi ayı piyasasına girildiği şeklinde yorumlanır; dibinden yüzde 20 yükselmesi de boğa piyasasının başlangıcı sayılır. Yüzde 10 civarındaki düşüşler ise genellikle düzeltme olarak adlandırılır. Bu eşikler resmi tanım değil, yaygın kullanılan kabullerdir. Uzun bir boğa piyasası içinde de kısa süreli sert düşüşler yaşanabilir.',
    ],
    ilgili: ['borsa-endeksi', 'volatilite', 'aciga-satis'],
  },
  {
    slug: 'likidite',
    terim: 'Likidite',
    bagla: ['likidite\\p{L}*'],
    tanim: [
      'Likidite, bir varlığın değerinden fazla kaybetmeden hızla nakde çevrilebilmesidir. Nakit en likit varlıktır; büyük şirketlerin hisseleri ve devlet tahvilleri genellikle likittir, konut ya da arsa ise satışı zaman alabildiği için daha az likittir.',
      'Kavram farklı bağlamlarda kullanılır. Piyasa likiditesi, bir varlıkta fiyatı fazla etkilemeden büyük alım satım yapılabilmesini anlatır. Bankacılıkta likidite, bankaların kısa vadeli yükümlülüklerini karşılayacak nakde sahip olmasıdır. Haberlerdeki piyasadaki likidite ifadesi ise genellikle merkez bankalarının sisteme sağladığı para miktarına işaret eder. Likiditenin bollaştığı dönemlerde risk iştahı ve varlık fiyatları artma eğilimindedir.',
    ],
    ilgili: ['repo', 'niceliksel-genisleme', 'zorunlu-karsilik'],
  },
  {
    slug: 'volatilite',
    terim: 'Volatilite (oynaklık)',
    bagla: ['volatilite\\p{L}*', 'oynaklı\\p{L}*', 'oynaklık'],
    tanim: [
      'Volatilite, Türkçesiyle oynaklık, bir varlığın fiyatının belirli bir dönemde ne kadar ve ne sıklıkla dalgalandığını gösterir. Fiyatı kısa sürede sert hareket eden varlıkların oynaklığı yüksek, istikrarlı seyredenlerin düşüktür.',
      'Geçmiş oynaklık, fiyat değişimlerinin standart sapmasıyla ölçülür. Opsiyon fiyatlarından hesaplanan örtük oynaklık ise piyasanın gelecekte beklediği dalgalanmayı yansıtır. ABD’deki S&P 500 endeksi için hesaplanan VIX endeksi, bu beklentinin en bilinen göstergesidir ve piyasada belirsizlik arttığında yükseldiği için korku endeksi olarak da anılır. Yüksek oynaklık, daha yüksek getiri fırsatıyla birlikte daha yüksek kayıp riski anlamına gelir.',
    ],
    ilgili: ['opsiyon', 'kaldirac', 'boga-ve-ayi-piyasasi'],
  },
  {
    slug: 'kripto-para',
    terim: 'Kripto para',
    bagla: ['kripto para\\p{L}*', 'kripto varlık\\p{L}*'],
    tanim: [
      'Kripto para, kriptografi ile güvenliği sağlanan ve genellikle blokzincir adı verilen dağıtık kayıt sistemleri üzerinde çalışan dijital varlıktır. İlk ve en büyük örneği 2009’da ortaya çıkan Bitcoin’dir; Ethereum gibi binlerce farklı kripto para bulunur.',
      'Kripto paraların çoğu bir merkez bankası ya da devlet tarafından çıkarılmaz ve değerleri arz ve talebe göre piyasada belirlenir. Fiyatları geleneksel varlıklara göre çok oynaktır; kısa sürede büyük kazanç da kayıp da yaşanabilir. Türkiye’de kripto varlıklarla ödeme yapılması TCMB düzenlemesiyle yasaktır; 2024’teki yasal düzenlemeyle kripto varlık hizmet sağlayıcıları Sermaye Piyasası Kurulu’nun izin ve denetimine bağlandı.',
    ],
    ilgili: ['blokzincir', 'sabit-kripto-para', 'volatilite'],
  },
  {
    slug: 'blokzincir',
    terim: 'Blokzincir',
    bagla: ['blokzincir\\p{L}*', 'blockchain'],
    tanim: [
      'Blokzincir, İngilizcede blockchain, işlemlerin bloklar hâlinde kaydedildiği ve her bloğun bir öncekine kriptografik olarak bağlandığı dağıtık bir kayıt defteridir. Kayıtların kopyası ağdaki çok sayıda bilgisayarda tutulduğu için tek bir merkezin kontrolüne bağlı değildir.',
      'Bir blok zincire eklendikten sonra içeriğini sonradan değiştirmek, sonraki tüm blokların da yeniden hesaplanmasını gerektirdiği için son derece zordur. Bu özellik, aracı bir kuruma gerek kalmadan kimin neye sahip olduğunun güvenilir biçimde kaydedilmesini sağlar. Bitcoin ve Ethereum gibi kripto paralar blokzincir üzerinde çalışır; teknoloji ayrıca tedarik zinciri takibi ve varlıkların dijital temsili gibi alanlarda da denenmektedir.',
    ],
    ilgili: ['kripto-para', 'sabit-kripto-para'],
  },
  {
    slug: 'sabit-kripto-para',
    terim: 'Sabit kripto para (stablecoin)',
    bagla: ['sabit kripto para\\p{L}*', 'stablecoin\\p{L}*'],
    tanim: [
      'Sabit kripto para, İngilizcede stablecoin, değeri genellikle ABD doları gibi bir para birimine ya da altın gibi bir varlığa sabitlenmeye çalışılan kripto paradır. Amaç, kripto paraların yüksek fiyat oynaklığı olmadan blokzincir üzerinde hızlı transfer imkânı sunmaktır.',
      'En yaygın sabit kripto paralar USDT ve USDC gibi dolara endeksli olanlardır. İhraççılar, dolaşımdaki her birimin karşılığını nakit, kısa vadeli devlet tahvili gibi rezervlerle tuttuklarını açıklar; bu rezervlerin yeterliliği ve şeffaflığı önemli bir risk konusudur. Rezervle desteklenmeyen, değerini algoritmalarla korumaya çalışan bazı sabit kripto paralar geçmişte sabitliğini kaybetmiştir. Birçok ülke bu varlıklar için ayrı yasal düzenlemeler hazırlamaktadır.',
    ],
    ilgili: ['kripto-para', 'blokzincir'],
  },
  {
    slug: 'ons-altin',
    terim: 'Ons altın',
    bagla: ['ons altın\\p{L}*', 'altının onsu\\p{L}*'],
    tanim: [
      'Ons altın, uluslararası piyasalarda altın fiyatının ifade edildiği birimdir. Değerli madenlerde kullanılan ons, troy ons olarak adlandırılır ve yaklaşık 31,1 grama eşittir. Altın fiyatı dünyada genellikle bir troy ons için ABD doları cinsinden verilir.',
      'Türkiye’de çok izlenen gram altın fiyatı, ons altın fiyatının dolar/TL kuru ile çarpılıp bir onsun gram karşılığına bölünmesiyle yaklaşık olarak hesaplanabilir. Bu nedenle gram altın hem uluslararası altın fiyatından hem de kurdan etkilenir; kuyumcu fiyatları ayrıca işçilik ve satış farkı içerir. Altın, belirsizlik dönemlerinde güvenli liman olarak görülür ve faiz getirmediği için faizlerin yükseldiği dönemlerde baskı altında kalabilir.',
    ],
    ilgili: ['doviz-kuru', 'rezerv', 'volatilite'],
  },
  {
    slug: 'brent-petrol',
    terim: 'Brent petrol',
    bagla: ['Brent'],
    harf: true,
    tanim: [
      'Brent, Kuzey Denizi’nden çıkarılan ham petrolü esas alan ve dünyada en yaygın kullanılan petrol fiyatı göstergesidir. Avrupa, Afrika ve Orta Doğu’daki birçok petrol satışı Brent fiyatına göre belirlenir. Diğer önemli gösterge ise ABD’de üretilen WTI (West Texas Intermediate) petrolüdür.',
      'Petrol fiyatları varil başına ABD doları olarak verilir; bir varil yaklaşık 159 litredir. Haberlerde yer alan Brent fiyatları çoğunlukla Londra’daki ICE borsasında işlem gören vadeli sözleşmelerin fiyatıdır. Fiyatı; üretici ülkelerin arz kararları, stok verileri, küresel büyüme beklentisi ve üretim bölgelerindeki jeopolitik gelişmeler etkiler. Enerji ithal eden Türkiye için petrol fiyatları enflasyonu ve cari dengeyi doğrudan etkiler.',
    ],
    ilgili: ['vadeli-islem', 'cari-acik', 'enflasyon'],
  },
];

export const terimUrl = (slug) => `/sozluk/${slug}/`;
