import test from 'node:test';
import assert from 'node:assert/strict';
import { tufeEndeksHaritasi, gunlukTufeBul, bistTufeAnalizi } from './bist-tufe.mjs';

test('tufeEndeksHaritasi: boş veya tekil satırlar güvenle işlenir', () => {
  assert.deepEqual(tufeEndeksHaritasi([]), {});

  const satirlar = [
    { yil: 2024, ay: 1, aylik: 6.7 },
    { yil: 2024, ay: 2, aylik: 4.53 },
  ];
  const map = tufeEndeksHaritasi(satirlar, 1984.02);
  assert.equal(map['2024-01'], 1984.02);
  assert.ok(map['2024-02'] > 1984.02);
});

test('gunlukTufeBul: ay eşleştiğinde değeri, eşleşmediğinde varsayılanı verir', () => {
  const map = { '2026-05': 4000 };
  assert.equal(gunlukTufeBul('2026-05-15', map, 3500), 4000);
  assert.equal(gunlukTufeBul('2026-06-01', map, 3500), 3500);
});

test('bistTufeAnalizi: ortalama 107.5 ve standart sapma bantları doğru hesaplanır', () => {
  const tufeSatirlari = [
    { yil: 2024, ay: 1, aylik: 5.0 },
    { yil: 2024, ay: 2, aylik: 3.0 },
  ];

  // 40 günlük yapay kapanış serisi
  const kapanislar = Array.from({ length: 40 }, (_, i) => ({
    tarih: `2024-01-${String(i + 1).padStart(2, '0')}`,
    deger: 8000 + i * 50,
  }));

  const analiz = bistTufeAnalizi(kapanislar, tufeSatirlari, { gunSayisi: 40 });

  assert.equal(analiz.ortalama, 107.5);
  assert.ok(analiz.stdSapma > 0);
  assert.equal(analiz.arti2Std, Math.round((107.5 + 2 * analiz.stdSapma) * 100) / 100);
  assert.equal(analiz.eksi2Std, Math.round((107.5 - 2 * analiz.stdSapma) * 100) / 100);
  assert.equal(analiz.eksi3Std, Math.round((107.5 - 3 * analiz.stdSapma) * 100) / 100);
  assert.ok(analiz.zSkoru !== undefined);
  assert.ok(analiz.durum.length > 0);
});
