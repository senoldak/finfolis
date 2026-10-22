import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { adresiSil, coz, gizliKaynaklar, gizliMedyaAdlari, kaynakIzi, kaynakKodu, ozet, sifrele } from './gizli.mjs';
import { hafizaAc, hafizaKapat, yayinAc, yayinKapat } from './hent-haberler.mjs';

const A = Buffer.alloc(32, 1);
const B = Buffer.alloc(32, 2);

test('şifrele/çöz gidiş-dönüş; her şifreleme farklı metin, yanlış anahtar reddedilir', () => {
  const v = [{ ad: 'Örnek', url: 'https://haber.example.com/a' }];
  const s1 = sifrele(v, A);
  assert.match(s1, /^v1\./);
  assert.notEqual(s1, sifrele(v, A));
  assert.deepEqual(coz(s1, A), v);
  assert.throws(() => coz(s1, B));
  assert.ok(!s1.includes('example'));
});

test('kod ve özet: kararlı, anahtara bağlı, adı içermez', () => {
  assert.equal(kaynakKodu('Örnek Haber', A), kaynakKodu('Örnek Haber', A));
  assert.notEqual(kaynakKodu('Örnek Haber', A), kaynakKodu('Örnek Haber', B));
  assert.match(kaynakKodu('Örnek Haber', A), /^k[0-9a-f]{6}$/);
  assert.match(ozet('https://haber.example.com/a', A), /^[0-9a-f]{16}$/);
});

test('adresiSil hata mesajındaki adresleri siler', () => {
  assert.equal(adresiSil('403 Forbidden: https://haber.example.com/rss?x=1'), '403 Forbidden: [adres]');
});

test('gizliKaynaklar: dosyadan okur, anahtar yoksa boş döner', () => {
  const dosya = path.join(mkdtempSync(path.join(tmpdir(), 'gizli-')), 'k.sifreli');
  const icerik = { beslemeler: [{ ad: 'Örnek Haber Business', rss: 'https://haber.example.com/rss' }], ipucu: [{ ad: 'İpucu', url: 'https://ipucu.example.com/rss' }], medya: ['Ek Yayın'], derleyiciler: [{ ad: 'Derleyici', rss: 'https://derleyici.example.com/feed' }] };
  writeFileSync(dosya, sifrele(icerik, A));
  assert.deepEqual(gizliKaynaklar({ dosya, a: A }), icerik);
  assert.deepEqual(gizliKaynaklar({ dosya, a: null, uyar: () => {} }), { beslemeler: [], ipucu: [], medya: [], derleyiciler: [] });
  assert.deepEqual(gizliMedyaAdlari(icerik), ['Örnek Haber', 'İpucu', 'Derleyici', 'Ek Yayın']);
});

test('kaynakIzi: tekilleştirip şifreler, boş listede alan yazılmaz', () => {
  assert.equal(kaynakIzi([]), undefined);
  const iz = kaynakIzi([
    { ad: 'X', url: 'https://x.example.com/1' },
    { ad: 'X', url: 'https://x.example.com/1' },
  ]);
  assert.deepEqual(coz(iz), [{ ad: 'X', url: 'https://x.example.com/1' }]);
});

test('olay hafızası: özet şifreli saklanır, değişmeyen kayıt yeniden şifrelenmez', () => {
  const kapali = hafizaKapat([{ id: 'k1:aa', ozet: 'Oil prices jump', zaman: '2026-10-15T00:00:00Z' }]);
  assert.equal(kapali[0].ozet, undefined);
  assert.ok(!JSON.stringify(kapali).includes('Oil'));
  const acik = hafizaAc(kapali);
  assert.equal(acik[0].ozet, 'Oil prices jump');
  assert.equal(hafizaKapat(acik)[0].ozetSifreli, kapali[0].ozetSifreli);
});

test('tekrar hafızası: kaynak başlık ve özetleri şifreli saklanır', () => {
  const kayit = { slug: 'petrol-yukseldi', baslik: 'Petrol yükseldi', kaynaklar: [{ baslik: 'Oil prices jump', ozet: 'Brent rose' }], zaman: '2026-10-15T00:00:00Z' };
  const kapali = yayinKapat([kayit]);
  assert.equal(kapali[0].kaynaklar, undefined);
  assert.ok(!JSON.stringify(kapali).includes('Oil'));
  const acik = yayinAc(kapali);
  assert.deepEqual(acik[0].kaynaklar, kayit.kaynaklar);
  assert.equal(yayinKapat(acik)[0].kaynaklarSifreli, kapali[0].kaynaklarSifreli);
});
