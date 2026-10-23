import test from 'node:test';
import assert from 'node:assert/strict';
import { fredCsvAyristir, abdTahvilAnalizi } from './abd-tahvilleri.mjs';

test('fredCsvAyristir: csv satırlarını ve eksik değerleri doğru ayıklar', () => {
  const csv = `observation_date,FORLTTREASPOS12807
2024-01-01,1000
2024-02-01,.
2024-03-01,1200
`;
  const sonuc = fredCsvAyristir(csv);
  assert.equal(sonuc.size, 2);
  assert.equal(sonuc.get('2024-01-01'), 1000);
  assert.equal(sonuc.has('2024-02-01'), false);
  assert.equal(sonuc.get('2024-03-01'), 1200);
});

test('abdTahvilAnalizi: kısa ve uzun vadeli serileri birleştirir, oranları ve değişimi hesaplar', () => {
  const uzunCsv = `DATE,FORLTTREASPOS12807
2026-07-01,1611
2026-08-01,1622
`;
  const kisaCsv = `DATE,FORSTTREASPOS12807
2026-07-01,2848
2026-08-01,4109
`;

  const analiz = abdTahvilAnalizi(uzunCsv, kisaCsv);
  assert.equal(analiz.noktalar.length, 2);
  assert.equal(analiz.sonNokta.tarih, '2026-08-01');
  assert.equal(analiz.sonNokta.uzunUSD, 1622);
  assert.equal(analiz.sonNokta.kisaUSD, 4109);
  assert.equal(analiz.sonNokta.toplamUSD, 5731);
  assert.equal(analiz.sonNokta.kisaOran, 71.7);
  assert.equal(analiz.sonNokta.uzunOran, 28.3);

  // Aylık değişim: 5731 - 4459 = +1272 USD (+%28.5)
  assert.equal(analiz.aylikDegisimUSD, 1272);
  assert.equal(analiz.aylikDegisimYuzde, 28.5);
  assert.equal(analiz.tarihselZirve.toplamUSD, 5731);
  assert.equal(analiz.tarihselDip.toplamUSD, 4459);
});
