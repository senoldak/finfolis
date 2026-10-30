import test from 'node:test';
import assert from 'node:assert/strict';
import {
  duzey,
  yillikDegisim,
  donemselDegisim,
  kayanToplamDonusumu,
  logaritmik,
  endeksle,
} from './seri-donusumleri.mjs';

test('duzey: verileri aynen döndürür', () => {
  const veri = [[100, 10], [200, 20]];
  assert.deepEqual(duzey(veri), [[100, 10], [200, 20]]);
  assert.deepEqual(duzey([]), []);
  assert.deepEqual(duzey(null), []);
});

test('yillikDegisim: aylık veride 12 ay öncesiyle yüzde değişim hesaplar', () => {
  const veri = Array.from({ length: 24 }, (_, i) => [i, 100 + i * 10]);
  const res = yillikDegisim(veri, 'ay');
  assert.equal(res.length, 12);
  // i = 12: simdi = 220, once = 100. Degisim = (220/100 - 1) * 100 = 120%
  assert.equal(res[0][0], 12);
  assert.equal(res[0][1], 120);
});

test('yillikDegisim: çeyreklik veride 4 çeyrek öncesiyle hesaplar', () => {
  const veri = Array.from({ length: 8 }, (_, i) => [i, 100 * (i + 1)]);
  const res = yillikDegisim(veri, 'ceyrek');
  assert.equal(res.length, 4);
  // i = 4: simdi = 500, once = 100. Degisim = 400%
  assert.equal(res[0][1], 400);
});

test('yillikDegisim: kısa serilerde boş döner', () => {
  const kisa = Array.from({ length: 5 }, (_, i) => [i, 100]);
  assert.deepEqual(yillikDegisim(kisa, 'ay'), []);
});

test('donemselDegisim: ardışık noktalar arasında yüzde değişim hesaplar', () => {
  const veri = [[0, 100], [1, 110], [2, 99]];
  const res = donemselDegisim(veri);
  assert.equal(res.length, 2);
  assert.equal(res[0][0], 1);
  assert.equal(res[0][1], 10);
  assert.equal(res[1][0], 2);
  assert.equal(Math.round(res[1][1] * 100) / 100, -10);
});

test('kayanToplamDonusumu: 12 dönemlik kayan toplam hesaplar', () => {
  const veri = Array.from({ length: 15 }, (_, i) => [i, 10]);
  const res = kayanToplamDonusumu(veri, 'ay');
  assert.equal(res.length, 4); // 15 - 12 + 1 = 4
  assert.equal(res[0][0], 11);
  assert.equal(res[0][1], 120);
  assert.equal(res[3][1], 120);
});

test('logaritmik: pozitif sayılarda log10 hesaplar, <= 0 olanları eler', () => {
  const veri = [[0, 10], [1, 100], [2, 0], [3, -5], [4, 1000]];
  const res = logaritmik(veri);
  assert.equal(res.length, 3);
  assert.deepEqual(res, [[0, 1], [1, 2], [4, 3]]);
});

test('endeksle: başlangıç değerini 100 yapar ve oranlar', () => {
  const veri = [[0, 50], [1, 100], [2, 75]];
  const res = endeksle(veri);
  assert.deepEqual(res, [[0, 100], [1, 200], [2, 150]]);
});

test('endeksle: başlangıç <= 0 ise boş döner', () => {
  assert.deepEqual(endeksle([[0, 0], [1, 10]]), []);
  assert.deepEqual(endeksle([[0, -10], [1, 10]]), []);
});
