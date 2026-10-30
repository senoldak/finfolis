// finfolis Grafik Katalogu: Mebius 62 Finansal Grafik Bileseninin Finfolis Kimligine Uyarlanmis Veri Modeli
// Her gosterge finfolis BRAND.md ve DESIGN.md kurallarina uygun olarak resmi kaynak, tarih, yonlu degisim
// (▲ yesil / ▼ kirmizi), kagit/murekkep/pismis toprak renk paleti ve Bricolage Grotesque tipografisiyle tanimlanmistir.

export type GrafikTuru =
  | 'alan'
  | 'sutun'
  | 'yigilmis-sutun'
  | 'ayrisan-cubuk'
  | 'aralik-bant'
  | 'halka-pay'
  | 'radyal-hedef'
  | 'coklu-karma'
  | 'nokta-dagilim'
  | 'siralama-cubuk'
  | 'akis-selale';

export interface Nokta {
  etiket: string;
  deger: number;
}

export interface Dilim {
  ad: string;
  oran: number;
  renk: 'toprak' | 'murekkep' | 'komur' | 'yesil' | 'gri';
}

export interface AralikNoktasi {
  etiket: string;
  min: number;
  max: number;
  mevcut: number;
}

export interface YigilmisGrup {
  etiket: string;
  varlik: number;
  yukumluluk: number;
}

export interface CokluNokta {
  etiket: string;
  cubuk: number;
  cizgi: number;
}

export interface SiralamaOgesi {
  etiket: string;
  deger: number;
}

export interface AkisAdimi {
  ad: string;
  deger: number;
  tur: 'artis' | 'azalis' | 'net';
}

export interface ScatterNokta {
  x: number;
  y: number;
}

export interface FinfolisGrafikTanimi {
  id: string;
  tur: GrafikTuru;
  kategori: 'PİYASALAR' | 'BORSA' | 'DÖVİZ & ALTIN' | 'EKONOMİ' | 'KİŞİSEL FİNANS' | 'BANKACILIK';
  baslik: string;
  aciklama: string;
  metrik: string;
  degisim: number;
  degisimEtiket: string;
  tarih: string;
  kaynak: string;
  mebiusTitle: string;
  exportName: string;
  mebiusFile: string;
  previewImage: string;
  boncukMiktar?: number;
  boncukBirim?: string;
  seri?: Nokta[];
  dilimler?: Dilim[];
  araliklar?: AralikNoktasi[];
  gruplar?: YigilmisGrup[];
  seriler?: CokluNokta[];
  ogeler?: SiralamaOgesi[];
  adimlari?: AkisAdimi[];
  noktalar?: ScatterNokta[];
  oran?: number;
  hedef?: number;
}

export const FİNFOLİS_GRAFİKLER: FinfolisGrafikTanimi[] = [
  {
    "id": "charts-total-value",
    "tur": "alan",
    "kategori": "PİYASALAR",
    "baslik": "Toplam Portföy Değeri",
    "aciklama": "Son 12 aydaki kümülatif portföy büyümesi ve aylık değer kazanımı.",
    "metrik": "₺1.428.500",
    "degisim": 4.8,
    "degisimEtiket": "geçen aya göre",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺200.000",
    "kaynak": "TCMB & MKK",
    "seri": [
      {
        "etiket": "Kas",
        "deger": 1120
      },
      {
        "etiket": "Ara",
        "deger": 1160
      },
      {
        "etiket": "Oca",
        "deger": 1195
      },
      {
        "etiket": "Şub",
        "deger": 1210
      },
      {
        "etiket": "Mar",
        "deger": 1260
      },
      {
        "etiket": "Nis",
        "deger": 1290
      },
      {
        "etiket": "May",
        "deger": 1315
      },
      {
        "etiket": "Haz",
        "deger": 1340
      },
      {
        "etiket": "Tem",
        "deger": 1360
      },
      {
        "etiket": "Ağu",
        "deger": 1390
      },
      {
        "etiket": "Eyl",
        "deger": 1410
      },
      {
        "etiket": "Eki",
        "deger": 1428
      }
    ],
    "mebiusTitle": "Total Value Chart",
    "exportName": "TotalValueChart",
    "mebiusFile": "total-value-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-value.webp"
  },
  {
    "id": "charts-total-expenses",
    "tur": "halka-pay",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Aylık Gider Dağılımı",
    "aciklama": "Hanehalkı harcamalarının ana gider kalemleri bazında yüzdesel payı.",
    "metrik": "₺48.250",
    "degisim": -2.1,
    "degisimEtiket": "geçen aya göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺10.000",
    "kaynak": "TÜİK Sepeti",
    "dilimler": [
      {
        "ad": "Konut & Kira",
        "oran": 35,
        "renk": "toprak"
      },
      {
        "ad": "Gıda & İçecek",
        "oran": 25,
        "renk": "murekkep"
      },
      {
        "ad": "Ulaştırma",
        "oran": 18,
        "renk": "komur"
      },
      {
        "ad": "Faturalar",
        "oran": 12,
        "renk": "yesil"
      },
      {
        "ad": "Diğer",
        "oran": 10,
        "renk": "gri"
      }
    ],
    "mebiusTitle": "Total Expenses Chart",
    "exportName": "TotalExpensesChart",
    "mebiusFile": "total-expenses-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-expenses.webp"
  },
  {
    "id": "charts-cash-flow-area",
    "tur": "alan",
    "kategori": "EKONOMİ",
    "baslik": "Nakit Akışı Eğrisi",
    "aciklama": "Kurumsal likidite ve serbest nakit girişlerinin dönemsel seyri.",
    "metrik": "₺240.000",
    "degisim": 8.4,
    "degisimEtiket": "geçen çeyreğe göre",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺40.000",
    "kaynak": "BDDK",
    "seri": [
      {
        "etiket": "1. Hafta",
        "deger": 180
      },
      {
        "etiket": "2. Hafta",
        "deger": 195
      },
      {
        "etiket": "3. Hafta",
        "deger": 210
      },
      {
        "etiket": "4. Hafta",
        "deger": 240
      }
    ],
    "mebiusTitle": "Cash Flow Area Chart",
    "exportName": "CashFlowAreaChart",
    "mebiusFile": "cash-flow-area-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-area.webp"
  },
  {
    "id": "charts-overview",
    "tur": "coklu-karma",
    "kategori": "BORSA",
    "baslik": "Piyasa Genel Görünümü",
    "aciklama": "BIST 100 işlem hacmi (sütun) ve endeks puanı (çizgi) bileşik seyri.",
    "metrik": "10.840 Puan",
    "degisim": 1.2,
    "degisimEtiket": "günlük kapanış",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "1.500 puan",
    "kaynak": "Borsa İstanbul",
    "seriler": [
      {
        "etiket": "Pzt",
        "cubuk": 85,
        "cizgi": 10650
      },
      {
        "etiket": "Sal",
        "cubuk": 92,
        "cizgi": 10720
      },
      {
        "etiket": "Çar",
        "cubuk": 78,
        "cizgi": 10690
      },
      {
        "etiket": "Per",
        "cubuk": 105,
        "cizgi": 10810
      },
      {
        "etiket": "Cum",
        "cubuk": 118,
        "cizgi": 10840
      }
    ],
    "mebiusTitle": "Overview Chart",
    "exportName": "OverviewChart",
    "mebiusFile": "overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-overview.webp"
  },
  {
    "id": "charts-price-range",
    "tur": "aralik-bant",
    "kategori": "BORSA",
    "baslik": "Günlük Fiyat Salınım Bandı",
    "aciklama": "BIST Lokomotif hisselerinin gün içi en düşük, en yüksek ve ağırlıklı ortalaması.",
    "metrik": "₺38,40 – ₺44,20",
    "degisim": 3.5,
    "degisimEtiket": "günlük ortalama",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺10 aralık",
    "kaynak": "Borsa İstanbul",
    "araliklar": [
      {
        "etiket": "THYAO",
        "min": 280,
        "max": 298,
        "mevcut": 294
      },
      {
        "etiket": "TUPRS",
        "min": 165,
        "max": 178,
        "mevcut": 174
      },
      {
        "etiket": "AKBNK",
        "min": 58,
        "max": 64,
        "mevcut": 62.5
      },
      {
        "etiket": "KCHOL",
        "min": 210,
        "max": 226,
        "mevcut": 222
      },
      {
        "etiket": "BIMAS",
        "min": 490,
        "max": 515,
        "mevcut": 508
      }
    ],
    "mebiusTitle": "Price Range Chart",
    "exportName": "PriceRangeChart",
    "mebiusFile": "price-range-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-price-range.webp"
  },
  {
    "id": "charts-balance",
    "tur": "alan",
    "kategori": "BANKACILIK",
    "baslik": "Mevduat Varlık Bakiyesi",
    "aciklama": "Yurtiçi yerleşiklerin toplam TL mevduat hacmi gelişimi.",
    "metrik": "₺9.420 Mr",
    "degisim": 5.2,
    "degisimEtiket": "aylık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺1.500 Mr",
    "kaynak": "TCMB",
    "seri": [
      {
        "etiket": "Haz",
        "deger": 8500
      },
      {
        "etiket": "Tem",
        "deger": 8750
      },
      {
        "etiket": "Ağu",
        "deger": 9000
      },
      {
        "etiket": "Eyl",
        "deger": 9250
      },
      {
        "etiket": "Eki",
        "deger": 9420
      }
    ],
    "mebiusTitle": "Balance Chart",
    "exportName": "BalanceChart",
    "mebiusFile": "balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-balance.webp"
  },
  {
    "id": "charts-total-sales",
    "tur": "sutun",
    "kategori": "BORSA",
    "baslik": "İmalat Sanayi Satış Hacmi",
    "aciklama": "BIST sanayi şirketlerinin çeyreklik toplam ciro performansı.",
    "metrik": "₺1.850 Mr",
    "degisim": 14.2,
    "degisimEtiket": "yıllık değişim",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺300 Mr",
    "kaynak": "KAP Verileri",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 1420
      },
      {
        "etiket": "2025/4Ç",
        "deger": 1580
      },
      {
        "etiket": "2026/1Ç",
        "deger": 1640
      },
      {
        "etiket": "2026/2Ç",
        "deger": 1720
      },
      {
        "etiket": "2026/3Ç",
        "deger": 1850
      }
    ],
    "mebiusTitle": "Total Sales Chart",
    "exportName": "TotalSalesChart",
    "mebiusFile": "total-sales-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-sales.webp"
  },
  {
    "id": "charts-customer-rate",
    "tur": "nokta-dagilim",
    "kategori": "PİYASALAR",
    "baslik": "Fon Katılımcı Dağılımı",
    "aciklama": "Yatırımcı büyüklük gruplarına göre portföy sahipliği sıklığı.",
    "metrik": "%24,6 Pay",
    "degisim": 3.1,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 3,
    "boncukBirim": "%10 pay",
    "kaynak": "TEFAS",
    "noktalar": [
      {
        "x": 10,
        "y": 25
      },
      {
        "x": 20,
        "y": 45
      },
      {
        "x": 30,
        "y": 60
      },
      {
        "x": 40,
        "y": 55
      },
      {
        "x": 50,
        "y": 80
      },
      {
        "x": 60,
        "y": 72
      },
      {
        "x": 70,
        "y": 90
      },
      {
        "x": 80,
        "y": 85
      },
      {
        "x": 90,
        "y": 95
      }
    ],
    "mebiusTitle": "Customer Rate Chart",
    "exportName": "CustomerRateChart",
    "mebiusFile": "customer-rate-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-customer-rate.webp"
  },
  {
    "id": "charts-cumulative-assets-and-liabilities",
    "tur": "yigilmis-sutun",
    "kategori": "BANKACILIK",
    "baslik": "Kümülatif Varlık ve Yükümlülükler",
    "aciklama": "Bankacılık kesimi aktif (mürekkep) ve pasif (gri) dengesi.",
    "metrik": "₺31.250 Mr",
    "degisim": -0.8,
    "degisimEtiket": "net fark",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺4.000 Mr",
    "kaynak": "BDDK",
    "gruplar": [
      {
        "etiket": "2023",
        "varlik": 22000,
        "yukumluluk": 21000
      },
      {
        "etiket": "2024",
        "varlik": 26000,
        "yukumluluk": 24800
      },
      {
        "etiket": "2025",
        "varlik": 29500,
        "yukumluluk": 28200
      },
      {
        "etiket": "2026",
        "varlik": 31250,
        "yukumluluk": 29800
      }
    ],
    "mebiusTitle": "Cumulative Assets and Liabilities Chart",
    "exportName": "CumulativeAssetsAndLiabilitiesChart",
    "mebiusFile": "cumulative-assets-and-liabilities-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cumulative-assets-and-liabilities.webp"
  },
  {
    "id": "charts-cash-flow-monthly-bar",
    "tur": "sutun",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Aylık Net Nakit Akışı",
    "aciklama": "Aylık gelir fazlası ve net birikim kapasitesi gelişimi.",
    "metrik": "₺65.400",
    "degisim": 12.0,
    "degisimEtiket": "geçen aya göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺10.000",
    "kaynak": "Finfolis Hesaplama",
    "seri": [
      {
        "etiket": "Haz",
        "deger": 48000
      },
      {
        "etiket": "Tem",
        "deger": 52000
      },
      {
        "etiket": "Ağu",
        "deger": 51500
      },
      {
        "etiket": "Eyl",
        "deger": 58400
      },
      {
        "etiket": "Eki",
        "deger": 65400
      }
    ],
    "mebiusTitle": "Cash Flow Monthly Bar Chart",
    "exportName": "CashFlowMonthlyBarChart",
    "mebiusFile": "cash-flow-monthly-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-monthly-bar.webp"
  },
  {
    "id": "charts-cash-balance",
    "tur": "alan",
    "kategori": "BANKACILIK",
    "baslik": "Serbest Nakit Rezervi",
    "aciklama": "Finansal sistemin gecelik repo ve likidite imkânları bakiyesi.",
    "metrik": "₺185 Mr",
    "degisim": 2.8,
    "degisimEtiket": "haftalık",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺30 Mr",
    "kaynak": "TCMB",
    "seri": [
      {
        "etiket": "Pzt",
        "deger": 162
      },
      {
        "etiket": "Sal",
        "deger": 170
      },
      {
        "etiket": "Çar",
        "deger": 175
      },
      {
        "etiket": "Per",
        "deger": 180
      },
      {
        "etiket": "Cum",
        "deger": 185
      }
    ],
    "mebiusTitle": "Cash Balance Chart",
    "exportName": "CashBalanceChart",
    "mebiusFile": "cash-balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-balance.webp"
  },
  {
    "id": "charts-net-worth",
    "tur": "alan",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Net Finansal Değer Eğrisi",
    "aciklama": "Borçlardan arındırılmış net varlık büyüklüğünün 5 yıllık trendi.",
    "metrik": "₺890.000",
    "degisim": 18.5,
    "degisimEtiket": "yıllık net artış",
    "tarih": "2026",
    "boncukMiktar": 9,
    "boncukBirim": "₺100.000",
    "kaynak": "MKK Verileri",
    "seri": [
      {
        "etiket": "2022",
        "deger": 320
      },
      {
        "etiket": "2023",
        "deger": 480
      },
      {
        "etiket": "2024",
        "deger": 620
      },
      {
        "etiket": "2025",
        "deger": 750
      },
      {
        "etiket": "2026",
        "deger": 890
      }
    ],
    "mebiusTitle": "Net Worth Chart",
    "exportName": "NetWorthChart",
    "mebiusFile": "net-worth-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-net-worth.webp"
  },
  {
    "id": "charts-financial-breakdown",
    "tur": "aralik-bant",
    "kategori": "EKONOMİ",
    "baslik": "Gelir Dilimleri Gider Kırılımı",
    "aciklama": "En düşükten en yükseğe hanehalkı harcama sepeti taban-tavan aralıkları.",
    "metrik": "%34 – %62 Gıda Payı",
    "degisim": -1.4,
    "degisimEtiket": "yıllık sapma",
    "tarih": "2026",
    "boncukMiktar": 5,
    "boncukBirim": "%15 dilim",
    "kaynak": "TÜİK Hanehalkı",
    "araliklar": [
      {
        "etiket": "%20 Alt",
        "min": 45,
        "max": 65,
        "mevcut": 58
      },
      {
        "etiket": "%20 II",
        "min": 38,
        "max": 52,
        "mevcut": 46
      },
      {
        "etiket": "%20 III",
        "min": 30,
        "max": 44,
        "mevcut": 37
      },
      {
        "etiket": "%20 IV",
        "min": 22,
        "max": 35,
        "mevcut": 28
      },
      {
        "etiket": "%20 Üst",
        "min": 14,
        "max": 24,
        "mevcut": 18
      }
    ],
    "mebiusTitle": "Financial Breakdown Chart",
    "exportName": "FinancialBreakdownChart",
    "mebiusFile": "financial-breakdown-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-financial-breakdown.webp"
  },
  {
    "id": "charts-finance-overview-area",
    "tur": "alan",
    "kategori": "EKONOMİ",
    "baslik": "Finansal Denge Alanı",
    "aciklama": "Merkezi yönetim bütçe açığının GSYH'ye oranı eğilimi.",
    "metrik": "%3,1 / GSYH",
    "degisim": 0.4,
    "degisimEtiket": "iyileşme yönünde",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 3,
    "boncukBirim": "%1 GSYH",
    "kaynak": "Hazine ve Maliye Bakanlığı",
    "seri": [
      {
        "etiket": "2024/4Ç",
        "deger": 4.8
      },
      {
        "etiket": "2025/2Ç",
        "deger": 4.2
      },
      {
        "etiket": "2025/4Ç",
        "deger": 3.8
      },
      {
        "etiket": "2026/2Ç",
        "deger": 3.4
      },
      {
        "etiket": "2026/3Ç",
        "deger": 3.1
      }
    ],
    "mebiusTitle": "Finance Overview Area Chart",
    "exportName": "FinanceOverviewAreaChart",
    "mebiusFile": "finance-overview-area-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-area.webp"
  },
  {
    "id": "charts-total-balance",
    "tur": "sutun",
    "kategori": "BANKACILIK",
    "baslik": "Konsolide Kredi Hacmi",
    "aciklama": "Ticari ve tüketici kredilerinin toplam büyüme eğilimi.",
    "metrik": "₺16.480 Mr",
    "degisim": 9.3,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺2.000 Mr",
    "kaynak": "BDDK",
    "seri": [
      {
        "etiket": "Oca",
        "deger": 13200
      },
      {
        "etiket": "Mar",
        "deger": 13900
      },
      {
        "etiket": "May",
        "deger": 14600
      },
      {
        "etiket": "Tem",
        "deger": 15400
      },
      {
        "etiket": "Eki",
        "deger": 16480
      }
    ],
    "mebiusTitle": "Total Balance Chart",
    "exportName": "TotalBalanceChart",
    "mebiusFile": "total-balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-balance.webp"
  },
  {
    "id": "charts-budget",
    "tur": "sutun",
    "kategori": "EKONOMİ",
    "baslik": "Bütçe Hedef Gerçekleşmesi",
    "aciklama": "Hedeflenen kamu harcamaları ile gerçekleşen tutarların karşılaştırması.",
    "metrik": "%88,4 Oran",
    "degisim": -3.2,
    "degisimEtiket": "sapma",
    "tarih": "Ocak-Ekim 2026",
    "boncukMiktar": 9,
    "boncukBirim": "%10 hedef",
    "kaynak": "Hazine",
    "seri": [
      {
        "etiket": "Personel",
        "deger": 94
      },
      {
        "etiket": "Yatırım",
        "deger": 82
      },
      {
        "etiket": "Cari Transfer",
        "deger": 89
      },
      {
        "etiket": "Faiz",
        "deger": 86
      }
    ],
    "mebiusTitle": "Budget Chart",
    "exportName": "BudgetChart",
    "mebiusFile": "budget-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget.webp"
  },
  {
    "id": "charts-investment-performance",
    "tur": "coklu-karma",
    "kategori": "PİYASALAR",
    "baslik": "Fon Türleri Yıllık Getirisi",
    "aciklama": "Hisse senedi, altın ve para piyasası fonlarının yıllık reel getirisi.",
    "metrik": "▲ %54,2 Zirve",
    "degisim": 5.8,
    "degisimEtiket": "aylık ilave",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%10 getiri",
    "kaynak": "TEFAS",
    "seriler": [
      {
        "etiket": "Hisse Fonu",
        "cubuk": 54.2,
        "cizgi": 48.0
      },
      {
        "etiket": "Altın Fonu",
        "cubuk": 46.8,
        "cizgi": 42.5
      },
      {
        "etiket": "Eurobond",
        "cubuk": 38.0,
        "cizgi": 35.0
      },
      {
        "etiket": "Para Piyasası",
        "cubuk": 48.5,
        "cizgi": 47.0
      }
    ],
    "mebiusTitle": "Investment Performance Chart",
    "exportName": "InvestmentPerformanceChart",
    "mebiusFile": "investment-performance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-investment-performance.webp"
  },
  {
    "id": "charts-financial-trends",
    "tur": "alan",
    "kategori": "EKONOMİ",
    "baslik": "Ekonomik Güven Endeksi",
    "aciklama": "Tüketici, reel kesim ve hizmet sektörü bileşik güven eğilimi.",
    "metrik": "98,4 Puan",
    "degisim": 2.4,
    "degisimEtiket": "aylık toparlanma",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "15 puan",
    "kaynak": "TÜİK",
    "seri": [
      {
        "etiket": "May",
        "deger": 92.4
      },
      {
        "etiket": "Haz",
        "deger": 93.8
      },
      {
        "etiket": "Tem",
        "deger": 95.1
      },
      {
        "etiket": "Ağu",
        "deger": 96.0
      },
      {
        "etiket": "Eyl",
        "deger": 97.2
      },
      {
        "etiket": "Eki",
        "deger": 98.4
      }
    ],
    "mebiusTitle": "Financial Trends Chart",
    "exportName": "FinancialTrendsChart",
    "mebiusFile": "financial-trends-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-financial-trends.webp"
  },
  {
    "id": "charts-analytics",
    "tur": "coklu-karma",
    "kategori": "BORSA",
    "baslik": "Sektör Volatilite ve Likidite Endeksi",
    "aciklama": "Hisselerin dalgalanma katsayısı ve takas yoğunluğu endeksi.",
    "metrik": "14,8 Endeks",
    "degisim": -4.1,
    "degisimEtiket": "volatilite azalışı",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "3 endeks",
    "kaynak": "Borsa İstanbul",
    "seriler": [
      {
        "etiket": "Banka",
        "cubuk": 18.2,
        "cizgi": 16.0
      },
      {
        "etiket": "Sanayi",
        "cubuk": 12.4,
        "cizgi": 11.5
      },
      {
        "etiket": "Hizmet",
        "cubuk": 14.0,
        "cizgi": 13.2
      },
      {
        "etiket": "Teknoloji",
        "cubuk": 22.5,
        "cizgi": 20.1
      }
    ],
    "mebiusTitle": "Analytics Chart",
    "exportName": "AnalyticsChart",
    "mebiusFile": "analytics-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-analytics.webp"
  },
  {
    "id": "charts-cash-flow-daily-bar",
    "tur": "sutun",
    "kategori": "PİYASALAR",
    "baslik": "Günlük Net Fon Akımı",
    "aciklama": "BIST ve DİBS piyasasına günlük yabancı ve yerleşik fon giriş-çıkışı.",
    "metrik": "+₺4,2 Mr",
    "degisim": 6.1,
    "degisimEtiket": "günlük net giriş",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺1 Mr",
    "kaynak": "TCMB EVDS",
    "seri": [
      {
        "etiket": "Pzt",
        "deger": 2.1
      },
      {
        "etiket": "Sal",
        "deger": 1.8
      },
      {
        "etiket": "Çar",
        "deger": 3.4
      },
      {
        "etiket": "Per",
        "deger": 2.9
      },
      {
        "etiket": "Cum",
        "deger": 4.2
      }
    ],
    "mebiusTitle": "Cash Flow Daily Bar Chart",
    "exportName": "CashFlowDailyBarChart",
    "mebiusFile": "cash-flow-daily-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-daily-bar.webp"
  },
  {
    "id": "charts-spending-overview-range",
    "tur": "aralik-bant",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Kartlı Harcama Salınım Aralığı",
    "aciklama": "Haftalık kredi kartı işlem tutarlarının mevsimsel bant aralığı.",
    "metrik": "₺14 Mr – ₺22 Mr",
    "degisim": -1.8,
    "degisimEtiket": "haftalık",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺3 Mr",
    "kaynak": "BKM Verileri",
    "araliklar": [
      {
        "etiket": "1. Hf",
        "min": 14.5,
        "max": 18.2,
        "mevcut": 16.4
      },
      {
        "etiket": "2. Hf",
        "min": 15.0,
        "max": 19.5,
        "mevcut": 17.8
      },
      {
        "etiket": "3. Hf",
        "min": 16.2,
        "max": 20.8,
        "mevcut": 18.5
      },
      {
        "etiket": "4. Hf",
        "min": 17.0,
        "max": 22.0,
        "mevcut": 20.1
      }
    ],
    "mebiusTitle": "Spending Overview Range Chart",
    "exportName": "SpendingOverviewRangeChart",
    "mebiusFile": "spending-overview-range-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-range.webp"
  },
  {
    "id": "charts-budget-overview",
    "tur": "sutun",
    "kategori": "EKONOMİ",
    "baslik": "Kamu Harcama Kalemleri Dağılımı",
    "aciklama": "Yıllık bütçe harcamalarında en büyük paya sahip 5 temel alan.",
    "metrik": "₺4.850 Mr",
    "degisim": 4.5,
    "degisimEtiket": "gerçekleşme",
    "tarih": "2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺700 Mr",
    "kaynak": "Hazine",
    "seri": [
      {
        "etiket": "Eğitim",
        "deger": 1280
      },
      {
        "etiket": "Sağlık",
        "deger": 1050
      },
      {
        "etiket": "Sosyal Güvenlik",
        "deger": 1420
      },
      {
        "etiket": "Ulaştırma",
        "deger": 650
      },
      {
        "etiket": "Tarım Destek",
        "deger": 450
      }
    ],
    "mebiusTitle": "Budget Overview Chart",
    "exportName": "BudgetOverviewChart",
    "mebiusFile": "budget-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-overview.webp"
  },
  {
    "id": "charts-sales-target",
    "tur": "radyal-hedef",
    "kategori": "EKONOMİ",
    "baslik": "Yıllık İhracat Hedef Gerçekleşmesi",
    "aciklama": "OVP 2026 ihracat hedefi karşısında gerçekleşen kümülatif tutar.",
    "metrik": "%92,8 Hedef",
    "degisim": 7.2,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 9,
    "boncukBirim": "%10 gerçekleşme",
    "kaynak": "Ticaret Bakanlığı & TİM",
    "oran": 92.8,
    "hedef": 100,
    "mebiusTitle": "Sales Target Chart",
    "exportName": "SalesTargetChart",
    "mebiusFile": "sales-target-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-sales-target.webp"
  },
  {
    "id": "charts-your-asset",
    "tur": "halka-pay",
    "kategori": "PİYASALAR",
    "baslik": "Örnek Dengeli Portföy Dağılımı",
    "aciklama": "Orta vadeli dengeli varlık dağılım modelinde pay oranları.",
    "metrik": "₺500.000 Model",
    "degisim": 11.4,
    "degisimEtiket": "yıllık getiri",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺100.000",
    "kaynak": "Finfolis Analiz",
    "dilimler": [
      {
        "ad": "BIST Hisse Senedi",
        "oran": 35,
        "renk": "toprak"
      },
      {
        "ad": "Altın & Kıymetli Maden",
        "oran": 25,
        "renk": "murekkep"
      },
      {
        "ad": "Kısa Vadeli Bono/Mevduat",
        "oran": 25,
        "renk": "komur"
      },
      {
        "ad": "Eurobond / Döviz",
        "oran": 15,
        "renk": "yesil"
      }
    ],
    "mebiusTitle": "Your Asset Chart",
    "exportName": "YourAssetChart",
    "mebiusFile": "your-asset-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-your-asset.webp"
  },
  {
    "id": "charts-budget-plan",
    "tur": "akis-selale",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Bütçe ve Tasarruf Akışı",
    "aciklama": "Net gelirden zorunlu giderler ve birikim ayrıldıktan sonraki serbest bakiye.",
    "metrik": "₺18.500 Net",
    "degisim": 15.0,
    "degisimEtiket": "tasarruf oranı",
    "tarih": "Ekim 2026",
    "boncukMiktar": 4,
    "boncukBirim": "₺5.000",
    "kaynak": "Finfolis Tasarruf",
    "adimlari": [
      {
        "ad": "Toplam Gelir",
        "deger": 60000,
        "tur": "artis"
      },
      {
        "ad": "Kira & Konut",
        "deger": -22000,
        "tur": "azalis"
      },
      {
        "ad": "Temel Giderler",
        "deger": -14000,
        "tur": "azalis"
      },
      {
        "ad": "Bireysel Emeklilik",
        "deger": -5500,
        "tur": "azalis"
      },
      {
        "ad": "Kalan Tasarruf",
        "deger": 18500,
        "tur": "net"
      }
    ],
    "mebiusTitle": "Budget Plan Chart",
    "exportName": "BudgetPlanChart",
    "mebiusFile": "budget-plan-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-plan.webp"
  },
  {
    "id": "charts-spending-overview-cylinder",
    "tur": "sutun",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Kategori Bazlı Harcama Yoğunluğu",
    "aciklama": "Aylık kartlı harcamalarda en yoğun işlem adedine sahip sektörler.",
    "metrik": "142 İşlem",
    "degisim": -3.4,
    "degisimEtiket": "geçen aya göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "20 işlem",
    "kaynak": "BKM",
    "seri": [
      {
        "etiket": "Market",
        "deger": 58
      },
      {
        "etiket": "Yemek",
        "deger": 34
      },
      {
        "etiket": "Yakıt",
        "deger": 22
      },
      {
        "etiket": "Giyim",
        "deger": 16
      },
      {
        "etiket": "Kültür",
        "deger": 12
      }
    ],
    "mebiusTitle": "Spending Overview Cylinder Chart",
    "exportName": "SpendingOverviewCylinderChart",
    "mebiusFile": "spending-overview-cylinder-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-cylinder.webp"
  },
  {
    "id": "charts-budget-health",
    "tur": "radyal-hedef",
    "kategori": "BANKACILIK",
    "baslik": "Finansal Sağlık Skoru",
    "aciklama": "Borçluluk, likidite tamponu ve düzenli birikim kriterlerine göre genel skor.",
    "metrik": "84 / 100",
    "degisim": 4.0,
    "degisimEtiket": "puan artışı",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "10 puan",
    "kaynak": "BDDK & Finfolis",
    "oran": 84,
    "hedef": 100,
    "mebiusTitle": "Budget Health Chart",
    "exportName": "BudgetHealthChart",
    "mebiusFile": "budget-health-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-health.webp"
  },
  {
    "id": "charts-category-breakdown",
    "tur": "halka-pay",
    "kategori": "BANKACILIK",
    "baslik": "Sektörel Kredi Dağılımı",
    "aciklama": "Bankacılık sektöründe ticari kredilerin sektör bazında payı.",
    "metrik": "₺11.200 Mr",
    "degisim": 8.9,
    "degisimEtiket": "yıllık kredi büyümesi",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺1.500 Mr",
    "kaynak": "BDDK",
    "dilimler": [
      {
        "ad": "İmalat Sanayi",
        "oran": 32,
        "renk": "toprak"
      },
      {
        "ad": "Toptan & Perakende",
        "oran": 24,
        "renk": "murekkep"
      },
      {
        "ad": "İnşaat",
        "oran": 18,
        "renk": "komur"
      },
      {
        "ad": "Enerji",
        "oran": 14,
        "renk": "yesil"
      },
      {
        "ad": "Turizm & Diğer",
        "oran": 12,
        "renk": "gri"
      }
    ],
    "mebiusTitle": "Category Breakdown Chart",
    "exportName": "CategoryBreakdownChart",
    "mebiusFile": "category-breakdown-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-category-breakdown.webp"
  },
  {
    "id": "charts-finance-overview-flow",
    "tur": "akis-selale",
    "kategori": "PİYASALAR",
    "baslik": "Merkez Bankası Rezerv Akışı",
    "aciklama": "Brüt rezervlerdeki döviz alımı, ihracat bedeli ve kamu çıkışlarının dengesi.",
    "metrik": "+$4,8 Mr Net",
    "degisim": 14.5,
    "degisimEtiket": "haftalık net değişim",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "$1 Mr",
    "kaynak": "TCMB",
    "adimlari": [
      {
        "ad": "Önceki Rezerv",
        "deger": 152.0,
        "tur": "artis"
      },
      {
        "ad": "Reeskont Kredisi",
        "deger": 3.8,
        "tur": "artis"
      },
      {
        "ad": "Piyasa Alımı",
        "deger": 2.5,
        "tur": "artis"
      },
      {
        "ad": "Dış Borç Ödemesi",
        "deger": -1.5,
        "tur": "azalis"
      },
      {
        "ad": "Güncel Rezerv",
        "deger": 156.8,
        "tur": "net"
      }
    ],
    "mebiusTitle": "Finance Overview Flow Chart",
    "exportName": "FinanceOverviewFlowChart",
    "mebiusFile": "finance-overview-flow-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-flow.webp"
  },
  {
    "id": "charts-value-locked",
    "tur": "alan",
    "kategori": "BANKACILIK",
    "baslik": "KKM Toplam Kilitli Bakiye",
    "aciklama": "Kur Korumalı Mevduat hesaplarından standart TL mevduata geçiş eğrisi.",
    "metrik": "₺840 Mr",
    "degisim": -12.4,
    "degisimEtiket": "aylık çıkış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺100 Mr",
    "kaynak": "BDDK",
    "seri": [
      {
        "etiket": "Haz",
        "deger": 1650
      },
      {
        "etiket": "Tem",
        "deger": 1420
      },
      {
        "etiket": "Ağu",
        "deger": 1180
      },
      {
        "etiket": "Eyl",
        "deger": 980
      },
      {
        "etiket": "Eki",
        "deger": 840
      }
    ],
    "mebiusTitle": "Value Locked Chart",
    "exportName": "ValueLockedChart",
    "mebiusFile": "value-locked-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-value-locked.webp"
  },
  {
    "id": "charts-saving-progress",
    "tur": "radyal-hedef",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Yıllık Birikim Hedefi İlerlemesi",
    "aciklama": "Hedeflenen 6 aylık acil durum fonu oluşturma hedefinde ulaşılan seviye.",
    "metrik": "%78,5 Seviye",
    "degisim": 6.2,
    "degisimEtiket": "aylık ilerleme",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%10 birikim",
    "kaynak": "Finfolis",
    "oran": 78.5,
    "hedef": 100,
    "mebiusTitle": "Saving Progress Chart",
    "exportName": "SavingProgressChart",
    "mebiusFile": "saving-progress-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-saving-progress.webp"
  },
  {
    "id": "charts-finance-overview-diverging-bar",
    "tur": "ayrisan-cubuk",
    "kategori": "EKONOMİ",
    "baslik": "Dış Ticaret Net Denge Ayrışması",
    "aciklama": "Ana sektör gruplarında ihracat-ithalat farkı (fazla: yeşil, açık: kırmızı).",
    "metrik": "-$3,4 Mr Açık",
    "degisim": 18.2,
    "degisimEtiket": "açıkta daralma",
    "tarih": "Eylül 2026",
    "boncukMiktar": 4,
    "boncukBirim": "$1 Mr denge",
    "kaynak": "TÜİK",
    "mebiusTitle": "Finance Overview Diverging Bar Chart",
    "exportName": "FinanceOverviewDivergingBarChart",
    "mebiusFile": "charts-finance-overview-diverging-bar.tsx",
    "previewImage": "charts-finance-overview-diverging-bar.webp",
    "seri": [
      { "etiket": "Tarım", "deger": 1.2 },
      { "etiket": "Tekstil", "deger": 2.4 },
      { "etiket": "Otomotiv", "deger": 1.8 },
      { "etiket": "Kimya", "deger": -3.8 },
      { "etiket": "Enerji", "deger": -5.0 }
    ]
  },
  {
    "id": "charts-budget-allocation",
    "tur": "halka-pay",
    "kategori": "EKONOMİ",
    "baslik": "Kamu Yatırım Ödenekleri",
    "aciklama": "Sektörel kamu yatırım tahsisatında öncelikli alanların payları.",
    "metrik": "₺1.240 Mr",
    "degisim": 5.1,
    "degisimEtiket": "yıllık artış",
    "tarih": "2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺200 Mr",
    "kaynak": "Strateji ve Bütçe Başkanlığı",
    "mebiusTitle": "Budget Allocation Chart",
    "exportName": "BudgetAllocationChart",
    "mebiusFile": "charts-budget-allocation.tsx",
    "previewImage": "charts-budget-allocation.webp",
    "dilimler": [
      { "ad": "Demiryolu & Lojistik", "oran": 30, "renk": "toprak" },
      { "ad": "Sulama & Tarım", "oran": 24, "renk": "murekkep" },
      { "ad": "Eğitim Altyapısı", "oran": 20, "renk": "komur" },
      { "ad": "Sağlık Tesisleri", "oran": 16, "renk": "yesil" },
      { "ad": "Teknoloji & AR-GE", "oran": 10, "renk": "gri" }
    ]
  },
  {
    "id": "charts-asset-overview-radial",
    "tur": "radyal-hedef",
    "kategori": "PİYASALAR",
    "baslik": "Portföy Verimlilik Oranı",
    "aciklama": "Piyasa karşılaştırma ölçütüne (benchmark) göre sağlanan göreli getiri.",
    "metrik": "%82 Verim",
    "degisim": 3.4,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%10 verim",
    "kaynak": "TEFAS",
    "mebiusTitle": "Asset Overview Radial Chart",
    "exportName": "AssetOverviewRadialChart",
    "mebiusFile": "charts-asset-overview-radial.tsx",
    "previewImage": "charts-asset-overview-radial.webp",
    "oran": 82,
    "hedef": 100
  },
  {
    "id": "charts-options-portfolio",
    "tur": "ayrisan-cubuk",
    "kategori": "BORSA",
    "baslik": "VİOP Korunma (Hedge) Kâr-Zarar Payoff",
    "aciklama": "Farklı endeks seviyelerinde opsiyon portföyünün simüle edilen net getirisi.",
    "metrik": "+₺42.500 Net",
    "degisim": 9.1,
    "degisimEtiket": "simülasyon getirisi",
    "tarih": "Vade: Aralık 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺6.000",
    "kaynak": "Borsa İstanbul VİOP",
    "mebiusTitle": "Options Portfolio Chart",
    "exportName": "OptionsPortfolioChart",
    "mebiusFile": "charts-options-portfolio.tsx",
    "previewImage": "charts-options-portfolio.webp",
    "seri": [
      { "etiket": "9.500", "deger": -18 },
      { "etiket": "10.000", "deger": -4 },
      { "etiket": "10.500", "deger": 8.5 },
      { "etiket": "11.000", "deger": 22 },
      { "etiket": "11.500", "deger": 42.5 }
    ]
  },
  {
    "id": "charts-revenue-growth",
    "tur": "alan",
    "kategori": "BORSA",
    "baslik": "Reel Hasılat Büyüme Oranı",
    "aciklama": "Enflasyondan arındırılmış reel satış hasılatı artış eğrisi.",
    "metrik": "%22,4 Reel",
    "degisim": 4.2,
    "degisimEtiket": "çeyreklik hızlanma",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 5,
    "boncukBirim": "%5 reel",
    "kaynak": "BIST Şirket Bilançoları",
    "mebiusTitle": "Revenue Growth Chart",
    "exportName": "RevenueGrowthChart",
    "mebiusFile": "charts-revenue-growth.tsx",
    "previewImage": "charts-revenue-growth.webp",
    "seri": [
      { "etiket": "2025/3Ç", "deger": 12 },
      { "etiket": "2025/4Ç", "deger": 14.5 },
      { "etiket": "2026/1Ç", "deger": 17.2 },
      { "etiket": "2026/2Ç", "deger": 19.8 },
      { "etiket": "2026/3Ç", "deger": 22.4 }
    ]
  },
  {
    "id": "charts-investment-app-adoption-by-country",
    "tur": "siralama-cubuk",
    "kategori": "EKONOMİ",
    "baslik": "Fintek ve Yatırım Uygulaması Benimseme Oranı",
    "aciklama": "Yetişkin nüfus içinde dijital yatırım hesabı kullanım oranı (Gelişmekte Olan Ülkeler).",
    "metrik": "%68,2 Türkiye",
    "degisim": 8.5,
    "degisimEtiket": "yıllık artış",
    "tarih": "2026",
    "boncukMiktar": 7,
    "boncukBirim": "%10 oran",
    "kaynak": "Dünya Bankası Findex",
    "mebiusTitle": "Investment App Adoption by Country Chart",
    "exportName": "InvestmentAppAdoptionByCountryChart",
    "mebiusFile": "charts-investment-app-adoption-by-country.tsx",
    "previewImage": "charts-investment-app-adoption-by-country.webp",
    "ogeler": [
      { "etiket": "Türkiye", "deger": 68.2 },
      { "etiket": "Polonya", "deger": 62.4 },
      { "etiket": "Brezilya", "deger": 58 },
      { "etiket": "Meksika", "deger": 49.5 },
      { "etiket": "Güney Afrika", "deger": 44 }
    ]
  },
  {
    "id": "charts-global-finance-market-forecast",
    "tur": "aralik-bant",
    "kategori": "EKONOMİ",
    "baslik": "Enflasyon Tahmin Yelpazesi (Piyasa Beklenti Anketi)",
    "aciklama": "Piyasa katılımcılarının 12 ay sonrası TÜFE beklenti aralıkları (alt, medyan, üst bant).",
    "metrik": "%24,8 Medyan",
    "degisim": -2,
    "degisimEtiket": "önceki ankete göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "%5 beklenti",
    "kaynak": "TCMB Piyasa Katılımcıları Anketi",
    "mebiusTitle": "Global Finance Market Forecast Chart",
    "exportName": "GlobalFinanceMarketForecastChart",
    "mebiusFile": "charts-global-finance-market-forecast.tsx",
    "previewImage": "charts-global-finance-market-forecast.webp",
    "araliklar": [
      { "etiket": "3 Ay", "min": 28, "max": 35, "mevcut": 31.5 },
      { "etiket": "6 Ay", "min": 24, "max": 30, "mevcut": 27 },
      { "etiket": "12 Ay", "min": 20, "max": 28, "mevcut": 24.8 },
      { "etiket": "24 Ay", "min": 14, "max": 20, "mevcut": 16.5 }
    ]
  },
  {
    "id": "charts-average-sales",
    "tur": "sutun",
    "kategori": "EKONOMİ",
    "baslik": "Perakende Satış Hacmi Endeksi",
    "aciklama": "Mevsim etkilerinden arındırılmış perakende ticaret hacmi çeyreklik seyri.",
    "metrik": "124,5 Puan",
    "degisim": 3.6,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 8,
    "boncukBirim": "15 puan",
    "kaynak": "TÜİK",
    "mebiusTitle": "Average Sales Chart",
    "exportName": "AverageSalesChart",
    "mebiusFile": "charts-average-sales.tsx",
    "previewImage": "charts-average-sales.webp",
    "seri": [
      { "etiket": "2025/3Ç", "deger": 108 },
      { "etiket": "2025/4Ç", "deger": 114 },
      { "etiket": "2026/1Ç", "deger": 118 },
      { "etiket": "2026/2Ç", "deger": 121 },
      { "etiket": "2026/3Ç", "deger": 124.5 }
    ]
  },
  {
    "id": "charts-performance",
    "tur": "coklu-karma",
    "kategori": "BORSA",
    "baslik": "Endeks Karşılaştırmalı Performans",
    "aciklama": "BIST 100 (mürekkep sütun) ile BIST Sınai (kırmızı çizgi) getiri yarışı.",
    "metrik": "+%38,5 Getiri",
    "degisim": 12.4,
    "degisimEtiket": "yılbaşından bu yana",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%5 rölatif",
    "kaynak": "Borsa İstanbul",
    "mebiusTitle": "Performance Chart",
    "exportName": "PerformanceChart",
    "mebiusFile": "charts-performance.tsx",
    "previewImage": "charts-performance.webp",
    "seriler": [
      { "etiket": "1. Çeyrek", "cubuk": 12, "cizgi": 15 },
      { "etiket": "2. Çeyrek", "cubuk": 22, "cizgi": 25 },
      { "etiket": "3. Çeyrek", "cubuk": 31, "cizgi": 33 },
      { "etiket": "Güncel", "cubuk": 38.5, "cizgi": 42 }
    ]
  },
  {
    "id": "charts-investment-growth",
    "tur": "alan",
    "kategori": "PİYASALAR",
    "baslik": "Bileşik Reel Yatırım Büyümesi",
    "aciklama": "Düzenli aylık tasarruf ve kâr payı yeniden yatırımıyla oluşan bileşik getiri.",
    "metrik": "₺540.000",
    "degisim": 24,
    "degisimEtiket": "bileşik yıllık getiri",
    "tarih": "2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺90.000",
    "kaynak": "TEFAS Verileri",
    "mebiusTitle": "Investment Growth Chart",
    "exportName": "InvestmentGrowthChart",
    "mebiusFile": "charts-investment-growth.tsx",
    "previewImage": "charts-investment-growth.webp",
    "seri": [
      { "etiket": "1. Yıl", "deger": 120 },
      { "etiket": "2. Yıl", "deger": 180 },
      { "etiket": "3. Yıl", "deger": 270 },
      { "etiket": "4. Yıl", "deger": 390 },
      { "etiket": "5. Yıl", "deger": 540 }
    ]
  },
  {
    "id": "charts-global-defi",
    "tur": "siralama-cubuk",
    "kategori": "DÖVİZ & ALTIN",
    "baslik": "Dijital Varlık ve Sabit Coin Hacmi",
    "aciklama": "Küresel ölçekte en yüksek likiditeye sahip rezerv ve ödeme varlıkları.",
    "metrik": "$182 Mr Toplam",
    "degisim": 15.6,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "$30 Mr",
    "kaynak": "CoinGecko & Onchain",
    "ogeler": [
      {
        "etiket": "USDT (Tether)",
        "deger": 124.0
      },
      {
        "etiket": "USDC (Circle)",
        "deger": 38.5
      },
      {
        "etiket": "DAI / USDS",
        "deger": 11.2
      },
      {
        "etiket": "FDUSD",
        "deger": 4.8
      },
      {
        "etiket": "Diğer",
        "deger": 3.5
      }
    ],
    "mebiusTitle": "Global DeFi Chart",
    "exportName": "GlobalDefiChart",
    "mebiusFile": "global-defi-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-global-defi.webp"
  },
  {
    "id": "charts-investment-app-user-age",
    "tur": "sutun",
    "kategori": "PİYASALAR",
    "baslik": "Borsa Yatırımcı Yaş Grubu Dağılımı",
    "aciklama": "MKK nezdinde hisse senedi hesabı bulunan pay senedi sahiplerinin yaş piramidi.",
    "metrik": "7,4 Milyon Yatırımcı",
    "degisim": 5.0,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "1 milyon",
    "kaynak": "MKK",
    "seri": [
      {
        "etiket": "18-24",
        "deger": 12.5
      },
      {
        "etiket": "25-34",
        "deger": 38.2
      },
      {
        "etiket": "35-44",
        "deger": 26.4
      },
      {
        "etiket": "45-54",
        "deger": 14.8
      },
      {
        "etiket": "55+",
        "deger": 8.1
      }
    ],
    "mebiusTitle": "Investment App User Age Chart",
    "exportName": "InvestmentAppUserAgeChart",
    "mebiusFile": "investment-app-user-age-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-investment-app-user-age.webp"
  },
  {
    "id": "charts-finance-overview-stacked-bar",
    "tur": "yigilmis-sutun",
    "kategori": "EKONOMİ",
    "baslik": "Bütçe Gelirleri ve Giderleri Yığılımı",
    "aciklama": "Vergi gelirleri ile harcama kalemlerinin çeyreklik karşılaştırması.",
    "metrik": "₺1.840 Mr",
    "degisim": -1.5,
    "degisimEtiket": "açık dengesi",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺300 Mr",
    "kaynak": "Hazine",
    "gruplar": [
      {
        "etiket": "2025/4Ç",
        "varlik": 1450,
        "yukumluluk": 1580
      },
      {
        "etiket": "2026/1Ç",
        "varlik": 1580,
        "yukumluluk": 1690
      },
      {
        "etiket": "2026/2Ç",
        "varlik": 1710,
        "yukumluluk": 1820
      },
      {
        "etiket": "2026/3Ç",
        "varlik": 1840,
        "yukumluluk": 1940
      }
    ],
    "mebiusTitle": "Finance Overview Stacked Bar Chart",
    "exportName": "FinanceOverviewStackedBarChart",
    "mebiusFile": "finance-overview-stacked-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-stacked-bar.webp"
  },
  {
    "id": "charts-finance-overview-timeline",
    "tur": "alan",
    "kategori": "BANKACILIK",
    "baslik": "TCMB Politika Faizi Zaman Çizelgesi",
    "aciklama": "Para Politikası Kurulu'nun bir haftalık repo ihale faiz oranı geçmiş kararları.",
    "metrik": "%45,0 Politika Faizi",
    "degisim": 0.0,
    "degisimEtiket": "sabit tutuldu",
    "tarih": "Ekim 2026 Kararı",
    "boncukMiktar": 9,
    "boncukBirim": "%5 faiz",
    "kaynak": "TCMB PPK",
    "seri": [
      {
        "etiket": "Nis",
        "deger": 50.0
      },
      {
        "etiket": "Haz",
        "deger": 50.0
      },
      {
        "etiket": "Ağu",
        "deger": 47.5
      },
      {
        "etiket": "Eyl",
        "deger": 45.0
      },
      {
        "etiket": "Eki",
        "deger": 45.0
      }
    ],
    "mebiusTitle": "Finance Overview Timeline Chart",
    "exportName": "FinanceOverviewTimelineChart",
    "mebiusFile": "finance-overview-timeline-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-timeline.webp"
  },
  {
    "id": "charts-revenue-by-product-line",
    "tur": "siralama-cubuk",
    "kategori": "BORSA",
    "baslik": "BIST Şirketleri Faaliyet Alanı Satış Payı",
    "aciklama": "Lokomotif şirketlerin ana segment bazlı gelir ağırlığı.",
    "metrik": "₺820 Mr Hasılat",
    "degisim": 11.3,
    "degisimEtiket": "yıllık büyüme",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺150 Mr",
    "kaynak": "KAP",
    "ogeler": [
      {
        "etiket": "Rafineri & Enerji",
        "deger": 340
      },
      {
        "etiket": "Otomotiv & Yan Sanayi",
        "deger": 260
      },
      {
        "etiket": "Dayanıklı Tüketim",
        "deger": 145
      },
      {
        "etiket": "Havacılık & Lojistik",
        "deger": 75
      }
    ],
    "mebiusTitle": "Revenue by Product Line Chart",
    "exportName": "RevenueByProductLineChart",
    "mebiusFile": "revenue-by-product-line-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-revenue-by-product-line.webp"
  },
  {
    "id": "charts-growth-trends",
    "tur": "alan",
    "kategori": "EKONOMİ",
    "baslik": "İmalat Sanayi PMI Eğilimi",
    "aciklama": "İstanbul Sanayi Odası Satın Alma Yöneticileri Endeksi (50 eşik: büyüme).",
    "metrik": "51,8 PMI",
    "degisim": 1.8,
    "degisimEtiket": "eşik üzeri büyüme",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "10 PMI (50 eşik)",
    "kaynak": "İSO & S&P Global",
    "seri": [
      {
        "etiket": "May",
        "deger": 48.4
      },
      {
        "etiket": "Haz",
        "deger": 49.1
      },
      {
        "etiket": "Tem",
        "deger": 49.8
      },
      {
        "etiket": "Ağu",
        "deger": 50.5
      },
      {
        "etiket": "Eyl",
        "deger": 51.2
      },
      {
        "etiket": "Eki",
        "deger": 51.8
      }
    ],
    "mebiusTitle": "Growth Trends Chart",
    "exportName": "GrowthTrendsChart",
    "mebiusFile": "growth-trends-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-growth-trends.webp"
  },
  {
    "id": "charts-asset-allocation",
    "tur": "halka-pay",
    "kategori": "PİYASALAR",
    "baslik": "BES Fon Portföyü Varlık Dağılımı",
    "aciklama": "Bireysel Emeklilik Sistemi katılımcı fonlarının toplam varlık sınıfları.",
    "metrik": "₺1.150 Mr BES",
    "degisim": 7.4,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺150 Mr",
    "kaynak": "EGM (Emeklilik Gözetim)",
    "dilimler": [
      {
        "ad": "Devlet İç Borçlanma (DİBS)",
        "oran": 38,
        "renk": "toprak"
      },
      {
        "ad": "Hisse Senetleri",
        "oran": 28,
        "renk": "murekkep"
      },
      {
        "ad": "Kıymetli Madenler",
        "oran": 18,
        "renk": "komur"
      },
      {
        "ad": "Döviz / Eurobond",
        "oran": 16,
        "renk": "yesil"
      }
    ],
    "mebiusTitle": "Asset Allocation Chart",
    "exportName": "AssetAllocationChart",
    "mebiusFile": "asset-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-asset-allocation.webp"
  },
  {
    "id": "charts-profit-margin-analysis",
    "tur": "ayrisan-cubuk",
    "kategori": "BORSA",
    "baslik": "Faaliyet Kâr Marjı Değişimi",
    "aciklama": "Sanayi ve hizmet sektörlerinde FAVÖK marjı yıllık puan değişimi.",
    "metrik": "+%2,3 Puan",
    "degisim": 2.3,
    "degisimEtiket": "marj genişlemesi",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 5,
    "boncukBirim": "%0,5 marj",
    "kaynak": "Borsa İstanbul",
    "seri": [
      {
        "etiket": "Savunma",
        "deger": 4.5
      },
      {
        "etiket": "Havacılık",
        "deger": 3.2
      },
      {
        "etiket": "Perakende",
        "deger": 1.4
      },
      {
        "etiket": "Demir-Çelik",
        "deger": -2.8
      },
      {
        "etiket": "Petrokimya",
        "deger": -3.5
      }
    ],
    "mebiusTitle": "Profit Margin Analysis Chart",
    "exportName": "ProfitMarginAnalysisChart",
    "mebiusFile": "profit-margin-analysis-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-profit-margin-analysis.webp"
  },
  {
    "id": "charts-monthly-income",
    "tur": "sutun",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Aylık Gelir Bileşenleri",
    "aciklama": "Maaş, kira, temettü ve faiz gelirlerinin aylık hane bütçesine katkısı.",
    "metrik": "₺52.000 Ortalama",
    "degisim": 6.0,
    "degisimEtiket": "aylık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺9.000",
    "kaynak": "TÜİK Hanehalkı",
    "seri": [
      {
        "etiket": "Maaş",
        "deger": 38000
      },
      {
        "etiket": "Mevduat Faizi",
        "deger": 7500
      },
      {
        "etiket": "Kira Getirisi",
        "deger": 4500
      },
      {
        "etiket": "Temettü/Ek",
        "deger": 2000
      }
    ],
    "mebiusTitle": "Monthly Income Chart",
    "exportName": "MonthlyIncomeChart",
    "mebiusFile": "monthly-income-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-monthly-income.webp"
  },
  {
    "id": "charts-asset-overview-bar",
    "tur": "sutun",
    "kategori": "DÖVİZ & ALTIN",
    "baslik": "Finansal Varlık Tercihleri Dağılımı",
    "aciklama": "Yurtiçi hanehalkının tasarruf araçlarındaki oransal büyüklük sıralaması.",
    "metrik": "₺14.200 Mr",
    "degisim": 8.2,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺2.000 Mr",
    "kaynak": "TCMB",
    "seri": [
      {
        "etiket": "TL Mevduat",
        "deger": 58
      },
      {
        "etiket": "Döviz Tevdiat",
        "deger": 22
      },
      {
        "etiket": "Fiziki & Fon Altın",
        "deger": 12
      },
      {
        "etiket": "Hisse Senedi",
        "deger": 8
      }
    ],
    "mebiusTitle": "Asset Overview Bar Chart",
    "exportName": "AssetOverviewBarChart",
    "mebiusFile": "asset-overview-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-asset-overview-bar.webp"
  },
  {
    "id": "charts-sales-performance",
    "tur": "sutun",
    "kategori": "EKONOMİ",
    "baslik": "Aylık İhracat Performansı",
    "aciklama": "Son 6 aydaki gerçekleşen aylık dış satım hacmi (milyar dolar).",
    "metrik": "$21,4 Milyar",
    "degisim": 4.5,
    "degisimEtiket": "geçen yılın aynı ayına göre",
    "tarih": "Eylül 2026",
    "boncukMiktar": 7,
    "boncukBirim": "$3 Mr",
    "kaynak": "Ticaret Bakanlığı",
    "seri": [
      {
        "etiket": "May",
        "deger": 19.8
      },
      {
        "etiket": "Haz",
        "deger": 20.2
      },
      {
        "etiket": "Tem",
        "deger": 20.9
      },
      {
        "etiket": "Ağu",
        "deger": 21.0
      },
      {
        "etiket": "Eyl",
        "deger": 21.4
      }
    ],
    "mebiusTitle": "Sales Performance Chart",
    "exportName": "SalesPerformanceChart",
    "mebiusFile": "sales-performance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-sales-performance.webp"
  },
  {
    "id": "charts-expenses",
    "tur": "sutun",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Sabit ve Değişken Harcama Dengesi",
    "aciklama": "Aylık zorunlu sabit yükümlülükler ile serbest harcamaların ayrımı.",
    "metrik": "₺38.400 Gider",
    "degisim": -3.1,
    "degisimEtiket": "tasarruf eğilimi",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺8.000",
    "kaynak": "Finfolis",
    "seri": [
      {
        "etiket": "Kira/Kredi",
        "deger": 18000
      },
      {
        "etiket": "Market/Beslenme",
        "deger": 11500
      },
      {
        "etiket": "Faturalar",
        "deger": 4200
      },
      {
        "etiket": "Eğlence/Sosyal",
        "deger": 4700
      }
    ],
    "mebiusTitle": "Expenses Chart",
    "exportName": "ExpensesChart",
    "mebiusFile": "expenses-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-expenses.webp"
  },
  {
    "id": "charts-total-revenue",
    "tur": "alan",
    "kategori": "EKONOMİ",
    "baslik": "Merkezi Yönetim Vergi Tahsilatı",
    "aciklama": "Gelir, kurumlar ve KDV/ÖTV tahsilatının kümülatif artış çizgisi.",
    "metrik": "₺6.450 Mr",
    "degisim": 16.8,
    "degisimEtiket": "yıllık nominal artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺800 Mr",
    "kaynak": "Gelir İdaresi Başkanlığı",
    "seri": [
      {
        "etiket": "1. Çeyrek",
        "deger": 1420
      },
      {
        "etiket": "2. Çeyrek",
        "deger": 3100
      },
      {
        "etiket": "3. Çeyrek",
        "deger": 4850
      },
      {
        "etiket": "Ekim",
        "deger": 6450
      }
    ],
    "mebiusTitle": "Total Revenue Chart",
    "exportName": "TotalRevenueChart",
    "mebiusFile": "total-revenue-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-revenue.webp"
  },
  {
    "id": "charts-project-budget-allocation",
    "tur": "halka-pay",
    "kategori": "EKONOMİ",
    "baslik": "Yatırım Projeleri Bütçe Dağılımı",
    "aciklama": "Kamu yatırımlarında büyük projelerin ödenek ağırlıkları.",
    "metrik": "₺480 Mr",
    "degisim": 6.4,
    "degisimEtiket": "tahsis artışı",
    "tarih": "2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺100 Mr",
    "kaynak": "Strateji ve Bütçe Başkanlığı",
    "dilimler": [
      {
        "ad": "Deprem Bölgesi Konut",
        "oran": 45,
        "renk": "toprak"
      },
      {
        "ad": "Yüksek Hızlı Tren",
        "oran": 25,
        "renk": "murekkep"
      },
      {
        "ad": "Yenilenebilir Enerji",
        "oran": 18,
        "renk": "komur"
      },
      {
        "ad": "Liman & Lojistik",
        "oran": 12,
        "renk": "yesil"
      }
    ],
    "mebiusTitle": "Project Budget Allocation Chart",
    "exportName": "ProjectBudgetAllocationChart",
    "mebiusFile": "project-budget-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-project-budget-allocation.webp"
  },
  {
    "id": "charts-income-overview",
    "tur": "sutun",
    "kategori": "EKONOMİ",
    "baslik": "Faiz Dışı Bütçe Gelirleri",
    "aciklama": "Genel bütçe gelirlerinin vergi ve vergi dışı ana kalemlerindeki gelişim.",
    "metrik": "₺5.840 Mr",
    "degisim": 12.1,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺800 Mr",
    "kaynak": "Hazine",
    "seri": [
      {
        "etiket": "ÖTV",
        "deger": 1120
      },
      {
        "etiket": "Dahilde KDV",
        "deger": 840
      },
      {
        "etiket": "İthalde KDV",
        "deger": 1260
      },
      {
        "etiket": "Gelir Vergisi",
        "deger": 1420
      },
      {
        "etiket": "Kurumlar Vergisi",
        "deger": 1200
      }
    ],
    "mebiusTitle": "Income Overview Chart",
    "exportName": "IncomeOverviewChart",
    "mebiusFile": "income-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-income-overview.webp"
  },
  {
    "id": "charts-spending-overview-scatter",
    "tur": "nokta-dagilim",
    "kategori": "EKONOMİ",
    "baslik": "Gelir ve Tüketim Esnekliği Saçılımı",
    "aciklama": "Farklı gelir gruplarında temel gıda dışı harcama eğilimi saçılım noktaları.",
    "metrik": "0,82 Korelasyon",
    "degisim": 0.04,
    "degisimEtiket": "esneklik katsayısı",
    "tarih": "2026",
    "boncukMiktar": 8,
    "boncukBirim": "0,1 korelasyon",
    "kaynak": "TÜİK",
    "noktalar": [
      {
        "x": 15,
        "y": 20
      },
      {
        "x": 25,
        "y": 28
      },
      {
        "x": 35,
        "y": 42
      },
      {
        "x": 45,
        "y": 48
      },
      {
        "x": 55,
        "y": 62
      },
      {
        "x": 65,
        "y": 68
      },
      {
        "x": 75,
        "y": 79
      },
      {
        "x": 85,
        "y": 88
      },
      {
        "x": 95,
        "y": 94
      }
    ],
    "mebiusTitle": "Spending Overview Scatter Chart",
    "exportName": "SpendingOverviewScatterChart",
    "mebiusFile": "spending-overview-scatter-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-scatter.webp"
  },
  {
    "id": "charts-global-finance-market-combo",
    "tur": "coklu-karma",
    "kategori": "BANKACILIK",
    "baslik": "DİBS İhraç Hacmi ve Bileşik Faiz",
    "aciklama": "Hazine iç borçlanma ihale tutarları (sütun) ve ağırlıklı faiz (çizgi).",
    "metrik": "₺65 Mr İhraç",
    "degisim": 10.2,
    "degisimEtiket": "ihale talebi",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺10 Mr",
    "kaynak": "Hazine ve Maliye Bakanlığı",
    "seriler": [
      {
        "etiket": "2 Yıl Sabit",
        "cubuk": 22.0,
        "cizgi": 39.5
      },
      {
        "etiket": "5 Yıl Sabit",
        "cubuk": 18.5,
        "cizgi": 34.2
      },
      {
        "etiket": "10 Yıl Sabit",
        "cubuk": 14.0,
        "cizgi": 31.0
      },
      {
        "etiket": "TÜFE Endeksli",
        "cubuk": 10.5,
        "cizgi": 18.5
      }
    ],
    "mebiusTitle": "Global Finance Market Combo Chart",
    "exportName": "GlobalFinanceMarketComboChart",
    "mebiusFile": "global-finance-market-combo-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-global-finance-market-combo.webp"
  },
  {
    "id": "charts-finance-analytics",
    "tur": "alan",
    "kategori": "BANKACILIK",
    "baslik": "Sermaye Yeterlilik Rasyosu (SYR)",
    "aciklama": "Türk bankacılık sektörünün Basel III yasal asgari sermaye yeterlilik oranı.",
    "metrik": "%17,4 SYR",
    "degisim": 0.6,
    "degisimEtiket": "yasal sınırın üstünde",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 7,
    "boncukBirim": "%2,5 rasyo",
    "kaynak": "BDDK",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 16.8
      },
      {
        "etiket": "2025/4Ç",
        "deger": 17.0
      },
      {
        "etiket": "2026/1Ç",
        "deger": 16.9
      },
      {
        "etiket": "2026/2Ç",
        "deger": 17.2
      },
      {
        "etiket": "2026/3Ç",
        "deger": 17.4
      }
    ],
    "mebiusTitle": "Finance Analytics Chart",
    "exportName": "FinanceAnalyticsChart",
    "mebiusFile": "finance-analytics-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-analytics.webp"
  },
  {
    "id": "charts-ethereum",
    "tur": "alan",
    "kategori": "DÖVİZ & ALTIN",
    "baslik": "Gram Altın Fiyat Seyri",
    "aciklama": "Serbest piyasa ve Borsa İstanbul Kıymetli Madenler seans kapanış fiyatı.",
    "metrik": "₺3.140 / Gram",
    "degisim": 2.8,
    "degisimEtiket": "haftalık kazanç",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺400",
    "kaynak": "Borsa İstanbul KMTP",
    "seri": [
      {
        "etiket": "Pzt",
        "deger": 3050
      },
      {
        "etiket": "Sal",
        "deger": 3080
      },
      {
        "etiket": "Çar",
        "deger": 3095
      },
      {
        "etiket": "Per",
        "deger": 3120
      },
      {
        "etiket": "Cum",
        "deger": 3140
      }
    ],
    "mebiusTitle": "Ethereum Chart",
    "exportName": "EthereumChart",
    "mebiusFile": "ethereum-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-ethereum.webp"
  },
  {
    "id": "charts-revenue-overview",
    "tur": "sutun",
    "kategori": "BORSA",
    "baslik": "BIST 100 Konsolide Hasılat Gelişimi",
    "aciklama": "Endeks dahilindeki şirketlerin çeyreklik kümülatif net satış toplamı.",
    "metrik": "₺3.450 Mr",
    "degisim": 21.0,
    "degisimEtiket": "yıllık nominal büyüme",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺500 Mr",
    "kaynak": "KAP",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 2850
      },
      {
        "etiket": "2025/4Ç",
        "deger": 3020
      },
      {
        "etiket": "2026/1Ç",
        "deger": 3180
      },
      {
        "etiket": "2026/2Ç",
        "deger": 3320
      },
      {
        "etiket": "2026/3Ç",
        "deger": 3450
      }
    ],
    "mebiusTitle": "Revenue Overview Chart",
    "exportName": "RevenueOverviewChart",
    "mebiusFile": "revenue-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-revenue-overview.webp"
  },
  {
    "id": "charts-portfolio-allocation",
    "tur": "halka-pay",
    "kategori": "KİŞİSEL FİNANS",
    "baslik": "Emeklilik Fonu Portföy Dağılımı",
    "aciklama": "Uzun vadeli birikim sepetinde risk toleransına göre ağırlık dengesi.",
    "metrik": "₺140.000 Birikim",
    "degisim": 9.5,
    "degisimEtiket": "çeyreklik büyüme",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺25.000",
    "kaynak": "Emeklilik Gözetim Merkezi",
    "dilimler": [
      {
        "ad": "BIST 30 Endeks Fonu",
        "oran": 40,
        "renk": "toprak"
      },
      {
        "ad": "Altın Katılım Fonu",
        "oran": 30,
        "renk": "murekkep"
      },
      {
        "ad": "Kamu Dış Borçlanma",
        "oran": 20,
        "renk": "komur"
      },
      {
        "ad": "Para Piyasası Fonu",
        "oran": 10,
        "renk": "yesil"
      }
    ],
    "mebiusTitle": "Portfolio Allocation Chart",
    "exportName": "PortfolioAllocationChart",
    "mebiusFile": "portfolio-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-portfolio-allocation.webp"
  }
];
