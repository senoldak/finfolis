import test from 'node:test';
import assert from 'node:assert/strict';
import { hesapla, sonucCumlesi, donemNotu, trDonemNotu, medyan, sayiYaz, degerYaz, GOSTERGELER } from './dunyada-turkiye.mjs';

const o = (deger, donem = '2026-09') => ({ deger, donem });
const emsal = {
  baslikDonemleri: { gsyhCeyrek: '2026-Q2', gsyhYillik: '2026-Q2', tufe: '2026-09', cekirdek: '2026-09', issizlik: '2026-08', faiz: '2026-10', tahvil: '2026-09', reel: '2026-09' },
  satirlar: [
    { kod: 'TUR', ad: 'Türkiye', grup: 'tr', tufe: o(30), cekirdek: o(28), issizlik: o(8, '2026-08'), faiz: { deger: 36, tarih: '2026-10-23' }, tahvil: null, reel: { deger: 6, tufeDonem: '2026-09' }, gsyhCeyrek: o(1, '2026-Q2'), gsyhYillik: o(2, '2026-Q2') },
    { kod: 'AAA', ad: 'Alfa', grup: 'gelismis', tufe: o(3), cekirdek: o(2, '2026-08'), issizlik: o(4, '2026-08'), faiz: { deger: 4, tarih: '2026-10-20' }, tahvil: o(5), reel: { deger: 1, tufeDonem: '2026-09' }, gsyhCeyrek: o(1, '2026-Q2'), gsyhYillik: o(3, '2026-Q2') },
    { kod: 'BBB', ad: 'Beta', grup: 'gelismis', tufe: o(10), cekirdek: null, issizlik: o(8, '2026-08'), faiz: { deger: 36, tarih: '2026-10-20' }, tahvil: o(7), reel: { deger: 7, tufeDonem: '2026-09' }, gsyhCeyrek: o(-1, '2026-Q2'), gsyhYillik: o(1, '2026-Q2') },
    { kod: 'CCC', ad: 'Gama', grup: 'gelismekte', tufe: o(5, '2026-08'), cekirdek: o(4), issizlik: o(2, '2026-08'), faiz: { deger: 8, tarih: '2026-10-20' }, tahvil: o(9), reel: null, gsyhCeyrek: o(2, '2026-Q2'), gsyhYillik: o(2, '2026-Q2') },
  ],
};
const faizler = {
  satirlar: [
    { kod: 'TUR', degisim12Ay: -450, tarih: '2026-10-23' },
    { kod: 'AAA', degisim12Ay: -25, tarih: '2026-10-20' },
    { kod: 'BBB', degisim12Ay: 0, tarih: '2026-10-20' },
    { kod: 'CCC', degisim12Ay: 100, tarih: '2026-10-20' },
  ],
};
const sonuc = (k) => hesapla(emsal, faizler).find((s) => s.k === k);

test('en yüksek sıra, ülke sayısı, komşular ve medyan', () => {
  const s = sonuc('tufe');
  assert.equal(s.n, 4);
  assert.equal(s.sira, 1);
  assert.equal(s.yon, 'en yüksek');
  assert.equal(s.ustte, null);
  assert.deepEqual(s.altta, { ad: 'Beta', deger: 10 });
  assert.equal(s.medyan, 5);
  assert.equal(sonucCumlesi(s), '4 ekonomi arasında yıllık enflasyonda en yüksek 1.');
});

test('eksik veri olan ülke sayılmaz ve eksik listesine girer', () => {
  const s = sonuc('cekirdek');
  assert.equal(s.n, 3);
  assert.deepEqual(s.eksik, ['Beta']);
  const r = sonuc('reel');
  assert.equal(r.n, 3);
  assert.equal(r.sira, 2);
  assert.deepEqual(r.eksik, ['Gama']);
});

test('Türkiye verisi yoksa gösterge uygun değil', () => {
  const s = sonuc('tahvil');
  assert.equal(s.uygun, false);
  assert.equal(s.sira, null);
  assert.deepEqual(s.eksik, ['Türkiye']);
});

test('alt uca yakınsa "en düşük" denir', () => {
  const s = sonuc('faizDegisim');
  assert.equal(s.sira, 4);
  assert.equal(s.yon, 'en düşük');
  assert.equal(s.yonSira, 1);
  assert.equal(sonucCumlesi(s), '4 ekonomi arasında faizin 12 aylık değişiminde en düşük 1.');
});

test('eşit değerler aynı sırayı alır', () => {
  const s = sonuc('faiz');
  assert.equal(s.sira, 1); // Türkiye ve Beta eşit, ikisi de 1.
  const g = sonuc('gsyhCeyrek');
  assert.equal(g.sira, 2); // Gama 2, Türkiye ve Alfa 1
});

test('dönem uyumsuzluğu notu', () => {
  assert.equal(donemNotu(sonuc('tufe')), 'Veri Eyl 2026 dönemine ait; 1 ekonomide son dönem farklı: Gama (Ağu 2026).');
  assert.equal(donemNotu(sonuc('gsyhCeyrek')), '');
  assert.equal(trDonemNotu(sonuc('tufe')), '');
});

test('sayı yazımı', () => {
  assert.equal(sayiYaz(-0.004, 2), '0,00');
  assert.equal(sayiYaz(-4.5, 1), '−4,5');
  assert.equal(degerYaz(29.73, GOSTERGELER.find((g) => g.k === 'tufe')), '%29,7');
  assert.equal(degerYaz(6.27, GOSTERGELER.find((g) => g.k === 'reel')), '+6,3 puan');
  assert.equal(degerYaz(-450, GOSTERGELER.find((g) => g.k === 'faizDegisim')), '−450 baz puan');
  assert.equal(medyan([3, 1, 2, 4]), 2.5);
});
