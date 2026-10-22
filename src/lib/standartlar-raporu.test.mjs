import test from 'node:test';
import assert from 'node:assert/strict';
import {
  araliktaMi,
  kuralAdi,
  kuralSatirlari,
  kuralToplami,
  kalanElenen,
  ceyrekSayimlari,
  raporSatirlari,
  aralikMetni,
  ceyrekBasligi,
} from './standartlar-raporu.mjs';

test('araliktaMi: İstanbul gününe göre, uçlar dahil', () => {
  // 30 Eylül 21:00Z = 1 Ekim 00:00 İstanbul (içeride); 31 Aralık 21:00Z = 1 Ocak İstanbul (dışarıda)
  assert.equal(araliktaMi(new Date('2026-09-30T21:00:00Z'), '2026-10-01', '2026-12-31'), true);
  assert.equal(araliktaMi(new Date('2026-09-30T20:59:59Z'), '2026-10-01', '2026-12-31'), false);
  assert.equal(araliktaMi(new Date('2026-12-31T20:59:59Z'), '2026-10-01', '2026-12-31'), true);
  assert.equal(araliktaMi(new Date('2026-12-31T21:00:00Z'), '2026-10-01', '2026-12-31'), false);
  assert.equal(araliktaMi('2026-12-31', '2026-10-01', '2026-12-31'), true);
});

test('boş veri: sıfırlar', () => {
  const s = ceyrekSayimlari({ bas: '2026-10-01', son: '2026-12-31' });
  assert.deepEqual(s, {
    bot: 0,
    yayinci: 0,
    zincir: 0,
    duzeltme: 0,
    kaldirilan: 0,
    sikayet: { toplam: 0, yerinde: 0, kismen: 0, yerindeDegil: 0 },
  });
  assert.deepEqual(kuralSatirlari(undefined), []);
  assert.equal(kuralToplami(undefined), 0);
});

test('kural adları: bilinen okunur, bilinmeyen olduğu gibi', () => {
  assert.equal(kuralAdi('olum-kaza'), 'ölüm ve kaza');
  assert.equal(kuralAdi('turkiye-devlet'), 'Türkiye devlet büyükleri');
  assert.equal(kuralAdi('yeni-kural'), 'yeni-kural');
});

test('kuralSatirlari: sıfırlar atılır, çoktan aza; toplamlar', () => {
  const sari = { 'olum-kaza': 3, secim: 0, 'savas-konu': 5, 'x-yeni': 1 };
  assert.deepEqual(
    kuralSatirlari(sari).map((r) => [r.ad, r.n]),
    [['savaş', 5], ['ölüm ve kaza', 3], ['x-yeni', 1]],
  );
  assert.equal(kuralToplami(sari), 9);
});

test('kalanElenen: elendi - kirmizi, negatif olmaz', () => {
  assert.equal(kalanElenen(10, 4), 6);
  assert.equal(kalanElenen(3, 5), 0);
  assert.equal(kalanElenen(undefined, 2), 0);
});

const haber = (id, date, extra = {}) => ({ id, data: { title: id, date: new Date(date), ...extra } });

test('ceyrekSayimlari: bot, yayıncı, düzeltme, kaldırma, şikâyet', () => {
  const haberler = [
    haber('a', '2026-10-05T10:00:00Z'),
    haber('b', '2026-11-05T10:00:00Z', { uretim: 'bot' }),
    haber('c', '2026-11-06T10:00:00Z', { author: 'Şenol Dak', uretim: 'editor' }),
    haber('z', '2026-11-07T10:00:00Z', { uretim: 'yazi-isleri', author: 'Şenol Dak' }),
    haber('d', '2026-09-01T10:00:00Z'),
    haber('e', '2026-10-10T10:00:00Z', { duzeltme: '12.10.2026: Rakam düzeltildi.' }),
  ];
  const kaldirilan = [
    { tarih: '2026-10-20', neden: 'x' },
    { tarih: '2027-01-02', neden: 'y' },
  ];
  const sikayetler = [
    { alindi: '2026-12-30', karar: '2027-01-05', sonuc: 'yerinde' },
    { alindi: '2026-10-02', karar: '2026-10-10', sonuc: 'yerinde' },
    { alindi: '2026-10-02', karar: '2026-10-11', sonuc: 'kismen' },
    { alindi: '2026-10-02', karar: '2026-10-12', sonuc: 'yerinde-degil' },
  ];
  const s = ceyrekSayimlari({ haberler, kaldirilan, sikayetler, bas: '2026-10-01', son: '2026-12-31' });
  assert.equal(s.bot, 3); // a, b, e
  assert.equal(s.yayinci, 1); // c (zincir yazısı z sayılmaz)
  assert.equal(s.zincir, 1); // z ayrı satır
  assert.equal(s.kaldirilan, 1);
  assert.deepEqual(s.sikayet, { toplam: 3, yerinde: 1, kismen: 1, yerindeDegil: 1 });
  assert.equal(s.duzeltme, 1);
});

test('raporSatirlari: defter geç başladıysa not alanı, başlık ve aralık', () => {
  const defter = {
    ceyrek: '2026-c4',
    bas: '2026-10-01',
    son: '2026-12-31',
    defterBaslangici: '2026-10-20',
    yazildi: 10,
    elendi: 8,
    kirmizi: 3,
    sari: 2,
    kurallar: { kirmizi: { suc: 3 }, sari: { secim: 2 } },
    geminiCagri: 99,
    kuralDegisiklikleri: null,
    uretim: 'bot',
  };
  const bos = ceyrekSayimlari({ bas: defter.bas, son: defter.son });
  const r = raporSatirlari(defter, bos);
  assert.equal(r.baslik, '2026 4. çeyrek');
  assert.equal(r.aralik, '1 Ekim – 31 Aralık 2026');
  assert.equal(r.kalanElenen, 5);
  assert.equal(r.defterGecKaldi, '2026-10-20');
  assert.equal(r.kuralDegisiklikleri, null);
  assert.equal(raporSatirlari({ ...defter, defterBaslangici: '2026-10-01' }, bos).defterGecKaldi, null);
  assert.equal(aralikMetni('2026-10-01', '2027-03-31'), '1 Ekim 2026 – 31 Mart 2027');
  assert.equal(ceyrekBasligi('2027-c1'), '2027 1. çeyrek');
});
