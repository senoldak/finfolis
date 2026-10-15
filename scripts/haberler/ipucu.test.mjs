import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onemArtir } from './ipucu.mjs';

const simdi = new Date('2026-10-10T12:00:00Z');

test('onemArtir eşleşen adayı yükseltir, eşleşmeyene dokunmaz', () => {
  const adaylar = [
    { id: 'a', baslik: 'Fed faiz kararını açıkladı: politika faizi sabit', onem: 3 },
    { id: 'b', baslik: 'SEC yeni kripto kuralı yayımladı', onem: 2 },
    { id: 'c', baslik: 'Fed faiz kararı', onem: 5 },
  ];
  const ipuclari = [
    { baslik: 'Fed faiz oranlarını sabit tuttu', tarih: new Date('2026-10-10T08:00:00Z') },
    { baslik: 'SEC kripto düzenlemesi', tarih: new Date('2026-10-08T08:00:00Z') }, // 24 saatten eski
  ];
  const out = onemArtir(adaylar, ipuclari, simdi);
  assert.equal(out.find((a) => a.id === 'a').onem, 4);
  assert.equal(out.find((a) => a.id === 'b').onem, 2);
  assert.equal(out.find((a) => a.id === 'c').onem, 5);
});

test('onemArtir aynı siteden gelen ipucunu saymaz (besleme kendini onaylamaz)', () => {
  const adaylar = [{ id: 'kabc123:0011223344556677', alan: 'haber-a.example', baslik: 'Oil prices jump after OPEC cut', onem: 2 }];
  const tarih = new Date('2026-10-10T08:00:00Z');
  assert.equal(onemArtir(adaylar, [{ baslik: 'Oil prices jump after OPEC cut', tarih, alan: 'haber-a.example' }], simdi)[0].onem, 2);
  assert.equal(onemArtir(adaylar, [{ baslik: 'Oil prices jump as OPEC cuts output', tarih, alan: 'haber-b.example' }], simdi)[0].onem, 3);
});

test('hent: biri hata verse de diğer akışlar döner, eksik kayıt atlanır', async () => {
  const { hent } = await import('./ipucu.mjs');
  const akislar = [{ ad: 'A', url: 'https://a.test/rss' }, { ad: 'B', url: 'https://b.test/rss' }, { ad: 'C', url: 'https://c.test/rss' }];
  const xml = `<rss><channel>
<item><link>https://x.test/a</link><title>Fed faiz</title><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate></item>
<item><link>https://x.test/a</link><title>Tarihsiz</title></item>
<item><link>https://x.test/a</link><title></title><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;
  const indir = async (url) => { if (url === akislar[0].url) throw new Error('kapalı'); return xml; };
  const r = await hent({ indir, akislar });
  assert.equal(r.length, akislar.length - 1);
  assert.ok(r.every((i) => i.baslik === 'Fed faiz' && i.tarih));
});
