import test from 'node:test';
import assert from 'node:assert/strict';
import { govdeTutar, haberKaynaklari, kaynakSec, konuTutar, ozelAdlar } from './kaynak-adlari.mjs';

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

test('ozelAdlar: büyük harfle başlayan sözcükler, küçük harfe ve aksansız biçime çevrilir', () => {
  assert.deepEqual([...ozelAdlar("Lloyds Bank'a göre İngiltere'de fiyatlar arttı; ZEW endeksi")], ['lloyds', 'bank', 'ingiltere', 'zew']);
});

test('govdeTutar: iki ortak özel ad ya da bir nadir ad gerekir', () => {
  const adlar = ozelAdlar('Hindistan borsasında Sensex ve Nifty düştü; Fed kararı bekleniyor. ZEW verisi açıklandı.');
  assert.equal(govdeTutar('https://haber.example.com/markets/sensex-nifty-fall', adlar), true);
  assert.equal(govdeTutar('https://haber.example.com/markets/fed-holds-rates', adlar), false);
  assert.equal(govdeTutar('https://haber.example.com/markets/fed-holds-rates', adlar, (w) => w === 'fed'), true);
  assert.equal(govdeTutar('https://haber.example.com/markets/oil-prices', adlar, () => true), false);
  assert.equal(govdeTutar('https://haber.example.com/x', undefined), false);
});

test('kaynakSec: başlık tutmayan İngilizce adres gövdedeki özel adlarla kurtulur; ilgisiz kaynak yine düşer', () => {
  const haber = { title: 'Almanya’da ekonomik güven kasımda beklentileri aştı', description: 'Yatırımcı güveni yükseldi.' };
  const iz = [
    { ad: 'Örnek Haber Business', url: 'https://haber.example.com/economy/germany-zew-investor-sentiment' },
    { ad: 'Deneme Gazete', url: 'https://deneme.example.org/sport/football-results' },
  ];
  const govdeAdlari = ozelAdlar('Mannheim merkezli ZEW enstitüsünün endeksi kasımda yükseldi.');
  assert.deepEqual(kaynakSec(iz, LISTE, haber), []);
  assert.deepEqual(kaynakSec(iz, LISTE, haber, { govdeAdlari, nadirMi: (w) => w === 'zew' }), [
    { ad: 'Örnek Haber', url: 'https://haber.example.com/economy/germany-zew-investor-sentiment' },
  ]);
});
