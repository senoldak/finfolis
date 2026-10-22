import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  adresNormal,
  derleyiciKaynagi,
  derleyiciYazilari,
  sayfaBasligi,
  sayfaElemesi,
  sayfaTarihi,
  sonGunAdaySayisi,
  yaziBaglantilari,
} from './derleyici.mjs';
import { kaynakKodu, ozet } from '../gizli.mjs';
import { adayMedyaKontrol } from '../yayin-kurulu.mjs';

const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const SIMDI = new Date('2026-10-17T12:00:00Z');

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

const YAZI_HTML = `<h4>Markets</h4><ul>
<li><a class="link" href="https://analiz.example.com/2026/10/16/faiz?utm_source=x&amp;st=abc">Faiz beklentileri yeniden yükseliyor. <span class="source">(analiz.example.com)</span></a></li>
<li><a href="https://video.youtube.com/watch?v=1">Uzun bir video söyleşisi burada</a></li>
<li><a href="https://ucretli.example.com/makale">Ücretli bir sitedeki yazının özeti</a></li>
<li><a href="https://derleyici.example.com/eski-yazi">Derleyicinin kendi önceki yazısı</a></li>
<li><a href="https://ana.example.com/">Ana sayfa bağlantısı haber değildir</a></li>
<li><a href="https://kisa.example.com/x">kısa</a></li>
</ul><h4>Sports</h4><ul>
<li><a href="https://spor.example.com/2026/10/16/mac">Maç sonucu ve lig tablosu analizi</a></li>
</ul>`;

const besleme = (yazilar) => `<?xml version="1.0"?><rss><channel>${yazilar
  .map(
    (y) => `<item><title>${y.baslik}</title><link>${y.url}</link><pubDate>${y.tarih}</pubDate>
<description>ozet</description><content:encoded><![CDATA[${y.html}]]></content:encoded></item>`,
  )
  .join('')}</channel></rss>`;

const govde = (n) => Array.from({ length: n }, (_, i) => `kelime${i}`).join(' ');
const sayfa = ({ tarih = '2026-10-16T08:00:00Z', kelime = 400, ucretli = false, baslik = 'Faiz beklentileri', site = 'Analiz Sitesi' } = {}) =>
  `<html><head><title>${baslik} | ${site}</title><meta property="og:title" content="${baslik}">
<meta property="og:site_name" content="${site}">${tarih ? `<meta property="article:published_time" content="${tarih}">` : ''}
${ucretli ? '<script type="application/ld+json">{"isAccessibleForFree": false}</script>' : ''}</head>
<body><nav>menü</nav><article><p>${govde(kelime)}</p></article></body></html>`;

test('adresNormal: izleme parametreleri ve çapa atılır', () => {
  assert.equal(adresNormal('https://a.example.com/y?utm_source=x&id=5&smid=url-share#bas'), 'https://a.example.com/y?id=5');
  assert.equal(adresNormal('bozuk'), null);
});

test('yaziBaglantilari: platform, ücretli alan, kendi alanı, ana sayfa ve kısa metin elenir', () => {
  const b = yaziBaglantilari(YAZI_HTML, { kendiAlan: 'derleyici.example.com', ucretliAlanlar: ['ucretli.example.com'] });
  assert.deepEqual(
    b.map((x) => x.url),
    ['https://analiz.example.com/2026/10/16/faiz', 'https://spor.example.com/2026/10/16/mac'],
  );
  assert.equal(b[0].metin, 'Faiz beklentileri yeniden yükseliyor.');
  assert.equal(b[0].grup, 'Markets');
});

test('yaziBaglantilari: grupFiltresi yalnız uyan ara başlıkların bağlantılarını alır', () => {
  const b = yaziBaglantilari(YAZI_HTML, { kendiAlan: 'derleyici.example.com', ucretliAlanlar: ['ucretli.example.com'], grupFiltresi: /^Markets$/i });
  assert.deepEqual(b.map((x) => x.grup), ['Markets']);
});

test('derleyiciYazilari: başlık, tarih ve içerik; tarihsiz kayıt atlanır', () => {
  const xml = besleme([{ baslik: 'Friday links: a', url: 'https://derleyici.example.com/f', tarih: 'Fri, 16 Oct 2026 17:00:00 +0000', html: '<a href="https://x.example.com/a">bağlantı metni yeterince uzun</a>' }])
    .replace('</channel>', '<item><title>Tarihsiz</title><link>https://derleyici.example.com/t</link></item></channel>');
  const y = derleyiciYazilari(xml);
  assert.equal(y.length, 1);
  assert.equal(y[0].baslik, 'Friday links: a');
  assert.match(y[0].html, /x\.example\.com/);
});

test('sayfaTarihi: meta, JSON-LD ve time etiketi', () => {
  assert.equal(sayfaTarihi('<meta property="article:published_time" content="2026-10-16T08:00:00Z">').toISOString(), '2026-10-16T08:00:00.000Z');
  assert.equal(sayfaTarihi('<script>{"datePublished": "2026-10-15T10:00:00Z"}</script>').toISOString(), '2026-10-15T10:00:00.000Z');
  assert.equal(sayfaTarihi('<time datetime="2026-10-14">14 Ekim</time>').toISOString(), '2026-10-14T00:00:00.000Z');
  assert.equal(sayfaTarihi('<p>tarih yok</p>'), null);
});

test('sayfaBasligi: sondaki site adı eki atılır', () => {
  assert.equal(sayfaBasligi('<title>Ücretler ve hayat pahalılığı | Analiz Sitesi</title>'), 'Ücretler ve hayat pahalılığı');
  assert.equal(sayfaBasligi('<meta property="og:title" content="Enerji hisseleri - Örnek">'), 'Enerji hisseleri');
  assert.equal(sayfaBasligi('<title>Tek parça başlık</title>'), 'Tek parça başlık');
});

test('sayfaElemesi: ücretli, tarihsiz, eski, ileri tarihli, kısa', () => {
  assert.equal(sayfaElemesi(sayfa(), SIMDI), null);
  assert.equal(sayfaElemesi(sayfa({ ucretli: true }), SIMDI), 'ücretli');
  assert.equal(sayfaElemesi(sayfa({ tarih: null }), SIMDI), 'tarihsiz');
  assert.equal(sayfaElemesi(sayfa({ tarih: '2026-10-10T08:00:00Z' }), SIMDI), 'eski');
  assert.equal(sayfaElemesi(sayfa({ tarih: '2026-10-20T08:00:00Z' }), SIMDI), 'ileri tarihli');
  assert.equal(sayfaElemesi(sayfa({ kelime: 80 }), SIMDI), 'kısa');
});

test('sonGunAdaySayisi: yalnız bu önekin son 24 saatteki elenmemiş kayıtları', () => {
  const g = {
    'kabc:1': { zaman: '2026-10-17T10:00:00Z' },
    'kabc:2': { zaman: '2026-10-17T09:00:00Z', elendi: true },
    'kabc:3': { zaman: '2026-10-15T09:00:00Z' },
    'kxyz:1': { zaman: '2026-10-17T10:00:00Z' },
  };
  assert.equal(sonGunAdaySayisi(g, 'kabc', SIMDI), 1);
});

const kaynak = (ek = {}) =>
  derleyiciKaynagi({ ad: 'Örnek Derleyici', rss: 'https://derleyici.example.com/feed/', kategori: 'piyasalar', gunlukTavan: 6, ucretliAlanlar: ['ucretli.example.com'], ...ek });
const YAZILAR = [
  { baslik: 'Friday links: piyasa', url: 'https://derleyici.example.com/cuma', tarih: 'Fri, 16 Oct 2026 17:00:00 +0000', html: YAZI_HTML },
  { baslik: 'Longform links: uzun', url: 'https://derleyici.example.com/uzun', tarih: 'Fri, 16 Oct 2026 18:00:00 +0000', html: '<h4>Books</h4><a href="https://kitap.example.com/2026/k">Uzun bir kitap incelemesi yazısı</a>' },
];

test('hent: aday bağlantı verilen sayfadır; kimlik kısa kod + özet, adlar yalnız gizliKaynaklar', async () => {
  sahteFetch({ 'derleyici.example.com/feed': besleme(YAZILAR), 'analiz.example.com': sayfa(), 'spor.example.com': sayfa({ kelime: 50 }), 'kitap.example.com': sayfa() });
  const elenen = [];
  const adaylar = await kaynak({ yaziFiltresi: '^(Monday|Tuesday|Wednesday|Thursday|Friday) links' }).hent({ simdi: SIMDI, ele: (id) => elenen.push(id) });
  assert.equal(adaylar.length, 1);
  const [a] = adaylar;
  const url = 'https://analiz.example.com/2026/10/16/faiz';
  assert.equal(a.id, `${kaynakKodu('Örnek Derleyici')}:${ozet(url)}`);
  assert.ok(!a.id.includes('example'));
  assert.equal(a.baslik, 'Faiz beklentileri');
  assert.equal(a.ozet, 'Faiz beklentileri yeniden yükseliyor.');
  assert.equal(a.tarih.toISOString(), '2026-10-16T08:00:00.000Z');
  assert.equal(a.ucretli, false);
  assert.deepEqual(a.kaynaklar, []);
  assert.deepEqual(a.gizliKaynaklar, [
    { ad: 'Analiz Sitesi', url },
    { ad: 'Örnek Derleyici', url: 'https://derleyici.example.com/cuma' },
  ]);
  assert.ok(!a.kaynakMetni.includes('menü'), 'gövde <article> içinden alınır');
  // Kısa sayfa elendi ve görüldü sayıldı; filtre dışı yazının bağlantısı hiç istenmedi.
  assert.deepEqual(elenen, [`${kaynakKodu('Örnek Derleyici')}:${ozet('https://spor.example.com/2026/10/16/mac')}`]);
});

test('hent: görülen bağlantı yeniden istenmez, günlük tavan dolunca besleme bile okunmaz', async () => {
  const cagrilar = sahteFetch({ 'derleyici.example.com/feed': besleme(YAZILAR), 'analiz.example.com': sayfa(), 'spor.example.com': sayfa() });
  const kod = kaynakKodu('Örnek Derleyici');
  const gorulenId = `${kod}:${ozet('https://analiz.example.com/2026/10/16/faiz')}`;
  const adaylar = await kaynak({ grupFiltresi: '^(Markets|Sports)$' }).hent({ simdi: SIMDI, goruldu: (id) => id === gorulenId });
  assert.deepEqual(adaylar.map((a) => a.alan), ['spor.example.com']);
  assert.ok(!cagrilar.some((u) => u.includes('analiz.example.com')));

  const dolu = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`${kod}:${i}`, { zaman: '2026-10-17T10:00:00Z' }]));
  const cagrilar2 = sahteFetch({});
  assert.deepEqual(await kaynak().hent({ simdi: SIMDI, gorulen: dolu }), []);
  assert.deepEqual(cagrilar2, []);
});

test('hent: tur sınırı (limit) kadar aday; besleme hatasında adres loga düşmez', async () => {
  sahteFetch({ 'derleyici.example.com/feed': besleme(YAZILAR), 'analiz.example.com': sayfa(), 'spor.example.com': sayfa(), 'kitap.example.com': sayfa() });
  assert.equal((await kaynak().hent({ simdi: SIMDI, limit: 1 })).length, 1);
  sahteFetch({ 'derleyici.example.com/feed': 500 });
  await assert.rejects(kaynak().hent({ simdi: SIMDI }), (e) => !e.message.includes('example.com'));
});

test('adayMedyaKontrol: bağlantı verilen sitenin adı ve alan adı metinde geçemez; resmi alan serbest', () => {
  const gizli = [
    { ad: 'Analiz Sitesi', url: 'https://www.analizci.example.com/a' },
    { ad: 'Kurum', url: 'https://www.research.ornek.gov/a' },
  ];
  assert.deepEqual(adayMedyaKontrol('Faiz beklentisi yükseldi.', gizli), []);
  assert.match(adayMedyaKontrol('Analiz Sitesi yazısına göre faiz yükseldi.', gizli)[0], /Analiz Sitesi/);
  assert.match(adayMedyaKontrol('analizci verilerine göre', [{ ad: 'X', url: 'https://analizci.co.uk/a' }])[0], /analizci/);
  assert.deepEqual(adayMedyaKontrol('Kurum açıklaması', gizli.slice(1)), []);
});
