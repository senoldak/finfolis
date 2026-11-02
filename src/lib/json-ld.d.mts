export function jsonLdMetni(veri: unknown): string;
export function haberAlanlari(p?: {
  kaynaklar?: { ad: string; url: string }[];
  yer?: { ad: string; boylam?: number; enlem?: number } | null;
  duzeltme?: string;
  guncellendi?: Date;
}): Record<string, unknown>;
