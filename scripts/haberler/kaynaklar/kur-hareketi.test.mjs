import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import kur from './kur-hareketi.mjs';
import { kapakCiz } from '../../kapak/kapak.mjs';

const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const SIMDI = new Date('2026-10-10T09:00:00Z');
// Frankfurter USD bazlı iki iş günü: USD/JPY +%2,0; USD/BRL ve EUR/USD eşik altı.
const FRANKFURTER = JSON.stringify({
  base: 'USD',
  rates: { '2026-10-08': { JPY: 155.1, BRL: 5.0, EUR: 0.89 }, '2026-10-09': { JPY: 158.2, BRL: 5.005, EUR: 0.8924 } },
});
const sahte = (govde, durum = 200) => {
  globalThis.fetch = async () => new Response(govde, { status: durum });
};

const piyasa = JSON.parse(readFileSync(new URL('./fixtures/piyasa-brl.json', import.meta.url), 'utf8'));

test('yüzde 1,5 ve üzeri günlük kur hareketi aday olur', async () => {
  sahte(FRANKFURTER);
  const adaylar = await kur.hent({ piyasa, simdi: SIMDI });
  assert.equal(kur.ad, 'kur-hareketi');
  // brl +2,0 ve euro -1,5 aday; yen 1,4 eşik altı; dolar küçük; faiz kur değil.
  assert.deepEqual(adaylar.map((a) => a.id).sort(), ['kur:brl:2026-10-09', 'kur:euro:2026-10-09', 'kur:usdjpy:2026-10-09']);
  const brl = adaylar.find((a) => a.id === 'kur:brl:2026-10-09');
  assert.equal(brl.onem, 4);
  assert.equal(brl.kategori, 'doviz');
  assert.match(brl.baslik, /Brezilya reali/);
  assert.match(brl.kaynakMetni, /7\.8123/);
  assert.match(brl.kaynakMetni, /2\.0/);
  assert.equal(brl.kaynaklar[0].url, 'https://www.frankfurter.dev/');
  assert.equal(brl.tarih.toISOString(), '2026-10-08T21:00:00.000Z');
  const png = await kapakCiz(brl.kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('USD/JPY çaprazı yuvarlanmamış Frankfurter verisinden hesaplanır', async () => {
  sahte(FRANKFURTER);
  const adaylar = await kur.hent({ simdi: SIMDI });
  assert.equal(adaylar.length, 1);
  const a = adaylar[0];
  assert.equal(a.id, 'kur:usdjpy:2026-10-09');
  assert.equal(a.onem, 4);
  assert.match(a.baslik, /USD\/JPY günde yüzde 2,0 yükseldi/);
  assert.match(a.kaynakMetni, /158\.2000/);
  assert.match(a.kaynakMetni, /155\.1000/);
  assert.match(a.kaynakMetni, /\+2\.0%/);
  assert.equal((await kapakCiz(a.kapak)).subarray(1, 4).toString(), 'PNG');
});

test('EUR/USD, USD->EUR kurunun tersinden hesaplanır', async () => {
  sahte(JSON.stringify({ rates: { '2026-10-08': { EUR: 0.9 }, '2026-10-09': { EUR: 0.88 } } }));
  const [a] = await kur.hent({ simdi: SIMDI });
  assert.equal(a.id, 'kur:eurusd:2026-10-09');
  assert.match(a.baslik, /EUR\/USD günde yüzde 2,3 yükseldi/);
});

test('çapraz kur alınamazsa TL çiftleri yine döner', async () => {
  sahte('hata', 500);
  const adaylar = await kur.hent({ piyasa, simdi: SIMDI });
  assert.equal(adaylar.length, 2);
});

test('veri yoksa ya da değişim yoksa boş döner', async () => {
  sahte(JSON.stringify({ rates: { '2026-10-08': { JPY: 155, BRL: 5, EUR: 0.9 }, '2026-10-09': { JPY: 155, BRL: 5, EUR: 0.9 } } }));
  assert.deepEqual(await kur.hent({ simdi: SIMDI }), []);
  assert.deepEqual(await kur.hent({ simdi: SIMDI, piyasa: { gostergeler: [{ id: 'brl', deger: 1 }] } }), []);
});
