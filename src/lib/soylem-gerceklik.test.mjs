import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  soylemKarsilastir,
  SOYLEM_KAYITLARI
} from './soylem-gerceklik.mjs';

test('soylemKarsilastir: resmi verilerle söylem hedeflerini eşleştirip sapmayı hesaplar', () => {
  const sahteResmi = {
    enflasyon: {
      satirlar: [
        { yil: 2023, ay: 12, yillik: 64.77 },
        { yil: 2024, ay: 12, yillik: 44.38 },
        { yil: 2025, ay: 12, yillik: 31.05 }
      ]
    },
    butce: {
      satirlar: [
        { yil: 2024, ay: 12, acikGsyhYuzde: -4.9 }
      ]
    }
  };

  const sonuclar = soylemKarsilastir(sahteResmi);
  assert.ok(sonuclar.length >= 3);

  const ovp2024 = sonuclar.find((s) => s.id === 'ovp_2024_enflasyon');
  assert.ok(ovp2024);
  assert.equal(ovp2024.soylemHedef, 33.0);
  assert.equal(ovp2024.gerceklesen, 44.38);
  assert.ok(ovp2024.sapma > 11.0);
  assert.equal(ovp2024.durum, 'ciddi_sapma');
});

test('soylemKarsilastir: hedef dahilinde kalan durumlarda basarili durumu verir', () => {
  const sahteResmi = {
    enflasyon: {
      satirlar: [
        { yil: 2024, ay: 12, yillik: 33.5 }
      ]
    }
  };

  const sonuclar = soylemKarsilastir(sahteResmi);
  const ovp2024 = sonuclar.find((s) => s.id === 'ovp_2024_enflasyon');
  assert.ok(ovp2024);
  assert.equal(ovp2024.durum, 'dogrulandi');
});
