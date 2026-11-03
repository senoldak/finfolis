import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gostergeSecimi, yeterliGecmis, YETERLI_NOKTA } from './grafix.mjs';

const sutunlar = { kapanis: [], ema233: [], ema377: [], sma200: [], rsi14: [] };

test('kapanış her zaman çizilir, seçilmeyen gösterge çizilmez', () => {
  assert.deepEqual(gostergeSecimi(sutunlar, []), ['kapanis']);
  assert.deepEqual(gostergeSecimi(sutunlar, ['ema233']), ['kapanis', 'ema233']);
});

test('seride olmayan ya da kapanış dışında tekrar eden gösterge atlanır', () => {
  assert.deepEqual(gostergeSecimi(sutunlar, ['kijun_g', 'ema233', 'kapanis', 'ema233']), ['kapanis', 'ema233', 'ema233']);
  assert.deepEqual(gostergeSecimi({}, ['ema233']), []);
});

test('yeterli geçmiş: 251 nokta yetmez, 252 yeter', () => {
  assert.equal(YETERLI_NOKTA, 252);
  assert.equal(yeterliGecmis({ tarihler: new Array(251).fill('2026-10-23') }), false);
  assert.equal(yeterliGecmis({ tarihler: new Array(252).fill('2026-10-23') }), true);
  assert.equal(yeterliGecmis(null), false);
  assert.equal(yeterliGecmis({}), false);
});
