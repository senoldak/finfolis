// Bülten Worker testleri: npm run test:bot ile aynı çalıştırıcı. D1 yerine gerçek SQLite (node:sqlite) ve migration kullanılır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  epostaTemizle,
  isoHafta,
  utmEkle,
  haftalikSecim,
  bultenIcerik,
  kacis,
  SITE_URL,
  BEKLEME_MS,
} from '../../worker/lib.mjs';
import { abone, onay, ayrilSayfasi, ayril, haftalikCalistir, istek } from '../../worker/bulten.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GOC = readFileSync(path.join(KOK, 'migrations/0001_bulten.sql'), 'utf8');
const SIMDI = Date.parse('2026-10-12T06:00:00Z');

// D1 API'sinin kullandığımız kısmı: prepare().bind().first()/all()/run()
function d1(db) {
  return {
    prepare(sql) {
      const st = db.prepare(sql);
      let args = [];
      const o = {
        bind(...a) {
          args = a;
          return o;
        },
        async first() {
          return st.get(...args) ?? null;
        },
        async all() {
          return { results: st.all(...args) };
        },
        async run() {
          st.run(...args);
          return { success: true };
        },
      };
      return o;
    },
  };
}

function ortam(ekle = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(GOC);
  return {
    db,
    env: {
      DB: d1(db),
      RESEND_API_KEY: 'test-anahtar',
      BULTEN_GONDEREN: 'finfolis <bulten@finfolis.com>',
      ASSETS: { fetch: async () => new Response('{}', { status: 404 }) },
      ...ekle,
    },
  };
}

// Resend'e giden çağrıları kaydeden sahte fetch.
function sahteFetch(durum = 200) {
  const cagrilar = [];
  const fetchFn = async (url, init) => {
    cagrilar.push({ url, init, govde: JSON.parse(init.body) });
    return new Response('{}', { status: durum });
  };
  return { cagrilar, fetch: fetchFn };
}

function form(alanlar) {
  const f = new FormData();
  for (const [k, v] of Object.entries(alanlar)) f.append(k, v);
  return new Request(`${SITE_URL}/api/bulten/abone`, { method: 'POST', body: f });
}

const konum = (r) => r.headers.get('Location');

test('e-posta: kırpılır, küçültülür, geçersiz olan reddedilir', () => {
  assert.equal(epostaTemizle('  Ali.Veli@Ornek.COM '), 'ali.veli@ornek.com');
  assert.equal(epostaTemizle('haber.example.com'), null);
  assert.equal(epostaTemizle('a@b'), null);
  assert.equal(epostaTemizle(`${'a'.repeat(250)}@b.co`), null);
  assert.equal(epostaTemizle(undefined), null);
});

test('ISO hafta anahtarı', () => {
  assert.equal(isoHafta(new Date('2026-01-01T12:00:00Z')), '2026-W01');
  assert.equal(isoHafta(new Date('2024-12-30T12:00:00Z')), '2025-W01');
  assert.equal(isoHafta(new Date('2026-10-12T06:00:00Z')), '2026-W42');
});

test('UTM parametreleri eklenir, mevcutlar korunur', () => {
  const u = utmEkle('https://finfolis.com/haber/x/?ref=1', { kaynak: 'bulten', ortam: 'email', kampanya: 'haftalik-2026-W42' });
  const p = new URL(u).searchParams;
  assert.equal(p.get('ref'), '1');
  assert.equal(p.get('utm_source'), 'bulten');
  assert.equal(p.get('utm_medium'), 'email');
  assert.equal(p.get('utm_campaign'), 'haftalik-2026-W42');
});

test('haftalık seçim: 7 gün, en fazla 10, yalnız kendi alan adı', () => {
  const gun = 86_400_000;
  const haber = (i, gunOnce) => ({
    baslik: `h${i}`,
    ozet: 'o',
    url: `${SITE_URL}/haber/h${i}/`,
    tarih: new Date(SIMDI - gunOnce * gun).toISOString(),
  });
  const veri = {
    hafta: '2026-W42',
    haberler: [
      ...Array.from({ length: 12 }, (_, i) => haber(i, 1 + i * 0.1)),
      { baslik: 'eski', url: `${SITE_URL}/haber/eski/`, tarih: new Date(SIMDI - 9 * gun).toISOString() },
      { baslik: 'dis', url: 'https://ornek.example.com/x', tarih: new Date(SIMDI - gun).toISOString() },
    ],
    kalici: [{ baslik: 'Veriler', url: `${SITE_URL}/veri/` }],
  };
  const s = haftalikSecim(veri, SIMDI);
  assert.equal(s.haberler.length, 10);
  assert.ok(s.haberler.every((h) => h.baslik !== 'eski' && h.baslik !== 'dis'));
  assert.equal(s.haberler[0].baslik, 'h0');
  assert.equal(s.kalici.length, 1);
  assert.equal(haftalikSecim(null, SIMDI).haberler.length, 0);
});

test('bülten e-postası: kaçış, UTM ve her alıcıya kendi ayrılma bağlantısı', () => {
  const i = bultenIcerik({
    hafta: '2026-W42',
    haberler: [{ baslik: 'Faiz <b>&</b>', ozet: 'özet "x"', url: `${SITE_URL}/haber/faiz/`, tarih: '2026-10-10T06:00:00Z' }],
    kalici: [],
    ayrilmaUrl: `${SITE_URL}/api/bulten/ayril?t=abc`,
  });
  assert.ok(i.html.includes('Faiz &lt;b&gt;&amp;&lt;/b&gt;'));
  assert.ok(!i.html.includes('<b>&</b>'));
  assert.ok(i.html.includes('utm_campaign=haftalik-2026-W42'));
  assert.ok(i.html.includes(`${SITE_URL}/api/bulten/ayril?t=abc`));
  assert.ok(i.metin.includes(`${SITE_URL}/api/bulten/ayril?t=abc`));
  assert.equal(kacis('<"\'>'), '&lt;&quot;&#39;&gt;');
});

test('abone: tuzak doluysa hiçbir şey yapılmaz', async () => {
  const { db, env } = ortam();
  const s = sahteFetch();
  const r = await abone(form({ eposta: 'ali@ornek.com', web: 'bot' }), env, { now: () => SIMDI, fetch: s.fetch });
  assert.equal(r.status, 303);
  assert.equal(konum(r), `${SITE_URL}/bulten/?durum=kontrol`);
  assert.equal(s.cagrilar.length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM abone').get().n, 0);
});

test('abone: RESEND_API_KEY yoksa kapalı', async () => {
  const { env } = ortam({ RESEND_API_KEY: undefined });
  const r = await abone(form({ eposta: 'ali@ornek.com' }), env, { now: () => SIMDI, fetch: sahteFetch().fetch });
  assert.equal(konum(r), `${SITE_URL}/bulten/?durum=kapali`);
});

test('abone: geçersiz adres ayrı mesaj, varlık sızdırılmaz', async () => {
  const { env } = ortam();
  const r = await abone(form({ eposta: 'bozuk' }), env, { now: () => SIMDI, fetch: sahteFetch().fetch });
  assert.equal(konum(r), `${SITE_URL}/bulten/?durum=eposta-hatali`);
});

test('abone: yeni adrese bekliyor kaydı ve onay e-postası; 10 dakika içinde tekrar gönderilmez', async () => {
  const { db, env } = ortam();
  const s = sahteFetch();
  const bagim = { now: () => SIMDI, fetch: s.fetch };
  const r1 = await abone(form({ eposta: 'Ali@Ornek.com' }), env, bagim);
  assert.equal(konum(r1), `${SITE_URL}/bulten/?durum=kontrol`);
  assert.equal(s.cagrilar.length, 1);
  assert.equal(s.cagrilar[0].url, 'https://api.resend.com/emails');
  assert.equal(s.cagrilar[0].govde.to[0], 'ali@ornek.com');
  const satir = db.prepare('SELECT durum, belirtec FROM abone').get();
  assert.equal(satir.durum, 'bekliyor');
  assert.match(satir.belirtec, /^[0-9a-f-]{36}$/);
  assert.ok(s.cagrilar[0].govde.html.includes(`/api/bulten/onay?t=${satir.belirtec}`));

  await abone(form({ eposta: 'ali@ornek.com' }), env, { now: () => SIMDI + 60_000, fetch: s.fetch });
  assert.equal(s.cagrilar.length, 1);

  await abone(form({ eposta: 'ali@ornek.com' }), env, { now: () => SIMDI + 11 * 60_000, fetch: s.fetch });
  assert.equal(s.cagrilar.length, 2);
});

test('abone: zaten onaylı adrese hiçbir şey gönderilmez', async () => {
  const { db, env } = ortam();
  db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma, onay) VALUES ('ali@ornek.com','tr','onayli','11111111-1111-4111-8111-111111111111','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')").run();
  const s = sahteFetch();
  const r = await abone(form({ eposta: 'ali@ornek.com' }), env, { now: () => SIMDI, fetch: s.fetch });
  assert.equal(konum(r), `${SITE_URL}/bulten/?durum=kontrol`);
  assert.equal(s.cagrilar.length, 0);
});

test('onay: geçerli belirtec onaylar; geçersiz ve süresi dolmuş olanlar reddedilir', async () => {
  const { db, env } = ortam();
  const t = '22222222-2222-4222-8222-222222222222';
  db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES ('a@ornek.com','tr','bekliyor',?,?)").run(t, new Date(SIMDI).toISOString());
  const r = await onay(new Request(`${SITE_URL}/api/bulten/onay?t=${t}`), env, { now: () => SIMDI + 1000 });
  assert.equal(konum(r), `${SITE_URL}/bulten/?durum=onaylandi`);
  assert.equal(db.prepare('SELECT durum FROM abone').get().durum, 'onayli');

  const bilinmeyen = await onay(new Request(`${SITE_URL}/api/bulten/onay?t=33333333-3333-4333-8333-333333333333`), env, { now: () => SIMDI });
  assert.equal(konum(bilinmeyen), `${SITE_URL}/bulten/?durum=gecersiz`);
  const bozuk = await onay(new Request(`${SITE_URL}/api/bulten/onay?t=x`), env, { now: () => SIMDI });
  assert.equal(konum(bozuk), `${SITE_URL}/bulten/?durum=gecersiz`);

  const eski = '44444444-4444-4444-8444-444444444444';
  db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES ('e@ornek.com','tr','bekliyor',?,?)").run(eski, new Date(SIMDI - BEKLEME_MS - 1000).toISOString());
  const r2 = await onay(new Request(`${SITE_URL}/api/bulten/onay?t=${eski}`), env, { now: () => SIMDI });
  assert.equal(konum(r2), `${SITE_URL}/bulten/?durum=gecersiz`);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM abone WHERE eposta='e@ornek.com'").get().n, 0);
});

test('ayrıl: GET onay formu verir, POST satırı siler (tek tıkla ayrılma da aynı yoldan)', async () => {
  const { db, env } = ortam();
  const t = '55555555-5555-4555-8555-555555555555';
  db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES ('c@ornek.com','tr','onayli',?,?)").run(t, new Date(SIMDI).toISOString());

  const sayfa = ayrilSayfasi(new Request(`${SITE_URL}/api/bulten/ayril?t=${t}`));
  assert.equal(sayfa.status, 200);
  const html = await sayfa.text();
  assert.ok(html.includes(`action="/api/bulten/ayril?t=${t}"`));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM abone').get().n, 1, 'GET silmez');

  const r = await ayril(new Request(`${SITE_URL}/api/bulten/ayril?t=${t}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), env);
  assert.equal(konum(r), `${SITE_URL}/bulten/?durum=ayrildi`);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM abone').get().n, 0);
});

test('yanıtlarda Cache-Control: no-store; bilinmeyen /api yolu 404', async () => {
  const { env } = ortam();
  const r = await abone(form({ eposta: 'bozuk' }), env, { now: () => SIMDI, fetch: sahteFetch().fetch });
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const n = await istek(new Request(`${SITE_URL}/api/baska`), env);
  assert.equal(n.status, 404);
  const g = await istek(new Request(`${SITE_URL}/api/bulten/abone`), env);
  assert.equal(g.status, 404);
});

async function aboneEkle(db, adet) {
  for (let i = 0; i < adet; i++) {
    const t = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma, onay) VALUES (?, 'tr', 'onayli', ?, ?, ?)").run(
      `u${i}@ornek.com`,
      t,
      '2026-01-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
    );
  }
}

function haftalikAssets(haberSayisi = 2) {
  const veri = {
    hafta: '2026-W42',
    haberler: Array.from({ length: haberSayisi }, (_, i) => ({
      baslik: `Haber ${i}`,
      ozet: 'Özet.',
      url: `${SITE_URL}/haber/h${i}/`,
      tarih: new Date(SIMDI - 86_400_000).toISOString(),
    })),
    kalici: [{ baslik: 'Veriler', url: `${SITE_URL}/veri/` }],
  };
  return { fetch: async () => new Response(JSON.stringify(veri), { headers: { 'Content-Type': 'application/json' } }) };
}

test('haftalık gönderim: 250 aboneye 3 batch, her alıcıya ayrı e-posta ve List-Unsubscribe; hafta kaydı yazılır', async () => {
  const { db, env } = ortam({ ASSETS: haftalikAssets() });
  await aboneEkle(db, 250);
  const s = sahteFetch();
  const sonuc = await haftalikCalistir(env, { now: () => SIMDI, fetch: s.fetch });
  assert.equal(sonuc.durum, 'gonderildi');
  assert.equal(s.cagrilar.length, 3);
  assert.deepEqual(s.cagrilar.map((c) => c.govde.length), [100, 100, 50]);
  assert.equal(s.cagrilar[0].url, 'https://api.resend.com/emails/batch');
  assert.equal(s.cagrilar[0].init.headers['x-batch-validation'], 'permissive');
  const mesaj = s.cagrilar[0].govde[0];
  assert.deepEqual(mesaj.to.length, 1);
  assert.equal(mesaj.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  const ayrilma = mesaj.headers['List-Unsubscribe'];
  assert.match(ayrilma, /^<https:\/\/finfolis\.com\/api\/bulten\/ayril\?t=[0-9a-f-]{36}>$/);
  assert.ok(mesaj.html.includes(ayrilma.slice(1, -1)));
  assert.ok(mesaj.text.includes('utm_campaign=haftalik-2026-W42'));
  const gonderim = db.prepare('SELECT hafta, dil, adet FROM gonderim').get();
  assert.deepEqual({ ...gonderim }, { hafta: '2026-W42', dil: 'tr', adet: 250 });

  const ikinci = await haftalikCalistir(env, { now: () => SIMDI, fetch: s.fetch });
  assert.equal(ikinci.durum, 'zaten-gonderildi');
  assert.equal(s.cagrilar.length, 3);
});

test('haftalık gönderim: haber ya da abone yoksa gönderilmez', async () => {
  const bos = ortam({ ASSETS: haftalikAssets(0) });
  await aboneEkle(bos.db, 3);
  const s1 = sahteFetch();
  assert.equal((await haftalikCalistir(bos.env, { now: () => SIMDI, fetch: s1.fetch })).durum, 'haber-yok');
  assert.equal(s1.cagrilar.length, 0);

  const abonesiz = ortam({ ASSETS: haftalikAssets() });
  const s2 = sahteFetch();
  assert.equal((await haftalikCalistir(abonesiz.env, { now: () => SIMDI, fetch: s2.fetch })).durum, 'abone-yok');
  assert.equal(s2.cagrilar.length, 0);
});

test('haftalık gönderim: onaysız kayıtlar 7 gün sonra silinir', async () => {
  const { db, env } = ortam({ ASSETS: haftalikAssets() });
  db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES ('eski@ornek.com','tr','bekliyor','66666666-6666-4666-8666-666666666666',?)").run(new Date(SIMDI - BEKLEME_MS - 1000).toISOString());
  db.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES ('yeni@ornek.com','tr','bekliyor','77777777-7777-4777-8777-777777777777',?)").run(new Date(SIMDI - 1000).toISOString());
  await haftalikCalistir(env, { now: () => SIMDI, fetch: sahteFetch().fetch });
  const kalan = db.prepare('SELECT eposta FROM abone ORDER BY eposta').all().map((r) => r.eposta);
  assert.deepEqual(kalan, ['yeni@ornek.com']);
});
