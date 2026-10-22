import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tabloAyikla, yaz } from './yazar.mjs';
import { seridiSuz, tabloKaynaktaMi } from './yayin-kurulu.mjs';

const KAYNAK = 'Enflasyon yüzde 3,7 oldu. Önceki ay yüzde 3,3 idi. Dolar 49,2 liraya çıktı.';
const iyiTablo = { baslik: 'Enflasyon', sutunlar: ['Ay', 'Yıllık'], satirlar: [['Eylül', 'yüzde 3,7'], ['Ağustos', 'yüzde 3,3']] };

test('tabloAyikla: geçerli tablo korunur, bozuk satır sayısı tablo düşürür', () => {
  assert.deepEqual(tabloAyikla(iyiTablo), iyiTablo);
  assert.equal(tabloAyikla({ ...iyiTablo, satirlar: [['Eylül']] }), null); // sütun sayısı tutmuyor
  assert.equal(tabloAyikla({ ...iyiTablo, sutunlar: ['Tek'] }), null); // en az iki sütun
  assert.equal(tabloAyikla(undefined), null);
});

test('yaz: model tablo üretirse taslağa girer', async () => {
  const taslak = await yaz(
    { baslik: 'x', kaynakMetni: KAYNAK },
    { gemini: async () => ({ baslik: 'Enflasyon artı', spot: 'Spot.', govde: 'Gövde.', tablo: iyiTablo }) },
  );
  assert.deepEqual(taslak.tablo, iyiTablo);
});

test('tabloKaynaktaMi: kaynakta olmayan bir sayı tüm tabloyu düşürür', () => {
  assert.equal(tabloKaynaktaMi(iyiTablo, KAYNAK), true);
  const kismi = { ...iyiTablo, satirlar: [['Eylül', 'yüzde 3,7'], ['Kasım', 'yüzde 9,9']] };
  assert.equal(tabloKaynaktaMi(kismi, KAYNAK), false);
});

test('seridiSuz: doğrulanmayan tablo çıkarılır, doğrulananı kalır', () => {
  const aday = { kaynakMetni: KAYNAK };
  assert.equal(seridiSuz({ baslik: 'b', spot: 's', govde: 'g', tablo: iyiTablo }, aday).tablo, iyiTablo);
  const kotu = { ...iyiTablo, satirlar: [['Eylül', 'yüzde 8,1']] };
  assert.equal('tablo' in seridiSuz({ baslik: 'b', spot: 's', govde: 'g', tablo: kotu }, aday), false);
});

import { birimSec, sayiCoz, grafikAyikla } from './yazar.mjs';
import { grafikKaynaktaMi } from './yayin-kurulu.mjs';

const grafik = {
  baslik: 'Enflasyon ülkelere göre',
  simge: 'sepet',
  birimEtiket: 'yüzde',
  satirlar: [
    { etiket: 'Eylül', deger: 'yüzde 3,7' },
    { etiket: 'Ağustos', deger: 'yüzde 3,3' },
  ],
};

test('birimSec: en büyük değer en fazla 20 simgeye sığar', () => {
  assert.equal(birimSec(3.7), 0.2);
  assert.equal(birimSec(49.4), 2.5);
  assert.equal(birimSec(1250), 100);
  assert.ok(3.7 / birimSec(3.7) <= 20);
});

test('sayiCoz: Türkçe sayı biçimleri', () => {
  assert.equal(sayiCoz('yüzde 3,7'), 3.7);
  assert.equal(sayiCoz('1.250 dolar'), 1250);
  assert.equal(sayiCoz('kaynak yok'), null);
});

test('grafikAyikla: geçerli grafik birimle birlikte döner, negatif değer reddedilir', () => {
  const g = grafikAyikla(grafik);
  assert.equal(g.birim, 0.2);
  assert.equal(g.satirlar[0].deger, 3.7);
  assert.equal(grafikAyikla({ ...grafik, satirlar: [{ etiket: 'A', deger: 'yüzde -2' }, { etiket: 'B', deger: 'yüzde 1' }] }), null);
  assert.equal(grafikAyikla({ ...grafik, satirlar: [{ etiket: 'A', deger: 'yüzde 1' }] }), null); // en az iki satır
  assert.equal(grafikAyikla({ ...grafik, simge: 'bilinmeyen' }), null);
});

test('grafikKaynaktaMi ve seridiSuz: kaynaksız grafik düşer', () => {
  const aday = { kaynakMetni: KAYNAK };
  const iyi = grafikAyikla(grafik);
  assert.equal(grafikKaynaktaMi(iyi, KAYNAK), true);
  assert.equal(seridiSuz({ baslik: 'b', spot: 's', govde: 'g', grafik: iyi }, aday).grafik, iyi);
  const kotu = grafikAyikla({ ...grafik, satirlar: [{ etiket: 'A', deger: 'yüzde 9,9' }, { etiket: 'B', deger: 'yüzde 3,3' }] });
  assert.equal('grafik' in seridiSuz({ baslik: 'b', spot: 's', govde: 'g', grafik: kotu }, aday), false);
});
