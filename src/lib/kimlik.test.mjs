import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abakusSvg, boncukTelleri, KIMLIK } from './kimlik.js';

const say = (svg, renk) => (svg.match(new RegExp(`<circle[^>]*fill="${renk}"`, 'g')) ?? []).length;

test('tam abaküs: 6 koyu, 10 gri boncuk, 4 tel', () => {
  const s = abakusSvg();
  assert.equal(say(s, KIMLIK.murekkep), 6);
  assert.equal(say(s, KIMLIK.boncukGri), 10);
  assert.equal((s.match(/<line/g) ?? []).length, 4);
});

test('küçük abaküs: 3 koyu, 6 gri boncuk, 3 tel', () => {
  const s = abakusSvg({ kucuk: true });
  assert.equal(say(s, KIMLIK.murekkep), 3);
  assert.equal(say(s, KIMLIK.boncukGri), 6);
  assert.equal((s.match(/<line/g) ?? []).length, 3);
});

test('vurgu yalnız sağ üstteki boncuğu pişmiş toprak yapar', () => {
  const s = abakusSvg({ zemin: 'soluk', vurgu: true });
  assert.equal(say(s, KIMLIK.toprak), 1);
  assert.match(s, new RegExp(`cx="100" cy="24" r="8" fill="${KIMLIK.toprak}"`));
});

test('pişmiş toprak zemin: koyu boncuklar kâğıt rengi', () => {
  const s = abakusSvg({ zemin: 'toprak' });
  assert.equal(say(s, KIMLIK.kagit), 6);
  assert.equal(say(s, KIMLIK.toprakAcik), 10);
});

test('boncuk telleri 10ar, son boncuk kesirli', () => {
  const t = boncukTelleri(49.53, 2);
  assert.deepEqual(t.map((x) => x.length), [10, 10, 5]);
  assert.equal(t[2][4], 0.77);
});

test('0,1in altındaki kesir çizilmez, tam katta kesir yok', () => {
  assert.deepEqual(boncukTelleri(20.1, 2).flat().length, 10);
  assert.deepEqual(boncukTelleri(30, 3), [Array(10).fill(1)]);
});

test('boş ya da geçersiz miktar boş döner', () => {
  assert.deepEqual(boncukTelleri(0, 2), []);
  assert.deepEqual(boncukTelleri(5, 0), []);
  assert.deepEqual(boncukTelleri(Number.NaN, 2), []);
});
