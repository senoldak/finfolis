import { test } from 'node:test';
import assert from 'node:assert/strict';
import { olcekKontrol, tutarlar, yaziylaTutar } from './olcek.mjs';

test('crore milyara çevrilirken 100 kat şişen tutar yakalanır', () => {
  const s = olcekKontrol('Halka arz büyüklüğü 852 milyar rupi.', 'The Rs 852 crore IPO was subscribed 7.78 times.');
  assert.equal(s.length, 1);
  assert.match(s[0], /852 milyar.*852 crore/);
});

test('doğru çeviri ve aynı birim geçer', () => {
  assert.deepEqual(olcekKontrol('852 crore rupi (yaklaşık 8,52 milyar rupi)', 'Rs 852 crore IPO'), []);
  assert.deepEqual(olcekKontrol('Şirket 2,5 milyar dolar topladı.', 'The company raised $2.5 billion.'), []);
  assert.deepEqual(olcekKontrol('2.500 milyon dolar', 'raised 2.5 billion dollars'), []);
});

test('birimsiz kaynak rakamıyla karşılaştırılmaz (tablo başlığında "milyon" gibi)', () => {
  assert.deepEqual(olcekKontrol('352 milyon dolar', 'Revenue (in millions): 352'), []);
});

test('yazıyla yazılmış tutar da görülür', () => {
  assert.equal(yaziylaTutar('sekiz yüz elli iki milyar rupi'), '852 milyar rupi');
  assert.equal(yaziylaTutar('beş bin 12 crore'), '5012 crore');
  assert.equal(yaziylaTutar('seksen beş virgülyirmi altı lakh hisse'), '85,26 lakh hisse');
  assert.equal(olcekKontrol('sekiz yüz elli iki milyar rupi', 'Rs 852 crore').length, 1);
});

test('aralıkta birim sona yazılır: "100 ile 115 milyar"', () => {
  assert.deepEqual(tutarlar('100 ile 115 milyar').map((t) => t.ham), ['100 milyar', '115 milyar']);
  assert.deepEqual(olcekKontrol('100 ile 115 milyar lira', '10 milyar dolar, 100-115 milyar lira'), []);
});

test('lakh crore 10^12 sayılır; mutlak tutar (künye) da karşılaştırılır', () => {
  assert.deepEqual(olcekKontrol('4 trilyon rupi', '4 lakh crore rupees'), []);
  assert.equal(olcekKontrol('', 'Rs 5,012.3 crore issue', { mutlak: [5012300000000] }).length, 1);
  assert.deepEqual(olcekKontrol('', 'Rs 5,012.3 crore issue', { mutlak: [50123000000] }), []);
});
