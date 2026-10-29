import test from 'node:test';
import assert from 'node:assert/strict';
import { revizyonlariBul, birlestir, anlamliFark, donemMetni, degerMetni, farkMetni, sayiMetni, TOPLU_ESIK } from './revizyon.mjs';

const kaynak = { ad: 'TÜİK verisi, TCMB', url: 'https://evds3.tcmb.gov.tr/' };
const resmi = (satirlar, bolum = 'enflasyon') => ({ [bolum]: { kaynak, satirlar, alinma: '2026-10-15T00:00:00Z' } });
const TESPIT = '2026-10-29T08:00:00.000Z';

test('aynı dönemin değişen yıllık TÜFE değeri revizyondur', () => {
  const eski = resmi([{ yil: 2026, ay: 8, yillik: 31.51, aylik: 1.84 }]);
  const yeni = resmi([{ yil: 2026, ay: 8, yillik: 31.6, aylik: 1.84 }]);
  const { revizyonlar } = revizyonlariBul(eski, yeni, { tespit: TESPIT });
  assert.deepEqual(revizyonlar, [{ bolum: 'enflasyon', alan: 'yillik', donem: '2026-08', eski: 31.51, yeni: 31.6, fark: 0.09, tespit: TESPIT, kaynak }]);
});

test('yeni eklenen dönem revizyon sayılmaz', () => {
  const eski = resmi([{ yil: 2026, ay: 8, yillik: 31.51, aylik: 1.84 }]);
  const yeni = resmi([
    { yil: 2026, ay: 8, yillik: 31.51, aylik: 1.84 },
    { yil: 2026, ay: 9, yillik: 29.73, aylik: 1.84 },
  ]);
  assert.equal(revizyonlariBul(eski, yeni).revizyonlar.length, 0);
});

test('kayan nokta ve yuvarlama farkı revizyon sayılmaz', () => {
  const eski = resmi([{ yil: 2026, ay: 9, yillik: 29.73, aylik: 1.84 }]);
  const yeni = resmi([{ yil: 2026, ay: 9, yillik: 29.7300001, aylik: 1.8449 }]);
  assert.equal(revizyonlariBul(eski, yeni).revizyonlar.length, 0);
});

test('yüzdede 0,01 puan sınırı dahil, altı değil', () => {
  assert.equal(anlamliFark('yuzde', 29.73, 29.74), true);
  assert.equal(anlamliFark('yuzde', 29.73, 29.735), false);
});

test('düzeyde göreli %0,05 eşiği', () => {
  assert.equal(anlamliFark('duzey', 4053, 4054), false); // %0,025
  assert.equal(anlamliFark('duzey', 4053, 4060), true); // %0,17
  assert.equal(anlamliFark('duzey', 0, 0.01), true);
});

test('izlenmeyen alan ve bir tarafta eksik alan yok sayılır', () => {
  const eski = resmi([{ yil: 2026, ay: 8, yillik: 31.51, baskaAlan: 1 }]);
  const yeni = resmi([{ yil: 2026, ay: 8, baskaAlan: 99 }]);
  assert.equal(revizyonlariBul(eski, yeni).revizyonlar.length, 0);
});

test('tarihli seri ve noktalı yol (bölgeler.TR.yillik)', () => {
  const kon = (y) => resmi([{ yil: 2026, ay: 9, bolgeler: { TR: { endeks: 239.38, yillik: y } } }], 'konut');
  const { revizyonlar } = revizyonlariBul(kon(22.34488398), kon(22.9), { tespit: TESPIT });
  assert.equal(revizyonlar.length, 1);
  assert.equal(revizyonlar[0].alan, 'bolgeler.TR.yillik');
  assert.equal(revizyonlar[0].donem, '2026-09');
});

test('bölüm yoksa ya da satırsızsa hata vermez', () => {
  assert.deepEqual(revizyonlariBul({}, {}), { revizyonlar: [], toplu: [] });
  assert.deepEqual(revizyonlariBul({ kur: {} }, { kur: {}, enflasyon: { satirlar: [] } }), { revizyonlar: [], toplu: [] });
});

test('bir alanda çok sayıda dönem değişirse toplu sayılır, kayda girmez', () => {
  const satirlar = (kaydir) => Array.from({ length: TOPLU_ESIK + 1 }, (_, i) => ({ yil: 2020 + Math.floor(i / 12), ay: (i % 12) + 1, yillik: 10 + i + kaydir, aylik: 1 }));
  const { revizyonlar, toplu } = revizyonlariBul(resmi(satirlar(0)), resmi(satirlar(0.5)));
  assert.equal(revizyonlar.length, 0);
  assert.deepEqual(toplu, [{ bolum: 'enflasyon', alan: 'yillik', adet: TOPLU_ESIK + 1 }]);
});

test('birleştir: aynı revizyon iki kez yazılmaz, yeni üstte, en çok enCok kayıt', () => {
  const r = (donem, yeni) => ({ bolum: 'enflasyon', alan: 'yillik', donem, eski: 30, yeni, fark: yeni - 30, tespit: TESPIT, kaynak });
  const ilk = birlestir([], [r('2026-07', 31), r('2026-08', 32)]);
  assert.equal(ilk.liste.length, 2);
  const ikinci = birlestir(ilk.liste, [r('2026-07', 31), r('2026-09', 33)]);
  assert.deepEqual(ikinci.eklenen.map((x) => x.donem), ['2026-09']);
  assert.equal(ikinci.liste[0].donem, '2026-09');
  assert.equal(birlestir(ikinci.liste, [r('2026-10', 34)], 3).liste.length, 3);
  // Aynı dönem başka değere revize edilirse yeni kayıt olur.
  assert.equal(birlestir(ikinci.liste, [r('2026-07', 31.5)]).eklenen.length, 1);
});

test('gösterim: dönem, değer, fark', () => {
  assert.equal(donemMetni('2026-08'), 'Ağustos 2026');
  assert.equal(donemMetni('2026-10-16'), '16 Ekim 2026');
  assert.equal(degerMetni('enflasyon', 'yillik', 31.51), '%31,51');
  assert.equal(degerMetni('cari', 'cari', 4053), '4.053 milyon USD');
  assert.equal(farkMetni('enflasyon', 'yillik', 0.09), '+0,09 puan');
  assert.equal(farkMetni('cari', 'cari', -300), '−300 milyon USD');
  assert.equal(sayiMetni(25966598.771, 'duzey'), '25.966.599');
});
