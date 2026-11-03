import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ozetKartlari } from './ozet.mjs';

const veri = {
  sutunlar: [
    { anahtar: 'islem', baslik: 'İşlem', tur: 'metin' },
    { anahtar: 'tutar', baslik: 'Tutar (USD)', tur: 'sayi' },
    { anahtar: 'puan', baslik: 'Puan', tur: 'sayi' },
  ],
  satirlar: [
    { islem: 'Alım', tutar: 100, puan: 55 },
    { islem: 'Alım', tutar: 300, puan: 85 },
    { islem: 'Satış', tutar: 50, puan: 25 },
    { islem: 'Alım', tutar: 10, puan: 60 },
  ],
};

test('satır, işlem sayımı, tutar toplamı ve yüksek puan sayısı', () => {
  const { kartlar } = ozetKartlari(veri);
  assert.deepEqual(kartlar.map((k) => [k.etiket, k.deger]), [
    ['Satır', 4],
    ['Alım', 3],
    ['Satış', 1],
    ['Puanı 60 ve üstü', 2],
  ]);
  assert.equal(kartlar[1].alt.tutar, 410);
  assert.equal(kartlar[2].alt.tutar, 50);
});

test('puan bantları satırların tamamını sayar', () => {
  const { puanBantlari } = ozetKartlari(veri);
  assert.deepEqual(puanBantlari.map((b) => b.deger), [1, 1, 1, 1]);
  assert.equal(puanBantlari[2].vurgu, true);
});

test('puan sütunu yoksa bant ve puan kartı üretilmez', () => {
  const { kartlar, puanBantlari } = ozetKartlari({ sutunlar: [], satirlar: [] });
  assert.equal(puanBantlari, null);
  assert.deepEqual(kartlar, [{ etiket: 'Satır', deger: 0 }]);
});
