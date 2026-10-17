import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { htmlSok, slugla, yaziYaz } from './lib.mjs';

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

test('yaziYaz gövdedeki HTML etiketlerini ve yorumlarını atar, Markdown ve metni korur', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'haber-'));
  const govde = [
    'Enflasyon <b>yüzde 3</b> oldu.<script>alert(1)</script>',
    '<a href="https://haber.example.com" onclick="x()">tıkla</a> <!-- gizli -->',
    '<div class="kutu">',
    'Oran 3 < 5 ve 7 > 2; ayrıntı için [rapor](https://www.tcmb.gov.tr/) ve <https://www.tcmb.gov.tr/>.',
    '</div><br/>',
  ].join('\n');
  const slug = await yaziYaz(rot, { baslik: 'Etiketli', spot: 'x', govde, kategori: 'ekonomi', tarih: new Date('2026-10-10T08:00:00Z') });
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  const metin = md.split('---').slice(2).join('---');
  assert.doesNotMatch(metin, /<\/?(b|a|script|div|br)\b/i);
  assert.doesNotMatch(metin, /<!--|onclick|gizli/);
  assert.match(metin, /Enflasyon yüzde 3 oldu\./);
  assert.match(metin, /tıkla/);
  assert.match(metin, /Oran 3 < 5 ve 7 > 2/);
  assert.match(metin, /\[rapor\]\(https:\/\/www\.tcmb\.gov\.tr\/\)/);
  assert.match(metin, /<https:\/\/www\.tcmb\.gov\.tr\/>/);
});

test('htmlSok http(s) dışı şemalı bağlantıları düşürür, güvenli bağlantıları korur', () => {
  const metin = htmlSok(
    [
      '<javascript:alert(1)> <JavaScript:x> <data:text/html,x>',
      '[bir](javascript:alert(1)) [iki](<javascript:x>) [üç](javascript&#58;alert(1)) [dört]( data:text/html,x )',
      '[rapor](https://www.tcmb.gov.tr/a_(b)) [veri](/veri/enflasyon/) [yukarı](#ozet) [yaz](mailto:a@example.com)',
      '<https://www.tcmb.gov.tr/> <mailto:a@example.com>',
    ].join('\n'),
  );
  assert.doesNotMatch(metin, /javascript|data:/i);
  assert.match(metin, /^bir iki üç dört$/m);
  for (const k of ['[rapor](https://www.tcmb.gov.tr/a_(b))', '[veri](/veri/enflasyon/)', '[yukarı](#ozet)', '[yaz](mailto:a@example.com)', '<https://www.tcmb.gov.tr/>', '<mailto:a@example.com>']) {
    assert.ok(metin.includes(k), k);
  }
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


test('yaziYaz grafik ve tabloyu açık kaynağı olmayan (gizli kaynaklı) haberde de yazar', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'haber-'));
  const temel = { spot: 's', govde: 'g', kategori: 'piyasalar', tarih: new Date(), kaynaklar: [] };
  const grafik = { baslik: 'Faiz', simge: 'banka', birimEtiket: '%', satirlar: [{ metin: 'Eylül', deger: 4 }] };
  const tablo = { baslik: 'Kur', sutunlar: ['A', 'B'], satirlar: [['1', '2']] };
  const s1 = await yaziYaz(rot, { ...temel, baslik: 'Grafikli', grafik });
  const fm1 = parse((await readFile(path.join(rot, 'src/content/haberler', s1, 'index.md'), 'utf8')).split('---')[1]);
  assert.deepEqual(fm1.grafik, grafik);
  const s2 = await yaziYaz(rot, { ...temel, baslik: 'Tablolu', tablo });
  const fm2 = parse((await readFile(path.join(rot, 'src/content/haberler', s2, 'index.md'), 'utf8')).split('---')[1]);
  assert.deepEqual(fm2.tablo, tablo);
});
