import test from 'node:test';
import assert from 'node:assert/strict';
import { cumleFarki, sozcukFarki } from './ppk-fark.mjs';

test('aynı metinde her cümle aynı çıkar', () => {
  const c = ['Birinci cümle burada.', 'İkinci cümle de burada.'];
  const { satirlar, ozet } = cumleFarki(c, c);
  assert.deepEqual(satirlar.map((s) => s.tur), ['ayni', 'ayni']);
  assert.deepEqual(ozet, { ayni: 2, eklenen: 0, silinen: 0, degisen: 0 });
});

test('faiz oranı değişimi değişen cümle olarak yakalanır', () => {
  const eski = ['Kurul, bir hafta vadeli repo ihale faiz oranının yüzde 37’de sabit tutulmasına karar vermiştir.'];
  const yeni = ['Kurul, bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir.'];
  const { satirlar, ozet } = cumleFarki(eski, yeni);
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].tur, 'degisti');
  assert.equal(ozet.degisen, 1);
  const sil = satirlar[0].sozcukler.filter((p) => p.tur === 'silindi').map((p) => p.metin).join(' ');
  const ekl = satirlar[0].sozcukler.filter((p) => p.tur === 'eklendi').map((p) => p.metin).join(' ');
  assert.match(sil, /37’de/);
  assert.match(ekl, /37’den yüzde 36’ya/);
});

test('eklenen ve silinen cümleler sırayla bulunur', () => {
  const eski = ['A cümlesi tamamen farklı konuda.', 'Ortak cümle her iki metinde de var.', 'Eski metne özgü kapanış sözü.'];
  const yeni = ['Yeni açılış cümlesi hiç alakasız.', 'Ortak cümle her iki metinde de var.'];
  const { satirlar, ozet } = cumleFarki(eski, yeni);
  assert.deepEqual(satirlar.map((s) => s.tur), ['silindi', 'eklendi', 'ayni', 'silindi']);
  assert.deepEqual(ozet, { ayni: 1, eklenen: 1, silinen: 2, degisen: 0 });
});

test('büyük küçük harf ve tırnak biçimi farkı sayılmaz', () => {
  const { ozet } = cumleFarki(['Yüzde 5’lik hedef.'], ["yüzde 5'lik HEDEF."]);
  assert.equal(ozet.ayni, 1);
});

test('eşik altı benzerlik eşleşmez: biri silinir, biri eklenir', () => {
  const { ozet } = cumleFarki(['Enflasyon düşmektedir.'], ['Büyüme hızlanmıştır.']);
  assert.deepEqual(ozet, { ayni: 0, eklenen: 1, silinen: 1, degisen: 0 });
});

test('değişen cümle ile aynı kalan cümlenin sırası korunur', () => {
  const eski = ['Kurul faiz oranını yüzde 40 düzeyinde sabit tutmuştur.', 'Likidite koşulları yakından izlenmektedir.'];
  const yeni = ['Kurul faiz oranını yüzde 38 düzeyinde sabit tutmuştur.', 'Likidite koşulları yakından izlenmektedir.'];
  const { satirlar } = cumleFarki(eski, yeni);
  assert.deepEqual(satirlar.map((s) => s.tur), ['degisti', 'ayni']);
});

test('sözcük farkı iki yönde de özgün metni geri kurar', () => {
  const eski = 'Faiz yüzde 38’den yüzde 37’ye indirildi.';
  const yeni = 'Faiz yüzde 37’den yüzde 36’ya indirildi.';
  const parcalar = sozcukFarki(eski, yeni);
  assert.equal(parcalar.filter((p) => p.tur !== 'silindi').map((p) => p.metin).join(' '), yeni);
  assert.equal(parcalar.filter((p) => p.tur !== 'eklendi').map((p) => p.metin).join(' '), eski);
});

test('boş girdiler', () => {
  assert.deepEqual(cumleFarki([], []).ozet, { ayni: 0, eklenen: 0, silinen: 0, degisen: 0 });
  assert.equal(cumleFarki([], ['Yeni.']).satirlar[0].tur, 'eklendi');
  assert.equal(cumleFarki(['Eski.'], []).satirlar[0].tur, 'silindi');
});
