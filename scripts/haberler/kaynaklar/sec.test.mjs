import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sec from './sec.mjs';
import { kapakCiz } from '../../kapak/kapak.mjs';

const fx = (ad) => readFileSync(new URL(`./fixtures/${ad}`, import.meta.url), 'utf8');
const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const SIMDI = new Date('2026-10-10T09:00:00Z');
const BOS = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>';

function sahteFetch(harita, istekler = []) {
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    istekler.push({ u, init });
    // Daha uzun (özgül) anahtar önce eşleşsin.
    for (const [parca, govde] of Object.entries(harita).sort((a, b) => b[0].length - a[0].length)) {
      if (u.includes(parca)) return new Response(govde, { status: 200 });
    }
    return new Response('yok', { status: 404 });
  };
}
const HARITA = () => ({
  'type=S-1&': fx('sec-s1.xml'),
  'type=F-1&': BOS,
  'type=424B4&': fx('sec-424b4.xml'),
  'type=N-1A&': fx('sec-n1a.xml'),
  'type=485APOS&': BOS,
  '0002222222-26-000004-index': fx('sec-index-etf.html'),
  'alpha_n1a.htm': fx('sec-belge-etf.html'),
  '0003333333-26-000005-index': fx('sec-index-klasik.html'),
  'klasik_n1a.htm': fx('sec-belge-klasik.html'),
  '0001111111-26-000003-index': fx('sec-index-ipo-degil.html'),
  'takipci_s1.htm': fx('sec-belge-ipo-degil.html'),
  '0001234567-26-000001-index': fx('sec-index-s1.html'),
  'acme_s1.htm': fx('sec-belge-s1.html'),
  '0007654321-26-000002-index': fx('sec-index-boyutsuz.html'),
  'boyutsuz_s1.htm': fx('sec-belge-boyutsuz.html'),
  '0001683168-26-007757-index': fx('sec-index-424b4.html'),
  'sunshine_424b4.htm': fx('sec-belge-424b4.html'),
});

test('halka arz adayları: kanıt şartı, etiketli tutar, ETF kotası', async () => {
  const istekler = [];
  sahteFetch(HARITA(), istekler);
  const adaylar = await sec.hent({ simdi: SIMDI });
  assert.equal(sec.ad, 'sec');
  const bul = (acc) => adaylar.find((a) => a.id === `sec:${acc}`);

  const s1 = bul('0001234567-26-000001');
  assert.equal(s1.onem, 60);
  assert.equal(s1.kategori, 'borsa');
  assert.match(s1.baslik, /Acme Robotics.*halka arz/);
  assert.doesNotMatch(s1.kaynakMetni.split('\n')[0], /Offering size/); // kapak/özet rakam taşımaz
  assert.equal(s1.kaynaklar[0].ad, 'SEC EDGAR');
  assert.equal(s1.tarih.toISOString(), '2026-10-09T21:29:03.000Z');
  assert.equal((await kapakCiz(s1.kapak)).subarray(1, 4).toString(), 'PNG');

  const fiyatli = bul('0001683168-26-007757');
  assert.equal(fiyatli.onem, 80);
  assert.doesNotMatch(fiyatli.kapakAlt, /teklif büyüklüğü/);

  // Tutarı olmayan halka arz yine aday olur, ama tutar etiketi ve rakamı yoktur.
  const boyutsuz = bul('0007654321-26-000002');
  assert.ok(boyutsuz);
  assert.doesNotMatch(boyutsuz.kaynakMetni.split('\n')[0], /Offering size/);
  assert.doesNotMatch(boyutsuz.kapakAlt, /teklif büyüklüğü/);
  assert.equal((await kapakCiz(boyutsuz.kapak)).subarray(1, 4).toString(), 'PNG');

  // "initial public offering" geçmeyen S-1 (ikincil satış) elenir; etiketli tutarı olsa da halka arz sayılmaz.
  assert.equal(bul('0001111111-26-000003'), undefined);

  // ETF: adı olan, belgesi ETF diyen fon başvurusu; teklif büyüklüğü sözü yok. Klasik fon elenir.
  const etf = bul('0002222222-26-000004');
  assert.equal(etf.onem, 40);
  assert.match(etf.baslik, /Alpha Growth ETF Trust.*ETF/);
  assert.doesNotMatch(etf.baslik + etf.kapakAlt + etf.kaynakMetni.split('\n')[0], /teklif|Offering size/);
  assert.equal((await kapakCiz(etf.kapak)).subarray(1, 4).toString(), 'PNG');
  assert.equal(bul('0003333333-26-000005'), undefined);

  assert.equal(adaylar.length, 4);
  // SEC User-Agent zorunlu
  const secIstek = istekler.find((i) => i.u.includes('sec.gov'));
  assert.match(secIstek.init.headers['User-Agent'], /finfolis-haber-botu/);
});

test('etiketsiz dolar tutarı teklif büyüklüğü sayılmaz', async () => {
  const { teklifBuyuklugu } = await import('./sec.mjs');
  assert.equal(teklifBuyuklugu('Prospectus $6,000,000 Up to 10,509,082 Common Units at $0.55'), null);
  assert.deepEqual(teklifBuyuklugu('Proposed maximum aggregate offering price $100 million.'), { metin: '$100 million', deger: 1e8 });
});

test('ETF kotası halka arz sınırından ayrıdır: 5 halka arz + en fazla 2 ETF', async () => {
  const girdi = (n, tur) =>
    `<entry><title>${tur} - Fon ${n} ETF Trust (000${n}) (Filer)</title><link rel="alternate" href="https://www.sec.gov/Archives/edgar/data/${n}/x/e${n}-index.htm"/><summary type="html">x</summary><updated>2026-10-09T10:00:00-04:00</updated><category term="${tur}"/><id>urn:tag:sec.gov,2008:accession-number=100${n}-26-000001</id></entry>`;
  const ipo = (n) =>
    `<entry><title>S-1 - Sirket ${n} Inc. (000${n}) (Filer)</title><link rel="alternate" href="https://www.sec.gov/Archives/edgar/data/${n}/y/i${n}-index.htm"/><summary type="html">x</summary><updated>2026-10-09T10:00:00-04:00</updated><category term="S-1"/><id>urn:tag:sec.gov,2008:accession-number=200${n}-26-000001</id></entry>`;
  sahteFetch({
    'type=S-1&': `<feed>${[1, 2, 3, 4, 5, 6, 7].map(ipo).join('')}${ipo(1)}</feed>`,
    'type=N-1A&': `<feed>${[1, 2, 3].map((n) => girdi(n, 'N-1A')).join('')}</feed>`,
    'type=485APOS&': `<feed>${[4, 5].map((n) => girdi(n, '485APOS')).join('')}</feed>`,
    'type=424B4&': BOS,
    'type=F-1&': BOS,
    '/x/e': '<a href="/Archives/etf.htm">d</a>',
    'etf.htm': '<p>This exchange-traded fund seeks growth.</p>',
    '/y/i': '<a href="/Archives/doc.htm">d</a>',
    'doc.htm': '<p>Our initial public offering. Gross proceeds of $50,000,000.</p>',
  });
  const adaylar = await sec.hent({ simdi: SIMDI });
  assert.equal(adaylar.filter((a) => a.onem === 40).length, 2);
  assert.equal(adaylar.filter((a) => a.onem === 60).length, 5);
  assert.equal(new Set(adaylar.map((a) => a.id)).size, 7);
});

test('ETF ayrımı: geçiş anması ETF yapmaz; adında ETF olan ya da kendini ETF tanımlayan fon olur', async () => {
  const { etfMi } = await import('./sec.mjs');
  assert.equal(etfMi('Acme Robotics, Inc.', 'Investors may buy ETFs. Initial public offering.', false), false);
  assert.equal(etfMi('Klasik Fund', 'The Fund invests in ETFs and other funds.', true), false);
  assert.equal(etfMi('Alpha Growth ETF Trust', 'x', true), true);
  assert.equal(etfMi('Beta Income Trust', 'The Fund is an actively managed exchange-traded fund.', true), true);
  assert.equal(etfMi('Beta Income Trust', 'Shares of the Fund are listed on NYSE Arca.', true), true);
  assert.equal(etfMi('Gamma Corp', 'The Fund is an ETF.', false), false); // halka arz formu adında ETF yoksa ipo kalır
});

test('halka arz S-1 belgesinde "ETFs" geçmesi onu ETF yapmaz; "ETFs\'e yatırım yapan" N-1A elenir', async () => {
  const girdi = (n, tur, ad) =>
    `<entry><title>${tur} - ${ad} (000${n}) (Filer)</title><link rel="alternate" href="https://www.sec.gov/Archives/edgar/data/${n}/z/z${n}-index.htm"/><summary type="html">x</summary><updated>2026-10-09T10:00:00-04:00</updated><category term="${tur}"/><id>urn:tag:sec.gov,2008:accession-number=300${n}-26-000001</id></entry>`;
  sahteFetch({
    'type=S-1&': `<feed>${girdi(1, 'S-1', 'Fintek Inc.')}</feed>`,
    'type=N-1A&': `<feed>${girdi(2, 'N-1A', 'Sepet Fund')}</feed>`,
    'type=424B4&': BOS,
    'type=F-1&': BOS,
    'type=485APOS&': BOS,
    '/z/z1': '<a href="/Archives/ipo.htm">d</a>',
    'ipo.htm': '<p>Our initial public offering. Our products compete with ETFs. Proposed maximum aggregate offering price $80 million.</p>',
    '/z/z2': '<a href="/Archives/fon.htm">d</a>',
    'fon.htm': '<p>The Fund is a mutual fund that invests in ETFs and other funds.</p>',
  });
  const adaylar = await sec.hent({ simdi: SIMDI });
  assert.equal(adaylar.length, 1);
  assert.equal(adaylar[0].onem, 60);
  assert.doesNotMatch(adaylar[0].kaynakMetni.split('\n')[0], /Offering size/);
});
