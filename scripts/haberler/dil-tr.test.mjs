// Kaynak: mecmua/site-ortak/dil/dil-tr.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cumlelereAyir, dilDuzeltTr, dilSorunlariTr, kesinSorunlar, ozetAlaniTemizle, paragrafOranlari, paragraflaraBol, sorunListesi } from './dil-tr.mjs';

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

test('yapay zekâ kalıpları: redaksiyona gider, haberi düşürmez', () => {
  const sorun = (m) => dilSorunlariTr(m).filter((s) => s.kod === 'kalip');
  for (const m of [
    'Şirket — kuruluşundan bu yana — 3 tur tamamladı.',
    'Şirket sadece yatırım almadı değil, iki pazara açıldı.',
    'Şirket yatırım almakla kalmadı, iki pazara açıldı.',
    'Bu yatırım sektör için önemli bir adım oldu.',
    'Kampanya dönüm noktası sayılıyor.',
    'Şirket 2 milyon dolar topladı. Bu gelişme sektörün büyüdüğünü gösteriyor.',
  ]) {
    assert.ok(sorun(m).length, m);
    assert.equal(kesinSorunlar(dilSorunlariTr(m)).length, 0, m);
  }
  assert.equal(sorun('Şirket 2015–2025 arasında 3 tur tamamladı.').length, 0);
  assert.equal(sorun('Şirket 9 Nisan ile 5 Ekim 2026 arasında satış yapmadı.').length, 0);
});

test('modelin yazı olarak bıraktığı satır sonu gerçek satır sonuna döner', () => {
  assert.equal(dilDuzeltTr('Birinci paragraf.\n\nİkinci paragraf.'), 'Birinci paragraf.\n\nİkinci paragraf.');
});

test('cumlelereAyir: kısaltma ve baş harfte bölmez', () => {
  assert.deepEqual(cumlelereAyir('Dr. Ayşe Kaya açıkladı. Şirket J. Smith ile anlaştı. Acme Inc. Paris’e taşındı.'), [
    'Dr. Ayşe Kaya açıkladı.',
    'Şirket J. Smith ile anlaştı.',
    'Acme Inc. Paris’e taşındı.',
  ]);
  assert.deepEqual(cumlelereAyir('Kâr 3.5 milyon. "Büyüdük" dedi. %20 arttı.'), ['Kâr 3.5 milyon.', '"Büyüdük" dedi.', '%20 arttı.']);
});

const cumle = (i) => `Bu, haber gövdesindeki ${i}. sınama cümlesidir ve paragraf bölücünün davranışını ölçmek için yazıldı.`;
const blok = (n) => Array.from({ length: n }, (_, i) => cumle(i + 1)).join(' ');

test('paragraflaraBol: tek bloğu sözcüklere dokunmadan böler', () => {
  const g = blok(12);
  const yeni = paragraflaraBol(g);
  const ps = yeni.split('\n\n');
  assert.equal(ps.length, 3);
  assert.equal(yeni.replace(/\s+/g, ' '), g);
  for (const p of ps) assert.match(p, /\.$/);
});

test('paragraflaraBol: eşin oranlarını izler', () => {
  const g = blok(10);
  const ps = paragraflaraBol(g, [0.5]).split('\n\n');
  assert.equal(ps.length, 2);
  assert.equal(ps[0].split('. ').length, ps[1].split('. ').length);
  assert.deepEqual(paragrafOranlari('aaaa\n\nbbbb'), [0.5]);
  assert.equal(paragrafOranlari('tek'), null);
});

test('paragraflaraBol: paragraflı, kısa ya da markdown gövdeye dokunmaz', () => {
  const paragrafli = `${blok(4)}\n\n${blok(4)}`;
  assert.equal(paragraflaraBol(paragrafli), paragrafli);
  assert.equal(paragraflaraBol(blok(3)), blok(3));
  assert.equal(paragraflaraBol(`## Başlık ${blok(8)}`), `## Başlık ${blok(8)}`);
  assert.equal(paragraflaraBol('kısa metin.'), 'kısa metin.');
});

test('ozetAlaniTemizle: sağlam alana dokunmaz', () => {
  const s = 'Anthropic’in kararı, yapay zekâ sağlayıcılarının yeni denetim mekanizmaları kurduğunu gösteriyor.';
  assert.equal(ozetAlaniTemizle(s), s);
  assert.equal(ozetAlaniTemizle('Model, Claude Fable 5.2 modelinin önüne geçti.'), 'Model, Claude Fable 5.2 modelinin önüne geçti.');
  assert.equal(ozetAlaniTemizle('1 milyon dolar tohum yatırım', { azami: 200, cumle: false }), '1 milyon dolar tohum yatırım');
});

test('ozetAlaniTemizle: cümle sonundaki artığı siler', () => {
  assert.equal(ozetAlaniTemizle('Denetim mekanizmalarını gösteriyor.0'), 'Denetim mekanizmalarını gösteriyor.');
  assert.equal(ozetAlaniTemizle('Fiziksel denetimleri işlevlerle eşleştiriyor.ana'), 'Fiziksel denetimleri işlevlerle eşleştiriyor.');
});

test('ozetAlaniTemizle: yapışık gövde ya da liste varsa alan atılır', () => {
  assert.equal(ozetAlaniTemizle('Kesintilerin seyahatleri etkileyebileceği vurgulanıyor.\\n\\nKey Points:\\n- Direktör uyardı.'), '');
  assert.equal(ozetAlaniTemizle('Birinci cümle tamam.\n\nİkinci paragraf gövdeden.'), '');
});

test('ozetAlaniTemizle: redaksiyon notu, tekrar döngüsü ve bitmeyen cümle atılır', () => {
  assert.equal(ozetAlaniTemizle('Zemin hazırladığını gösteriyorur [sic -> gösteriyor]. dejital güvenlik.'), '');
  assert.equal(ozetAlaniTemizle(`Pazar payını artırıyor ${'büyüyorla '.repeat(40)}büyüyor.`), '');
  assert.equal(ozetAlaniTemizle('Cümle yarıda kesildi ve bitmedi'), '');
  assert.equal(ozetAlaniTemizle(`${'Uzun bir cümle '.repeat(40)}bitti.`), '');
  assert.equal(ozetAlaniTemizle(''), '');
  assert.equal(ozetAlaniTemizle(undefined), '');
});

test('ozetAlaniTemizle: azamiyi aşan alan atılır (ilk cümle kurtarılmaz)', () => {
  const ilk = 'Toplanan yatırım şirketin büyümesini hızlandırıyor.';
  assert.equal(ozetAlaniTemizle(`${ilk} ${'Ek bilgi cümlesi burada duruyor. '.repeat(15)}`, { azami: 200 }), '');
  assert.equal(ozetAlaniTemizle(ilk, { azami: 200 }), ilk);
});