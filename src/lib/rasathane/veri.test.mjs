import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BOLUMLER, veriDurumu, sayfalariOku } from './veri.mjs';

const SIMDI = new Date('2026-11-03T12:00:00Z');
const sayfa = (guncellendi, ek = {}) => ({
  sema: 1, bolum: 'emtia', sayfa: 'pano', baslik: 'B', aciklama: 'a', guncellendi,
  kaynaklar: [], sutunlar: [], satirlar: [], ...ek,
});

function kok(fn) {
  const d = mkdtempSync(join(tmpdir(), 'rasathane-'));
  try { return fn(d); } finally { rmSync(d, { recursive: true, force: true }); }
}
const yaz = (d, yol, icerik) => {
  const tam = join(d, yol);
  mkdirSync(join(tam, '..'), { recursive: true });
  writeFileSync(tam, typeof icerik === 'string' ? icerik : JSON.stringify(icerik));
};

test('BOLUMLER dokuz bölüm içerir', () => {
  assert.equal(BOLUMLER.length, 9);
  assert.ok(BOLUMLER.some((b) => b.anahtar === 'varant'));
  assert.ok(BOLUMLER.some((b) => b.anahtar === 'viop'));
  assert.ok(BOLUMLER.some((b) => b.anahtar === 'grafix'));
  assert.deepEqual(BOLUMLER[0], { anahtar: 'emtia', ad: 'Emtia' });
});

test('sayfalariOku: geçerli sayfayı okur, sema 2 ve bozuk JSON atlanır', () => kok((d) => {
  yaz(d, 'emtia/pano.json', sayfa('2026-11-03T06:00:00Z'));
  yaz(d, 'emtia/yeni.json', sayfa('2026-11-03T06:00:00Z', { sema: 2 }));
  yaz(d, 'emtia/bozuk.json', '{ bozuk');
  const w = console.warn; console.warn = () => {};
  try {
    const r = sayfalariOku(d, SIMDI);
    assert.equal(r.length, 1);
    assert.equal(r[0].bolum, 'emtia');
    assert.equal(r[0].sayfa, 'pano');
    assert.equal(r[0].veri.baslik, 'B');
  } finally { console.warn = w; }
}));

test('sayfalariOku: zorunlu alan eksikse atlanır', () => kok((d) => {
  const { baslik, ...eksik } = sayfa('2026-11-03T06:00:00Z');
  yaz(d, 'emtia/pano.json', eksik);
  const w = console.warn; console.warn = () => {};
  try { assert.deepEqual(sayfalariOku(d, SIMDI), []); } finally { console.warn = w; }
}));

test('sayfalariOku: klasör yoksa boş', () => {
  assert.deepEqual(sayfalariOku(join(tmpdir(), 'rasathane-yok-klasor'), SIMDI), []);
});

test('sayfalariOku: 4 günden eski ise eski=true', () => kok((d) => {
  yaz(d, 'emtia/eski.json', sayfa('2026-10-29T12:00:00Z'));
  yaz(d, 'emtia/taze.json', sayfa('2026-11-02T12:00:00Z'));
  const r = Object.fromEntries(sayfalariOku(d, SIMDI).map((x) => [x.sayfa, x.eski]));
  assert.equal(r.eski, true);
  assert.equal(r.taze, false);
}));

test('sayfalariOku: seri/ altı sayfa sayılmaz', () => kok((d) => {
  yaz(d, 'emtia/pano.json', sayfa('2026-11-03T06:00:00Z'));
  yaz(d, 'emtia/seri/GC=F.json', { sema: 1, ad: 'x', birim: 'y', noktalar: [], isaretler: [] });
  assert.equal(sayfalariOku(d, SIMDI).length, 1);
}));

test('veriDurumu: _durum.json yoksa alinamadi, tamam ise tamam', () => kok((d) => {
  assert.equal(veriDurumu(d), 'alinamadi');
  yaz(d, '_durum.json', { durum: 'alinamadi' });
  assert.equal(veriDurumu(d), 'alinamadi');
  yaz(d, '_durum.json', { durum: 'tamam' });
  assert.equal(veriDurumu(d), 'tamam');
}));
