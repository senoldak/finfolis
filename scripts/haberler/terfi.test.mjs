import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terfiMi, terfiOzeti } from './hent-haberler.mjs';

const olay = (id, onem) => ({ onem, icerikli: true, ucretliTek: false, adaylar: [{ id }] });

test('terfiMi: genel RSS de resmî kaynak da 70 ister (0–100); 69 bültende kalır', () => {
  assert.equal(terfiMi(olay('rss:x', 69)), false);
  assert.equal(terfiMi(olay('rss:x', 70)), true);
  assert.equal(terfiMi(olay('fed:x', 60)), false);
  assert.equal(terfiMi(olay('fed:x', 70)), true);
  assert.equal(terfiMi(olay('sec:x', 85)), true);
  assert.equal(terfiMi({ ...olay('fed:x', 100), ucretliTek: true }), false);
});

test('terfiOzeti: önem dağılımını ve terfi etmeme nedenlerini sayar', () => {
  const ol = [olay('rss:a', 80), olay('rss:b', 60), olay('rss:c', 72), { ...olay('rss:d', 80), icerikli: false }, { ...olay('rss:e', 95), ucretliTek: true }, olay('rss:f', 20)];
  assert.equal(terfiOzeti(ol), 'olaylar: 6 yeni (önem 90+:1 70-89:3 50-69:1 30-49:0 0-29:1); terfi 2, eşik altı 2, içeriksiz 1, ücretli 1');
});
