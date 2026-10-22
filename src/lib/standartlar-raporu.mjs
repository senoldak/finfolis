// Standartlar Raporu hesapları (saf işlevler; sayfa: src/pages/standartlar-raporu.astro).
// Şikâyet kaydı biçimi (src/data/sikayetler.json, her karara bağlanan şikâyet için tek satır; kimlik ve metin YAZILMAZ):
//   { "alindi": "YYYY-MM-DD", "karar": "YYYY-MM-DD", "sonuc": "yerinde" | "kismen" | "yerinde-degil" }
// Çeyrek defteri (src/data/standartlar-raporu/<YYYY>-c<N>.json) alanları:
//   { ceyrek, bas, son, defterBaslangici, yazildi, elendi, kirmizi, sari, kurallar: { kirmizi: {kod:n}, sari: {kod:n} },
//     geminiCagri, kuralDegisiklikleri: ["YYYY-MM-DD"] | null, uretim }
import { duzeltmeKayitlari } from './duzeltmeler.mjs';
import { sahipYazisiMi, zincirYazisiMi } from './yapay-zeka-notu.mjs';

/** İstanbul takvim günü (YYYY-AA-GG). */
export const istanbulGunu = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

/** Tarih (Date ya da "YYYY-AA-GG" metni) çeyrek aralığında mı? Uçlar dahil, İstanbul günü. */
export function araliktaMi(t, bas, son) {
  const g = typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : istanbulGunu(t);
  return g >= bas && g <= son;
}

export const KURAL_ADLARI = {
  suc: 'suç',
  cocuk: 'çocuk',
  intihar: 'intihar',
  teror: 'terör',
  'savas-dili': 'savaş tarafı dili',
  'grup-genelleme': 'grup genellemesi',
  'turkiye-devlet': 'Türkiye devlet büyükleri',
  'yatirim-tavsiyesi': 'yatırım tavsiyesi',
  'ozel-haber': 'tek yayının özel haberi',
  'kaynak-benzerligi': 'kaynağa fazla benzerlik',
  'medya-adi': 'medya adı',
  'olum-kaza': 'ölüm ve kaza',
  'turkiye-resmi': 'Türkiye resmî kurumları',
  'savas-konu': 'savaş',
  secim: 'seçim',
  'grup-konu': 'grup konuları',
  'kurum-degerlendirme': 'kurum değerlendirmesi',
  'suc-genel': 'suç (genel)',
};

/** Kural kodunun okur için adı; bilinmeyen kod olduğu gibi döner. */
export const kuralAdi = (kod) => KURAL_ADLARI[kod] ?? kod;

/** { kod: n } -> [{ kod, ad, n }], yalnız n > 0, çoktan aza (eşitlikte koda göre). */
export function kuralSatirlari(kurallar) {
  return Object.entries(kurallar ?? {})
    .filter(([, n]) => Number(n) > 0)
    .map(([kod, n]) => ({ kod, ad: kuralAdi(kod), n: Number(n) }))
    .sort((a, b) => b.n - a.n || a.kod.localeCompare(b.kod));
}

/** Kural sayımlarının toplamı. */
export const kuralToplami = (kurallar) => Object.values(kurallar ?? {}).reduce((t, n) => t + (Number(n) || 0), 0);

/** Kırmızı olmayan nedenlerle (haber değeri, yinelenme…) elenenler; negatif olmaz. */
export const kalanElenen = (elendi, kirmizi) => Math.max(0, (Number(elendi) || 0) - (Number(kirmizi) || 0));

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "2026-10-01" -> "1 Ekim 2026" */
export function gunMetni(g, yilli = true) {
  const [y, a, d] = g.split('-').map(Number);
  return `${d} ${AYLAR[a - 1]}${yilli ? ` ${y}` : ''}`;
}

/** "2026-c4" -> "2026 4. çeyrek" */
export function ceyrekBasligi(ceyrek) {
  const m = /^(\d{4})-c(\d)$/.exec(ceyrek);
  return m ? `${m[1]} ${m[2]}. çeyrek` : ceyrek;
}

/** "1 Ekim – 31 Aralık 2026" (yıllar farklıysa ikisi de yıllı). */
export function aralikMetni(bas, son) {
  const ayniYil = bas.slice(0, 4) === son.slice(0, 4);
  return `${gunMetni(bas, !ayniYil)} – ${gunMetni(son)}`;
}

/**
 * Çeyrek içi site sayımları.
 * haberler: [{ id, data }] (haber koleksiyonu); kaldirilan: kaldırılan kayıtlar; sikayetler: şikâyet kayıtları.
 * Yayıncı yazısı = sahipYazisiMi (zincir yazısı hariç); bot haberi = ikisi de olmayan her yayın (bülten dahil).
 */
export function ceyrekSayimlari({ haberler = [], kaldirilan = [], sikayetler = [], bas, son }) {
  let bot = 0;
  let yayinci = 0;
  let zincir = 0;
  for (const h of haberler) {
    if (!araliktaMi(h.data.date, bas, son)) continue;
    if (zincirYazisiMi(h.data)) {
      zincir++;
      continue;
    }
    if (sahipYazisiMi(h.data)) yayinci++;
    else bot++;
  }
  const kayitlar = duzeltmeKayitlari(haberler, kaldirilan).filter((k) => araliktaMi(k.tarih, bas, son));
  const sik = sikayetler.filter((s) => araliktaMi(s.karar, bas, son));
  return {
    bot,
    yayinci,
    zincir,
    duzeltme: kayitlar.filter((k) => k.tur === 'duzeltme').length,
    kaldirilan: kayitlar.filter((k) => k.tur === 'kaldirildi').length,
    sikayet: {
      toplam: sik.length,
      yerinde: sik.filter((s) => s.sonuc === 'yerinde').length,
      kismen: sik.filter((s) => s.sonuc === 'kismen').length,
      yerindeDegil: sik.filter((s) => s.sonuc === 'yerinde-degil').length,
    },
  };
}

/** Defter kaydı + site sayımları -> sayfanın göstereceği tek nesne. */
export function raporSatirlari(defter, sayimlar) {
  return {
    baslik: ceyrekBasligi(defter.ceyrek),
    aralik: aralikMetni(defter.bas, defter.son),
    ...sayimlar,
    sariToplam: Number(defter.sari) || 0,
    sariKurallar: kuralSatirlari(defter.kurallar?.sari),
    elendi: Number(defter.elendi) || 0,
    kirmizi: Number(defter.kirmizi) || 0,
    kirmiziKurallar: kuralSatirlari(defter.kurallar?.kirmizi),
    kalanElenen: kalanElenen(defter.elendi, defter.kirmizi),
    geminiCagri: Number(defter.geminiCagri) || 0,
    kuralDegisiklikleri: Array.isArray(defter.kuralDegisiklikleri) ? defter.kuralDegisiklikleri : null,
    defterGecKaldi: defter.defterBaslangici > defter.bas ? defter.defterBaslangici : null,
  };
}
