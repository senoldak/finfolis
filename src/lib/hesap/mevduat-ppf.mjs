/**
 * Mevduat vs. Para Piyasası Fonu (PPF) Karşılaştırmalı Getiri ve Stopaj Motoru.
 * Güncel mevduat stopaj oranları (180 güne kadar %10, 365 güne kadar %7.5, >365 gün %5).
 * Para Piyasası Fonu stopaj oranı (%10).
 */

export function mevduatStopajOrani(gun) {
  if (gun <= 180) return 0.10;
  if (gun <= 365) return 0.075;
  return 0.05;
}

export const PPF_STOPAJ_ORANI = 0.10;

/**
 * Mevduat getiri hesabı.
 * @param {{ anapara: number, yillikFaiz: number, gun: number }} p
 */
export function mevduatHesapla({ anapara, yillikFaiz, gun = 32 }) {
  if (!anapara || anapara <= 0 || !yillikFaiz || yillikFaiz <= 0 || !gun || gun <= 0) {
    return {
      anapara: anapara || 0,
      gun: gun || 0,
      brutFaiz: yillikFaiz || 0,
      stopajOrani: 0,
      brutKazanc: 0,
      stopaj: 0,
      netKazanc: 0,
      netBakiye: anapara || 0,
      netYillikOran: 0,
    };
  }
  const stopajOrani = mevduatStopajOrani(gun);
  const brutKazanc = anapara * (yillikFaiz / 100) * (gun / 365);
  const stopaj = brutKazanc * stopajOrani;
  const netKazanc = brutKazanc - stopaj;
  const netBakiye = anapara + netKazanc;
  const netYillikOran = yillikFaiz * (1 - stopajOrani);

  return {
    anapara,
    gun,
    brutFaiz: yillikFaiz,
    stopajOrani,
    brutKazanc,
    stopaj,
    netKazanc,
    netBakiye,
    netYillikOran,
  };
}

/**
 * Para Piyasası Fonu (PPF) bileşik getiri hesabı.
 * Günlük nemalanma modeli: (1 + r/365)^gun.
 * @param {{ anapara: number, yillikGetiri: number, gun: number }} p
 */
export function ppfHesapla({ anapara, yillikGetiri, gun = 32 }) {
  if (!anapara || anapara <= 0 || !yillikGetiri || yillikGetiri <= 0 || !gun || gun <= 0) {
    return {
      anapara: anapara || 0,
      gun: gun || 0,
      brutGetiri: yillikGetiri || 0,
      stopajOrani: PPF_STOPAJ_ORANI,
      brutKazanc: 0,
      stopaj: 0,
      netKazanc: 0,
      netBakiye: anapara || 0,
      netYillikOran: 0,
      efektifBilesikBrut: 0,
    };
  }
  const gunlukOran = (yillikGetiri / 100) / 365;
  const sonBrutBakiye = anapara * Math.pow(1 + gunlukOran, gun);
  const brutKazanc = sonBrutBakiye - anapara;
  const stopaj = brutKazanc * PPF_STOPAJ_ORANI;
  const netKazanc = brutKazanc - stopaj;
  const netBakiye = anapara + netKazanc;
  const efektifBilesikBrut = (Math.pow(1 + gunlukOran, 365) - 1) * 100;
  const netYillikOran = efektifBilesikBrut * (1 - PPF_STOPAJ_ORANI);

  return {
    anapara,
    gun,
    brutGetiri: yillikGetiri,
    stopajOrani: PPF_STOPAJ_ORANI,
    brutKazanc,
    stopaj,
    netKazanc,
    netBakiye,
    netYillikOran,
    efektifBilesikBrut,
  };
}

/**
 * Mevduat ve PPF Karşılaştırması.
 * @param {{ anapara: number, mevduatFaizi: number, ppfGetirisi: number, gun: number }} p
 */
export function karsilastir({ anapara, mevduatFaizi, ppfGetirisi, gun = 32 }) {
  const mev = mevduatHesapla({ anapara, yillikFaiz: mevduatFaizi, gun });
  const ppf = ppfHesapla({ anapara, yillikGetiri: ppfGetirisi, gun });

  const farkTL = ppf.netKazanc - mev.netKazanc;
  const kazanan = Math.abs(farkTL) < 0.05 ? 'esit' : farkTL > 0 ? 'ppf' : 'mevduat';

  return {
    mevduat: mev,
    ppf,
    farkTL: Math.abs(farkTL),
    farkYon: farkTL > 0 ? 'ppf' : 'mevduat',
    kazanan,
    likiditeNotu: "Para Piyasası Fonları (PPF) hafta içi her iş günü 13:30'a kadar getiri kaybı olmadan anında nakde döner. Vadeli mevduatta ise vade bozulursa kural olarak faiz hakkı kaybolur.",
  };
}
