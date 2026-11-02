// "Daha önce bu konuda": yazıdan önce yayımlanmış, aynı konuyu anlatan yazılar (tidsrost "Tidligere i saken" gibi).
// Aynı konu: iki yazının da anlam vektörü varsa (src/data/vektorler.jsonl) benzerlik en az ANLAM_MIN, kategori ne olursa
// olsun; vektör yoksa aynı kategori ve en az iki ortak varlık (kurum, şirket; src/lib/entities.ts).
// Bülten ve kısa (noindex) yazılar hiçbir zaman aday olmaz, bültene de bölüm çıkmaz. En yeni EN_COK aday alınır,
// eskiden yeniye sıralanır; aday yoksa bölüm hiç çıkmaz. Düz JS: derleme ve node --test aynı kodu kullanır.
import { anlamBenzerligi, vektorleriOku } from './anlam.mjs';

export const EN_COK = 4;
export const ANLAM_MIN = 0.8;
const ORTAK_VARLIK_MIN = 2;

const varsayilanAnlam = (a, b) => anlamBenzerligi(vektorleriOku(), a.id, b.id);

/**
 * @typedef {{ id: string, kategori: string, tarih: number, varliklar: string[], aday: boolean }} DahaOnceOge
 * @param {DahaOnceOge} yazi
 * @param {DahaOnceOge[]} tumu
 * @param {(a: DahaOnceOge, b: DahaOnceOge) => number | null} [anlam]
 * @returns {string[]} eskiden yeniye id'ler
 */
export function dahaOnce(yazi, tumu, anlam = varsayilanAnlam, enCok = EN_COK) {
  if (!yazi.aday) return [];
  const benim = new Set(yazi.varliklar);
  const ayniKonu = (h) => {
    const b = anlam(yazi, h);
    if (b !== null && b !== undefined) return b >= ANLAM_MIN;
    return h.kategori === yazi.kategori && h.varliklar.filter((v) => benim.has(v)).length >= ORTAK_VARLIK_MIN;
  };
  return tumu
    .filter((h) => h.aday && h.id !== yazi.id && h.tarih < yazi.tarih && ayniKonu(h))
    .sort((a, b) => b.tarih - a.tarih)
    .slice(0, Math.max(0, enCok))
    .reverse()
    .map((h) => h.id);
}
