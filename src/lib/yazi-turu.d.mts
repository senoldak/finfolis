export type YaziTuru = 'haber' | 'aciklayici' | 'referans' | 'analiz';
export const YAZI_TURLERI: readonly ['haber', 'aciklayici', 'referans', 'analiz'];
export const VARSAYILAN_YAZI_TURU: 'haber';
export function aciklayiciMi(veri: { yaziTuru?: YaziTuru } | null | undefined): boolean;
export function analizMi(veri: { yaziTuru?: YaziTuru } | null | undefined): boolean;
