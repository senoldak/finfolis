// BİST 100 / TÜFE reel endeksi ve standart sapma bantları hesaplayıcısı.
// BİST 100 nominal kapanışını TÜİK TÜFE endeksine bölerek reel satın alma gücünü ve
// 2 yıllık dönem ortalamasına göre standart sapma bantlarını (+2σ, -2σ, -3σ) hesaplar.

export const BAZ_ORTALAMA = 107.5; // Grafikteki geleneksel Matriks ölçeğiyle uyumlu hedef ortalama seviyesi

/**
 * Aylık TÜFE enflasyon satırlarından kümülatif TÜFE endeks haritası üretir.
 * @param {Array<{ yil: number, ay: number, aylik: number }>} satirlar
 * @param {number} bazEndeks - Ocak 2024 TÜFE baz endeksi (TÜİK resmi: 1984.02)
 * @returns {Record<string, number>} 'YYYY-MM' -> TÜFE endeksi
 */
export function tufeEndeksHaritasi(satirlar, bazEndeks = 1984.02) {
  if (!satirlar || satirlar.length === 0) return {};

  const map = {};
  const jan2024Idx = satirlar.findIndex((s) => s.yil === 2024 && s.ay === 1);

  if (jan2024Idx !== -1) {
    let cur = bazEndeks;
    map['2024-01'] = cur;
    // İleriye doğru bileşik çarpım
    for (let i = jan2024Idx + 1; i < satirlar.length; i++) {
      cur = cur * (1 + (satirlar[i].aylik ?? 0) / 100);
      map[`${satirlar[i].yil}-${String(satirlar[i].ay).padStart(2, '0')}`] = cur;
    }
    // Geriye doğru bölme
    cur = bazEndeks;
    for (let i = jan2024Idx - 1; i >= 0; i--) {
      cur = cur / (1 + (satirlar[i + 1].aylik ?? 0) / 100);
      map[`${satirlar[i].yil}-${String(satirlar[i].ay).padStart(2, '0')}`] = cur;
    }
  } else {
    // 2024 yoksa ilk satırdan 100 olarak başla
    let cur = 100;
    for (const s of satirlar) {
      cur = cur * (1 + (s.aylik ?? 0) / 100);
      map[`${s.yil}-${String(s.ay).padStart(2, '0')}`] = cur;
    }
  }

  return map;
}

/**
 * Verilen gün için TÜFE değerini bulur veya son açıklanan aya göre enterpole eder.
 * @param {string} isoTarih - 'YYYY-MM-DD'
 * @param {Record<string, number>} tufeMap
 * @param {number} varsayilan
 */
export function gunlukTufeBul(isoTarih, tufeMap, varsayilan) {
  const ym = isoTarih.slice(0, 7);
  return tufeMap[ym] || varsayilan;
}

/**
 * BİST 100 kapanışları ve TÜFE verisinden reel seriyi ve bantları hesaplar.
 * @param {Array<{ tarih: string, deger: number }>} kapanislar - BIST 100 günlük kapanışları
 * @param {Array<{ yil: number, ay: number, aylik: number }>} tufeSatirlari - Resmi TÜFE satırları
 * @param {object} [secenekler]
 * @param {number} [secenekler.gunSayisi=504] - 2 yıl yaklaşık 504 iş günüdür
 * @param {number} [secenekler.hedefOrtalama=107.5]
 */
export function bistTufeAnalizi(kapanislar, tufeSatirlari, secenekler = {}) {
  const gunSayisi = secenekler.gunSayisi ?? 504;
  const hedefOrtalama = secenekler.hedefOrtalama ?? BAZ_ORTALAMA;

  if (!kapanislar || kapanislar.length < 30 || !tufeSatirlari || tufeSatirlari.length === 0) {
    throw new Error('Yetersiz veri: En az 30 işlem günü ve TÜFE serisi gerekir');
  }

  const tufeMap = tufeEndeksHaritasi(tufeSatirlari);
  const sonTufeSatiri = tufeSatirlari.at(-1);
  const sonTufeDegeri = tufeMap[`${sonTufeSatiri.yil}-${String(sonTufeSatiri.ay).padStart(2, '0')}`];

  // Ham rasyo (XU100 / TÜFE)
  const hamNoktalar = [];
  for (const k of kapanislar) {
    const tufe = gunlukTufeBul(k.tarih, tufeMap, sonTufeDegeri);
    if (tufe > 0 && k.deger > 0) {
      hamNoktalar.push({
        tarih: k.tarih,
        bist: k.deger,
        tufe,
        hamRasyo: k.deger / tufe,
      });
    }
  }

  if (hamNoktalar.length < 30) {
    throw new Error('Eşleşen nokta sayısı yetersiz');
  }

  // Son 2 yıllık pencere (veya eldeki tüm noktalar < gunSayisi ise)
  const pencere = hamNoktalar.slice(-gunSayisi);
  const hamToplam = pencere.reduce((acc, p) => acc + p.hamRasyo, 0);
  const hamOrtalama = hamToplam / pencere.length;

  // Standart ölçek katsayısı (Ortalamayı hedefOrtalama = 107.5 seviyesine getirir)
  const katsayi = hedefOrtalama / hamOrtalama;

  // Ölçeklenmiş noktalar ve standart sapma hesabı
  let varyansToplam = 0;
  const seriler = pencere.map((p) => {
    const deger = p.hamRasyo * katsayi;
    varyansToplam += (deger - hedefOrtalama) ** 2;
    return {
      tarih: p.tarih,
      bist: Math.round(p.bist * 100) / 100,
      deger: Math.round(deger * 100) / 100,
    };
  });

  const rawStd = Math.sqrt(varyansToplam / pencere.length);
  const stdSapma = Math.round(rawStd * 100) / 100;
  const arti2Std = Math.round((hedefOrtalama + 2 * stdSapma) * 100) / 100;
  const eksi2Std = Math.round((hedefOrtalama - 2 * stdSapma) * 100) / 100;
  const eksi3Std = Math.round((hedefOrtalama - 3 * stdSapma) * 100) / 100;

  const sonNokta = seriler.at(-1);
  const guncelDeger = sonNokta.deger;
  const zSkoru = (guncelDeger - hedefOrtalama) / (stdSapma || 1);

  // Durum değerlendirmesi
  let durum = 'Normal Bölge';
  let durumRenk = 'notr';
  let durumAciklama = 'BİST 100 reel değeri 2 yıllık tarihsel ortalamasına yakın seyrediyor.';

  if (guncelDeger <= eksi3Std) {
    durum = 'Aşırı İskonto (-3 Standart Sapma Sınırında)';
    durumRenk = 'dusus';
    durumAciklama = 'Endeks, enflasyona göre son 2 yılın en dip ve istatistiksel olarak en ucuz bölgesinde (%99,7 sınırının altında).';
  } else if (guncelDeger <= eksi2Std) {
    durum = 'İskonto Bölgesi (-2 Standart Sapma Altı)';
    durumRenk = 'dusus';
    durumAciklama = 'Endeks tarihsel ortalamanın 2 standart sapma altında, güçlü değer bölgesinde.';
  } else if (guncelDeger >= arti2Std) {
    durum = 'Pahalı Bölge (+2 Standart Sapma Üstü)';
    durumRenk = 'yukselis';
    durumAciklama = 'Endeks enflasyona göre tarihsel ortalamasının 2 standart sapma üzerinde, primli bölgede.';
  }

  return {
    guncelleme: sonNokta.tarih,
    sonBist: sonNokta.bist,
    guncelDeger,
    ortalama: hedefOrtalama,
    stdSapma: Math.round(stdSapma * 100) / 100,
    arti2Std,
    eksi2Std,
    eksi3Std,
    zSkoru: Math.round(zSkoru * 100) / 100,
    farkYuzde: Math.round(((guncelDeger - hedefOrtalama) / hedefOrtalama) * 1000) / 10,
    durum,
    durumRenk,
    durumAciklama,
    noktalar: seriler,
  };
}
