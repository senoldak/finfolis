import { test } from 'node:test';
import assert from 'node:assert/strict';
import { veriDurumu } from './veri-durumu-bildir.mjs';

test('veriDurumu: betikler tekilleşir; hata yalnız listedeki betik için, ilk satır alınır', () => {
  const d = veriDurumu('emsal-ulkeler\nenflasyon-katkilari\nemsal-ulkeler\n\n', 'emsal-ulkeler\tHata: 500\tek\nbilinmeyen\tx\nemsal-ulkeler\tikinci\n');
  assert.deepEqual(d, { betikler: ['emsal-ulkeler', 'enflasyon-katkilari'], hatalar: [{ betik: 'emsal-ulkeler', mesaj: 'Hata: 500 ek' }] });
  assert.deepEqual(veriDurumu('', ''), { betikler: [], hatalar: [] });
  assert.equal(veriDurumu('a', `a\t${'x'.repeat(500)}`).hatalar[0].mesaj.length, 300);
});
