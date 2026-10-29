import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARIF, maliyet, salataSerisi, paylar } from './coban-salatasi.mjs';
import { oncekiAy } from './gida.mjs';

const ay = (urunler, gun = 10) => ({ gunler: Array.from({ length: gun }, (_, i) => `x${i}`), urunler });
// Tarifin her kalemi için ilk tercih anahtarı f katsayısıyla fiyatlanır: domates 10f, salatalık 20f, ...
const tam = (f) => Object.fromEntries(TARIF.map((k, i) => [k.anahtarlar[0], [10 * (i + 1) * f, 10]]));

test('tarif: altı kalem, hepsi kilo ya da bağ, miktarlar pozitif', () => {
  assert.equal(TARIF.length, 6);
  for (const k of TARIF) {
    assert.ok(k.miktar > 0);
    assert.ok(['KG', 'BAĞ'].includes(k.birim));
    assert.ok(k.anahtarlar.every((a) => a.endsWith(`|${k.birim}`)), k.ad);
  }
});

test('maliyet: miktar × fiyat toplamı, ilk bulunan anahtar kullanılır', () => {
  const m = maliyet(tam(1));
  const beklenen = TARIF.reduce((p, k, i) => p + k.miktar * 10 * (i + 1), 0);
  assert.ok(Math.abs(m.toplam - beklenen) < 1e-9);
  assert.equal(m.kalemler.length, 6);
  assert.equal(m.kalemler[0].anahtar, TARIF[0].anahtarlar[0]);
  // Birinci tercih yoksa ikinciye düşer
  const u = tam(1);
  delete u[TARIF[0].anahtarlar[0]];
  u[TARIF[0].anahtarlar[1]] = [40, 10];
  const m2 = maliyet(u);
  assert.equal(m2.kalemler[0].anahtar, TARIF[0].anahtarlar[1]);
  assert.equal(m2.kalemler[0].fiyat, 40);
});

test('maliyet: bir kalem hiç yoksa ay hesaplanmaz', () => {
  const u = tam(1);
  for (const a of TARIF[4].anahtarlar) delete u[a];
  assert.equal(maliyet(u), null);
});

test('seri: yıllık değişim on iki ay öncesiyle, aylık geçen ayla, 12 aylık ortalama tam yılda', () => {
  const aylar = {};
  for (let i = 0; i < 13; i++) aylar[oncekiAy('2026-01', 12 - i)] = ay(tam(1.1 ** i));
  const s = salataSerisi(aylar);
  assert.equal(s.length, 13);
  assert.equal(s[0].ay, '2025-01');
  assert.equal(s[0].yillik, null);
  assert.equal(s[0].aylik, null);
  assert.equal(s[0].ort12, null);
  assert.ok(Math.abs(s[1].aylik - 10) < 1e-9);
  assert.ok(Math.abs(s.at(-1).yillik - 100 * (1.1 ** 12 - 1)) < 1e-6);
  assert.ok(Math.abs(s[11].ort12 - s.slice(0, 12).reduce((p, r) => p + r.toplam, 0) / 12) < 1e-9);
  assert.equal(s.at(-1).t, 2026 * 12);
  // Kalem bazında yıllık değişim: her kalem %x pahalanmış
  assert.ok(Math.abs(s.at(-1).kalemler[0].yillik - 100 * (1.1 ** 12 - 1)) < 1e-6);
});

test('seri: hesaplanamayan ay atlanır, zincir kopmaz', () => {
  const eksik = tam(1);
  delete eksik[TARIF[3].anahtarlar[0]];
  const aylar = { '2025-01': ay(tam(1)), '2025-02': ay(eksik), '2025-03': ay(tam(1.2)) };
  const s = salataSerisi(aylar);
  assert.deepEqual(
    s.map((r) => r.ay),
    ['2025-01', '2025-03'],
  );
  assert.equal(s[1].aylik, null); // 2025-02 yok
});

test('paylar yüzde ve toplamı 100', () => {
  const p = paylar(maliyet(tam(1)).kalemler);
  assert.ok(Math.abs(p.reduce((a, b) => a + b.pay, 0) - 100) < 1e-9);
  assert.equal(p[0].ad, TARIF[0].ad);
});

test('gerçek veri: 2019’dan beri her ay hesaplanıyor, tutar makul', () => {
  const veri = JSON.parse(readFileSync(new URL('../data/hal-fiyat.json', import.meta.url), 'utf8'));
  const s = salataSerisi(veri.aylar);
  assert.equal(s.length, Object.keys(veri.aylar).length);
  for (const r of s) assert.ok(r.toplam > 0 && r.toplam < 10000, `${r.ay}: ${r.toplam}`);
  assert.ok(s.at(-1).toplam > s[0].toplam);
});
