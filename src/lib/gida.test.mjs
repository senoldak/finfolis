import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { degisimSerisi, sonKapaliAy, urunTablosu, dagilim, oncekiAy } from './gida.mjs';

const ay = (gun, urunler) => ({ gunler: Array.from({ length: gun }, (_, i) => `x${i}`), urunler });
const bes = (f) => Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`sebze|${i}|KG`, [f, 10]]));

test('aylık değişim ardışık aylardan, yıllık değişim on iki ay öncesiyle doğrudan', () => {
  const aylar = {};
  for (let i = 0; i < 13; i++) aylar[oncekiAy('2026-01', 12 - i)] = ay(10, bes(10 * 1.1 ** i));
  const s = degisimSerisi(aylar);
  assert.equal(s[0].aylik.sebze, null);
  assert.ok(Math.abs(s[1].aylik.sebze - 10) < 1e-9);
  assert.ok(Math.abs(s.at(-1).yillik.sebze - 100 * (1.1 ** 12 - 1)) < 1e-6);
  assert.equal(s.at(-1).urun.yillik.sebze, 5);
  assert.equal(s.at(-1).yillik.meyve, null); // meyve ürünü yok
});

test('eksik ayda aylık değişim yok', () => {
  const s = degisimSerisi({ '2025-01': ay(10, bes(10)), '2025-03': ay(10, bes(11)) });
  assert.equal(s[1].aylik.sebze, null);
});

test('son kapalı ay: ayın 20si geçmeden içinde bulunulan ay sayılmaz', () => {
  const aylar = { '2026-09': ay(14, {}), '2026-10': ay(12, {}) };
  assert.equal(sonKapaliAy(aylar, '2026-10-15'), '2026-09');
  assert.equal(sonKapaliAy(aylar, '2026-10-21'), '2026-10');
  assert.equal(sonKapaliAy({ '2026-10': ay(3, {}) }, '2026-10-29'), null);
});

test('ürün tablosu ve dağılım', () => {
  const aylar = {
    '2025-10': ay(10, { 'sebze|175|KG': [20, 10] }),
    '2026-09': ay(10, { 'sebze|175|KG': [40, 10], 'meyve|1|KG': [10, 10] }),
    '2026-10': ay(10, { 'sebze|175|KG': [50, 10], 'meyve|1|KG': [10, 10], 'meyve|9|ADET': [2, 3] }),
  };
  const t = urunTablosu(aylar, { 'sebze|175': 'DOMATES', 'meyve|1': 'AYVA' }, '2026-10');
  const d = t.find((r) => r.ad === 'DOMATES');
  assert.equal(d.aylik, 25);
  assert.equal(d.yillik, 150);
  assert.equal(t.find((r) => r.birim === 'ADET').ad, 'Ürün 9');
  assert.deepEqual(dagilim(t), { n: 2, artan: 1, azalan: 0, medyan: 12.5 });
  assert.equal(oncekiAy('2026-01', 1), '2025-12');
});

test('gerçek veri: Eylül 2026 toplam değişimi Tahmin sayfasındaki hal değişimiyle aynı', () => {
  const v = JSON.parse(readFileSync(new URL('../data/hal-fiyat.json', import.meta.url), 'utf8'));
  const s = degisimSerisi(v.aylar);
  const eylul = s.find((r) => r.ay === '2026-09');
  assert.equal(Math.round(eylul.aylik.toplam * 10) / 10, -8.7);
  assert.equal(Math.round(eylul.yillik.meyve), -24);
});
