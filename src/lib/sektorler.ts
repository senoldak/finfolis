import data from '../data/sektorler.json';
import { SITE } from './site';

export interface Sektor {
  kod: string;
  ad: string;
  kategori: 'mali' | 'sinai' | 'hizmet' | 'teknoloji' | 'ana-sektor' | 'ana-endeks' | 'tema' | 'pazar' | string;
  aciklama: string;
  deger: number;
  gunluk: number;
  aylik: number;
  piyasaDegeri: number | null;
  oncekiKapanis: number | null;
  zaman: string;
}

export const SEKTOR_VERISI = data as {
  guncelleme: string;
  donemEtiketi: string;
  kaynak: { ad: string; url: string };
  sektorler: Sektor[];
};

export const sektorler = SEKTOR_VERISI.sektorler;

export function sayi(n: number, ondalik = 2): string {
  return n.toLocaleString(SITE.locale, {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  });
}

export function yuzdeFormatla(n: number): string {
  const isaret = n > 0 ? '+' : '';
  return `${isaret}%${sayi(Math.abs(n), 1)}`;
}

// Piyasa değerini anlaşılır Türkçe birimlere dönüştürür (Trilyon TL, Milyar TL)
export function piyasaDegeriMetni(tl: number | null): string {
  if (tl == null || tl <= 0) return '—';
  if (tl >= 1_000_000_000_000) {
    return `${sayi(tl / 1_000_000_000_000, 2)} Trilyon TL`;
  }
  if (tl >= 1_000_000_000) {
    return `${sayi(tl / 1_000_000_000, 2)} Milyar TL`;
  }
  return `${sayi(tl, 0)} TL`;
}

// Tabloda tam rakam göstermek için (12.363.039.828.161 TL)
export function piyasaDegeriTam(tl: number | null): string {
  if (tl == null || tl <= 0) return '—';
  return `${sayi(tl, 0)} ₺`;
}
