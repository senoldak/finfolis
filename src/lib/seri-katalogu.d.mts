export interface Seri {
  id: string;
  ad: string;
  bolum: string;
  birim: string;
  siklik: 'gun' | 'hafta' | 'ay' | 'ceyrek';
  kaynak: { ad: string; url: string | null };
  sayfa: string;
  noktalar: [string, number][];
}
export const TANIMLAR: { bolum: string; grup: string; sayfa: string; alanlar: [string, string, string, string][] }[];
export const DIGER_TANIMLAR: { kaynak: string; onek: string; alanlar: [string, string, string, string][] }[];
export function satirTarihi(
  satir: Record<string, unknown>,
  bicim?: string | null,
  siklikVarsayilan?: string,
): { tarih: string; siklik: string } | null;
export function yoldanDeger(nesne: unknown, yol: string): number | null;
export function seriKatalogu(kaynaklar: Record<string, unknown>): Seri[];
