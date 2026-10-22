export type YaziTuru = 'haber' | 'aciklayici' | 'referans';
export const YAZI_TURLERI: readonly ['haber', 'aciklayici', 'referans'];
export const VARSAYILAN_YAZI_TURU: 'haber';
export function aciklayiciMi(veri: { yaziTuru?: YaziTuru } | null | undefined): boolean;
