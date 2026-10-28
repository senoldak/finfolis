import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hucreKacir, satirlardanCsv, hucreMetni } from './tablo-csv.mjs';

test('hücre kaçırma', () => {
  assert.equal(hucreKacir('  %36 '), '%36');
  assert.equal(hucreKacir('a;b'), '"a;b"');
  assert.equal(hucreKacir('“x” "y"'), '"“x” ""y"""');
  assert.equal(hucreKacir(null), '');
});

test('CSV: BOM, ayraç, satır sonu', () => {
  assert.equal(satirlardanCsv([['Tarih', 'Oran'], ['23 Eki 2026', '%36']]), '﻿Tarih;Oran\r\n23 Eki 2026;%36\r\n');
});

test('hücre metni: details varsa yalnız summary', () => {
  const hucre = (ozet, metin) => ({ querySelector: () => (ozet ? { textContent: ozet } : null), textContent: metin });
  assert.equal(hucreMetni(hucre('PPK kararı', 'PPK kararı uzun gerekçe')), 'PPK kararı');
  assert.equal(hucreMetni(hucre(null, '1,5')), '1,5');
});
