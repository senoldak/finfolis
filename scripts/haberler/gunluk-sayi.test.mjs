import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { elemeKodlari, turSayilari, gunEkle, istanbulGunu, sayiciSar, sayiYaz, SAKLA_GUN } from './gunluk-sayi.mjs';

test('elemeKodlari: bilinen gerekçeler sabit kod, standart kural başına, bilinmeyen diger', () => {
  assert.deepEqual(elemeKodlari('kaynakta artık yok'), ['kaynakta-yok']);
  assert.deepEqual(elemeKodlari('kaynak listeden çıkarıldı'), ['kaynakta-yok']);
  assert.deepEqual(elemeKodlari('bayat (5 günü geçti)'), ['bayat']);
  assert.deepEqual(elemeKodlari('bilinen olay (hafızada)'), ['bilinen-olay']);
  assert.deepEqual(elemeKodlari('tekrar: son 72 saatte yayımlanan haberle aynı olay'), ['tekrar']);
  assert.deepEqual(elemeKodlari('mükerrer: aynı olay zaten yazılmış'), ['tekrar']);
  assert.deepEqual(elemeKodlari('üç denemede yazılamadı'), ['yazilamadi']);
  assert.deepEqual(elemeKodlari('bozuk yanıt'), ['yazilamadi']);
  assert.deepEqual(elemeKodlari('kısa, eş bulunamadı'), ['kisa-es-yok']);
  assert.deepEqual(elemeKodlari('Metin kısa: 120 kelime (en az 250); kaynak yeterli değil'), ['kontrol-masasi']);
  assert.deepEqual(elemeKodlari('Yayın kurulu onaylamadı: rakam yok'), ['kontrol-masasi']);
  assert.deepEqual(elemeKodlari('Son kontrol: bir şey'), ['kontrol-masasi']);
  assert.deepEqual(elemeKodlari('standart:kirmizi:yatirim-tavsiyesi'), ['standart:yatirim-tavsiyesi']);
  assert.deepEqual(elemeKodlari('standart:kirmizi:suc,teror,suc'), ['standart:suc', 'standart:teror']);
  assert.deepEqual(elemeKodlari('standart:kirmizi:kapi-kisi-suc @qwen3-30b#1a2b3c'), ['standart:kapi-kisi-suc']);
  assert.deepEqual(elemeKodlari('standart:hata'), ['standart']);
  assert.deepEqual(elemeKodlari('başka bir şey'), ['diger']);
  assert.deepEqual(elemeKodlari(undefined), ['diger']);
  assert.deepEqual(elemeKodlari('önceki turda karar verildi'), []);
});

test('turSayilari: aday ve sonuçlar sayılır, yazilan benzersiz slug, bülten ayrı', () => {
  const t = turSayilari({
    gorulen: 12,
    sonuclar: [
      { kimlik: 'a', durum: 'yazildi', slug: 's1' }, { kimlik: 'b', durum: 'yazildi', slug: 's1' },
      { kimlik: 'c', durum: 'yazildi', slug: 'bulten-1' },
      { kimlik: 'd', durum: 'elendi', gerekce: 'standart:kirmizi:suc' }, { kimlik: 'e', durum: 'elendi', gerekce: 'bayat (5 günü geçti)' },
      { kimlik: 'f', durum: 'elendi', gerekce: 'önceki turda karar verildi' },
      { kimlik: 'g', durum: 'bekliyor', gerekce: 'havuzda', havuzda: true }, { kimlik: 'h', durum: 'bekliyor' },
    ],
    ozet: { yazilar: ['s1', 'bulten-1', 'derleme-1'], bultenYazildi: true },
  });
  assert.deepEqual(t, {
    tur: 1, gorulen: 12, degerlendirilen: 5, elenen: { 'standart:suc': 1, bayat: 1 },
    yazilan: 3, yayimlanan: 2, bulten: 1, bekleyen: 2,
  });
});

test('turSayilari: boş tur sıfır sayı verir', () => {
  assert.deepEqual(turSayilari({}), { tur: 1, gorulen: 0, degerlendirilen: 0, elenen: {}, yazilan: 0, yayimlanan: 0, bulten: 0, bekleyen: 0 });
});

test('gizlilik: çıktıda gerekçe metni, kaynak adı ya da adres kalmaz', () => {
  const t = turSayilari({
    sonuclar: [
      { durum: 'elendi', gerekce: 'Yayın kurulu onaylamadı: Gizli Gazete adını anıyor https://gizli.example/haber' },
      { durum: 'elendi', gerekce: 'Gizli Gazete özel haberi' },
      { durum: 'elendi', gerekce: 'standart:kirmizi:suc @model#abc https://gizli.example' },
    ],
    ozet: { yazilar: [] },
  });
  const json = JSON.stringify(gunEkle({}, '2026-11-03', t, 'x'));
  assert.ok(!/Gizli|gizli|https?:|example|onaylamadı|@model/.test(json), json);
  for (const k of Object.keys(t.elenen)) assert.match(k, /^[a-z0-9:-]+$/);
});

test('gunEkle: aynı gün toplanır (elenen dahil), 400 günden eskisi düşer', () => {
  const a = turSayilari({ gorulen: 2, sonuclar: [{ durum: 'elendi', gerekce: 'bayat (5 günü geçti)' }], ozet: {} });
  let d = gunEkle({}, '2026-11-03', a, 't1');
  d = gunEkle(d, '2026-11-03', a, 't2');
  assert.equal(d.guncellendi, 't2');
  assert.equal(d.gunler['2026-11-03'].tur, 2);
  assert.equal(d.gunler['2026-11-03'].gorulen, 4);
  assert.deepEqual(d.gunler['2026-11-03'].elenen, { bayat: 2 });
  const cok = { gunler: Object.fromEntries(Array.from({ length: SAKLA_GUN }, (_, i) => [`2025-${String(i).padStart(4, '0')}`, { tur: 1 }])) };
  const e = gunEkle(cok, '2026-11-03', a, 't3');
  assert.equal(Object.keys(e.gunler).length, SAKLA_GUN);
  assert.ok(e.gunler['2026-11-03'] && !e.gunler['2025-0000']);
});

test('istanbulGunu: gün dönümü İstanbul saatine göre', () => {
  assert.equal(istanbulGunu(new Date('2026-11-02T21:30:00Z')), '2026-11-03');
  assert.equal(istanbulGunu(new Date('2026-11-02T20:30:00Z')), '2026-11-02');
});

test('sayiciSar: adayları ve sonuçları sayar, hatayla gelen kısmi sonuçlar dahil, ozet paylaşılır', async () => {
  const hata = Object.assign(new Error('durdu'), { sonuclar: [{ kimlik: 'x', durum: 'elendi', gerekce: 'kaynakta artık yok' }] });
  const ozet = { yazilar: [], bultenYazildi: false };
  const s = sayiciSar({ ozet, ham: () => [], adaylar: async () => [1, 2, 3], isle: async () => { throw hata; } });
  assert.equal((await s.uyarlayici.adaylar()).length, 3);
  await assert.rejects(s.uyarlayici.isle([]), /durdu/);
  assert.equal(s.uyarlayici.ozet, ozet);
  const t = s.sayilar();
  assert.equal(t.gorulen, 3);
  assert.deepEqual(t.elenen, { 'kaynakta-yok': 1 });
});

test('sayiYaz: dosya yoksa oluşturur, varsa ekler', async () => {
  const dosya = path.join(mkdtempSync(path.join(tmpdir(), 'gs-')), 'yayin-odasi', 'gunluk-sayi.json');
  const t = turSayilari({ gorulen: 1, sonuclar: [], ozet: {} });
  await sayiYaz(dosya, t, new Date('2026-11-03T09:00:00Z'));
  await sayiYaz(dosya, t, new Date('2026-11-03T10:00:00Z'));
  const j = JSON.parse(readFileSync(dosya, 'utf8'));
  assert.equal(j.gunler['2026-11-03'].tur, 2);
  assert.equal(j.guncellendi, '2026-11-03T10:00:00.000Z');
  writeFileSync(dosya, '{bozuk');
  await assert.rejects(sayiYaz(dosya, t));
});
