import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEKTOR_TANIMLARI, sectorVerisiBirlestir } from './sektor-karnesi.mjs';

test('SEKTOR_TANIMLARI: en az 25 endeks tanımlı ve kodları benzersiz', () => {
  assert.ok(SEKTOR_TANIMLARI.length >= 25);
  const kodlar = new Set(SEKTOR_TANIMLARI.map((s) => s.kod));
  assert.equal(kodlar.size, SEKTOR_TANIMLARI.length);
});

test('SEKTOR_TANIMLARI: temel BIST endeksleri tanımlı', () => {
  const kodlar = new Set(SEKTOR_TANIMLARI.map((s) => s.kod));
  assert.ok(kodlar.has('XU100'), 'XU100 olmalı');
  assert.ok(kodlar.has('XBANK'), 'XBANK olmalı');
  assert.ok(kodlar.has('XUSIN'), 'XUSIN olmalı');
  assert.ok(kodlar.has('XHARZ'), 'XHARZ olmalı');
  assert.ok(kodlar.has('XFINK'), 'XFINK olmalı');
});

test('sectorVerisiBirlestir: Yahoo meta verilerini doğru dönüştürür', () => {
  const def = { kod: 'XBANK', ad: 'BIST Banka', kategori: 'mali', aciklama: 'Banka Payları' };
  const yahooMeta = {
    regularMarketPrice: 14974.75,
    regularMarketChangePercent: 2.35,
    chartPreviousClose: 14630.50,
    regularMarketTime: 1792747200,
  };
  const sonuc = sectorVerisiBirlestir(def, yahooMeta, null);
  assert.equal(sonuc.kod, 'XBANK');
  assert.equal(sonuc.deger, 14974.75);
  assert.equal(sonuc.gunluk, 2.4);
  // Canlı veriden hesaplanmayan alanlar tutulmaz.
  for (const alan of ['haftalik', 'aylik', 'ytd', 'piyasaDegeri']) assert.equal(alan in sonuc, false, alan);
});

test('SEKTOR_TANIMLARI: elle yazılmış getiri ya da piyasa değeri yok', () => {
  for (const d of SEKTOR_TANIMLARI) for (const alan of ['haftalik', 'aylik', 'ytd', 'piyasaDegeri']) assert.equal(alan in d, false, `${d.kod}.${alan}`);
});
