import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aktarimKayitlari, aktar } from './gorulen-aktar.mjs';
import { motorKimlik } from './motor.mjs';

const ZAMAN = { zaman: '2026-10-12T00:00:00.000Z' };
const A = 'k111111:aaaaaaaaaaaaaaaa';
const B = 'k222222:bbbbbbbbbbbbbbbb';
const C = 'https://haber.example.com/x';
const havuzAcSahte = (kayitlar) => kayitlar.map((k) => k.acik);

test('havuzdaki olay ve üyeleri (adaylar[].id) aktarılmaz', () => {
  const durum = {
    gorulen: { [A]: ZAMAN, [B]: ZAMAN, [C]: ZAMAN },
    havuz: [{ id: 'olay1', sifreli: 'x', acik: { id: 'olay1', adaylar: [{ id: A }, { id: B }] } }],
  };
  const k = aktarimKayitlari(durum, { havuzAcFn: havuzAcSahte });
  assert.deepEqual(k.map((x) => x.kimlik), [motorKimlik(C)]);
});

test('kimlik motorKimlik(id) ile aynı; karar verilen her id elendi + gerekçe', () => {
  const [k] = aktarimKayitlari({ gorulen: { [A]: ZAMAN }, havuz: [] }, { havuzAcFn: havuzAcSahte });
  assert.equal(k.kimlik, motorKimlik(A));
  assert.equal(k.durum, 'elendi');
  assert.equal(k.gerekce, 'aktarım: eski düzende karar verildi');
  assert.match(k.kimlik, /^[A-Za-z0-9:_-]{1,128}$/);
});

test('yazılmış haber slug ile yazildi aktarılır; slug yoksa elendi; yalnız deneme kaydı aktarılmaz', () => {
  const durum = {
    gorulen: {
      y1: { ...ZAMAN, yazildi: true, slug: 'bir-haber' },
      y2: { ...ZAMAN, yazildi: true },
      e1: { ...ZAMAN, elendi: true, gerekce: 'kırmızı' },
      d1: { ...ZAMAN, deneme: 2 },
    },
    havuz: [],
  };
  const k = aktarimKayitlari(durum, { havuzAcFn: havuzAcSahte });
  assert.deepEqual(k.find((x) => x.kimlik === motorKimlik('y1')), { kimlik: motorKimlik('y1'), durum: 'yazildi', slug: 'bir-haber' });
  assert.equal(k.find((x) => x.kimlik === motorKimlik('y2')).durum, 'elendi');
  assert.equal(k.find((x) => x.kimlik === motorKimlik('e1')).durum, 'elendi');
  assert.equal(k.find((x) => x.kimlik === motorKimlik('d1')), undefined);
});

test('gövde 35 kayıtta bölünür', async () => {
  const gorulen = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k1:${String(i).padStart(4, '0')}`, ZAMAN]));
  const govdeler = [];
  const fetchFn = async (url, init) => {
    govdeler.push(JSON.parse(init.body).haberler.length);
    return { ok: true, status: 200 };
  };
  const n = await aktar({ durum: { gorulen, havuz: [] }, url: 'https://motor.example.com/', anahtar: 't', fetchFn, havuzAcFn: havuzAcSahte });
  assert.deepEqual(govdeler, [35, 35, 10]);
  assert.equal(n, 80);
});

test('istekte kaynak adresi ve ham id yok; adres finfolis ucunu gösterir', async () => {
  const istekler = [];
  const fetchFn = async (url, init) => {
    istekler.push({ url, init });
    return { ok: true, status: 200 };
  };
  await aktar({ durum: { gorulen: { [C]: ZAMAN, [A]: ZAMAN }, havuz: [] }, url: 'https://motor.example.com', anahtar: 't', fetchFn, havuzAcFn: havuzAcSahte });
  assert.equal(istekler[0].url, 'https://motor.example.com/motor/finfolis/kaydet');
  assert.equal(istekler[0].init.headers.Authorization, 'Bearer t');
  assert.ok(!istekler[0].init.body.includes('haber.example.com'));
  assert.ok(!istekler[0].init.body.includes('k111111'));
});

test('2xx olmayan yanıtta hata fırlatır', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 });
  await assert.rejects(aktar({ durum: { gorulen: { [A]: ZAMAN }, havuz: [] }, url: 'https://m.example.com', anahtar: 't', fetchFn, havuzAcFn: havuzAcSahte }), /500/);
});

test('havuz açılamazsa hata fırlatır, istek atılmaz', async () => {
  const durum = { gorulen: { [A]: ZAMAN }, havuz: [{ id: 'olay1', sifreli: 'x' }] };
  assert.throws(() => aktarimKayitlari(durum, { havuzAcFn: () => [] }), /havuz/);
  let istek = 0;
  await assert.rejects(aktar({ durum, url: 'https://m.example.com', anahtar: 't', fetchFn: async () => (istek++, { ok: true }), havuzAcFn: () => [] }), /havuz/);
  assert.equal(istek, 0);
});
