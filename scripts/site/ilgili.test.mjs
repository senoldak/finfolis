import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ilgiliSec } from '../../src/lib/ilgili.mjs';

const oge = (id, kategori, tarih, varliklar = [], aday = true) => ({ id, kategori, tarih, varliklar, aday });

test('ortak varlığı olan yazı kategori farkına rağmen öne geçer', () => {
  const yazi = oge('a', 'ekonomi', 10, ['Federal Reserve']);
  const tumu = [yazi, oge('b', 'ekonomi', 9), oge('c', 'doviz', 5, ['Federal Reserve']), oge('d', 'ekonomi', 8)];
  assert.deepEqual(ilgiliSec(yazi, tumu), ['c', 'b', 'd']);
});

test('çok ortak varlık önce; eşitlikte aynı kategori, sonra yeni tarih', () => {
  const yazi = oge('a', 'kripto', 10, ['Bitcoin', 'Ethereum']);
  const tumu = [
    yazi,
    oge('b', 'borsa', 9, ['Bitcoin']),
    oge('c', 'kripto', 1, ['Bitcoin']),
    oge('d', 'borsa', 2, ['Bitcoin', 'Ethereum']),
  ];
  assert.deepEqual(ilgiliSec(yazi, tumu), ['d', 'c', 'b']);
});

test('bülten/kısa yazı (aday değil) ve yazının kendisi seçilmez', () => {
  const yazi = oge('a', 'ekonomi', 10, ['Federal Reserve']);
  const tumu = [yazi, oge('b', 'ekonomi', 9, ['Federal Reserve'], false), oge('c', 'ekonomi', 8)];
  assert.deepEqual(ilgiliSec(yazi, tumu), ['c']);
});

test('varlık yoksa aynı kategorinin en yenileri', () => {
  const yazi = oge('a', 'borsa', 10);
  const tumu = [yazi, oge('b', 'borsa', 3), oge('c', 'doviz', 9), oge('d', 'borsa', 7), oge('e', 'borsa', 5), oge('f', 'borsa', 1)];
  assert.deepEqual(ilgiliSec(yazi, tumu), ['d', 'e', 'b']);
});
