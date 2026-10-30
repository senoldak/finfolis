// Seri gezgini ve Terminal için matematiksel dönüşümler.
// Desteklenen dönüşümler:
// - duzey: Ham veriler
// - yoy: % Yıllık değişim
// - mom: % Dönemsel (aylık/gözlemden gözleme) değişim
// - kayanToplam: 12 aylık (veya 1 yıllık dönemlik) kümülatif kayan toplam (src/lib/turetilmis.mjs üzerinden)
// - log: Logaritmik ölçek (log10, v > 0 için)
// - endeks: Ortak başlangıca göre endeksleme (=100)

import { kayanToplam } from './turetilmis.mjs';

const yuvarla = (n) => Math.round(n * 1e6) / 1e6;

/**
 * @param {[number, number][]} noktalar - [zaman, deger] dizisi
 * @returns {[number, number][]}
 */
export function duzey(noktalar) {
  if (!Array.isArray(noktalar)) return [];
  return noktalar.map(([t, v]) => [t, v]);
}

/**
 * % Yıllık değişim (YoY).
 * @param {[number, number][]} noktalar - [zaman, deger] dizisi (zaman gün cinsinden artan UTC)
 * @param {'gun' | 'hafta' | 'ay' | 'ceyrek'} siklik
 * @returns {[number, number][]}
 */
export function yillikDegisim(noktalar, siklik = 'ay') {
  if (!Array.isArray(noktalar) || noktalar.length < 2) return [];

  const adim = siklik === 'ay' ? 12 : siklik === 'ceyrek' ? 4 : siklik === 'hafta' ? 52 : null;
  const out = [];

  if (adim != null) {
    for (let i = adim; i < noktalar.length; i++) {
      const once = noktalar[i - adim][1];
      const simdi = noktalar[i][1];
      if (typeof once === 'number' && typeof simdi === 'number' && Math.abs(once) > 1e-9) {
        out.push([noktalar[i][0], yuvarla(((simdi - once) / Math.abs(once)) * 100)]);
      }
    }
  } else {
    // Günlük veri: t gün cinsindendir. İki işaretçili (sliding pointer) O(N) arama ile
    // yaklaşık 365 gün (±7 gün tolerans) öncesindeki en yakın gözlem bulunur.
    let j = 0;
    for (let i = 0; i < noktalar.length; i++) {
      const hedefT = noktalar[i][0] - 365;
      while (j + 1 < i && Math.abs(noktalar[j + 1][0] - hedefT) <= Math.abs(noktalar[j][0] - hedefT)) {
        j++;
      }
      if (Math.abs(noktalar[j][0] - hedefT) <= 7) {
        const once = noktalar[j][1];
        const simdi = noktalar[i][1];
        if (typeof once === 'number' && typeof simdi === 'number' && Math.abs(once) > 1e-9) {
          out.push([noktalar[i][0], yuvarla(((simdi - once) / Math.abs(once)) * 100)]);
        }
      }
    }
  }
  return out;
}

/**
 * % Dönemsel / Aylık değişim (MoM).
 * @param {[number, number][]} noktalar
 * @returns {[number, number][]}
 */
export function donemselDegisim(noktalar) {
  if (!Array.isArray(noktalar) || noktalar.length < 2) return [];
  const out = [];
  for (let i = 1; i < noktalar.length; i++) {
    const once = noktalar[i - 1][1];
    const simdi = noktalar[i][1];
    if (typeof once === 'number' && typeof simdi === 'number' && Math.abs(once) > 1e-9) {
      out.push([noktalar[i][0], yuvarla(((simdi - once) / Math.abs(once)) * 100)]);
    }
  }
  return out;
}

/**
 * 12 Aylık / 1 Yıllık kayan kümülatif toplam (turetilmis.mjs kayanToplam üzerinden).
 * @param {[number, number][]} noktalar
 * @param {'gun' | 'hafta' | 'ay' | 'ceyrek'} siklik
 * @returns {[number, number][]}
 */
export function kayanToplamDonusumu(noktalar, siklik = 'ay') {
  if (!Array.isArray(noktalar)) return [];
  const n = siklik === 'ay' ? 12 : siklik === 'ceyrek' ? 4 : siklik === 'hafta' ? 52 : 365;
  if (noktalar.length < n) return [];

  const satirlar = noktalar.map(([t, v]) => ({ t, v }));
  const toplamlar = kayanToplam(satirlar, 'v', n);

  const out = [];
  for (let i = 0; i < satirlar.length; i++) {
    const v = toplamlar[i];
    if (v != null) {
      out.push([satirlar[i].t, yuvarla(v)]);
    }
  }
  return out;
}

/**
 * Logaritmik dönüşüm (log10). Değerler > 0 olmalıdır.
 * @param {[number, number][]} noktalar
 * @returns {[number, number][]}
 */
export function logaritmik(noktalar) {
  if (!Array.isArray(noktalar)) return [];
  const out = [];
  for (let i = 0; i < noktalar.length; i++) {
    const v = noktalar[i][1];
    if (typeof v === 'number' && v > 0) {
      out.push([noktalar[i][0], yuvarla(Math.log10(v))]);
    }
  }
  return out;
}

/**
 * Endeks dönüşümü (=100).
 * @param {[number, number][]} noktalar
 * @param {number} [tabanDeger] - Belirtilmezse ilk noktanın değeri kullanılır.
 * @returns {[number, number][]}
 */
export function endeksle(noktalar, tabanDeger) {
  if (!Array.isArray(noktalar) || !noktalar.length) return [];
  const taban = tabanDeger != null ? tabanDeger : noktalar[0][1];
  if (!(taban > 0)) return [];
  return noktalar.map(([t, v]) => [t, yuvarla((v / taban) * 100)]);
}
