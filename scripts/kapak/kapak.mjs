// Haber kapakları: görseli kendi verimizden çizeriz (boncuk sırası, büyük rakam, grafik), dışarıdan fotoğraf alınmaz.
// Kimlik v2 (BRAND.md §11, "C" dili): kâğıt zemin, sağdan taşan soluk büyük abaküs (yalnız vurgu boncuğu pişmiş toprak),
// sol üstte kategori pişmiş toprak büyük harf, Bricolage Grotesque başlık, sol altta "finfolis".
// Yazılar yazı tipinden doğrudan vektör yola çevrilir (fontkitten); derleme makinesinde yazı tipi kurulu olması ya da
// Pango'nun doğru dosyayı bulması gerekmez. Sonuç 1200×675 (16:9) PNG. Kullanım: const png = await kapakCiz(kaynakKapagi({...}))
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { create } from 'fontkitten';
import { CATEGORIES } from '../../src/lib/kategoriler.js';
import { KIMLIK, abakusSvg } from '../../src/lib/kimlik.js';

const B = 1200;
const H = 675;
const KENAR = 72;
const FONT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts', 'BricolageGrotesque.ttf');

const R = {
  kagit: KIMLIK.kagit,
  murekkep: KIMLIK.murekkep,
  murekkep2: '#3d3c38',
  soluk: KIMLIK.gri,
  ince: KIMLIK.boncukGri,
};
// Veri renkleri (BRAND.md §7): yükseliş ve düşüş; pişmiş toprak veri rengi değildir.
const MUREKKEP = {
  red: { fill: KIMLIK.dusus, text: KIMLIK.dusus },
  green: { fill: KIMLIK.yukselis, text: '#3a6b4a' },
};

const sayi = (n, d = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

function kategori(slug) {
  return CATEGORIES.find((k) => k.slug === slug) ?? CATEGORIES[0];
}

// Boncuk (abaküs) sırası: miktar / birim kadar boncuk, onar onar gruplanır, son boncuk kesirli olabilir; arkada ince tel.
// Dönüş: svg ve sıranın bittiği x.
function isoSatir(miktar, birim, x, y, boyut, renk) {
  const tam = Math.floor(miktar / birim);
  const kesir = Math.round(((miktar / birim) % 1) * 100) / 100;
  const r = boyut * 0.42;
  const grupAra = boyut * 0.45;
  const cy = y + boyut / 2;
  let out = '';
  let cx = x;
  const toplam = tam + (kesir >= 0.1 ? 1 : 0);
  for (let i = 0; i < toplam; i++) {
    if (i && i % 10 === 0) cx += grupAra;
    const k = i === tam ? kesir : 1;
    const m = cx + boyut / 2;
    if (k < 1) {
      const kx = -r + 2 * r * k;
      const h = Math.sqrt(r * r - kx * kx);
      out += `<path d="M${(m + kx).toFixed(1)} ${(cy - h).toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 ${k > 0.5 ? 1 : 0} 0 ${(m + kx).toFixed(1)} ${(cy + h).toFixed(1)}Z" fill="${renk}"/>`;
    } else out += `<circle cx="${m.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${renk}"/>`;
    cx += boyut;
  }
  const tel = `<line x1="${x}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${KIMLIK.soluk}" stroke-width="${Math.max(2, boyut * 0.08).toFixed(1)}"/>`;
  return { svg: tel + out, bitis: cx };
}

// ── Yazı ───────────────────────────────────────────────────────────────

let ana = null;
const kesimler = new Map();
function font(kalinlik, boyut) {
  ana ??= create(readFileSync(FONT));
  const opsz = Math.min(96, Math.max(12, Math.round(boyut)));
  const anahtar = `${kalinlik}-${opsz}`;
  let f = kesimler.get(anahtar);
  if (!f) {
    f = ana.getVariation({ wght: Number(kalinlik), opsz });
    kesimler.set(anahtar, f);
  }
  return f;
}

function olc(f, s, boyut, aralik) {
  const gl = f.glyphsForString(s);
  return gl.reduce((t, g) => t + g.advanceWidth, 0) * (boyut / f.unitsPerEm) + aralik * Math.max(0, gl.length - 1);
}

/** Tek satır metni glif yollarıyla SVG olarak verir; (x, taban) taban çizgisinin solu. Marka dosyaları da kullanır. */
export function yaziYolu(metin, x, taban, { boyut, kalinlik = 600, renk = R.murekkep, aralik = 0 }) {
  const f = font(kalinlik, boyut);
  const olcek = boyut / f.unitsPerEm;
  const ara = aralik * boyut;
  let cx = x;
  let yollar = '';
  for (const g of f.glyphsForString(metin)) {
    const d = g.path.toSVG();
    if (d) yollar += `<path transform="translate(${cx.toFixed(2)} ${taban.toFixed(2)}) scale(${olcek} ${-olcek})" d="${d}"/>`;
    cx += g.advanceWidth * olcek + ara;
  }
  return { svg: `<g fill="${renk}">${yollar}</g>`, genislik: cx - ara - x };
}

// Kelimeleri genişliğe sığacak satırlara böler; satırdan uzun tek kelime harf harf bölünür.
function satirla(metin, f, boyut, aralik, genislik) {
  if (!genislik) return [metin];
  const parcala = (k) => {
    if (olc(f, k, boyut, aralik) <= genislik) return [k];
    const out = [];
    let p = '';
    for (const h of k) {
      if (p && olc(f, p + h, boyut, aralik) > genislik) {
        out.push(p);
        p = h;
      } else p += h;
    }
    if (p) out.push(p);
    return out;
  };
  const out = [];
  let satir = '';
  for (const k of metin.split(/\s+/).filter(Boolean).flatMap(parcala)) {
    const aday = satir ? `${satir} ${k}` : k;
    if (satir && olc(f, aday, boyut, aralik) > genislik) {
      out.push(satir);
      satir = k;
    } else satir = aday;
  }
  if (satir) out.push(satir);
  return out;
}

// Bir metni Bricolage glif yollarıyla saydam PNG olarak basar; genişlik verilirse kelimeden kaydırır.
// Dönüş: { input, genislik, yukseklik } (katman olarak bindirilir). aralik: harf aralığı (em); satirAraligi: px;
// alfa: yüzde opaklık. `aile` eski arayüzden kaldı; tek aile kullanılır.
async function yazi(metin, { boyut = 32, kalinlik = 400, renk = R.murekkep, genislik, aralik = 0, satirAraligi = 0, buyukHarf = false, alfa }) {
  const f = font(kalinlik, boyut);
  const metinB = buyukHarf ? metin.toLocaleUpperCase('tr-TR') : metin;
  const ara = aralik * boyut;
  const olcek = boyut / f.unitsPerEm;
  const ust = f.ascent * olcek;
  const tekSatir = (f.ascent - f.descent) * olcek;
  const satirH = tekSatir * 1.02 + satirAraligi;
  const satirlar = satirla(metinB, f, boyut, ara, genislik);
  let yollar = '';
  let enGenis = 1;
  satirlar.forEach((satir, i) => {
    let cx = 0;
    const y = ust + i * satirH;
    for (const g of f.glyphsForString(satir)) {
      const d = g.path.toSVG();
      if (d) yollar += `<path transform="translate(${cx.toFixed(2)} ${y.toFixed(2)}) scale(${olcek} ${-olcek})" d="${d}"/>`;
      cx += g.advanceWidth * olcek + ara;
    }
    enGenis = Math.max(enGenis, cx - ara);
  });
  const g = Math.ceil(enGenis) + 2;
  const y = Math.ceil(satirH * (satirlar.length - 1) + tekSatir) + 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${g}" height="${y}"><g fill="${renk}"${alfa ? ` fill-opacity="${alfa / 100}"` : ''}>${yollar}</g></svg>`;
  const input = await sharp(Buffer.from(svg)).png().toBuffer();
  return { input, genislik: g, yukseklik: y };
}

// Yazı tipi bekçisi: kapak yazı tipi okunabiliyor ve Türkçe harfler ile ₺ içinde mi (yoksa kapak sessizce bozulur).
let fontlarTamam = null;
export function fontlariDenetle() {
  fontlarTamam ??= (async () => {
    const f = font(700, 96);
    for (const h of 'ığşİÖÇ₺') {
      const [g] = f.glyphsForString(h);
      if (!g || g.id === 0) throw new Error(`::error::Kapak yazı tipinde "${h}" yok (${FONT})`);
    }
  })();
  fontlarTamam.catch(() => {
    fontlarTamam = null;
  });
  return fontlarTamam;
}

// ── Kapak çerçevesi ────────────────────────────────────────────────────
// Kâğıt zemin; altta solda "finfolis". Başlık kapaklarında (buyukAbakus) sağdan taşan soluk büyük abaküs ve sol üstte
// kategori; veri kapaklarında (grafik, karne, gösterge) veri tüm genişliği kullanır, kategori sağ altta.
// Dönüş: renk = ön plan (mürekkep), vurgu = boncuk ve dolgu rengi, veri = çizgi ve son değer rengi, zemin.
const ALT_BANT = 130; // altta "finfolis" satırının ayırdığı yükseklik
const ABAKUS_X = 820; // büyük abaküsün sol kenarı; başlık bunun solunda kalır
const YAZI_GEN = ABAKUS_X - 64 - 40;

async function cerceve(kat, { ornek, buyukAbakus = true } = {}) {
  await fontlariDenetle();
  let svg = `<rect width="${B}" height="${H}" fill="${R.kagit}"/>`;
  if (buyukAbakus) svg += abakusSvg({ boyut: 470, zemin: 'soluk', vurgu: true, ekler: `x="${ABAKUS_X}" y="-30"` });
  const ad = await yazi('finfolis', { boyut: 44, kalinlik: 600, renk: R.murekkep, aralik: -0.03 });
  const ka = await yazi(kat.name, { boyut: 28, kalinlik: 600, renk: KIMLIK.toprak, aralik: 0.1, buyukHarf: true });
  const katmanlar = [{ ...ad, left: 64, top: Math.round(H - 66 - ad.yukseklik / 2) }];
  if (buyukAbakus) katmanlar.push({ ...ka, left: 64, top: 64 });
  else katmanlar.push({ ...ka, left: B - 64 - ka.genislik, top: Math.round(H - 66 - ka.yukseklik / 2) });
  if (ornek) {
    const o = await yazi('Örnek veri', { boyut: 20, kalinlik: 600, renk: R.murekkep, alfa: 70 });
    katmanlar.push({ ...o, left: Math.round((B - o.genislik) / 2), top: Math.round(H - 66 - o.yukseklik / 2) });
  }
  const ustBosluk = buyukAbakus ? 64 + ka.yukseklik + 24 : 48;
  return { svg, katmanlar, renk: R.murekkep, vurgu: R.murekkep, veri: R.murekkep, zemin: R.kagit, ustBosluk };
}

// Metin, verilen yüksekliğe sığana dek punto 4'er küçülür (alt sınıra kadar).
async function sigdirYazi(metin, o, enFazlaY, enAz) {
  let boyut = o.boyut;
  for (;;) {
    const r = await yazi(metin, { ...o, boyut });
    if (r.yukseklik <= enFazlaY || boyut <= enAz) return r;
    boyut -= 4;
  }
}

const ALAN_H = H - ALT_BANT; // alt satırın üstündeki alan

// Başlık: Bricolage 700, kategorinin altında, abaküsün solunda.
async function baslikKapagi(kat, baslik, { ornek, alt } = {}) {
  const c = await cerceve(kat, { ornek });
  const a = alt ? await yazi(alt, { boyut: 32, kalinlik: 500, renk: R.murekkep2, genislik: YAZI_GEN }) : null;
  const ekH = a ? a.yukseklik + 20 : 0;
  const b = await sigdirYazi(baslik, { boyut: 80, kalinlik: 700, renk: c.renk, genislik: YAZI_GEN, aralik: -0.02, satirAraligi: -10 }, ALAN_H - c.ustBosluk - ekH, 48);
  const katmanlar = [...c.katmanlar, { ...b, left: 64, top: c.ustBosluk }];
  if (a) katmanlar.push({ ...a, left: 64, top: c.ustBosluk + b.yukseklik + 20 });
  return { svg: c.svg, katmanlar };
}

// Haber kartı: kategori ve başlık. Spot, bölge, rakam ve kaynak görsele yazılmaz.
export function haberKapagi({ kategori: slug, baslik, ornek }) {
  return async () => baslikKapagi(kategori(slug), baslik, { ornek });
}

// Kategori / kurum / dosya kartı: konu başlık, varsa alt metin tek satırlık açıklama olarak altında.
export function kaynakKapagi({ kategori: slug, konu, alt, ornek }) {
  return async () => baslikKapagi(kategori(slug), konu, { ornek, alt });
}

// Bülten kartı: üstte tarih, "Piyasa bülteni" (saat verilirse "14:00 bülteni") başlık, altında en çok 3 madde.
export function bultenKapagi({ saat, tarih, basliklar = [] }) {
  return async () => {
    const kat = kategori('piyasalar');
    const c = await cerceve(kat);
    const u = tarih ? await yazi(tarih, { boyut: 30, kalinlik: 700, renk: c.renk, aralik: 0.1, buyukHarf: true }) : null;
    const t = await yazi(saat ? `${saat} bülteni` : 'Piyasa bülteni', { boyut: 84, kalinlik: 700, renk: c.renk, genislik: YAZI_GEN, satirAraligi: -6 });
    const maddeler = basliklar.slice(0, 3).map((b) => `—  ${b.length > 80 ? `${b.slice(0, 77)}…` : b}`);
    let ms = [];
    const ara = 14;
    const ustH = (u ? u.yukseklik + 18 : 0) + t.yukseklik + (maddeler.length ? 24 : 0);
    for (let boyut = 36; ; boyut -= 2) {
      ms = [];
      for (const m of maddeler) ms.push(await yazi(m, { boyut, kalinlik: 500, renk: c.renk, genislik: YAZI_GEN }));
      const toplam = ms.reduce((n, m) => n + m.yukseklik + ara, -ara);
      if (!maddeler.length || ustH + toplam <= ALAN_H - 70 || boyut <= 26) break;
    }
    const blokH = ustH + ms.reduce((n, m) => n + m.yukseklik + ara, -ara);
    let y = Math.max(c.ustBosluk, Math.round((ALAN_H - blokH) / 2));
    const katmanlar = [...c.katmanlar];
    if (u) { katmanlar.push({ ...u, left: 64, top: y }); y += u.yukseklik + 18; }
    katmanlar.push({ ...t, left: 64, top: y });
    y += t.yukseklik + 24;
    for (const m of ms) { katmanlar.push({ ...m, left: 64, top: y }); y += m.yukseklik + ara; }
    return { svg: c.svg, katmanlar };
  };
}

// Rakam kartı: rakam kahramandır (Bricolage 700, genişliğe sığana dek küçülür); üstünde etiket, altında kısa satır.
export function rakamKapagi({ kategori: slug, ust, rakam, alt, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { ornek });
    const u = await yazi(ust, { boyut: 30, kalinlik: 700, renk: c.renk, aralik: 0.1, buyukHarf: true, genislik: YAZI_GEN });
    const a = alt ? await yazi(alt, { boyut: 36, kalinlik: 500, renk: c.renk, genislik: YAZI_GEN }) : null;
    let r;
    for (let boyut = 180; ; boyut -= 4) {
      r = await yazi(rakam, { boyut, kalinlik: 700, renk: c.veri, aralik: -0.02 });
      if (r.genislik <= YAZI_GEN || boyut <= 72) break;
    }
    const ara = 16;
    const blokH = u.yukseklik + ara + r.yukseklik + (a ? 8 + a.yukseklik : 0);
    const y0 = Math.max(c.ustBosluk, Math.round((ALAN_H - blokH) / 2));
    const katmanlar = [...c.katmanlar, { ...u, left: 64, top: y0 }, { ...r, left: 60, top: y0 + u.yukseklik + ara }];
    if (a) katmanlar.push({ ...a, left: 64, top: y0 + u.yukseklik + ara + r.yukseklik + 8 });
    return { svg: c.svg, katmanlar };
  };
}


// Boncuk istatistiği: birkaç dönemin değeri boncuk sıralarıyla (1 boncuk = birim).
// satirlar: [{ etiket: '2024', deger: 9831 }], son satır güncel değerdir (mürekkep), öncekiler gri boncuk.
// `simge` eski Isotype arayüzünden kaldı; kullanılmaz.
export function gostergeKapagi({ kategori: slug, baslik, birim, birimEtiket, satirlar, ondalik = 0, onEk = '', sonEk = '', ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { ornek, buyukAbakus: false });
    const b = await yazi(baslik, { boyut: 56, kalinlik: 700, renk: c.renk, genislik: B - 128, satirAraligi: -4 });
    const top = 52;
    const katmanlar = [...c.katmanlar, { ...b, left: 64, top }];
    let svg = c.svg;

    // Satırlar: en uzun satır alana sığacak şekilde simge boyutu seçilir.
    const enCok = Math.max(...satirlar.map((s) => Math.ceil(s.deger / birim)));
    const etiketGen = 120;
    const degerGen = 210;
    const alan = B - 128 - etiketGen - degerGen;
    const boyut = Math.min(40, Math.floor(alan / (enCok * 1.12 + Math.floor(enCok / 10) * 0.45)));
    const ust0 = top + b.yukseklik + 36;
    const alanH = ALAN_H - 56 - ust0;
    const satirH = Math.min(boyut + 34, Math.floor(alanH / satirlar.length));
    // Az satırda blok, başlık ile lejant arasında dikey ortalanır.
    const ust = ust0 + Math.max(0, Math.round((alanH - satirH * satirlar.length) / 2));
    for (const [i, s] of satirlar.entries()) {
      const guncel = i === satirlar.length - 1;
      const y = ust + i * satirH;
      const e = await yazi(s.etiket, { boyut: 26, kalinlik: guncel ? 700 : 500, renk: c.renk, alfa: guncel ? undefined : 70 });
      katmanlar.push({ ...e, left: 64, top: Math.round(y + (boyut - e.yukseklik) / 2) });
      const satir = isoSatir(s.deger, birim, 64 + etiketGen, y, boyut, guncel ? R.murekkep : KIMLIK.boncukGri);
      svg += satir.svg;
      const d = await yazi(`${onEk}${sayi(s.deger, ondalik)}${sonEk}`, { boyut: 30, kalinlik: guncel ? 700 : 500, renk: c.renk, alfa: guncel ? undefined : 70 });
      katmanlar.push({ ...d, left: Math.round(satir.bitis + 16), top: Math.round(y + (boyut - d.yukseklik) / 2) });
    }

    // Lejant: 1 simge = birim.
    const ly = ALAN_H - 50;
    svg += `<circle cx="77" cy="${ly + 13}" r="11" fill="${R.murekkep}"/>`;
    const l = await yazi(`= ${birimEtiket}`, { boyut: 24, kalinlik: 500, renk: c.renk, alfa: 80 });
    katmanlar.push({ ...l, left: 64 + 36, top: Math.round(ly + (26 - l.yukseklik) / 2) });
    return { svg, katmanlar };
  };
}

// Eşik grafiği: bir göstergenin fiyat çizgisi, kesikli referans çizgileri (önceki rekor, zirve) ve son değer etiketi.
// seri: [{ tarih: 'YYYY-MM-DD', deger }] tarih sırasıyla; cizgiler: [{ deger, etiket }]; vurgu: grafiğin üstündeki kısa not.
// Kırmızı/yeşil alarm rengi kullanılmaz: çizgi ve referanslar mürekkep tonunda.
const TR_AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Okunaklı eksen aralığı: 1, 2, 2,5 ya da 5 × 10^n.
export function eksenAdimi(aralik, hedef = 4) {
  const ham = aralik / hedef;
  const us = 10 ** Math.floor(Math.log10(ham));
  return [1, 2, 2.5, 5, 10].map((k) => k * us).find((a) => a >= ham);
}

// Çok uzun seriyi kova başına en düşük ve en yüksek noktayla inceltir; tepe ve dipler kaybolmaz.
export function incelt(seri, kova = 300) {
  if (seri.length <= kova * 2) return seri;
  const boy = seri.length / kova;
  const out = [];
  for (let k = 0; k < kova; k++) {
    const dilim = seri.slice(Math.floor(k * boy), Math.floor((k + 1) * boy));
    if (!dilim.length) continue;
    let en = dilim[0];
    let ey = dilim[0];
    for (const p of dilim) {
      if (p.deger < en.deger) en = p;
      if (p.deger > ey.deger) ey = p;
    }
    out.push(...(en.tarih <= ey.tarih ? [en, ey] : [ey, en]).filter((p, i, a) => i === 0 || p !== a[0]));
  }
  if (out.at(-1) !== seri.at(-1)) out.push(seri.at(-1));
  return out;
}

// Kâğıt zemin; yazı, eksen ve çizgi mürekkep (pişmiş toprak veri rengi değildir).
// olay: { bas: 'YYYY-MM-DD', yon: 'yukselis' | 'dusus' } — haberin konusu olan günler (seri, zirveden düşüş, dipten
// yükseliş, son gün) çizginin o kısmında ve son değer etiketinde veri renginde vurgulanır; gerisi mürekkep.
// ust: başlığın üstünde küçük büyük harfli satır (ör. grafiğin neyi gösterdiği: "Brent petrol · son 6 ay").
export function grafikKapagi({ kategori: slug, baslik, ust, seri, cizgiler = [], vurgu, olay, ondalik = 2, onEk = '', sonEk = '', ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { ornek, buyukAbakus: false });
    const katmanlar = [...c.katmanlar];
    let svg = c.svg;
    const on = c.renk;
    const zemin = c.zemin;
    const deger = (n) => `${onEk}${sayi(n, ondalik)}${sonEk}`;

    let bY = 48;
    if (ust) {
      const u = await yazi(ust, { boyut: 24, kalinlik: 700, renk: on, aralik: 0.1, buyukHarf: true, genislik: B - 128 });
      katmanlar.push({ ...u, left: 64, top: bY });
      bY += u.yukseklik + 10;
    }
    const b = await yazi(baslik, { boyut: baslik.length > 90 ? 38 : baslik.length > 60 ? 44 : 56, kalinlik: 700, renk: on, genislik: B - 128, satirAraligi: -4 });
    katmanlar.push({ ...b, left: 64, top: bY });

    // Grafik alanı: sağda değer ekseni için yer bırakılır.
    const x0 = 64;
    const x1 = B - 64 - 112;
    const y0 = bY + b.yukseklik + 30;
    const y1 = ALAN_H - 44;
    const noktalar = incelt(seri);
    const t = (p) => Date.parse(`${p.tarih}T00:00:00Z`);
    const t0 = t(noktalar[0]);
    const t1 = t(noktalar.at(-1));
    const tumDegerler = [...noktalar.map((p) => p.deger), ...cizgiler.map((z) => z.deger)];
    let enAz = Math.min(...tumDegerler);
    let enCok = Math.max(...tumDegerler);
    const pay = (enCok - enAz) * 0.08 || enCok * 0.05;
    enAz -= pay;
    enCok += pay;
    const adim = eksenAdimi(enCok - enAz);
    const X = (p) => x0 + ((t(p) - t0) / (t1 - t0 || 1)) * (x1 - x0);
    const Y = (v) => y1 - ((v - enAz) / (enCok - enAz)) * (y1 - y0);
    const eksenOndalik = adim < 1 ? Math.min(2, Math.ceil(-Math.log10(adim))) : 0;

    // Yatay yardımcı çizgiler ve sağdaki değer etiketleri (son değer etiketiyle çakışan eksen etiketi yazılmaz).
    const sonY = Y(noktalar.at(-1).deger);
    for (let v = Math.ceil(enAz / adim) * adim; v <= enCok; v += adim) {
      const y = Y(v);
      svg += `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="${on}" stroke-opacity="0.22" stroke-width="1"/>`;
      if (Math.abs(y - sonY) < 30) continue;
      // Kayan nokta toplamı sıfırı -0,0000001 yapabilir: etikette "-0" görünmesin.
      const e = await yazi(sayi(Math.abs(v) < adim / 1e6 ? 0 : v, eksenOndalik), { boyut: 20, kalinlik: 500, renk: on, alfa: 80 });
      katmanlar.push({ ...e, left: x1 + 14, top: Math.round(y - e.yukseklik / 2) });
    }

    // Zaman ekseni: üç yıldan uzunsa yıllar, değilse ay başları (en fazla 7 etiket).
    const uzun = t1 - t0 > 3 * 365.25 * 864e5;
    const isaretler = [];
    for (let i = 1; i < noktalar.length; i++) {
      const [a, p] = [noktalar[i - 1].tarih, noktalar[i].tarih];
      if (uzun ? a.slice(0, 4) !== p.slice(0, 4) : a.slice(0, 7) !== p.slice(0, 7)) isaretler.push(noktalar[i]);
    }
    const sik = Math.ceil(isaretler.length / 7);
    for (const [i, p] of isaretler.entries()) {
      if ((isaretler.length - 1 - i) % sik) continue;
      const x = X(p);
      if (x < x0 + 30 || x > x1 - 30) continue;
      svg += `<line x1="${x.toFixed(1)}" y1="${y1}" x2="${x.toFixed(1)}" y2="${y1 + 8}" stroke="${on}" stroke-width="1"/>`;
      const metin = uzun ? p.tarih.slice(0, 4) : `${TR_AY_KISA[Number(p.tarih.slice(5, 7)) - 1]} ${p.tarih.slice(2, 4)}`;
      const e = await yazi(metin, { boyut: 20, kalinlik: 500, renk: on, alfa: 80 });
      katmanlar.push({ ...e, left: Math.round(x - e.genislik / 2), top: y1 + 12 });
    }
    svg += `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${on}" stroke-width="2"/>`;

    // Fiyat çizgisi ve altındaki hafif dolgu.
    const yol = noktalar.map((p, i) => `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(p.deger).toFixed(1)}`).join('');
    svg += `<path d="${yol}L${x1} ${y1}L${x0} ${y1}Z" fill="${c.vurgu}" opacity="0.08"/>`;
    svg += `<path d="${yol}" fill="none" stroke="${c.veri}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
    const olayRengi = olay ? (olay.yon === 'dusus' ? MUREKKEP.red.fill : MUREKKEP.green.fill) : c.veri;
    if (olay) {
      // Olayın başladığı noktadan (o gün dahil, inceltmede düştüyse önceki nokta) sona kadar.
      let i = noktalar.findIndex((p) => p.tarih >= olay.bas);
      if (i < 0) i = noktalar.length - 1;
      if (i > 0 && noktalar[i].tarih > olay.bas) i--;
      const parca = noktalar.slice(Math.min(i, noktalar.length - 2));
      const oy = parca.map((p, k) => `${k ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(p.deger).toFixed(1)}`).join('');
      svg += `<path d="${oy}" fill="none" stroke="${olayRengi}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    // Referans çizgileri: kesikli, etiketi çizginin hemen üstünde solda (zemin renginde kutuda).
    for (const z of cizgiler) {
      const y = Y(z.deger);
      svg += `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="${on}" stroke-opacity="0.8" stroke-width="2" stroke-dasharray="9 7"/>`;
      if (z.etiket) {
        const e = await yazi(z.etiket, { boyut: 21, kalinlik: 600, renk: on });
        const ust = y - e.yukseklik - 6 > y0 - 10;
        svg += `<rect x="${x0 + 8}" y="${(ust ? y - e.yukseklik - 8 : y + 4).toFixed(1)}" width="${e.genislik + 12}" height="${e.yukseklik + 4}" fill="${zemin}"/>`;
        katmanlar.push({ ...e, left: x0 + 14, top: Math.round(ust ? y - e.yukseklik - 6 : y + 6) });
      }
    }

    // Son değer: nokta ve sağ eksende ters renkli etiket (ön plan renginde kutu, zemin renginde yazı).
    const son = noktalar.at(-1);
    const sx = X(son);
    const sy = Y(son.deger);
    svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="8" fill="${olayRengi}" stroke="${zemin}" stroke-width="3"/>`;
    const se = await yazi(deger(son.deger), { boyut: 22, kalinlik: 700, renk: zemin });
    const kutuY = Math.round(Math.min(Math.max(sy - (se.yukseklik + 10) / 2, y0 - 8), y1 - se.yukseklik - 10));
    svg += `<rect x="${x1 + 6}" y="${kutuY}" width="${Math.max(se.genislik + 16, 100)}" height="${se.yukseklik + 10}" fill="${olayRengi}"/>`;
    katmanlar.push({ ...se, left: x1 + 14, top: kutuY + 5 });

    // Vurgu notu: grafik alanının dört köşesinden çizgiye, referans çizgilerine ve etiketlerine en az değeninde.
    if (vurgu) {
      const v = await yazi(vurgu, { boyut: 24, kalinlik: 700, renk: on });
      const w = v.genislik + 20;
      const h = v.yukseklik + 12;
      const koseler = [
        [x1 - w - 8, y1 - h - 8],
        [x1 - w - 8, y0 + 4],
        [x0 + 8, y1 - h - 8],
        [x0 + 8, y0 + 4],
      ];
      const puan = ([kx, ky]) => {
        let p = 0;
        for (const q of noktalar) {
          const [qx, qy] = [X(q), Y(q.deger)];
          if (qx > kx - 10 && qx < kx + w + 10 && qy > ky - 10 && qy < ky + h + 10) p++;
        }
        // Son değer noktası ve etiketi geniş payla korunur.
        if (sx > kx - 60 && sx < kx + w + 60 && sy > ky - 60 && sy < ky + h + 60) p += 500;
        // Referans çizgisi ve üstündeki etiket (yaklaşık 34 px) için büyük ceza.
        for (const z of cizgiler) {
          const zy = Y(z.deger);
          if (zy > ky - 40 && zy < ky + h + 10) p += 1000;
        }
        return p;
      };
      const [kx, ky] = koseler.reduce((a, k) => (puan(k) < puan(a) ? k : a));
      svg += `<rect x="${kx}" y="${ky}" width="${w}" height="${h}" fill="${zemin}" stroke="${on}" stroke-width="1.5"/>`;
      katmanlar.push({ ...v, left: kx + 10, top: ky + 6 });
    }

    return { svg, katmanlar };
  };
}

// Karne kartı: dönem getirilerini büyükten küçüğe yatay çubuklarla gösterir (sıfır çizgisinin iki yanı).
// satirlar: [{ etiket, deger }] yüzde; cizgi: { deger, etiket } isteğe bağlı referans (ör. enflasyon).
// Kâğıt zemin; yükselen yeşil, düşen kırmızı (veri renkleri), yüzde işaretle de yazılır.
export function karneKapagi({ kategori: slug = 'piyasalar', baslik, tarih, satirlar, cizgi, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { ornek, buyukAbakus: false });
    const katmanlar = [...c.katmanlar];
    let svg = c.svg;
    const on = c.renk;
    let bY = 48;
    if (tarih) {
      const t = await yazi(tarih, { boyut: 26, kalinlik: 700, renk: on, aralik: 0.1, buyukHarf: true });
      katmanlar.push({ ...t, left: 64, top: bY });
      bY += t.yukseklik + 10;
    }
    const b = await yazi(baslik, { boyut: baslik.length > 55 ? 44 : 56, kalinlik: 700, renk: on, genislik: B - 128 });
    katmanlar.push({ ...b, left: 64, top: bY });

    const sirali = [...satirlar].sort((x, y) => y.deger - x.deger);
    const ust0 = bY + b.yukseklik + (cizgi ? 46 : 24);
    const alt = ALAN_H - 24;
    // Az satırlı kartta çubuklar büyür ve alan dikeyde ortalanır.
    const satirH = Math.min(sirali.length <= 8 ? 62 : 40, (alt - ust0) / sirali.length);
    const ust = ust0 + Math.max(0, (alt - ust0 - satirH * sirali.length) / 2 - 10);
    const boyut = Math.max(16, Math.min(28, Math.round(satirH * 0.5)));
    const etiketGen = 330;
    const degerGen = 120;
    const x0 = 64 + etiketGen;
    const x1 = B - 64 - degerGen;
    const degerler = [...sirali.map((s) => s.deger), ...(cizgi ? [cizgi.deger] : []), 0];
    const enAz = Math.min(...degerler);
    const enCok = Math.max(...degerler);
    const X = (v) => x0 + ((v - enAz) / (enCok - enAz || 1)) * (x1 - x0);
    const sifir = X(0);
    const yuzde = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}%${sayi(Math.abs(v), 1)}`;

    for (const [i, s] of sirali.entries()) {
      const y = ust + i * satirH;
      const cubukH = Math.max(6, satirH * 0.58);
      const cy = y + (satirH - cubukH) / 2;
      const xs = X(s.deger);
      const arti = s.deger >= 0;
      svg += `<rect x="${Math.min(sifir, xs).toFixed(1)}" y="${cy.toFixed(1)}" width="${Math.max(2, Math.abs(xs - sifir)).toFixed(1)}" height="${cubukH.toFixed(1)}" fill="${arti ? MUREKKEP.green.fill : MUREKKEP.red.fill}"/>`;
      const e = await yazi(s.etiket, { boyut, kalinlik: 600, renk: on });
      katmanlar.push({ ...e, left: 64, top: Math.round(y + (satirH - e.yukseklik) / 2) });
      const v = await yazi(yuzde(s.deger), { boyut, kalinlik: 700, renk: arti ? MUREKKEP.green.text : MUREKKEP.red.text });
      const vx = Math.max(xs, sifir) + 10;
      katmanlar.push({ ...v, left: Math.round(Math.min(vx, B - 64 - v.genislik)), top: Math.round(y + (satirH - v.yukseklik) / 2) });
    }
    svg += `<line x1="${sifir.toFixed(1)}" y1="${ust - 6}" x2="${sifir.toFixed(1)}" y2="${(ust + sirali.length * satirH + 4).toFixed(1)}" stroke="${on}" stroke-width="2"/>`;
    if (cizgi) {
      const cx = X(cizgi.deger);
      svg += `<line x1="${cx.toFixed(1)}" y1="${ust - 14}" x2="${cx.toFixed(1)}" y2="${(ust + sirali.length * satirH + 4).toFixed(1)}" stroke="${on}" stroke-opacity="0.85" stroke-width="2" stroke-dasharray="7 6"/>`;
      if (cizgi.etiket) {
        const e = await yazi(cizgi.etiket, { boyut: 20, kalinlik: 600, renk: on });
        const sol = cx + 6 + e.genislik > B - 64 ? cx - 6 - e.genislik : cx + 6;
        katmanlar.push({ ...e, left: Math.round(sol), top: Math.round(ust - 14 - e.yukseklik) });
      }
    }
    return { svg, katmanlar };
  };
}

// Günün öne çıkan verileri / ekonomik ajanda kartı (1200×675).
// Kâğıt zemin, üstte pişmiş toprak şerit, sağ üstte küçük abaküs işareti;
// sol üstte "GÜNÜN ÖNE ÇIKAN VERİLERİ" pişmiş toprak etiketi, tarih başlığı;
// altta saat, ülke, gösterge adı, beklenti/önceki ve eğitici özet/eşik notu;
// dipte "finfolis · Karmaşadan uzakta" ve SPK uyarısı.
export function ajandaKapagi({
  tarih = 'Ekonomik Ajanda',
  altBaslik = '',
  maddeler = [],
  ornek = false,
} = {}) {
  return async () => {
    await fontlariDenetle();
    const katmanlar = [];
    let svg = `<rect width="${B}" height="${H}" fill="${R.kagit}"/>`;

    // Üstte 6px pişmiş toprak marka şeridi
    svg += `<rect x="0" y="0" width="${B}" height="6" fill="${KIMLIK.toprak}"/>`;

    // Sağ üstte küçük abaküs işareti (64px)
    svg += abakusSvg({ boyut: 64, zemin: 'acik', vurgu: true, ekler: 'x="1072" y="24"' });

    // Üst Başlık Bloğu
    const ustEtiket = await yazi('GÜNÜN ÖNE ÇIKAN VERİLERİ', {
      boyut: 22,
      kalinlik: 700,
      renk: KIMLIK.toprak,
      aralik: 0.1,
      buyukHarf: true,
    });
    katmanlar.push({ ...ustEtiket, left: 64, top: 28 });

    const anaBaslik = await yazi(tarih, {
      boyut: 38,
      kalinlik: 700,
      renk: R.murekkep,
      aralik: -0.02,
    });
    katmanlar.push({ ...anaBaslik, left: 64, top: 28 + ustEtiket.yukseklik + 4 });

    let ustH = 28 + ustEtiket.yukseklik + 4 + anaBaslik.yukseklik;
    if (altBaslik) {
      const alt = await yazi(altBaslik, {
        boyut: 19,
        kalinlik: 500,
        renk: KIMLIK.gri,
      });
      katmanlar.push({ ...alt, left: 64, top: ustH + 4 });
      ustH += alt.yukseklik + 4;
    }

    // Tablo başlığı
    const tabloY0 = ustH + 16;
    const tabloW = B - 128; // 1072
    svg += `<rect x="64" y="${tabloY0}" width="${tabloW}" height="28" fill="${KIMLIK.soluk}"/>`;

    const colSaat = await yazi('SAAT / ÜLKE', { boyut: 15, kalinlik: 700, renk: KIMLIK.gri, buyukHarf: true });
    katmanlar.push({ ...colSaat, left: 76, top: tabloY0 + 6 });

    const colGosterge = await yazi('GÖSTERGE & DÖNEM', { boyut: 15, kalinlik: 700, renk: KIMLIK.gri, buyukHarf: true });
    katmanlar.push({ ...colGosterge, left: 240, top: tabloY0 + 6 });

    const colDeger = await yazi('BEKLENTİ / ÖNCEKİ', { boyut: 15, kalinlik: 700, renk: KIMLIK.gri, buyukHarf: true });
    katmanlar.push({ ...colDeger, left: 620, top: tabloY0 + 6 });

    const colEsik = await yazi('KRİTİK EŞİK & ANLAMI', { boyut: 15, kalinlik: 700, renk: KIMLIK.gri, buyukHarf: true });
    katmanlar.push({ ...colEsik, left: 840, top: tabloY0 + 6 });

    // Satırlar (6 göstergeye kadar tam sığar; 6'dan fazla ise kritik/yüksek olanlar önceliklendirilir)
    let siraliMaddeler = maddeler;
    if (maddeler.length > 6) {
      const oncelikler = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };
      const kopyalar = [...maddeler].sort(
        (a, b) => (oncelikler[a.onem ?? 'orta'] ?? 2) - (oncelikler[b.onem ?? 'orta'] ?? 2)
      );
      siraliMaddeler = kopyalar.slice(0, 6).sort((a, b) => (a.saat || '').localeCompare(b.saat || ''));
    } else {
      siraliMaddeler = maddeler.slice(0, 6);
    }

    const alanH = H - 65 - (tabloY0 + 32);
    const satirH = Math.min(84, Math.floor(alanH / Math.max(1, siraliMaddeler.length)));
    const sikisik = siraliMaddeler.length >= 6;

    for (const [i, m] of siraliMaddeler.entries()) {
      const y = tabloY0 + 32 + i * satirH;
      // Satır altı ayraç
      svg += `<line x1="64" y1="${y + satirH}" x2="${B - 64}" y2="${y + satirH}" stroke="${KIMLIK.boncukGri}" stroke-width="1"/>`;

      // 1. Sütun: Saat + Ülke Kodu Kutusu
      const saatTxt = await yazi(m.saat ?? '—', { boyut: sikisik ? 20 : 22, kalinlik: 700, renk: R.murekkep });
      katmanlar.push({ ...saatTxt, left: 76, top: y + (sikisik ? 8 : 10) });

      const ulkeKod = m.ulkeKodu ?? (m.ulke ? m.ulke.slice(0, 2).toUpperCase() : 'TR');
      svg += `<rect x="156" y="${y + (sikisik ? 9 : 11)}" width="46" height="22" fill="${KIMLIK.soluk}"/>`;
      const ulkeTxt = await yazi(ulkeKod, { boyut: 14, kalinlik: 700, renk: R.murekkep, aralik: 0.05 });
      katmanlar.push({ ...ulkeTxt, left: 156 + Math.round((46 - ulkeTxt.genislik) / 2), top: y + (sikisik ? 12 : 14) });

      // 2. Sütun: Gösterge Adı + Dönem
      const gostergeTxt = await yazi(m.gosterge, {
        boyut: sikisik ? (m.gosterge.length > 25 ? 18 : 20) : (m.gosterge.length > 28 ? 20 : 22),
        kalinlik: 700,
        renk: R.murekkep,
        genislik: 360,
      });
      katmanlar.push({ ...gostergeTxt, left: 240, top: y + (sikisik ? 6 : 8) });

      if (m.donem) {
        const donemTxt = await yazi(m.donem, { boyut: sikisik ? 14 : 16, kalinlik: 500, renk: KIMLIK.gri });
        katmanlar.push({ ...donemTxt, left: 240, top: y + (sikisik ? 6 : 8) + gostergeTxt.yukseklik + 2 });
      }

      // 3. Sütun: Beklenti ve Önceki
      const bDeger = m.beklenti ? `Bekl: ${m.beklenti}` : (m.aciklanan ? `Açıkl: ${m.aciklanan}` : '—');
      const bTxt = await yazi(bDeger, { boyut: sikisik ? 18 : 19, kalinlik: 700, renk: R.murekkep });
      katmanlar.push({ ...bTxt, left: 620, top: y + (sikisik ? 6 : 8) });

      const oDeger = m.onceki ? `Önceki: ${m.onceki}` : '';
      if (oDeger) {
        const oTxt = await yazi(oDeger, { boyut: sikisik ? 14 : 15, kalinlik: 500, renk: KIMLIK.gri });
        katmanlar.push({ ...oTxt, left: 620, top: y + (sikisik ? 6 : 8) + bTxt.yukseklik + 2 });
      }

      // 4. Sütun: Eğitici Not / Eşik
      let esikNot = m.esik?.aciklama ?? (m.gosterge.toLowerCase().includes('pmi') ? 'Eşik 50 · Üzeri büyüme' : (m.not ?? ''));
      if (!esikNot && m.nedenOnemli) {
        esikNot = m.nedenOnemli.slice(0, 48) + (m.nedenOnemli.length > 48 ? '…' : '');
      }
      if (esikNot) {
        svg += `<circle cx="848" cy="${y + (sikisik ? 17 : 20)}" r="4" fill="${KIMLIK.toprak}"/>`;
        const esikTxt = await yazi(esikNot, {
          boyut: sikisik ? 15 : 16,
          kalinlik: 600,
          renk: KIMLIK.toprak,
          genislik: 280,
        });
        katmanlar.push({ ...esikTxt, left: 858, top: y + (sikisik ? 8 : 10) });
      }
    }

    // Dip Alanı: Marka ve SPK Uyarısı
    const logoTxt = await yazi('finfolis', { boyut: 32, kalinlik: 600, renk: R.murekkep, aralik: -0.03 });
    katmanlar.push({ ...logoTxt, left: 64, top: H - 48 });

    const sloganTxt = await yazi('· Karmaşadan uzakta', { boyut: 19, kalinlik: 400, renk: KIMLIK.gri });
    katmanlar.push({ ...sloganTxt, left: 64 + logoTxt.genislik + 8, top: H - 42 });

    const spkTxt = await yazi('Bilgilendirme amaçlıdır · Yatırım tavsiyesi değildir', {
      boyut: 17,
      kalinlik: 500,
      renk: KIMLIK.gri,
    });
    katmanlar.push({ ...spkTxt, left: B - 64 - spkTxt.genislik, top: H - 42 });

    if (ornek) {
      const o = await yazi('Örnek veri', { boyut: 18, kalinlik: 600, renk: R.murekkep, alfa: 70 });
      katmanlar.push({ ...o, left: Math.round((B - o.genislik) / 2), top: H - 42 });
    }

    return { svg, katmanlar };
  };
}

// ── PNG'ye çevirme ─────────────────────────────────────────────────────

// Uzun bir şirket adı ya da büyük bir rakam görselden taşarsa katman, oranı korunarak
// kalan alana sığacak şekilde küçültülür (sharp taşan katmanı reddeder).
async function sigdir({ input, left, top, genislik, yukseklik }) {
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  const enFazlaG = B - KENAR / 2 - x;
  const enFazlaY = H - y;
  if (genislik <= enFazlaG && yukseklik <= enFazlaY) return { input, left: x, top: y };
  const kucuk = await sharp(input).resize({ width: enFazlaG, height: enFazlaY, fit: 'inside' }).png().toBuffer();
  return { input: kucuk, left: x, top: y };
}

export async function kapakCiz(tur) {
  await fontlariDenetle();
  const { svg, katmanlar } = await tur();
  const taban = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">${svg}</svg>`;
  return sharp(Buffer.from(taban))
    .composite(await Promise.all(katmanlar.map(sigdir)))
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
}
