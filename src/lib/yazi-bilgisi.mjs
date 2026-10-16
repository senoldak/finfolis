// Künyede gösterilen yazı bilgileri: içerik türü etiketi ve okuma süresi (haber sayfası ve liste kartı).
import { kelimeSay } from './uzunluk.mjs';

// Dakikada okunan kelime: Türkçe haber metni için ortalama.
export const DAKIKADA_KELIME = 200;

/** Gövdenin okuma süresi, dakika (en az 1). */
export function okumaSuresi(govde) {
  return Math.max(1, Math.round(kelimeSay(govde) / DAKIKADA_KELIME));
}

const ETIKET = { veri: 'Veri', arastirma: 'Araştırma', resmi: 'Resmi açıklama' };

/** İçerik türü etiketi; düz haberde etiket yok (undefined). Bülten kendi türüyle etiketlenir. */
export function turEtiketi({ tur, icerikTuru } = {}) {
  if (tur === 'bulten') return 'Bülten';
  return ETIKET[icerikTuru];
}
