export const FED_ORIJIN: string;
export const TAKVIM_URL: string;
export const ILK_TARIH: string;
export function degerAyristir(metin: string): number | [number, number] | null;
export function tablolariAyir(html: string): { baslik: string; satirlar: { etiket: string; nitelik: string; metin: string }[][] }[];
export function tablo1Ayristir(tablo: unknown): { yillar: (number | 'uzun')[]; degiskenler: Record<string, any> };
export function sekil2Ayristir(tablo: unknown): { yillar: (number | 'uzun')[]; satirlar: { oran: number; sayilar: (number | null)[] }[] };
export function katilimciSayilari(nokta: unknown): number[];
export function noktaMedyani(nokta: unknown, sutun: number): number | null;
export function sepAyristir(html: string, kaynak: { tarih: string; url: string }): any;
export function takvimLinkleri(html: string, ilk?: string): { tarih: string; url: string }[];
export function gerceklesenFaiz(ustCsv: string, altCsv: string): any;
export function sepDonemi(tarih: string): { yil: number; ceyrek: number };
export function gecmisKarsilastirma(
  sepler: any[],
  gerceklesen: any,
): { tarih: string; yil: number; ceyrek: number; medyan: number | null; gercek: number | null; gercekTarih: string | null; tamam: boolean; fark: number | null }[];
