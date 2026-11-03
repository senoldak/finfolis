import test from 'node:test';
import assert from 'node:assert/strict';
import { sayi, yuzde, tarih } from './bicim.mjs';

test('yuzde: Türkçe yüzde biçimi', () => {
  assert.equal(yuzde(0.0243, 2), '%2,43');
  assert.equal(yuzde(-0.1), '-%10,0');
  assert.equal(yuzde(null), '–');
});

test('sayi: binlik nokta, ondalık virgül', () => {
  assert.equal(sayi(1234567.891), '1.234.567,89');
  assert.equal(sayi(12.5, 0), '13');
  assert.equal(sayi(null), '–');
  assert.equal(sayi(undefined), '–');
});

test('tarih: İstanbul saatiyle gün ay yıl', () => {
  assert.equal(tarih('2026-11-03T23:30:00Z'), '4 Kasım 2026');
  assert.equal(tarih('2026-11-03T10:00:00Z'), '3 Kasım 2026');
  assert.equal(tarih(null), '–');
});
