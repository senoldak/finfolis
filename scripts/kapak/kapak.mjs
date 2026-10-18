// Haber kapakları: görseli kendi verimizden çizeriz (simge dizisi, büyük rakam, kategori kartı),
// dışarıdan fotoğraf alınmaz; telif ya da atıf derdi olmaz. tidsrost'taki bilde.mjs'in finfolis karşılığı.
// Şekiller SVG olarak çizilir, yazılar sitenin fontlarıyla (Jost, Literata) sharp/Pango ile basılır,
// sonuç 1200×675 (16:9) PNG olur. Kullanım: const png = await kapakCiz(kaynakKapagi({...}))
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIMGELER } from '../../src/lib/simgeler.js';
import { CATEGORIES } from '../../src/lib/kategoriler.js';
import { ISARET_D } from './isaret.mjs';

const B = 1200;
const H = 675;
const KENAR = 72;
const FONT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts');

// Renkler global.css ile aynı (DESIGN.md).
const R = {
  kagit: '#f4f3ee',
  murekkep: '#1b1b1b',
  murekkep2: '#3d3c38',
  soluk: '#5d5b55',
  ince: '#cfccc2',
};
const MUREKKEP = {
  red: { fill: '#c43d2b', text: '#b2351f' },
  blue: { fill: '#2e5d8a', text: '#2e5d8a' },
  ochre: { fill: '#e0b43a', text: '#80600c' },
  green: { fill: '#3f7350', text: '#3a6b4a' },
  brown: { fill: '#8b5a3c', text: '#83533a' },
  black: { fill: '#1b1b1b', text: '#1b1b1b' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sayi = (n, d = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

function kategori(slug) {
  const c = CATEGORIES.find((k) => k.slug === slug) ?? CATEGORIES[0];
  return { ...c, renk: MUREKKEP[c.ink] };
}

// Bir simgeyi (24×24) x,y noktasına, boyut px'te çizer; kesir < 1 ise sağdan kırpılır.
let klipNo = 0;
function simge(ad, x, y, boyut, renk, { kesir = 1, opaklik = 1 } = {}) {
  const s = boyut / 24;
  const parcalar = SIMGELER[ad]
    .map((p) => `<path d="${p.d}"${p.evenodd ? ' fill-rule="evenodd"' : ''}${p.soluk ? ` opacity="${p.soluk}"` : ''}/>`)
    .join('');
  let klip = '';
  let klipAttr = '';
  if (kesir < 1) {
    const id = `k${++klipNo}`;
    klip = `<clipPath id="${id}"><rect x="0" y="0" width="${(24 * kesir).toFixed(2)}" height="24"/></clipPath>`;
    klipAttr = ` clip-path="url(#${id})"`;
  }
  return `${klip}<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})" fill="${renk}" opacity="${opaklik}"${klipAttr}>${parcalar}</g>`;
}

// Isotype satırı: miktar / birim kadar simge, onluk gruplar, son simge kesirli olabilir.
function isoSatir(ad, miktar, birim, x, y, boyut, renk, opaklik = 1) {
  const tam = Math.floor(miktar / birim);
  const kesir = Math.round(((miktar / birim) % 1) * 100) / 100;
  const adim = boyut + boyut * 0.12;
  const grupAra = boyut * 0.45;
  let out = '';
  let cx = x;
  const toplam = tam + (kesir >= 0.1 ? 1 : 0);
  for (let i = 0; i < toplam; i++) {
    if (i && i % 10 === 0) cx += grupAra;
    out += simge(ad, cx, y, boyut, renk, { kesir: i === tam ? kesir : 1, opaklik });
    cx += adim;
  }
  return { svg: out, bitis: cx };
}

// ── Yazı katmanları ────────────────────────────────────────────────────

// Bir metni sitenin fontuyla PNG olarak basar; genişlik verilirse kelimeden kaydırır.
async function yazi(metin, { aile = 'Jost', boyut = 32, kalinlik = 400, renk = R.murekkep, genislik, aralik = 0, satirAraligi, buyukHarf = false, alfa }) {
  const icerik = esc(buyukHarf ? metin.toLocaleUpperCase('tr-TR') : metin);
  const harf = aralik ? ` letter_spacing="${Math.round(aralik * boyut * 1024)}"` : '';
  const sa = alfa ? ` alpha="${alfa}%"` : '';
  const markup = `<span foreground="${renk}" font_weight="${kalinlik}"${harf}${sa}>${icerik}</span>`;
  const { data, info } = await sharp({
    text: {
      text: markup,
      font: `${aile} ${boyut}`,
      fontfile: path.join(FONT, `${aile}.ttf`),
      rgba: true,
      dpi: 72,
      ...(genislik ? { width: genislik, wrap: 'word' } : {}),
      ...(satirAraligi ? { spacing: Math.round(satirAraligi) } : {}),
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, genislik: info.width, yukseklik: info.height };
}


// Yazı tipi bekçisi: sharp/Pango yazı tipi dosyasını yükleyemezse hata vermeden başka bir yazı tipine düşer ve kapak
// sessizce bozulur. Kullanılan her aile+kalınlık için bilinen bir metin çizilir; genişlik, yükseklik ve mürekkep
// (alfa toplamı) ölçülmüş parmak iziyle karşılaştırılır; komşu kalınlıklar da ayırt edilir (ör. Jost-600 ile 700).
export const FONT_IZI = {
  'Jost-500': { w: 1363, h: 115, murekkep: 34575 },
  'Jost-600': { w: 1402, h: 118, murekkep: 40463 },
  'Jost-700': { w: 1447, h: 122, murekkep: 46243 },
  'Literata-400': { w: 1388, h: 116, murekkep: 25860 },
  'Literata-500': { w: 1420, h: 117, murekkep: 30497 },
  'Literata-600': { w: 1449, h: 118, murekkep: 34814 },
  'Literata-700': { w: 1488, h: 121, murekkep: 41280 },
};
export async function fontIzi(aile, kalinlik) {
  const { data, info } = await sharp({
    text: { text: `<span font_weight="${kalinlik}">Hamburgefonstiv ığşİ ÖÇ 0123</span>`, font: `${aile} 100`, fontfile: path.join(FONT, `${aile}.ttf`), rgba: true, dpi: 72 },
  }).raw().toBuffer({ resolveWithObject: true });
  let a = 0;
  for (let i = 3; i < data.length; i += 4) a += data[i];
  return { w: info.width, h: info.height, murekkep: Math.round(a / 255) };
}
export function izUyusuyor(iz, bek) {
  return !(Math.abs(iz.w - bek.w) / bek.w > 0.02 || Math.abs(iz.h - bek.h) > 6 || Math.abs(iz.murekkep - bek.murekkep) / bek.murekkep > 0.07);
}
let fontlarTamam = null;
export function fontlariDenetle() {
  fontlarTamam ??= (async () => {
    for (const [ad, bek] of Object.entries(FONT_IZI)) {
      const [aile, kalinlik] = ad.split('-');
      const iz = await fontIzi(aile, kalinlik);
      if (!izUyusuyor(iz, bek)) throw new Error(`::error::Yazı tipi ${ad} yüklenmedi ya da başka yazı tipine düşüldü (ölçülen ${JSON.stringify(iz)}, beklenen ${JSON.stringify(bek)})`);
    }
  })();
  fontlarTamam.catch(() => { fontlarTamam = null; });
  return fontlarTamam;
}

// ── Kapak türleri ──────────────────────────────────────────────────────
// Her fonksiyon { svg, katmanlar } üreten bir async fonksiyon döner; kapakCiz bunu PNG'ye çevirir.

// ── Mürekkep bloğu düzeni (tüm türler; veri kapakları 2026-10-18'de geçti) ──
// Tüm zemin kategorinin mürekkep rengidir; yazı, işaret ve simge kâğıt renginde. Okunaklılık (WCAG 4,5:1) kâğıt
// rengiyle: kırmızı 4,67, mavi 6,20, yeşil 5,00, kahve 5,21, siyah 15,5; koyu sarıda (ochre) yalnız 1,76 olduğundan
// orada yazı, işaret ve simge mürekkep rengine (#1b1b1b, 8,82:1) döner.
const ALT_BANT = 130; // altta marka + kategori şeridinin ayırdığı yükseklik
const SAG_BOSLUK = 80; // başlık sağ üstteki simgenin altına taşmasın
const YAZI_GEN = B - 128 - SAG_BOSLUK;

function isaretCiz(x, y, boyut, renk) {
  return `<path transform="translate(${x} ${y}) scale(${boyut / 497}) translate(-62.9 -72.5)" d="${ISARET_D}" fill="${renk}" fill-rule="evenodd"/>`;
}

// Zemin, dev simge, alt bant (marka solda, kategori adı sağda) ve varsa "Örnek veri" notu.
// simgeYok: veri kapaklarında (gösterge, grafik, karne) büyük silik simge verinin arkasında kalabalık eder, çizilmez.
// Açık (beyaz zeminli) düzen, sahibin kararları 2026-10-18:
//  - veri kapakları (grafik, karne, gösterge) her kategoride beyaz zemin: veri öne çıkar, yeşil/kırmızı okunur;
//  - Döviz & Altın (ochre) haber kapakları da beyaz: tam sarı zemin boğucuydu.
// Açıkta yazı mürekkep, kategori rengi yalnız vurgu. Dönüş: renk = ön plan, vurgu = dolgu/simge rengi,
// veri = çizgi ve son değer rengi (sarıda okunaklı koyu ton), zemin.
const BEYAZ = '#ffffff';
async function murekkepCerceve(kat, { ornek, simgeYok = false, beyaz = false } = {}) {
  const acik = beyaz || kat.ink === 'ochre';
  const renk = acik ? R.murekkep : R.kagit;
  const vurgu = acik ? kat.renk.fill : renk;
  const veri = acik ? (kat.ink === 'ochre' ? kat.renk.text : kat.renk.fill) : renk;
  const zemin = acik ? BEYAZ : kat.renk.fill;
  await fontlariDenetle();
  let svg = `<rect width="${B}" height="${H}" fill="${zemin}"/>`;
  if (!simgeYok) svg += simge(kat.icon, B - 64 - 300, 40, 300, vurgu, { opaklik: acik ? 0.22 : 0.16 });
  svg += isaretCiz(64, H - 112, 52, renk);
  const ad = await yazi('finfolis', { aile: 'Jost', boyut: 40, kalinlik: 700, renk });
  const ka = await yazi(kat.name, { aile: 'Jost', boyut: 30, kalinlik: 700, renk: acik ? kat.renk.text : renk, aralik: 0.1, buyukHarf: true });
  const katmanlar = [
    { ...ad, left: 128, top: Math.round(H - 86 - ad.yukseklik / 2) },
    { ...ka, left: B - 64 - ka.genislik, top: Math.round(H - 86 - ka.yukseklik / 2) },
  ];
  if (ornek) {
    const o = await yazi('Örnek veri', { aile: 'Jost', boyut: 20, kalinlik: 600, renk, alfa: 70 });
    katmanlar.push({ ...o, left: Math.round((B - o.genislik) / 2), top: Math.round(H - 86 - o.yukseklik / 2) });
  }
  return { svg, katmanlar, renk, vurgu, veri, zemin, acik };
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

const ALAN_H = H - ALT_BANT; // alt bantın üstündeki alan

// Başlık: Literata kalın, alt bantın üstündeki alanda dikey ortalı.
async function baslikKapagi(kat, baslik, { ornek, alt } = {}) {
  const c = await murekkepCerceve(kat, { ornek });
  const a = alt ? await yazi(alt, { aile: 'Literata', boyut: 34, kalinlik: 500, renk: c.renk, genislik: YAZI_GEN }) : null;
  const ekH = a ? a.yukseklik + 20 : 0;
  const b = await sigdirYazi(baslik, { aile: 'Literata', boyut: 92, kalinlik: 700, renk: c.renk, genislik: YAZI_GEN, satirAraligi: -6 }, ALAN_H - 80 - ekH, 56);
  const y0 = Math.round((ALAN_H - b.yukseklik - ekH) / 2);
  const katmanlar = [...c.katmanlar, { ...b, left: 64, top: y0 }];
  if (a) katmanlar.push({ ...a, left: 64, top: y0 + b.yukseklik + 20 });
  return { svg: c.svg, katmanlar };
}

// Haber kartı: yalnız kategori rengi, simge ve başlık. Spot, bölge, rakam ve kaynak görsele yazılmaz.
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
    const c = await murekkepCerceve(kat, {});
    const u = tarih ? await yazi(tarih, { aile: 'Jost', boyut: 30, kalinlik: 700, renk: c.renk, aralik: 0.1, buyukHarf: true }) : null;
    const t = await yazi(saat ? `${saat} bülteni` : 'Piyasa bülteni', { aile: 'Literata', boyut: 84, kalinlik: 700, renk: c.renk, genislik: YAZI_GEN, satirAraligi: -6 });
    const maddeler = basliklar.slice(0, 3).map((b) => `—  ${b.length > 80 ? `${b.slice(0, 77)}…` : b}`);
    let ms = [];
    const ara = 14;
    const ustH = (u ? u.yukseklik + 18 : 0) + t.yukseklik + (maddeler.length ? 24 : 0);
    for (let boyut = 36; ; boyut -= 2) {
      ms = [];
      for (const m of maddeler) ms.push(await yazi(m, { aile: 'Literata', boyut, kalinlik: 500, renk: c.renk, genislik: YAZI_GEN }));
      const toplam = ms.reduce((n, m) => n + m.yukseklik + ara, -ara);
      if (!maddeler.length || ustH + toplam <= ALAN_H - 70 || boyut <= 26) break;
    }
    const blokH = ustH + ms.reduce((n, m) => n + m.yukseklik + ara, -ara);
    let y = Math.max(40, Math.round((ALAN_H - blokH) / 2));
    const katmanlar = [...c.katmanlar];
    if (u) { katmanlar.push({ ...u, left: 64, top: y }); y += u.yukseklik + 18; }
    katmanlar.push({ ...t, left: 64, top: y });
    y += t.yukseklik + 24;
    for (const m of ms) { katmanlar.push({ ...m, left: 64, top: y }); y += m.yukseklik + ara; }
    return { svg: c.svg, katmanlar };
  };
}

// Rakam kartı: rakam kahramandır (Jost 600, genişliğe sığana dek küçülür); üstünde etiket, altında kısa satır.
// Açık düzen (2026-10-18): beyaz zemin; rakam kategori renginde, etiket ve alt satır mürekkep.
export function rakamKapagi({ kategori: slug, ust, rakam, alt, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await murekkepCerceve(kat, { ornek, beyaz: true });
    const u = await yazi(ust, { aile: 'Jost', boyut: 30, kalinlik: 700, renk: c.renk, aralik: 0.1, buyukHarf: true, genislik: YAZI_GEN });
    const a = alt ? await yazi(alt, { aile: 'Literata', boyut: 36, kalinlik: 500, renk: c.renk, genislik: YAZI_GEN }) : null;
    let r;
    for (let boyut = 180; ; boyut -= 4) {
      r = await yazi(rakam, { aile: 'Jost', boyut, kalinlik: 600, renk: c.veri });
      if (r.genislik <= YAZI_GEN || boyut <= 72) break;
    }
    const ara = 16;
    const blokH = u.yukseklik + ara + r.yukseklik + (a ? 8 + a.yukseklik : 0);
    const y0 = Math.max(24, Math.round((ALAN_H - blokH) / 2));
    const katmanlar = [...c.katmanlar, { ...u, left: 64, top: y0 }, { ...r, left: 60, top: y0 + u.yukseklik + ara }];
    if (a) katmanlar.push({ ...a, left: 64, top: y0 + u.yukseklik + ara + r.yukseklik + 8 });
    return { svg: c.svg, katmanlar };
  };
}


// Resimli istatistik: birkaç dönemin değeri simge dizileriyle (1 simge = birim).
// satirlar: [{ etiket: '2024', deger: 9831 }], son satır güncel değerdir (tam ton), öncekiler soluk.
// Açık düzen (2026-10-18): beyaz zemin, yazılar mürekkep, simgeler kategori renginde.
export function gostergeKapagi({ kategori: slug, baslik, simge: simgeAdi, birim, birimEtiket, satirlar, ondalik = 0, onEk = '', sonEk = '', ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await murekkepCerceve(kat, { ornek, simgeYok: true, beyaz: true });
    const b = await yazi(baslik, { aile: 'Literata', boyut: 56, kalinlik: 700, renk: c.renk, genislik: B - 128, satirAraligi: -4 });
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
      const satir = isoSatir(simgeAdi, s.deger, birim, 64 + etiketGen, y, boyut, c.vurgu, guncel ? 1 : 0.42);
      svg += satir.svg;
      const d = await yazi(`${onEk}${sayi(s.deger, ondalik)}${sonEk}`, { boyut: 30, kalinlik: guncel ? 700 : 500, renk: c.renk, alfa: guncel ? undefined : 70 });
      katmanlar.push({ ...d, left: Math.round(satir.bitis + 16), top: Math.round(y + (boyut - d.yukseklik) / 2) });
    }

    // Lejant: 1 simge = birim.
    const ly = ALAN_H - 50;
    svg += simge(simgeAdi, 64, ly, 26, c.vurgu);
    const l = await yazi(`= ${birimEtiket}`, { boyut: 24, kalinlik: 500, renk: c.renk, alfa: 80 });
    katmanlar.push({ ...l, left: 64 + 36, top: Math.round(ly + (26 - l.yukseklik) / 2) });
    return { svg, katmanlar };
  };
}

// Eşik grafiği: bir göstergenin fiyat çizgisi, kesikli referans çizgileri (önceki rekor, zirve) ve son değer etiketi.
// seri: [{ tarih: 'YYYY-MM-DD', deger }] tarih sırasıyla; cizgiler: [{ deger, etiket }]; vurgu: grafiğin üstündeki kısa not.
// Kırmızı/yeşil alarm rengi kullanılmaz: çizgi kategori renginde, referanslar mürekkep tonunda.
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

// Açık düzen (2026-10-18): beyaz zemin, yazı ve eksen mürekkep, çizgi ve dolgu kategori renginde.
export function grafikKapagi({ kategori: slug, baslik, seri, cizgiler = [], vurgu, ondalik = 2, onEk = '', sonEk = '', ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await murekkepCerceve(kat, { ornek, simgeYok: true, beyaz: true });
    const katmanlar = [...c.katmanlar];
    let svg = c.svg;
    const on = c.renk;
    const zemin = c.zemin;
    const deger = (n) => `${onEk}${sayi(n, ondalik)}${sonEk}`;

    const b = await yazi(baslik, { aile: 'Literata', boyut: baslik.length > 60 ? 44 : 56, kalinlik: 700, renk: on, genislik: B - 128, satirAraligi: -4 });
    const bY = 48;
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
      const e = await yazi(sayi(v, eksenOndalik), { boyut: 20, kalinlik: 500, renk: on, alfa: 80 });
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
    svg += `<path d="${yol}L${x1} ${y1}L${x0} ${y1}Z" fill="${c.vurgu}" opacity="${kat.ink === 'ochre' ? 0.4 : 0.16}"/>`;
    svg += `<path d="${yol}" fill="none" stroke="${c.veri}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;

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
    svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="8" fill="${c.veri}" stroke="${zemin}" stroke-width="3"/>`;
    const se = await yazi(deger(son.deger), { boyut: 22, kalinlik: 700, renk: zemin });
    const kutuY = Math.round(Math.min(Math.max(sy - (se.yukseklik + 10) / 2, y0 - 8), y1 - se.yukseklik - 10));
    svg += `<rect x="${x1 + 6}" y="${kutuY}" width="${Math.max(se.genislik + 16, 100)}" height="${se.yukseklik + 10}" fill="${c.veri}"/>`;
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
// Açık düzen (2026-10-18): beyaz zemin; yükselen yeşil, düşen kırmızı (sitenin mürekkep tonları).
export function karneKapagi({ kategori: slug = 'piyasalar', baslik, tarih, satirlar, cizgi, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await murekkepCerceve(kat, { ornek, simgeYok: true, beyaz: true });
    const katmanlar = [...c.katmanlar];
    let svg = c.svg;
    const on = c.renk;
    let bY = 48;
    if (tarih) {
      const t = await yazi(tarih, { aile: 'Jost', boyut: 26, kalinlik: 700, renk: on, aralik: 0.1, buyukHarf: true });
      katmanlar.push({ ...t, left: 64, top: bY });
      bY += t.yukseklik + 10;
    }
    const b = await yazi(baslik, { aile: 'Literata', boyut: baslik.length > 55 ? 44 : 56, kalinlik: 700, renk: on, genislik: B - 128 });
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
