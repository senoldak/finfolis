import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terfiMi } from './hent-haberler.mjs';

const olay = (id, onem) => ({ onem, icerikli: true, ucretliTek: false, adaylar: [{ id }] });

test('terfiMi: genel RSS 4 ister, resmî kaynak 3 yeter', () => {
  assert.equal(terfiMi(olay('rss:x', 3)), false);
  assert.equal(terfiMi(olay('rss:x', 4)), true);
  assert.equal(terfiMi(olay('fed:x', 3)), true);
  assert.equal(terfiMi(olay('sec:x', 3)), true);
  assert.equal(terfiMi({ ...olay('fed:x', 5), ucretliTek: true }), false);
});
