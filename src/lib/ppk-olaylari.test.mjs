import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ppkOlaylari, gozlemeHizala } from './ppk-olaylari.mjs';

const gecmis = [
  { tarih: '2025-12-12', oran: 38 },
  { tarih: '2026-01-23', oran: 37 },
  { tarih: '2026-03-13', oran: 37 },
  { tarih: '2026-10-23', oran: 36.5 },
];

test('yalnız değişiklikler, aylık t', () => {
  const o = ppkOlaylari(gecmis, 'ay');
  assert.equal(o.length, 2);
  assert.deepEqual(o[0], { t: 2026 * 12, ad: 'PPK: %38 → %37 (23 Ocak 2026)', yon: 'indirim' });
  assert.equal(o[1].t, 2026 * 12 + 9);
  assert.equal(o[1].ad, 'PPK: %37 → %36,5 (23 Ekim 2026)');
});

test('günlük t ve hizalama', () => {
  const o = ppkOlaylari(gecmis, 'hafta');
  assert.equal(o[0].t, Date.UTC(2026, 0, 23) / 86_400_000);
  const h = gozlemeHizala(o, [o[0].t - 3, o[0].t + 4, o[1].t + 1]);
  assert.equal(h[0].t, o[0].t + 4);
  assert.equal(h[1].t, o[1].t + 1);
  assert.deepEqual(ppkOlaylari(null), []);
  assert.equal(ppkOlaylari([{ tarih: '2026-01-01', oran: 10 }, { tarih: '2026-02-01', oran: 12 }])[0].yon, 'artis');
});
