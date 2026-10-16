import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terfiMi, terfiOzeti } from './hent-haberler.mjs';

const olay = (id, onem) => ({ onem, icerikli: true, ucretliTek: false, adaylar: [{ id }] });

test('terfiMi: genel RSS de resmî kaynak da 3 ister; 2 bültende kalır', () => {
  assert.equal(terfiMi(olay('rss:x', 2)), false);
  assert.equal(terfiMi(olay('rss:x', 3)), true);
  assert.equal(terfiMi(olay('fed:x', 2)), false);
  assert.equal(terfiMi(olay('fed:x', 3)), true);
  assert.equal(terfiMi(olay('sec:x', 3)), true);
  assert.equal(terfiMi({ ...olay('fed:x', 5), ucretliTek: true }), false);
});

test('terfiOzeti: önem dağılımını ve terfi etmeme nedenlerini sayar', () => {
  const ol = [olay('rss:a', 4), olay('rss:b', 3), olay('rss:c', 3), { ...olay('rss:d', 4), icerikli: false }, { ...olay('rss:e', 5), ucretliTek: true }, olay('rss:f', 1)];
  assert.equal(terfiOzeti(ol), 'olaylar: 6 yeni (önem 5:1 4:2 3:2 2:0 1:1); terfi 3, eşik altı 1, içeriksiz 1, ücretli 1');
});
