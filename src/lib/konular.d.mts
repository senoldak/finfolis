export const KONU_ESIGI: number;

export interface Konu {
  slug: string;
  ad: string;
  tamAd: string;
  tur: 'kurum' | 'sirket' | 'kripto' | 'tema';
  schema: 'Organization' | 'Corporation' | 'GovernmentOrganization' | 'Thing' | 'FinancialProduct';
  sameAs?: string;
  desen: RegExp;
  giris: string;
}

export const KONULAR: Konu[];
export const KONU_TURLERI: readonly { tur: Konu['tur']; ad: string }[];
export function konulariBul(yazi: { baslik: string; spot?: string; govde?: string }): string[];
export function konuDizini(
  yazilar: { id: string; baslik: string; spot?: string; govde?: string }[],
  esik?: number,
): { konu: Konu; idler: string[] }[];
