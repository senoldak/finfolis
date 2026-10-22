import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rssHaberKaynagi } from './rss-haber.mjs';
import { BESLEMELER, RESMI_BESLEMELER } from './beslemeler.mjs';
import { kaynakKodu, ozet } from '../gizli.mjs';

const fx = (ad) => readFileSync(new URL(`./fixtures/${ad}`, import.meta.url), 'utf8');
const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const SIMDI = new Date('2026-10-10T09:00:00Z');

// harita: URL parçası -> yanıt metni ya da durum kodu (sayı). cagrilar istenen URL'leri toplar.
function sahteFetch(harita, cagrilar = []) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    cagrilar.push(u);
    for (const [parca, govde] of Object.entries(harita)) {
      if (u.includes(parca)) {
        return typeof govde === 'number' ? new Response('hata', { status: govde }) : new Response(govde, { status: 200 });
      }
    }
    return new Response('yok', { status: 404 });
  };
  return cagrilar;
}
const acik = () => rssHaberKaynagi({ ad: 'Örnek Haber', rss: 'https://haber.example.com/rss', bolge: 'abd', ucretli: false, kategori: 'piyasalar' });
const ucretli = () => rssHaberKaynagi({ ad: 'Ücretli Haber', rss: 'https://ucretli.example.com/rss', bolge: 'avrupa', ucretli: true, kategori: 'piyasalar' });

test('açık kaynak: tam metin çekilir', async () => {
  sahteFetch({ 'haber.example.com/rss': fx('acik-rss.xml'), 'stocks-rally': fx('acik-makale.html') });
  const [a] = await acik().hent({ simdi: SIMDI });
  assert.match(a.kaynakMetni, /Treasury yields retreated/);
  assert.equal(a.bolge, 'abd');
  assert.equal(a.ucretli, false);
  // Resmi olmayan kaynakta kimlik kısa kod + anahtarlı özettir; ad ve adres yalnızca gizliKaynaklar'da.
  assert.equal(a.id, `${kaynakKodu('Örnek Haber')}:${ozet('https://haber.example.com/2026/10/09/stocks-rally.html')}`);
  assert.ok(!a.id.includes('example'));
  assert.equal(a.alan, 'haber.example.com');
  assert.deepEqual(a.gizliKaynaklar, [{ ad: 'Örnek Haber', url: 'https://haber.example.com/2026/10/09/stocks-rally.html' }]);
  assert.equal(a.onem, 40);
});

test('ücretli kaynak: makale sayfası istenmez', async () => {
  const cagrilar = sahteFetch({ 'ucretli.example.com/rss': fx('ucretli-rss.xml') });
  const [a] = await ucretli().hent({ simdi: SIMDI });
  assert.deepEqual(cagrilar, ['https://ucretli.example.com/rss']);
  assert.equal(a.ucretli, true);
  assert.equal(a.kaynakMetni, `${a.baslik}\n${a.ozet}`);
});

test('makale alınamazsa özetle devam', async () => {
  sahteFetch({ 'haber.example.com/rss': fx('acik-rss.xml'), 'stocks-rally': 500 });
  const [a] = await acik().hent({ simdi: SIMDI });
  assert.ok(a.kaynakMetni.includes(a.ozet));
  assert.ok(a.ozet.length > 0);
});

test('bozuk XML boş liste döner, hata fırlatmaz', async () => {
  sahteFetch({ 'haber.example.com/rss': '<rss><channel><item><title>x' });
  assert.deepEqual(await acik().hent({ simdi: SIMDI }), []);
});

test('özet HTML/CDATA temizlenir', async () => {
  const cagrilar = sahteFetch({ 'ucretli.example.com/rss': fx('ucretli-rss.xml') });
  const [a] = await ucretli().hent({ simdi: SIMDI });
  assert.ok(!a.ozet.includes('<'));
  assert.equal(a.ozet, 'Lenders warn of margin pressure.');
  assert.equal(cagrilar.length, 1);
});

test('7 günden eski kayıt atılır', async () => {
  sahteFetch({ 'haber.example.com/rss': fx('acik-rss.xml'), 'stocks-rally': fx('acik-makale.html') });
  const adaylar = await acik().hent({ simdi: SIMDI });
  assert.equal(adaylar.length, 1);
  assert.ok(!adaylar.some((a) => a.baslik === 'Eski haber'));
});

test('ileri tarihli kayıt (etkinlik takvimi) atılır; 1 saatlik saat dilimi payı geçer', async () => {
  const oge = (yol, tarih) => `<item><title>${yol}</title><link>https://haber.example.com/${yol}</link><pubDate>${tarih}</pubDate><description>Özet.</description></item>`;
  const rss = `<rss><channel>${oge('planli', 'Fri, 25 Dec 2026 00:00:00 GMT')}${oge('kayik', 'Sat, 10 Oct 2026 09:45:00 GMT')}</channel></rss>`;
  sahteFetch({ 'haber.example.com/rss': rss, 'haber.example.com/': '<html><body><p>Metin.</p></body></html>' });
  const adaylar = await acik().hent({ simdi: SIMDI });
  assert.deepEqual(adaylar.map((a) => a.baslik), ['kayik']);
});

test('tarihsiz besleme: kayıt tarihi ilk görüldüğü tur olur; işaret yoksa tarihsiz kayıt atılır; görülen gelmez', async () => {
  const rss = '<rss><channel><item><title>Yeni çalışma</title><link>https://teblig.example.com/w1</link><description>Özet.</description></item></channel></rss>';
  sahteFetch({ 'teblig.example.com/rss': rss, 'teblig.example.com/w1': '<html><body><p>Metin.</p></body></html>' });
  const k = (tarihsiz) => rssHaberKaynagi({ ad: 'Örnek Tebliğ', rss: 'https://teblig.example.com/rss', bolge: 'abd', ucretli: false, kategori: 'ekonomi', tarihsiz });
  assert.deepEqual(await k(false).hent({ simdi: SIMDI }), []);
  const [a] = await k(true).hent({ simdi: SIMDI });
  assert.equal(new Date(a.tarih).getTime(), SIMDI.getTime());
  assert.deepEqual(await k(true).hent({ simdi: SIMDI, goruldu: (id) => id === a.id }), []);
});

test('BESLEMELER: geçerli bölge ve alanlar', () => {
  for (const b of BESLEMELER) {
    assert.ok(['abd', 'avrupa', 'asya', 'kuresel'].includes(b.bolge), b.ad);
    assert.equal(typeof b.ucretli, 'boolean');
    assert.match(b.rss, /^https:/);
  }
});

test('görülmüş kayıt için makale istenmez', async () => {
  const cagrilar = sahteFetch({ 'haber.example.com/rss': fx('acik-rss.xml'), 'stocks-rally': fx('acik-makale.html') });
  const adaylar = await acik().hent({ simdi: SIMDI, goruldu: (id) => id.endsWith(ozet('https://haber.example.com/2026/10/09/stocks-rally.html')) });
  assert.deepEqual(adaylar, []);
  assert.deepEqual(cagrilar, ['https://haber.example.com/rss']);
});

test('eşzamanlı çekimde sonuç sırası ve içerik korunur, en fazla 4 istek', async () => {
  const n = 10;
  const xml = `<rss><channel>${Array.from({ length: n }, (_, i) => `<item><title>H${i}</title><link>https://x.com/a${i}</link><pubDate>Fri, 09 Oct 2026 08:00:00 GMT</pubDate><description>o${i}</description></item>`).join('')}</channel></rss>`;
  let acik = 0;
  let azami = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('/rss')) return new Response(xml);
    acik++;
    azami = Math.max(azami, acik);
    await new Promise((r) => setTimeout(r, 5));
    acik--;
    return new Response(`<p>metin ${u.slice(-2)}</p>`);
  };
  const adaylar = await rssHaberKaynagi({ ad: 'X', rss: 'https://x.com/rss', bolge: 'abd', ucretli: false, kategori: 'ekonomi' }).hent({ simdi: SIMDI });
  assert.deepEqual(adaylar.map((a) => a.baslik), Array.from({ length: n }, (_, i) => `H${i}`));
  assert.match(adaylar[3].kaynakMetni, /metin a3/);
  assert.ok(azami <= 4 && azami > 1, `azami=${azami}`);
});

test('Atom beslemesi okunur, geçersiz tarihli kayıt atılır', async () => {
  const atom = `<feed><entry><title>Atom haber</title><link href="https://a.com/1"/><id>1</id><updated>2026-10-09T08:00:00Z</updated><summary>&lt;p&gt;Özet&lt;/p&gt;</summary></entry>
<entry><title>Bozuk tarih</title><link href="https://a.com/2"/><id>2</id><updated>dün</updated><summary>x</summary></entry></feed>`;
  sahteFetch({ 'a.com/feed': atom, 'a.com/1': '<p>Atom gövde</p>' });
  const adaylar = await rssHaberKaynagi({ ad: 'A', rss: 'https://a.com/feed', bolge: 'asya', ucretli: false, kategori: 'ekonomi' }).hent({ simdi: SIMDI });
  assert.equal(adaylar.length, 1);
  assert.equal(adaylar[0].ozet, 'Özet');
  assert.match(adaylar[0].kaynakMetni, /Atom gövde/);
});

test('limit: en yeni N kayıt seçilir, makale yalnızca onlar için çekilir; kesilenler bildirilir', async () => {
  const xml = `<rss><channel>${Array.from({ length: 6 }, (_, i) => `<item><title>H${i}</title><link>https://y.com/a${i}</link><pubDate>Fri, 09 Oct 2026 0${i}:00:00 GMT</pubDate><description>o${i}</description></item>`).join('')}</channel></rss>`;
  const cagrilar = sahteFetch({ 'y.com/rss': xml, 'y.com/a': '<p>gövde</p>' });
  const kesilen = [];
  const adaylar = await rssHaberKaynagi({ ad: 'Y', rss: 'https://y.com/rss', bolge: 'abd', ucretli: false, kategori: 'ekonomi' })
    .hent({ simdi: SIMDI, limit: 2, kesilen: (id) => kesilen.push(id) });
  assert.deepEqual(adaylar.map((a) => a.baslik), ['H5', 'H4']);
  assert.equal(cagrilar.length, 3); // besleme + 2 makale
  assert.deepEqual(kesilen.sort(), [0, 1, 2, 3].map((i) => `${kaynakKodu('Y')}:${ozet(`https://y.com/a${i}`)}`).sort());
});

test('haber sitesi adayında kaynak listesi boş; resmi kurumda kurum adı ve bağlantısı var', async () => {
  sahteFetch({ 'haber.example.com/rss': fx('acik-rss.xml'), 'stocks-rally': fx('acik-makale.html') });
  const [a] = await acik().hent({ simdi: SIMDI });
  assert.deepEqual(a.kaynaklar, []);
  sahteFetch({ 'haber.example.com/rss': fx('acik-rss.xml'), 'stocks-rally': fx('acik-makale.html') });
  const resmi = rssHaberKaynagi({ ad: 'Bank of England', rss: 'https://haber.example.com/rss', bolge: 'avrupa', ucretli: false, kategori: 'ekonomi', resmi: true });
  const [b] = await resmi.hent({ simdi: SIMDI });
  assert.deepEqual(b.kaynaklar, [{ ad: 'Bank of England', url: 'https://haber.example.com/2026/10/09/stocks-rally.html' }]);
  assert.ok(RESMI_BESLEMELER.every((x) => x.resmi === true));
  assert.ok(BESLEMELER.filter((x) => !RESMI_BESLEMELER.includes(x)).every((x) => !x.resmi));
});

test('döviz beslemesi: kur/altın dışı konular ekonomi kategorisine düşer', async () => {
  const { haberKategorisi } = await import('./rss-haber.mjs');
  assert.equal(haberKategorisi('doviz', 'Japan exports jump 16.7% on AI chip demand', 'Trade deficit narrowed'), 'ekonomi');
  assert.equal(haberKategorisi('doviz', 'US data center projects face delays', 'Financing is shaky'), 'ekonomi');
  assert.equal(haberKategorisi('doviz', 'Gold climbs to record', ''), 'doviz');
  assert.equal(haberKategorisi('doviz', 'Yen slides past 155 per dollar', ''), 'doviz');
  assert.equal(haberKategorisi('doviz', 'Euro steadies', ''), 'doviz');
  assert.equal(haberKategorisi('piyasalar', 'Japan exports jump', ''), 'piyasalar');
});
