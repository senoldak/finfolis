export function jsonLdMetni(veri: unknown): string;
export function haberAlanlari(p?: {
  kaynaklar?: { ad: string; url: string }[];
  medya?: { ad: string; url: string }[];
  yer?: { ad: string; boylam?: number; enlem?: number } | null;
  duzeltme?: string;
  guncellendi?: Date;
}): Record<string, unknown>;
export function faqPageSemasi(sorular?: { soru: string; cevap: string }[]): Record<string, unknown> | null;
