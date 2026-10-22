// Kaynak: mecmua/site-ortak/planli/src/lib/yayinda.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yayın kuralı: taslaklar ve tarihi gelmemiş (planlanmış) yazılar canlı sitede hiçbir yerde görünmez.
// Tek kaynak: news.ts (astro:content), astro.config.mjs (site haritası, düz dosya okuma) ve bot betikleri
// (bülten, Telegram, planlı yayın denetimi) bu dosyayı çağırır. Astro'ya bağımlı değildir; düz `node` ile içe aktarılır.
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

// Ham index.md metninin ön bilgisinden (--- … ---) `date` ve `draft` okunur; ön bilgi yoksa undefined.
function onyuzMaddesi(metin) {
  const on = String(metin ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (on === undefined) return undefined;
  // YAML gibi: tırnaklı değer tırnak içinden okunur (sonrası yok sayılır); tırnaksız değerde boşlukla başlayan
  // ` # açıklama` değere dahil değildir (`draft: true # not` taslaktır).
  const alan = (k) => {
    const ham = on.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm'))?.[1];
    if (ham === undefined) return undefined;
    const tirnakli = ham.match(/^(["'])(.*?)\1/);
    if (tirnakli) return tirnakli[2].trim();
    return ham.replace(/(^|[ \t])#.*$/, '').trim();
  };
  return { date: alan('date'), draft: alan('draft') === 'true' };
}

// Ham metin yayında mı; ön bilgide `date` yoksa false.
export function onyuzMaddesiYayinda(metin, simdi = Date.now()) {
  const veri = onyuzMaddesi(metin);
  if (!veri?.date) return false;
  return yayinda(veri, simdi);
}

// Ön bilgideki yayın tarihi (ms, yukarıdaki saat dilimi kuralıyla); tarih yoksa ya da okunamıyorsa NaN.
// Planlı yayın denetimi (planlagt.mjs) "son günlerde vadesi geldi mi" sorusu için kullanır.
export function onyuzMaddesiTarihi(metin) {
  const veri = onyuzMaddesi(metin);
  return veri?.date ? tarih(veri.date) : NaN;
}
