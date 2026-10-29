// Veri güncelliği: her veri setinin son gözleminin hangi döneme ait olduğu ve o dönemin bitişinden bugüne kaç gün geçtiği.
// Yaş, sıklığa göre bir yayın gecikmesi eşiğiyle karşılaştırılır: eşiği aşan "gecikmiş", üç katını aşan "durmuş".
// Eşikler Türkiye'deki yayın takvimine göre: aylık TÜİK/TCMB verileri dönem sonundan ~40 gün sonra çıkar, bir sonraki
// yayından hemen önce yaş ~70 gündür. Astro'ya bağımlı değildir; sayfa da betik de aynı hesabı kullanır.

export const ESIKLER = { gunluk: 10, haftalik: 21, aylik: 75, ceyreklik: 150, olay: 75 };
export const SIKLIK_ADI = { gunluk: 'günlük', haftalik: 'haftalık', aylik: 'aylık', ceyreklik: 'çeyreklik', olay: 'karar' };

const GUN = 86_400_000;
const ayinSonu = (yil, ay) => new Date(Date.UTC(yil, ay, 0)); // ay 1–12; Date.UTC(yil, ay, 0) = o ayın son günü

// Gözlem satırından dönem sonu. Desteklenen biçimler: {tarih:'2026-10-16'}, {tarih:'22-10-2026'}, {tarih:'2026-09'},
// {tarih:'2026-9'}, {donem:'2026-08'}, {yil, ay}, {yil, ceyrek}.
export function donemSonu(s) {
  if (!s || typeof s !== 'object') return null;
  if (Number.isInteger(s.yil) && Number.isInteger(s.ceyrek)) return ayinSonu(s.yil, s.ceyrek * 3);
  if (Number.isInteger(s.yil) && Number.isInteger(s.ay)) return ayinSonu(s.yil, s.ay);
  return metindenTarih(s.tarih ?? s.donem);
}

export function metindenTarih(t) {
  if (typeof t !== 'string') return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = t.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = t.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return ayinSonu(+m[1], +m[2]);
  return null;
}

// Sıklık satırların biçiminden çıkar: yıl+ay aylık, yıl+çeyrek çeyreklik; tam tarihlerde son iki gözlemin arası.
export function siklikBul(satirlar) {
  const son = satirlar?.at(-1);
  if (!son) return null;
  if (Number.isInteger(son.ceyrek)) return 'ceyreklik';
  if (Number.isInteger(son.ay) || /^\d{4}-\d{1,2}$/.test(son.tarih ?? son.donem ?? '')) return 'aylik';
  const a = donemSonu(satirlar.at(-2));
  const b = donemSonu(son);
  if (!a || !b) return null;
  const ara = (b - a) / GUN;
  if (ara <= 4) return 'gunluk';
  if (ara <= 10) return 'haftalik';
  if (ara <= 45) return 'aylik';
  return 'ceyreklik';
}

export function durumHesapla({ son, siklik, esik }, bugun = new Date()) {
  if (!son || !siklik) return { yas: null, esik: null, durum: 'bilinmiyor' };
  const e = esik ?? ESIKLER[siklik];
  const yas = Math.max(0, Math.floor((bugun - son) / GUN));
  const durum = yas > 3 * e ? 'durmus' : yas > e ? 'gecikmis' : 'guncel';
  return { yas, esik: e, durum };
}

// RESMI bölümleri ve ayrı veri dosyaları için son gözlemi bulan tanımlar. RESMI'de buraya yazılmamış yeni bir bölüm
// açılırsa da listeye girer (adı kaynak.ad, sıklığı satırlardan); sayfa bağlantısı yoksa veri ana sayfasına gider.
const RESMI_SAYFA = {
  kur: '/veri/doviz-kurlari/',
  faiz: '/veri/politika-faizi/',
  enflasyon: '/veri/enflasyon/',
  konut: '/veri/konut-fiyat-endeksi/',
  issizlik: '/veri/issizlik-orani/',
  rezerv: '/veri/net-doviz-pozisyonu/',
  piyasaFaizleri: '/veri/piyasa-faizleri/',
  mevduat: '/veri/doviz-mevduatlari/',
  beklenti: '/veri/enflasyon-beklentisi/',
  kira: '/veri/kira-endeksi/',
  kart: '/veri/kartli-harcamalar/',
  guven: '/veri/tuketici-guveni/',
  rek: '/veri/reel-efektif-kur/',
  brutRezerv: '/veri/tcmb-rezervleri/',
  kapasite: '/veri/kapasite-kullanimi/',
  kurHaftalik: '/veri/kur-degisim-hizi/',
  makas: '/veri/kredi-mevduat-makasi/',
  birimFiyat: '/veri/kira-carpani/',
  tufeArindirilmis: '/veri/enflasyon-hizi/',
  portfoyHaftalik: '/veri/yabanci-portfoy-akimlari/',
  portfoyAylik: '/veri/yabanci-portfoy-akimlari/',
  cari: '/veri/cari-denge/',
  disBorc: '/veri/dis-borc/',
  disTicaret: '/veri/dis-ticaret/',
  sanayi: '/veri/sanayi-uretimi/',
  buyume: '/veri/buyume/',
  konutSatis: '/veri/konut-satislari/',
  ufe: '/veri/uretici-fiyatlari/',
  insaatIzin: '/veri/insaat-izinleri/',
  kesimBeklenti: '/veri/beklenti-anketleri/',
  butce: '/veri/butce-dengesi/',
  kredi: '/veri/kredi-hacmi/',
};

// Satırsız RESMI bölümleri: son gözlem tek bir tarih alanında.
const RESMI_TEK = {
  kur: { alan: 'tarih', siklik: 'gunluk' },
  rezerv: { alan: 'tarih', siklik: 'gunluk' },
  faiz: { alan: 'gecerlilik', siklik: 'olay', gerekce: 'Faiz yalnız PPK toplantılarında değişir; eşik iki toplantı arası.' },
};

// Ayrı dosyalar: anahtar → { ad, sayfa, son(veri) → satır, siklik?, esik?, gerekce? }
export const DOSYALAR = {
  'abd-tahvilleri': {
    ad: 'ABD Hazine tahvili portföyü (TIC)',
    sayfa: '/veri/abd-tahvilleri/',
    son: (d) => d.sonNokta,
    siklik: 'aylik',
    esik: 110,
    gerekce: 'ABD Hazinesi TIC verisini dönem sonundan yaklaşık 75 gün sonra yayımlar.',
  },
  'abd-tahvil': {
    ad: 'ABD tahvil akımları (TIC)',
    sayfa: '/veri/abd-tahvil-akimlari/',
    son: (d) => d.seri?.at(-1),
    siklik: 'aylik',
    esik: 110,
    gerekce: 'ABD Hazinesi TIC verisini dönem sonundan yaklaşık 75 gün sonra yayımlar.',
  },
  'bist-tufe': { ad: 'BIST 100 / TÜFE', sayfa: '/veri/bist-100-tufe/', son: (d) => ({ tarih: d.guncelleme }), siklik: 'gunluk' },
  'dunya-faizleri': {
    ad: 'Dünya politika faizleri (BIS)',
    sayfa: '/veri/dunya-politika-faizleri/',
    son: (d) => ({ tarih: d.referansTarih }),
    siklik: 'gunluk',
  },
  'reel-bist': { ad: 'Reel BIST 30', sayfa: '/veri/reel-bist-30/', son: (d) => d.noktalar?.at(-1), siklik: 'aylik' },
  'tcmb-altin-kazanci': { ad: 'TCMB altın kazancı', sayfa: '/veri/altin-kazanci/', son: (d) => d.seri?.at(-1), siklik: 'gunluk' },
  'tcmb-swap-orani': { ad: 'Rezervlerde swap payı', sayfa: '/veri/swap-payi/', son: (d) => d.seri?.at(-1), siklik: 'aylik' },
  'tcmb-net-pozisyon-degisimi': {
    ad: 'Net döviz pozisyonu değişimi',
    sayfa: '/veri/net-doviz-pozisyonu/',
    son: (d) => d.seri?.at(-1),
    siklik: 'gunluk',
  },
};

const satirliMi = (b) => Array.isArray(b?.satirlar) && b.satirlar.length > 0;

// Bütün veri setlerinin güncellik satırları; en kötü durum önce, sonra eşiğe oranla en yaşlı.
export function guncellikListesi({ resmi = {}, dosyalar = {} }, bugun = new Date()) {
  const liste = [];
  for (const [id, b] of Object.entries(resmi)) {
    if (!b || typeof b !== 'object') continue;
    const tek = RESMI_TEK[id];
    let son = null;
    let siklik = null;
    if (tek) {
      son = metindenTarih(b[tek.alan]);
      siklik = tek.siklik;
    } else if (satirliMi(b)) {
      son = donemSonu(b.satirlar.at(-1));
      siklik = siklikBul(b.satirlar);
    } else continue;
    liste.push({
      id,
      ad: b.kaynak?.ad ?? id,
      sayfa: RESMI_SAYFA[id] ?? '/veri/',
      son,
      siklik,
      alinma: b.alinma ?? null,
      gerekce: tek?.gerekce ?? null,
      ozelEsik: false,
      ...durumHesapla({ son, siklik }, bugun),
    });
  }
  for (const [id, tanim] of Object.entries(DOSYALAR)) {
    const d = dosyalar[id];
    if (!d) continue;
    const satir = tanim.son(d);
    const siklik = tanim.siklik ?? siklikBul([satir]) ?? 'gunluk';
    let son = donemSonu(satir);
    // Aylık seride ayın ilk günüyle yazılmış dönem ('2026-08-01') o ayın tamamıdır.
    if (son && siklik === 'aylik' && son.getUTCDate() === 1) son = ayinSonu(son.getUTCFullYear(), son.getUTCMonth() + 1);
    liste.push({
      id,
      ad: tanim.ad,
      sayfa: tanim.sayfa,
      son,
      siklik,
      alinma: d.alinma ?? d.guncelleme ?? d.guncellenme ?? null,
      gerekce: tanim.gerekce ?? null,
      ozelEsik: tanim.esik != null,
      ...durumHesapla({ son, siklik, esik: tanim.esik }, bugun),
    });
  }
  const sira = { durmus: 0, gecikmis: 1, bilinmiyor: 2, guncel: 3 };
  return liste.sort((a, b) => sira[a.durum] - sira[b.durum] || (b.yas ?? 0) / (b.esik ?? 1) - (a.yas ?? 0) / (a.esik ?? 1));
}
