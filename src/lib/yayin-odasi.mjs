// Yayın odası sayfasının verisi: yalnız gerçek kayıtlardan. sayac: botun günlük sayıları
// (src/data/yayin-odasi/gunluk-sayi.json, scripts/haberler/gunluk-sayi.mjs yazar); yazilar: yayımlanmış yazıların ön bilgisi.
// Sayfa hiçbir sayıyı tahmin etmez: kayıt yoksa alan boş kalır ya da hiç gösterilmez.

// Sayaç kodu → okura giden metin. Aynı metne inen kodlar tek satırda toplanır.
const STANDART_METIN = {
  'yatirim-tavsiyesi': 'Yatırım tavsiyesi riski',
  'kaynak-benzerligi': 'Kaynağa fazla benziyor',
  suc: 'Suç isnadı riski',
  'kapi-kisi-suc': 'Suç isnadı riski',
  'kapi-iftira': 'Suç isnadı riski',
  teror: 'Terör haberi kuralı',
  'kapi-teror': 'Terör haberi kuralı',
  'ozel-haber': 'Başka yayının özel haberi',
  'grup-genelleme': 'Gruba genelleme',
  'kapi-grup-genelleme': 'Gruba genelleme',
  intihar: 'İntihar haberi kuralı',
  'kapi-intihar': 'İntihar haberi kuralı',
  'turkiye-devlet': 'Devlet ve siyaset kuralı',
  'kapi-turkiye-devlet': 'Devlet ve siyaset kuralı',
  'savas-dili': 'Savaş dili kuralı',
  'kapi-savas-dili': 'Savaş dili kuralı',
  'medya-adi': 'Başka yayının adı geçiyor',
  'kapi-medya-adi': 'Başka yayının adı geçiyor',
  'kapi-cocuk': 'Çocuk haberi kuralı',
  'kapi-yatirim-tavsiyesi': 'Yatırım tavsiyesi riski',
};
const GENEL_STANDART = 'Yayın kurallarına takıldı';
const KOD_METIN = {
  'kaynakta-yok': 'Kaynakta artık yok',
  bayat: 'Haber bayatlamıştı',
  'bilinen-olay': 'Aynı olay daha önce yayımlanmıştı',
  tekrar: 'Aynı olay daha önce yayımlanmıştı',
  yazilamadi: 'Yazılamadı',
  'kisa-es-yok': 'Kısa kaldı, birleştirilecek eş yok',
  'kontrol-masasi': 'Yayın kurulu kontrolünden geçmedi',
  standart: GENEL_STANDART,
  diger: 'Başka bir sebep',
};

/** Sayaç kodunun okura giden metni; bilinmeyen kod genel metne iner (kod asla ekrana yazılmaz). */
export function elemeMetni(kod) {
  if (kod.startsWith('standart:')) return STANDART_METIN[kod.slice(9)] ?? GENEL_STANDART;
  return KOD_METIN[kod] ?? KOD_METIN.diger;
}

/** Elenen {kod: adet} → metne göre toplanmış, çoktan aza sıralı satırlar. */
export function elenenSatirlari(elenen) {
  const toplam = new Map();
  for (const [kod, adet] of Object.entries(elenen ?? {})) {
    const n = Number(adet);
    if (!Number.isFinite(n) || n <= 0) continue;
    const metin = elemeMetni(kod);
    const o = toplam.get(metin) ?? { kod, metin, adet: 0 };
    o.adet += n;
    toplam.set(metin, o);
  }
  return [...toplam.values()].sort((a, b) => b.adet - a.adet || a.metin.localeCompare(b.metin, 'tr'));
}

export const istanbulGunu = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(t);

const SAYI_ALANLARI = ['tur', 'gorulen', 'degerlendirilen', 'yazilan', 'yayimlanan', 'bulten', 'bekleyen'];
// Sayaç henüz kayıt tutmuyorsa gösterilecek sabit tarih (sayacın ilk günü, kayıt gelince veriden hesaplanır).
export const SAYAC_BASLANGICI = '2026-11-03';

function topla(gunler) {
  const t = Object.fromEntries(SAYI_ALANLARI.map((k) => [k, 0]));
  const elenen = {};
  for (const g of gunler) {
    for (const k of SAYI_ALANLARI) t[k] += Number(g?.[k] ?? 0) || 0;
    for (const [k, n] of Object.entries(g?.elenen ?? {})) elenen[k] = (elenen[k] ?? 0) + (Number(n) || 0);
  }
  return { sayilar: t, elenen };
}

// Bot haberi: zincir (yazi-isleri), elle yazı (yazar alanı) ve bülten değil.
const botHaberi = (y) => (y.uretim === undefined || y.uretim === 'bot') && !y.author && (y.tur ?? 'haber') === 'haber' && (!y.yaziTuru || y.yaziTuru === 'haber');
const haberUrl = (slug) => `/haber/${slug}/`;

/**
 * @param {{ sayac?: { gunler?: Record<string, object> }, yazilar?: Array<{ slug: string, title: string, date: Date, draft?: boolean,
 *   tur?: string, uretim?: string, yaziTuru?: string, author?: string }>, simdi?: Date }} p
 */
export function yayinOdasiVerisi({ sayac, yazilar = [], simdi = new Date() } = {}) {
  const bugun = istanbulGunu(simdi);
  const kayitli = Object.keys(sayac?.gunler ?? {}).sort();
  const gunler = kayitli.filter((g) => g < bugun);
  const son7 = gunler.slice(-7);
  const dunGunu = gunler.at(-1);
  const ilkGun = kayitli[0] ?? SAYAC_BASLANGICI;

  const dun = dunGunu ? { tarih: dunGunu, ...topla([sayac.gunler[dunGunu]]).sayilar } : null;
  const haftaToplam = son7.length ? topla(son7.map((g) => sayac.gunler[g])) : null;
  const hafta = haftaToplam ? { bas: son7[0], son: son7.at(-1), gun: son7.length, ...haftaToplam.sayilar } : null;

  const yayinda = yazilar.filter((y) => !y.draft && y.date <= simdi).sort((a, b) => b.date - a.date);
  const uzun = yayinda.find((y) => y.uretim === 'yazi-isleri');
  return {
    dun,
    hafta,
    elenenler: haftaToplam ? elenenSatirlari(haftaToplam.elenen).map(({ metin, adet }) => ({ metin, adet })) : [],
    sonHaberler: yayinda.filter(botHaberi).slice(0, 8).map((y) => ({ baslik: y.title, url: haberUrl(y.slug) })),
    sonUzunYazi: uzun ? { baslik: uzun.title, url: haberUrl(uzun.slug), zincir: null } : null,
    // Dünün (ya da son yedi günün) kaydı yokken gösterilen nötr satır; tarih sayacın ilk gününden.
    not: dun ? null : { baslangic: ilkGun },
  };
}
