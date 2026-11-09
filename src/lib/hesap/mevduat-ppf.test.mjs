import test from 'node:test';
import assert from 'node:assert/strict';
import { mevduatStopajOrani, mevduatHesapla, ppfHesapla, karsilastir } from './mevduat-ppf.mjs';

test('mevduatStopajOrani: vade dilimlerine göre doğru stopaj döndürür', () => {
  assert.equal(mevduatStopajOrani(32), 0.10);
  assert.equal(mevduatStopajOrani(180), 0.10);
  assert.equal(mevduatStopajOrani(181), 0.075);
  assert.equal(mevduatStopajOrani(365), 0.075);
  assert.equal(mevduatStopajOrani(366), 0.05);
});

test('mevduatHesapla: 100.000 TL, %45 faiz, 32 gün', () => {
  const r = mevduatHesapla({ anapara: 100_000, yillikFaiz: 45, gun: 32 });
  // Brut = 100000 * 0.45 * 32 / 365 = 3945.205
  assert.ok(Math.abs(r.brutKazanc - 3945.21) < 0.1);
  assert.equal(r.stopajOrani, 0.10);
  // Net = Brut * 0.90 = 3550.68
  assert.ok(Math.abs(r.netKazanc - 3550.68) < 0.1);
  assert.equal(r.netYillikOran, 40.5); // 45 * 0.9
});

test('ppfHesapla: günlük bileşik nemalanma hesabı', () => {
  const r = ppfHesapla({ anapara: 100_000, yillikGetiri: 45, gun: 32 });
  assert.ok(r.brutKazanc > 0);
  assert.equal(r.stopajOrani, 0.10);
  assert.ok(r.netKazanc > 0);
  // Günlük bileşik faiz basit mevduat faizinden biraz daha yüksek getirmelidir
  const mev = mevduatHesapla({ anapara: 100_000, yillikFaiz: 45, gun: 32 });
  assert.ok(r.netKazanc >= mev.netKazanc);
});

test('karsilastir: aynı oranlarda günlük bileşik sebebiyle PPF önde çıkar', () => {
  const k = karsilastir({ anapara: 100_000, mevduatFaizi: 45, ppfGetirisi: 45, gun: 32 });
  assert.equal(k.kazanan, 'ppf');
  assert.ok(k.farkTL > 0);
});

test('karsilastir: mevduat faizi belirgin yüksekse mevduat önde çıkar', () => {
  const k = karsilastir({ anapara: 100_000, mevduatFaizi: 50, ppfGetirisi: 42, gun: 32 });
  assert.equal(k.kazanan, 'mevduat');
  assert.ok(k.farkTL > 0);
});
