import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriBirlestir, seriOkuyucu } from './yahoo-seri.mjs';

test('seriBirlestir: tarih eşler, eksik günde önceki değeri (en fazla 5 gün) kullanır', () => {
  const a = [
    { tarih: '2026-01-02', deger: 100 },
    { tarih: '2026-01-05', deger: 110 },
    { tarih: '2026-01-20', deger: 120 },
  ];
  const b = [
    { tarih: '2026-01-01', deger: 2 },
    { tarih: '2026-01-05', deger: 4 },
  ];
  assert.deepEqual(seriBirlestir(a, b, (x, y) => x / y), [
    { tarih: '2026-01-02', deger: 50 },
    { tarih: '2026-01-05', deger: 27.5 },
  ]);
});

test('okuyucu: aynı sembol bir kez indirilir; türetilmiş seri pay/payda', async () => {
  const istekler = [];
  const yanit = (degerler) => ({
    chart: { result: [{ meta: { exchangeTimezoneName: 'UTC' }, timestamp: degerler.map((_, i) => Date.UTC(2026, 0, 5 + i) / 1000), indicators: { quote: [{ close: degerler }] } }] },
  });
  const hent = async (url) => {
    istekler.push(url);
    return url.includes('XU100') ? yanit([1000, 1100]) : yanit([40, 50]);
  };
  const o = seriOkuyucu(new Date('2026-02-01T00:00:00Z'), { hent });
  const s = await o.seri({ turet: 'bistusd' });
  await o.seri({ sembol: 'XU100.IS' });
  assert.deepEqual(s.map((p) => p.deger), [25, 22]);
  assert.equal(istekler.filter((u) => u.includes('XU100')).length, 1);
});
