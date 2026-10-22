import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sayilariBul, dogrula, alintilariBul } from './dogrula.mjs';

test('sayilariBul: Türkçe biçimler', () => {
  assert.deepEqual(sayilariBul('Dolar 49,17 liraya çıktı, %0,1 arttı'), [49.17, 0.1]);
  assert.deepEqual(sayilariBul('BIST 10.482 puan, 0,1 puan'), [10482, 0.1]);
  assert.deepEqual(sayilariBul('1.234.567 adet'), [1234567]);
});

test('sayilariBul: eksi işareti', () => {
  assert.deepEqual(sayilariBul('Endeks −1,2 geriledi, -3 oldu'), [-1.2, -3]);
});

test('dogrula: kaynakta olan rakam geçer', () => {
  assert.equal(dogrula('Dolar 49,17 lira', ['TRY":49.173']).tamam, true);
});

test('dogrula: uydurma rakam eksik', () => {
  const r = dogrula('Dolar 50,17 lira', ['TRY":49.173']);
  assert.equal(r.tamam, false);
  assert.ok(r.eksik.includes('50,17'));
});

test('dogrula: yıl muaf', () => {
  assert.equal(dogrula('2026 yılında ...', ['']).tamam, true);
});

test('dogrula: tarih içindeki gün muaf', () => {
  assert.equal(dogrula('12 Ekim 2026 ve 10.10.2026 günü', ['']).tamam, true);
});

test('dogrula: 10.482 puan, kaynak 10482.15 (hassasiyete yuvarlanır)', () => {
  assert.equal(dogrula('BIST 10.482 puan', ['{"c":10482.15}']).tamam, true);
});

test('dogrula: İngilizce binlik ve ondalık', () => {
  assert.equal(dogrula('Altın 1.234,5 dolar', ['price 1,234.5']).tamam, true);
  assert.equal(dogrula('Rezerv 49.173 birim', ['reserves 49,173']).tamam, true);
});

test('dogrula: yüzde ve eksi işareti', () => {
  assert.equal(dogrula('%0,1 arttı', ['change 0.1']).tamam, true);
  assert.equal(dogrula('−0,5 geriledi', ['"chg": -0.5']).tamam, true);
  assert.equal(dogrula('%7,3 arttı', ['change 0.1']).tamam, false);
});

test('alintilariBul: iki tırnak türü', () => {
  assert.deepEqual(alintilariBul('Dedi ki "bir şey" ve “başka şey”.'), ['bir şey', 'başka şey']);
});

test('dogrula: alıntı kaynakta aynen olmalı', () => {
  assert.equal(dogrula('Başkan "faiz sabit kalacak" dedi', ['Faiz  SABİT\nkalacak.']).tamam, true);
  const r = dogrula('Başkan "faiz düşecek" dedi', ['faiz sabit kalacak']);
  assert.equal(r.tamam, false);
  assert.ok(r.eksik.includes('"faiz düşecek"'));
});

test('düzeltme A: JSON listelerinde bitişik sayılar', () => {
  assert.equal(dogrula('Oran 1,5', ['[1,5]']).tamam, false);
  assert.equal(dogrula('Değer 49,2', ['[49.1,49.2]']).tamam, true);
  assert.equal(dogrula('Değer 2,5', ['{"a":1.5,"b":2.5}']).tamam, true);
});

test('düzeltme B: tolerans yuvarlama adımıyla sınırlı', () => {
  assert.equal(dogrula('Dolar 49,40 lira', ['TRY":49.173']).tamam, false);
  assert.equal(dogrula('Dolar 49,17 lira', ['TRY":49.173']).tamam, true);
  assert.equal(dogrula('10.482 puan', ['10482.15']).tamam, true);
  assert.equal(dogrula('10.530 puan', ['10482']).tamam, false);
});

test('düzeltme C: yıl muafiyeti bağlama bağlı', () => {
  assert.equal(dogrula('ons altın 2050 dolar', ['']).tamam, false);
  assert.equal(dogrula('2026 yılında', ['']).tamam, true);
  assert.equal(dogrula('Ekim 2026 verisi', ['']).tamam, true);
});

test('düzeltme D: diğer tırnak türleri', () => {
  assert.deepEqual(alintilariBul('a ‘bir’ b «iki» c „üç“'), ['bir', 'iki', 'üç']);
  assert.equal(dogrula('Dedi «faiz düşecek»', ['faiz sabit']).tamam, false);
});
