import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hesaplaNetPozisyon } from './tcmb-rezerv.mjs';

test('hesaplaNetPozisyon: pozitif net pozisyon doğru hesaplanır', () => {
  // Örnek:
  // Dış varlıklar: 5.000.000.000 Bin TL
  // Toplam yükümlülük: 3.000.000.000 Bin TL
  // Kamu dövizi: 500.000.000 Bin TL
  // Dolar kuru: 40 TL
  // Swap: 10 Milyar $
  //
  // Dış varlıklar USD = 5.000.000.000 / 40 / 1.000.000 = 125 Milyar $
  // Yükümlülük USD = 3.000.000.000 / 40 / 1.000.000 = 75 Milyar $
  // NUR USD = 125 - 75 = 50 Milyar $
  // Kamu dövizi USD = 500.000.000 / 40 / 1.000.000 = 12.5 Milyar $
  // Swap hariç NUR = 50 - 10 = 40 Milyar $
  // Swap ve Hazine hariç Net Pozisyon = 40 - 12.5 = 27.5 Milyar $
  const sonuc = hesaplaNetPozisyon({
    disVarliklarTL: 5_000_000_000,
    dovizYukumlulukleriTL: 3_000_000_000,
    kamuDovizTL: 500_000_000,
    usdKuru: 40,
    swapStokuUSD: 10,
  });

  assert.equal(sonuc.disVarliklarUSD, 125);
  assert.equal(sonuc.dovizYukumlulukleriUSD, 75);
  assert.equal(sonuc.netUluslararasiRezervUSD, 50);
  assert.equal(sonuc.hazineDoviziUSD, 12.5);
  assert.equal(sonuc.swapStokuUSD, 10);
  assert.equal(sonuc.swapHaricNetUSD, 40);
  assert.equal(sonuc.netPozisyonUSD, 27.5);
});

test('hesaplaNetPozisyon: negatif net rezerv durumu (geçmiş dönemler) eksi çıkar', () => {
  // Rezervlerin eksiye düştüğü senaryo:
  // Dış varlıklar: 3.000.000.000 Bin TL (Kur 30 -> 100 Milyar $)
  // Yükümlülük: 2.700.000.000 Bin TL (Kur 30 -> 90 Milyar $) -> NUR = +10 Milyar $
  // Swap stoku: 55 Milyar $
  // Kamu dövizi: 15 Milyar $
  // Net Pozisyon = 10 - 55 - 15 = -60 Milyar $
  const sonuc = hesaplaNetPozisyon({
    disVarliklarTL: 3_000_000_000,
    dovizYukumlulukleriTL: 2_700_000_000,
    kamuDovizTL: 450_000_000,
    usdKuru: 30,
    swapStokuUSD: 55,
  });

  assert.equal(sonuc.netUluslararasiRezervUSD, 10);
  assert.equal(sonuc.swapHaricNetUSD, -45);
  assert.equal(sonuc.netPozisyonUSD, -60);
});

test('hesaplaNetPozisyon: geçersiz kur hata fırlatır', () => {
  assert.throws(
    () =>
      hesaplaNetPozisyon({
        disVarliklarTL: 1000,
        dovizYukumlulukleriTL: 1000,
        kamuDovizTL: 0,
        usdKuru: 0,
      }),
    /Geçersiz dolar kuru/
  );
});

test('günlük değişim: iki gün arasındaki net pozisyon farkı doğru hesaplanır', () => {
  const gun1 = 39.0;
  const gun2 = 34.2;
  const fark = Math.round((gun2 - gun1) * 10) / 10;
  assert.equal(fark, -4.8);

  const gun3 = 38.8;
  const gun4 = 38.9;
  const farkPozitif = Math.round((gun4 - gun3) * 10) / 10;
  assert.equal(farkPozitif, 0.1);
});
