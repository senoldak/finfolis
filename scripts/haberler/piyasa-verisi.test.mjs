import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guncelle } from './piyasa-verisi.mjs';
import { gorunur } from '../../src/lib/gorunur.mjs';

const fx = (ad) => readFileSync(new URL(`./fixtures/${ad}`, import.meta.url), 'utf8');
const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});

const yanit = (govde, durum = 200) => new Response(govde, { status: durum });
const SIMDI = new Date('2026-10-10T09:00:00Z');

// URL'ye göre sahte yanıt veren fetch. frankfurterDurum 500 ise kur istekleri hata verir;
// sayfalar: URL parçası -> yanıt metni ya da durum kodu (sayı) ile geçersiz kılınır.
function sahteFetch({ frankfurterDurum = 200, sayfalar = {} } = {}) {
  const varsayilan = {
    'PPK/2026': fx('tcmb-ppk.html'),
    'PPK/2027': '<html></html>',
    'duy2026-38': fx('tcmb-karar.html'),
    'duy2026-42': fx('tcmb-ozet.html'),
    'Tuketici+Fiyatlari': fx('tcmb-tufe.html'),
  };
  const tum = { ...varsayilan, ...sayfalar };
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('frankfurter')) {
      if (frankfurterDurum !== 200) return yanit('hata', frankfurterDurum);
      return yanit(fx(u.includes('..') ? 'frankfurter-aralik.json' : 'frankfurter-yil.json'));
    }
    const anahtar = Object.keys(tum).find((k) => u.includes(k));
    if (!anahtar) return yanit('yok', 404);
    const v = tum[anahtar];
    return typeof v === 'number' ? yanit('hata', v) : yanit(v);
  };
}

test('dolar: Frankfurter yanıtından değer, önceki ve değişim', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI);
  const d = v.gostergeler.find((g) => g.id === 'dolar');
  assert.equal(d.deger, 49.173);
  assert.equal(d.onceki, 41.9);
  assert.equal(d.gecerlilik, 'kur');
  assert.equal(d.kaynak.ad.length > 0, true);
  assert.ok(d.degisim < 0);
  assert.equal('ornek' in v, false);
});

test('Japon yeni 100 yen başına verilir', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI);
  assert.equal(v.gostergeler.find((g) => g.id === 'yen').deger, 4917.3);
});

test('politika faizi TCMB kararından okunur', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI);
  const f = v.gostergeler.find((g) => g.id === 'faiz');
  assert.equal(f.deger, 37);
  assert.equal(f.gecerlilik, 'aciklama');
  assert.ok(f.zaman.startsWith('2026-09-10'));
  assert.ok(f.kaynak.url.endsWith('duy2026-38')); // 17 Eylül özeti atlandı, değer 99 değil 37
});

test('politika faizi değişince yeni oran okunur, eskisi değil', async () => {
  const karar =
    '<html><head><title>Basın Duyurusu</title></head><body><p>Para Politikası Kurulu (Kurul), politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir. Kurul ayrıca gecelik borç verme faiz oranını yüzde 40’tan yüzde 39’a indirmiştir.</p></body></html>';
  sahteFetch({ sayfalar: { 'duy2026-38': karar } });
  const v = await guncelle(undefined, SIMDI);
  assert.equal(v.gostergeler.find((g) => g.id === 'faiz').deger, 36);
});

test('politika faizi artırılınca da yeni oran okunur', async () => {
  const karar =
    "<html><head><title>Basın Duyurusu</title></head><body><p>politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 36,5'ten yüzde 38'e yükseltilmesine karar vermiştir.</p></body></html>";
  sahteFetch({ sayfalar: { 'duy2026-38': karar } });
  const v = await guncelle(undefined, SIMDI);
  assert.equal(v.gostergeler.find((g) => g.id === 'faiz').deger, 38);
});

test('Frankfurter 500 ve eski varsa eski değer ve zaman korunur', async () => {
  sahteFetch({ frankfurterDurum: 500 });
  const eski = {
    guncelleme: '2026-10-01T00:00:00Z',
    gostergeler: [{ id: 'dolar', ad: 'Dolar / TL', deger: 40, zaman: '2026-10-01T12:00:00Z', gecerlilik: 'kur', kaynak: { ad: 'x', url: 'y' } }],
  };
  const v = await guncelle(eski, SIMDI);
  const d = v.gostergeler.find((g) => g.id === 'dolar');
  assert.equal(d.deger, 40);
  assert.equal(d.zaman, '2026-10-01T12:00:00Z');
});

test('Frankfurter 500 ve eski yoksa dolar girdisi olmaz', async () => {
  sahteFetch({ frankfurterDurum: 500 });
  const v = await guncelle(undefined, SIMDI);
  assert.equal(v.gostergeler.find((g) => g.id === 'dolar'), undefined);
});

const gunOnce = (n) => new Date(Date.now() - n * 86400000).toISOString();
test('gorunur: kur 4 günden eskiyse gizlenir', () => {
  assert.equal(gorunur({ gecerlilik: 'kur', zaman: gunOnce(4) }, new Date()), false);
  assert.equal(gorunur({ gecerlilik: 'kur', zaman: gunOnce(2) }, new Date()), true);
});
test('gorunur: açıklama değişene kadar görünür', () => {
  assert.equal(gorunur({ gecerlilik: 'aciklama', zaman: gunOnce(40) }, new Date()), true);
});

test('en yeni karar sayfası 404 ise eski faiz korunur', async () => {
  sahteFetch({ sayfalar: { 'duy2026-50': 404 } });
  const eski = { guncelleme: 'x', gostergeler: [{ id: 'faiz', ad: 'Politika faizi', deger: 36, zaman: '2026-07-23T00:00:00+03:00', gecerlilik: 'aciklama', kaynak: { ad: 'a', url: 'b' } }] };
  const v = await guncelle(eski, new Date('2026-10-25T09:00:00Z'));
  assert.equal(v.gostergeler.find((g) => g.id === 'faiz').deger, 36);
});

test('en yeni karar sayfası 404 ve eski yoksa faiz yok (eski karar yayımlanmaz)', async () => {
  sahteFetch({ sayfalar: { 'duy2026-50': 404 } });
  const v = await guncelle(undefined, new Date('2026-10-25T09:00:00Z'));
  assert.equal(v.gostergeler.find((g) => g.id === 'faiz'), undefined);
});

test('ocakta önceki yılın karar listesine bakılır', async () => {
  sahteFetch({ sayfalar: { 'duy2026-50': '<p>politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 36’ya indirilmesine karar vermiştir.</p>' } });
  const v = await guncelle(undefined, new Date('2027-01-05T09:00:00Z'));
  const f = v.gostergeler.find((g) => g.id === 'faiz');
  assert.equal(f.deger, 36);
  assert.ok(f.kaynak.url.endsWith('duy2026-50'));
});

test('kur zamanı İstanbul gece yarısı (saat uydurulmaz)', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI);
  assert.equal(v.gostergeler.find((g) => g.id === 'dolar').zaman, '2026-10-09T00:00:00+03:00');
});

test('enflasyon: TCMB TÜFE tablosundan yıllık değer ve bir yıl önceki ay', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI);
  const e = v.gostergeler.find((g) => g.id === 'enflasyon');
  assert.equal(e.deger, 29.73);
  assert.equal(e.onceki, 33.29);
  assert.equal(e.simgeDegeri, 3);
  assert.equal(e.gecerlilik, 'aciklama');
  assert.equal(e.zamanEtiket, 'Eylül 2026 verisi');
});

test('enflasyon tablosu alınamazsa gösterge yok', async () => {
  sahteFetch({ sayfalar: { 'Tuketici+Fiyatlari': 500 } });
  const v = await guncelle(undefined, SIMDI);
  assert.equal(v.gostergeler.find((g) => g.id === 'enflasyon'), undefined);
});

test('kur gösterge geçmişi tarihe göre sıralı ve son değerle aynı gün', async () => {
  sahteFetch();
  const v = await guncelle(undefined, SIMDI);
  const d = v.gostergeler.find((g) => g.id === 'dolar');
  assert.equal(d.gecmis.length, 2); // fixture: iki iş günü
  const tarihler = d.gecmis.map((p) => p.tarih);
  assert.deepEqual([...tarihler].sort(), tarihler);
  assert.equal(d.gecmis.at(-1).tarih, d.zaman.slice(0, 10));
  assert.equal(d.gecmis.at(-1).deger, d.deger);
});

test('borsa: Yahoo kapanışından son değer, günlük değişim ve 90 günlük geçmiş', async () => {
  const { borsaGostergesiYanitindan } = await import('./piyasa-verisi.mjs');
  const gun = (tarih) => Date.parse(`${tarih}T07:00:00Z`) / 1000;
  const veri = {
    chart: {
      result: [
        {
          meta: { exchangeTimezoneName: 'Europe/Istanbul' },
          timestamp: [gun('2026-01-02'), gun('2026-10-13'), gun('2026-10-14')],
          indicators: { quote: [{ close: [100, 110, null] }] },
        },
      ],
    },
  };
  const b = { id: 'x', ad: 'X', sembol: 'X.IS', simge: 'fabrika' };
  const g = borsaGostergesiYanitindan(b, veri, new Date('2026-10-15T09:00:00Z'));
  assert.equal(g.deger, 110);
  assert.equal(g.degisim, 10);
  assert.equal(g.zaman, '2026-10-13T00:00:00+03:00');
  assert.deepEqual(g.gecmis.map((p) => p.tarih), ['2026-10-13']); // 90 günden eski nokta düşer
});

test('değerler değişmediyse guncelleme zaman damgası korunur (gereksiz yayın tetiklenmez)', async () => {
  sahteFetch();
  const ilk = await guncelle(undefined, SIMDI);
  const ikinci = await guncelle(ilk, new Date('2026-10-10T11:00:00Z'));
  assert.equal(ikinci.guncelleme, ilk.guncelleme);
  assert.deepEqual(ikinci.gostergeler, ilk.gostergeler);
});
