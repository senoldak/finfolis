// Haber sayfasındaki sözcük açıklaması için kısa tanımlar: terim adı ve tanımın ilk cümlesi, slug'a göre
// (/sozluk/kisa.json; src/scripts/okur-araclari.ts ilk tıklamada bir kez okur). Metindeki bağlantılara öznitelik
// eklenmez: yazı işlerinin onay denetimi haber HTML'inde yalnız izinli öznitelikleri kabul ediyor.
import { TERIMLER } from '../data/sozluk.mjs';

/** Metnin ilk cümlesi: ilk nokta/ünlem/soru işaretinden sonra boşluk ya da metin sonu gelince biter. */
export function ilkCumle(metin) {
  return (String(metin).match(/^.+?[.!?](?=\s|$)/) ?? [String(metin)])[0].trim();
}

/** { slug: { terim, tanim } } */
export function kisaTanimlar(terimler = TERIMLER) {
  return Object.fromEntries(terimler.map((t) => [t.slug, { terim: t.terim, tanim: ilkCumle(t.tanim[0] ?? '') }]));
}
