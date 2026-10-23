import test from 'node:test';
import assert from 'node:assert/strict';
import { birlestirReelGetiriVerisi, aylikFaizBul } from './reel-getiri.mjs';

test('aylikFaizBul: verilen yıl ve ayın son günündeki geçerli politika faizini aylığa böler', () => {
  const gecmis = [
    { tarih: '2024-12-27', oran: 47.5 },
    { tarih: '2025-01-24', oran: 45 },
    { tarih: '2025-03-07', oran: 42.5 },
    { tarih: '2026-01-23', oran: 37 },
  ];

  // Ocak 2025 sonu: oran 45 -> 45 / 12 = 3.75
  assert.equal(aylikFaizBul(gecmis, 2025, 1), 3.75);

  // Mart 2025 sonu: oran 42.5 -> 42.5 / 12 = 3.54
  assert.equal(aylikFaizBul(gecmis, 2025, 3), 3.54);

  // Ağustos 2026 sonu: oran 37 -> 37 / 12 = 3.08
  assert.equal(aylikFaizBul(gecmis, 2026, 8), 3.08);
});

test('birlestirReelGetiriVerisi: TÜFE, İTO ve TCMB faiz serilerini eksiksiz birleştirir', () => {
  const tufeSatirlari = [
    { yil: 2026, ay: 8, yillik: 31.51, aylik: 1.84 },
    { yil: 2026, ay: 9, yillik: 29.73, aylik: 1.84 },
  ];

  const itoSatirlari = [
    { yil: 2026, ay: 8, aylik: 1.66 },
    { yil: 2026, ay: 9, aylik: 2.11 },
  ];

  const faizGecmisi = [
    { tarih: '2026-01-23', oran: 37 },
  ];

  const sonuc = birlestirReelGetiriVerisi({
    tufeSatirlari,
    itoSatirlari,
    faizGecmisi,
    aySayisi: 2,
  });

  assert.equal(sonuc.length, 2);
  const son = sonuc.at(-1);
  assert.equal(son.yil, 2026);
  assert.equal(son.ay, 9);
  assert.equal(son.etiket, 'Eyl.26');
  assert.equal(son.tufe, 1.84);
  assert.equal(son.ito, 2.11);
  assert.equal(son.tcmbFaiz, 3.08);
  // Reel fark: TCMB faiz - TÜFE enflasyonu = 3.08 - 1.84 = +1.24
  assert.equal(son.reelFark, 1.24);
});
