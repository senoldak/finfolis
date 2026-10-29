import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRUPLAR, katkilariHesapla, katkiSerisi, sonEndeksler, sonTamAy } from './enflasyon-katkilari.mjs';

const N = GRUPLAR.length;
const ham = (yol) => JSON.parse(readFileSync(new URL(yol, import.meta.url), 'utf-8'));

// Yapay veri: grup endeksleri deterministik büyür; genel endeks zincirleme Laspeyres ile kurulur.
function yapay() {
  const agirlik = {};
  for (const y of [2023, 2024, 2025, 2026]) {
    const ham = GRUPLAR.map((_, i) => 1 + ((i * 7 + y) % 5));
    const top = ham.reduce((a, b) => a + b, 0);
    agirlik[y] = ham.map((v) => (v / top) * 100);
  }
  const grup = (i, k) => 100 * Math.pow(1 + 0.01 + i * 0.0015, k); // k: ay sayısı (2023-01 = 0)
  const endeks = [];
  let genelAralik = 100;
  for (let y = 2023; y <= 2026; y++) {
    const aralikOnceki = (y - 2023) * 12 - 1; // önceki Aralık'ın k değeri
    for (let a = 1; a <= 12; a++) {
      const k = (y - 2023) * 12 + a - 1;
      const g = GRUPLAR.map((_, i) => grup(i, k));
      let genel;
      if (y === 2023) genel = 100 + k; // ilk yılın genel endeksi serbest; yalnız Aralık bağlantısı için gerekir
      else {
        const gA = GRUPLAR.map((_, i) => grup(i, aralikOnceki));
        genel = genelAralik * g.reduce((s, v, i) => s + (agirlik[y][i] / 100) * (v / gA[i]), 0);
      }
      endeks.push({ yil: y, ay: a, genel, g });
      if (a === 12) genelAralik = genel;
    }
  }
  return { agirlik, endeks };
}

test('yıllık katkıların toplamı manşet yıllık değişime eşit (yapay veri, yuvarlamasız)', () => {
  const { agirlik, endeks } = yapay();
  for (const [y, a] of [[2025, 1], [2025, 7], [2025, 12], [2026, 3], [2026, 12]]) {
    const s = katkilariHesapla(endeks, agirlik, y, a);
    assert.ok(Math.abs(s.yillikFark) < 0.002, `${y}-${a} fark ${s.yillikFark}`);
    assert.ok(Math.abs(s.aylikFark) < 0.002, `${y}-${a} aylık fark ${s.aylikFark}`);
  }
});

test('katkiSerisi 24 ay verir, eskiden yeniye ve ay sınırlarını aşar', () => {
  const { agirlik, endeks } = yapay();
  const s = katkiSerisi(endeks, agirlik, 2026, 12, 24);
  assert.equal(s.length, 24);
  assert.deepEqual([s[0].yil, s[0].ay, s.at(-1).yil, s.at(-1).ay], [2025, 1, 2026, 12]);
});

test('eksik endeks ve 100 etmeyen ağırlık hata verir', () => {
  const { agirlik, endeks } = yapay();
  assert.throws(() => katkilariHesapla(endeks.slice(0, 20), agirlik, 2026, 6), /Endeks eksik/);
  assert.throws(() => katkilariHesapla(endeks, { ...agirlik, 2026: agirlik[2026].map((v) => v * 1.1) }, 2026, 6), /100 etmiyor/);
  assert.throws(() => katkilariHesapla(endeks, { ...agirlik, 2026: undefined }, 2026, 6), /Ağırlık eksik/);
});

test('sonTamAy: grubu eksik ya da ağırlığı olmayan ay sayılmaz', () => {
  const { agirlik, endeks } = yapay();
  const e = [...endeks, { yil: 2027, ay: 1, genel: 150, g: GRUPLAR.map(() => 120) }];
  assert.deepEqual(sonTamAy(e, agirlik), { yil: 2026, ay: 12 }); // 2027 ağırlığı yok
  const eksik = [...endeks, { yil: 2026, ay: 13, genel: 1, g: Array(N).fill(null) }];
  assert.deepEqual(sonTamAy(eksik, agirlik), { yil: 2026, ay: 12 });
});

test('kayıtlı veri: katkılar toplamı manşete ≤0,1 puan yakın ve resmi.json manşetiyle aynı', () => {
  const d = ham('../data/enflasyon-katkilari.json');
  const resmi = ham('../data/resmi.json').enflasyon.satirlar;
  assert.equal(d.satirlar.length, 24);
  assert.equal(d.gruplar.length, N);
  assert.ok(Math.abs(d.gruplar.reduce((a, g) => a + g.agirlik, 0) - 100) < 0.05);
  for (const s of d.satirlar) {
    assert.ok(Math.abs(s.yillikFark) <= 0.1, `${s.yil}-${s.ay} yıllık fark`);
    assert.ok(Math.abs(s.aylikFark) <= 0.1, `${s.yil}-${s.ay} aylık fark`);
    const r = resmi.find((x) => x.yil === s.yil && x.ay === s.ay);
    if (r) {
      assert.ok(Math.abs(r.yillik - s.manset.yillik) <= 0.011, `${s.yil}-${s.ay} yıllık manşet`);
      assert.ok(Math.abs(r.aylik - s.manset.aylik) <= 0.011, `${s.yil}-${s.ay} aylık manşet`);
    }
  }
});

test('sonEndeksler 25 ay verir, eskiden yeniye; eksik ayda hata', () => {
  const { endeks } = yapay();
  const e = sonEndeksler(endeks, 2026, 12, 25);
  assert.equal(e.length, 25);
  assert.deepEqual([e[0].yil, e[0].ay, e.at(-1).yil, e.at(-1).ay], [2024, 12, 2026, 12]);
  assert.equal(e[0].g.length, N);
  assert.throws(() => sonEndeksler(endeks.slice(0, 20), 2026, 6, 25), /Endeks eksik/);
});

test('kayıtlı JSON: endeksler son ayla biter ve manşet yıllığı genel endeksten tutar', () => {
  const v = ham('../data/enflasyon-katkilari.json');
  if (!v.endeksler) return;
  const e = v.endeksler;
  assert.equal(e.length, 25);
  assert.deepEqual([e.at(-1).yil, e.at(-1).ay], [v.sonAy.yil, v.sonAy.ay]);
  const yillik = (e.at(-1).genel / e[12].genel - 1) * 100;
  assert.ok(Math.abs(yillik - v.satirlar.at(-1).manset.yillik) < 0.01);
});
