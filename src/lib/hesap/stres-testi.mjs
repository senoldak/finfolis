// Şok duyarlılığı: petrol, asgari ücret ve kur şoklarının TÜFE ve cari dengeye tek tek etkisi.
// Yalnız TCMB'nin yayımladığı katsayılar kullanılır (26 Kasım 2026'da kontrol edildi). Sonuç tahmin değildir:
// her şokun diğer her şey sabitken ortalama etkisidir.

export const KAYNAKLAR = {
  petrol: {
    ad: 'TCMB Merkezin Güncesi, "Uluslararası Petrol Fiyatlarının Tüketici Fiyatlarına ve Cari Dengeye Yansımaları", Temmuz 2025',
    url: 'https://www.tcmb.gov.tr/wps/wcm/connect/blog/tr/main%2Bmenu/analizler/uluslararasi%2Bpetrol%2Bfiyatlarinin%2Btuketici%2Bfiyatlarina%2Bve%2Bcari%2Bdengeye%2Byansimalari',
  },
  asgariUcret: {
    ad: 'TCMB Enflasyon Raporu 2023-III, Kutu 2.6, "Asgari Ücret Artışının Enflasyona Etkisi Üzerine Bir Değerlendirme"',
    url: 'https://www.tcmb.gov.tr/wps/wcm/connect/9e350e68-3d3e-44bf-8590-83cd5eb0cf78/Kutu_2.6_2023_iii..pdf?MOD=AJPERES&CACHEID=ROOTWORKSPACE-9e350e68-3d3e-44bf-8590-83cd5eb0cf78-oCmsQkM',
  },
  kurKisa: {
    ad: 'TCMB Merkezin Güncesi, "Kurdan Enflasyona Geçiş", Ocak 2017',
    url: 'https://www.tcmb.gov.tr/wps/wcm/connect/blog/tr/main+menu/analizler/kurdan_enflasyona_gecis',
  },
  kurUzun: {
    ad: 'TCMB Çalışma Tebliği 25/05, "Büyük Kur Şokları ve Kur Geçişkenliğinde Doğrusal Olmayan Etkiler", Nisan 2025',
    url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Arastirma+Yayinlari/Calisma+Tebligleri/2025/25-05',
  },
};

export const KATSAYILAR = {
  // Brent'te %10 artış → TÜFE nihai olarak +1 puan (yarısı ilk çeyrekte).
  petrolTufePuanYuzde10: 1.0,
  // Brent'te her +10 $ → 12 ayda cari açık ~2,6 milyar $ artar.
  petrolCariMlrUsd10Dolar: 2.6,
  // Asgari ücrette %1 nominal artış → bir yılda enflasyona 0,08-0,12 puan.
  asgariUcretPuanYuzde1: [0.08, 0.12],
  // TL'deki %1 değer kaybı → bir yılda TÜFE ~0,15 puan (2017); uzun dönemde 0,38-0,40 (ılımlı şok, 2025).
  kurBirYil: 0.15,
  kurUzunDonem: [0.38, 0.4],
};

const yuvarla = (n) => Math.round(n * 10) / 10;
const sayi = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * @param {{ brentFiyati: number, brentDegisimUsd: number, asgariUcretArtisiYuzde: number, kurDegerKaybiYuzde: number }} g
 */
export function sokEtkileri(g = {}) {
  const brent = sayi(g.brentFiyati);
  const dBrent = sayi(g.brentDegisimUsd);
  const ucret = Math.max(0, sayi(g.asgariUcretArtisiYuzde));
  const kur = Math.max(0, sayi(g.kurDegerKaybiYuzde));

  const brentYuzde = brent > 0 ? (dBrent / brent) * 100 : 0;
  const petrolTufe = yuvarla((brentYuzde / 10) * KATSAYILAR.petrolTufePuanYuzde10);
  const petrolCari = yuvarla((dBrent / 10) * KATSAYILAR.petrolCariMlrUsd10Dolar);
  const ucretTufe = KATSAYILAR.asgariUcretPuanYuzde1.map((k) => yuvarla(ucret * k));
  const kurBirYil = yuvarla(kur * KATSAYILAR.kurBirYil);
  const kurUzun = KATSAYILAR.kurUzunDonem.map((k) => yuvarla(kur * k));

  return {
    brentYuzde: yuvarla(brentYuzde),
    petrolTufe,
    petrolCari, // pozitif = cari açık büyür
    ucretTufe,
    kurBirYil,
    kurUzun,
    birYilToplam: [yuvarla(petrolTufe + ucretTufe[0] + kurBirYil), yuvarla(petrolTufe + ucretTufe[1] + kurBirYil)],
  };
}

/** Son 12 ayın cari denge toplamı (milyar $). satirlar: { yil, ay, cari (milyon $) }. */
export function cariOnIkiAy(satirlar = []) {
  const son = satirlar.slice(-12);
  if (son.length < 12 || son.some((s) => typeof s.cari !== 'number')) return null;
  return { toplam: yuvarla(son.reduce((a, s) => a + s.cari, 0) / 1000), bas: son[0], bit: son.at(-1) };
}
