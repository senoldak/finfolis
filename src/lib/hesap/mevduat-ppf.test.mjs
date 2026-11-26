import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PPF_STOPAJ_ORANI, karsilastir, mevduatHesapla, mevduatStopajOrani, ppfHesapla } from './mevduat-ppf.mjs';

test('mevduatStopajOrani: CK 10041 oranları (6 ay = 182 gün varsayımı)', () => {
  assert.equal(mevduatStopajOrani(32), 0.175);
  assert.equal(mevduatStopajOrani(182), 0.175);
  assert.equal(mevduatStopajOrani(183), 0.15);
  assert.equal(mevduatStopajOrani(365), 0.15);
  assert.equal(mevduatStopajOrani(366), 0.1);
  assert.equal(PPF_STOPAJ_ORANI, 0.175);
});

test('mevduatHesapla: 100.000 TL, %40 faiz, 32 gün', () => {
  const r = mevduatHesapla({ anapara: 100_000, yillikFaiz: 40, gun: 32 });
  assert.ok(Math.abs(r.brutKazanc - 3506.85) < 0.01);
  assert.ok(Math.abs(r.stopaj - 613.70) < 0.01);
  assert.ok(Math.abs(r.netKazanc - 2893.15) < 0.01);
  assert.equal(r.netYillikOran, 33);
});

test('ppfHesapla: günlük bileşik varsayımı ve %17,5 stopaj', () => {
  const r = ppfHesapla({ anapara: 100_000, yillikGetiri: 40, gun: 32 });
  assert.ok(r.brutKazanc > 3506.85);
  assert.ok(Math.abs(r.stopaj - r.brutKazanc * 0.175) < 1e-9);
});

test('karsilastir: fark işaretli döner; geçersiz girdi sıfır', () => {
  const k = karsilastir({ anapara: 100_000, mevduatFaizi: 40, ppfGetirisi: 40, gun: 32 });
  assert.ok(k.farkTL > 0);
  assert.ok(karsilastir({ anapara: 100_000, mevduatFaizi: 45, ppfGetirisi: 35, gun: 32 }).farkTL < 0);
  assert.equal(mevduatHesapla({ anapara: 0, yillikFaiz: 40, gun: 32 }).netKazanc, 0);
});
