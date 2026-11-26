// Kaynak: mecmua/site-ortak/baslik/baslik-duzeni.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { araBasliklariDuzenle, cumleDuzeni, baslikDuzeniMi } from './baslik-duzeni.mjs';

test('cümle düzenindeki başlığa dokunulmaz', () => {
  const b = 'Japonya ekonomisi üçüncü çeyrekte durakladı';
  assert.equal(baslikDuzeniMi(b), false);
  assert.equal(cumleDuzeni(b, ''), b);
});

test('her kelimesi büyük başlık cümle düzenine iner, özel adlar metinden tanınır', () => {
  const metin = 'Şirketin yatırım kolu Berkshire Hathaway, Bending Spoons ile anlaştı. Yatırım tutarı açıklandı.';
  assert.equal(
    cumleDuzeni("Berkshire Hathaway Bending Spoons'a 330 Milyon Dolarlık Yatırım Yaptı", metin),
    "Berkshire Hathaway Bending Spoons'a 330 milyon dolarlık yatırım yaptı",
  );
});

test('kısaltmalar ve bülten tarih kısmı korunur', () => {
  const metin = 'Fed Başkanı Warsh konuştu. Kanada verileri 16 Kasım günü açıklandı.';
  assert.equal(
    cumleDuzeni('Fed Başkanı Warsh’tan Yapay Zekâ Değerlendirmesi ve Kanada Enflasyon Verileri · 16 Kasım, kapanış', metin),
    'Fed Başkanı Warsh’tan yapay zekâ değerlendirmesi ve Kanada enflasyon verileri · 16 Kasım, kapanış',
  );
  assert.equal(cumleDuzeni('ABD Bütçe Açığı Rekor Seviyeye Ulaştı', 'Bütçe açığı büyüdü. Hazine bütçe verilerini açıkladı.'), 'ABD bütçe açığı rekor seviyeye ulaştı');
});

test('ara başlık: her kelimesi büyük başlık cümle düzenine iner, özel ad gövdeden tanınır', () => {
  const govde = [
    'Operasyonda Hindistan polisi ve Interpol birlikte çalıştı.',
    '',
    '### Operasyonun Boyutları ve Uluslararası İş Birliği',
    '',
    'Soruşturma birkaç ülkeye yayıldı.',
    '',
    '### Kripto Varlıklar Mercek Altında',
    '',
    'Kripto varlıklara el konuldu.',
    '',
    '## Interpol Yeni Çağrı Yaptı',
  ].join('\n');
  const yeni = araBasliklariDuzenle(govde);
  assert.match(yeni, /^### Operasyonun boyutları ve uluslararası iş birliği$/m);
  assert.match(yeni, /^### Kripto varlıklar mercek altında$/m);
  assert.match(yeni, /^## Interpol yeni çağrı yaptı$/m);
  assert.equal(yeni.replace(/^#.*$/gm, ''), govde.replace(/^#.*$/gm, '')); // gövde satırları aynı
});

test('ara başlık: kısa, cümle düzenindeki ya da başlıksız gövdeye dokunulmaz', () => {
  const g = '## Yükümlü şirketlere istisna\n\nMetin.\n\n### Faiz ve Emtia\n\nMetin.';
  assert.equal(araBasliklariDuzenle(g), g);
  assert.equal(araBasliklariDuzenle('Düz metin. Başka Cümle.'), 'Düz metin. Başka Cümle.');
  assert.equal(araBasliklariDuzenle(undefined), undefined);
});

test('ara başlık: başlığın kendi büyük harfleri özel ad sayılmaz', () => {
  const g = '### Yapay Zekâ Yatırımları Hızlandı\n\nŞirketler yatırımı artırdı.';
  assert.equal(araBasliklariDuzenle(g), '### Yapay zekâ yatırımları hızlandı\n\nŞirketler yatırımı artırdı.');
});

test('ara başlık: yalnız cümle başında geçen gerçek ad küçültülmez (temkinli kural)', () => {
  const g = '### İthalatta Rusya ve Ukrayna Öne Çıktı\n\nİthalat arttı. Ukrayna payını büyüttü. Rusya ilk sırada kaldı.';
  assert.match(araBasliklariDuzenle(g), /^### İthalatta Rusya ve Ukrayna öne çıktı$/m);
});