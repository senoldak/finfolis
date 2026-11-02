import test from 'node:test';
import assert from 'node:assert/strict';
import { ilkCumle, kisaTanimlar } from './sozluk-kisa.mjs';

test('ilkCumle: ilk nokta-boşlukta biter, ondalık virgüle takılmaz', () => {
  assert.equal(ilkCumle('Oran 3,5 puan indi. İkinci cümle.'), 'Oran 3,5 puan indi.');
  assert.equal(ilkCumle('Tek cümle'), 'Tek cümle');
});

test('kisaTanimlar: her terimin adı ve tek cümlelik tanımı', () => {
  const k = kisaTanimlar();
  assert.equal(k.enflasyon.terim, 'Enflasyon');
  assert.match(k.enflasyon.tanim, /^Enflasyon, .+\.$/);
  assert.ok(!k.enflasyon.tanim.includes('Tek bir ürünün'));
  for (const [slug, v] of Object.entries(k)) assert.ok(v.terim && v.tanim.length > 10, slug);
});
