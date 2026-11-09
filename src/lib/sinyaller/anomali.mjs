// Sessiz Sinyal & Anomali Avcısı (Erken Uyarı Radarı)
// EVDS öncü serilerinde 12 haftalık ortalamadan +/- 2 sigma standart sapma aşımı denetimi

/**
 * Verilen pencere değerlerine göre z-skorunu hesaplar.
 */
export function zSkorHesapla(deger, pencereDegerleri) {
  if (!pencereDegerleri || pencereDegerleri.length < 3) return 0;
  
  const n = pencereDegerleri.length;
  const ortalama = pencereDegerleri.reduce((a, b) => a + b, 0) / n;
  
  const varyans = pencereDegerleri.reduce((acc, v) => acc + Math.pow(v - ortalama, 2), 0) / n;
  const std = Math.sqrt(varyans);
  
  if (std === 0) return 0;
  return Math.round(((deger - ortalama) / std) * 100) / 100;
}

/**
 * Zaman serisi noktalarında kayan pencereyle anomali tespiti yapar.
 */
export function seriAnomaliTara(noktalar, secenekler = {}) {
  const pencere = secenekler.pencere || 12;
  const esikSigma = secenekler.esikSigma || 2.0;

  const sonuclar = [];
  if (!Array.isArray(noktalar) || noktalar.length <= pencere) {
    return sonuclar;
  }

  for (let i = pencere; i < noktalar.length; i++) {
    const gecmis = noktalar.slice(i - pencere, i).map((n) => n.deger).filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (gecmis.length < pencere * 0.75) continue;

    const simdiki = noktalar[i];
    if (typeof simdiki.deger !== 'number' || !Number.isFinite(simdiki.deger)) continue;

    const z = zSkorHesapla(simdiki.deger, gecmis);
    const absZ = Math.abs(z);

    if (absZ >= esikSigma) {
      const ortalama = gecmis.reduce((a, b) => a + b, 0) / gecmis.length;
      const varyans = gecmis.reduce((acc, v) => acc + Math.pow(v - ortalama, 2), 0) / gecmis.length;
      const std = Math.sqrt(varyans);

      sonuclar.push({
        tarih: simdiki.tarih,
        deger: simdiki.deger,
        ortalama: Math.round(ortalama * 100) / 100,
        standartSapma: Math.round(std * 100) / 100,
        zSkor: z,
        seviye: absZ >= 3.0 ? 'ekstrem' : 'anomali',
        yon: z > 0 ? 'yukari' : 'asagi'
      });
    }
  }

  return sonuclar;
}

/**
 * resmi.json veri havuzundaki öncü göstergeleri tarar ve standart anomali fişleri üretir.
 */
export function anomaliFisleriUret(resmi) {
  const fisler = [];
  if (!resmi) return fisler;

  // 1. Yabancı DİBS ve Hisse Portföy Akımları
  if (resmi.portfoyHaftalik?.satirlar) {
    const dibsNoktalar = resmi.portfoyHaftalik.satirlar.map((s) => ({ tarih: s.tarih, deger: s.dibs }));
    const hisseNoktalar = resmi.portfoyHaftalik.satirlar.map((s) => ({ tarih: s.tarih, deger: s.hisse }));

    const dibsAnomaliler = seriAnomaliTara(dibsNoktalar);
    for (const a of dibsAnomaliler) {
      fisler.push({
        gostergeKodu: 'yabanciDibs',
        gostergeAdi: 'Yabancı DİBS Net Akımı',
        birim: 'Milyon USD',
        baglanti: '/veri/yabanci-portfoy-akimlari/',
        ...a,
        kanitMetni: `Yabancı DİBS net akımı (${a.deger} mn $) son 12 haftalık ortalamanın (${a.ortalama} mn $) ${Math.abs(a.zSkor)} standart sapma ${a.yon === 'yukari' ? 'üzerinde' : 'altında'} gerçekleşti.`
      });
    }

    const hisseAnomaliler = seriAnomaliTara(hisseNoktalar);
    for (const a of hisseAnomaliler) {
      fisler.push({
        gostergeKodu: 'yabanciHisse',
        gostergeAdi: 'Yabancı Hisse Net Akımı',
        birim: 'Milyon USD',
        baglanti: '/veri/yabanci-portfoy-akimlari/',
        ...a,
        kanitMetni: `Yabancı hisse net alımı (${a.deger} mn $) son 12 haftalık seyrin ${Math.abs(a.zSkor)} standart sapma ${a.yon === 'yukari' ? 'üzerinde' : 'altında'} gerçekleşti.`
      });
    }
  }

  // 2. TCMB Brüt Rezerv
  if (resmi.brutRezerv?.satirlar) {
    const rezervNoktalar = resmi.brutRezerv.satirlar.map((s) => ({ tarih: s.tarih, deger: s.toplam }));
    const rezervAnomaliler = seriAnomaliTara(rezervNoktalar);
    for (const a of rezervAnomaliler) {
      fisler.push({
        gostergeKodu: 'brutRezerv',
        gostergeAdi: 'TCMB Brüt Rezervleri',
        birim: 'Milyon USD',
        baglanti: '/veri/tcmb-rezervleri/',
        ...a,
        kanitMetni: `TCMB brüt rezervi (${Math.round(a.deger / 1000)} mlr $) 12 haftalık banttan ${Math.abs(a.zSkor)} sigma ${a.yon === 'yukari' ? 'artış' : 'düşüş'} yönünde saptı.`
      });
    }
  }

  // 3. Haftalık Kartlı Harcamalar
  if (resmi.kart?.satirlar) {
    const kartNoktalar = resmi.kart.satirlar.map((s) => ({ tarih: s.tarih, deger: s.toplam }));
    const kartAnomaliler = seriAnomaliTara(kartNoktalar);
    for (const a of kartAnomaliler) {
      fisler.push({
        gostergeKodu: 'kartliHarcama',
        gostergeAdi: 'Kartlı Harcama Hacmi',
        birim: 'Milyon TL',
        baglanti: '/veri/kartli-harcamalar/',
        ...a,
        kanitMetni: `Haftalık kartlı harcamalar (${a.deger} mn TL) 12 haftalık eğilimden ${Math.abs(a.zSkor)} sigma ${a.yon === 'yukari' ? 'yukarı' : 'aşağı'} hareket etti.`
      });
    }
  }

  // 4. Para Piyasası Fonlama / AOFM
  if (resmi.paraPiyasasi?.satirlar) {
    const aofmNoktalar = resmi.paraPiyasasi.satirlar.map((s) => ({ tarih: s.tarih, deger: s.aofm }));
    const aofmAnomaliler = seriAnomaliTara(aofmNoktalar);
    for (const a of aofmAnomaliler) {
      fisler.push({
        gostergeKodu: 'aofm',
        gostergeAdi: 'Ağırlıklı Ortalama Fonlama Maliyeti (AOFM)',
        birim: '%',
        baglanti: '/veri/para-piyasasi/',
        ...a,
        kanitMetni: `TCMB AOFM oranı (%${a.deger}) 12 haftalık ortalamanın ${Math.abs(a.zSkor)} standart sapma ${a.yon === 'yukari' ? 'üzerine çıktı' : 'altına indi'}.`
      });
    }
  }

  // Yeniden eskiye sırala
  return fisler.sort((a, b) => b.tarih.localeCompare(a.tarih));
}
