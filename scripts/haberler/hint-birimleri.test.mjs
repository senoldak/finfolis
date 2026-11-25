import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintBirimleriniCevir, hintSayisi } from './hint-birimleri.mjs';

test('hintSayisi: crore, lakh, lakh crore yuvarlamasız çevrilir', () => {
  assert.equal(hintSayisi('82,8', 'crore'), '828 milyon');
  assert.equal(hintSayisi('828,8', 'crore'), '8,288 milyar');
  assert.equal(hintSayisi('9.197', 'crore'), '91,97 milyar');
  assert.equal(hintSayisi('67,57', 'crore'), '675,7 milyon');
  assert.equal(hintSayisi('236', 'crore'), '2,36 milyar');
  assert.equal(hintSayisi('1,47', 'lakh'), '147 bin');
  assert.equal(hintSayisi('348,19', 'lakh'), '34,819 milyon');
  assert.equal(hintSayisi('2,5', 'lak crore'), '2,5 trilyon');
  assert.equal(hintSayisi('5,85', 'lakh crore'), '5,85 trilyon');
  assert.equal(hintSayisi('5.84.624', 'crore'), '5,84624 trilyon');
  assert.equal(hintSayisi('0,5', 'crore'), '5 milyon');
  assert.equal(hintSayisi('9.493,97', 'lak'), '949,397 milyon');
});

test('hintBirimleriniCevir: ek ve para birimi korunur, başka sözcüklere dokunulmaz', () => {
  const { metin, sayi } = hintBirimleriniCevir("Kâr 45,2 crore ₹'den 82,8 crore ₹'ye çıktı; 30,25 crore rupiye indi. Lake Tahoe, 2,5 lak crore rupi.");
  assert.equal(metin, "Kâr 452 milyon ₹'den 828 milyon ₹'ye çıktı; 302,5 milyon rupiye indi. Lake Tahoe, 2,5 trilyon rupi.");
  assert.equal(sayi, 4);
  assert.equal(hintBirimleriniCevir('deger: "7 crore adet"').metin, 'deger: "70 milyon adet"');
  assert.equal(hintBirimleriniCevir('Crore Rupi').sayi, 0);
});

test('hintBirimleriYazida: başlık, gövde, rakamlar, tablo çevrilir; tarih ve kaynaklar dokunulmaz', async () => {
  const { hintBirimleriYazida } = await import('./lib.mjs');
  const tarih = new Date('2026-11-26T00:00:00Z');
  const y = hintBirimleriYazida({
    baslik: 'Kâr 82,8 crore rupiye çıktı',
    spot: 'Gelir 9.197 crore oldu.',
    govde: 'Altın 1,47 lakh seviyesine geriledi.',
    rakamlar: [{ etiket: 'Net kâr', deger: '82,8 crore ₹' }],
    tablo: { baslik: 'X', sutunlar: ['a'], satirlar: [['2,5 lakh crore']] },
    kaynaklar: [{ ad: 'SEC', url: 'https://www.sec.gov/' }],
    tarih,
  });
  assert.equal(y.baslik, 'Kâr 828 milyon rupiye çıktı');
  assert.equal(y.spot, 'Gelir 91,97 milyar oldu.');
  assert.equal(y.govde, 'Altın 147 bin seviyesine geriledi.');
  assert.equal(y.rakamlar[0].deger, '828 milyon ₹');
  assert.equal(y.tablo.satirlar[0][0], '2,5 trilyon');
  assert.equal(y.tarih, tarih);
});
