// Yazı uzunluğu: sitede (noindex, site haritaları) ve haber botunda (en az uzunluk) aynı sayım kullanılır.
// Kısa yazı okura "ne oldu, neden önemli, ana rakam" üçlüsünü veremez; arama motorlarına zayıf içerik olarak gider.

// Bu kelime sayısının altındaki yazılar (haber ve bülten) noindex, follow olur ve site haritalarına girmez.
export const INDEKS_ESIGI = 120;

// Markdown gövdedeki okunur kelimeler: bağlantı adresleri, biçim işaretleri ve ön bilgi sayılmaz.
export function kelimeSay(metin) {
  const duz = String(metin ?? '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  return duz.split(/\s+/).filter((k) => /[\p{L}\d]/u.test(k)).length;
}

export const indekslenir = (govde) => kelimeSay(govde) >= INDEKS_ESIGI;
