import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aciklamaYaz, sec } from './telegram.mjs';

test('Telegram metni: abaküs, başlık, özet, site linki', () => {
  const m = aciklamaYaz({ baslik: 'Fed faizi sabit tuttu', spot: 'Kısa özet.', slug: 'fed-faizi' });
  assert.equal(m, '🧮 Fed faizi sabit tuttu\n\nKısa özet.\n\n🔗 https://finfolis.com/haber/fed-faizi/');
});

test('Telegram metni 1024 karakteri aşmaz, link korunur', () => {
  const m = aciklamaYaz({ baslik: 'B', spot: 'x'.repeat(3000), slug: 's' });
  assert.ok(m.length <= 1024);
  assert.ok(m.endsWith('🔗 https://finfolis.com/haber/s/'));
});

test('yalnızca gönderilmemiş en yeni yazılar, eskiden yeniye', () => {
  const y = ['d', 'c', 'b', 'a'].map((slug) => ({ slug }));
  assert.deepEqual(sec(y, { d: 'x' }, 2).map((v) => v.slug), ['b', 'c']);
});

test('bülten açıklaması öne çıkan 3 madde içerir', () => {
  const maddeler = ['Bir', 'İki', 'Üç', 'Dört'].map((m) => m + ' ' + 'x'.repeat(400));
  const m = aciklamaYaz({ tur: 'bulten', baslik: 'Bülten', maddeler, slug: 'b1' });
  assert.equal(m.split('\n').filter((s) => s.startsWith('• ')).length, 3);
  assert.ok(!m.includes('Dört'));
  assert.ok(m.length <= 1024);
  assert.ok(m.endsWith('🔗 https://finfolis.com/haber/b1/'));
});

test('bülten maddeleri: markdown bağlantısı düz metne çevrilir', async () => {
  const { bultenMaddeleri } = await import('./telegram.mjs');
  const govde = '## ABD\n- [Fed](https://x.com/a) faizi sabit tuttu\n- İkinci\n## Avrupa\n- Üçüncü\n- Dördüncü\n## Göstergeler\n- USD 1';
  assert.deepEqual(bultenMaddeleri(govde), ['Fed faizi sabit tuttu', 'İkinci', 'Üçüncü']);
});

test('sec sınırı 12', () => {
  const y = Array.from({ length: 15 }, (_, i) => ({ slug: `s${i}` }));
  assert.equal(sec(y, {}).length, 12);
});

test('bülten maddelerinde Markdown kalın işaretleri Telegram metnine geçmez', async () => {
  const { bultenMaddeleri } = await import('./telegram.mjs');
  const govde = '## ABD\n\n- **Borç ödemeleri:** Oran yüzde 20 oldu. ([Ayrıntı](https://finfolis.com/haber/x/))\n- __Diğer__ madde';
  assert.deepEqual(bultenMaddeleri(govde), ['Borç ödemeleri: Oran yüzde 20 oldu.', 'Diğer madde']);
});
