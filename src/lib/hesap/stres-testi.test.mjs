import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makroStresTestiHesapla,
  VARSAYILAN_PARAMETRELER
} from './stres-testi.mjs';

test('makroStresTestiHesapla: sıfır şok durumunda baz senaryoyu korur', () => {
  const res = makroStresTestiHesapla({
    bazTufe: 35.0,
    bazCariAcikMilyarUsd: -25.0,
    bazPolitikaFaizi: 45.0,
    brentSokuUsd: 0,
    asgariUcretArtisiYuzde: 25, // Baz seviye
    kurArtisiYuzde: 0,
    faizDegisimiPuan: 0
  });

  assert.equal(res.simuleTufe, 35.0);
  assert.equal(res.tufeSapmasiPuan, 0);
  assert.equal(res.simuleCariAcik, -25.0);
  assert.equal(res.cariSapmaMilyarUsd, 0);
  assert.ok(res.taylorBand.alt > 0);
  assert.ok(res.taylorBand.ust > res.taylorBand.alt);
});

test('makroStresTestiHesapla: +20$ petrol şoku enflasyonu ve cari açığı artırır', () => {
  const res = makroStresTestiHesapla({
    bazTufe: 35.0,
    bazCariAcikMilyarUsd: -25.0,
    bazPolitikaFaizi: 45.0,
    brentSokuUsd: 20, // +20$ artış
    asgariUcretArtisiYuzde: 25,
    kurArtisiYuzde: 0,
    faizDegisimiPuan: 0
  });

  // 20$ petrol -> enflasyona ~+2.8 puan etki, cari açığa ~ -8.5 milyar $ etki (daha derin açık)
  assert.ok(res.simuleTufe > 37.0);
  assert.ok(res.tufeSapmasiPuan > 2.0);
  assert.ok(res.simuleCariAcik < -30.0);
  assert.ok(res.cariSapmaMilyarUsd < -7.0);
});

test('makroStresTestiHesapla: kur artışı ve ücret zammı enflasyonu yukarı iter, Taylor bandı yükselir', () => {
  const res = makroStresTestiHesapla({
    bazTufe: 35.0,
    bazCariAcikMilyarUsd: -25.0,
    bazPolitikaFaizi: 45.0,
    brentSokuUsd: 0,
    asgariUcretArtisiYuzde: 40, // +15 puan ek zam
    kurArtisiYuzde: 10,         // %10 ilave kur şoku
    kurGeciskenligi: 0.30,
    faizDegisimiPuan: 0
  });

  // Kur şoku: 10 * 0.30 = +3.0 puan
  // Asgari ücret şoku: (40 - 25) * 0.20 = +3.0 puan
  // Toplam sapma: ~+6.0 puan
  assert.ok(res.tufeSapmasiPuan >= 5.5);
  assert.ok(res.simuleTufe >= 40.5);
  // Enflasyon yükselince Taylor kuralının tavsiye ettiği faiz bandı yukarı kaymalı
  assert.ok(res.taylorBand.alt > 40.0);
});

test('makroStresTestiHesapla: faiz artırımı enflasyonu hafifletir ve Taylor açığını kapatır', () => {
  const res = makroStresTestiHesapla({
    bazTufe: 35.0,
    bazCariAcikMilyarUsd: -25.0,
    bazPolitikaFaizi: 45.0,
    brentSokuUsd: 0,
    asgariUcretArtisiYuzde: 25,
    kurArtisiYuzde: 0,
    faizDegisimiPuan: 5 // +500 bp artırım
  });

  // Faiz artışı enflasyonda soğuma etkisi yaratır
  assert.ok(res.tufeSapmasiPuan < 0);
  assert.ok(res.simuleTufe < 35.0);
  assert.equal(res.simulePolitikaFaizi, 50.0);
});
