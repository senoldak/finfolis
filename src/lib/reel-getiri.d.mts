export interface ReelGetiriNoktasi {
  yil: number;
  ay: number;
  etiket: string;
  tamEtiket: string;
  tufe: number;
  ito: number | null;
  tcmbFaiz: number;
  reelFark: number;
}

export function aylikFaizBul(
  faizGecmisi: { tarih: string; oran: number }[],
  yil: number,
  ay: number
): number;

export function birlestirReelGetiriVerisi(params: {
  tufeSatirlari: { yil: number; ay: number; aylik: number }[];
  itoSatirlari?: { yil: number; ay: number; aylik: number }[];
  faizGecmisi?: { tarih: string; oran: number }[];
  aySayisi?: number;
}): ReelGetiriNoktasi[];
