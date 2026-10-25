export const HATA_ADRESI: string;
export const SAHIP_ADI: string;
export const ZINCIR_URETIMI: string;
export const BOT_NOTU: string;
export const SAHIP_NOTU: string;
export const ZINCIR_NOTU: string;
export const BAGLANTI_METNI: string;
export interface NasilSatiri {
  etiket: string;
  metin: string;
}
export const NASIL_BASLIK: string;
export const NASIL_SATIRLAR: NasilSatiri[];
export const YONTEM_SATIRI: NasilSatiri;
export const ILKE_SATIRI: NasilSatiri;
export const YZ_SAYFASI: { metin: string; adres: string };
export function zincirYazisiMi(veri: { uretim?: string } | null | undefined): boolean;
export function sahipYazisiMi(veri: { author?: string; uretim?: string; yaziTuru?: string } | null | undefined): boolean;
export function hataBildirAdresi(baslik: string, adres: string): string;
export function yapayZekaNotu(
  veri: { author?: string; uretim?: string; yaziTuru?: string } | null | undefined,
  baslik: string,
  adres: string,
): { metin: string; baglantiMetni: string; baglanti: string; satirlar: NasilSatiri[] | null };
