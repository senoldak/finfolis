// Resmi kurumların (merkez bankaları, uluslararası kuruluşlar) RSS/Atom beslemeleri. Bunlar gizlilik kuralı dışındadır:
// adları kaynak listesinde görünür, haber kimliği "<ad>:<adres>" olur. Dosya bilerek import içermez; olaylar.mjs resmi
// kaynağı bu adlardan tanır (resmiMi), şifreli liste yüklenmeden.
// Araştırma ve analiz akışları (çalışma tebliği, blog) seyrek yayın yapar; önem 40 ile girer (0–100), Gemini puanıyla terfi eder.
// tur: 'arastirma' haberin içerik türünü belirler (bkz. ../icerik-turu.mjs); yoksa resmi açıklama sayılır.
export const RESMI_BESLEMELER = [
  { ad: 'Bank of England', rss: 'https://www.bankofengland.co.uk/rss/news', bolge: 'avrupa', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true },
  { ad: 'Dallas Fed', rss: 'https://www.dallasfed.org/rss/dallasfed.xml', bolge: 'abd', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true },
  { ad: 'New York Fed Liberty Street Economics', rss: 'https://libertystreeteconomics.newyorkfed.org/feed/', bolge: 'abd', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true, tur: 'arastirma' },
  { ad: 'San Francisco Fed', rss: 'https://www.frbsf.org/feed/', bolge: 'abd', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true },
  { ad: 'Atlanta Fed Macroblog', rss: 'https://www.atlantafed.org/rss/macroblog', bolge: 'abd', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true, tur: 'arastirma' },
  { ad: 'Fed FEDS Working Papers', rss: 'https://www.federalreserve.gov/feeds/feds.xml', bolge: 'abd', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true, tur: 'arastirma' },
  { ad: 'ECB Working Papers', rss: 'https://www.ecb.europa.eu/rss/wppub.html', bolge: 'avrupa', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true, tur: 'arastirma' },
  { ad: 'BIS', rss: 'https://www.bis.org/rss.xml', bolge: 'kuresel', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true },
  { ad: 'BIS Working Papers', rss: 'https://www.bis.org/doclist/wppubls.rss', bolge: 'kuresel', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true, tur: 'arastirma' },
  // Bank of Canada'nın genel beslemesi (/feed/) etkinlik takvimidir (ileri tarihli); basın bülteni ve yayın akışları
  // kullanılır. Yayınlarda müzakere özeti gibi resmi metinler de olduğundan tür araştırma değil. Tebliğ akışları boş.
  { ad: 'Bank of Canada', rss: 'https://www.bankofcanada.ca/content_type/press-releases/feed/', bolge: 'kuresel', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true },
  { ad: 'Bank of Canada Publications', rss: 'https://www.bankofcanada.ca/content_type/publications/feed/', bolge: 'kuresel', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true },
  { ad: 'OECD Ecoscope', rss: 'https://oecdecoscope.blog/feed/', bolge: 'kuresel', ucretli: false, kategori: 'ekonomi', onem: 40, resmi: true, tur: 'arastirma' },
];
