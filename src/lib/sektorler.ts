import data from '../data/sektorler.json';
import { SITE } from './site';

export interface Sektor {
  kod: string;
  ad: string;
  kategori: 'mali' | 'sinai' | 'hizmet' | 'teknoloji' | 'ana-sektor' | 'ana-endeks' | 'tema' | 'pazar' | string;
  aciklama: string;
  tanim?: string;
  hisseler?: string[];
  dinamik?: string;
  deger: number;
  gunluk: number;
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
