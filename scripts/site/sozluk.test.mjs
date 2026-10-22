import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TERIMLER } from '../../src/data/sozluk.mjs';

test('sözlük: 40-60 terim, slug benzersiz ve kebab biçiminde', () => {
  assert.ok(TERIMLER.length >= 40 && TERIMLER.length <= 60, `terim sayısı ${TERIMLER.length}`);
  const slugs = TERIMLER.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('sözlük: her tanım 80-200 kelime, en az bir paragraf', () => {
  for (const t of TERIMLER) {
    const kelime = t.tanim.join(' ').split(/\s+/).filter(Boolean).length;
    assert.ok(kelime >= 80 && kelime <= 200, `${t.slug}: ${kelime} kelime`);
    assert.ok(t.tanim.length >= 1, t.slug);
  }
});

test('sözlük: ilgili terimler var olan slug ve kendisi değil', () => {
  const slugs = new Set(TERIMLER.map((t) => t.slug));
  for (const t of TERIMLER) {
    for (const r of t.ilgili) {
      assert.ok(slugs.has(r), `${t.slug} → ${r} yok`);
      assert.notEqual(r, t.slug);
    }
  }
});

test('sözlük: bağlama ifadeleri derlenir ve boş olmayan terimler bağlanır', () => {
  for (const t of TERIMLER) {
    for (const b of t.bagla) assert.doesNotThrow(() => new RegExp(b, 'u'), `${t.slug}: ${b}`);
  }
  assert.ok(TERIMLER.filter((t) => t.bagla.length > 0).length >= 40);
});
