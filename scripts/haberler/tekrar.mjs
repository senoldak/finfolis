// Çalıştırmalar arası tekrar denetimi (Gemini'siz): son 72 saatte yayımlanmış bir haberle aynı olayı anlatan
// aday olay yeniden yazılmaz. Gruplamanın (olaylar.mjs) hafıza eşleştirmesi Gemini'ye bağlı ve aynı olayı farklı
// başlıklarla gelen kaynaklarda kaçırabiliyor (ör. 13-14.10.2026: Bank of America cezası dört ayrı haber oldu).
// Hafıza durum.yayinlar'da tutulur: yazılan her haberin slug'ı, olay başlığı, kaynak başlık+özetleri ve zamanı.
// Karşılaştırma kaynak metinler (çoğunlukla İngilizce) arasında yapılır; ad (varlık) ve rakam ortaklığı da aranır.
// Yanlış pozitif bir haberin yazılmamasına yol açtığından eşikler temkinli tutulur.

import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

export const TEKRAR_SAAT = 72;
// Şirket + olay türü kuralının (bkz. ayniSirketOlayi) penceresi: aynı şirketin bilançosu 48 saat içinde ikinci kez yazılmaz.
export const SIRKET_OLAY_SAAT = 48;

const DURAK = new Set(
  `a an the and or of to in on for at by with from as into over after before about amid than that this these those its it
  is are was were be been being has have had will would could should may might can says said say new more most less
  up down out off not no yes but if so all any some per via vs between here what how why who ve ile bir bu da de için
  olarak göre daha en çok`.split(/\s+/),
);

// Sık geçen, tek başına olayı ayırt etmeyen adlar: ülke, şehir, para birimi, genel kurum ve kişi adları (virgülle ayrılır).
const GENEL_AD = new Set(
  `us, u.s, usa, america, american, uk, britain, british, china, chinese, japan, japanese, india, indian, europe,
  european, euro, eu, germany, german, france, french, asia, asian, world, global, fed, ai, ceo, cfo, trump, president,
  government, treasury, russia, russian, ukraine, ukrainian, iran, iranian, israel, gulf, middle east, saudi, saudi arabia,
  canada, mexico, brazil, korea, south korea, singapore, hong kong, indonesia, australia, switzerland, italy, spain,
  washington, beijing, london, tokyo, new york, white house, kremlin, opec, donald trump, president donald trump,
  wall street, dollar, yen, yuan, monday, tuesday, wednesday, thursday, friday, saturday, sunday, january, february,
  march, april, june, july, august, september, october, november, december, abd, amerika, ingiltere, çin, avrupa,
  japonya, hindistan, almanya, fransa, türkiye, rusya, ukrayna, orta doğu, beyaz saray, başkan, hazine bakanlığı`
    .split(',')
    .map((s) => s.trim().replace(/\s+/g, ' ')),
);

const kucuk = (s) => String(s).toLocaleLowerCase('en');

// Basit gövdeleme: İngilizce çekim ekleri atılır, ilk 6 harf alınır ("fined"/"fines" → "fin", "laundering" → "launde").
function govdele(k) {
  let s = k;
  for (const ek of ['ing', 'ed', 'es', 's']) if (s.length >= ek.length + 3 && s.endsWith(ek)) { s = s.slice(0, -ek.length); break; }
  if (s.length > 3 && s.endsWith('e')) s = s.slice(0, -1); // "fine" / "fined" / "fines" → "fin"
  return s.slice(0, 6);
}

export function kelimeler(metin) {
  const out = new Set();
  for (const k of kucuk(metin).split(/[^\p{L}\d]+/u)) {
    if (k.length < 3 || DURAK.has(k) || /^\d+$/.test(k)) continue;
    out.add(govdele(k));
  }
  return out;
}

// Büyük harfle başlayan ardışık kelimeler tek ad sayılır ("Bank of America", "Hyundai Motor Group").
// Başlıkların çoğu Her Kelimesi Büyük yazıldığından adlar yalnızca cümle düzenindeki metinden (özet) çıkarılır;
// metnin çoğu büyük harfle başlıyorsa ad çıkarılmaz.
export function adlar(metin) {
  const t = String(metin ?? '');
  const sozcukler = t.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (sozcukler.length >= 4 && sozcukler.filter((w) => /^["'“(]?\p{Lu}/u.test(w)).length / sozcukler.length > 0.6) return new Set();
  const out = new Set();
  const re = /(?:\p{Lu}[\p{L}\d&.'’-]*)(?:\s+(?:of\s+|de\s+)?\p{Lu}[\p{L}\d&.'’-]*)*/gu;
  for (const m of t.matchAll(re)) {
    // İyelik ve Türkçe ekler atılır: "America's", "America'ya" → "america"
    const ad = kucuk(m[0]).replace(/['’]\p{L}*$/u, '').replace(/[.]+$/, '').replace(/^the\s+/, '').trim();
    // Cümle başındaki tek kelime (ör. "The", "Shares") ad sayılmaz.
    const once = t.slice(0, m.index).trimEnd();
    if (!/\s/.test(ad) && (once === '' || /[.!?:—–-]$/.test(once))) continue;
    if (ad.length < 3 || GENEL_AD.has(ad) || DURAK.has(ad)) continue;
    out.add(ad);
  }
  return out;
}

// Ayırt edici rakamlar: "1.2 billion", "36.3%", "$7 billion". Yıllar ve birimsiz küçük sayılar (gün, sıra) atlanır.
export function rakamlar(metin) {
  const out = new Set();
  // Türkçe biçim de aynı anahtara çevrilir ("yüzde 3,1" → "3.1 %", "1,2 milyar" → "1.2 billion"):
  // tohum hafızadaki yayımlanmış Türkçe yazılar İngilizce kaynak adaylarıyla karşılaştırılabilsin.
  const tr = String(metin ?? '').replace(/(?:yüzde|(?<![\d.,]\s*)%)\s*(\d+(?:[.,]\d+)?)/gi, '$1 %');
  const re = /(\d+(?:[.,]\d+)?)\s*(%|percent|per cent|billion|million|trillion|bn|mn|milyar|milyon|trilyon)?/gi;
  for (const m of tr.matchAll(re)) {
    const sayi = m[1].replace(',', '.');
    const birim = kucuk(m[2] ?? '')
      .replace(/^per ?cent$/, '%')
      .replace(/^(bn|milyar)$/, 'billion')
      .replace(/^(mn|milyon)$/, 'million')
      .replace(/^trilyon$/, 'trillion');
    const n = Number(sayi);
    if (!Number.isFinite(n)) continue;
    if (!birim && (/^(19|20)\d\d$/.test(sayi) || (Number.isInteger(n) && n <= 31))) continue;
    out.add(`${n}${birim ? ` ${birim}` : ''}`);
  }
  return out;
}

const ortak = (a, b) => [...a].filter((x) => b.has(x)).length;
const jaccard = (a, b) => {
  const o = ortak(a, b);
  return o ? o / (a.size + b.size - o) : 0;
};
const ortaklik = (a, b) => {
  const o = ortak(a, b);
  return o ? o / Math.min(a.size, b.size) : 0;
};

// Şirket olayı türleri (Türkçe ve İngilizce): aynı şirketin aynı türde iki haberi tek olaydır. Şimdilik yalnız bilanço
// (çeyrek sonucu, ardından gelen hisse tepkisi, beklenti aşımı); kural kasıtlı dar tutulur.
const OLAY_TURLERI = { bilanco: /\b(?:earnings|quarterly|quarter|q[1-4]|results|eps)\b|çeyrek|bilanço/i };

// Şirket anahtarları yalnız başlıktan: ayırt edici adların ilk kelimesi ("Meta Platforms" → "meta") ve başlığın ilk kelimesi
// (adlar() cümle başındaki tek kelimeyi atlar). Özet kullanılmaz: bilanço döneminde özet rakip şirketleri de anar.
const GENEL_ILK = new Set(
  `stocks, stock, shares, share, markets, market, wall, futures, oil, gold, bitcoin, crypto, tech, bank, banks, why, how, what,
  here, these, top, big, hisse, hisseleri, borsa, piyasalar, piyasa, altın, petrol, dolar, bitcoin'in`.split(',').map((x) => x.trim()),
);
// Milliyet ve genel sıfatlar şirket ayırt etmez: "Indian Hotels", "International Paper" farklı şirketlerdir ama ilk
// kelimeleri ("indian", "international") aynı anahtarı üretir. Hem başlığın ilk kelimesi hem ad adaylarının ilk kelimesi süzülür.
const GENEL_SIFAT = new Set(
  `international, national, global, general, united, universal, indian, american, british, chinese, japanese, european,
  asian, african, korean, german, french, canadian, australian, russian, turkish, saudi, first, second, new, old, great,
  big, small, public, private, federal, central, royal, pacific, atlantic, western, eastern, northern, southern, uluslararası,
  ulusal, küresel, genel, birleşik, hint, amerikan, çinli, japon, avrupa, alman, fransız`.split(',').map((x) => x.trim()),
);
const genelMi = (k) => DURAK.has(k) || GENEL_AD.has(k) || GENEL_SIFAT.has(k);
function sirketler(ilk, baslik) {
  const out = new Set();
  for (const a of adlar(baslik)) {
    // Ad genel bir sıfatla başlıyorsa ("indian hotels") ayırt edici ilk kelime aranır ("hotels"); bulunamazsa anahtar yok.
    const k = a.split(' ').find((w, i, ws) => (i === 0 ? !genelMi(w) : !genelMi(w) && !GENEL_ILK.has(w) && genelMi(ws[0])) && w.length >= 3);
    if (k) out.add(k);
  }
  if (ilk.length >= 3 && !genelMi(ilk) && !GENEL_ILK.has(ilk)) out.add(ilk);
  return out;
}

// Kaynak metni: {baslik, ozet}. İz bir kez çıkarılır.
export function iz({ baslik = '', ozet = '' }) {
  const ilk = kucuk(String(baslik).trim().split(/\s+/)[0] ?? '').replace(/['’]s$/, '');
  return {
    sirketler: sirketler(ilk, baslik),
    olayTurleri: new Set(Object.entries(OLAY_TURLERI).filter(([, re]) => re.test(`${baslik} ${ozet}`)).map(([t]) => t)),
    ilk,
    baslikRakam: rakamlar(baslik),
    baslik: kelimeler(baslik),
    metin: kelimeler(`${baslik} ${ozet}`),
    adlar: adlar(ozet),
    rakamlar: rakamlar(`${baslik} ${ozet}`),
  };
}

// İki kaynak metni aynı olayı mı anlatıyor? Döner: eşleşme nedeni ya da null.
//  (a) başlıklar neredeyse aynı: en az 3 ortak kelime, Jaccard ≥ 0,6, ilk kelime aynı ve başlık rakamları çelişmiyor.
//      Şablon başlıklar ("X Trust ... SEC'e başvurdu", "Indonesia stocks ... down 2.47%") ilk kelime ya da rakamla ayrılır.
//  (b) ortak ayırt edici ad + ortak ayırt edici rakam + metin kelimelerinin en az %30'u ortak
//  (c) en az 2 ortak ayırt edici ad + metin kelimelerinin en az %30'u + başlık kelimelerinin en az %25'i ortak
//  (d) yalnızca dil ayrıysa (Türkçe tohum kaydı, bkz. hafizaTohumla): kelimeler karşılaştırılamaz; ortak ad +
//      ortak birimli rakam (milyar, milyon, yüzde) yeter. Daha gevşek olduğundan yalnızca tohum kayıtlarında kullanılır.
export function ayniOlay(x, y, { dilAyri = false } = {}) {
  if (dilAyri) {
    const birimli = [...x.rakamlar].filter((r) => r.includes(' ') && y.rakamlar.has(r)).length;
    return ortak(x.adlar, y.adlar) >= 1 && birimli >= 1 ? 'ad+rakam (tohum)' : null;
  }
  const rakamCelisir = x.baslikRakam.size && y.baslikRakam.size && !ortak(x.baslikRakam, y.baslikRakam);
  if (x.ilk === y.ilk && !rakamCelisir && ortak(x.baslik, y.baslik) >= 3 && jaccard(x.baslik, y.baslik) >= 0.6) return 'başlık';
  const ortakAdlar = [...x.adlar].filter((a) => y.adlar.has(a));
  const ad = ortakAdlar.length;
  const metin = ortaklik(x.metin, y.metin);
  // Başlık ortaklığı ortak adın kelimeleri dışında da aranır: "Bank of America bilanço açıklayacak" ile
  // "Bank of America'ya ceza" yalnızca adı paylaşır.
  const adKelimesi = kelimeler(ortakAdlar.join(' '));
  const suz = (s) => new Set([...s].filter((k) => !adKelimesi.has(k)));
  const baslikDisi = ortaklik(suz(x.baslik), suz(y.baslik));
  if (ad >= 1 && ortak(x.rakamlar, y.rakamlar) >= 1 && metin >= 0.3 && baslikDisi >= 0.2) return 'ad+rakam';
  if (ad >= 2 && metin >= 0.3 && ortaklik(x.baslik, y.baslik) >= 0.25) return 'adlar';
  return null;
}

// Aynı şirket + aynı olay türü (ör. Meta bilançosu): rakam, ad ya da başlık ortaklığı aranmaz. Farklı kaynaklar aynı
// bilançoyu başka başlık ve rakamla anlatır; sonuç, "hisse yükseldi", "hisse düştü" haberleri de aynı olaydır.
export function ayniSirketOlayi(x, y) {
  return ortak(x.sirketler, y.sirketler) >= 1 && ortak(x.olayTurleri, y.olayTurleri) >= 1 ? 'şirket+olay' : null;
}

const kaynakMetinleri = (o) => (o.adaylar?.length ? o.adaylar : [o]).map((a) => ({ baslik: a.baslik ?? '', ozet: a.ozet ?? '' }));

// Olayın bir adayı hafızadaki (son TEKRAR_SAAT saat) bir yayınla aynı olaysa {slug, neden} döner, yoksa null.
export function tekrarBul(olay, hafiza = [], simdi = new Date()) {
  const sinir = simdi.getTime() - TEKRAR_SAAT * 3600 * 1000;
  const izler = kaynakMetinleri(olay).map(iz);
  for (const h of hafiza) {
    if (!(new Date(h.zaman).getTime() >= sinir)) continue;
    const yeni48 = new Date(h.zaman).getTime() >= simdi.getTime() - SIRKET_OLAY_SAAT * 3600 * 1000;
    for (const k of h.kaynaklar ?? []) {
      const hi = iz(k);
      for (const x of izler) {
        const neden = ayniOlay(x, hi, { dilAyri: Boolean(h.tohum) }) ?? (yeni48 ? ayniSirketOlayi(x, hi) : null);
        if (neden) return { slug: h.slug, neden };
      }
    }
  }
  return null;
}

// Hafızayı günceller: süresi dolanlar atılır, bu çalıştırmada yazılan haberler (o.haberSlug) eklenir.
export function hafizayaEkle(hafiza = [], yazilan = [], simdi = new Date()) {
  const sinir = simdi.getTime() - TEKRAR_SAAT * 3600 * 1000;
  const korunan = hafiza.filter((h) => new Date(h.zaman).getTime() >= sinir);
  const yeni = yazilan
    .filter((o) => o.haberSlug && !korunan.some((h) => h.slug === o.haberSlug))
    .map((o) => ({
      slug: o.haberSlug,
      baslik: o.baslik,
      kaynaklar: kaynakMetinleri(o).map((k) => ({ baslik: k.baslik, ozet: String(k.ozet).slice(0, 300) })),
      zaman: simdi.toISOString(),
    }));
  return [...korunan, ...yeni];
}

// Hafıza boşsa (ilk çalıştırma, silinmiş durum dosyası) son TEKRAR_SAAT saatte yayımlanmış haberlerden tohumlanır:
// src/content/haberler/<slug>/index.md ön bilgisinden başlık, spot ve tarih. Bültenler ve taslaklar alınmaz.
// Türkçe başlık İngilizce adayla kelime düzeyinde pek eşleşmez; eşleşme çoğunlukla spottaki ad ve rakamlardan gelir.
export async function hafizaTohumla(rot, simdi = new Date()) {
  const dizin = path.join(rot, 'src/content/haberler');
  const sinir = simdi.getTime() - TEKRAR_SAAT * 3600 * 1000;
  let adlar_;
  try {
    adlar_ = await readdir(dizin);
  } catch {
    return [];
  }
  const out = [];
  for (const slug of adlar_) {
    let md;
    try {
      md = await readFile(path.join(dizin, slug, 'index.md'), 'utf8');
    } catch {
      continue;
    }
    const on = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const alan = (k) => {
      const v = on.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.trim();
      if (!v) return undefined;
      try {
        return v.startsWith('"') ? JSON.parse(v) : v;
      } catch {
        return v.replace(/^"|"$/g, '');
      }
    };
    if (alan('tur') === 'bulten' || alan('draft') === 'true') continue;
    const zaman = new Date(alan('date') ?? '');
    if (!(zaman.getTime() >= sinir) || zaman > simdi) continue;
    const baslik = alan('title') ?? '';
    out.push({ slug, baslik, tohum: true, kaynaklar: [{ baslik, ozet: String(alan('description') ?? '').slice(0, 300) }], zaman: zaman.toISOString() });
  }
  return out.sort((a, b) => a.zaman.localeCompare(b.zaman));
}

// Olay listesinden hafızadaki bir yayınla aynı olanları çıkarır (liste yerinde değişir); çıkarılanları döner.
// Aynı çalıştırmadaki iki olay da birbirinin kopyasıysa önemi düşük olan çıkarılır.
export function tekrarlariAyikla(olaylar, hafiza = [], simdi = new Date()) {
  const cikan = [];
  const kalan = [];
  for (const o of [...olaylar].sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0))) {
    const r = tekrarBul(o, hafiza, simdi) ?? tekrarBul(o, kalan.map((k) => ({ slug: k.id, kaynaklar: kaynakMetinleri(k), zaman: simdi.toISOString() })), simdi);
    if (r) cikan.push({ olay: o, ...r });
    else kalan.push(o);
  }
  for (const c of cikan) olaylar.splice(olaylar.indexOf(c.olay), 1);
  return cikan;
}
