import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KONULAR, KONU_ESIGI, konulariBul, konuDizini } from '../../src/lib/konular.mjs';

test('konulariBul: başlıktaki kurum adı ekli hâliyle de bulunur', () => {
  assert.deepEqual(konulariBul({ baslik: "Fed'in faiz kararı açıklandı" }), ['fed']);
  assert.deepEqual(konulariBul({ baslik: "Nvidia'nın geliri arttı" }), ['nvidia']);
});

test('konulariBul: kelimenin parçası eşleşmez', () => {
  assert.deepEqual(konulariBul({ baslik: 'Federasyon toplantısı ertelendi' }), []);
  assert.deepEqual(konulariBul({ baslik: 'Secim sonuçları açıklandı', spot: 'Securities tarafında hareket' }), []);
});

test('konulariBul: kısaltmalar büyük/küçük harfe duyarlı', () => {
  assert.deepEqual(konulariBul({ baslik: 'sec bir kelime değil' }), []);
  assert.deepEqual(konulariBul({ baslik: "SEC'e başvuru yapıldı" }), ['sec']);
});

test('konulariBul: gövdede tek geçiş yetmez, iki geçiş yeter', () => {
  assert.deepEqual(konulariBul({ baslik: 'Piyasalar sakin', govde: 'IMF raporu yayımlandı.' }), []);
  assert.deepEqual(konulariBul({ baslik: 'Piyasalar sakin', govde: "IMF raporu yayımlandı. IMF'ye göre büyüme sürecek." }), ['imf']);
});

test('konulariBul: cins adlar Türkçe ekleriyle bulunur', () => {
  assert.deepEqual(konulariBul({ baslik: 'Petrolün fiyatı geriledi' }), ['petrol']);
  assert.deepEqual(konulariBul({ baslik: 'Yapay zekânın enerji ihtiyacı' }), ['yapay-zeka']);
});

test('konuDizini: eşiğin altındaki konu sayfa almaz', () => {
  const y = (id, baslik) => ({ id, baslik });
  const d = konuDizini([y('a', 'Fed faizi sabit tuttu'), y('b', "Fed'den açıklama"), y('c', 'IMF raporu')]);
  assert.equal(d.length, 0);
  const d2 = konuDizini([y('a', 'Fed faizi sabit tuttu'), y('b', "Fed'den açıklama"), y('c', "Fed'in tutanakları")]);
  assert.deepEqual(d2.map((x) => [x.konu.slug, x.idler]), [['fed', ['a', 'b', 'c']]]);
  assert.equal(KONU_ESIGI, 3);
});

test('KONULAR: slug benzersiz, giriş 2-4 cümle ve rakamsız güncel değer yok', () => {
  const sluglar = new Set();
  for (const k of KONULAR) {
    assert.ok(/^[a-z0-9-]+$/.test(k.slug), k.slug);
    assert.ok(!sluglar.has(k.slug), `yinelenen slug ${k.slug}`);
    sluglar.add(k.slug);
    const cumle = k.giris.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(cumle >= 2 && cumle <= 4, `${k.slug}: ${cumle} cümle`);
    // Giriş metninde fiyat, oran gibi zamanla eskiyen değer olmaz (kuruluş yılı ve sabit hedefler serbest).
    assert.ok(!/%\s*\d|\d+[.,]\d+/.test(k.giris), `${k.slug}: giriş metninde güncel değer`);
  }
});
