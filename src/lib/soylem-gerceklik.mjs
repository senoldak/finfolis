// Söylem vs. Gerçeklik Radarı (Resmi Metin / Veri Çapraz Denetimi)
// Resmi kurum beyanatları ve taahhütleri ile fiili gerçekleşen EVDS/TÜİK verilerini satır satır karşılaştırır.

export const SOYLEM_KAYITLARI = [
  {
    id: 'ovp_2024_enflasyon',
    kurum: 'Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı / OVP',
    tarih: '2023-09-06',
    belge: '2024-2026 Orta Vadeli Program (OVP), Tablo 1.1',
    soylemMetni: '2024 yılı sonu tüketici enflasyonu (TÜFE) tahmini ve resmi hedefi %33.0 seviyesindedir.',
    gosterge: 'TÜİK Yıllık TÜFE (Aralık 2024)',
    soylemHedef: 33.0,
    birim: '%',
    hedefYil: 2024,
    tolerans: 2.0,
    evdsSeri: 'TP.FG.J0'
  },
  {
    id: 'ovp_2023_enflasyon',
    kurum: 'Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı / OVP',
    tarih: '2023-09-06',
    belge: '2024-2026 OVP Hedefleri',
    soylemMetni: '2023 yılı sonu enflasyon tahmini %65.0 olarak öngörülmüştür.',
    gosterge: 'TÜİK Yıllık TÜFE (Aralık 2023)',
    soylemHedef: 65.0,
    birim: '%',
    hedefYil: 2023,
    tolerans: 2.0,
    evdsSeri: 'TP.FG.J0'
  },
  {
    id: 'ovp_2025_enflasyon',
    kurum: 'Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı / OVP',
    tarih: '2024-09-05',
    belge: '2025-2027 Orta Vadeli Program (OVP), Tablo 2.1',
    soylemMetni: '2025 yılı sonu tüketici enflasyonu hedefi %17.5 olarak belirlenmiştir.',
    gosterge: 'TÜİK Yıllık TÜFE (2025)',
    soylemHedef: 17.5,
    birim: '%',
    hedefYil: 2025,
    tolerans: 2.0,
    evdsSeri: 'TP.FG.J0'
  },
  {
    id: 'ovp_2024_butce',
    kurum: 'Hazine ve Maliye Bakanlığı',
    tarih: '2023-10-15',
    belge: '2024 Yılı Merkezi Yönetim Bütçe Kanunu Teklifi',
    soylemMetni: '2024 yılı bütçe açığının GSYH\'ye oranının %6.4 seviyesinde gerçekleşmesi hedeflenmektedir (deprem harcamaları dahil).',
    gosterge: 'Bütçe Dengesi / GSYH',
    soylemHedef: -6.4,
    birim: '%',
    hedefYil: 2024,
    tolerans: 0.8,
    evdsSeri: 'HMB.BUTCE'
  },
  {
    id: 'tcmb_2024_ara_hedef',
    kurum: 'Türkiye Cumhuriyet Merkez Bankası (TCMB)',
    tarih: '2023-11-02',
    belge: 'Enflasyon Raporu 2023-IV Sunumu',
    soylemMetni: '2024 yıl sonu enflasyon ara hedefi ve tahmin orta noktası %36.0 olarak belirlenmiştir.',
    gosterge: 'TÜİK Yıllık TÜFE (Aralık 2024)',
    soylemHedef: 36.0,
    birim: '%',
    hedefYil: 2024,
    tolerans: 2.0,
    evdsSeri: 'TP.FG.J0'
  }
];

/**
 * Resmi veriyle beyanatları eşleştirip sapmaları kategorize eder.
 */
export function soylemKarsilastir(resmi) {
  const sonuclar = [];
  const tufeSatirlar = resmi?.enflasyon?.satirlar ?? [];
  const butceSatirlar = resmi?.butce?.satirlar ?? [];

  for (const kayit of SOYLEM_KAYITLARI) {
    let gerceklesen = null;

    if (kayit.id.includes('enflasyon') || kayit.id.includes('ara_hedef')) {
      const yilSatiri = tufeSatirlar.find((s) => s.yil === kayit.hedefYil && s.ay === 12)
        ?? tufeSatirlar.filter((s) => s.yil === kayit.hedefYil).at(-1);
      if (yilSatiri && typeof yilSatiri.yillik === 'number') {
        gerceklesen = yilSatiri.yillik;
      }
    } else if (kayit.id.includes('butce')) {
      const butceSatir = butceSatirlar.find((s) => s.yil === kayit.hedefYil && s.ay === 12)
        ?? butceSatirlar.filter((s) => s.yil === kayit.hedefYil).at(-1);
      if (butceSatir && typeof butceSatir.acikGsyhYuzde === 'number') {
        gerceklesen = butceSatir.acikGsyhYuzde;
      }
    }

    let durum = 'bekleniyor'; // Veri henüz açıklanmadıysa
    let sapma = null;

    if (gerceklesen !== null) {
      sapma = Math.round((gerceklesen - kayit.soylemHedef) * 100) / 100;
      const mutlakFark = Math.abs(sapma);

      if (mutlakFark <= kayit.tolerans) {
        durum = 'dogrulandi';
      } else if (mutlakFark <= kayit.tolerans * 2.5) {
        durum = 'sapma_var';
      } else {
        durum = 'ciddi_sapma';
      }
    }

    sonuclar.push({
      ...kayit,
      gerceklesen,
      sapma,
      durum
    });
  }

  return sonuclar;
}
