import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bitenHafta, bitenAy, ayAraligi, getiri, karneler, karneYazisi, enflasyonYazisi, KARNE, ENFLASYON_ARACLARI } from './karne.mjs';
import { tufeSatirlari } from './piyasa-verisi.mjs';
import { kapakCiz } from '../kapak/kapak.mjs';

test('biten hafta yalnızca cumartesi/pazar (İstanbul) döner; cuma kapanışından cumaya', () => {
  assert.equal(bitenHafta(new Date('2026-10-15T09:00:00Z')), null); // perşembe
  assert.deepEqual(bitenHafta(new Date('2026-10-17T09:00:00Z')), { anahtar: '2026-10-16', bas: '2026-10-09', bit: '2026-10-16' });
  assert.equal(bitenHafta(new Date('2026-10-18T20:00:00Z')).anahtar, '2026-10-16'); // pazar 23:00 İstanbul
  assert.equal(bitenHafta(new Date('2026-10-18T22:00:00Z')), null); // pazartesi 01:00 İstanbul
});

test('biten ay ayın ilk 7 günü döner; ay aralığı ay sonları arasında, yıl dönümünde de doğru', () => {
  assert.equal(bitenAy(new Date('2026-10-15T09:00:00Z')), null);
  assert.deepEqual(bitenAy(new Date('2026-10-03T09:00:00Z')), { anahtar: '2026-09', bas: '2026-08-31', bit: '2026-09-30', ay: 9, yil: 2026 });
  assert.deepEqual(bitenAy(new Date('2027-01-02T09:00:00Z')), { anahtar: '2026-12', bas: '2026-11-30', bit: '2026-12-31', ay: 12, yil: 2026 });
  assert.equal(ayAraligi(2026, 2).bit, '2026-02-28');
});

test('getiri: tatil/hafta sonunda önceki kapanış; çok eski veri kullanılmaz', () => {
  const seri = [
    { tarih: '2026-10-01', deger: 100 },
    { tarih: '2026-10-08', deger: 105 },
    { tarih: '2026-10-09', deger: 110 },
  ];
  const g = getiri(seri, '2026-10-02', '2026-10-11');
  assert.equal(g.ilk.tarih, '2026-10-01');
  assert.equal(g.son.tarih, '2026-10-09');
  assert.ok(Math.abs(g.yuzde - 10) < 1e-9);
  assert.equal(getiri(seri, '2026-09-01', '2026-10-09'), null); // başlangıçta 6 günden yakın kapanış yok
});

const satirlar = (n) =>
  KARNE.slice(0, n).map((k, i) => ({ ...k, yuzde: 3 - i, son: { tarih: '2026-10-16', deger: 100 + i }, ilk: { tarih: '2026-10-09', deger: 100 } }));

test('karne yazısı: en çok yükselen/düşen spotta, gruplu gövde, uyarı ve kaynak', async () => {
  const y = karneYazisi({ tur: 'hafta', donem: { bas: '2026-10-09', bit: '2026-10-16' }, satirlar: satirlar(16), simdi: new Date('2026-10-17T09:00:00Z') });
  assert.equal(y.baslik, 'Haftalık piyasa karnesi · 12–16 Ekim 2026');
  assert.match(y.spot, /en çok S&P 500 yükseldi \(\+%3,0\), en çok Dolar endeksi geriledi \(−%12,0\)/);
  assert.match(y.govde, /## Borsalar/);
  assert.match(y.govde, /Geçmiş performans gelecekteki sonuçların göstergesi değildir/);
  assert.equal(y.kaynaklar[0].ad, 'Piyasa kapanış verisi');
  const png = await kapakCiz(y.kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('enflasyon yazısı: tablo, reel getiri, yenen araçlar; hiçbiri yenmediyse başlık bunu söyler', async () => {
  const s = [
    { ...ENFLASYON_ARACLARI[2], aylik: 3, yillik: 40 },
    { ...ENFLASYON_ARACLARI[0], aylik: 1, yillik: 20 },
  ];
  const y = enflasyonYazisi({ tufe: { ay: 9, yil: 2026, aylik: 1.84, yillik: 29.73 }, satirlar: s, simdi: new Date(), kaynak: { ad: 'TÜİK', url: 'https://x.test/' } });
  assert.equal(y.baslik, "Eylül'de hangi yatırım araçları enflasyonun üzerinde kaldı?");
  assert.match(y.spot, /Son bir yılda enflasyonun üzerinde getiri: gram altın\./);
  assert.deepEqual(y.tablo.satirlar[0], ['Gram altın', '+%3,0', '+%40,0', '+%7,9']);
  assert.deepEqual(y.tablo.satirlar.at(-1), ['TÜFE', '+%1,8', '+%29,7', '—']);
  assert.equal(y.kategori, 'kisisel-finans');
  const hic = enflasyonYazisi({ tufe: { ay: 9, yil: 2026, aylik: 5, yillik: 50 }, satirlar: s, simdi: new Date() });
  assert.match(hic.baslik, /hiçbiri enflasyonun üzerinde kalmadı/);
  const png = await kapakCiz(y.kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

// Sahte okuyucu: her seri 2026-08-01'den bugüne günde %0,1 artan; ağ yok.
function sahteOkuyucu() {
  const seri = [];
  for (let t = Date.UTC(2025, 6, 1), v = 100; t <= Date.UTC(2026, 9, 20); t += 864e5, v *= 1.001) seri.push({ tarih: new Date(t).toISOString().slice(0, 10), deger: v });
  let istek = 0;
  return { seri: async () => (istek++, seri), get istek() { return istek; } };
}

test('karneler: zamanı gelmediyse ağa çıkmaz; hafta sonu bir kez yazar, ikinci çalıştırmada tekrar etmez', async () => {
  const okuyucu = sahteOkuyucu();
  const durum = {};
  assert.deepEqual(await karneler({ durum, simdi: new Date('2026-10-15T09:00:00Z'), okuyucu }), []);
  assert.equal(okuyucu.istek, 0);
  const cumartesi = new Date('2026-10-17T09:00:00Z');
  const y = await karneler({ durum, simdi: cumartesi, okuyucu });
  assert.equal(y.length, 1);
  assert.match(y[0].baslik, /^Haftalık piyasa karnesi/);
  assert.equal(durum.karne.hafta, '2026-10-16');
  assert.deepEqual(await karneler({ durum, simdi: cumartesi, okuyucu }), []);
});

test('karneler: yeni TÜFE ayı için enflasyon karnesi bir kez; aylık değer yoksa yazılmaz', async () => {
  const okuyucu = sahteOkuyucu();
  const durum = {};
  const simdi = new Date('2026-10-15T09:00:00Z');
  const tufe = { id: 'enflasyon', deger: 29.73, aylik: 1.84, zaman: '2026-09-01T00:00:00+03:00', kaynak: { ad: 'TÜİK', url: 'https://x.test/' } };
  assert.deepEqual(await karneler({ durum, simdi, okuyucu, piyasa: { gostergeler: [{ ...tufe, aylik: undefined }] } }), []);
  const y = await karneler({ durum, simdi, okuyucu, piyasa: { gostergeler: [tufe] } });
  assert.equal(y.length, 1);
  assert.equal(durum.karne.enflasyon, '2026-09');
  assert.equal(y[0].tablo.satirlar.length, ENFLASYON_ARACLARI.length + 1);
  assert.deepEqual(await karneler({ durum, simdi, okuyucu, piyasa: { gostergeler: [tufe] } }), []);
});

test('TCMB TÜFE tablosu: yıllık ve aylık sütun okunur', () => {
  const html = '<tr><td style="h">09-2026</td> <td style="a">29.73</td> <td style="b">1.84</td></tr><tr><td>08-2026</td><td>31.51</td></tr>';
  assert.deepEqual(tufeSatirlari(html), [
    { ay: 9, yil: 2026, yillik: 29.73, aylik: 1.84 },
    { ay: 8, yil: 2026, yillik: 31.51 },
  ]);
});

test('pazar: BIST ve ABD haftanın hisseleri bir kez; cumartesi yazılmaz', async () => {
  const okuyucu = sahteOkuyucu();
  const durum = { karne: { hafta: '2026-10-16' } };
  assert.deepEqual(await karneler({ durum, simdi: new Date('2026-10-17T09:00:00Z'), okuyucu }), []);
  const pazar = new Date('2026-10-18T09:00:00Z');
  const y = await karneler({ durum, simdi: pazar, okuyucu });
  assert.deepEqual(y.map((x) => x.baslik), ["Borsa İstanbul'da haftanın hisseleri · 12–16 Ekim 2026", "ABD'nin en büyük şirketlerinde haftanın karnesi · 12–16 Ekim 2026"]);
  assert.match(y[0].govde, /yatırım tavsiyesi değildir/);
  assert.match(y[0].spot, /16 kalemin hepsi yükseldi/);
  assert.equal(durum.karne.hisseHafta, '2026-10-16');
  assert.equal((await kapakCiz(y[0].kapak)).subarray(1, 4).toString(), 'PNG');
  assert.deepEqual(await karneler({ durum, simdi: pazar, okuyucu }), []);
});

test('ayın ilk haftası sektör karnesi; çeyreği izleyen ayın 8-14ü yılbaşından bu yana karne', async () => {
  const okuyucu = sahteOkuyucu();
  const durum = { karne: { ay: '2026-09' } };
  const y = await karneler({ durum, simdi: new Date('2026-10-02T09:00:00Z'), okuyucu });
  assert.deepEqual(y.map((x) => x.baslik), ['ABD borsasında sektörlerin aylık karnesi · Eylül 2026']);
  assert.match(y[0].govde, /XLK/);
  assert.equal(durum.karne.sektorAy, '2026-09');
  const c = await karneler({ durum, simdi: new Date('2026-10-09T09:00:00Z'), okuyucu });
  assert.deepEqual(c.map((x) => x.baslik), ['Yılbaşından bu yana piyasa karnesi · Ocak–Eylül 2026']);
  assert.match(c[0].govde, /2025-12-31 → 2026-09-30/);
  assert.equal(durum.karne.ceyrek, '2026-09');
  assert.deepEqual(await karneler({ durum, simdi: new Date('2026-10-15T09:00:00Z'), okuyucu }), []);
});
