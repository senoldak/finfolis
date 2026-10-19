// Yazı türü: düz haber, açıklayıcı yazı ya da referans yazısı. Şema
// (src/content.config.ts) bu diziyi kullanır; değerler tek yerde durur.
// Görünümde henüz karşılığı yok.
export const YAZI_TURLERI = Object.freeze(['haber', 'aciklayici', 'referans']);
export const VARSAYILAN_YAZI_TURU = 'haber';

export function aciklayiciMi(veri) {
  const tur = veri?.yaziTuru;
  return tur === 'aciklayici' || tur === 'referans';
}
