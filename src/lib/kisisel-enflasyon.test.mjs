import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normallestir, kisiselYillik, kisiselSeri, grupKatkilari, tutarlardanPay, kolayBaslangic, adresCoz, adresYaz, GRUP_SAYISI,
} from './kisisel-enflasyon.mjs';

const veri = JSON.parse(readFileSync(new URL('../data/enflasyon-katkilari.json', import.meta.url), 'utf-8'));
const E = veri.endeksler;
const tuik = veri.gruplar.map((g) => g.agirlik);

// Elle kurulan küçük örnek: ilk iki grup değişir, öbür 11 grup sabit.
function mini() {
  const g = (a, b) => [a, b, ...Array(11).fill(100)];
  const endeks = [];
  for (let k = 0; k < 13; k++) endeks.push({ yil: 2025 + Math.floor(k / 12), ay: (k % 12) + 1, genel: 100, g: g(100, 100) });
  endeks[12].g = g(120, 110); // 12 ay sonra: grup1 +%20, grup2 +%10
  return endeks;
}

test('elle hesap: %50 / %50 pay, %20 ve %10 artış → %15', () => {
  const w = normallestir([50, 50, ...Array(11).fill(0)]);
  assert.ok(Math.abs(kisiselYillik(mini(), w, 12) - 15) < 1e-9);
  const k = grupKatkilari(mini(), w);
  assert.ok(Math.abs(k[0].katki - 10) < 1e-9 && Math.abs(k[1].katki - 5) < 1e-9);
  assert.ok(Math.abs(k.reduce((a, b) => a + b.katki, 0) - 15) < 1e-9);
});

test('tek gruba tam ağırlık: kişisel enflasyon o grubun yıllık değişimi', () => {
  const w = normallestir([0, 100, ...Array(11).fill(0)]);
  assert.ok(Math.abs(kisiselYillik(mini(), w, 12) - 10) < 1e-9);
});

test('TL tutarlar paya çevrilir; toplam ölçekten bağımsız', () => {
  const a = tutarlardanPay([1000, 3000, ...Array(11).fill(0)]);
  assert.ok(Math.abs(a[0] - 25) < 1e-9 && Math.abs(a[1] - 75) < 1e-9);
  assert.deepEqual(normallestir([1, 1, ...Array(11).fill(0)]), normallestir([50, 50, ...Array(11).fill(0)]));
});

test('geçersiz girdi hata verir', () => {
  assert.throws(() => normallestir([1, 2]), /13/);
  assert.throws(() => normallestir(Array(13).fill(0)), /Toplam/);
  assert.throws(() => normallestir([-1, ...Array(12).fill(1)]), /sıfırdan küçük/);
  assert.throws(() => normallestir([NaN, ...Array(12).fill(1)]), /sayı/);
  assert.throws(() => kisiselYillik(mini().slice(0, 5), normallestir(Array(13).fill(1)), 4), /12 ay/);
});

test('doğrulama: TÜİK ağırlıklarıyla kişisel yıllık, manşete son ayda ≤0,3 puan yakın', () => {
  assert.equal(E.length, 25);
  const son = kisiselYillik(E, normallestir(tuik));
  const manset = veri.satirlar.at(-1).manset.yillik;
  const fark = son - manset;
  console.log(`  TÜİK ağırlıklarıyla kişisel ${son.toFixed(2)} / manşet ${manset} / fark ${fark.toFixed(2)} puan`);
  assert.ok(Math.abs(fark) <= 0.3, `fark ${fark}`);
});

test('doğrulama: son 12 ayın hepsinde fark ≤1 puan (eski aylarda 2026 ağırlığı kullanıldığı için daha büyük)', () => {
  const seri = kisiselSeri(E, normallestir(tuik), 12);
  assert.equal(seri.length, 12);
  for (const s of seri) assert.ok(Math.abs(s.kisisel - s.manset) <= 1, `${s.yil}-${s.ay} fark ${s.kisisel - s.manset}`);
  assert.deepEqual([seri.at(-1).yil, seri.at(-1).ay], [veri.sonAy.yil, veri.sonAy.ay]);
});

test('kolay mod: yalnız "hayır" denen grup sıfırlanır, kalanlar orantılı büyür, toplam 100', () => {
  const tam = kolayBaslangic(tuik, veri.gruplar, {});
  assert.ok(Math.abs(tam.reduce((a, b) => a + b, 0) - 100) < 1e-9);
  const b = kolayBaslangic(tuik, veri.gruplar, { egitim: false, alkolTutun: false });
  assert.equal(b[9], 0);
  assert.equal(b[1], 0);
  assert.ok(Math.abs(b.reduce((a, c) => a + c, 0) - 100) < 1e-9);
  assert.ok(Math.abs(b[0] / b[2] - tuik[0] / tuik[2]) < 1e-9);
  assert.ok(Math.abs(b[3] / b[6] - tuik[3] / tuik[6]) < 1e-9);
});

test('adres: yaz-çöz gidiş dönüş; bozuk adres null', () => {
  const d = [24.44, 2.75, 7.9, 11.4, 7.92, 2.79, 16.62, 3.1, 4.34, 2.02, 11.13, 1.07, 4.49];
  const a = adresCoz(adresYaz('y', d));
  assert.equal(a.mod, 'y');
  assert.deepEqual(a.degerler, d);
  assert.equal(adresCoz(adresYaz('t', d)).mod, 't');
  assert.equal(adresCoz('?w=1,2,3'), null);
  assert.equal(adresCoz('?w=' + Array(13).fill('x').join(',')), null);
  assert.equal(adresCoz('?w=' + Array(13).fill('0').join(',')), null);
  assert.equal(adresCoz('?w=' + Array(13).fill('-1').join(',')), null);
  assert.equal(adresCoz(''), null);
  assert.equal(GRUP_SAYISI, 13);
});
