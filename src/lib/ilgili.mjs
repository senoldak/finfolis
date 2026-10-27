// "İlgili haberler" seçimi: önce ortak varlık (kurum, şirket, ürün; src/lib/entities.ts) sayısı çok olanlar,
// eşitlikte aynı kategori ve yeni tarih öne geçer; varlıkla dolmazsa aynı kategorinin en yenileriyle tamamlanır.
// Bülten (derleme, tek konuya götürmez) ve kısa/noindex yazı aday olmaz; yazının kendisi asla seçilmez.
// Düz JS: site derlemesi ve node --test (scripts/site/ilgili.test.mjs) aynı kodu kullanır.
// Gemini Faz 2 (27 Ekim): ortak varlık puanına anlam benzerliği eklenir (src/data/vektorler.jsonl, kimlik = yazı id'si);
// vektör yoksa 0 puan, sıra bugünkü gibi.
import { anlamBenzerligi, anlamPuani, vektorleriOku } from './anlam.mjs';

const varsayilanAnlam = (a, b) => anlamBenzerligi(vektorleriOku(), a.id, b.id);

/**
 * @typedef {{ id: string, kategori: string, tarih: number, varliklar: string[], aday: boolean }} IlgiliOge
 * @param {IlgiliOge} yazi
 * @param {IlgiliOge[]} tumu
 * @param {number} [adet]
 * @param {(a: IlgiliOge, b: IlgiliOge) => number | null} [anlam]
 * @returns {string[]} seçilen yazıların id'leri
 */
export function ilgiliSec(yazi, tumu, adet = 3, anlam = varsayilanAnlam) {
  const benim = new Set(yazi.varliklar);
  const adaylar = tumu.filter((h) => h.aday && h.id !== yazi.id);
  const puanli = adaylar
    .map((h) => ({ h, ortak: h.varliklar.filter((v) => benim.has(v)).length + anlamPuani(anlam(yazi, h)), ayniKat: h.kategori === yazi.kategori }))
    .filter((x) => x.ortak > 0)
    .sort((a, b) => b.ortak - a.ortak || Number(b.ayniKat) - Number(a.ayniKat) || b.h.tarih - a.h.tarih);
  const secilen = puanli.slice(0, adet).map((x) => x.h.id);
  if (secilen.length < adet) {
    const kalan = adaylar
      .filter((h) => h.kategori === yazi.kategori && !secilen.includes(h.id))
      .sort((a, b) => b.tarih - a.tarih);
    secilen.push(...kalan.slice(0, adet - secilen.length).map((h) => h.id));
  }
  return secilen;
}
