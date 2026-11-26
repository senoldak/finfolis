// Resmî yıl sonu enflasyon tahminleri ile gerçekleşen TÜFE (TÜİK, Aralık, yıllık %).
// Değerler belgelerden elle alındı ve 26 Kasım 2026'da kontrol edildi:
//  - OVP 2024-2026 (Eylül 2023): 2023 gerçekleşme tahmini 65,0; 2024 tahmini 33,0.
//  - TCMB Enflasyon Raporu 2023-IV (Kasım 2023): 2024 sonu tahmin aralığının orta noktası 36.
//  - OVP 2025-2027 (Eylül 2024): 2024 gerçekleşme tahmini 41,5; 2025 tahmini 17,5.
//  - OVP 2026-2028 (Eylül 2025, Grafik 10): 2025 gerçekleşme tahmini 28,5; 2026 tahmini 16,0.
// Gerçekleşme tahmini, yıl bitmeden yapılan güncel tahmindir; hedef değildir.

const OVP_2024 = {
  kurum: 'Strateji ve Bütçe Başkanlığı',
  belge: 'Orta Vadeli Program 2024-2026',
  donem: 'Eylül 2023',
  url: 'https://www.sbb.gov.tr/wp-content/uploads/2023/09/Orta-Vadeli-Program_2024-2026.pdf',
};
const OVP_2025 = {
  kurum: 'Strateji ve Bütçe Başkanlığı',
  belge: 'Orta Vadeli Program 2025-2027',
  donem: 'Eylül 2024',
  url: 'https://www.sbb.gov.tr/wp-content/uploads/2024/09/Orta-Vadeli-Program_2025-2027.pdf',
};
const OVP_2026 = {
  kurum: 'Strateji ve Bütçe Başkanlığı',
  belge: 'Orta Vadeli Program 2026-2028',
  donem: 'Eylül 2025',
  url: 'https://www.sbb.gov.tr/orta-vadeli-program-2026-2028/',
};
const TCMB_ER_2023_IV = {
  kurum: 'Türkiye Cumhuriyet Merkez Bankası',
  belge: 'Enflasyon Raporu 2023-IV',
  donem: 'Kasım 2023',
  url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar/Enflasyon+Raporu',
};

export const TUR_ADLARI = {
  tahmin: 'Tahmin',
  'gerceklesme-tahmini': 'Gerçekleşme tahmini',
  'tahmin-orta-nokta': 'Tahmin (aralığın orta noktası)',
};

export const TAHMINLER = [
  { yil: 2023, deger: 65.0, tur: 'gerceklesme-tahmini', ...OVP_2024 },
  { yil: 2024, deger: 33.0, tur: 'tahmin', ...OVP_2024 },
  { yil: 2024, deger: 36.0, tur: 'tahmin-orta-nokta', ...TCMB_ER_2023_IV },
  { yil: 2024, deger: 41.5, tur: 'gerceklesme-tahmini', ...OVP_2025 },
  { yil: 2025, deger: 17.5, tur: 'tahmin', ...OVP_2025 },
  { yil: 2025, deger: 28.5, tur: 'gerceklesme-tahmini', ...OVP_2026 },
  { yil: 2026, deger: 16.0, tur: 'tahmin', ...OVP_2026 },
];

/**
 * Yıl yıl gruplar: gerçekleşen Aralık TÜFE'si (yoksa null) ve o yıl için yapılan tahminler.
 * fark = gerçekleşen − tahmin (yüzde puan, iki ondalık); veri yoksa null. Yeni yıl önce gelir.
 */
export function tahminKarsilastir(resmi) {
  const satirlar = resmi?.enflasyon?.satirlar ?? [];
  const yillar = [...new Set(TAHMINLER.map((t) => t.yil))].sort((a, b) => b - a);
  return yillar.map((yil) => {
    const aralik = satirlar.find((s) => s.yil === yil && s.ay === 12);
    const gerceklesen = typeof aralik?.yillik === 'number' ? aralik.yillik : null;
    const tahminler = TAHMINLER.filter((t) => t.yil === yil).map((t) => ({
      ...t,
      fark: gerceklesen === null ? null : Math.round((gerceklesen - t.deger) * 100) / 100,
    }));
    return { yil, gerceklesen, tahminler };
  });
}

/** Sayfanın kaynak listesi: tekrarsız belgeler. */
export function belgeler() {
  const gorulen = new Map();
  for (const t of TAHMINLER) if (!gorulen.has(t.url)) gorulen.set(t.url, { kurum: t.kurum, belge: t.belge, donem: t.donem, url: t.url });
  return [...gorulen.values()];
}
