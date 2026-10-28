import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yilliklandir, kurHizi, enflasyonHizi, reelFaiz, ayinFaizi, kiraCarpani, kayanToplam, kumulatif } from './turetilmis.mjs';

const yakin = (a, b, hata = 1e-9) => assert.ok(Math.abs(a - b) < hata, `${a} ≈ ${b}`);

test('yilliklandir: aylık %1 yılda %12,68', () => {
  yakin(yilliklandir(1, 12), 12.682503013196977);
  yakin(yilliklandir(0, 12), 0);
});

test('kurHizi: 4 haftada %1 artış yılda (1,01)^13 − 1; ilk 4 hafta çıkmaz', () => {
  const s = [100, 100, 100, 100, 101, 101].map((usd, i) => ({ tarih: `2026-01-0${i + 1}`, usd }));
  const h = kurHizi(s, 'usd', 4);
  assert.equal(h.length, 2);
  assert.equal(h[0].tarih, '2026-01-05');
  yakin(h[0].hiz, (1.01 ** 13 - 1) * 100);
});

test('enflasyonHizi: hız arındırılmış aylıktan; ham aylık ve yıllık aynen; eksik ayda null', () => {
  const tufe = [
    { yil: 2026, ay: 1, yillik: 30, aylik: 5 },
    { yil: 2026, ay: 2, yillik: 29, aylik: 1 },
    { yil: 2026, ay: 3, yillik: 28, aylik: 3 },
    { yil: 2026, ay: 4, yillik: 27, aylik: 2 },
  ];
  const ma = [
    { yil: 2026, ay: 1, aylik: 2 },
    { yil: 2026, ay: 2, aylik: 1 },
    { yil: 2026, ay: 3, aylik: 3 },
  ];
  const h = enflasyonHizi(tufe, ma);
  assert.equal(h[1].ucAylikHiz, null);
  yakin(h[0].aylikHiz, (1.02 ** 12 - 1) * 100);
  yakin(h[2].ucAylikHiz, ((1.02 * 1.01 * 1.03) ** 4 - 1) * 100);
  assert.deepEqual([h[2].yillik, h[2].aylik, h[2].maAylik], [28, 3, 3]);
  assert.equal(h[3].aylikHiz, null);
  assert.equal(h[3].ucAylikHiz, null);
});

test('reelFaiz: Fisher denklemi', () => {
  yakin(reelFaiz(40, 30), (1.4 / 1.3 - 1) * 100);
  assert.ok(reelFaiz(20, 30) < 0);
});

test('ayinFaizi: ayın son günü geçerli oran; ay ortasındaki karar o ayı belirler', () => {
  const g = [
    { tarih: '2026-01-23', oran: 38 },
    { tarih: '2026-03-12', oran: 37 },
  ];
  assert.equal(ayinFaizi(g, 2025, 12), null);
  assert.equal(ayinFaizi(g, 2026, 1), 38);
  assert.equal(ayinFaizi(g, 2026, 2), 38);
  assert.equal(ayinFaizi(g, 2026, 3), 37);
});

test('kiraCarpani: 60.000 TL/m² fiyat, 250 TL/m² aylık kira 20 yıl', () => {
  assert.equal(kiraCarpani(60000, 250), 20);
});

test('kayanToplam: son n dönem, ilk n − 1 satır null', () => {
  const s = [1, 2, 3, 4].map((v) => ({ v }));
  assert.deepEqual(kayanToplam(s, 'v', 3), [null, null, 6, 9]);
  assert.deepEqual(kayanToplam(s, 'v', 1), [1, 2, 3, 4]);
});

test('kumulatif: baştan birikimli toplam', () => {
  assert.deepEqual(kumulatif([1, -2, 5].map((v) => ({ v })), 'v'), [1, -1, 4]);
});
