// Kimlik v2 (BRAND.md) ortak parçaları: renkler, abaküs işareti ve boncuk sırası.
// Düz JS: hem site (Astro) hem kapak ve marka betikleri (scripts/, Node 22) okur.

export const KIMLIK = /** @type {const} */ ({
  kagit: '#f4f3ee',
  murekkep: '#1b1b1b',
  toprak: '#c2502b', // pişmiş toprak: tek marka rengi
  toprakAcik: '#e39a80', // pişmiş toprak zeminde gri boncukların yerine
  boncukGri: '#cfccc2',
  soluk: '#e4e1d7',
  gri: '#5d5b55',
  yukselis: '#3f7350',
  dusus: '#a3243b',
});

// İşaret geometrisi, 120 birimlik kare. Tam: dört tel, koyu 3·2·1·0 solda, gri 1·2·3·4 sağda.
// Küçük (32 piksel ve altı): üç tel, koyu 2·1·0, gri 1·2·3; boncuklar iri, teller kalın ki küçükte seçilsin.
const GEOMETRI = {
  tam: { teller: [24, 48, 72, 96], x: [10, 110], kalinlik: 2.5, r: 8, sol: [18, 35, 52], sag: [100, 83, 66, 49], koyu: [3, 2, 1, 0], gri: [1, 2, 3, 4] },
  kucuk: { teller: [30, 60, 90], x: [6, 114], kalinlik: 5, r: 13, sol: [20, 47], sag: [100, 73, 46], koyu: [2, 1, 0], gri: [1, 2, 3] },
};

// Zemine göre renkler: koyu boncuk, gri boncuk, tel.
const ZEMIN = {
  acik: { koyu: KIMLIK.murekkep, gri: KIMLIK.boncukGri, tel: KIMLIK.boncukGri, telKucuk: '#b9b6ab' },
  koyu: { koyu: KIMLIK.kagit, gri: '#6b6962', tel: '#6b6962', telKucuk: '#6b6962' },
  toprak: { koyu: KIMLIK.kagit, gri: KIMLIK.toprakAcik, tel: KIMLIK.toprakAcik, telKucuk: KIMLIK.toprakAcik },
  soluk: { koyu: KIMLIK.soluk, gri: KIMLIK.soluk, tel: KIMLIK.soluk, telKucuk: KIMLIK.soluk },
};

/**
 * Abaküs işareti (SVG metni).
 * @param {{ boyut?: number, kucuk?: boolean, zemin?: 'acik'|'koyu'|'toprak'|'soluk', vurgu?: boolean, ekler?: string }} [o]
 *   vurgu: sağ üstteki tek boncuk pişmiş toprak (kapaklardaki büyük soluk abaküs). ekler: <svg> etiketine eklenecek öznitelikler.
 */
export function abakusSvg({ boyut = 120, kucuk = false, zemin = 'acik', vurgu = false, ekler = '' } = {}) {
  const g = GEOMETRI[kucuk ? 'kucuk' : 'tam'];
  const z = ZEMIN[zemin];
  const tel = kucuk ? z.telKucuk : z.tel;
  let ic = `<g stroke="${tel}" stroke-width="${g.kalinlik}">`;
  for (const y of g.teller) ic += `<line x1="${g.x[0]}" y1="${y}" x2="${g.x[1]}" y2="${y}"/>`;
  ic += '</g>';
  const boncuk = (x, y, renk) => `<circle cx="${x}" cy="${y}" r="${g.r}" fill="${renk}"/>`;
  g.teller.forEach((y, i) => {
    for (let k = 0; k < g.koyu[i]; k++) ic += boncuk(g.sol[k], y, z.koyu);
    for (let k = 0; k < g.gri[i]; k++) ic += boncuk(g.sag[k], y, vurgu && i === 0 && k === 0 ? KIMLIK.toprak : z.gri);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}" viewBox="0 0 120 120"${ekler ? ` ${ekler}` : ''}>${ic}</svg>`;
}

/**
 * Boncuk sırası: miktar / birim kadar boncuk, 10'arlı tellere bölünmüş. Son boncuk kesirliyse kesri (0,1–0,99) döner;
 * 0,1'in altındaki kesir çizilmez (eski Isotype satırıyla aynı kural).
 * @returns {number[][]} her tel bir dizi; 1 tam boncuk, <1 kesirli
 */
export function boncukTelleri(miktar, birim, telBasina = 10) {
  if (!(miktar > 0) || !(birim > 0)) return [];
  const oran = miktar / birim;
  const tam = Math.floor(oran);
  const kesir = Math.round((oran % 1) * 100) / 100;
  const liste = Array.from({ length: tam }, () => 1);
  if (kesir >= 0.1) liste.push(kesir);
  const teller = [];
  for (let i = 0; i < liste.length; i += telBasina) teller.push(liste.slice(i, i + telBasina));
  return teller;
}
