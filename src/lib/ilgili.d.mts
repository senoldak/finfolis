export interface IlgiliOge {
  id: string;
  kategori: string;
  tarih: number;
  varliklar: string[];
  aday: boolean;
}
export function ilgiliSec(yazi: IlgiliOge, tumu: IlgiliOge[], adet?: number): string[];
