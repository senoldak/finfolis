import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kategoriDuzelt } from './kategori-duzelt.mjs';

test('kripto haberi kripto kalır', () => {
  assert.equal(kategoriDuzelt('kripto', { baslik: 'Bitcoin 70.000 doların altına geriledi', govde: 'Bitcoin fiyatı...' }), 'kripto');
  assert.equal(kategoriDuzelt('kripto', { baslik: 'Çekya Merkez Bankası blokzinciri üzerinde ilk tahvil ihracını gerçekleştirdi', govde: 'Tokenleştirilmiş tahvil' }), 'kripto');
});

test('kripto beslemesinden gelen şirket haberi borsaya geçer', () => {
  assert.equal(kategoriDuzelt('kripto', { baslik: "Home Depot'da üst yönetim değişikliği", govde: 'Şirketin üst yöneticisi ve CEO görevine...' }), 'borsa');
  assert.equal(kategoriDuzelt('kripto', { baslik: 'Micron teknoloji şirketinin gelirleri rekor seviyeye ulaştı', govde: 'Çeyrek gelir hisse' }), 'borsa');
});

test('kripto beslemesinden gelen makro haber ekonomiye geçer', () => {
  assert.equal(kategoriDuzelt('kripto', { baslik: 'Japonya ekonomisi üçüncü çeyrekte durakladı', govde: 'Milli gelir verisi beklentinin altında kaldı.' }), 'ekonomi');
});

test('döviz beslemesinden gelen perakende haberi ekonomiye geçer, kur haberi kalır', () => {
  assert.equal(kategoriDuzelt('doviz', { baslik: 'Kanada ağustos ayı perakende satışları açıklandı', govde: 'Satışlar yüzde 1,2 arttı.' }), 'ekonomi');
  assert.equal(kategoriDuzelt('doviz', { baslik: 'GBP/USD paritesi üst üste 6 işlem günüdür yükseliyor', govde: 'Parite, sterlin' }), 'doviz');
  assert.equal(kategoriDuzelt('doviz', { baslik: 'Ons altın rekor kırdı', govde: 'Altın fiyatı' }), 'doviz');
});

test('öteki kategorilere dokunulmaz', () => {
  assert.equal(kategoriDuzelt('piyasalar', { baslik: 'Herhangi bir başlık' }), 'piyasalar');
  assert.equal(kategoriDuzelt('borsa', { baslik: 'Japonya ekonomisi durakladı' }), 'borsa');
});
