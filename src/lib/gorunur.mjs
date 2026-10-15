// Bir göstergenin sitede gösterilip gösterilmeyeceği.
// 'kur': 3 günden eskiyse gizlenir. 'aciklama': yenisi açıklanana kadar görünür.
export const KUR_GECERLILIK_MS = 3 * 24 * 60 * 60 * 1000;

export function gorunur(g, simdi = new Date()) {
  if (g.gecerlilik === 'kur') return simdi.getTime() - new Date(g.zaman).getTime() <= KUR_GECERLILIK_MS;
  return true;
}
