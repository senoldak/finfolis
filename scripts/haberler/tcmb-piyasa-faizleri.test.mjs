import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aylikBasit,
  yuvarla,
  politikaFaiziBul,
  parseEvdsTarih,
  piyasaFaizleriniAl,
} from './tcmb-piyasa-faizleri.mjs';

test('aylikBasit: yıllık basit faizi 12ye böler ve 2 basamak yuvarlar', () => {
  assert.equal(aylikBasit(48), 4);
  assert.equal(aylikBasit(49.32), 4.11);
  assert.equal(aylikBasit(37.08), 3.09);
  assert.equal(aylikBasit(35.28), 2.94);
  assert.equal(aylikBasit(33), 2.75);
  assert.equal(aylikBasit(null), null);
});

test('parseEvdsTarih: hem DD-MM-YYYY hem YYYY-MM-DD destekler', () => {
  assert.equal(parseEvdsTarih('16-10-2026'), '2026-10-16');
  assert.equal(parseEvdsTarih('2026-10-16'), '2026-10-16');
  assert.equal(parseEvdsTarih(''), null);
});

test('politikaFaiziBul: verilen tarihte yürürlükte olan son repo oranını döner', () => {
  const gecmis = [
    { tarih: '2025-10-24', oran: 39.5 },
    { tarih: '2025-12-12', oran: 38.0 },
    { tarih: '2026-03-20', oran: 40.5 },
  ];
  assert.equal(politikaFaiziBul('2025-11-01', gecmis), 39.5);
  assert.equal(politikaFaiziBul('2025-12-12', gecmis), 38.0);
  assert.equal(politikaFaiziBul('2026-01-15', gecmis), 38.0);
  assert.equal(politikaFaiziBul('2026-04-01', gecmis), 40.5);
  assert.equal(politikaFaiziBul('2024-01-01', gecmis), 37.5); // eşleşme yoksa varsayılan
});

test('piyasaFaizleriniAl: mock EVDS yanıtını ayrıştırır ve satırları döner', async () => {
  const simdi = new Date('2026-10-23T12:00:00Z');
  const items = Array.from({ length: 10 }, (_, i) => ({
    Tarih: `${String(i + 1).padStart(2, '0')}-08-2026`,
    TP_KTF10: (48 + i * 0.1).toFixed(2),
    TP_KTF11: (34 + i * 0.1).toFixed(2),
    TP_KTF12: (35 + i * 0.1).toFixed(2),
    TP_TRY_MT02: (38 + i * 0.1).toFixed(2),
  }));

  const mockYanit = JSON.stringify({ items });
  const orjFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(mockYanit, { status: 200 });

  try {
    const res = await piyasaFaizleriniAl(simdi, 'test-key', [{ tarih: '2026-01-01', oran: 38 }]);
    assert.equal(res.satirlar.length, 10);
    assert.equal(res.satirlar[0].tarih, '2026-08-01');
    assert.equal(res.satirlar[0].ihtiyac, 48);
    assert.equal(res.satirlar[0].politika, 38);
    assert.ok(res.satirlar[0].mevduat > 0);
  } finally {
    globalThis.fetch = orjFetch;
  }
});
