import test from 'node:test';
import assert from 'node:assert/strict';
import { ilBul, yerHaritasi } from './yer-haritasi.mjs';

test('ilBul: harf ve şapka farkı gözetilmez', () => {
  assert.equal(ilBul('izmir').ad, 'İzmir');
  assert.equal(ilBul('Elazığ').ad, 'Elâzığ');
  assert.equal(ilBul('Atlantis'), null);
});

test('yerHaritasi: 81 il, yalnız seçili il işaretli; bilinmeyen il null', () => {
  const s = yerHaritasi('İzmir');
  assert.ok(s.startsWith('<svg '));
  assert.equal(s.split('<path ').length - 1, 81);
  assert.equal(s.split('class="secili"').length - 1, 1);
  assert.match(s, /aria-label="Türkiye haritasında İzmir"/);
  assert.equal(yerHaritasi(''), null);
});
