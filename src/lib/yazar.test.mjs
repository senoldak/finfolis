import test from 'node:test';
import assert from 'node:assert/strict';
import { YAZAR, yazarSemasi, yazarUrl } from './yazar.mjs';

test('yazar sabiti: ad, unvan ve sayfa yolu', () => {
  assert.equal(YAZAR.ad, 'Şenol Dak');
  assert.equal(YAZAR.unvan, 'Gazeteci');
  assert.equal(YAZAR.kunye.length, 2);
  assert.equal(YAZAR.aciklama, YAZAR.kunye[0]);
  assert.equal(YAZAR.yol, '/yazar/senol-dak/');
  assert.equal(yazarUrl('https://finfolis.com'), 'https://finfolis.com/yazar/senol-dak/');
});

test('yazarSemasi: Person düğümü, yayıncıya bağlı', () => {
  const s = yazarSemasi('https://finfolis.com', 'https://finfolis.com/#organization');
  assert.equal(s['@type'], 'Person');
  assert.equal(s.name, 'Şenol Dak');
  assert.equal(s.jobTitle, 'Gazeteci');
  assert.equal(s.url, 'https://finfolis.com/yazar/senol-dak/');
  assert.deepEqual(s.worksFor, { '@id': 'https://finfolis.com/#organization' });
});

test('kisiYazariMi: analiz, açıklayıcı/referans ve köşe Şenol Dak; haber ve bülten site adı', async () => {
  const { kisiYazariMi } = await import('./yazar.mjs');
  assert.equal(kisiYazariMi({ yaziTuru: 'analiz' }), true);
  assert.equal(kisiYazariMi({ yaziTuru: 'aciklayici' }), true);
  assert.equal(kisiYazariMi({ yaziTuru: 'referans' }), true);
  assert.equal(kisiYazariMi({ yaziTuru: 'kose' }), true);
  assert.equal(kisiYazariMi({ yaziTuru: 'haber', uretim: 'bot' }), false);
  assert.equal(kisiYazariMi({ uretim: 'bot', author: 'Şenol Dak' }), false);
  assert.equal(kisiYazariMi({}), false);
  assert.equal(kisiYazariMi(null), false);
});
