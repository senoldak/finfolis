import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import kaynak, { revizyonAdaylari } from './revizyon.mjs';

const K = { ad: 'TÜİK verisi, TCMB Tüketici Fiyatları tablosu', url: 'https://www.tcmb.gov.tr/' };
const r = (bolum, alan, donem, eski, yeni, tespit = '2026-10-29T08:00:00.000Z') => ({ bolum, alan, donem, eski, yeni, fark: Math.round((yeni - eski) * 1e4) / 1e4, tespit, kaynak: K });
const simdi = new Date('2026-10-29T12:00:00Z');

test('son iki günde tespit edilen manşet revizyonu aday olur', () => {
  const [a] = revizyonAdaylari([r('enflasyon', 'yillik', '2026-08', 31.51, 31.7)], simdi);
  assert.equal(a.id, 'revizyon:enflasyon:2026-08:yillik=31.7');
  assert.equal(a.baslik, 'Yıllık TÜFE, Ağustos 2026: %31,51 olan rakam %31,70 olarak güncellendi');
  assert.equal(a.kategori, 'ekonomi');
  assert.equal(a.bolge, 'turkiye');
  assert.equal(a.ucretli, false);
  assert.deepEqual(a.kaynaklar, [K]);
  assert.match(a.kaynakMetni, /%31,51 before, %31,70 now \(change \+0,19 puan\)/);
  assert.match(a.kaynakMetni, /do not speculate/);
  assert.ok(a.tarih instanceof Date);
});

test('eşik altı fark, izlenmeyen alan ve eski tespit aday olmaz', () => {
  assert.equal(revizyonAdaylari([r('enflasyon', 'yillik', '2026-08', 31.51, 31.55)], simdi).length, 0); // 0,04 < 0,1
  assert.equal(revizyonAdaylari([r('tufeArindirilmis', 'aylik', '2024-10', 2.45, 2.46)], simdi).length, 0);
  assert.equal(revizyonAdaylari([r('enflasyon', 'yillik', '2026-08', 31.51, 31.7, '2026-10-26T08:00:00.000Z')], simdi).length, 0);
  assert.equal(revizyonAdaylari([r('enflasyon', 'yillik', '2026-08', 31.51, 31.7, '2026-10-29T13:00:00.000Z')], simdi).length, 0); // gelecek
});

test('aynı bölüm ve dönemin alanları tek adayda toplanır', () => {
  const l = revizyonAdaylari([r('enflasyon', 'yillik', '2026-08', 31.51, 31.7), r('enflasyon', 'aylik', '2026-08', 1.84, 2.1)], simdi);
  assert.equal(l.length, 1);
  assert.match(l[0].baslik, /Ağustos 2026 dönemi için TÜİK verilerinde 2 rakam güncellendi/);
  assert.match(l[0].id, /aylik=2.1,yillik=31.7$/);
});

test('aynı revizyon aynı kimliği üretir (görülen mekanizması ikinci kez aday yapmaz)', () => {
  const a = revizyonAdaylari([r('cari', 'cari', '2026-08', 4053, 3600)], simdi)[0];
  const b = revizyonAdaylari([r('cari', 'cari', '2026-08', 4053, 3600, '2026-10-30T08:00:00.000Z')], new Date('2026-10-30T12:00:00Z'))[0];
  assert.equal(a.id, b.id);
  assert.equal(a.baslik, 'Cari işlemler dengesi, Ağustos 2026: 4.053 milyon USD olan rakam 3.600 milyon USD olarak güncellendi');
});

test('hent: dosyayı okur, dosya yoksa boş döner', async () => {
  const d = mkdtempSync(join(tmpdir(), 'rev-'));
  const f = join(d, 'revizyonlar.json');
  writeFileSync(f, JSON.stringify({ revizyonlar: [r('issizlik', 'oran', '2026-08', 7.8, 8.0)] }));
  assert.equal((await kaynak.hent({ revizyonDosyasi: f, simdi })).length, 1);
  const hata = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await kaynak.hent({ revizyonDosyasi: join(d, 'yok.json'), simdi }), []);
  } finally {
    console.error = hata;
  }
});

test('kaynak yalnız resmi kurum verisidir', () => {
  const [a] = revizyonAdaylari([r('cari', 'cari', '2026-08', 4053, 3600)], simdi);
  assert.equal(a.kaynaklar.length, 1);
  assert.match(a.kaynakMetni, /source TCMB/);
});
