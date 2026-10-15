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

// finfolis işaretinin viewBox'ı (brand/finfolis-mark.svg).
const ISARET_VB = '62.9 72.5 497.1 497.1';

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
async function yazi(metin, { aile = 'Jost', boyut = 32, kalinlik = 400, renk = R.murekkep, genislik, aralik = 0, satirAraligi, buyukHarf = false }) {
  const icerik = esc(buyukHarf ? metin.toLocaleUpperCase('tr-TR') : metin);
  const harf = aralik ? ` letter_spacing="${Math.round(aralik * boyut * 1024)}"` : '';
  const markup = `<span foreground="${renk}" font_weight="${kalinlik}"${harf}>${icerik}</span>`;
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

// ── Ortak çerçeve ──────────────────────────────────────────────────────

// Üstte kategori renginde 14px şerit, altta 4px mürekkep çizgi; altında işaret + ad.
// Kaynak adı görsele yazılmaz (yalnızca örnek kapaklarda "Örnek veri" notu çıkar).
async function cerceve(kat, { kaynak, ornek }) {
  const altY = H - 92;
  const svg = `<rect width="${B}" height="${H}" fill="${R.kagit}"/>
<rect width="${B}" height="14" fill="${kat.renk.fill}"/>
<rect x="${KENAR}" y="${altY}" width="${B - KENAR * 2}" height="4" fill="${R.murekkep}"/>
<svg x="${KENAR}" y="${altY + 26}" width="40" height="40" viewBox="${ISARET_VB}"><path fill-rule="evenodd" fill="${R.murekkep}" d="${ISARET_D}"/></svg>`;
  const ad = await yazi('finfolis', { boyut: 34, kalinlik: 700 });
  const katmanlar = [{ ...ad, left: KENAR + 52, top: altY + 26 + Math.round((40 - ad.yukseklik) / 2) }];
  const not = ornek ? 'Örnek veri' : '';
  if (not) {
    const k = await yazi(not, { boyut: 22, kalinlik: 500, renk: R.soluk });
    katmanlar.push({ ...k, left: B - KENAR - k.genislik, top: altY + 26 + Math.round((40 - k.yukseklik) / 2) });
  }
  return { svg, katmanlar };
}

async function kategoriEtiketi(kat, x, y) {
  const e = await yazi(kat.name, { boyut: 26, kalinlik: 600, renk: kat.renk.text, aralik: 0.1, buyukHarf: true });
  return {
    svg: simge(kat.icon, x, y + Math.round((e.yukseklik - 28) / 2), 28, kat.renk.fill),
    katman: { ...e, left: x + 40, top: y },
    yukseklik: e.yukseklik,
  };
}

// ── Kapak türleri ──────────────────────────────────────────────────────
// Her fonksiyon { svg, katmanlar } üreten bir async fonksiyon döner; kapakCiz bunu PNG'ye çevirir.

// ── Kapak türleri ──────────────────────────────────────────────────────
// Her fonksiyon { svg, katmanlar } üreten bir async fonksiyon döner; kapakCiz bunu PNG'ye çevirir.

// Haber kartı (Standart haberler için): Başlık ana odak noktasıdır.
// Rakam varsa sağ tarafta şık, çerçeveli bir veri kutusunda bağlamıyla gösterilir (kocaman 210px yerine).
// Rakam yoksa tam genişlikte zarif başlık ve spot paragrafı durur.
export function haberKapagi({ kategori: slug, baslik, spot, bolge, rakam, kaynak, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { kaynak, ornek });

    // Üst başlık (Kategori simgesi + Kategori adı + opsiyonel Bölge)
    const ustY = 64;
    const katYazi = await yazi(kat.name, { boyut: 24, kalinlik: 700, renk: kat.renk.text, aralik: 0.08, buyukHarf: true });
    const ustKatmanlar = [{ ...katYazi, left: KENAR + 38, top: ustY }];
    const ustSvg = simge(kat.icon, KENAR, ustY + Math.round((katYazi.yukseklik - 26) / 2), 26, kat.renk.fill);

    if (bolge) {
      const bYazi = await yazi(`· ${bolge.toLocaleUpperCase('tr-TR')}`, { boyut: 22, kalinlik: 500, renk: R.soluk, aralik: 0.05 });
      ustKatmanlar.push({ ...bYazi, left: KENAR + 38 + katYazi.genislik + 12, top: ustY + Math.round((katYazi.yukseklik - bYazi.yukseklik) / 2) });
    }

    // Üst ayırıcı ince çizgi
    const ayiriciY = ustY + katYazi.yukseklik + 20;
    let ortaSvg = `<line x1="${KENAR}" y1="${ayiriciY}" x2="${B - KENAR}" y2="${ayiriciY}" stroke="${R.ince}" stroke-width="1"/>`;

    const katmanlar = [...c.katmanlar, ...ustKatmanlar];
    const icerikTop = ayiriciY + 32;
    const maxIcerikH = H - 92 - icerikTop - 20;

    if (rakam && rakam.deger) {
      // ── DÜZEN A: Rakam Kartlı İki Kolonlu Gazete Düzeni ──
      // Sol: Başlık + Spot (660px)
      // Sağ: Şık çerçeveli Veri Kutusu (330px)
      const solGenislik = 660;
      const sagGenislik = 330;
      const sagX = B - KENAR - sagGenislik;

      const bBoyut = baslik.length > 80 ? 44 : baslik.length > 50 ? 50 : 58;
      const b = await yazi(baslik, {
        aile: 'Literata',
        boyut: bBoyut,
        kalinlik: 600,
        genislik: solGenislik,
        satirAraligi: -4,
      });

      let s = null;
      if (spot) {
        const temizSpot = spot.length > 130 ? `${spot.slice(0, 126)}…` : spot;
        s = await yazi(temizSpot, {
          aile: 'Literata',
          boyut: 25,
          kalinlik: 400,
          renk: R.murekkep2,
          genislik: solGenislik,
          satirAraligi: 4,
        });
      }

      const solToplamH = b.yukseklik + (s ? 18 + s.yukseklik : 0);
      const solY = icerikTop + Math.max(0, Math.round((maxIcerikH - solToplamH) / 2));
      katmanlar.push({ ...b, left: KENAR, top: solY });
      if (s) {
        katmanlar.push({ ...s, left: KENAR, top: solY + b.yukseklik + 18 });
      }

      // Sağ Rakam Kartı
      const kartH = 250;
      const kartY = icerikTop + Math.max(0, Math.round((maxIcerikH - kartH) / 2));

      ortaSvg += `
        <rect x="${sagX}" y="${kartY}" width="${sagGenislik}" height="${kartH}" fill="#ffffff" stroke="${kat.renk.fill}" stroke-width="2"/>
        <rect x="${sagX}" y="${kartY}" width="${sagGenislik}" height="6" fill="${kat.renk.fill}"/>
        <line x1="${sagX + 24}" y1="${kartY + 64}" x2="${sagX + sagGenislik - 24}" y2="${kartY + 64}" stroke="${R.ince}" stroke-width="1"/>
      `;

      const etiketYazi = await yazi(rakam.etiket || 'GÖSTERGE', {
        boyut: 18,
        kalinlik: 600,
        renk: kat.renk.text,
        genislik: sagGenislik - 48,
        buyukHarf: true,
        aralik: 0.05,
      });
      katmanlar.push({
        ...etiketYazi,
        left: sagX + 24,
        top: kartY + 20 + Math.round((44 - etiketYazi.yukseklik) / 2),
      });

      const dLen = rakam.deger.length;
      const rBoyut = dLen > 11 ? 40 : dLen > 8 ? 50 : 62;
      const rYazi = await yazi(rakam.deger, {
        aile: 'Jost',
        boyut: rBoyut,
        kalinlik: 700,
        renk: R.murekkep,
        genislik: sagGenislik - 48,
      });
      katmanlar.push({
        ...rYazi,
        left: sagX + 24,
        top: kartY + 80 + Math.round((kartH - 96 - rYazi.yukseklik) / 2),
      });
    } else {
      // ── DÜZEN B: Tam Genişlik Başlık Odaklı Kart ──
      const tamGen = B - KENAR * 2;
      const bBoyut = baslik.length > 90 ? 46 : baslik.length > 55 ? 54 : 64;
      const b = await yazi(baslik, {
        aile: 'Literata',
        boyut: bBoyut,
        kalinlik: 600,
        genislik: tamGen,
        satirAraligi: -4,
      });

      let s = null;
      if (spot) {
        const temizSpot = spot.length > 180 ? `${spot.slice(0, 175)}…` : spot;
        s = await yazi(temizSpot, {
          aile: 'Literata',
          boyut: 29,
          kalinlik: 400,
          renk: R.murekkep2,
          genislik: tamGen - 60,
          satirAraligi: 6,
        });
      }

      const toplamH = b.yukseklik + (s ? 24 + s.yukseklik : 0);
      const y0 = icerikTop + Math.max(0, Math.round((maxIcerikH - toplamH) / 2));
      katmanlar.push({ ...b, left: KENAR, top: y0 });
      if (s) {
        const cizgiY = y0 + b.yukseklik + 14;
        ortaSvg += `<line x1="${KENAR}" y1="${cizgiY}" x2="${KENAR + 60}" y2="${cizgiY}" stroke="${kat.renk.fill}" stroke-width="3"/>`;
        katmanlar.push({ ...s, left: KENAR, top: y0 + b.yukseklik + 30 });
      }
    }

    return { svg: c.svg + ustSvg + ortaSvg, katmanlar };
  };
}

// Kategori / Kurum / Dosya kartı: özel dosya veya şirket duyuruları için.
// (Eski 300px dev ikon kaldırıldı; yerine zarif tipografik düzen getirildi)
export function kaynakKapagi({ kategori: slug, konu, alt, kaynak, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { kaynak, ornek });
    const et = await kategoriEtiketi(kat, KENAR, 64);
    const ayiriciY = 64 + et.yukseklik + 20;
    let ortaSvg = `<line x1="${KENAR}" y1="${ayiriciY}" x2="${B - KENAR}" y2="${ayiriciY}" stroke="${R.ince}" stroke-width="1"/>`;

    const gen = B - KENAR * 2;
    const k = await yazi(konu, { aile: 'Literata', boyut: konu.length > 40 ? 56 : 68, kalinlik: 600, genislik: gen, satirAraligi: -4 });
    const a = alt ? await yazi(alt, { aile: 'Literata', boyut: 32, kalinlik: 400, renk: R.murekkep2, genislik: gen }) : null;

    const icerikTop = ayiriciY + 36;
    const maxH = H - 92 - icerikTop - 20;
    const blokH = k.yukseklik + (a ? 24 + a.yukseklik : 0);
    const y0 = icerikTop + Math.max(0, Math.round((maxH - blokH) / 2));

    const katmanlar = [...c.katmanlar, et.katman, { ...k, left: KENAR, top: y0 }];
    if (a) {
      const cizgiY = y0 + k.yukseklik + 14;
      ortaSvg += `<line x1="${KENAR}" y1="${cizgiY}" x2="${KENAR + 60}" y2="${cizgiY}" stroke="${kat.renk.fill}" stroke-width="3"/>`;
      katmanlar.push({ ...a, left: KENAR, top: y0 + k.yukseklik + 28 });
    }

    return { svg: c.svg + et.svg + ortaSvg, katmanlar };
  };
}

// Bülten kartı: "Piyasa bülteni" (saat verilirse "14:00 bülteni"), altında öne çıkan başlıklar, sağ üstte tarih.
export function bultenKapagi({ saat, tarih, basliklar = [] }) {
  return async () => {
    const kat = kategori('piyasalar');
    const c = await cerceve(kat, {});
    const et = await kategoriEtiketi(kat, KENAR, 64);
    const gen = B - KENAR * 2;
    const t = await yazi(saat ? `${saat} bülteni` : 'Piyasa bülteni', { boyut: 76, kalinlik: 700, genislik: gen });
    const d = await yazi(tarih, { boyut: 26, kalinlik: 500, renk: R.soluk });
    const ms = [];
    for (const b of basliklar.slice(0, 3)) {
      ms.push(await yazi(`—  ${b.length > 80 ? `${b.slice(0, 77)}…` : b}`, { aile: 'Literata', boyut: 30, kalinlik: 500, renk: R.murekkep2, genislik: gen }));
    }
    const ara = 16;
    const blokH = t.yukseklik + (ms.length ? 32 + ms.reduce((n, m) => n + m.yukseklik + ara, -ara) : 0);
    const ayiriciY = 64 + et.yukseklik + 20;
    const ortaSvg = `<line x1="${KENAR}" y1="${ayiriciY}" x2="${B - KENAR}" y2="${ayiriciY}" stroke="${R.ince}" stroke-width="1"/>`;
    const icerikTop = ayiriciY + 30;
    const maxH = H - 92 - icerikTop - 20;
    let y = icerikTop + Math.max(0, Math.round((maxH - blokH) / 2));
    const katmanlar = [...c.katmanlar, et.katman, { ...t, left: KENAR - 2, top: y }];
    y += t.yukseklik + 32;
    for (const m of ms) {
      katmanlar.push({ ...m, left: KENAR, top: y });
      y += m.yukseklik + ara;
    }
    katmanlar.push({ ...d, left: B - KENAR - d.genislik, top: 64 + Math.round((et.yukseklik - d.yukseklik) / 2) });
    return { svg: c.svg + et.svg + ortaSvg, katmanlar };
  };
}

// Makro rakam kartı: tek bir sayının haberi (faiz kararı, enflasyon, kur sıçraması).
// (Eski 210px dev font yerine: dengeli 100-112px rakam + belirgin başlık/bağlam)
export function rakamKapagi({ kategori: slug, ust, rakam, alt, kaynak, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { kaynak, ornek });
    const et = await kategoriEtiketi(kat, KENAR, 64);
    const ayiriciY = 64 + et.yukseklik + 20;
    let ortaSvg = `<line x1="${KENAR}" y1="${ayiriciY}" x2="${B - KENAR}" y2="${ayiriciY}" stroke="${R.ince}" stroke-width="1"/>`;

    const gen = B - KENAR * 2;
    const u = await yazi(ust, { boyut: 28, kalinlik: 600, renk: kat.renk.text, aralik: 0.05, buyukHarf: true });

    const rBoyut = rakam.length > 10 ? 84 : rakam.length > 7 ? 98 : 112;
    const r = await yazi(rakam, { aile: 'Jost', boyut: rBoyut, kalinlik: 700, renk: R.murekkep });

    const a = alt ? await yazi(alt, { aile: 'Literata', boyut: 42, kalinlik: 600, renk: R.murekkep, genislik: gen, satirAraligi: -2 }) : null;

    const icerikTop = ayiriciY + 30;
    const maxH = H - 92 - icerikTop - 20;
    const ara = 14;
    const blokH = u.yukseklik + ara + r.yukseklik + (a ? ara + 12 + a.yukseklik : 0);
    const y0 = icerikTop + Math.max(0, Math.round((maxH - blokH) / 2));

    const ry = y0 + u.yukseklik + ara;
    const katmanlar = [
      ...c.katmanlar,
      et.katman,
      { ...u, left: KENAR, top: y0 },
      { ...r, left: KENAR - 4, top: ry },
    ];
    if (a) {
      const ay = ry + r.yukseklik + ara + 8;
      ortaSvg += `<line x1="${KENAR}" y1="${ay - 6}" x2="${KENAR + 80}" y2="${ay - 6}" stroke="${kat.renk.fill}" stroke-width="3"/>`;
      katmanlar.push({ ...a, left: KENAR, top: ay + 8 });
    }

    return { svg: c.svg + et.svg + ortaSvg, katmanlar };
  };
}

// Resimli istatistik: birkaç dönemin değeri simge dizileriyle (1 simge = birim).
// satirlar: [{ etiket: '2024', deger: 9831 }], son satır güncel değerdir (tam renk), öncekiler soluk.
export function gostergeKapagi({ kategori: slug, baslik, simge: simgeAdi, birim, birimEtiket, satirlar, ondalik = 0, onEk = '', sonEk = '', kaynak, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { kaynak, ornek });
    const b = await yazi(baslik, { aile: 'Literata', boyut: 50, kalinlik: 600, genislik: B - KENAR * 2 });
    const top = 64;
    const katmanlar = [...c.katmanlar, { ...b, left: KENAR, top }];
    let svg = c.svg;

    // Satırlar: en uzun satır alana sığacak şekilde simge boyutu seçilir.
    const enCok = Math.max(...satirlar.map((s) => Math.ceil(s.deger / birim)));
    const etiketGen = 120;
    const degerGen = 210;
    const alan = B - KENAR * 2 - etiketGen - degerGen;
    const boyut = Math.min(40, Math.floor(alan / (enCok * 1.12 + Math.floor(enCok / 10) * 0.45)));
    const ust = top + b.yukseklik + 40;
    const alanH = H - 92 - 70 - ust;
    const satirH = Math.min(boyut + 34, Math.floor(alanH / satirlar.length));
    for (const [i, s] of satirlar.entries()) {
      const guncel = i === satirlar.length - 1;
      const y = ust + i * satirH;
      const e = await yazi(s.etiket, { boyut: 26, kalinlik: guncel ? 700 : 500, renk: guncel ? R.murekkep : R.soluk });
      katmanlar.push({ ...e, left: KENAR, top: Math.round(y + (boyut - e.yukseklik) / 2) });
      const satir = isoSatir(simgeAdi, s.deger, birim, KENAR + etiketGen, y, boyut, kat.renk.fill, guncel ? 1 : 0.38);
      svg += satir.svg;
      const d = await yazi(`${onEk}${sayi(s.deger, ondalik)}${sonEk}`, { boyut: 30, kalinlik: guncel ? 700 : 500, renk: guncel ? R.murekkep : R.soluk });
      katmanlar.push({ ...d, left: Math.round(satir.bitis + 16), top: Math.round(y + (boyut - d.yukseklik) / 2) });
    }

    // Lejant: 1 simge = birim.
    const ly = H - 92 - 54;
    svg += simge(simgeAdi, KENAR, ly, 26, kat.renk.fill);
    const l = await yazi(`= ${birimEtiket}`, { boyut: 24, kalinlik: 500, renk: R.soluk });
    katmanlar.push({ ...l, left: KENAR + 36, top: Math.round(ly + (26 - l.yukseklik) / 2) });
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

export function grafikKapagi({ kategori: slug, baslik, seri, cizgiler = [], vurgu, ondalik = 2, onEk = '', sonEk = '', ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { ornek });
    const et = await kategoriEtiketi(kat, KENAR, 56);
    const katmanlar = [...c.katmanlar, et.katman];
    let svg = c.svg + et.svg;
    const deger = (n) => `${onEk}${sayi(n, ondalik)}${sonEk}`;

    const gen = B - KENAR * 2;
    const b = await yazi(baslik, { aile: 'Literata', boyut: baslik.length > 60 ? 38 : 44, kalinlik: 600, genislik: gen - 20, satirAraligi: -4 });
    const bY = 56 + et.yukseklik + 14;
    katmanlar.push({ ...b, left: KENAR, top: bY });

    // Grafik alanı: sağda değer ekseni için yer bırakılır.
    const x0 = KENAR;
    const x1 = B - KENAR - 112;
    const y0 = bY + b.yukseklik + 30;
    const y1 = H - 92 - 46;
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
      svg += `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="${R.ince}" stroke-width="1"/>`;
      if (Math.abs(y - sonY) < 30) continue;
      const e = await yazi(sayi(v, eksenOndalik), { boyut: 19, kalinlik: 500, renk: R.soluk });
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
      svg += `<line x1="${x.toFixed(1)}" y1="${y1}" x2="${x.toFixed(1)}" y2="${y1 + 8}" stroke="${R.soluk}" stroke-width="1"/>`;
      const metin = uzun ? p.tarih.slice(0, 4) : `${TR_AY_KISA[Number(p.tarih.slice(5, 7)) - 1]} ${p.tarih.slice(2, 4)}`;
      const e = await yazi(metin, { boyut: 19, kalinlik: 500, renk: R.soluk });
      katmanlar.push({ ...e, left: Math.round(x - e.genislik / 2), top: y1 + 12 });
    }
    svg += `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${R.murekkep}" stroke-width="1.5"/>`;

    // Fiyat çizgisi ve altındaki hafif dolgu.
    const yol = noktalar.map((p, i) => `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(p.deger).toFixed(1)}`).join('');
    svg += `<path d="${yol}L${x1} ${y1}L${x0} ${y1}Z" fill="${kat.renk.fill}" opacity="0.10"/>`;
    svg += `<path d="${yol}" fill="none" stroke="${kat.renk.fill}" stroke-width="2.6" stroke-linejoin="round"/>`;

    // Referans çizgileri: kesikli, etiketi çizginin hemen üstünde solda.
    for (const z of cizgiler) {
      const y = Y(z.deger);
      svg += `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="${R.murekkep2}" stroke-width="2" stroke-dasharray="9 7"/>`;
      if (z.etiket) {
        const e = await yazi(z.etiket, { boyut: 20, kalinlik: 600, renk: R.murekkep2 });
        const ust = y - e.yukseklik - 6 > y0 - 10;
        svg += `<rect x="${x0 + 8}" y="${(ust ? y - e.yukseklik - 8 : y + 4).toFixed(1)}" width="${e.genislik + 12}" height="${e.yukseklik + 4}" fill="${R.kagit}" opacity="0.92"/>`;
        katmanlar.push({ ...e, left: x0 + 14, top: Math.round(ust ? y - e.yukseklik - 6 : y + 6) });
      }
    }

    // Son değer: nokta ve sağ eksende kategori renginde etiket.
    const son = noktalar.at(-1);
    const sx = X(son);
    const sy = Y(son.deger);
    svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="7" fill="${kat.renk.fill}" stroke="${R.kagit}" stroke-width="3"/>`;
    const se = await yazi(deger(son.deger), { boyut: 20, kalinlik: 700, renk: '#ffffff' });
    const kutuY = Math.round(Math.min(Math.max(sy - (se.yukseklik + 10) / 2, y0 - 8), y1 - se.yukseklik - 10));
    svg += `<rect x="${x1 + 6}" y="${kutuY}" width="${Math.max(se.genislik + 16, 100)}" height="${se.yukseklik + 10}" fill="${kat.renk.fill === MUREKKEP.ochre.fill ? MUREKKEP.ochre.text : kat.renk.fill}"/>`;
    katmanlar.push({ ...se, left: x1 + 14, top: kutuY + 5 });

    // Vurgu notu: grafik alanının dört köşesinden çizgiye, referans çizgilerine ve etiketlerine en az değeninde.
    if (vurgu) {
      const v = await yazi(vurgu, { boyut: 24, kalinlik: 700, renk: kat.renk.text });
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
      svg += `<rect x="${kx}" y="${ky}" width="${w}" height="${h}" fill="${R.kagit}" opacity="0.92"/>`;
      katmanlar.push({ ...v, left: kx + 10, top: ky + 6 });
    }

    return { svg, katmanlar };
  };
}

// Karne kartı: dönem getirilerini büyükten küçüğe yatay çubuklarla gösterir (sıfır çizgisinin iki yanı).
// satirlar: [{ etiket, deger }] yüzde; cizgi: { deger, etiket } isteğe bağlı referans (ör. enflasyon).
// Yeşil/kırmızı bilgi içindir, alarm değil: tonlar sitenin mürekkepleri.
export function karneKapagi({ kategori: slug = 'piyasalar', baslik, tarih, satirlar, cizgi, ornek }) {
  return async () => {
    const kat = kategori(slug);
    const c = await cerceve(kat, { ornek });
    const et = await kategoriEtiketi(kat, KENAR, 52);
    const katmanlar = [...c.katmanlar, et.katman];
    let svg = c.svg + et.svg;
    if (tarih) {
      const t = await yazi(tarih, { boyut: 22, kalinlik: 500, renk: R.soluk });
      katmanlar.push({ ...t, left: B - KENAR - t.genislik, top: 52 + Math.round((et.yukseklik - t.yukseklik) / 2) });
    }
    const b = await yazi(baslik, { aile: 'Literata', boyut: baslik.length > 55 ? 34 : 40, kalinlik: 600, genislik: B - KENAR * 2 });
    const bY = 52 + et.yukseklik + 10;
    katmanlar.push({ ...b, left: KENAR, top: bY });

    const sirali = [...satirlar].sort((x, y) => y.deger - x.deger);
    const ust0 = bY + b.yukseklik + (cizgi ? 44 : 22);
    const alt = H - 92 - 16;
    // Az satırlı kartta çubuklar büyür ve alan dikeyde ortalanır.
    const satirH = Math.min(sirali.length <= 8 ? 62 : 40, (alt - ust0) / sirali.length);
    const ust = ust0 + Math.max(0, (alt - ust0 - satirH * sirali.length) / 2 - 10);
    const boyut = Math.max(15, Math.min(26, Math.round(satirH * 0.5)));
    const etiketGen = 330;
    const degerGen = 110;
    const x0 = KENAR + etiketGen;
    const x1 = B - KENAR - degerGen;
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
      const renk = s.deger >= 0 ? MUREKKEP.green.fill : MUREKKEP.red.fill;
      svg += `<rect x="${Math.min(sifir, xs).toFixed(1)}" y="${cy.toFixed(1)}" width="${Math.max(2, Math.abs(xs - sifir)).toFixed(1)}" height="${cubukH.toFixed(1)}" fill="${renk}"/>`;
      const e = await yazi(s.etiket, { boyut, kalinlik: 500, renk: R.murekkep });
      katmanlar.push({ ...e, left: KENAR, top: Math.round(y + (satirH - e.yukseklik) / 2) });
      const v = await yazi(yuzde(s.deger), { boyut, kalinlik: 700, renk: s.deger >= 0 ? MUREKKEP.green.text : MUREKKEP.red.text });
      const vx = s.deger >= 0 ? Math.max(xs, sifir) + 8 : Math.max(sifir, xs) + 8;
      katmanlar.push({ ...v, left: Math.round(Math.min(vx, B - KENAR - v.genislik)), top: Math.round(y + (satirH - v.yukseklik) / 2) });
    }
    svg += `<line x1="${sifir.toFixed(1)}" y1="${ust - 6}" x2="${sifir.toFixed(1)}" y2="${(ust + sirali.length * satirH + 4).toFixed(1)}" stroke="${R.murekkep}" stroke-width="1.5"/>`;
    if (cizgi) {
      const cx = X(cizgi.deger);
      svg += `<line x1="${cx.toFixed(1)}" y1="${ust - 14}" x2="${cx.toFixed(1)}" y2="${(ust + sirali.length * satirH + 4).toFixed(1)}" stroke="${R.murekkep2}" stroke-width="2" stroke-dasharray="7 6"/>`;
      if (cizgi.etiket) {
        const e = await yazi(cizgi.etiket, { boyut: 18, kalinlik: 600, renk: R.murekkep2 });
        const sol = cx + 6 + e.genislik > B - KENAR ? cx - 6 - e.genislik : cx + 6;
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
  const { svg, katmanlar } = await tur();
  const taban = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">${svg}</svg>`;
  return sharp(Buffer.from(taban))
    .composite(await Promise.all(katmanlar.map(sigdir)))
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
}
