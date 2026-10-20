// Yazı düzeltme notu: alan doluysa makalede gösterilecek etiket, metin ve
// düzeltme politikası bağlantısı. Şemadaki kuralın aynısı: 10 karakterden kısa not yok sayılır.
export const DUZELTME_EN_AZ = 10;

const DILLER = {
  tr: { etiket: 'Düzeltme:', baglanti: '/duzeltme-politikasi/' },
};

export function duzeltmeNotu(veri, dil = 'tr') {
  const metin = typeof veri?.duzeltme === 'string' ? veri.duzeltme : '';
  if (metin.length < DUZELTME_EN_AZ) return null;
  const { etiket, baglanti } = DILLER[dil] ?? DILLER.tr;
  return { etiket, metin, baglanti };
}
