import test from 'node:test';
import assert from 'node:assert/strict';
import { haberKaynaklari, kaynakSec, konuTutar } from './kaynak-adlari.mjs';

// Uydurma yayınlar (gerçek kaynak adı testlere yazılmaz).
const LISTE = [
  { ad: 'Örnek Haber Business', rss: 'https://haber.example.com/rss' },
  { ad: 'Deneme Gazete', gorunen: 'Deneme', rss: 'https://deneme.example.org/rss' },
  { ad: 'Kapali Yayin', goster: false, rss: 'https://kapali.example.net/rss' },
];
const HABER = { title: "Nvidia'nın geliri beklentiyi aştı", description: 'Çip üreticisi Nvidia çeyrekte rekor gelir açıkladı.' };

test('tek kaynak: konu denetimi yok, bölüm eki atılır', () => {
  const r = kaynakSec([{ ad: 'Örnek Haber Business', url: 'https://haber.example.com/2026/11/baska-konu' }], LISTE, HABER);
  assert.deepEqual(r, [{ ad: 'Örnek Haber', url: 'https://haber.example.com/2026/11/baska-konu' }]);
});

test('çok kaynak: adresi konuyla tutmayan kaynak düşer; görünen ad kullanılır', () => {
  const iz = [
    { ad: 'Örnek Haber Business', url: 'https://haber.example.com/tech/nvidia-revenue-beats' },
    { ad: 'Deneme Gazete', url: 'https://deneme.example.org/markets/oil-prices-rise' },
  ];
  assert.deepEqual(kaynakSec(iz, LISTE, HABER), [{ ad: 'Örnek Haber', url: 'https://haber.example.com/tech/nvidia-revenue-beats' }]);
});

test('goster:false, listede olmayan, güvensiz adres ve tekrar gösterilmez', () => {
  const iz = [
    { ad: 'Kapali Yayin', url: 'https://kapali.example.net/nvidia' },
    { ad: 'Bilinmeyen', url: 'https://x.example.com/nvidia' },
    { ad: 'Deneme Gazete', url: 'javascript:alert(1)' },
  ];
  assert.deepEqual(kaynakSec(iz, LISTE, HABER), []);
  const iki = [
    { ad: 'Deneme Gazete', url: 'https://deneme.example.org/nvidia-a' },
    { ad: 'Deneme Gazete', url: 'https://deneme.example.org/nvidia-b' },
  ];
  assert.equal(kaynakSec(iki, LISTE, HABER).length, 1);
});

test('konuTutar: adres sözcüğü başlık ya da özette geçmeli, sıradan sözcükler sayılmaz', () => {
  assert.equal(konuTutar('https://haber.example.com/nvidia-earnings', HABER), true);
  assert.equal(konuTutar('https://haber.example.com/business/news-update', { title: 'Business news update' }), false);
  assert.equal(konuTutar('bozuk adres', HABER), false);
});

test('haberKaynaklari: bülten, izsiz ve çözülemeyen iz boş döner', () => {
  assert.deepEqual(haberKaynaklari({ tur: 'bulten', kaynakIzi: 'v1.x' }), []);
  assert.deepEqual(haberKaynaklari({}), []);
  assert.deepEqual(haberKaynaklari({ kaynakIzi: 'bozuk' }), []);
});
