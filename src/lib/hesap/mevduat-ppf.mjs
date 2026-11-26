/**
 * Vadeli mevduat ile para piyasası fonunun (PPF) net getirisi (stopaj sonrası), gerçek kişiler için.
 *
 * Stopaj oranları (26 Kasım 2026'da kontrol edildi): Cumhurbaşkanı Kararı 10041 (Resmî Gazete, 9 Temmuz 2025) ve
 * GİB, 2026 Gelir Vergisi Kanunu Geçici 67. Madde Rehberi:
 *  - TL mevduat (vadesiz dahil): 6 aya kadar %17,5, 1 yıla kadar %15, 1 yıldan uzun %10.
 *  - Para piyasası fonu katılma payları (9 Temmuz 2025'ten sonra edinilen): %17,5.
 * Daha önce edinilen fon paylarına ve kurumlara başka oranlar uygulanır; hesaplayıcı yalnız yukarıdakini kullanır.
 *
 * Varsayımlar: mevduatta basit faiz (gün/365); PPF'de yıllık getiri günlük bileşik (1 + r/365)^gün. PPF'nin gerçek
 * getirisi fon fiyatına göre değişir; sonuç bir örnek hesaptır.
 */

export const STOPAJ_KAYNAK = {
  ad: 'Cumhurbaşkanı Kararı 10041, Resmî Gazete 9 Temmuz 2025',
  url: 'https://www.resmigazete.gov.tr/eskiler/2025/07/20250709.htm',
};

export function mevduatStopajOrani(gun) {
  if (gun <= 182) return 0.175; // 6 aya kadar
  if (gun <= 365) return 0.15; // 1 yıla kadar
  return 0.1; // 1 yıldan uzun
}

export const PPF_STOPAJ_ORANI = 0.175;

/**
 * Mevduat getiri hesabı.
 * @param {{ anapara: number, yillikFaiz: number, gun: number }} p
 */
export function mevduatHesapla({ anapara, yillikFaiz, gun = 32 }) {
  if (!anapara || anapara <= 0 || !yillikFaiz || yillikFaiz <= 0 || !gun || gun <= 0) {
    return { anapara: anapara || 0, gun: gun || 0, brutFaiz: yillikFaiz || 0, stopajOrani: 0, brutKazanc: 0, stopaj: 0, netKazanc: 0, netBakiye: anapara || 0, netYillikOran: 0 };
  }
  const stopajOrani = mevduatStopajOrani(gun);
  const brutKazanc = anapara * (yillikFaiz / 100) * (gun / 365);
  const stopaj = brutKazanc * stopajOrani;
  const netKazanc = brutKazanc - stopaj;
  return { anapara, gun, brutFaiz: yillikFaiz, stopajOrani, brutKazanc, stopaj, netKazanc, netBakiye: anapara + netKazanc, netYillikOran: yillikFaiz * (1 - stopajOrani) };
}

/**
 * Para piyasası fonu (PPF) getiri hesabı, günlük bileşik varsayımıyla.
 * @param {{ anapara: number, yillikGetiri: number, gun: number }} p
 */
export function ppfHesapla({ anapara, yillikGetiri, gun = 32 }) {
  if (!anapara || anapara <= 0 || !yillikGetiri || yillikGetiri <= 0 || !gun || gun <= 0) {
    return { anapara: anapara || 0, gun: gun || 0, brutGetiri: yillikGetiri || 0, stopajOrani: PPF_STOPAJ_ORANI, brutKazanc: 0, stopaj: 0, netKazanc: 0, netBakiye: anapara || 0, netYillikOran: 0, efektifBilesikBrut: 0 };
  }
  const gunlukOran = yillikGetiri / 100 / 365;
  const brutKazanc = anapara * Math.pow(1 + gunlukOran, gun) - anapara;
  const stopaj = brutKazanc * PPF_STOPAJ_ORANI;
  const netKazanc = brutKazanc - stopaj;
  const efektifBilesikBrut = (Math.pow(1 + gunlukOran, 365) - 1) * 100;
  return { anapara, gun, brutGetiri: yillikGetiri, stopajOrani: PPF_STOPAJ_ORANI, brutKazanc, stopaj, netKazanc, netBakiye: anapara + netKazanc, netYillikOran: efektifBilesikBrut * (1 - PPF_STOPAJ_ORANI), efektifBilesikBrut };
}

/**
 * Mevduat ve PPF'nin aynı varsayımlarla net kazancı. farkTL > 0 ise PPF'nin net kazancı daha yüksek.
 * @param {{ anapara: number, mevduatFaizi: number, ppfGetirisi: number, gun: number }} p
 */
export function karsilastir({ anapara, mevduatFaizi, ppfGetirisi, gun = 32 }) {
  const mev = mevduatHesapla({ anapara, yillikFaiz: mevduatFaizi, gun });
  const ppf = ppfHesapla({ anapara, yillikGetiri: ppfGetirisi, gun });
  const farkTL = ppf.netKazanc - mev.netKazanc;
  return { mevduat: mev, ppf, farkTL };
}
