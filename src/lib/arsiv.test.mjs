import test from 'node:test';
import assert from 'node:assert/strict';
import { ayTakvimi, gunBasligi, gunlereAyir } from './arsiv.mjs';

const h = (id, iso, tur = 'haber') => ({ id, data: { date: new Date(iso), tur } });

test('gunlereAyir: İstanbul gününe göre, yeni gün önce; haberler saat sırasıyla; günün son bülteni özet olur', () => {
  const g = gunlereAyir([
    h('a', '2026-10-16T08:00:00Z'),
    h('b', '2026-10-16T06:00:00Z'),
    h('s', '2026-10-16T09:00:00Z', 'bulten'),
    h('t', '2026-10-16T18:00:00Z', 'bulten'),
    h('c', '2026-10-15T22:30:00Z'), // İstanbul'da 16 Ekim 01:30
    h('d', '2026-10-14T10:00:00Z'),
  ]);
  assert.deepEqual(g.map((x) => x.gun), ['2026-10-16', '2026-10-14']);
  assert.deepEqual(g[0].haberler.map((x) => x.id), ['c', 'b', 'a']);
  assert.equal(g[0].bulten.id, 't');
  assert.equal(g[1].bulten, undefined);
});

test('ayTakvimi: pazartesiyle başlar, boşluklar null, haber sayıları işlenir', () => {
  // 1 Ekim 2026 perşembe → 3 boş hücre
  const haftalar = ayTakvimi('2026-10', new Map([['2026-10-16', 5]]));
  assert.deepEqual(haftalar[0].slice(0, 4), [null, null, null, { gun: '2026-10-01', no: 1, sayi: 0 }]);
  assert.ok(haftalar.every((hf) => hf.length === 7));
  const on6 = haftalar.flat().find((x) => x?.no === 16);
  assert.equal(on6.sayi, 5);
});

test('gunBasligi', () => {
  assert.equal(gunBasligi('2026-10-06'), '6 Ekim 2026');
});

test('bultenMaddeleri: kalın başlık ve cümle, Ayrıntı bağlantısı atılır, en fazla azami', async () => {
  const { bultenMaddeleri } = await import('./arsiv.mjs');
  const govde = `## ABD\n\n- **Faiz Beklentileri:** Beklentiler hafifliyor.\n- **Petrol:** Brent yükseldi. ([Ayrıntı](https://finfolis.com/haber/x/))\n\n## Asya\n\n- **Bilançolar:** Dikkat [şirketlere](https://x.example.com) döndü.\n- **Dördüncü:** d\n- **Beşinci:** e`;
  assert.deepEqual(bultenMaddeleri(govde), [
    { baslik: 'Faiz Beklentileri', metin: 'Beklentiler hafifliyor.' },
    { baslik: 'Petrol', metin: 'Brent yükseldi.' },
    { baslik: 'Bilançolar', metin: 'Dikkat şirketlere döndü.' },
    { baslik: 'Dördüncü', metin: 'd' },
  ]);
  assert.deepEqual(bultenMaddeleri(''), []);
});
