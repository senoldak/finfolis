export const DUZELTME_EN_AZ: number;
export interface DuzeltmeNotu {
  etiket: string;
  metin: string;
  baglanti: string;
}
export function duzeltmeNotu(veri: { duzeltme?: string } | null | undefined, dil?: 'tr'): DuzeltmeNotu | null;
