// Yayıncı logosu: arama motorlarının NewsArticle publisher.logo için istediği yatay PNG (600×60).
// İşaret (brand/finfolis-mark.svg) + "finfolis" yazısı sitenin fontuyla (Jost 700), şeffaf zemin üzerine mürekkep rengi.
// Kullanım: node scripts/kapak/logo.mjs  → public/finfolis-logo.png (bir kez üretilir, depoya girer).
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ISARET_D } from './isaret.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const CIKTI = path.resolve(HER, '../../public/finfolis-logo.png');
const G = 600;
const Y = 60;
const MUREKKEP = '#1b1b1b';

// İşaret 52px kare, dikeyde ortalı; viewBox brand/finfolis-mark.svg ile aynı.
const isaret = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="62.9 72.5 497.1 497.1"><path fill-rule="evenodd" fill="${MUREKKEP}" d="${ISARET_D}"/></svg>`;

const { data: yazi, info } = await sharp({
  text: {
    text: `<span foreground="${MUREKKEP}" font_weight="700">finfolis</span>`,
    font: 'Jost 44',
    fontfile: path.join(HER, 'fonts', 'Jost.ttf'),
    rgba: true,
    dpi: 72,
  },
})
  .png()
  .toBuffer({ resolveWithObject: true });

const png = await sharp({ create: { width: G, height: Y, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: Buffer.from(isaret), left: 0, top: 4 },
    { input: yazi, left: 64, top: Math.max(0, Math.round((Y - info.height) / 2)) },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(CIKTI, png);
console.log(`${CIKTI} (${G}×${Y})`);
