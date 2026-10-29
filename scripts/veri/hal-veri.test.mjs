import test from 'node:test';
import assert from 'node:assert/strict';
import { istenecekGunler, halGuncelle, halJson } from './hal-veri.mjs';

test('istenen günler: geçen ay ve bu ayın ilk 20 günündeki hafta içi günler, bugüne kadar', () => {
  const g = istenecekGunler('2026-11-04');
  assert.equal(g[0], '2026-10-01');
  assert.ok(g.includes('2026-10-20') && !g.includes('2026-10-21'));
  assert.ok(!g.includes('2026-10-03')); // cumartesi
  assert.equal(g.at(-1), '2026-11-04');
  assert.equal(istenecekGunler('2026-01-02')[0], '2025-12-01');
});

test('güncelleme: var olan gün istenmez, geçmiş boş gün kaydedilir, bugünün boş yanıtı kaydedilmez', async () => {
  const istenen = [];
  const al = async (t) => {
    istenen.push(t);
    if (t === '2026-11-02' || t === '2026-11-04') return null;
    return { HalFiyatListesi: [{ MalTipAdi: 'SEBZE', MalId: 1, Birim: 'KG', OrtalamaUcret: 10 }] };
  };
  const veri = { aylar: { '2026-10': { gunler: istenecekGunler('2026-10-31'), urunler: {} } }, bos: [] };
  const r = await halGuncelle(veri, new Date('2026-11-04T09:00:00Z'), al, 0);
  assert.deepEqual(istenen, ['2026-11-02', '2026-11-03', '2026-11-04']);
  assert.deepEqual(r.bos, ['2026-11-02']);
  assert.deepEqual(r.aylar['2026-11'].gunler, ['2026-11-03']);
});

test('dosya biçimi geri okunur', () => {
  const v = { kaynak: { hal: { ad: 'x' } }, gunSiniri: 20, bos: [], aylar: { '2026-10': { gunler: ['2026-10-01'], urunler: { 'sebze|1|KG': [10, 1] } } }, tuik: [{ yil: 2026, ay: 9, '01162': 75.39 }] };
  assert.deepEqual(JSON.parse(halJson(v)), v);
});
