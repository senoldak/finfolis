import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import kaynak, { takvimAdayi } from './veri-takvimi-haber.mjs';

const ev = (tarih, saat, kurum, baslik, ek = {}) => ({ tarih, saat, kurum, baslik, donem: null, url: null, kaynak: 'x', ...ek });
const K = [{ ad: 'TÜİK ulusal veri yayımlama takvimi', url: 'https://www.resmiistatistik.gov.tr/' }, { ad: 'TCMB veri yayımlama takvimi', url: 'https://appg.tcmb.gov.tr/' }];
const takvim = {
  kaynaklar: K,
  olaylar: [
    ev('2026-10-30', '10:00', 'TÜİK', 'Dış Ticaret İstatistikleri', { donem: 'Eylül 2026' }), // önceki hafta
    ev('2026-11-02', '14:30', 'TCMB', 'Haftalık Para ve Banka İstatistikleri', { haftalik: true }),
    ev('2026-11-03', '10:00', 'TÜİK', 'Tüketici Fiyat Endeksi (TÜFE)', { donem: 'Ekim 2026' }),
    ev('2026-11-04', '14:30', 'TCMB', 'Reel Efektif Döviz Kuru'),
    ev('2026-11-09', '10:00', 'TÜİK', 'Sonraki hafta'),
  ],
};
// 2026-11-02 pazartesi. İstanbul UTC+3: 07:30 = 04:30Z.
const pzt = (utc) => new Date(`2026-11-02T${utc}Z`);

test('pazartesi 07:00 sonrası o haftanın TÜİK ve TCMB yayınları, haftalık rutinler hariç', () => {
  const a = takvimAdayi(takvim, pzt('04:30:00'));
  assert.equal(a.id, 'veri-takvimi:2026-11-02');
  assert.equal(a.baslik, 'Bu hafta 2 resmi veri açıklanacak: 2 Kasım–8 Kasım takvimi');
  assert.match(a.kaynakMetni, /Salı 3 Kasım: TÜİK 10:00: Tüketici Fiyat Endeksi \(TÜFE\) \(Ekim 2026\)\./);
  assert.match(a.kaynakMetni, /Çarşamba 4 Kasım: TCMB 14:30: Reel Efektif Döviz Kuru\./);
  assert.doesNotMatch(a.kaynakMetni, /Haftalık Para|Sonraki hafta|Dış Ticaret/);
  assert.match(a.kaynakMetni, /https:\/\/finfolis\.com\/veri\/takvim\//);
  assert.equal(a.kategori, 'ekonomi');
  assert.deepEqual(a.kaynaklar, K);
});

test('07:00 öncesi, pazartesi dışı günler ve olaysız hafta aday vermez', () => {
  assert.equal(takvimAdayi(takvim, pzt('03:59:00')), null); // 06:59 İstanbul
  assert.equal(takvimAdayi(takvim, new Date('2026-11-03T08:00:00Z')), null); // salı
  assert.equal(takvimAdayi(takvim, new Date('2026-11-16T08:00:00Z')), null); // olaysız pazartesi
  assert.equal(takvimAdayi({ olaylar: [] }, pzt('08:00:00')), null);
});

test('İstanbul gününe göre: pazar gecesi UTC pazartesi sayılmaz, pazartesi 01:00 İstanbul henüz erken', () => {
  assert.equal(takvimAdayi(takvim, new Date('2026-11-01T22:30:00Z')), null); // 2 Kasım 01:30 İstanbul, saat < 07
  assert.ok(takvimAdayi(takvim, new Date('2026-11-02T20:00:00Z'))); // 23:00 İstanbul, aynı gün: aynı kimlik, görülen eler
});

test('PPK karar günü haftada varsa öne çıkar', () => {
  const t = { kaynaklar: K, olaylar: [ev('2026-12-10', '14:00', 'TCMB', 'PPK toplantı kararı'), ev('2026-12-08', '10:00', 'TÜİK', 'Sanayi Üretim Endeksi', { donem: 'Ekim 2026' })] };
  const a = takvimAdayi(t, new Date('2026-12-07T05:00:00Z'));
  assert.equal(a.baslik, 'Bu hafta PPK kararı dahil 2 resmi veri açıklanacak: 7 Aralık–13 Aralık takvimi');
  assert.match(a.kaynakMetni, /Monetary Policy Committee \(PPK\) event this week: Perşembe 10 Aralık, PPK toplantı kararı\. Lead with it\./);
  assert.ok(a.onem > 62);
});

test('hent: dosyadan okur, dosya yoksa boş döner', async () => {
  const d = mkdtempSync(join(tmpdir(), 'tk-'));
  const f = join(d, 'takvim.json');
  writeFileSync(f, JSON.stringify(takvim));
  assert.equal((await kaynak.hent({ takvimDosyasi: f, simdi: pzt('05:00:00') })).length, 1);
  const hata = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await kaynak.hent({ takvimDosyasi: join(d, 'yok.json'), simdi: pzt('05:00:00') }), []);
  } finally {
    console.error = hata;
  }
});
