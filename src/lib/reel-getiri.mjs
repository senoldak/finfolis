const AY_KISALTMALARI = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

/**
 * Belirli bir yıl ve ayın son gününde geçerli olan TCMB politika faizinin aylık basit karşılığını (% / 12) döner.
 * @param {Array<{ tarih: string, oran: number }>} faizGecmisi
 * @param {number} yil
 * @param {number} ay (1-12)
 * @returns {number}
 */
export function aylikFaizBul(faizGecmisi = [], yil, ay) {
  // Ayın son günü (YYYY-MM-DD)
  const sonGunTarihi = new Date(Date.UTC(yil, ay, 0)).toISOString().slice(0, 10);

  // Tarihe göre sıralı geçmişte bu tarihten önceki veya eşit olan en son geçerli faiz
  const sirali = [...faizGecmisi].sort((a, b) => a.tarih.localeCompare(b.tarih));
  let gecerliOran = null;

  for (const k of sirali) {
    if (k.tarih <= sonGunTarihi) {
      gecerliOran = k.oran;
    } else {
      break;
    }
  }

  if (gecerliOran == null && sirali.length > 0) {
    gecerliOran = sirali[0].oran;
  }

  const aylik = (gecerliOran ?? 0) / 12;
  return Number(aylik.toFixed(2));
}

/**
 * TÜİK TÜFE, İTO İstanbul ve TCMB Politika Faizi serilerini tek bir zaman serisinde birleştirir.
 * @param {object} params
 * @param {Array<{ yil: number, ay: number, aylik: number }>} params.tufeSatirlari
 * @param {Array<{ yil: number, ay: number, aylik: number }>} [params.itoSatirlari]
 * @param {Array<{ tarih: string, oran: number }>} [params.faizGecmisi]
 * @param {number} [params.aySayisi]
 * @returns {Array<{ yil: number, ay: number, etiket: string, tamEtiket: string, tufe: number, ito: number | null, tcmbFaiz: number, reelFark: number }>}
 */
export function birlestirReelGetiriVerisi({
  tufeSatirlari = [],
  itoSatirlari = [],
  faizGecmisi = [],
  aySayisi = 21,
} = {}) {
  const sonTufe = tufeSatirlari.slice(-aySayisi);
  const itoHaritasi = new Map(itoSatirlari.map((s) => [`${s.yil}-${s.ay}`, s.aylik]));

  return sonTufe.map((t) => {
    const itoVal = itoHaritasi.get(`${t.yil}-${t.ay}`);
    const tcmbFaiz = aylikFaizBul(faizGecmisi, t.yil, t.ay);
    const ayKisa = AY_KISALTMALARI[t.ay - 1] ?? String(t.ay);
    const yilKisa = String(t.yil).slice(-2);
    const etiket = `${ayKisa}.${yilKisa}`;
    const tamEtiket = `${ayKisa} ${t.yil}`;
    const reelFark = Number((tcmbFaiz - t.aylik).toFixed(2));

    return {
      yil: t.yil,
      ay: t.ay,
      etiket,
      tamEtiket,
      tufe: t.aylik,
      ito: itoVal != null ? Number(itoVal.toFixed(2)) : null,
      tcmbFaiz,
      reelFark,
    };
  });
}
