import test from 'node:test';
import assert from 'node:assert/strict';
import { YAZAR, yazarSemasi, yazarUrl } from './yazar.mjs';

test('yazar sabiti: ad, unvan ve sayfa yolu', () => {
  assert.equal(YAZAR.ad, 'Şenol Dak');
  assert.equal(YAZAR.unvan, 'Yayın yönetmeni ve editör');
  assert.equal(YAZAR.yol, '/yazar/senol-dak/');
  assert.equal(yazarUrl('https://finfolis.com'), 'https://finfolis.com/yazar/senol-dak/');
});

test('yazarSemasi: Person düğümü, yayıncıya bağlı', () => {
  const s = yazarSemasi('https://finfolis.com', 'https://finfolis.com/#organization');
  assert.equal(s['@type'], 'Person');
  assert.equal(s.name, 'Şenol Dak');
  assert.equal(s.jobTitle, 'Yayın yönetmeni ve editör');
  assert.equal(s.url, 'https://finfolis.com/yazar/senol-dak/');
  assert.deepEqual(s.worksFor, { '@id': 'https://finfolis.com/#organization' });
});
