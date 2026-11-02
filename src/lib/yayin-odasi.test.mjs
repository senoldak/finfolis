import test from 'node:test';
import assert from 'node:assert/strict';
import { yayinOdasiVerisi, elemeMetni, elenenSatirlari, SAYAC_BASLANGICI } from './yayin-odasi.mjs';

const simdi = new Date('2026-11-10T09:00:00+03:00');
const gun = (o = {}) => ({ tur: 1, gorulen: 10, degerlendirilen: 4, yazilan: 3, yayimlanan: 2, bulten: 1, bekleyen: 0, elenen: {}, ...o });
const sayac = {
  gunler: {
    '2026-11-08': gun({ elenen: { 'standart:yatirim-tavsiyesi': 2, bayat: 1 } }),
    '2026-11-09': gun({ gorulen: 20, elenen: { 'standart:yatirim-tavsiyesi': 1, 'standart:kapi-kisi-suc': 1, 'standart:suc': 1, 'standart:bilinmeyen-kural': 1 } }),
    '2026-11-10': gun({ gorulen: 99 }), // bugün: sayfaya girmez
  },
};
const yz = (slug, o = {}) => ({ slug, title: `Başlık ${slug}`, date: new Date('2026-11-09T10:00:00+03:00'), ...o });

test('elemeMetni: bilinen kodlar okura giden metin, bilinmeyen genel metin (kod görünmez)', () => {
  assert.equal(elemeMetni('standart:yatirim-tavsiyesi'), 'Yatırım tavsiyesi riski');
  assert.equal(elemeMetni('standart:kaynak-benzerligi'), 'Kaynağa fazla benziyor');
  assert.equal(elemeMetni('standart:suc'), 'Suç isnadı riski');
  assert.equal(elemeMetni('standart:teror'), 'Terör haberi kuralı');
  assert.equal(elemeMetni('standart:ozel-haber'), 'Başka yayının özel haberi');
  assert.equal(elemeMetni('standart:grup-genelleme'), 'Gruba genelleme');
  assert.equal(elemeMetni('standart:uydurma-kural'), 'Yayın kurallarına takıldı');
  assert.equal(elemeMetni('yeni-kod'), 'Başka bir sebep');
});

test('elenenSatirlari: aynı metne inen kodlar toplanır, çoktan aza sıralanır', () => {
  const s = elenenSatirlari({ 'standart:suc': 1, 'standart:kapi-kisi-suc': 2, 'standart:teror': 1, bayat: 5, 'standart:x': 0 });
  assert.deepEqual(s.map(({ metin, adet }) => [metin, adet]), [['Haber bayatlamıştı', 5], ['Suç isnadı riski', 3], ['Terör haberi kuralı', 1]]);
});

test('dün, son 7 gün ve elenenler sayaçtan; bugün dahil değil', () => {
  const v = yayinOdasiVerisi({ sayac, yazilar: [], simdi });
  assert.equal(v.dun.tarih, '2026-11-09');
  assert.equal(v.dun.gorulen, 20);
  assert.equal(v.dun.yayimlanan, 2);
  assert.deepEqual([v.hafta.bas, v.hafta.son, v.hafta.gun, v.hafta.gorulen, v.hafta.degerlendirilen, v.hafta.bulten], ['2026-11-08', '2026-11-09', 2, 30, 8, 2]);
  assert.deepEqual(v.elenenler, [
    { metin: 'Yatırım tavsiyesi riski', adet: 3 },
    { metin: 'Suç isnadı riski', adet: 2 },
    { metin: 'Haber bayatlamıştı', adet: 1 },
    { metin: 'Yayın kurallarına takıldı', adet: 1 },
  ]);
  assert.equal(v.not, null);
});

test('hafta en çok 7 kayıtlı günü toplar', () => {
  const gunler = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`2026-10-${String(20 + i).padStart(2, '0')}`, gun()]));
  const v = yayinOdasiVerisi({ sayac: { gunler }, simdi });
  assert.equal(v.hafta.gun, 7);
  assert.equal(v.hafta.gorulen, 70);
  assert.equal(v.hafta.bas, '2026-10-23');
});

test('boş sayaç: alanlar boş, nötr not sabit tarihle', () => {
  const v = yayinOdasiVerisi({ sayac: { guncellendi: null, gunler: {} }, yazilar: [], simdi });
  assert.equal(v.dun, null);
  assert.equal(v.hafta, null);
  assert.deepEqual(v.elenenler, []);
  assert.deepEqual(v.not, { baslangic: SAYAC_BASLANGICI });
  assert.equal(yayinOdasiVerisi({ simdi }).dun, null);
});

test('yalnız bugünün kaydı varsa not sayacın ilk gününü gösterir', () => {
  const v = yayinOdasiVerisi({ sayac: { gunler: { '2026-11-10': gun() } }, simdi });
  assert.equal(v.dun, null);
  assert.deepEqual(v.not, { baslangic: '2026-11-10' });
});

test('son haberler: yalnız yayımlanmış bot haberleri, en yeni önce, en çok 8; bülten, zincir, imzalı yazı ve taslak hariç', () => {
  const yazilar = [
    ...Array.from({ length: 10 }, (_, i) => yz(`h${i}`, { date: new Date(Date.UTC(2026, 10, 9, i)), uretim: 'bot' })),
    yz('bulten', { tur: 'bulten', date: new Date('2026-11-09T23:00:00Z') }),
    yz('zincir', { uretim: 'yazi-isleri', date: new Date('2026-11-09T22:00:00Z') }),
    yz('imzali', { author: 'Şenol Dak', date: new Date('2026-11-09T21:00:00Z') }),
    yz('analiz', { yaziTuru: 'analiz', date: new Date('2026-11-09T20:00:00Z') }),
    yz('taslak', { draft: true, date: new Date('2026-11-09T19:00:00Z') }),
    yz('gelecek', { date: new Date('2026-11-12T00:00:00Z') }),
  ];
  const v = yayinOdasiVerisi({ sayac, yazilar, simdi });
  assert.equal(v.sonHaberler.length, 8);
  assert.equal(v.sonHaberler[0].url, '/haber/h9/');
  assert.ok(v.sonHaberler.every((h) => /^\/haber\/h\d\/$/.test(h.url)));
});

test('son uzun yazı: en yeni yazi-isleri yazısı, zincir kaydı yok; yoksa null', () => {
  const yazilar = [yz('eski', { uretim: 'yazi-isleri', date: new Date('2026-11-01T00:00:00Z') }), yz('yeni', { uretim: 'yazi-isleri', date: new Date('2026-11-05T00:00:00Z') }), yz('haber')];
  assert.deepEqual(yayinOdasiVerisi({ sayac, yazilar, simdi }).sonUzunYazi, { baslik: 'Başlık yeni', url: '/haber/yeni/', zincir: null });
  assert.equal(yayinOdasiVerisi({ sayac, yazilar: [yz('haber')], simdi }).sonUzunYazi, null);
});
