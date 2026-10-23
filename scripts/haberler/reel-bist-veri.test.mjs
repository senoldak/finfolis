import test from 'node:test';
import assert from 'node:assert/strict';
import { yahooAylikKapanislar, reelSeriHesapla } from './reel-bist-veri.mjs';

test('yahooAylikKapanislar: timestamp ve close dizilerini YYYY-MM anahtarlarına dönüştürür', () => {
  const veri = {
    chart: {
      result: [
        {
          timestamp: [1412121600, 1414800000], // 2014-10-01, 2014-11-01 civarı
          indicators: {
            quote: [{ close: [950.5, 1020.2] }],
          },
        },
      ],
    },
  };

  const res = yahooAylikKapanislar(veri);
  assert.equal(typeof res['2014-10'], 'number');
  assert.equal(res['2014-10'], 950.5);
  assert.equal(res['2014-11'], 1020.2);
});

test('yahooAylikKapanislar: boş veya sıfır kapanışları eler', () => {
  const veri = {
    chart: {
      result: [
        {
          timestamp: [1412121600, 1414800000],
          indicators: {
            quote: [{ close: [null, 1000] }],
          },
        },
      ],
    },
  };
  const res = yahooAylikKapanislar(veri);
  assert.equal(res['2014-10'], undefined);
  assert.equal(res['2014-11'], 1000);
});

test('reelSeriHesapla: baz ayda reel endeks 100 olur ve enflasyonla doğru defle edilir', () => {
  const tufeSatirlari = [
    { yil: 2014, ay: 9, yillik: 8.86, aylik: 0.14 },
    { yil: 2014, ay: 10, yillik: 8.96, aylik: 1.9 },
    { yil: 2014, ay: 11, yillik: 9.15, aylik: 0.18 },
    { yil: 2014, ay: 12, yillik: 8.17, aylik: -0.44 },
    { yil: 2015, ay: 1, yillik: 7.24, aylik: 1.1 },
    { yil: 2015, ay: 2, yillik: 7.55, aylik: 0.71 },
    { yil: 2015, ay: 3, yillik: 7.61, aylik: 1.19 },
    { yil: 2015, ay: 4, yillik: 7.91, aylik: 1.63 },
    { yil: 2015, ay: 5, yillik: 8.09, aylik: 0.56 },
    { yil: 2015, ay: 6, yillik: 7.2, aylik: -0.51 },
    { yil: 2015, ay: 7, yillik: 6.81, aylik: 0.09 },
    { yil: 2015, ay: 8, yillik: 7.14, aylik: 0.52 },
    { yil: 2015, ay: 9, yillik: 7.95, aylik: 0.89 },
  ];

  const bistKapanislar = {
    '2014-09': 1000,
    '2014-10': 1019, // %1.9 nominal arttı, enflasyon da %1.9 -> reel endeks 100 olmalı
    '2014-11': 1050,
    '2014-12': 1080,
    '2015-01': 1100,
    '2015-02': 1120,
    '2015-03': 1150,
    '2015-04': 1170,
    '2015-05': 1200,
    '2015-06': 1220,
    '2015-07': 1250,
    '2015-08': 1270,
    '2015-09': 1079.5, // 1 yıl sonra
  };

  const { istatistik, noktalar } = reelSeriHesapla(tufeSatirlari, bistKapanislar, '2014-09');

  // Baz ay
  assert.equal(noktalar[0].tarih, '2014-09');
  assert.equal(noktalar[0].reelEndeks, 100);

  // Ekim 2014: borsa %1.9 arttı, enflasyon da %1.9 arttı -> reel değer değişmemeli (100)
  assert.equal(noktalar[1].tarih, '2014-10');
  assert.equal(noktalar[1].reelEndeks, 100);

  // İstatistikler doğru hesaplanmalı
  assert.equal(istatistik.bazTarih, '2014-09');
  assert.equal(istatistik.bazBist, 1000);
  assert.ok(istatistik.zirve);
  assert.ok(istatistik.dip);
  assert.ok(typeof istatistik.reelDegisim1Yil === 'number');
});
