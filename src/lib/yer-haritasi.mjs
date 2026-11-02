// Haber sayfasındaki yer haritası: Türkiye il sınırları, haberin ili pişmiş toprakla. Yalnız yer haberin özüyse çıkar:
// ön bilgide `yer` (il adı) yazılıysa. Yer alanı yoksa ya da il bilinmiyorsa harita yok.
// Veri: Natural Earth 1:10m birinci düzey idari bölümler, yalnız Türkiye, ~1 km sadeleştirilmiş (kamu malı, atıf
// zorunlu değil; https://www.naturalearthdata.com/about/terms-of-use/). Halkalar [boylam, enlem, …] düz dizi; m = yazı yeri.
import { readFileSync } from 'node:fs';

let iller = null;
const oku = () => (iller ??= JSON.parse(readFileSync(new URL('../data/harita/iller.json', import.meta.url), 'utf8')));

const KUTU = { bati: 25.6, dogu: 44.9, guney: 35.75, kuzey: 42.2 };
const GEN = 640;

/** İl adı → kayıttaki il (büyük-küçük harf ve şapka farkı gözetilmez). */
export function ilBul(ad, liste = oku()) {
  const sade = (s) => String(s).toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '').trim();
  return liste.find((il) => sade(il.ad) === sade(ad)) ?? null;
}

/** Haritanın SVG'si; il bulunamazsa null. */
export function yerHaritasi(ad, liste = oku()) {
  const sec = ilBul(ad, liste);
  if (!sec) return null;
  const kx = Math.cos((39 * Math.PI) / 180);
  const yuk = Math.round((GEN * (KUTU.kuzey - KUTU.guney)) / ((KUTU.dogu - KUTU.bati) * kx));
  const x = (b) => (((b - KUTU.bati) / (KUTU.dogu - KUTU.bati)) * GEN).toFixed(1);
  const y = (e) => (((KUTU.kuzey - e) / (KUTU.kuzey - KUTU.guney)) * yuk).toFixed(1);
  const yol = (halkalar) =>
    halkalar.map((h) => {
      let d = '';
      for (let i = 0; i < h.length; i += 2) d += `${i ? 'L' : 'M'}${x(h[i])} ${y(h[i + 1])}`;
      return `${d}Z`;
    }).join('');
  const parcalar = liste.map((il) => `<path d="${yol(il.r)}"${il === sec ? ' class="secili"' : ''}/>`).join('');
  return `<svg viewBox="0 0 ${GEN} ${yuk}" role="img" aria-label="Türkiye haritasında ${sec.ad}">${parcalar}<circle cx="${x(sec.m[0])}" cy="${y(sec.m[1])}" r="5" class="nokta"/></svg>`;
}
