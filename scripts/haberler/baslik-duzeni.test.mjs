import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cumleDuzeni, baslikDuzeniMi } from './baslik-duzeni.mjs';

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
