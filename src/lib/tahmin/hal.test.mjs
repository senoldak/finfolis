import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bultenFiyatlari, gunEkle, halDegisimleri, tuikDegisimleri, halSinama, konformalYuzdelik, simdiAyi, ols } from './hal.mjs';
import { karne } from './modeller.mjs';

const yakin = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);
const bir = (x) => Math.round(x * 10) / 10;

test('bülten: yalnız meyve ve sebze, fiyatı olanlar', () => {
  const f = bultenFiyatlari({
    HalFiyatListesi: [
      { MalTipAdi: 'SEBZE', MalId: 175, Birim: 'kg ', OrtalamaUcret: 50 },
      { MalTipAdi: 'İTHAL', MalId: 53, Birim: 'ADET', OrtalamaUcret: 125 },
      { MalTipAdi: 'MEYVE', MalId: 199, Birim: 'KG', OrtalamaUcret: 0 },
    ],
  });
  assert.deepEqual(f, { 'sebze|175|KG': 50 });
  assert.deepEqual(bultenFiyatlari(null), {});
});

test('aylık geometrik ortalama: gün bir kez eklenir, 20. günden sonrası katılmaz', () => {
  let a = gunEkle({}, '2026-10-01', { 'sebze|1|KG': 10 });
  a = gunEkle(a, '2026-10-02', { 'sebze|1|KG': 40 });
  assert.equal(gunEkle(a, '2026-10-02', { 'sebze|1|KG': 99 }), a);
  assert.equal(gunEkle(a, '2026-10-21', { 'sebze|1|KG': 99 }), a);
  yakin(a['2026-10'].urunler['sebze|1|KG'][0], 20);
  assert.equal(a['2026-10'].urunler['sebze|1|KG'][1], 2);
  assert.deepEqual(a['2026-10'].gunler, ['2026-10-01', '2026-10-02']);
});

test('hal değişimi: ortak ürünler, ln3 kırpma, en az 5 ürün, ardışık aylar', () => {
  const urunler = (c) => Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`sebze|${i}|KG`, [10 * (i === 5 ? c * 10 : c), 1]]));
  const h = halDegisimleri({ '2026-01': { gunler: [], urunler: urunler(1) }, '2026-02': { gunler: [], urunler: urunler(2) }, '2026-04': { gunler: [], urunler: urunler(1) } });
  yakin(h['2026-02'].sebze, Math.log(2));
  assert.equal(h['2026-02'].urun.sebze, 6);
  assert.equal(h['2026-02'].meyve, undefined);
  assert.equal(h['2026-04'], undefined);
});

test('TÜİK hedefi: toplam = (meyve + 2·sebze) / 3', () => {
  const s = (ay, m, sb) => ({ yil: 2026, ay, ...Object.fromEntries(['01162', '01163', '01164', '01165'].map((k) => [k, m])), ...Object.fromEntries(['01171', '01172', '01173', '01174', '01175'].map((k) => [k, sb])) });
  const t = tuikDegisimleri([s(1, 100, 100), s(2, 110, 120)]);
  yakin(t['2026-02'].toplam, (Math.log(1.1) + 2 * Math.log(1.2)) / 3);
});

test('konformal yüzdelik ve EKK', () => {
  assert.equal(konformalYuzdelik([1, 2, 3, 4, 5], 0.9), 5);
  assert.equal(konformalYuzdelik([1, 2, 3, 4, 5], 0.1), 1);
  assert.equal(konformalYuzdelik([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.5), 5);
  const [a, b] = ols([1, 2, 3], [3, 5, 7]);
  yakin(a, 1);
  yakin(b, 2);
});

test('tahmin ayı: 20. gün kapanmadan ve TÜİK açıklandıktan sonra verilmez', () => {
  const aylar = { '2026-10': { gunler: Array(14).fill('x') } };
  const hal = { '2026-09': {}, '2026-10': {} };
  const tuik = { '2026-09': {} };
  assert.equal(simdiAyi(aylar, tuik, hal, '2026-10-15'), null);
  assert.equal(simdiAyi(aylar, tuik, hal, '2026-10-21'), '2026-10');
  assert.equal(simdiAyi(aylar, { ...tuik, '2026-10': {} }, hal, '2026-11-04'), null);
});

// Başvuru uygulamasıyla (mecmua/_fiyat-endeksi/aylik_tahmin.py) aynı sonuç: Eylül 2026, TÜİK Eylül'ü bilinmeden.
test('Eylül 2026 tahmini Python başvurusuyla aynı', () => {
  const v = JSON.parse(readFileSync(new URL('../../data/hal-fiyat.json', import.meta.url), 'utf8'));
  const tuikTum = tuikDegisimleri(v.tuik);
  const tuik = Object.fromEntries(Object.entries(tuikTum).filter(([a]) => a < '2026-09'));
  const hal = halDegisimleri(v.aylar);
  const t = halSinama('toplam', tuik, hal, '2026-09').simdi;
  assert.deepEqual([bir(t.tahmin), ...t.a80.map(bir), ...t.a95.map(bir), t.egitimAy], [-3.7, -8.7, 7.3, -18.4, 10.1, 91]);
  const s = halSinama('sebze', tuik, hal, '2026-09').simdi;
  assert.deepEqual([bir(s.tahmin), ...s.a80.map(bir), ...s.a95.map(bir)], [-6.1, -13.3, 6.2, -18.2, 9.0]);
  const k = karne(halSinama('toplam', tuikTum, hal).sonuclar, ['mevsim', 'oncekiAy']);
  assert.equal(k.tum.n, 69);
  assert.ok(k.tum.model < k.tum.bazlar.mevsim);
});
