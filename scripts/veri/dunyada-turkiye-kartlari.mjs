// "Türkiye dünyada kaçıncı?" paylaşım kartları: her gösterge için 1080×1080 PNG → public/kartlar/dunyada-turkiye/<gosterge>.png
// Yazılar kapak altyapısıyla aynı yoldan çizilir (Bricolage glifleri vektör yol, sharp ile PNG); yeni bağımlılık yok.
// Türkiye verisi olmayan gösterge (ör. 10 yıllık tahvil) için kart üretilmez. Kullanım: node scripts/veri/dunyada-turkiye-kartlari.mjs
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { yaziYolu, fontlariDenetle } from '../kapak/kapak.mjs';
import { KIMLIK } from '../../src/lib/kimlik.js';
import { donemEtiket } from '../../src/lib/emsal-ulkeler.mjs';
import { GOSTERGELER, hesapla, degerYaz, donemNotu, trDonemNotu, slug, KAYNAK_AD } from '../../src/lib/dunyada-turkiye.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CIKTI = path.join(KOK, 'public/kartlar/dunyada-turkiye');
const W = 1080;
const KENAR = 72;
const ICERIK = W - 2 * KENAR;
const R = { murekkep: KIMLIK.murekkep, ikinci: '#3d3c38', gri: KIMLIK.gri, ince: KIMLIK.boncukGri, toprak: KIMLIK.toprak, kagit: KIMLIK.kagit };

const olc = (m, boyut, kalinlik, aralik = 0) => yaziYolu(m, 0, 0, { boyut, kalinlik, aralik }).genislik;

// Kelimeleri genişliğe sığacak satırlara böler.
function satirla(metin, boyut, kalinlik, genislik) {
  const out = [];
  let s = '';
  for (const k of metin.split(/\s+/).filter(Boolean)) {
    const aday = s ? `${s} ${k}` : k;
    if (s && olc(aday, boyut, kalinlik) > genislik) {
      out.push(s);
      s = k;
    } else s = aday;
  }
  if (s) out.push(s);
  return out;
}

const T = (m, x, y, o) => yaziYolu(m, x, y, o).svg;

/** Bir gösterge sonucundan kartın SVG metni. */
export function kartSvg(s, g) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><rect width="${W}" height="${W}" fill="${R.kagit}"/>`;

  svg += T(`${s.n} ekonomi arasında`.toLocaleUpperCase('tr-TR'), KENAR, 120, { boyut: 30, kalinlik: 600, renk: R.toprak, aralik: 0.1 });
  let basBoyut = 76;
  let bas = satirla(s.ad, basBoyut, 700, ICERIK);
  if (bas.length > 1) {
    basBoyut = 62;
    bas = satirla(s.ad, basBoyut, 700, ICERIK);
  }
  bas.forEach((l, i) => (svg += T(l, KENAR, 206 + i * 70, { boyut: basBoyut, kalinlik: 700, renk: R.murekkep, aralik: -0.02 })));

  // Büyük sıra ve yanında yön ile Türkiye değeri.
  const taban = bas.length > 1 ? 540 : 520;
  const sira = `${s.yonSira}.`;
  const siraBoyut = 300;
  const siraGen = olc(sira, siraBoyut, 700, -0.02);
  svg += T(sira, KENAR - 6, taban, { boyut: siraBoyut, kalinlik: 700, renk: R.murekkep, aralik: -0.02 });
  const x2 = KENAR + siraGen + 36;
  svg += T(s.yon, x2, taban - 138, { boyut: 60, kalinlik: 700, renk: R.murekkep });
  svg += T(`Türkiye ${degerYaz(s.deger, g)}`, x2, taban - 76, { boyut: 38, kalinlik: 600, renk: R.ikinci });
  if (s.donem) svg += T(donemEtiket(s.donem), x2, taban - 34, { boyut: 30, kalinlik: 500, renk: R.gri });

  // Mini sıralı çubuk: büyükten küçüğe; Türkiye mürekkep, diğerleri soluk.
  const ustSinir = 650;
  const altSinir = 826;
  const degerler = s.dizi.map((d) => d.deger);
  const enBuyuk = Math.max(0, ...degerler);
  const enKucuk = Math.min(0, ...degerler);
  const olcek = (altSinir - ustSinir) / (enBuyuk - enKucuk || 1);
  const sifir = ustSinir + enBuyuk * olcek;
  const aralik = 6;
  const bw = (ICERIK - aralik * (s.dizi.length - 1)) / s.dizi.length;
  s.dizi.forEach((d, i) => {
    const x = KENAR + i * (bw + aralik);
    const h = Math.max(2, Math.abs(d.deger) * olcek);
    const y = d.deger >= 0 ? sifir - h : sifir;
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${d.tr ? R.murekkep : R.ince}"/>`;
    if (d.tr) {
      const etiket = 'Türkiye';
      const gen = olc(etiket, 24, 700);
      if (d.deger < 0) {
        // Eksi çubukta etiket çubuğun soluna yazılır (çubuk sağ uçtaysa) ya da altına.
        const ex = i === s.dizi.length - 1 ? x - 12 - gen : x + bw / 2 - gen / 2;
        const ey = i === s.dizi.length - 1 ? y + h / 2 + 8 : y + h + 28;
        svg += T(etiket, Math.max(KENAR, ex), ey, { boyut: 24, kalinlik: 700, renk: R.murekkep });
      } else {
        // Etiket en yüksek çubuğun üstündeki sabit satırda; ince çizgi çubuğa iner.
        const ex = Math.min(Math.max(KENAR, x + bw / 2 - gen / 2), KENAR + ICERIK - gen);
        svg += T(etiket, ex, ustSinir - 16, { boyut: 24, kalinlik: 700, renk: R.murekkep });
        if (y > ustSinir + 2) svg += `<line x1="${(x + bw / 2).toFixed(1)}" y1="${ustSinir - 8}" x2="${(x + bw / 2).toFixed(1)}" y2="${(y - 3).toFixed(1)}" stroke="${R.murekkep}" stroke-width="1.5"/>`;
      }
    }
  });
  if (enKucuk < 0) svg += `<line x1="${KENAR}" y1="${sifir.toFixed(1)}" x2="${KENAR + ICERIK}" y2="${sifir.toFixed(1)}" stroke="${R.gri}" stroke-width="1.5"/>`;

  // Özet satırı: medyan, en yüksek, en düşük (sığana dek küçülür).
  const ilk = s.dizi[0];
  const son = s.dizi.at(-1);
  const parcalar = [];
  if (s.medyan != null) parcalar.push(`Diğerlerinin medyanı ${degerYaz(s.medyan, g)}`);
  if (!ilk.tr) parcalar.push(`en yüksek ${ilk.ad} ${degerYaz(ilk.deger, g)}`);
  if (!son.tr) parcalar.push(`en düşük ${son.ad} ${degerYaz(son.deger, g)}`);
  let ozet = parcalar.join(' · ');
  let ob = 26;
  while (ob > 20 && olc(ozet, ob, 500) > ICERIK) ob -= 1;
  if (ozet) svg += T(ozet, KENAR, 876, { boyut: ob, kalinlik: 500, renk: R.ikinci });

  // Notlar: veri olmayan ülkeler ve dönem uyumsuzluğu.
  const notlar = [];
  if (s.eksik.length) notlar.push(`${s.eksik.join(', ')} için bu gösterge kaynakta yok, sayılmadı.`);
  const dn = donemNotu(s);
  if (dn) notlar.push(dn);
  const tn = trDonemNotu(s);
  if (tn) notlar.push(tn);
  satirla(notlar.join(' '), 21, 500, ICERIK)
    .slice(0, 3)
    .forEach((l, i) => (svg += T(l, KENAR, 914 + i * 26, { boyut: 21, kalinlik: 500, renk: R.gri })));

  // Altbilgi.
  svg += T('finfolis', KENAR, 1020, { boyut: 44, kalinlik: 600, renk: R.murekkep, aralik: -0.03 });
  const kaynak = `Kaynak: ${KAYNAK_AD[g.k]} · finfolis.com`;
  svg += T(kaynak, KENAR + ICERIK - olc(kaynak, 24, 500), 1018, { boyut: 24, kalinlik: 500, renk: R.gri });
  return `${svg}</svg>`;
}

export async function kartlariUret({ cikti = CIKTI } = {}) {
  await fontlariDenetle();
  const oku = (f) => JSON.parse(readFileSync(path.join(KOK, 'src/data', f), 'utf8'));
  const sonuclar = hesapla(oku('emsal-ulkeler.json'), oku('dunya-faizleri.json'));
  mkdirSync(cikti, { recursive: true });
  const yazilan = [];
  for (const s of sonuclar) {
    if (!s.uygun) continue;
    const g = GOSTERGELER.find((x) => x.k === s.k);
    const png = await sharp(Buffer.from(kartSvg(s, g))).png({ compressionLevel: 9 }).toBuffer();
    const dosya = path.join(cikti, `${slug(s.k)}.png`);
    writeFileSync(dosya, png);
    yazilan.push({ dosya, bayt: png.length });
  }
  return yazilan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const y = await kartlariUret();
  for (const k of y) console.log(`${path.relative(KOK, k.dosya)}  ${Math.round(k.bayt / 1024)} KB`);
}
