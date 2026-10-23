import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mevduatAyrıştır, MEVDUAT_SERILERI } from './tcmb-mevduat.mjs';

test('MEVDUAT_SERILERI: gerekli EVDS serileri tanımlı', () => {
  assert.equal(MEVDUAT_SERILERI.toplam, 'TP.HPBITABLO4.1');
  assert.equal(MEVDUAT_SERILERI.yurtIci, 'TP.HPBITABLO4.2');
  assert.equal(MEVDUAT_SERILERI.bireysel, 'TP.HPBITABLO4.3');
  assert.equal(MEVDUAT_SERILERI.tuzel, 'TP.HPBITABLO4.8');
  assert.equal(MEVDUAT_SERILERI.bireyselAltin, 'TP.HPBITABLO4.7');
  assert.equal(MEVDUAT_SERILERI.tuzelAltin, 'TP.HPBITABLO4.12');
});

test('mevduatAyrıştır: EVDS ham yanıtını doğru nesnelere dönüştürür ve sıralar', () => {
  const hamItems = [
    {
      Tarih: '09-10-2026',
      TP_HPBITABLO4_1: '264500.5',
      TP_HPBITABLO4_2: '225000.0',
      TP_HPBITABLO4_3: '141000.2',
      TP_HPBITABLO4_8: '84000.0',
      TP_HPBITABLO4_7: '32000.1',
      TP_HPBITABLO4_12: '16000.2',
    },
    {
      Tarih: '16-10-2026',
      TP_HPBITABLO4_1: '266131.5',
      TP_HPBITABLO4_2: '227566.4',
      TP_HPBITABLO4_3: '142211.1',
      TP_HPBITABLO4_8: '85355.3',
      TP_HPBITABLO4_7: '32100.0',
      TP_HPBITABLO4_12: '16110.15',
    },
  ];

  const satirlar = mevduatAyrıştır(hamItems);
  assert.equal(satirlar.length, 2);

  const son = satirlar[1];
  assert.equal(son.tarih, '2026-10-16');
  assert.equal(son.toplam, 266131.5);
  assert.equal(son.yurtIci, 227566.4);
  assert.equal(son.bireysel, 142211.1);
  assert.equal(son.tuzel, 85355.3);
  assert.equal(son.altin, 48210.15); // 32100 + 16110.15 yuvarlanmış
});

test('mevduatAyrıştır: eksik veya geçersiz satırlar filtrelenir', () => {
  const hataliItems = [
    { Tarih: 'gecersiz', TP_HPBITABLO4_1: '100' },
    { Tarih: '02-01-2026', TP_HPBITABLO4_1: null },
    {
      Tarih: '09-01-2026',
      TP_HPBITABLO4_1: '250000.0',
      TP_HPBITABLO4_2: '220000.0',
      TP_HPBITABLO4_3: '140000.0',
      TP_HPBITABLO4_8: '80000.0',
    },
  ];

  const satirlar = mevduatAyrıştır(hataliItems);
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].tarih, '2026-01-09');
  assert.equal(satirlar[0].toplam, 250000);
});
