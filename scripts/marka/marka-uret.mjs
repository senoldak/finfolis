// Marka dosyaları (BRAND.md §5, §6, §11): yayıncı logosu, varsayılan paylaşım görseli, sosyal profil ve kapak görselleri,
// kullanıma hazır logo paketi. Yazılar glif yolu (scripts/kapak/kapak.mjs yaziYolu), işaret src/lib/kimlik.js.
// Kullanım: node scripts/marka/marka-uret.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { yaziYolu } from '../kapak/kapak.mjs';
import { KIMLIK, abakusSvg } from '../../src/lib/kimlik.js';

const AD = 'finfolis';
const SLOGAN = 'Karmaşadan uzakta';
const BUYUK_HARF = 0.66; // Bricolage büyük harf yüksekliği (em)
const yerlestir = (svg, x, y) => svg.replace('<svg ', `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" `);
const svgSar = (g, y, ic) => `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(g)}" height="${Math.ceil(y)}" viewBox="0 0 ${Math.ceil(g)} ${Math.ceil(y)}">${ic}</svg>\n`;
const pngYaz = (svg, dosya, genislik) =>
  sharp(Buffer.from(svg), { density: 300 }).resize({ width: genislik }).png({ compressionLevel: 9 }).toFile(dosya);

function renkler(zemin) {
  return zemin === 'koyu' ? { yazi: KIMLIK.kagit, ikincil: '#c9c7bf', isaret: 'koyu' } : { yazi: KIMLIK.murekkep, ikincil: KIMLIK.gri, isaret: 'acik' };
}

/** İşaret solda, "finfolis" sağda; (x, y) sol üst. M: işaret boyu. */
function yatayLogo(x, y, M, zemin = 'acik') {
  const r = renkler(zemin);
  const boy = M * 0.62;
  const yazi = yaziYolu(AD, x + M * 1.18, y + M / 2 + (boy * BUYUK_HARF) / 2, { boyut: boy, kalinlik: 600, renk: r.yazi, aralik: -0.03 });
  return { svg: yerlestir(abakusSvg({ boyut: M, zemin: r.isaret }), x, y) + yazi.svg, genislik: M * 1.18 + yazi.genislik, boy };
}

// ── Yayıncı logosu (600×60, saydam) ve varsayılan paylaşım görseli (1200×630) ──
{
  const l = yatayLogo(0, 4, 52);
  fs.writeFileSync('public/finfolis-logo.png', await sharp(Buffer.from(svgSar(600, 60, l.svg))).png({ compressionLevel: 9 }).toBuffer());
}

/** Kâğıt zemin, sağdan taşan soluk büyük abaküs, logo ve slogan (logoX verilmezse ortada: profil fotoğrafından ve
 *  mobil kırpmadan uzak). Abaküs, pişmiş toprak vurgu boncuğu sağ kenarın hemen içinde kalacak biçimde yerleşir;
 *  teller kenardan taşar. */
function kapakGorseli(G, Y, { M, sloganBoyu, buyuk, logoX }) {
  const buyukX = G - buyuk * 0.87;
  const buyukY = -buyuk * 0.06;
  let ic = `<rect width="${G}" height="${Y}" fill="${KIMLIK.kagit}"/>`;
  ic += abakusSvg({ boyut: buyuk, zemin: 'soluk', vurgu: true, ekler: `x="${buyukX.toFixed(1)}" y="${buyukY.toFixed(1)}"` });
  const olc = yatayLogo(0, 0, M);
  const blokY = M + sloganBoyu * 1.5;
  const x = logoX ?? (G - olc.genislik) / 2;
  const y = (Y - blokY) / 2;
  ic += yatayLogo(x, y, M).svg;
  ic += yaziYolu(SLOGAN, x + M * 1.18 + olc.boy * 0.02, y + M + sloganBoyu * 1.1, { boyut: sloganBoyu, kalinlik: 400, renk: KIMLIK.gri }).svg;
  return svgSar(G, Y, ic);
}

const og = kapakGorseli(1200, 630, { M: 130, sloganBoyu: 38, buyuk: 600, logoX: 96 });
fs.writeFileSync('public/og-default.png', await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toBuffer());

// ── Sosyal (brand/sosyal/) ──
fs.mkdirSync('brand/sosyal', { recursive: true });
for (const f of fs.readdirSync('brand/sosyal')) fs.rmSync(`brand/sosyal/${f}`);
const SOSYAL = {
  'x-kapak-1500x500': [1500, 500, { M: 120, sloganBoyu: 34, buyuk: 500 }],
  'facebook-kapak-1640x624': [1640, 624, { M: 130, sloganBoyu: 38, buyuk: 600 }],
  'linkedin-kapak-1128x191': [1128, 191, { M: 64, sloganBoyu: 20, buyuk: 260 }],
};
for (const [ad, [G, Y, o]] of Object.entries(SOSYAL)) await sharp(Buffer.from(kapakGorseli(G, Y, o))).png({ compressionLevel: 9 }).toFile(`brand/sosyal/${ad}.png`);
{
  // Profil: pişmiş toprak zemin, kâğıt rengi boncuklar; daire kırpmada boncuklar kenara değmesin diye işaret ortadaki %56'da.
  const P = 1080;
  const m = P * 0.56;
  const svg = svgSar(P, P, `<rect width="${P}" height="${P}" fill="${KIMLIK.toprak}"/>${abakusSvg({ boyut: m, zemin: 'toprak', ekler: `x="${(P - m) / 2}" y="${(P - m) / 2}"` })}`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('brand/sosyal/profil-1080.png');
}

// ── Logo paketi (brand/logo/) ──
const KLASOR = 'brand/logo';
fs.mkdirSync(KLASOR, { recursive: true });
const M = 200;
const BOSLUK = M * 0.25;

function dikey(zemin, sloganli) {
  const r = renkler(zemin);
  const boy = M * 0.42;
  const ad = yaziYolu(AD, 0, 0, { boyut: boy, kalinlik: 600, renk: r.yazi, aralik: -0.03 });
  const sb = M * 0.12;
  const sl = sloganli ? yaziYolu(SLOGAN, 0, 0, { boyut: sb, kalinlik: 400, renk: r.ikincil }) : null;
  const g = BOSLUK * 2 + Math.max(M, ad.genislik, sl?.genislik ?? 0);
  const adTaban = BOSLUK + M + M * 0.14 + boy * BUYUK_HARF;
  const slTaban = adTaban + sb * 2;
  const y = (sloganli ? slTaban + sb * 0.3 : adTaban + boy * 0.1) + BOSLUK;
  let ic = yerlestir(abakusSvg({ boyut: M, zemin: r.isaret }), (g - M) / 2, BOSLUK);
  ic += yaziYolu(AD, (g - ad.genislik) / 2, adTaban, { boyut: boy, kalinlik: 600, renk: r.yazi, aralik: -0.03 }).svg;
  if (sloganli) ic += yaziYolu(SLOGAN, (g - sl.genislik) / 2, slTaban, { boyut: sb, kalinlik: 400, renk: r.ikincil }).svg;
  return { g, y, ic };
}

const PARCALAR = {
  'finfolis-logo-yatay': (z) => {
    const l = yatayLogo(BOSLUK, BOSLUK, M, z);
    return { g: BOSLUK * 2 + l.genislik, y: BOSLUK * 2 + M, ic: l.svg };
  },
  'finfolis-logo-dikey': (z) => dikey(z, false),
  'finfolis-logo-dikey-slogan': (z) => dikey(z, true),
  'finfolis-isaret': (z) => ({ g: M + BOSLUK * 2, y: M + BOSLUK * 2, ic: yerlestir(abakusSvg({ boyut: M, zemin: renkler(z).isaret }), BOSLUK, BOSLUK) }),
  'finfolis-isaret-kucuk': (z) => ({ g: M + BOSLUK * 2, y: M + BOSLUK * 2, ic: yerlestir(abakusSvg({ boyut: M, kucuk: true, zemin: renkler(z).isaret }), BOSLUK, BOSLUK) }),
};
let n = 0;
for (const [ad, ciz] of Object.entries(PARCALAR)) {
  for (const zemin of ['acik', 'koyu']) {
    const dosya = `${KLASOR}/${ad}${zemin === 'koyu' ? '-koyu-zemin' : ''}`;
    const p = ciz(zemin);
    const svg = svgSar(p.g, p.y, p.ic);
    fs.writeFileSync(`${dosya}.svg`, svg);
    await pngYaz(svg, `${dosya}.png`, ad.endsWith('kucuk') ? 256 : 2000);
    n += 2;
  }
}
// Sosyal klasörüne siyah beyaz logo ve siyah beyaz profil seçeneği (kâğıt zemin, mürekkep ve gri boncuk).
for (const ad of ['finfolis-logo-yatay', 'finfolis-logo-dikey-slogan']) {
  for (const uz of ['png', 'svg']) fs.copyFileSync(`${KLASOR}/${ad}.${uz}`, `brand/sosyal/${ad}-siyah-beyaz.${uz}`);
}
{
  const P = 1080;
  const m = P * 0.56;
  const svg = svgSar(P, P, `<rect width="${P}" height="${P}" fill="#ffffff"/>${abakusSvg({ boyut: m, ekler: `x="${(P - m) / 2}" y="${(P - m) / 2}"` })}`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('brand/sosyal/profil-1080-siyah-beyaz.png');
}

fs.writeFileSync(
  `${KLASOR}/BENIOKU.txt`,
  `finfolis logo paketi (BRAND.md §5–6). Üretici: scripts/marka/marka-uret.mjs — elle düzenlemeyin, yeniden üretin.

Hangi dosya nerede:
- finfolis-logo-yatay        Web sitesi, e-posta imzası, sunum, belge üst bilgisi (varsayılan logo)
- finfolis-logo-dikey        Kare alanlar, kartvizit, afiş
- finfolis-logo-dikey-slogan Baskı ve tanıtım ("${SLOGAN}")
- finfolis-isaret            Yazısız abaküs, 49 piksel ve üstü
- finfolis-isaret-kucuk      48 piksel ve altı (üç telli; favicon gibi)
Profil fotoğrafı, kapak görselleri ve siyah beyaz logo: ../sosyal/

"-koyu-zemin" ekli dosyalar koyu zemin içindir: koyu boncuklar ve yazı kâğıt rengine döner.
SVG her boyda keskindir, öncelik onda. PNG'ler saydam zeminlidir.

Kurallar: daire, oval ya da kare çerçeveye almak, döndürmek, renk değiştirmek, gölge, kontur, boncuk ekleyip çıkarmak,
yazıyı başka yazı tipiyle yeniden yazmak yapılmaz. Logonun çevresinde en az işaretin dörtte biri kadar boşluk kalır.
Renkler: pişmiş toprak ${KIMLIK.toprak}, mürekkep ${KIMLIK.murekkep}, kâğıt ${KIMLIK.kagit}. Yazı tipi: Bricolage Grotesque (OFL).
`,
);
console.log(`public/finfolis-logo.png, public/og-default.png, brand/sosyal/ (4), ${KLASOR}/ (${n} + BENIOKU.txt)`);
