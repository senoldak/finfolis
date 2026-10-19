// Yayın kuralı: taslaklar ve tarihi gelmemiş (planlanmış) yazılar canlı sitede hiçbir yerde görünmez.
// Tek kaynak: news.ts (astro:content), astro.config.mjs (site haritası, düz dosya okuma) ve bot betikleri
// (Telegram, planlı yayın denetimi) bu dosyayı çağırır. Astro'ya bağımlı değildir; düz `node` ile içe aktarılır.
// Yerel geliştirmede (import.meta.env.DEV) ileri tarihli yazıların görünmesi çağıranın işidir (news.ts).

// Ofsetsiz tarih-saat UTC sayılır (zod `coerce.date` / YAML zaman damgası davranışı); yalnız tarih zaten UTC'dir.
function tarih(d) {
  if (d instanceof Date) return d.getTime();
  let s = String(d ?? '').trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i);
  if (m) s = `${m[1]}T${m[2]}${m[3] ?? 'Z'}`;
  return Date.parse(s);
}

export function yayinda(veri, simdi = Date.now()) {
  const t = tarih(veri.date);
  return !veri.draft && !Number.isNaN(t) && t <= simdi;
}

// Ham index.md metninin ön bilgisinden (--- … ---) `date` ve `draft` okunur; `date` yoksa false.
export function onyuzMaddesiYayinda(metin, simdi = Date.now()) {
  const on = String(metin ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (on === undefined) return false;
  const alan = (k) => on.match(new RegExp(`^${k}:[ \\t]*(["']?)([^"'\\r\\n]*)\\1[ \\t]*$`, 'm'))?.[2]?.trim();
  const date = alan('date');
  if (!date) return false;
  return yayinda({ date, draft: alan('draft') === 'true' }, simdi);
}
