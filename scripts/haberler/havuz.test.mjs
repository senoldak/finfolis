import { test } from 'node:test';
import assert from 'node:assert/strict';
import { havuzaHazirla, KAYNAK_AZAMI } from './havuz.mjs';
import { derlemeAdayi } from './derleme.mjs';

const metin = (harf, n) => harf.repeat(n);
const olay = () => {
  const adaylar = ['a', 'b', 'c', 'd'].map((h, i) => ({ id: `x${i}`, baslik: h, kaynakMetni: metin(h, 2000) }));
  return { id: 'o1', baslik: 'Olay', kategori: 'ekonomi', adaylar, kaynakMetni: adaylar.map((a) => a.kaynakMetni).join('\n\n---\n\n') };
};

test('havuzaHazirla: adayların metni toplamda KAYNAK_AZAMI, olayın birleşik metni de kırpılır', () => {
  const h = havuzaHazirla(olay(), '2026-10-19T08:00:00.000Z');
  const toplam = h.adaylar.reduce((t, a) => t + a.kaynakMetni.length, 0);
  assert.equal(toplam, KAYNAK_AZAMI);
  assert.deepEqual(h.adaylar.map((a) => a.kaynakMetni.length), [2000, 1500, 0, 0]);
  assert.equal(h.kaynakMetni.length, KAYNAK_AZAMI);
  assert.equal(h.adaylar.length, 4, 'adaylar (kaynak adresleri için) düşmez');
  assert.equal(h.havuzaGirdi, '2026-10-19T08:00:00.000Z');
});

test('havuzaHazirla: derlemenin gördüğü kaynak metni kırpmadan önceki ile aynı', () => {
  const o = olay();
  const once = derlemeAdayi([{ ...o, havuzaGirdi: '2026-10-19T08:00:00.000Z' }]).kaynakMetni;
  const sonra = derlemeAdayi([havuzaHazirla(o, '2026-10-19T08:00:00.000Z')]).kaynakMetni;
  assert.equal(sonra, once);
});

test('havuzaHazirla: kaynakMetni olmayan olaya alan eklenmez', () => {
  const { kaynakMetni, ...o } = olay();
  assert.equal('kaynakMetni' in havuzaHazirla(o, '2026-10-19T08:00:00.000Z'), false);
});
