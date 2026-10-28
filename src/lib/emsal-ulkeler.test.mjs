import test from 'node:test';
import assert from 'node:assert/strict';
import { csvAyristir, donemAySirasi, donemEtiket, eskiMi, enYeni, baslikDonemi, emsalSatiri, baslikDonemleri, OLCUTLER } from './emsal-ulkeler.mjs';
import { ULKELER } from './dunya-faizleri.mjs';

const BUGUN = '2026-10-28';

// OECD KEI biçiminde bir satır
const kei = (alan, olcu, frekans, donem, deger, { birim = 'GR', donusum = '_Z', ayar = 'Y' } = {}) => ({
  REF_AREA: alan,
  FREQ: frekans,
  MEASURE: olcu,
  UNIT_MEASURE: birim,
  ADJUSTMENT: ayar,
  TRANSFORMATION: donusum,
  TIME_PERIOD: donem,
  OBS_VALUE: String(deger),
});
const fiyat = (alan, harcama, donem, deger, yontem = 'N') => ({
  REF_AREA: alan,
  FREQ: 'M',
  METHODOLOGY: yontem,
  MEASURE: 'CPI',
  UNIT_MEASURE: 'PA',
  EXPENDITURE: harcama,
  ADJUSTMENT: 'N',
  TRANSFORMATION: 'GY',
  TIME_PERIOD: donem,
  OBS_VALUE: String(deger),
});

test('csvAyristir OECD başlığıyla nesne üretir', () => {
  const s = csvAyristir('DATAFLOW,REF_AREA,TIME_PERIOD,OBS_VALUE\nX:Y(1.0),TUR,2026-Q2,1.12\n');
  assert.deepEqual(s, [{ DATAFLOW: 'X:Y(1.0)', REF_AREA: 'TUR', TIME_PERIOD: '2026-Q2', OBS_VALUE: '1.12' }]);
});

test('donemAySirasi ve donemEtiket: aylık ve çeyreklik dönemler', () => {
  assert.equal(donemAySirasi('2026-Q2'), 2026 * 12 + 5);
  assert.equal(donemAySirasi('2026-08'), 2026 * 12 + 7);
  assert.equal(donemAySirasi('2026-10-16'), 2026 * 12 + 9);
  assert.equal(donemEtiket('2026-08'), 'Ağu 2026');
  assert.equal(donemEtiket('2026-Q2'), '2. çeyrek 2026');
});

test('eskiMi: 12 aydan eski dönem dışarıda kalır', () => {
  assert.equal(eskiMi('2025-09', BUGUN), true);
  assert.equal(eskiMi('2025-10', BUGUN), false);
  assert.equal(eskiMi('2025-Q3', BUGUN), true); // Eylül 2025 sonu
  assert.equal(eskiMi('2025-Q4', BUGUN), false);
  assert.equal(eskiMi('2026-Q2', BUGUN), false);
});

test('enYeni: en yeni gözlem; eşitlikte aylık önce; eski gözlem atlanır; farklı ülke karışmaz', () => {
  const satirlar = [
    kei('TUR', 'UNEMP', 'Q', '2026-Q2', 7.97, { birim: 'PT_LF' }),
    kei('TUR', 'UNEMP', 'M', '2026-06', 7.9, { birim: 'PT_LF' }),
    kei('TUR', 'UNEMP', 'M', '2026-08', 7.8, { birim: 'PT_LF' }),
    kei('USA', 'UNEMP', 'M', '2026-09', 4.2, { birim: 'PT_LF' }),
    kei('TUR', 'UNEMP', 'M', '2024-01', 9, { birim: 'PT_LF' }),
  ];
  assert.deepEqual(enYeni(satirlar, ['TUR'], OLCUTLER.issizlik, BUGUN), { donem: '2026-08', deger: 7.8 });
  // çeyrek sonu (Haz) ile aylık Haz eşit: aylık kazanır
  const esit = [kei('TUR', 'UNEMP', 'Q', '2026-Q2', 7.97, { birim: 'PT_LF' }), kei('TUR', 'UNEMP', 'M', '2026-06', 7.9, { birim: 'PT_LF' })];
  assert.deepEqual(enYeni(esit, ['TUR'], OLCUTLER.issizlik, BUGUN), { donem: '2026-06', deger: 7.9 });
  // yalnız 12 aydan eski gözlem varsa yok
  assert.equal(enYeni([kei('TUR', 'UNEMP', 'M', '2025-01', 9, { birim: 'PT_LF' })], ['TUR'], OLCUTLER.issizlik, BUGUN), null);
  assert.equal(enYeni(satirlar, ['BRA'], OLCUTLER.issizlik, BUGUN), null);
});

test('enYeni: euro bölgesi kod adaylarından en yeni olan, TÜFE için ulusal tanım HICP’ten önce', () => {
  const satirlar = [fiyat('EA20', '_T', '2026-07', 2.9, 'HICP'), fiyat('EA', '_T', '2026-09', 3.8, 'HICP'), fiyat('EA', '_T', '2026-09', 3.7, 'N')];
  assert.deepEqual(enYeni(satirlar, ['EA20', 'EA21', 'EA19', 'EA'], OLCUTLER.tufe, BUGUN), { donem: '2026-09', deger: 3.7 });
});

test('baslikDonemi: çoğunluk, eşitlikte en yeni', () => {
  assert.equal(baslikDonemi(['2026-Q2', '2026-Q2', '2026-Q3', null]), '2026-Q2');
  assert.equal(baslikDonemi(['2026-Q2', '2026-Q3']), '2026-Q3');
  assert.equal(baslikDonemi([]), null);
});

test('emsalSatiri: göstergeleri toplar, reel faizi politika faizi − OECD TÜFE olarak hesaplar', () => {
  const tur = ULKELER.find((u) => u.kod === 'TUR');
  const keiSatirlari = [
    kei('TUR', 'B1GQ_Q', 'Q', '2026-Q2', 1.12, { donusum: 'G1' }),
    kei('TUR', 'B1GQ_Q', 'Q', '2026-Q2', 2.56, { donusum: 'GY' }),
    kei('TUR', 'UNEMP', 'M', '2026-08', 7.8, { birim: 'PT_LF' }),
    kei('TUR', 'IRLT', 'M', '2026-09', 99, { birim: 'PA' }),
  ];
  const fiyatSatirlari = [fiyat('TUR', '_T', '2026-09', 29.73), fiyat('TUR', '_TXCP01_NRG', '2026-09', 28.83)];
  const s = emsalSatiri({
    ulke: tur,
    kei: keiSatirlari,
    fiyat: fiyatSatirlari,
    faiz: { faiz: 37, tarih: '2026-10-16', aralik: null },
    bugun: BUGUN,
  });
  assert.deepEqual(s.gsyhCeyrek, { donem: '2026-Q2', deger: 1.12 });
  assert.deepEqual(s.gsyhYillik, { donem: '2026-Q2', deger: 2.56 });
  assert.deepEqual(s.tufe, { donem: '2026-09', deger: 29.73 });
  assert.deepEqual(s.cekirdek, { donem: '2026-09', deger: 28.83 });
  assert.deepEqual(s.issizlik, { donem: '2026-08', deger: 7.8 });
  assert.deepEqual(s.reel, { deger: 7.27, tufeDonem: '2026-09' });
  assert.equal(s.faiz.deger, 37);
  // KEI'de olan tahvil satırı alınır (veri olduğu için); olmayan ülkede null kalır
  const bos = emsalSatiri({ ulke: tur, kei: [], fiyat: [], faiz: null, bugun: BUGUN });
  assert.equal(bos.tahvil, null);
  assert.equal(bos.reel, null);
  assert.equal(bos.faiz, null);
});

test('emsalSatiri: 12 aydan eski politika faizi gösterilmez; TÜFE yoksa reel faiz yok', () => {
  const nzl = ULKELER.find((u) => u.kod === 'NZL');
  const s = emsalSatiri({ ulke: nzl, kei: [], fiyat: [], faiz: { faiz: 2.75, tarih: '2026-10-16' }, bugun: BUGUN });
  assert.equal(s.faiz.deger, 2.75);
  assert.equal(s.reel, null);
  const eski = emsalSatiri({ ulke: nzl, kei: [], fiyat: [fiyat('NZL', '_T', '2026-09', 3)], faiz: { faiz: 2.75, tarih: '2025-01-01' }, bugun: BUGUN });
  assert.equal(eski.faiz, null);
  assert.equal(eski.reel, null);
});

test('baslikDonemleri: her gösterge için çoğunluğun dönemi', () => {
  const satirlar = [
    { gsyhCeyrek: { donem: '2026-Q2' }, tufe: { donem: '2026-09' }, faiz: { tarih: '2026-10-16' }, reel: { tufeDonem: '2026-09' } },
    { gsyhCeyrek: { donem: '2026-Q2' }, tufe: { donem: '2026-08' }, faiz: { tarih: '2026-10-20' }, reel: { tufeDonem: '2026-08' } },
    { gsyhCeyrek: { donem: '2026-Q3' }, tufe: { donem: '2026-09' }, faiz: { tarih: '2026-10-19' }, reel: { tufeDonem: '2026-09' } },
  ];
  const d = baslikDonemleri(satirlar);
  assert.equal(d.gsyhCeyrek, '2026-Q2');
  assert.equal(d.tufe, '2026-09');
  assert.equal(d.faiz, '2026-10');
  assert.equal(d.reel, '2026-09');
  assert.equal(d.issizlik, null);
});
