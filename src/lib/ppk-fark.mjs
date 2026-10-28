// İki PPK metni arasındaki fark: cümle düzeyinde hizalama, değişen cümlede sözcük farkı.
// Saf işlev; yorum üretmez. Tek başına kullanılabilir (sayfa ve ileride haber kutusu).
//
//   cumleFarki(eskiCumleler, yeniCumleler, { esik })
//     → { satirlar: [{ tur, eski?, yeni?, sozcukler? }], ozet: { ayni, eklenen, silinen, degisen } }
//   tur: 'ayni' | 'eklendi' | 'silindi' | 'degisti'
//   sozcukler (yalnız 'degisti'): [{ tur: 'ayni' | 'eklendi' | 'silindi', metin }]

const TR = 'tr';

// Karşılaştırma anahtarı: büyük/küçük harf, tırnak biçimi ve boşluk farkı sayılmaz.
const norm = (s) =>
  String(s)
    .toLocaleLowerCase(TR)
    .replace(/[’‘´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const kelimeler = (s) => String(s).split(/\s+/).filter(Boolean);
// Benzerlik için kelimenin başındaki ve sonundaki noktalama atılır.
const kelimeAnahtar = (k) => norm(k).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

// Çoklu küme Dice benzerliği (0–1); sözcük sırasından bağımsız.
function benzerlik(a, b) {
  const ka = kelimeler(a).map(kelimeAnahtar).filter(Boolean);
  const kb = kelimeler(b).map(kelimeAnahtar).filter(Boolean);
  if (!ka.length || !kb.length) return 0;
  const sayim = new Map();
  for (const k of ka) sayim.set(k, (sayim.get(k) ?? 0) + 1);
  let ortak = 0;
  for (const k of kb) {
    const n = sayim.get(k);
    if (n) {
      ortak++;
      sayim.set(k, n - 1);
    }
  }
  return (2 * ortak) / (ka.length + kb.length);
}

// Sözcük düzeyinde fark (LCS). Bitişik aynı türden sözcükler tek parçada birleşir.
export function sozcukFarki(eski, yeni) {
  const a = kelimeler(eski);
  const b = kelimeler(yeni);
  const n = a.length;
  const m = b.length;
  const an = a.map(norm);
  const bn = b.map(norm);
  const t = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) t[i][j] = an[i] === bn[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const parcalar = [];
  const ekle = (tur, metin) => {
    const son = parcalar.at(-1);
    if (son && son.tur === tur) son.metin += ` ${metin}`;
    else parcalar.push({ tur, metin });
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && an[i] === bn[j]) {
      ekle('ayni', b[j]);
      i++;
      j++;
    } else if (j < m && (i === n || t[i][j + 1] >= t[i + 1][j])) {
      ekle('eklendi', b[j++]);
    } else {
      ekle('silindi', a[i++]);
    }
  }
  // Silinen parça, aynı yerdeki eklenen parçadan önce gelsin.
  for (let k = 0; k < parcalar.length - 1; k++) {
    if (parcalar[k].tur === 'eklendi' && parcalar[k + 1].tur === 'silindi') [parcalar[k], parcalar[k + 1]] = [parcalar[k + 1], parcalar[k]];
  }
  return parcalar;
}

// Sıra korunarak hizalama: birebir aynı çift 2 puan, benzerlik eşiğini geçen çift benzerlik kadar puan alır.
export function cumleFarki(eskiCumleler, yeniCumleler, { esik = 0.5 } = {}) {
  const a = eskiCumleler.map(String);
  const b = yeniCumleler.map(String);
  const an = a.map(norm);
  const bn = b.map(norm);
  const n = a.length;
  const m = b.length;
  const puan = (i, j) => {
    if (an[i] === bn[j]) return 2;
    const s = benzerlik(a[i], b[j]);
    return s >= esik ? s : 0;
  };
  const p = Array.from({ length: n }, (_, i) => Float64Array.from({ length: m }, (_, j) => puan(i, j)));
  const t = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] = Math.max(t[i + 1][j], t[i][j + 1], p[i][j] > 0 ? t[i + 1][j + 1] + p[i][j] : 0);
    }
  const satirlar = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && p[i][j] > 0 && t[i][j] === t[i + 1][j + 1] + p[i][j]) {
      if (p[i][j] === 2) satirlar.push({ tur: 'ayni', eski: a[i], yeni: b[j] });
      else satirlar.push({ tur: 'degisti', eski: a[i], yeni: b[j], sozcukler: sozcukFarki(a[i], b[j]) });
      i++;
      j++;
    } else if (i < n && (j === m || t[i][j] === t[i + 1][j])) {
      satirlar.push({ tur: 'silindi', eski: a[i++] });
    } else {
      satirlar.push({ tur: 'eklendi', yeni: b[j++] });
    }
  }
  const ozet = { ayni: 0, eklenen: 0, silinen: 0, degisen: 0 };
  const anahtar = { ayni: 'ayni', eklendi: 'eklenen', silindi: 'silinen', degisti: 'degisen' };
  for (const s of satirlar) ozet[anahtar[s.tur]]++;
  return { satirlar, ozet };
}
