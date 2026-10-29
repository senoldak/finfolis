export const GRUP_SAYISI: number;
export const KOLAY_KURALLAR: { anahtar: string; grup: string; soru: string }[];
export interface EndeksSatiri {
  yil: number;
  ay: number;
  genel: number;
  g: number[];
}
export function normallestir(degerler: number[]): number[];
export function kisiselYillik(endeksler: EndeksSatiri[], w: number[], t?: number): number;
export function kisiselSeri(
  endeksler: EndeksSatiri[],
  w: number[],
  adet?: number,
): { yil: number; ay: number; kisisel: number; manset: number }[];
export function grupKatkilari(endeksler: EndeksSatiri[], w: number[]): { pay: number; degisim: number; katki: number }[];
export function tutarlardanPay(tutarlar: number[]): number[];
export function kolayBaslangic(tuikAgirlik: number[], gruplar: { kod: string }[], cevaplar?: Record<string, boolean>): number[];
export function adresCoz(arama: string): { mod: 'y' | 't'; degerler: number[] } | null;
export function adresYaz(mod: string, degerler: number[]): string;
