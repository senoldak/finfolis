// Standartlar Faz 0: standart süzgecinin kararını mecmua-saat motor defterine yazar (POST /motor/<site>/kaydet).
// Yazılamazsa tur durmaz (kayıt yardımcıdır); hata loga düşer. Kimlik adres olamaz: yalnız [A-Za-z0-9:_-].
import { createHash } from 'node:crypto';

// Aday kimlikleri kaynak adresi taşıyabilir: motora yalnız anahtarlı özet gider.
export const motorKimlik = (...ids) => `fin:${createHash('sha256').update(ids.map(String).sort().join('|')).digest('hex').slice(0, 32)}`;

export async function motorKaydet({ url, anahtar, site = 'finfolis', kayit, fetchFn = fetch } = {}) {
  if (!url || !anahtar || !kayit?.kimlik) return false;
  try {
    const res = await fetchFn(`${String(url).replace(/\/$/, '')}/motor/${site}/kaydet`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' },
      body: JSON.stringify({ haberler: [kayit] }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn(`  motor kaydı yazılamadı: saat ${res.status} döndü`);
    return res.ok;
  } catch (e) {
    console.warn(`  motor kaydı yazılamadı: ${String(e?.message ?? e).slice(0, 100)}`);
    return false;
  }
}

// Kırmızı -> elendi; sarı (ya da gerekçeli yayın) -> yazildi + slug. Gerekçesiz karar kaydedilmez.
export const kirmiziKayit = (ids, gerekce) => ({ kimlik: motorKimlik(...ids), durum: 'elendi', gerekce });
export const sariKayit = (ids, slug, gerekce) => ({ kimlik: motorKimlik(...ids), durum: 'yazildi', slug, gerekce });
