// Kaynak: mecmua/site-ortak/planli/scripts/planlagt.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { vadesiGelenler, eksikOlanlar, haberAdresi, yazilariOku, siteAdresi } from './planlagt.mjs';

const SIMDI = Date.parse('2026-11-14T06:00:00Z');
const GUN = 86400e3;
const md = (date, ek = '') => `---\ntitle: "A"\ndate: ${date}\n${ek}---\n\nGövde\n`;
const iso = (ms) => new Date(ms).toISOString();

test('vadesiGelenler: son 3 günde tarihi gelen yayında yazılar; eski, gelecek ve taslak hariç', () => {
  const yazilar = [
    { kimlik: 'dun', metin: md(iso(SIMDI - 1 * GUN)) },
    { kimlik: 'dort-gun-once', metin: md(iso(SIMDI - 4 * GUN)) },
    { kimlik: 'yarin', metin: md(iso(SIMDI + 1 * GUN)) },
    { kimlik: 'taslak', metin: md(iso(SIMDI - 1 * GUN), 'draft: true\n') },
  ];
  assert.deepEqual(vadesiGelenler({ yazilar, simdi: SIMDI }), ['dun']);
});

test('vadesiGelenler: açık ofsetli saat doğru karşılaştırılır; ofsetsiz saat UTC sayılır', () => {
  const yazilar = [
    // 08:00 İstanbul = 05:00 UTC → SIMDI'den (06:00 UTC) önce: vadesi gelmiş.
    { kimlik: 'istanbul-sekiz', metin: md('2026-11-14T08:00:00+03:00') },
    // Ofsetsiz 08:00 UTC sayılır → SIMDI'den sonra: henüz değil.
    { kimlik: 'ofsetsiz-sekiz', metin: md('2026-11-14T08:00:00') },
  ];
  assert.deepEqual(vadesiGelenler({ yazilar, simdi: SIMDI }), ['istanbul-sekiz']);
});

test('vadesiGelenler: pencere ayarlanabilir; aynı kimlik bir kez döner', () => {
  const yazilar = [
    { kimlik: 'bes-gun-once', metin: md(iso(SIMDI - 5 * GUN)) },
    { kimlik: 'iki', metin: md(iso(SIMDI - 1 * GUN)) },
    { kimlik: 'iki', metin: md(iso(SIMDI - 2 * GUN)) },
  ];
  assert.deepEqual(vadesiGelenler({ yazilar, simdi: SIMDI, pencereGun: 6 }), ['bes-gun-once', 'iki']);
});

test('eksikOlanlar: yalnız 404 dönen adresin yazısı eksik sayılır', async () => {
  const durum = { 'https://x.test/a/': 200, 'https://x.test/b/': 404, 'https://x.test/c/': 301, 'https://x.test/d/': 404 };
  const istenen = [];
  const getir = async (url) => {
    istenen.push(url);
    return { status: durum[url] };
  };
  const eksik = await eksikOlanlar({ kimlikler: ['a', 'b', 'c', 'd'], adres: (k) => [`https://x.test/${k}/`], getir });
  assert.deepEqual(eksik, ['b', 'd']);
  assert.deepEqual(istenen, Object.keys(durum));
});

test('eksikOlanlar: yazı yoksa hiçbir istek yapılmaz', async () => {
  const getir = async () => assert.fail('istek yapılmamalı');
  assert.deepEqual(await eksikOlanlar({ kimlikler: [], adres: () => ['https://x.test/'], getir }), []);
});

test('haberAdresi: /haber/<kimlik>/, kimlik küçük harfe çevrilir (astro.config.mjs ile aynı)', () => {
  assert.equal(haberAdresi('https://kifobu.com', 'Aerium-Tohum'), 'https://kifobu.com/haber/aerium-tohum/');
});

test('yazilariOku: klasör/index.md düzeninde kimlik klasör adıdır, alt klasör yolu korunur, .md olmayan atlanır', async () => {
  const dizin = await mkdtemp(path.join(os.tmpdir(), 'pl-'));
  await mkdir(path.join(dizin, 'a-b'));
  await writeFile(path.join(dizin, 'a-b', 'index.md'), md('2026-11-13T06:00:00Z'));
  await writeFile(path.join(dizin, 'a-b', 'kapak.png'), '');
  await mkdir(path.join(dizin, 'Ust'));
  await writeFile(path.join(dizin, 'Ust', 'Alt.md'), md('2026-11-13T06:00:00Z'));
  const kimlikler = (await yazilariOku(dizin)).map((y) => y.kimlik).sort();
  assert.deepEqual(kimlikler, ['Ust/Alt', 'a-b']);
  assert.equal(haberAdresi('https://finfolis.com', 'a-b'), 'https://finfolis.com/haber/a-b/');
});

test('siteAdresi: SITE ortam değişkeni önce, sonra site-ortak.json; ikisi de yoksa hata', () => {
  assert.equal(siteAdresi({ SITE: 'https://deneme.example/' }, { site: 'https://kifobu.com' }), 'https://deneme.example');
  assert.equal(siteAdresi({}, { site: 'https://finfolis.com/' }), 'https://finfolis.com');
  assert.throws(() => siteAdresi({}, null), /site-ortak\.json/);
});
