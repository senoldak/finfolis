import test from 'node:test';
import assert from 'node:assert/strict';
import { kapakCiz, haberKapagi, rakamKapagi, kaynakKapagi, bultenKapagi, gostergeKapagi } from './kapak.mjs';

test('haberKapagi: rakamsız başlık ve spot ile geçerli PNG üretir', async () => {
  const png = await kapakCiz(haberKapagi({
    kategori: 'ekonomi',
    bolge: 'asya',
    baslik: 'Singapurlu yatırımcıların yerel borsadaki risk iştahı düşük',
    spot: 'Singapur Borsası Başkanı Koh Boon Hwee açıklamada bulundu.',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('haberKapagi: rakamlı iki kolonlu kart ile geçerli PNG üretir', async () => {
  const png = await kapakCiz(haberKapagi({
    kategori: 'ekonomi',
    bolge: 'küresel',
    baslik: 'Yapay zeka yatırımları küresel büyümeyi destekliyor',
    spot: 'IMF küresel büyüme tahminini güncelledi.',
    rakam: { etiket: '2026 Büyüme Tahmini', deger: '%3,1' },
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('rakamKapagi: makro rakam kartı dengeli boyutta PNG üretir', async () => {
  const png = await kapakCiz(rakamKapagi({
    kategori: 'piyasalar',
    ust: 'TCMB Politika Faizi',
    rakam: '%50,0',
    alt: 'PPK faiz kararını açıkladı.',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('kaynakKapagi: şirket veya dosya kartı geçerli PNG üretir', async () => {
  const png = await kapakCiz(kaynakKapagi({
    kategori: 'borsa',
    konu: 'TRex Bio, Inc.',
    alt: 'Halka arz nihai izahnamesi',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('bultenKapagi: bülten kartı geçerli PNG üretir', async () => {
  const png = await kapakCiz(bultenKapagi({
    saat: '14:00',
    tarih: '13 Ekim',
    basliklar: ['Başlık bir', 'Başlık iki'],
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('grafikKapagi: çizgi grafiği, referans çizgisi ve vurgu ile geçerli PNG üretir', async () => {
  const { grafikKapagi } = await import('./kapak.mjs');
  const seri = Array.from({ length: 900 }, (_, i) => ({
    tarih: new Date(Date.UTC(2023, 0, 1) + i * 864e5).toISOString().slice(0, 10),
    deger: 1000 + i + 80 * Math.sin(i / 20),
  }));
  const png = await kapakCiz(grafikKapagi({
    kategori: 'borsa',
    baslik: 'BIST 100 son bir yılın zirvesinden yüzde 10\'un üzerinde geriledi',
    seri,
    cizgiler: [{ deger: 2000, etiket: 'Zirve 2.000,00 · 1 Mayıs 2025' }],
    vurgu: 'Zirveden −%10,2',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('eksenAdimi ve incelt: okunaklı adım, tepe ve son nokta korunur', async () => {
  const { eksenAdimi, incelt } = await import('./kapak.mjs');
  assert.equal(eksenAdimi(5000), 2000);
  assert.equal(eksenAdimi(37), 10);
  const seri = Array.from({ length: 5000 }, (_, i) => ({ tarih: String(i).padStart(5, '0'), deger: i === 1234 ? 99999 : i % 7 }));
  const az = incelt(seri);
  assert.ok(az.length <= 601);
  assert.ok(az.some((p) => p.deger === 99999));
  assert.equal(az.at(-1), seri.at(-1));
});
