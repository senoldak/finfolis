import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESKIME_SAAT, eskimis } from './emsal-ulkeler.mjs';

test('eskimis: 72 saatten eski ya da hiç alınmamış OECD akışı', () => {
  const simdi = Date.parse('2026-11-26T12:00:00Z');
  assert.equal(ESKIME_SAAT, 72);
  assert.deepEqual(eskimis({ kei: '2026-11-25T12:00:00Z', fiyat: '2026-11-26T10:00:00Z' }, simdi), []);
  assert.deepEqual(eskimis({ kei: '2026-11-22T11:59:00Z', fiyat: '2026-11-26T10:00:00Z' }, simdi), ['kei']);
  assert.deepEqual(eskimis({ kei: null }, simdi), ['kei', 'fiyat']);
  assert.deepEqual(eskimis(undefined, simdi), ['kei', 'fiyat']);
});
