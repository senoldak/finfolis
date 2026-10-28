export interface TakvimOlayi {
  tarih: string;
  saat: string | null;
  kurum: 'TÜİK' | 'TCMB';
  baslik: string;
  donem: string | null;
  url: string | null;
  kaynak: string;
  haftalik?: boolean;
}
export interface TakvimHaftasi {
  bas: string;
  bit: string;
  gunler: { tarih: string; olaylar: TakvimOlayi[] }[];
}
export const AYLAR: string[];
export const GUN_ADLARI: string[];
export function trTarihCoz(metin: string): string | null;
export function gecerliTarih(t: string): boolean;
export function ppkTablosuAyristir(html: string, url?: string | null): TakvimOlayi[];
export function tcmbKaydiniOlayYap(k: unknown): TakvimOlayi | null;
export function tuikKaydiniOlayYap(k: unknown): TakvimOlayi | null;
export function sirala(olaylar: TakvimOlayi[]): TakvimOlayi[];
export function tekrarsiz(olaylar: TakvimOlayi[]): TakvimOlayi[];
export function birlestir(eski: TakvimOlayi[], yeni: TakvimOlayi[], kaynak: string, aralik: { bas: string; bit: string }): TakvimOlayi[];
export function pencereyeKirp(olaylar: TakvimOlayi[], bugun: string, once?: number, sonra?: number): TakvimOlayi[];
export function gunEkle(tarih: string, n: number): string;
export function bugunIstanbul(simdi?: Date): string;
export function haftaninGunu(tarih: string): number;
export function gunAdi(tarih: string): string;
export function haftaBasi(tarih: string): string;
export function araliktakiOlaylar(olaylar: TakvimOlayi[], bas: string, bit: string, secenek?: { kurum?: string | null; haftalikDahil?: boolean }): TakvimOlayi[];
export function sonGunlerdeAciklananlar(olaylar: TakvimOlayi[], bugun: string, gun?: number): TakvimOlayi[];
export function haftalaraGrupla(olaylar: TakvimOlayi[], bugun: string, haftaSayisi?: number): TakvimHaftasi[];
