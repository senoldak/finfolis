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

// Gemini Faz 2 (27 Ekim): anlam benzerliği. Sahte anlam: kimlik çiftine göre benzerlik.
const anlamIle = (tablo) => (a, b) => tablo[`${a.id}|${b.id}`] ?? null;
const kurB = () => {
  const yazi = oge('a', 'ekonomi', 10);
  return { yazi, tumu: [yazi, oge('b', 'ekonomi', 9), oge('c', 'doviz', 5), oge('d', 'ekonomi', 8), oge('blt', 'bulten', 7, [], false)] };
};

test('anlam yoksa bugünkü sıra birebir', () => {
  const { yazi, tumu } = kurB();
  assert.deepEqual(ilgiliSec(yazi, tumu, 3, () => null), ilgiliSec(yazi, tumu, 3));
});

test('anlamca yakın yazı öne gelir; aday olmayan (bülten) yine çıkmaz; düşük benzerlik etkisiz', () => {
  const { yazi, tumu } = kurB();
  assert.equal(ilgiliSec(yazi, tumu, 3, anlamIle({ 'a|c': 0.9 }))[0], 'c');
  assert.ok(!ilgiliSec(yazi, tumu, 4, anlamIle({ 'a|blt': 0.95 })).includes('blt'));
  assert.deepEqual(ilgiliSec(yazi, tumu, 3, anlamIle({ 'a|c': 0.5 })), ilgiliSec(yazi, tumu, 3));
});
