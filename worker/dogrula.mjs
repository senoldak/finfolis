// POST /api/yararli gövdesinin saf denetimi (dogrula.test.mjs).
export const EN_COK_BAYT = 1024;
const SLUG = /^[a-z0-9-]{1,160}$/;

// { ok: true, slug, yanit } ya da { ok: false }.
export function yanitDenetle(metin, icerikTuru) {
  if (!/^application\/json(\s*;|$)/i.test(String(icerikTuru || ''))) return { ok: false };
  if (typeof metin !== 'string' || new TextEncoder().encode(metin).length > EN_COK_BAYT) return { ok: false };
  let d;
  try {
    d = JSON.parse(metin);
  } catch {
    return { ok: false };
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false };
  if (typeof d.slug !== 'string' || !SLUG.test(d.slug)) return { ok: false };
  if (d.yanit !== 'evet' && d.yanit !== 'hayir') return { ok: false };
  return { ok: true, slug: d.slug, yanit: d.yanit };
}

// İstanbul saatine göre gün, YYYY-AA-GG.
export function istanbulGunu(t = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
}
