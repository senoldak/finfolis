import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'astro/zod';
import { YAZI_TURLERI, VARSAYILAN_YAZI_TURU, aciklayiciMi, analizMi } from './yazi-turu.mjs';

// src/content.config.ts'deki alanın aynısı.
const alan = z.enum(YAZI_TURLERI).default(VARSAYILAN_YAZI_TURU);

test('YAZI_TURLERI: haber, aciklayici, referans, analiz', () => {
  assert.deepEqual([...YAZI_TURLERI], ['haber', 'aciklayici', 'referans', 'analiz']);
});

test('yaziTuru: alan yoksa varsayılan haber', () => {
  assert.equal(VARSAYILAN_YAZI_TURU, 'haber');
  assert.equal(alan.parse(undefined), 'haber');
});

test('yaziTuru: geçersiz değer şemada reddedilir', () => {
  assert.equal(YAZI_TURLERI.includes('yorum'), false);
  assert.equal(alan.safeParse('yorum').success, false);
  assert.equal(alan.safeParse('referans').success, true);
  assert.equal(alan.safeParse('analiz').success, true);
});

test('aciklayiciMi: aciklayici ve referans true, haber ve boş false', () => {
  assert.equal(aciklayiciMi({ yaziTuru: 'referans' }), true);
  assert.equal(aciklayiciMi({ yaziTuru: 'aciklayici' }), true);
  assert.equal(aciklayiciMi({ yaziTuru: 'haber' }), false);
  assert.equal(aciklayiciMi({}), false);
  assert.equal(aciklayiciMi(undefined), false);
});

test('analizMi: yalnız analiz true; açıklayıcı, haber ve boş false; analiz açıklayıcı sayılmaz', () => {
  assert.equal(analizMi({ yaziTuru: 'analiz' }), true);
  assert.equal(analizMi({ yaziTuru: 'aciklayici' }), false);
  assert.equal(analizMi({ yaziTuru: 'haber' }), false);
  assert.equal(analizMi({}), false);
  assert.equal(analizMi(undefined), false);
  assert.equal(aciklayiciMi({ yaziTuru: 'analiz' }), false);
});
