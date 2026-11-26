import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAHMINLER, belgeler, tahminKarsilastir } from './soylem-gerceklik.mjs';

const resmi = {
  enflasyon: {
    satirlar: [
      { yil: 2023, ay: 12, yillik: 64.77 },
      { yil: 2024, ay: 12, yillik: 44.38 },
      { yil: 2025, ay: 11, yillik: 31.07 },
      { yil: 2025, ay: 12, yillik: 30.89 },
      { yil: 2026, ay: 10, yillik: 29.77 },
    ],
  },
};

test('tahminKarsilastir: yıl yıl gruplar, yeni yıl önce', () => {
  const s = tahminKarsilastir(resmi);
  assert.deepEqual(s.map((y) => y.yil), [2026, 2025, 2024, 2023]);
  assert.equal(s.find((y) => y.yil === 2024).tahminler.length, 3);
});

test('tahminKarsilastir: fark = gerçekleşen − tahmin, yalnız Aralık verisiyle', () => {
  const s = tahminKarsilastir(resmi);
  const y2024 = s.find((y) => y.yil === 2024);
  assert.equal(y2024.gerceklesen, 44.38);
  assert.equal(y2024.tahminler.find((t) => t.deger === 33).fark, 11.38);
  assert.equal(y2024.tahminler.find((t) => t.deger === 41.5).fark, 2.88);
  assert.equal(s.find((y) => y.yil === 2023).tahminler[0].fark, -0.23);
  // Aralık açıklanmadıysa (2026 Ekim var) gerçekleşen ve fark boş kalır.
  const y2026 = s.find((y) => y.yil === 2026);
  assert.equal(y2026.gerceklesen, null);
  assert.equal(y2026.tahminler[0].fark, null);
});

test('belgeler: her belge bir kez, hepsinin bağlantısı var', () => {
  const b = belgeler();
  assert.equal(b.length, 4);
  assert.ok(b.every((x) => x.url.startsWith('https://')));
  assert.ok(TAHMINLER.every((t) => typeof t.deger === 'number' && t.url));
});
