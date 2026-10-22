import { test } from 'node:test';
import assert from 'node:assert/strict';
import sozlukBagla, { baglaMetni, kaliplar, haberDosyasiMi, SINIR } from '../../src/lib/sozluk-bagla.mjs';

const HABER_URL = new URL('file:///C:/x/src/content/haberler/ornek-haber/index.md');

// Sätteri'nin text ziyaretçisini taklit eder: ağaç, düğümleri ve replaceNode çağrısını izler.
function calistir(metin, ata = []) {
  const plugin = sozlukBagla({ fileURL: HABER_URL });
  assert.ok(plugin, 'haber belgesinde eklenti etkin olmalı');
  const node = { type: 'text', value: metin };
  const parents = ata.map((tagName) => ({ type: 'element', tagName, children: [] }));
  let cikti = null;
  const hctx = {
    parent: (n) => {
      if (n === node) return parents.at(-1);
      const i = parents.indexOf(n);
      return i > 0 ? parents[i - 1] : undefined;
    },
    replaceNode: (_n, yeni) => {
      cikti = yeni;
    },
  };
  plugin.text(node, hctx);
  return cikti ?? [{ type: 'text', value: metin }];
}
const baglantilar = (dugumler) => dugumler.filter((d) => d.type === 'element').map((d) => d.properties.href);

test('bağlama: ilk geçiş bağlanır, ek alan biçim korunur', () => {
  const d = calistir('Enflasyon yükseldi, enflasyonun nedeni kurdu.');
  assert.deepEqual(baglantilar(d), ['/sozluk/enflasyon/']);
  assert.equal(d.map((x) => (x.type === 'element' ? x.children[0].value : x.value)).join(''), 'Enflasyon yükseldi, enflasyonun nedeni kurdu.');
});

test('bağlama: aynı terim bir kez bağlanır ve belge boyunca durum korunur', () => {
  const plugin = sozlukBagla({ fileURL: HABER_URL });
  const say = [];
  const hctx = { parent: () => undefined, replaceNode: (_n, y) => say.push(...baglantilar(y)) };
  plugin.text({ type: 'text', value: 'Enflasyon arttı.' }, hctx);
  plugin.text({ type: 'text', value: 'Enflasyon kararı bekleniyor, enflasyonlar yükselebilir.' }, hctx);
  assert.deepEqual(say, ['/sozluk/enflasyon/']);
});

test('bağlama: haber başına en fazla SINIR terim', () => {
  assert.equal(SINIR, 3);
  const d = calistir('Enflasyon, TÜFE, repo, swap ve stopaj hakkında konuşuldu.');
  assert.equal(baglantilar(d).length, SINIR);
});

test('bağlama: haber dışı belgelerde eklenti yoktur', () => {
  assert.equal(sozlukBagla({ fileURL: new URL('file:///C:/x/src/content/bulten/a.md') }), null);
  assert.equal(sozlukBagla({ fileURL: undefined }), null);
  assert.equal(haberDosyasiMi(HABER_URL), true);
});

test('bağlama: başlık, bağlantı ve kod içinde bağlanmaz', () => {
  assert.deepEqual(calistir('Enflasyon', ['h2']), [{ type: 'text', value: 'Enflasyon' }]);
  assert.deepEqual(baglantilar(calistir('Enflasyon', ['p', 'a'])), []);
  assert.deepEqual(baglantilar(calistir('Enflasyon', ['code'])), []);
});

test('bağlama: kısaltma harf duyarlıdır ve kesmeli ek alır', () => {
  assert.deepEqual(baglantilar(calistir("TÜFE'deki artış")), ['/sozluk/tufe/']);
  assert.deepEqual(baglantilar(calistir('tufe kelimesi')), []);
});

test('baglaMetni: eşleşme yoksa null', () => {
  assert.equal(baglaMetni('Bugün hava güzel.', { n: 0, kullanilan: new Set() }, kaliplar()), null);
});
