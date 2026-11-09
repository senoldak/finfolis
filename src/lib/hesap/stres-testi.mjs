// What-If & Makro Stres Testi Simülatörü
// Petrol, asgari ücret, kur geçişkenliği ve faiz şoklarının enflasyon, cari denge ve Taylor kuralına duyarlılığı

export const VARSAYILAN_PARAMETRELER = {
  bazTufe: 38.5,             // % Yıllık TÜFE baz beklentisi
  bazCariAcikMilyarUsd: -20.0,// Milyar USD cari denge
  bazPolitikaFaizi: 45.0,     // % Mevcut TCMB politika faizi
  bazAsgariUcretZammı: 25.0,  // % Baz asgari ücret artış varsayımı
  kurGeciskenligi: 0.28,      // 12 aylık kümülatif kur geçişkenliği katsayısı
  petrolTufeKatsayisi: 0.14,  // Her 10$'lık petrol artışının enflasyona puan etkisi (0.14 = 1.4 puan / 10$)
  petrolCariKatsayisi: -0.42, // Her 1$'lık petrol artışının cari açığa net etkisi (-0.42 milyar $)
  ucretGeciskenligi: 0.20,    // Bazın üzerindeki her 1 puanlık ücret zammının enflasyona puan etkisi
  faizSıkılasmaKatsayisi: -0.05 // Her 1 puanlık (100 bp) faiz artışının enflasyonu dizginleme etkisi
};

export const HEDEF_ENFLASYON = 5.0; // TCMB yasal hedefi (%)

/**
 * Taylor kuralı bandını hesaplar: i = r* + pi + a*(pi - pi*)
 * r* in [1, 3], a in [0.5, 1.0]
 */
export function taylorBandiHesapla(enflasyon) {
  const rDenge = [1.5, 2.5];
  const aKatsayilari = [0.5, 1.0];
  
  const faizler = [];
  for (const r of rDenge) {
    for (const a of aKatsayilari) {
      const f = r + enflasyon + a * (enflasyon - HEDEF_ENFLASYON);
      faizler.push(f);
    }
  }

  return {
    alt: Math.round(Math.min(...faizler) * 10) / 10,
    ust: Math.round(Math.max(...faizler) * 10) / 10,
    orta: Math.round((faizler.reduce((a, b) => a + b, 0) / faizler.length) * 10) / 10
  };
}

/**
 * Kullanıcı tarafından seçilen makro şok parametreleriyle simülasyon çıktısını üretir.
 */
export function makroStresTestiHesapla(girdi = {}) {
  const bazTufe = Number(girdi.bazTufe ?? VARSAYILAN_PARAMETRELER.bazTufe);
  const bazCari = Number(girdi.bazCariAcikMilyarUsd ?? VARSAYILAN_PARAMETRELER.bazCariAcikMilyarUsd);
  const bazFaiz = Number(girdi.bazPolitikaFaizi ?? VARSAYILAN_PARAMETRELER.bazPolitikaFaizi);

  const brentSoku = Number(girdi.brentSokuUsd || 0);
  const asgariUcretArtisi = Number(girdi.asgariUcretArtisiYuzde ?? VARSAYILAN_PARAMETRELER.bazAsgariUcretZammı);
  const kurArtisi = Number(girdi.kurArtisiYuzde || 0);
  const kurKatsayisi = Number(girdi.kurGeciskenligi ?? VARSAYILAN_PARAMETRELER.kurGeciskenligi);
  const faizDegisimi = Number(girdi.faizDegisimiPuan || 0);

  // 1. Petrol şoku etkisi
  const petrolTufeEtkisi = (brentSoku / 10) * (VARSAYILAN_PARAMETRELER.petrolTufeKatsayisi * 10);
  const petrolCariEtkisi = brentSoku * VARSAYILAN_PARAMETRELER.petrolCariKatsayisi;

  // 2. Asgari ücret şoku etkisi (Baz artışın üzerindeki/altındaki fark)
  const ucretFarki = asgariUcretArtisi - VARSAYILAN_PARAMETRELER.bazAsgariUcretZammı;
  const ucretTufeEtkisi = ucretFarki * VARSAYILAN_PARAMETRELER.ucretGeciskenligi;

  // 3. Döviz kuru geçişkenliği
  const kurTufeEtkisi = kurArtisi * kurKatsayisi;

  // 4. Politika faizi talep kısıtlama etkisi
  const faizTufeEtkisi = faizDegisimi * VARSAYILAN_PARAMETRELER.faizSıkılasmaKatsayisi;

  // Kümülatif enflasyon sapması
  const tufeSapmasiPuan = Math.round((petrolTufeEtkisi + ucretTufeEtkisi + kurTufeEtkisi + faizTufeEtkisi) * 10) / 10;
  const simuleTufe = Math.max(0, Math.round((bazTufe + tufeSapmasiPuan) * 10) / 10);

  // Kümülatif cari denge etkisi
  // Kur artışı ithalatı kısarak cari dengeyi bir miktar düzeltir (J-eğrisi sonrası)
  const kurCariDengeEtkisi = kurArtisi * 0.35;
  const cariSapmaMilyarUsd = Math.round((petrolCariEtkisi + kurCariDengeEtkisi) * 10) / 10;
  const simuleCariAcik = Math.round((bazCari + cariSapmaMilyarUsd) * 10) / 10;

  // Simüle edilen politika faizi
  const simulePolitikaFaizi = Math.max(0, Math.round((bazFaiz + faizDegisimi) * 10) / 10);

  // Taylor Kuralı Bandı
  const taylorBand = taylorBandiHesapla(simuleTufe);
  const taylorUyumsuzlukPuan = Math.round((simulePolitikaFaizi - taylorBand.orta) * 10) / 10;

  return {
    bazTufe,
    simuleTufe,
    tufeSapmasiPuan,
    bazCariAcik: bazCari,
    simuleCariAcik,
    cariSapmaMilyarUsd,
    bazPolitikaFaizi: bazFaiz,
    simulePolitikaFaizi,
    brentSokuUsd: brentSoku,
    asgariUcretArtisiYuzde: asgariUcretArtisi,
    kurArtisiYuzde: kurArtisi,
    faizDegisimiPuan: faizDegisimi,
    taylorBand,
    taylorUyumsuzlukPuan,
    bilesenler: {
      petrolTufe: Math.round(petrolTufeEtkisi * 10) / 10,
      ucretTufe: Math.round(ucretTufeEtkisi * 10) / 10,
      kurTufe: Math.round(kurTufeEtkisi * 10) / 10,
      faizTufe: Math.round(faizTufeEtkisi * 10) / 10,
      petrolCari: Math.round(petrolCariEtkisi * 10) / 10
    }
  };
}
