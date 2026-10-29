import test from 'node:test';
import assert from 'node:assert/strict';
import { ekk, normalDF, siraliProbit, yuzdelik } from './istatistik.mjs';
import { ekkSinama, karne, dieboldMariano, yillikYol, taylorVaryantlari, ppkKararlari, markovOlasilik, brier, ak } from './modeller.mjs';
import { arsiveEkle, canliKarne } from './arsiv.mjs';

const yakin = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);

test('ekk doğrusal ilişkiyi bulur', () => {
  const X = [1, 2, 3, 4, 5, 6].map((x) => [1, x]);
  const y = [3, 5, 7, 9, 11, 13.0001];
  const m = ekk(X, y);
  yakin(m.beta[0], 1, 1e-3);
  yakin(m.beta[1], 2, 1e-3);
});

test('normal dağılım fonksiyonu', () => {
  yakin(normalDF(0), 0.5, 1e-7);
  yakin(normalDF(1.959964), 0.975, 1e-6);
  yakin(normalDF(-1.281552), 0.1, 1e-6);
});

test('yüzdelik doğrusal ara değerle', () => {
  assert.equal(yuzdelik([1, 2, 3, 4, 5], 0.5), 3);
  yakin(yuzdelik([0, 10], 0.8), 8);
});

test('sıralı probit olasılıkları toplamı 1, yönü doğru', () => {
  const X = [];
  const y = [];
  for (let i = -10; i <= 10; i++) {
    X.push([i / 5]);
    y.push(i < -3 ? 0 : i > 3 ? 2 : 1);
  }
  const m = siraliProbit(X, y, { lambda: 0.1 });
  const p = m.olasilik([2]);
  yakin(p[0] + p[1] + p[2], 1, 1e-9);
  assert.ok(p[2] > p[0]);
  assert.ok(m.olasilik([-2])[0] > m.olasilik([-2])[2]);
});

test('genişleyen pencere geleceği görmez', () => {
  // y_t = 2·x_t; son gözlemde x değişse de tahmin yalnız öncekilerden kurulur.
  const gozlemler = Array.from({ length: 50 }, (_, i) => ({ t: i, y: 2 * i, x: [1, i], bazlar: { sifir: 0 } }));
  gozlemler.push({ t: 50, y: null, x: [1, 50], bazlar: { sifir: 0 } });
  const s = ekkSinama(gozlemler, { basla: 40, enAz: 10 });
  assert.equal(s.sonuclar[0].t, 40);
  yakin(s.simdi.tahmin, 100, 1e-6);
  assert.ok(s.sonuclar.every((r) => r.t >= 40));
});

test('kapı: tabandan kötü model geçemez', () => {
  const sonuclar = Array.from({ length: 60 }, (_, i) => ({
    t: i,
    gercek: i % 2,
    tahmin: 0.5 + (i % 3) * 0.3,
    a80: [-1, 2],
    a95: [-2, 3],
    bazlar: { iyi: i % 2 },
  }));
  const k = karne(sonuclar, ['iyi']);
  assert.equal(k.gecti, false);
  assert.equal(k.enIyiBaz, 'iyi');
});

test('kapı: tabandan anlamlı biçimde iyi model geçer', () => {
  const sonuclar = Array.from({ length: 60 }, (_, i) => ({
    t: i,
    gercek: Math.sin(i),
    tahmin: Math.sin(i) + 0.01 * ((i % 3) - 1),
    a80: [-2, 2],
    a95: [-3, 3],
    bazlar: { kotu: 0 },
  }));
  const k = karne(sonuclar, ['kotu']);
  assert.equal(k.gecti, true);
  assert.ok(k.dm.kotu.p < 0.1);
});

test('kapı: tüm dönemde iyi ama son 24 ayda kötü model geçemez', () => {
  const sonuclar = Array.from({ length: 100 }, (_, i) => ({
    t: i,
    gercek: Math.sin(i),
    tahmin: i < 76 ? Math.sin(i) : Math.sin(i) + 1,
    a80: [-2, 2],
    a95: [-3, 3],
    bazlar: { baz: Math.sin(i) + 0.5 * ((i % 2) * 2 - 1) },
  }));
  const k = karne(sonuclar, ['baz']);
  assert.ok(k.tum.model < k.tum.bazlar.baz);
  assert.equal(k.gecti, false);
});

test('Diebold-Mariano: sıfır farkta p = 0,5', () => {
  yakin(dieboldMariano([1, -1, 1, -1]).p, 0.5, 1e-6);
});

test('yıllık yol: sabit %1 aylık enflasyon yıllıkta %12,68', () => {
  const yol = yillikYol(Array(11).fill(1), [1]);
  yakin(yol[0], 12.6825, 1e-3);
});

test('Taylor varyantları: 12 varyant, formül', () => {
  const v = taylorVaryantlari(30, 24);
  assert.equal(v.length, 12);
  const bir = v.find((x) => x.kaynak === 'tufe' && x.r === 2 && x.a === 0.5);
  yakin(bir.faiz, 2 + 30 + 0.5 * 25);
});

test('PPK kararlarının yönü faiz tablosundan', () => {
  const kararlar = ppkKararlari({
    belgeler: [
      { id: 'a', tur: 'karar', tarih: '2025-01-23' },
      { id: 'b', tur: 'karar', tarih: '2025-02-20' },
      { id: 'c', tur: 'ozet', tarih: '2025-02-27' },
    ],
    puanlar: { a: { ileriYon: -1 }, b: { ileriYon: 0 } },
    faizGecmisi: [
      { tarih: '2024-12-27', oran: 47.5 },
      { tarih: '2025-01-24', oran: 45 },
    ],
    beklenti: [{ yil: 2025, ay: 1, ay12: 25 }],
  });
  assert.deepEqual(kararlar.map((k) => k.yon), [0, 1]);
  assert.equal(kararlar[1].pka12, 25);
});

test('Markov tabanı ve Brier puanı', () => {
  const p = markovOlasilik([{ son: 1, y: 1 }, { son: 1, y: 1 }, { son: 0, y: 0 }], 1);
  yakin(p[1], 3 / 5);
  yakin(brier([0, 1, 0], 1), 0);
  yakin(brier([1, 0, 0], 2), 2);
});

test('arşiv yalnız ekler, var olan kaydı değiştirmez', () => {
  const arsiv = { aciklama: 'x', kayitlar: [{ surum: 'cari-v1', hedef: '2026-09', tahmin: 1 }] };
  const yeni = arsiveEkle(arsiv, [
    { surum: 'cari-v1', hedef: '2026-09', tahmin: 999 },
    { surum: 'cari-v1', hedef: '2026-10', tahmin: 2 },
  ]);
  assert.equal(yeni.kayitlar.length, 2);
  assert.equal(yeni.kayitlar[0].tahmin, 1);
  const ayni = arsiveEkle(yeni, [{ surum: 'cari-v1', hedef: '2026-10', tahmin: 3 }]);
  assert.equal(ayni, yeni);
});

test('canlı karne gerçekleşeni gelenleri ölçer', () => {
  const k = canliKarne(
    [
      { hedef: 'a', tahmin: 1, a80: [0, 2], a95: [-1, 3] },
      { hedef: 'b', tahmin: 1, a80: [0, 2], a95: [-1, 3] },
    ],
    (k) => (k.hedef === 'a' ? 4 : null),
  );
  assert.equal(k.n, 1);
  assert.equal(k.rmse, 3);
  assert.equal(k.kapsama80, 0);
});

test('ay anahtarı', () => {
  assert.equal(ak({ yil: 2026, ay: 1 }) + 11, ak({ yil: 2026, ay: 12 }));
});
