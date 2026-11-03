import test from 'node:test';
import assert from 'node:assert/strict';
import { sirala, suz } from './tablo.mjs';

const v = (xs) => xs.map((x) => ({ x }));
const al = (rows) => rows.map((r) => r.x);

test('sirala: null her iki yönde sonda', () => {
  assert.deepEqual(al(sirala(v([3, null, 1]), 'x', 'artan')), [1, 3, null]);
  assert.deepEqual(al(sirala(v([3, null, 1]), 'x', 'azalan')), [3, 1, null]);
});

test('sirala: metin Türkçe sıralanır, girdi değişmez', () => {
  const girdi = v(['Şeker', 'Altın', 'İnek']);
  assert.deepEqual(al(sirala(girdi, 'x', 'artan')), ['Altın', 'İnek', 'Şeker']);
  assert.deepEqual(al(girdi), ['Şeker', 'Altın', 'İnek']);
});

const satirlar = [{ ad: 'Altın', tur: 'maden' }, { ad: 'Gram altın', tur: 'maden' }, { ad: 'Buğday', tur: 'tarım' }];

test('suz: metin büyük/küçük harf ve Türkçe i/ı duyarsız', () => {
  assert.deepEqual(suz(satirlar, { metin: 'ALTIN' }, ['ad']).map((r) => r.ad), ['Altın', 'Gram altın']);
  assert.deepEqual(suz(satirlar, { metin: 'ı' }, ['ad']).map((r) => r.ad), ['Altın', 'Gram altın']);
});

test('suz: seçimler tam eşleşme, eşleşme yoksa boş', () => {
  assert.deepEqual(suz(satirlar, { secimler: { tur: 'tarım' } }, ['ad']).map((r) => r.ad), ['Buğday']);
  assert.deepEqual(suz(satirlar, { metin: 'yok' }, ['ad']), []);
  assert.equal(suz(satirlar, {}, ['ad']).length, 3);
});
