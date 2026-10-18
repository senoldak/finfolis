// Favicon, uygulama simgeleri ve işaret dosyaları (BRAND.md §5, §11). Sekme ve yer imi simgeleri SAYDAM zeminlidir
// (yer iminde beyaz kare görünmesin); 48 piksel ve altı üç telli küçük abaküstür. Zeminli olanlar profil fotoğrafıyla
// aynıdır: pişmiş toprak zemin, kâğıt rengi boncuklar (apple-touch-icon, çünkü iOS saydamı siyaha boyar; maskelenebilir
// simge, çünkü kenarı kırpılır). Kullanım: node scripts/marka/favicon-uret.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { KIMLIK, abakusSvg } from '../../src/lib/kimlik.js';

const KOK = 'public';

/** Kare simge. pay: işaretin kenarlardan içeride kalan oranı; toprak: pişmiş toprak zemin. */
function simgeSvg(boyut, { kucuk = boyut <= 48, pay = 0.06, toprak = false } = {}) {
  const ic = Math.round(boyut * (1 - 2 * pay));
  const o = Math.round((boyut - ic) / 2);
  const zemin = toprak ? `<rect width="${boyut}" height="${boyut}" fill="${KIMLIK.toprak}"/>` : '';
  const isaret = abakusSvg({ boyut: ic, kucuk, zemin: toprak ? 'toprak' : 'acik', ekler: `x="${o}" y="${o}"` });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}" viewBox="0 0 ${boyut} ${boyut}">${zemin}${isaret}</svg>`;
}

const png = (boyut, secenek) => sharp(Buffer.from(simgeSvg(boyut, secenek))).png({ compressionLevel: 9 }).toBuffer();

/** PNG gömülü ICO (Windows Vista+ ve bütün tarayıcılar okur). */
function ico(pngler) {
  const bas = Buffer.alloc(6 + 16 * pngler.length);
  bas.writeUInt16LE(0, 0);
  bas.writeUInt16LE(1, 2);
  bas.writeUInt16LE(pngler.length, 4);
  let ofset = bas.length;
  pngler.forEach(([boyut, veri], i) => {
    const o = 6 + i * 16;
    bas.writeUInt8(boyut >= 256 ? 0 : boyut, o);
    bas.writeUInt8(boyut >= 256 ? 0 : boyut, o + 1);
    bas.writeUInt16LE(1, o + 4);
    bas.writeUInt16LE(32, o + 6);
    bas.writeUInt32LE(veri.length, o + 8);
    bas.writeUInt32LE(ofset, o + 12);
    ofset += veri.length;
  });
  return Buffer.concat([bas, ...pngler.map(([, veri]) => veri)]);
}

fs.writeFileSync(`${KOK}/favicon.svg`, `${abakusSvg({ boyut: 64, kucuk: true })}\n`);
fs.writeFileSync(`${KOK}/favicon-32.png`, await png(32));
fs.writeFileSync(`${KOK}/favicon-192.png`, await png(192));
fs.writeFileSync(`${KOK}/favicon-512.png`, await png(512));
fs.writeFileSync(`${KOK}/favicon-maskable-512.png`, await png(512, { pay: 0.2, toprak: true }));
fs.writeFileSync(`${KOK}/apple-touch-icon.png`, await png(180, { pay: 0.14, toprak: true }));
fs.writeFileSync(`${KOK}/favicon.ico`, ico([[16, await png(16)], [32, await png(32)], [48, await png(48)]]));

// İşaret dosyaları (brand/): açık zemin, koyu zemin, pişmiş toprak zemin; tam ve küçük.
for (const [ad, s] of Object.entries({
  'finfolis-abakus': abakusSvg(),
  'finfolis-abakus-koyu-zemin': abakusSvg({ zemin: 'koyu' }),
  'finfolis-abakus-toprak-zemin': abakusSvg({ zemin: 'toprak' }),
  'finfolis-abakus-kucuk': abakusSvg({ kucuk: true }),
  'finfolis-abakus-kucuk-koyu-zemin': abakusSvg({ kucuk: true, zemin: 'koyu' }),
})) fs.writeFileSync(`brand/${ad}.svg`, `${s}\n`);
console.log('favicon.svg, favicon.ico, favicon-32/192/512.png (saydam), favicon-maskable-512.png, apple-touch-icon.png (pişmiş toprak), brand/finfolis-abakus*.svg');
