import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dilim,
  donemDegisimleri,
  ecbAyristir,
  fredAyristir,
  gamaUst,
  gunlukBirlestir,
  gunlukJson,
  haftaSonlari,
  holm,
  kayanOynaklik,
  kruskalWallis,
  logGetiriler,
  mannWhitney,
  aylikDegisimler,
  seriHesapla,
} from './kur-oynakligi.mjs';

const yakin = (a, b, e = 1e-4) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('dilim: doğrusal aradeğer (R type 7)', () => {
  yakin(dilim([1, 2, 3, 4], 0.5), 2.5);
  yakin(dilim([1, 2, 3, 4, 5], 0.1), 1.4);
});

test('Mann-Whitney ve Kruskal-Wallis scipy ile aynı', () => {
  // scipy.stats.mannwhitneyu(a, b, method='asymptotic', use_continuity=True) → U = 3, p = 0.03576
  const a = [1.1, 2.3, 0.4, 1.8, 2.9];
  const b = [3.2, 4.1, 2.5, 3.8, 5.0, 2.2];
  const mw = mannWhitney(a, b);
  assert.equal(mw.u, 3);
  yakin(mw.p, 0.03576);
  // scipy.stats.kruskal(a, b, [0.5, 0.7, 0.9]) → H = 8.3143, p = 0.01565
  const kw = kruskalWallis([a, b, [0.5, 0.7, 0.9]]);
  yakin(kw.h, 8.3143);
  yakin(kw.p, 0.01565);
});

test('üst eksik gama: ki-kare kuyruğu', () => {
  // P(χ²(11) > 19.675) = 0.05
  yakin(gamaUst(5.5, 19.675 / 2), 0.05, 1e-4);
  yakin(gamaUst(2, 1e-9), 1, 1e-6);
});

test('Holm düzeltmesi sıralı ve tekdüze', () => {
  assert.deepEqual(holm([0.01, 0.04, 0.03]).map((p) => Math.round(p * 1000) / 1000), [0.03, 0.06, 0.06]);
});

test('oynaklık: sabit oranlı artışta sıfır', () => {
  const g = Array.from({ length: 40 }, (_, i) => [`2025-01-${String(i + 1).padStart(2, '0')}`, 1.01 ** i]);
  const v = kayanOynaklik(logGetiriler(g), 30);
  assert.equal(v.length, 10);
  yakin(v.at(-1).v, 0);
});

test('21 günlük değişim ve aylık değişim; bitmemiş ay atılır', () => {
  const g = [
    ['2025-01-30', 100],
    ['2025-01-31', 110],
    ['2025-02-28', 121],
    ['2025-03-03', 130],
  ];
  assert.deepEqual(
    aylikDegisimler(g).map((x) => [x.ay, Math.round(x.d * 100) / 100]),
    [[2, 10]],
  );
  yakin(donemDegisimleri(g, 2)[0].d, 21);
});

test('haftaSonlari her haftanın son gözlemini alır', () => {
  const h = haftaSonlari([{ tarih: '2026-10-19' }, { tarih: '2026-10-23' }, { tarih: '2026-10-26' }]);
  assert.deepEqual(h.map((x) => x.tarih), ['2026-10-23', '2026-10-26']);
});

test('ertesi gün tarihli seride haftanın günü önceki gözlemden', () => {
  // Çarşamba tarihli değişim salı belirlenen kurdur.
  const g = Array.from({ length: 1200 }, (_, i) => {
    const d = new Date(Date.UTC(2020, 0, 6) + i * 86400000);
    return [d.toISOString().slice(0, 10), 1 + (i % 7 === 2 ? 0.01 : 0) + i * 1e-4 + Math.sin(i) * 1e-3];
  }).filter((x) => ![0, 6].includes(new Date(x[0]).getUTCDay()));
  const a = seriHesapla(g);
  const b = seriHesapla(g, { ertesiGunTarihli: true });
  assert.equal(a.gun.satirlar.length, 5);
  assert.notDeepEqual(a.gun.satirlar.map((s) => s.ortalama), b.gun.satirlar.map((s) => s.ortalama));
});

test('kaynak ayrıştırma ve birleştirme', () => {
  const f = fredAyristir('observation_date,DTWEXBGS\n2026-10-22,121.1\n2026-10-23,.\n');
  assert.deepEqual([...f], [['genisDolar|2026-10-22', 121.1]]);
  const e = ecbAyristir('KEY,FREQ,TIME_PERIOD,OBS_VALUE\nEXR.D,D,2026-10-22,1.12\n');
  assert.deepEqual([...e], [['eurusd|2026-10-22', 1.12]]);
  const s = gunlukBirlestir([['2026-10-22', 40, 45, null, 1.1]], new Map([...f, ...e, ['usdtry|2026-10-23', 41]]));
  assert.deepEqual(s, [
    ['2026-10-22', 40, 45, 121.1, 1.12],
    ['2026-10-23', 41, null, null, null],
  ]);
  assert.match(gunlukJson({ kaynaklar: [], sutunlar: [], satirlar: s }), /\n {4}\["2026-10-23",41,null,null,null\]\n/);
});
