import test from 'node:test';
import assert from 'node:assert/strict';
import { olaylariGrupla, hafizaGuncelle, ayniMakroOlay, mukerrerBul, ilgiliHafiza, resmiMi } from './olaylar.mjs';
import { RESMI_BESLEMELER } from './kaynaklar/resmi-beslemeler.mjs';

const aday = (id, o = {}) => ({
  id, baslik: `Başlık ${id}`, tarih: new Date('2026-10-11T10:00:00Z'), onem: 1, kategori: 'piyasalar',
  bolge: 'abd', ucretli: false, ozet: `özet ${id}`, kaynakMetni: `metin ${id}`,
  kaynaklar: [{ ad: `K${id}`, url: `https://x/${id}` }], ...o,
});

test('aynı olayın iki adayı tek olay olur', async () => {
  const adaylar = [aday('a', { onem: 2 }), aday('b', { onem: 5 }), aday('c')];
  const { yeni } = await olaylariGrupla(adaylar, [], { gemini: async () => ({ gruplar: [[0, 1], [2]] }) });
  assert.equal(yeni.length, 2);
  assert.equal(yeni[0].kaynaklar.length, 2);
  assert.match(yeni[0].kaynakMetni, /metin a/);
  assert.match(yeni[0].kaynakMetni, /metin b/);
  assert.equal(yeni[0].onem, 5);
  assert.equal(yeni[0].id, 'a');
});

test('hafızadaki olayla eşleşen aday bilinen sayılır', async () => {
  const hafiza = [{ id: 'eski1', ozet: 'Eski olay', zaman: '2026-10-11T08:00:00Z' }];
  const { yeni, bilinen } = await olaylariGrupla([aday('a')], hafiza, {
    gemini: async () => ({ gruplar: [[0]], eslesen: [{ aday: 0, hafiza: 'eski1' }] }),
  });
  assert.equal(yeni.length, 0);
  assert.equal(bilinen.length, 1);
});

test('gemini null dönerse her aday ayrı olay', async () => {
  const { yeni, bilinen } = await olaylariGrupla([aday('a'), aday('b')], [], { gemini: async () => null });
  assert.equal(yeni.length, 2);
  assert.equal(bilinen.length, 0);
});

test('geçersiz indeksler yok sayılır, gruplanmayan aday tek başına olay olur', async () => {
  const { yeni } = await olaylariGrupla([aday('a'), aday('b'), aday('c')], [], {
    gemini: async () => ({ gruplar: [[0, 1, 9]], eslesen: [{ aday: 7, hafiza: 'yok' }] }),
  });
  assert.equal(yeni.length, 2);
  assert.equal(yeni[0].adaylar.length, 2);
  assert.equal(yeni[1].adaylar.length, 1);
  assert.ok(yeni.some((o) => o.id === 'c'));
});

test('ucretliTek ve icerikli doğru hesaplanır', async () => {
  const g = async () => ({ gruplar: [[0, 1], [2], [3], [4]] });
  const adaylar = [
    aday('a', { ucretli: true }), aday('b', { ucretli: true }),
    aday('fed:x', { ucretli: false, kaynakMetni: 'k' }),
    aday('kaaaaaa:y', { kaynakMetni: 'uzun tam metin '.repeat(20) }),
    aday('kbbbbbb:z', { ucretli: true }),
  ];
  const { yeni } = await olaylariGrupla(adaylar, [], { gemini: g });
  assert.equal(yeni[0].ucretliTek, true);
  assert.equal(yeni[0].icerikli, false);
  assert.equal(yeni[1].ucretliTek, false);
  assert.equal(yeni[1].icerikli, true);
  assert.equal(yeni[2].icerikli, true);
  assert.equal(yeni[3].ucretliTek, true);
  assert.equal(yeni[3].icerikli, false);
});

test('hafizaGuncelle 7 günden eskiyi siler', () => {
  const simdi = new Date('2026-10-11T12:00:00Z');
  const hafiza = [
    { id: 'eski', ozet: 'e', zaman: '2026-10-04T11:00:00Z' },
    { id: 'taze', ozet: 't', zaman: '2026-10-10T12:00:00Z' },
  ];
  const olay = { id: 'yeni', baslik: 'Yeni', adaylar: [{ ozet: 'ö' }] };
  const s = hafizaGuncelle(hafiza, [olay], simdi);
  assert.deepEqual(s.map((k) => k.id), ['taze', 'yeni']);
  assert.equal(s[1].zaman, simdi.toISOString());
});

test('gruptan biri hafızada ise tüm grup bilinen', async () => {
  const hafiza = [{ id: 'h1', ozet: 'Eski', zaman: '2026-10-11T08:00:00Z' }];
  const { yeni, bilinen } = await olaylariGrupla([aday('a'), aday('b')], hafiza, {
    gemini: async () => ({ gruplar: [[0, 1]], eslesen: [{ aday: 0, hafiza: 'h1' }] }),
  });
  assert.equal(yeni.length, 0);
  assert.equal(bilinen.length, 2);
});

test('gemini hata/null: uyarı verilir, grupHatasi işaretlenir', async () => {
  const uyari = console.warn;
  const uyarilar = [];
  console.warn = (...a) => uyarilar.push(a.join(' '));
  try {
    const r1 = await olaylariGrupla([aday('a')], [], { gemini: async () => { throw new Error('503'); } });
    assert.equal(r1.grupHatasi, true);
    const r2 = await olaylariGrupla([aday('a')], [], { gemini: async () => null });
    assert.equal(r2.grupHatasi, true);
    assert.equal(uyarilar.length, 4); // her biri iki deneme
    const r3 = await olaylariGrupla([aday('a')], [], { gemini: async () => ({ gruplar: [] }) });
    assert.equal(r3.grupHatasi, undefined);
  } finally {
    console.warn = uyari;
  }
});

test('Gemini puanı olayın önemini yükseltir, kaynağın önemini düşürmez', async () => {
  const adaylar = [aday('a', { onem: 2 }), aday('b', { onem: 5 }), aday('c', { onem: 2 })];
  const { yeni } = await olaylariGrupla(adaylar, [], {
    gemini: async () => ({ gruplar: [[0], [1], [2]], puanlar: [{ aday: 0, onem: 4 }, { aday: 1, onem: 2 }, { aday: 2, onem: 9 }] }),
  });
  assert.equal(yeni.find((o) => o.id === 'a').onem, 4);
  assert.equal(yeni.find((o) => o.id === 'b').onem, 5);
  assert.equal(yeni.find((o) => o.id === 'c').onem, 2); // 1-5 dışındaki puan yok sayılır
});

// 15.10.2026 06:40 çalıştırması: Gemini bu iki adayı ayrı gruplara koydu, iki haber yazıldı.
const GSYH_HABERI = {
  id: 'kaaaaaa:1111111111111111',
  baslik: 'UK economy grew 0.1% in August, beating expectations',
  ozet: 'The U.K. is grappling with a cost-of-living crisis sparked by sticky inflation and surging energy costs.',
};
const CANLI_YAYIN = {
  id: 'kbbbbbb:2222222222222222',
  baslik: 'Tech stock sell-off intensifies as markets fret about AI; UK growth beats forecasts in August',
  ozet: 'Rolling coverage of the latest economic and financial news.',
};
const metin = (a) => `${a.baslik} — ${a.ozet}`;

test('Gemini ayırsa da İngiltere ağustos büyümesi kopyası yakalanır', async () => {
  const adaylar = [aday('c', GSYH_HABERI), aday('g', CANLI_YAYIN)];
  const { yeni } = await olaylariGrupla(adaylar, [], { gemini: async () => ({ gruplar: [[0], [1]] }) });
  assert.equal(yeni.length, 2); // gruplama kaçırdı
  assert.ok(ayniMakroOlay(metin(GSYH_HABERI), metin(CANLI_YAYIN)));
  const simdi = new Date('2026-10-15T06:42:00Z');
  // Aynı çalıştırmada yazılan olayla
  assert.equal(mukerrerBul(yeni[1], { yazilan: [yeni[0]], simdi })?.id, yeni[0].id);
  // Önceki çalıştırmanın hafızasıyla (24 saat içinde)
  const hafiza = [{ id: GSYH_HABERI.id, ozet: metin(GSYH_HABERI), zaman: '2026-10-15T06:40:57Z' }];
  assert.equal(mukerrerBul(yeni[1], { hafiza, simdi: new Date('2026-10-15T08:40:00Z') })?.id, GSYH_HABERI.id);
  // 24 saatten eski hafıza denetlenmez
  assert.equal(mukerrerBul(yeni[1], { hafiza, simdi: new Date('2026-10-16T08:40:00Z') }), null);
});

test('mükerrer denetimi farklı ülke, gösterge ya da dönemi ayırır', () => {
  const uk = 'UK economy grew 0.1% in August, beating expectations';
  assert.ok(!ayniMakroOlay(uk, 'US economy grew 0.3% in August')); // ülke
  assert.ok(!ayniMakroOlay(uk, 'UK inflation rises to 3.8% in August')); // gösterge
  assert.ok(!ayniMakroOlay(uk, 'UK economy grew 0.4% in July')); // dönem
  assert.ok(!ayniMakroOlay(uk, 'UK wage growth slows in August')); // ücret büyümesi GSYH değil
  assert.ok(!ayniMakroOlay(uk, 'IMF raises UK growth forecast for 2026')); // ay/çeyrek yok
  assert.ok(!ayniMakroOlay('Fed may cut rates; US inflation data due', 'US jobs report may surprise')); // "may" ay değil
  assert.ok(!ayniMakroOlay('Tell us about growth in August', 'US GDP grew in August')); // "us" zamiri ABD değil
  assert.ok(ayniMakroOlay('China Q3 GDP growth slows to 4.6%', 'Chinese economy expands 4.6% in third quarter, GDP data shows'));
});

// Katman 2 (Gemini kota planı): gruplama istemine bütün hafıza değil, adaylarla kelime paylaşan kayıtlar gider.
const kayit = (id, ozet, zaman = '2026-10-11T08:00:00Z') => ({ id, ozet, zaman });

test('ilgiliHafiza: adaylarla en az iki ayırt edici kelime paylaşan kayıtları seçer', () => {
  const hafiza = [
    kayit('fed', 'Federal Reserve holds rates steady as inflation cools'),
    kayit('nvidia', 'Nvidia shares jump after record quarterly revenue'),
    kayit('yalniz-ortak', 'Reserve Bank of Australia minutes released'),
  ];
  const secilen = ilgiliHafiza([aday('a', { baslik: 'Federal Reserve keeps rates on hold', ozet: 'Inflation cooling' })], hafiza);
  assert.deepEqual(secilen.map((h) => h.id), ['fed']);
});

test('ilgiliHafiza: sıradan kelimeler (the, after, percent) eşleşme sayılmaz', () => {
  const hafiza = [kayit('x', 'Shares fell after the report, down percent this week')];
  const secilen = ilgiliHafiza([aday('a', { baslik: 'Oil rose after the report this week', ozet: 'up percent' })], hafiza);
  assert.equal(secilen.length, 0);
});

test('ilgiliHafiza: en çok azami kadar kayıt, önce en çok ortak kelimesi olan', () => {
  const hafiza = [
    kayit('iki', 'Tesla deliveries record'),
    kayit('uc', 'Tesla deliveries record quarter'),
    kayit('iki-b', 'Tesla deliveries slump'),
  ];
  const secilen = ilgiliHafiza([aday('a', { baslik: 'Tesla deliveries hit record in quarter', ozet: '' })], hafiza, 2);
  assert.equal(secilen.length, 2);
  assert.equal(secilen[0].id, 'uc');
});

test('gruplama istemi yalnız ilgili hafızayı ve kısaltılmış aday özetini taşır', async () => {
  let istem = '';
  const hafiza = [
    kayit('fed', 'Federal Reserve holds rates steady'),
    ...Array.from({ length: 50 }, (_, i) => kayit(`ilgisiz${i}`, `Unrelated cocoa harvest story number ${i}`)),
  ];
  const uzunOzet = 'Federal Reserve rates '.repeat(40);
  await olaylariGrupla([aday('a', { baslik: 'Federal Reserve rates decision', ozet: uzunOzet })], hafiza, {
    gemini: async (p) => { istem = p.istem; return { gruplar: [[0]] }; },
  });
  assert.match(istem, /\[fed\]/);
  assert.doesNotMatch(istem, /ilgisiz/);
  const adaySatiri = istem.split('\n').find((s) => s.startsWith('0. '));
  assert.ok(adaySatiri.length <= 'Federal Reserve rates decision'.length + 3 + 3 + 200, adaySatiri.length);
});

test('ilgili hafıza boşsa istem (yok) der; hafızadaki olayla eşleşme yine tüm hafızaya göre doğrulanır', async () => {
  let istem = '';
  const { bilinen } = await olaylariGrupla([aday('a')], [kayit('eski1', 'Tamamen başka konu')], {
    gemini: async (p) => { istem = p.istem; return { gruplar: [[0]], eslesen: [{ aday: 0, hafiza: 'eski1' }] }; },
  });
  assert.match(istem, /\(yok\)/);
  assert.equal(bilinen.length, 1);
});

test('resmiMi: merkez bankası modülleri ve resmi beslemeler resmi, gizli kodlar değil', () => {
  assert.ok(resmiMi({ id: 'fed:https://www.federalreserve.gov/x' }));
  assert.ok(resmiMi({ id: 'tcmb:https://www.tcmb.gov.tr/x' }));
  for (const b of RESMI_BESLEMELER) assert.ok(resmiMi({ id: `${b.ad}:https://ornek.example.com/x` }), b.ad);
  assert.ok(!resmiMi({ id: 'k1a2b3c:0123456789abcdef' }));
  assert.ok(!resmiMi({ id: 'Dallas Fedx:https://ornek.example.com/x' }));
});
