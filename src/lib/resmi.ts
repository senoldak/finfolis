// Veri sayfaları ve hesaplayıcılar için resmi veriler: src/data/resmi.json (scripts/haberler/resmi-veri.mjs yazar).
// Yalnızca TCMB/TÜİK'in yayımladığı değerler gösterilir; bir bölüm hiç alınamadıysa o sayfa "veri yok" der.
import data from '../data/resmi.json';
import { SITE } from './site';

export interface Kur {
  kod: string;
  ad: string;
  birim: number;
  dovizAlis: number;
  dovizSatis: number;
  efektifAlis: number | null;
  efektifSatis: number | null;
}

export interface KurBolumu {
  tarih: string;
  bultenNo: string;
  kaynak: { ad: string; url: string };
  liste: Kur[];
  gecmis: ({ tarih: string } & Record<string, { alis: number; satis: number } | null | string>)[];
  alinma: string;
}

export interface FaizBolumu {
  oran: number;
  gecerlilik: string;
  sonKarar: { tarih: string; oran: number; url: string } | null;
  kaynak: { ad: string; url: string };
  gecmis: { tarih: string; oran: number }[];
  alinma: string;
}

export interface TufeSatiri {
  yil: number;
  ay: number;
  yillik: number;
  aylik: number;
}

export interface EnflasyonBolumu {
  kaynak: { ad: string; url: string };
  satirlar: TufeSatiri[];
  alinma: string;
}

export interface KonutSatiri {
  yil: number;
  ay: number;
  bolgeler: Record<string, { endeks: number; yillik: number }>;
}

// Konut fiyat endeksi (TCMB, EVDS): endeks düzeyi ve TCMB'nin hesapladığı yıllık değişim.
export interface KonutBolumu {
  kaynak: { ad: string; url: string };
  bolgeler: { kod: string; ad: string }[];
  satirlar: KonutSatiri[];
  alinma: string;
}

// İşsizlik oranı (TÜİK, mevsimsellikten arındırılmış; EVDS'den).
export interface IssizlikBolumu {
  kaynak: { ad: string; url: string };
  satirlar: { yil: number; ay: number; oran: number }[];
  alinma: string;
}

// TCMB Net Döviz Pozisyonu (Swaplar ve Hazine Dövizi Hariç)
export interface RezervKalemleri {
  disVarliklarUSD: number;
  dovizYukumlulukleriUSD: number;
  netUluslararasiRezervUSD: number;
  swapStokuUSD: number;
  hazineDoviziUSD: number;
  netPozisyonUSD: number;
}

export interface RezervNoktasi {
  tarih: string;
  deger: number;
}

export interface RezervBolumu {
  tarih: string;
  netDovizPozisyonu: number;
  degisimGunluk: number;
  kalemler: RezervKalemleri;
  gecmis: RezervNoktasi[];
  kaynak: { ad: string; url: string };
  alinma: string;
}

// Piyasa faizleri (TCMB haftalık akım verileri: kredi ve mevduat faizleri)
export interface PiyasaFaizleriSatiri {
  tarih: string;
  ihtiyac: number;
  mevduat: number;
  politika: number;
  tasit: number;
  konut: number;
  tahvil5Y?: number | null;
}

export interface PiyasaFaizleriBolumu {
  kaynak: { ad: string; url: string };
  satirlar: PiyasaFaizleriSatiri[];
  alinma: string;
}

export interface MevduatSatiri {
  tarih: string;
  toplam: number;
  yurtIci: number;
  bireysel: number;
  tuzel: number;
  altin: number;
}

export interface MevduatBolumu {
  kaynak: { ad: string; url: string };
  satirlar: MevduatSatiri[];
  alinma: string;
}

export const RESMI = data as unknown as {
  kur?: KurBolumu;
  faiz?: FaizBolumu;
  enflasyon?: EnflasyonBolumu;
  konut?: KonutBolumu;
  issizlik?: IssizlikBolumu;
  rezerv?: RezervBolumu;
  piyasaFaizleri?: PiyasaFaizleriBolumu;
  mevduat?: MevduatBolumu;
};

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export const ayAdi = (s: { yil: number; ay: number }) => `${AYLAR[s.ay - 1]} ${s.yil}`;

// 'YYYY-MM-DD' -> '15 Ekim 2026' (takvim günü; saat dilimi kaydırması olmasın diye öğlen alınır).
export function gunYaz(g: string) {
  return new Date(`${g}T12:00:00Z`).toLocaleDateString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
}

export function zamanYaz(iso: string) {
  return new Date(iso).toLocaleString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  });
}

export const sayiYaz = (n: number, ondalik = 4) =>
  n.toLocaleString(SITE.locale, { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik });

// Faiz oranı ve puan farkı: gereksiz sıfır yazılmaz (%37, %39,5, %47,25).
export const oranYaz = (n: number) => n.toLocaleString(SITE.locale, { maximumFractionDigits: 2 });

// Kur sayfaları: adres -> TCMB kodu. Geçmiş tablosu yalnızca bu kurlar için tutulur (resmi-veri.mjs GECMIS_KURLAR).
export const KUR_SAYFALARI = [
  { slug: 'dolar-kuru', kod: 'USD', ad: 'Dolar', tamAd: 'ABD doları', ilgi: 'Doların' },
  { slug: 'euro-kuru', kod: 'EUR', ad: 'Euro', tamAd: 'Euro', ilgi: 'Euronun' },
  { slug: 'sterlin-kuru', kod: 'GBP', ad: 'Sterlin', tamAd: 'İngiliz sterlini', ilgi: 'Sterlinin' },
] as const;

// Veri, tarihinden bu kadar gün sonra "eski olabilir" notu alır (kaynağa ulaşılamıyorsa okur bilsin).
export function eskiMi(tarih: string, gun: number, simdi = new Date()) {
  return simdi.getTime() - new Date(`${tarih}T12:00:00Z`).getTime() > gun * 86400000;
}

// TÜFE aylık değişimlerini zincirler: bas ayının fiyatlarıyla 1 TL, bit ayının fiyatlarıyla kaç TL eder?
// Anahtar = yıl × 12 + (ay − 1). Aylık oranlar iki ondalıkla yayımlandığı için TÜİK endeksinden küçük yuvarlama farkı olabilir.
// public/hesapla.js aynı hesabı tarayıcıda yapar.
export const ayAnahtari = (s: { yil: number; ay: number }) => s.yil * 12 + s.ay - 1;
export function tufeCarpani(satirlar: TufeSatiri[], bas: number, bit: number) {
  return satirlar.reduce((c, s) => {
    const k = ayAnahtari(s);
    return k > bas && k <= bit ? c * (1 + s.aylik / 100) : c;
  }, 1);
}

// Milyon USD değerini Milyar USD ($266,1 Mr) olarak yazar
export const milyarUsd = (milyon: number, ondalik = 1) =>
  `$${(milyon / 1000).toLocaleString(SITE.locale, { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik })} Mr`;

// Değişim farkını (+$850 Mn veya -$1,2 Mr) yazar
export const farkUsd = (farkMilyon: number) => {
  const isaret = farkMilyon > 0 ? '+' : '';
  if (Math.abs(farkMilyon) >= 1000) {
    return `${isaret}${(farkMilyon / 1000).toLocaleString(SITE.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mr`;
  }
  return `${isaret}${Math.round(farkMilyon).toLocaleString(SITE.locale)} Mn`;
};