import test from 'node:test';
import assert from 'node:assert/strict';
import { dahaOnce } from './daha-once.mjs';

const oge = (id, tarih, o = {}) => ({ id, tarih, kategori: 'ekonomi', varliklar: [], aday: true, ...o });
const anlamTablosu = (t) => (a, b) => t[[a.id, b.id].sort().join('|')] ?? null;

test('anlam benzerliği eşiği: yalnız eski ve benzer yazılar, eskiden yeniye', () => {
  const yazi = oge('c', 30);
  const tumu = [oge('a', 10), oge('b', 20), oge('d', 40), oge('e', 25), yazi];
  const anlam = anlamTablosu({ 'a|c': 0.85, 'b|c': 0.9, 'c|d': 0.95, 'c|e': 0.5 });
  assert.deepEqual(dahaOnce(yazi, tumu, anlam), ['a', 'b']);
});

test('vektör yoksa aynı kategori ve iki ortak varlık gerekir', () => {
  const yazi = oge('y', 30, { varliklar: ['TCMB', 'TÜİK'] });
  const tumu = [
    oge('bir', 10, { varliklar: ['TCMB'] }),
    oge('iki', 11, { varliklar: ['TCMB', 'TÜİK'] }),
    oge('kat', 12, { varliklar: ['TCMB', 'TÜİK'], kategori: 'borsa' }),
    yazi,
  ];
  assert.deepEqual(dahaOnce(yazi, tumu, () => null), ['iki']);
});

test('aday olmayan (bülten, kısa) yazı ne seçilir ne bölüm alır; en çok dört, en yeniler', () => {
  const anlam = () => 0.9;
  assert.deepEqual(dahaOnce(oge('y', 100, { aday: false }), [oge('a', 1)], anlam), []);
  assert.deepEqual(dahaOnce(oge('y', 100), [oge('a', 1, { aday: false })], anlam), []);
  const tumu = [1, 2, 3, 4, 5, 6].map((t) => oge(`x${t}`, t));
  assert.deepEqual(dahaOnce(oge('y', 100), tumu, anlam), ['x3', 'x4', 'x5', 'x6']);
});
