import test from 'node:test';
import assert from 'node:assert/strict';
import { olaylariGrupla, hafizaGuncelle, ayniMakroOlay, mukerrerBul, ilgiliHafiza, resmiMi, gruplamaSurumu } from './olaylar.mjs';
import { RESMI_BESLEMELER } from './kaynaklar/resmi-beslemeler.mjs';

const aday = (id, o = {}) => ({
  id, baslik: `Başlık ${id}`, tarih: new Date('2026-10-11T10:00:00Z'), onem: 20, kategori: 'piyasalar',
  bolge: 'abd', ucretli: false, ozet: `özet ${id}`, kaynakMetni: `metin ${id}`,
  kaynaklar: [{ ad: `K${id}`, url: `https://x/${id}` }], ...o,
});

test('aynı olayın iki adayı tek olay olur', async () => {
  const adaylar = [aday('a', { onem: 40 }), aday('b', { onem: 100 }), aday('c')];
  const { yeni } = await olaylariGrupla(adaylar, [], { gemini: async () => ({ gruplar: [[0, 1], [2]] }) });
  assert.equal(yeni.length, 2);
  assert.equal(yeni[0].kaynaklar.length, 2);
  assert.match(yeni[0].kaynakMetni, /metin a/);
  assert.match(yeni[0].kaynakMetni, /metin b/);
  assert.equal(yeni[0].onem, 100);
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
  const adaylar = [aday('a', { onem: 40 }), aday('b', { onem: 100 }), aday('c', { onem: 40 })];
  const { yeni } = await olaylariGrupla(adaylar, [], {
    gemini: async () => ({ gruplar: [[0], [1], [2]], puanlar: [{ aday: 0, onem: 80 }, { aday: 1, onem: 40 }, { aday: 2, onem: 140 }] }),
  });
  assert.equal(yeni.find((o) => o.id === 'a').onem, 80);
  assert.equal(yeni.find((o) => o.id === 'b').onem, 100);
  assert.equal(yeni.find((o) => o.id === 'c').onem, 40); // 1–100 dışındaki puan yok sayılır
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

test('önbellek: aynı adaylar ikinci turda çağrısız aynı gruplara ve puana çözülür', async () => {
  const onbellek = {};
  let cagri = 0;
  const g = async () => (cagri++, { gruplar: [[0, 1], [2]], puanlar: [{ aday: 0, onem: 75 }, { aday: 1, onem: 40 }, { aday: 2, onem: 30 }] });
  const adaylar = () => [aday('a', { onem: 20 }), aday('b', { onem: 20 }), aday('c', { onem: 20 })];
  const ilk = await olaylariGrupla(adaylar(), [], { gemini: g, onbellek });
  const ikinci = await olaylariGrupla(adaylar(), [], { gemini: g, onbellek });
  assert.equal(cagri, 1);
  assert.equal(ikinci.onbellekten, true);
  assert.deepEqual(ikinci.yeni.map((o) => [o.id, o.onem, o.adaylar.length]), ilk.yeni.map((o) => [o.id, o.onem, o.adaylar.length]));
  assert.equal(ikinci.yeni[0].onem, 75);
});

test('önbellek: yeni aday varsa çağrı tüm adaylarla yapılır', async () => {
  const onbellek = {};
  let istemler = [];
  const g = async ({ istem }) => (istemler.push(istem), { gruplar: [[0], [1]], puanlar: [] });
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek });
  await olaylariGrupla([aday('a'), aday('b')], [], { gemini: g, onbellek });
  assert.equal(istemler.length, 2);
  assert.match(istemler[1], /Başlık a/);
  assert.match(istemler[1], /Başlık b/);
});

test('önbellek: 3 günden eski kayıt sorulur ve temizlenir', async () => {
  const onbellek = {};
  let cagri = 0;
  const g = async () => (cagri++, { gruplar: [[0]], puanlar: [] });
  const t0 = new Date('2026-10-11T10:00:00Z');
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek, simdi: t0 });
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek, simdi: new Date(t0.getTime() + 2 * 864e5) });
  assert.equal(cagri, 1);
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek, simdi: new Date(t0.getTime() + 4 * 864e5) });
  assert.equal(cagri, 2);
});

test('önbellek: istem sürümü ya da eşik eki değişince boşalır', async () => {
  const onbellek = {};
  let cagri = 0;
  const g = async () => (cagri++, { gruplar: [[0]], puanlar: [] });
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek, surumEki: 'esik70' });
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek, surumEki: 'esik70' });
  assert.equal(cagri, 1);
  await olaylariGrupla([aday('a')], [], { gemini: g, onbellek, surumEki: 'esik60' });
  assert.equal(cagri, 2);
  assert.notEqual(gruplamaSurumu('x'), gruplamaSurumu('y'));
});

test('önbellek: gruplama başarısızsa (null) kayıt yazılmaz', async () => {
  const onbellek = {};
  await olaylariGrupla([aday('a')], [], { gemini: async () => null, onbellek });
  assert.deepEqual(onbellek.kayitlar, {});
});

// Gemini Faz 2 (27 Ekim): gömme ölçümü ve ön eleme. Vektör: başlığın "Başlık X" harfinden (X = konu).
import { coz, kodla } from './gomme.mjs';
const KONU = { a: [1, 0, 0], b: [1, 0.1, 0], c: [0, 1, 0], d: [0, 0, 1] };
const gommeSahte = async (metinler) => metinler.map((m) => {
  const k = m.match(/^(?:Başlık |H )(\w)/)?.[1]?.[0];
  return KONU[k] ? coz(kodla(KONU[k])) : null;
});
const gomme = (kip, ek = {}) => ({ kip, alt: 0.5, vektorle: gommeSahte, log: () => {}, ...ek });

test('gömme gölge: çağrı bugünkü gibi; grup içi ve hafıza eşleşmeleri ölçülür, metin yok', async () => {
  const satirlar = [];
  const istemler = [];
  const hafiza = [{ id: 'h1', ozet: 'H c eski olay', zaman: '2026-10-10T00:00:00Z' }];
  const g = async ({ istem }) => (istemler.push(istem), { gruplar: [[0, 1]], eslesen: [{ aday: 2, hafiza: 'h1' }] });
  await olaylariGrupla([aday('a'), aday('b'), aday('c')], hafiza, { gemini: g, gomme: gomme('golge', { log: (s) => satirlar.push(s) }) });
  assert.equal(istemler.length, 1);
  const j = satirlar.filter((s) => s.startsWith('gömme-ölçüm ')).map((s) => JSON.parse(s.slice(12)));
  assert.deepEqual(j.filter((x) => x.karar === 'ayni').map((x) => x.tur).sort(), ['grup', 'hafiza']);
  for (const s of satirlar) assert.doesNotMatch(s, /Başlık|özet|eski olay/);
});

test('gömme açık: hafıza = sözcükle eşleşen (korunur) ∪ anlamca yakın', async () => {
  const hafiza = [
    { id: 'kelime', ozet: 'özet ortak kelimeler burada özet ortak', zaman: '2026-10-10T00:00:00Z' },
    { id: 'anlam', ozet: 'H a farklı sözcükler', zaman: '2026-10-10T00:00:00Z' },
    { id: 'ilgisiz', ozet: 'H d başka', zaman: '2026-10-10T00:00:00Z' },
  ];
  const adaylar = [aday('a', { ozet: 'özet ortak kelimeler' })];
  let istem = '';
  await olaylariGrupla(adaylar, hafiza, { gemini: async (x) => ((istem = x.istem), { gruplar: [[0]] }), gomme: gomme('acik') });
  assert.match(istem, /\[kelime\]/);
  assert.match(istem, /\[anlam\]/);
  assert.doesNotMatch(istem, /\[ilgisiz\]/);
});

test('gömme açık: 41 aday iki pakete bölünür, bileşen bölünmez, indeksler doğru birleşir', async () => {
  // 0..20 'a' konusu (tek bileşen, 21 aday), 21..40 'c' ve 'd' karışık (tekler + bir c bileşeni)
  const adaylar = Array.from({ length: 41 }, (_, i) => aday(`${i < 21 ? 'a' : i % 2 ? 'c' : 'd'}${i}`));
  const paketler = [];
  const g = async ({ istem }) => {
    const satir = istem.split('HAFIZA')[0].match(/^\d+\. .*$/gm);
    paketler.push(satir.map((s) => s.replace(/^\d+\. Başlık (\S+).*/, '$1')));
    // her pakette ilk iki adayı grupla, ilkine puan ver
    return { gruplar: [[0, 1]], puanlar: [{ aday: 0, onem: 90 }] };
  };
  const { yeni } = await olaylariGrupla(adaylar, [], { gemini: g, gomme: gomme('acik') });
  assert.equal(paketler.length, 2);
  const aPaketi = paketler.find((p) => p.includes('a0'));
  for (let i = 0; i < 21; i++) assert.ok(aPaketi.includes(`a${i}`)); // bileşen tek pakette
  assert.ok(paketler.every((p) => p.length <= 40));
  assert.equal(new Set(paketler.flat()).size, 41);
  // her paketin ilk iki adayı birleşti: 41 - 2 = 39 olay
  assert.equal(yeni.length, 39);
  const birlesik = yeni.filter((o) => o.adaylar.length === 2).map((o) => o.adaylar.map((a) => a.id).sort().join('+'));
  assert.equal(birlesik.length, 2);
  for (const p of paketler) assert.ok(birlesik.includes([p[0], p[1]].sort().join('+')));
});

test('gömme açık: paketlerden biri düşerse gruplama hatası', async () => {
  const adaylar = Array.from({ length: 41 }, (_, i) => aday(`${i < 21 ? 'a' : 'd'}${i}`));
  let n = 0;
  const r = await olaylariGrupla(adaylar, [], { gemini: async () => (++n > 2 ? null : n === 1 ? { gruplar: [] } : null), gomme: gomme('acik') });
  assert.equal(r.grupHatasi, true);
});

test('gömme yoksa (vektorle null) istem bugünküyle birebir', async () => {
  const hafiza = [{ id: 'h1', ozet: 'özet a kelime kelime', zaman: '2026-10-10T00:00:00Z' }];
  const istemler = [];
  const g = async ({ istem }) => (istemler.push(istem), { gruplar: [[0]] });
  await olaylariGrupla([aday('a', { ozet: 'özet a kelime kelime' })], hafiza, { gemini: g });
  await olaylariGrupla([aday('a', { ozet: 'özet a kelime kelime' })], hafiza, { gemini: g, gomme: gomme('acik', { vektorle: async () => null }) });
  assert.equal(istemler[0], istemler[1]);
});
