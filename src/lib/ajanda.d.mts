import { z } from 'astro/zod';
import {
  gostergeSemasi,
  gunlukAjandaSemasi,
  ajandaVerisiSemasi,
  esikSemasi,
  ONEM_DERECELERI,
} from './ajanda.mjs';

export type AjandaOnem = (typeof ONEM_DERECELERI)[number];

export type AjandaEsik = z.infer<typeof esikSemasi>;
export type AjandaGosterge = z.infer<typeof gostergeSemasi>;
export type GunlukAjanda = z.infer<typeof gunlukAjandaSemasi>;
export type AjandaVerisi = z.infer<typeof ajandaVerisiSemasi>;

export function sayiCoz(metin: number | string | null | undefined): number | null;

export function pmiDegerlendir(deger: number | string | null | undefined): {
  durum: 'genisleme' | 'daralma' | 'notr' | 'belirsiz';
  aciklama: string;
  etiket: string;
};

export function onemBilgisi(onem: AjandaOnem | string): {
  etiket: string;
  kisa: string;
  sinif: string;
};

export function gostergeFarkiniHesapla(gosterge: AjandaGosterge): {
  durumu: 'beklenti-ustu' | 'beklenti-alti' | 'paralel' | 'bekleniyor';
  metin: string;
  yon?: 'yukari' | 'asagi' | 'ayni';
};

export function gunlukAjandaGetir(tarih?: string, veri?: AjandaVerisi): GunlukAjanda;

export function gostergeleriFiltrele(
  gostergeler: AjandaGosterge[],
  filtre?: 'tumu' | 'kritik' | 'turkiye' | 'kuresel'
): AjandaGosterge[];

export const GOSTERGE_REHBERI: Record<
  string,
  {
    baslik: string;
    esik: string;
    nedir: string;
    nasilOkunur: string;
    onemi: string;
  }
>;
