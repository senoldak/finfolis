import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kaynakParcalari } from './kaynak-bagla.mjs';

const birlestir = (p) => p.map((x) => x.metin).join('');
const baglar = (p) => p.filter((x) => x.url).map((x) => [x.metin, x.url]);

test('metin değişmez, kurum adları bağlanır', () => {
  const m = 'Kaynak: TÜİK, dönemsel gayrisafi yurt içi hasıla (TCMB EVDS).';
  const p = kaynakParcalari(m);
  assert.equal(birlestir(p), m);
  assert.deepEqual(baglar(p), [
    ['TÜİK', 'https://data.tuik.gov.tr/'],
    ['TCMB EVDS', 'https://evds3.tcmb.gov.tr/'],
  ]);
});

test('aynı adres bir kez; TCMB ile EVDS ayrı', () => {
  const p = kaynakParcalari('Kaynak: TCMB (TCMB EVDS), TÜİK; TCMB hesabı, EVDS.');
  assert.deepEqual(baglar(p).map((x) => x[0]), ['TCMB', 'TCMB EVDS', 'TÜİK']);
});

test('sözcük içinde eşleşmez', () => {
  assert.deepEqual(baglar(kaynakParcalari('Federasyon ve SECTOR verisi, KAPANIŞ')), []);
  assert.deepEqual(baglar(kaynakParcalari('Kaynak: Federal Reserve (SEP), Fed')).length, 1);
});

test('bilinmeyen ad ve boş metin', () => {
  assert.deepEqual(kaynakParcalari('Kaynak: haber.example.com'), [{ metin: 'Kaynak: haber.example.com' }]);
  assert.deepEqual(kaynakParcalari(''), []);
  assert.deepEqual(kaynakParcalari(undefined), []);
});
