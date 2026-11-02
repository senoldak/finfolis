import test from 'node:test';
import assert from 'node:assert/strict';
import { fineTikker, skala, tall, deger, aralik, kortNavn, esc, sti, trappSti, kortEnhet, tikkDesimaler } from './felles.mjs';

test('fineTikker: düz seri NaN üretmez', () => { const t = fineTikker(5, 5); assert.ok(t.length >= 2 && t.every(Number.isFinite)); });
test('fineTikker: 0–5,2 → 0..6', () => assert.deepEqual(fineTikker(0, 5.2), [0, 2, 4, 6]));
test('skala: doğrusal', () => assert.equal(skala(0, 10, 100, 0)(5), 50));
test('tall: tr-TR (virgül ondalık, nokta binlik, U+2212)', () => { assert.equal(tall(3.4), '3,4'); assert.equal(tall(55800, 0), '55.800'); assert.equal(tall(40417, 0), '40.417'); assert.equal(tall(-1.1), '−1,1'); assert.equal(tall(-0.04), '0,0'); });
test('deger: yüzde önek, eksi önde, artı isteğe bağlı', () => {
  assert.equal(deger(-9.3, 1, '%'), '−%9,3');
  assert.equal(deger(5.1, 1, '%'), '%5,1');
  assert.equal(deger(2.1, 1, '%', true), '+%2,1');
  assert.equal(deger(40417, 0, ' TL'), '40.417 TL');
  assert.equal(deger(-3, 0, ' puan', true), '−3 puan');
  assert.equal(aralik(1, 3, 1, '%'), '%1,0–%3,0');
  assert.equal(aralik(1, 3, 1, ' TL'), '1,0–3,0 TL');
});
test('sti: null keser', () => assert.equal(sti([{ x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 3 }]), 'M0 1M2 3'));
test('trappSti: H/V', () => assert.equal(trappSti([{ x: 0, y: 1 }, { x: 2, y: 3 }]), 'M0 1H2V3'));
test('kortNavn', () => { assert.equal(kortNavn('Møre og Romsdal og Vestland uten Bergen', 20), 'Møre og Romsdal og …'); assert.equal(kortNavn('Oslo', 20), 'Oslo'); });
test('esc', () => assert.equal(esc('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;'));
test('kortEnhet', () => {
  assert.equal(kortEnhet('Yıllık enflasyon, yüzde'), '%');
  assert.equal(kortEnhet('Aylık maaş, TL'), ' TL');
  assert.equal(kortEnhet('Lira'), ' TL');
  assert.equal(kortEnhet('Bin kişi'), ' bin kişi');
  assert.equal(kortEnhet('Indeks (2015 = 100)'), '');
});
test('tikkDesimaler: adımdan ondalık', () => {
  assert.equal(tikkDesimaler([4, 4.25, 4.5]), 2);
  assert.equal(tikkDesimaler([0, 2, 4]), 0);
  assert.equal(tikkDesimaler([0, 0.5, 1]), 1);
  assert.equal(tikkDesimaler([0.01, 0.02]), 2);
});
test('fineTikker: sonlu olmayan girdi hata atar, yığın taşmaz', () => assert.throws(() => fineTikker(Infinity, -Infinity), /sonlu/));
test('kortEnhet: milliarder/millioner kroner', () => {
  assert.equal(kortEnhet('Milyar TL'), ' milyar TL');
  assert.equal(kortEnhet('Milyar dolar'), ' milyar dolar');
  assert.equal(kortEnhet('Milyon TL'), ' milyon TL');
});
test('kortEnhet: puan yüzde değildir', () => assert.equal(kortEnhet('Yüzde puan'), ' puan'));
