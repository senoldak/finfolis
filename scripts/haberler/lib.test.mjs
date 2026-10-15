import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { slugla, yaziYaz } from './lib.mjs';

test('slugla Türkçe harfleri çevirir', () => {
  assert.equal(
    slugla('Japonya Merkez Bankası faizi İkinci kez artırdı'),
    'japonya-merkez-bankasi-faizi-ikinci-kez-artirdi',
  );
});

test('yaziYaz frontmatter YAML olarak geri okunur', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'haber-'));
  const baslik = 'Fed: "faiz" kararı sonrası piyasalar';
  const alt = 'Grafik: "dolar" ve altın';
  const slug = await yaziYaz(rot, {
    baslik,
    spot: 'Spot: "tırnaklı" özet',
    govde: 'Gövde metni.',
    kategori: 'piyasalar',
    tarih: new Date('2026-10-10T08:00:00Z'),
    tur: 'haber',
    kaynaklar: [{ ad: 'Reuters', url: 'https://example.com/a?b=1' }],
    kapak: async () => Buffer.from([1, 2, 3]),
    kapakAlt: alt,
  });
  const dir = path.join(rot, 'src/content/haberler', slug);
  await access(path.join(dir, 'kapak.png'));
  const md = await readFile(path.join(dir, 'index.md'), 'utf8');
  const fm = parse(md.split('---')[1]);
  assert.equal(fm.title, baslik);
  assert.equal(fm.description, 'Spot: "tırnaklı" özet');
  assert.equal(fm.category, 'piyasalar');
  assert.equal(fm.tur, 'haber');
  assert.equal(fm.cover, 'kapak.png');
  assert.equal(fm.coverAlt, alt);
  assert.deepEqual(fm.kaynaklar, [{ ad: 'Reuters', url: 'https://example.com/a?b=1' }]);
  assert.match(md, /Gövde metni\./);
});

test('yaziYaz aynı başlıkta slug çakışmasını önler, kapaksız yazar', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'haber-'));
  const yazi = { baslik: 'Aynı', spot: 's', govde: 'g', kategori: 'borsa', tarih: new Date(), tur: 'bulten', kaynaklar: [] };
  assert.equal(await yaziYaz(rot, yazi), 'ayni');
  assert.equal(await yaziYaz(rot, yazi), 'ayni-2');
});

test('yaziYaz kaynakların kapak tarifini PNG olarak çizer', async () => {
  const { mkdtemp, readFile } = await import('node:fs/promises');
  const os = await import('node:os');
  const p = await import('node:path');
  const { kaynakKapagi } = await import('../kapak/kapak.mjs');
  const rot = await mkdtemp(p.join(os.tmpdir(), 'ff-kapak-'));
  const slug = await yaziYaz(rot, {
    baslik: 'Kapak deneme', spot: 's', govde: 'g', kategori: 'piyasalar', tarih: new Date(), tur: 'haber', kaynaklar: [],
    kapak: kaynakKapagi({ kategori: 'piyasalar', konu: 'Deneme', alt: 'alt' }), kapakAlt: 'alt',
  });
  const png = await readFile(p.join(rot, 'src/content/haberler', slug, 'kapak.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('kapak: görselden taşan uzun rakam küçültülerek sığdırılır', async () => {
  const { kapakCiz, rakamKapagi } = await import('../kapak/kapak.mjs');
  const png = await kapakCiz(rakamKapagi({ kategori: 'borsa', ust: 'Halka arz', rakam: '$12.345.678.901.234', alt: 'Çok uzun bir şirket adı Holdings International Incorporated' }));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('yaziYaz rakamlar ve sirada frontmatter\'a yazılır; yoksa yazılmaz', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'haber-'));
  const temel = { baslik: 'Şerit', spot: 's', govde: 'g', kategori: 'borsa', tarih: new Date(), kaynaklar: [] };
  const slug = await yaziYaz(rot, { ...temel, rakamlar: [{ etiket: 'Faiz: "yüzde"', deger: '4,25' }], sirada: { tarih: '12 Kasım 2026', olay: 'Toplantı' } });
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  const fm = parse(md.split('---')[1]);
  assert.deepEqual(fm.rakamlar, [{ etiket: 'Faiz: "yüzde"', deger: '4,25' }]);
  assert.deepEqual(fm.sirada, { tarih: '12 Kasım 2026', olay: 'Toplantı' });
  const slug2 = await yaziYaz(rot, { ...temel, baslik: 'Şeritsiz' });
  const md2 = await readFile(path.join(rot, 'src/content/haberler', slug2, 'index.md'), 'utf8');
  assert.ok(!/rakamlar|sirada/.test(md2));
});

test('yaziYaz why_matters ve key_points frontmatter\'a yazılır; yoksa yazılmaz', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'haber-'));
  const temel = { baslik: 'Önem', spot: 's', govde: 'g', kategori: 'borsa', tarih: new Date(), kaynaklar: [] };
  const slug = await yaziYaz(rot, {
    ...temel,
    why_matters: 'Piyasalar için yön belirleyici bir gelişme.',
    key_points: ['Enflasyon oranı %38', 'Faiz indirimi beklentisi'],
  });
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  const fm = parse(md.split('---')[1]);
  assert.equal(fm.why_matters, 'Piyasalar için yön belirleyici bir gelişme.');
  assert.deepEqual(fm.key_points, ['Enflasyon oranı %38', 'Faiz indirimi beklentisi']);
  const slug2 = await yaziYaz(rot, { ...temel, baslik: 'Önemsiz' });
  const md2 = await readFile(path.join(rot, 'src/content/haberler', slug2, 'index.md'), 'utf8');
  assert.ok(!/why_matters|key_points/.test(md2));
});

