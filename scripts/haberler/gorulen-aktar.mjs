// Tek seferlik geçiş: eski düzende karar verilmiş adayların kimliklerini mecmua-saat motor defterine yazar.
// Elendi olarak ('aktarım: eski düzende karar verildi'); yazılmış haber (yazildi + slug) slug'ıyla 'yazildi' olarak.
// Havuzdaki olaylar (üyeleriyle) hariç tutulur: onların kararı havuz işlenince verilir. Havuz açılamazsa aktarım
// başlamaz (üyeler yanlışlıkla elenmesin). Defterde bitmiş kayıt değişmez; yeniden çalıştırmak güvenlidir.
// Henüz karar verilmemiş (yalnız başarısız deneme sayılan) kayıtlar aktarılmaz: yerel durumda da bekliyorlar.
// İstekte yalnız tek yönlü özetlenmiş kimlik gider (motorKimlik); ham id gitmez, loga yazılmaz.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { havuzAc } from './havuz.mjs';
import { motorKimlik } from './motor.mjs';

export const PARCA = 35;
export const GEREKCE = 'aktarım: eski düzende karar verildi';

export function aktarimKayitlari(durum, { havuzAcFn = havuzAc } = {}) {
  const ham = durum.havuz ?? [];
  const acik = havuzAcFn(ham);
  if (acik.length < ham.length) throw new Error(`havuz açılamadı (${acik.length}/${ham.length}); KAYNAK_ANAHTARI doğru mu?`);
  const havuzda = new Set(ham.map((h) => h.id));
  for (const h of acik) {
    havuzda.add(h.id);
    for (const a of h.adaylar ?? []) havuzda.add(a.id);
  }
  return Object.entries(durum.gorulen ?? {})
    .filter(([id, g]) => !havuzda.has(id) && !(g?.deneme && !g?.yazildi))
    .map(([id, g]) => (g?.yazildi && g?.slug ? { kimlik: motorKimlik(id), durum: 'yazildi', slug: g.slug } : { kimlik: motorKimlik(id), durum: 'elendi', gerekce: GEREKCE }));
}

export async function aktar({ durum, url, anahtar, fetchFn = fetch, havuzAcFn, log = () => {} }) {
  if (!url || !anahtar) throw new Error('MOTOR_URL ve MOTOR_ANAHTARI gerekli');
  const kayitlar = aktarimKayitlari(durum, { havuzAcFn });
  const adres = `${String(url).replace(/\/$/, '')}/motor/finfolis/kaydet`;
  for (let i = 0; i < kayitlar.length; i += PARCA) {
    const res = await fetchFn(adres, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' },
      body: JSON.stringify({ haberler: kayitlar.slice(i, i + PARCA) }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`motor kaydı reddedildi: saat ${res.status} döndü (parça ${i / PARCA + 1})`);
    log(`  parça ${i / PARCA + 1}: ${Math.min(PARCA, kayitlar.length - i)} kayıt`);
  }
  return kayitlar.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const durum = JSON.parse(readFileSync(new URL('./gorulen.json', import.meta.url), 'utf8'));
    const n = await aktar({ durum, url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, log: console.log });
    console.log(`aktarıldı: ${n}`);
  } catch (e) {
    console.error(`aktarım başarısız: ${String(e?.message ?? e).slice(0, 200)}`);
    process.exit(1);
  }
}
