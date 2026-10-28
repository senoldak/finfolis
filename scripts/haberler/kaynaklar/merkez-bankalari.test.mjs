import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mb, { faizCoz, pencere, pdfGolgeKaydet } from './merkez-bankalari.mjs';
import { kapakCiz } from '../../kapak/kapak.mjs';

const fx = (ad) => readFileSync(new URL(`./fixtures/${ad}`, import.meta.url), 'utf8');
const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const SIMDI = new Date('2026-10-10T09:00:00Z');

// harita: URL parçası -> yanıt metni ya da durum kodu (sayı).
function sahteFetch(harita) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    for (const [parca, govde] of Object.entries(harita)) {
      if (u.includes(parca)) {
        return typeof govde === 'number' ? new Response('hata', { status: govde }) : new Response(govde, { status: 200 });
      }
    }
    return new Response('yok', { status: 404 });
  };
}
const TUMU = () => ({
  'federalreserve.gov/feeds': fx('fed-rss.xml'),
  monetary20261007a: fx('fed-fomc.html'),
  'ecb.europa.eu/rss': fx('ecb-rss.xml'),
  'ecb.mp261009': fx('ecb-karar.html'),
  'boj.or.jp/en/rss': fx('boj-rss.xml'),
  'PPK/2026': fx('tcmb-ppk-ekim.html'),
  'duy2026-50': fx('tcmb-karar-ekim.html'),
});

test('faizCoz: Fed kesirli aralığı ve fixture değeri', async () => {
  const r = faizCoz('Fed', 'the target range for the federal funds rate to 3-1/2 to 3-3/4 percent.');
  assert.equal(r.dusuk, 3.5);
  assert.equal(r.yuksek, 3.75);
  assert.equal(r.rakam, '%3,50–3,75');
  assert.equal(faizCoz('Fed', 'target range for the federal funds rate at 4 to 4-1/4 percent').dusuk, 4);
  // Fixture'daki gerçek FOMC metninden ayrıştırılan değer, kaynakMetni'ndeki cümleyle birebir aynı olmalı.
  sahteFetch(TUMU());
  const fed = (await mb.hent({ simdi: SIMDI })).find((a) => a.id.includes('monetary20261007a'));
  const m = fed.kaynakMetni.match(/to (\d-\d\/\d) to (\d-\d\/\d) percent/);
  assert.deepEqual([m[1], m[2]], ['3-1/2', '3-3/4']);
  assert.equal(faizCoz('Fed', fed.kaynakMetni).rakam, '%3,50–3,75');
  assert.equal(faizCoz('ECB', 'The interest rate on the deposit facility will be decreased to 2.00%').rakam, '%2,00');
});

test('uzun sayfada faiz cümlesi kaynakMetni penceresinde kalır', () => {
  const uzun = `${'menü '.repeat(6000)} ... target range for the federal funds rate to 3-1/2 to 3-3/4 percent. ${'son '.repeat(3000)}`;
  const faiz = faizCoz('Fed', uzun);
  const kesik = pencere(uzun, faiz.index);
  assert.match(kesik, /3-1\/2 to 3-3\/4 percent/);
  assert.ok(kesik.length < 17000);
});

test('BoJ gerçek besleme: kayıtların hepsi ayrışır, para politikası duyuruları aday olur', async () => {
  const { rssOgeleri } = await import('./ortak.mjs');
  const xml = fx('boj-gercek.xml');
  assert.equal(rssOgeleri(xml).length, (xml.match(/<item/g) ?? []).length);
  sahteFetch({ 'boj.or.jp/en/rss': xml });
  const adaylar = await mb.hent({ simdi: new Date('2026-10-04T09:00:00Z') });
  assert.ok(adaylar.some((a) => a.id.startsWith('boj:')), 'BoJ adayı yok');
  // dc:date yedeği (RSS 1.0)
  const rdf = '<item><title>Minutes of the Monetary Policy Meeting</title><link>http://www.boj.or.jp/en/mopo/x.pdf</link><dc:date>2026-10-08T10:00:00+09:00</dc:date></item>';
  assert.equal(rssOgeleri(rdf)[0].tarih.toISOString(), '2026-10-08T01:00:00.000Z');
});

test('arayüz', () => {
  assert.equal(mb.ad, 'merkez-bankalari');
  assert.equal(typeof mb.hent, 'function');
});

test('karar ve para politikası haberleri ayrışır, gerisi atılır', async () => {
  sahteFetch(TUMU());
  const adaylar = await mb.hent({ simdi: SIMDI });
  const bul = (s) => adaylar.find((a) => a.id.includes(s));

  const fed = bul('monetary20261007a');
  assert.equal(fed.onem, 100);
  assert.equal(fed.kategori, 'piyasalar');
  assert.equal(fed.tarih.toISOString(), '2026-10-07T18:00:00.000Z');
  assert.match(fed.kaynakMetni, /3-1\/2 to 3-3\/4 percent/);
  assert.equal(fed.kaynaklar[0].url, 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20261007a.htm');

  const ecb = bul('ecb.mp261009');
  assert.equal(ecb.onem, 100);
  assert.match(ecb.kaynakMetni, /deposit facility will be decreased to 2\.00%/);

  const ecbHesap = bul('ecb.mg261008');
  assert.equal(ecbHesap.onem, 60);
  assert.equal(ecbHesap.kategori, 'ekonomi');

  assert.equal(bul('mpr_2026/k261009a').onem, 100); // BoJ karar bildirisi
  assert.equal(bul('g260908').onem, 60); // BoJ tutanak

  const tcmb = bul('duy2026-50');
  assert.equal(tcmb.onem, 100);
  assert.match(tcmb.kaynakMetni, /yüzde 38,0/);
  assert.equal(tcmb.tarih.toISOString().slice(0, 10), '2026-10-08'); // 9 Ekim 00:00 +03:00

  // Alakasız duyurular elenir; bozuk kayıt kaynağı çökertmez.
  for (const s of ['enforcement', 'orders', 'ecb.in261008', 'dps26']) assert.equal(bul(s), undefined);
  assert.equal(adaylar.length, 6);
  assert.equal(new Set(adaylar.map((a) => a.id)).size, adaylar.length);
});

test('kapak üretilir (faiz ayrıştırılan karar için rakam kapağı)', async () => {
  sahteFetch(TUMU());
  const adaylar = await mb.hent({ simdi: SIMDI });
  for (const a of adaylar) {
    assert.equal(typeof a.kapak, 'function');
    assert.ok(a.kapakAlt);
  }
  const png = await kapakCiz(adaylar.find((a) => a.id.includes('duy2026-50')).kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const png2 = await kapakCiz(adaylar.find((a) => a.id.includes('g260908')).kapak);
  assert.equal(png2.subarray(1, 4).toString(), 'PNG');
});

test('eski duyurular atılır; gövde alınamazsa başlıkla devam eder', async () => {
  sahteFetch({ ...TUMU(), monetary20261007a: 500 });
  const adaylar = await mb.hent({ simdi: SIMDI });
  const fed = adaylar.find((a) => a.id.includes('monetary20261007a'));
  assert.equal(fed.kaynakMetni, 'Federal Reserve issues FOMC statement');
  sahteFetch(TUMU());
  const sonra = await mb.hent({ simdi: new Date('2026-12-01T00:00:00Z') });
  assert.equal(sonra.length, 0);
});

test('bir kaynak çökerse diğerleri çalışır', async () => {
  sahteFetch({ ...TUMU(), 'ecb.europa.eu/rss': 500 });
  const adaylar = await mb.hent({ simdi: SIMDI });
  assert.ok(adaylar.some((a) => a.id.includes('monetary20261007a')));
  assert.ok(!adaylar.some((a) => a.id.includes('ecb')));
});

test('Fed tutanak duyurusu: bültendeki linkten asıl tutanak metni alınır', async () => {
  const rss = `<rss><channel><item><title>Minutes of the Federal Open Market Committee, September 15-16, 2026</title><link>https://www.federalreserve.gov/newsevents/pressreleases/monetary20261007a.htm</link><pubDate>Wed, 07 Oct 2026 18:00:00 GMT</pubDate><category>Monetary Policy</category></item></channel></rss>`;
  const bulten = '<html><body><p>The Federal Reserve Board released the minutes. <a href="/monetarypolicy/fomcminutes20260916.htm">Minutes</a></p></body></html>';
  const tutanak = '<html><body><p>Participants judged that inflation remained somewhat elevated.</p></body></html>';
  sahteFetch({ 'federalreserve.gov/feeds': rss, monetary20261007a: bulten, fomcminutes20260916: tutanak });
  const fed = (await mb.hent({ simdi: SIMDI })).find((a) => a.id.startsWith('fed:'));
  assert.match(fed.kaynakMetni, /inflation remained somewhat elevated/);
  assert.equal(fed.kaynaklar.at(-1).url, 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm');
});

test('pdfGolgeKaydet: yalnız PDF_GOLGE=1 ve dosya varken, aynı adres bir kez', () => {
  const dosya = path.join(mkdtempSync(path.join(tmpdir(), 'pdf-golge-')), 'k.jsonl');
  const url = 'https://www.boj.or.jp/en/mopo/mpmdeci/deneme.pdf';
  assert.equal(pdfGolgeKaydet('BoJ', url, { PDF_GOLGE_DOSYASI: dosya }), false);
  assert.equal(existsSync(dosya), false);
  assert.equal(pdfGolgeKaydet('BoJ', url, { PDF_GOLGE: '1', PDF_GOLGE_DOSYASI: dosya }), true);
  assert.equal(pdfGolgeKaydet('BoJ', url, { PDF_GOLGE: '1', PDF_GOLGE_DOSYASI: dosya }), false);
  assert.deepEqual(JSON.parse(readFileSync(dosya, 'utf8').trim()), { kurum: 'BoJ', url });
});
