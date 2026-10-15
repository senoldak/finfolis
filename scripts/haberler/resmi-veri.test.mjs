import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guncelle, kurXml, repoSatirlari } from './resmi-veri.mjs';

const fx = (ad) => readFileSync(new URL(`./fixtures/${ad}`, import.meta.url), 'utf8');
const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const yanit = (govde, durum = 200) => new Response(govde, { status: durum });
const SIMDI = new Date('2026-10-15T14:00:00Z');

// URL parçası -> yanıt metni ya da hata kodu. Eşleşmeyen her istek 404 döner (arşiv günleri dahil).
function sahteFetch(sayfalar = {}) {
  const tum = {
    'kurlar/today.xml': fx('tcmb-kur.xml'),
    '1+Hafta+Repo': fx('tcmb-repo.html'),
    'PPK/2026': fx('tcmb-ppk.html'),
    'duy2026-38': fx('tcmb-karar.html'),
    'duy2026-42': fx('tcmb-ozet.html'),
    'Tuketici+Fiyatlari': fx('tcmb-tufe-30ay.html'),
    ...sayfalar,
  };
  globalThis.fetch = async (url) => {
    const u = String(url);
    const anahtar = Object.keys(tum).find((k) => u.includes(k));
    if (!anahtar) return yanit('yok', 404);
    const v = tum[anahtar];
    return typeof v === 'number' ? yanit('hata', v) : yanit(v);
  };
}

test('kurXml: tarih, bülten ve kurlar; döviz satışı olmayan satır atlanır', () => {
  const b = kurXml(fx('tcmb-kur.xml'));
  assert.equal(b.tarih, '2026-10-15');
  assert.equal(b.bultenNo, '2026/195');
  assert.deepEqual(b.kurlar.map((k) => k.kod), ['USD', 'EUR', 'JPY']);
  const usd = b.kurlar[0];
  assert.deepEqual([usd.dovizAlis, usd.dovizSatis, usd.efektifAlis, usd.efektifSatis], [49.3315, 49.4204, 49.297, 49.4945]);
  assert.equal(b.kurlar[2].birim, 100);
});

test('kurXml: bozuk yanıt hata verir', () => {
  assert.throws(() => kurXml('<html>bakım</html>'));
});

test('repoSatirlari: tarih sırasına dizilir, borç verme sütunu okunur', () => {
  const s = repoSatirlari(fx('tcmb-repo.html'));
  assert.deepEqual(s.map((x) => x.tarih), ['2024-12-27', '2025-01-24', '2025-04-18', '2025-12-12', '2026-01-23']);
  assert.equal(s.at(-1).oran, 37);
  assert.equal(s[2].oran, 46);
});

test('guncelle: üç bölüm de resmi kaynaktan gelir', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI, { gun: 3 });
  assert.equal(v.kur.tarih, '2026-10-15');
  assert.equal(v.kur.gecmis[0].USD.satis, 49.4204);
  assert.equal(v.faiz.oran, 37);
  assert.equal(v.faiz.gecerlilik, '2026-01-23');
  assert.equal(v.faiz.sonKarar?.oran, 37);
  assert.ok(v.enflasyon.satirlar.length > 24);
  for (const b of [v.kur, v.faiz, v.enflasyon]) assert.equal(b.alinma, SIMDI.toISOString());
});

test('guncelle: kaynak alınamazsa son bilinen değer tarihiyle kalır', async () => {
  sahteFetch();
  const eski = await guncelle(undefined, SIMDI, { gun: 1 });
  sahteFetch({ 'kurlar/today.xml': 503, '1+Hafta+Repo': '<html>bakım</html>' });
  const sonra = new Date('2026-10-16T14:00:00Z');
  const v = await guncelle(eski, sonra, { gun: 1 });
  assert.deepEqual(v.kur, eski.kur);
  assert.deepEqual(v.faiz, eski.faiz);
  assert.equal(v.kur.alinma, SIMDI.toISOString());
});

test('guncelle: veri değişmediyse alınma zamanı da değişmez', async () => {
  sahteFetch();
  const eski = await guncelle(undefined, SIMDI, { gun: 1 });
  sahteFetch();
  const v = await guncelle(eski, new Date('2026-10-15T16:00:00Z'), { gun: 1 });
  assert.deepEqual(v, eski);
});

test('guncelle: karar metni tablo ile çelişirse karar bağlantısı yazılmaz', async () => {
  sahteFetch({ '1+Hafta+Repo': fx('tcmb-repo.html').replace('37.00', '35.00') });
  const v = await guncelle(undefined, SIMDI, { gun: 1 });
  assert.equal(v.faiz.oran, 35);
  assert.equal(v.faiz.sonKarar, null);
});

test('guncelle: hiç alınamamış bölüm eklenmez', async () => {
  sahteFetch({ 'Tuketici+Fiyatlari': 500 });
  const v = await guncelle(undefined, SIMDI, { gun: 1 });
  assert.equal(v.enflasyon, undefined);
  assert.ok(v.kur && v.faiz);
});

test('guncelle: TÜFE tablosunda ay boşluğu varsa enflasyon bölümü güncellenmez', async () => {
  sahteFetch({ 'Tuketici+Fiyatlari': fx('tcmb-tufe-30ay.html').replace(/<tr><td>06-2025<\/td>[^\n]*\n/, '') });
  const v = await guncelle(undefined, SIMDI, { gun: 1 });
  assert.equal(v.enflasyon, undefined);
});
