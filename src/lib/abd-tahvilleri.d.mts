export interface TahvilNoktasi {
  tarih: string;
  uzunUSD: number;
  kisaUSD: number;
  toplamUSD: number;
  kisaOran: number;
  uzunOran: number;
}

export interface TahvilAnalizi {
  guncelleme: string;
  sonNokta: TahvilNoktasi;
  oncekiNokta: TahvilNoktasi | null;
  aylikDegisimUSD: number;
  aylikDegisimYuzde: number;
  tarihselZirve: { tarih: string; toplamUSD: number };
  tarihselDip: { tarih: string; toplamUSD: number };
  zirvedenFarkYuzde: number;
  noktalar: TahvilNoktasi[];
}

export function fredCsvAyristir(csvMetin: string): Map<string, number>;
export function abdTahvilAnalizi(uzunCsv: string, kisaCsv: string): TahvilAnalizi;
