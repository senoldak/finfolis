// Kaynak: mecmua/site-ortak/dil/dil-tr.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dilDuzeltTr, dilSorunlariTr, kesinSorunlar, sorunListesi } from './dil-tr.mjs';

const kodlar = (m, a) => dilSorunlariTr(m, a).map((s) => s.kod);

test('düzeltme işareti: TDK biçimleri, ekli ve büyük harfli', () => {
  assert.equal(dilDuzeltTr('Yapay zeka ve yapay zekanın imkanları'), 'Yapay zekâ ve yapay zekânın imkânları');
  assert.equal(dilDuzeltTr('Zeka testi, kağıdı, rüzgarın'), 'Zekâ testi, kâğıdı, rüzgârın');
  assert.equal(dilDuzeltTr('Şirket hala zararda; hikayesi ve şikayetler'), 'Şirket hâlâ zararda; hikâyesi ve şikâyetler');
  assert.equal(dilDuzeltTr('gayri safi yurt içi hasıla'), 'gayrisafi yurt içi hasıla');
});

test('düzeltme işareti başka sözcükleri bozmaz', () => {
  assert.equal(dilDuzeltTr('mekanik bir mekanizma'), 'mekanik bir mekanizma');
  assert.equal(dilDuzeltTr('Kağıthane ve Zekai Bey'), 'Kağıthane ve Zekai Bey');
  assert.equal(dilDuzeltTr('halası geldi'), 'halası geldi');
  assert.equal(dilDuzeltTr('yeni mekanda'), 'yeni mekânda');
});

test('kesme işareti ve ondalık nokta', () => {
  assert.equal(dilDuzeltTr('OpenAI’ın geliri 3.5 milyar dolar'), "OpenAI'ın geliri 3,5 milyar dolar");
  assert.equal(dilDuzeltTr('1.250 kişi'), '1.250 kişi');
});

test('yüzde biçimi siteye göre', () => {
  assert.equal(dilDuzeltTr('enflasyon %5,2 oldu', { yuzde: 'yuzde' }), 'enflasyon yüzde 5,2 oldu');
  assert.equal(dilDuzeltTr('payı yüzde 40 oldu', { yuzde: 'isaret' }), 'payı %40 oldu');
  assert.equal(dilDuzeltTr('payı yüzde 40 oldu'), 'payı yüzde 40 oldu');
});

test('yazıyla sayı kesin sorun', () => {
  assert.deepEqual(kodlar('Ekim ayında otuz dört yeni şirketle doksan altı milyar dolara ulaştı.'), ['yazili-sayi']);
  assert.ok(kodlar('Sınır yüzde on olarak belirlendi.').includes('yazili-sayi'));
  assert.ok(kodlar('Şirket iki bin on bir yılında kuruldu.').includes('yazili-sayi'));
  assert.deepEqual(kodlar('On binlerce kişi iki katına çıkan fiyatları protesto etti. Bir şirket açıklama yaptı.'), []);
});

test('çevrilmemiş İngilizce cümle', () => {
  const m = 'Şirket açıklama yaptı. “Audit is one of the few services where the customer experience has got worse.” dedi.';
  const s = dilSorunlariTr(m);
  assert.equal(kesinSorunlar(s)[0].kod, 'ingilizce');
  assert.deepEqual(kodlar('Nintendo, "The Legend of Zelda: Ocarina of Time" oyununu yeniledi.'), []);
  assert.deepEqual(kodlar('Office of the Comptroller of the Currency açıklama yaptı.'), []);
});

test('cümle içine gömülü İngilizce alıntı yakalanır', () => {
  assert.deepEqual(kodlar('Raporda düşüşün “helped reduce the cost of credit to SMEs” dediği belirtildi.'), ['ingilizce']);
});

test('tek başına "bir milyon" kesin değil', () => {
  const s = dilSorunlariTr('Platform bir milyon kullanıcıya ulaştı.');
  assert.equal(s.length, 1);
  assert.equal(kesinSorunlar(s).length, 0);
});

test('tekrar eden cümle ve çift sözcük', () => {
  const m = 'Kurtarma çalışmaları pazar akşamı sona erdi. Başka bir bilgi var burada. Kurtarma çalışmaları pazar akşamı sona erdi.';
  assert.ok(kodlar(m).includes('tekrar-cumle'));
  assert.ok(kodlar('Şirket ve ve yatırımcılar').includes('cift-sozcuk'));
  assert.deepEqual(kodlar('Fiyatlar yavaş yavaş düştü.'), []);
});

test('kalıplar: kesin ve eşikli', () => {
  const s = dilSorunlariTr('Duvar Sokağı analistlerine göre hisseler yüzde 8,6 oranında düştü.');
  assert.equal(kesinSorunlar(s).length, 1);
  assert.equal(s.length, 2);
  assert.deepEqual(kodlar('Şirket toplantı gerçekleştirdi.'), []);
  assert.deepEqual(kodlar('Şirket toplantı gerçekleştirdi. Ardından tanıtım gerçekleştirdi.'), ['kalip']);
  assert.ok(kodlar('Şirket salı günü açıklama yaptı.').includes('kalip'));
});

test('ara başlık ve tek paragraf ayara bağlı', () => {
  const govde = '### Büyüme\n\n' + 'kelime '.repeat(10);
  assert.deepEqual(kodlar(govde), []);
  assert.deepEqual(kodlar(govde, { araBaslikYasak: true }), ['ara-baslik']);
  assert.deepEqual(kodlar('kelime '.repeat(200), { govde: true }), ['tek-paragraf']);
});

test('sorun listesi biçimi', () => {
  assert.equal(sorunListesi([]), '');
  assert.match(sorunListesi(dilSorunlariTr('Duvar Sokağı açıldı.')), /^- "Duvar Sokağı".*örnek: «Duvar Sokağı»/);
});
