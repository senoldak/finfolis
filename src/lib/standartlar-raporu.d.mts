export interface SikayetKaydi {
  alindi: string;
  karar: string;
  sonuc: 'yerinde' | 'kismen' | 'yerinde-degil';
}
export interface KuralSatiri {
  kod: string;
  ad: string;
  n: number;
}
export interface RaporDefteri {
  ceyrek: string;
  bas: string;
  son: string;
  defterBaslangici: string;
  yazildi: number;
  elendi: number;
  kirmizi: number;
  sari: number;
  kurallar?: { kirmizi?: Record<string, number>; sari?: Record<string, number> };
  geminiCagri: number;
  kuralDegisiklikleri: string[] | null;
  uretim?: string;
}
export interface CeyrekSayimlari {
  bot: number;
  yayinci: number;
  zincir: number;
  duzeltme: number;
  kaldirilan: number;
  sikayet: { toplam: number; yerinde: number; kismen: number; yerindeDegil: number };
}
export interface RaporSatirlari extends CeyrekSayimlari {
  baslik: string;
  aralik: string;
  sariToplam: number;
  sariKurallar: KuralSatiri[];
  elendi: number;
  kirmizi: number;
  kirmiziKurallar: KuralSatiri[];
  kalanElenen: number;
  geminiCagri: number;
  kuralDegisiklikleri: string[] | null;
  defterGecKaldi: string | null;
}
export const KURAL_ADLARI: Record<string, string>;
export function istanbulGunu(t: Date | string | number): string;
export function araliktaMi(t: Date | string | number, bas: string, son: string): boolean;
export function kuralAdi(kod: string): string;
export function kuralSatirlari(kurallar?: Record<string, number>): KuralSatiri[];
export function kuralToplami(kurallar?: Record<string, number>): number;
export function kalanElenen(elendi: number, kirmizi: number): number;
export function gunMetni(g: string, yilli?: boolean): string;
export function ceyrekBasligi(ceyrek: string): string;
export function aralikMetni(bas: string, son: string): string;
export function ceyrekSayimlari(girdi: {
  haberler?: { id: string; data: any }[];
  kaldirilan?: any[];
  sikayetler?: SikayetKaydi[];
  bas: string;
  son: string;
}): CeyrekSayimlari;
export function raporSatirlari(defter: RaporDefteri, sayimlar: CeyrekSayimlari): RaporSatirlari;
