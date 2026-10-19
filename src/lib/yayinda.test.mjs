import test from 'node:test';
import assert from 'node:assert/strict';
import { yayinda, onyuzMaddesiYayinda, onyuzMaddesiTarihi } from './yayinda.mjs';

const SIMDI = Date.parse('2026-11-14T05:00:00Z');

test('yayinda: geçmiş tarihli yazı yayında', () => {
  assert.equal(yayinda({ date: new Date('2026-11-13T10:00:00Z') }, SIMDI), true);
  assert.equal(yayinda({ draft: false, date: '2026-11-13T10:00:00Z' }, SIMDI), true);
});

test('yayinda: ileri tarihli yazı yayında değil', () => {
  assert.equal(yayinda({ date: new Date('2026-11-15T10:00:00Z') }, SIMDI), false);
  assert.equal(yayinda({ draft: false, date: '2026-11-15T10:00:00Z' }, SIMDI), false);
});

test('yayinda: taslak, tarihi geçmiş olsa da yayında değil', () => {
  assert.equal(yayinda({ draft: true, date: new Date('2026-11-13T10:00:00Z') }, SIMDI), false);
});

test('yayinda: açık ofsetli tarih doğru karşılaştırılır (+03:00 08:00 = 05:00Z)', () => {
  const date = '2026-11-14T08:00:00+03:00';
  assert.equal(yayinda({ date }, SIMDI), true);
  assert.equal(yayinda({ date }, SIMDI - 60_000), false);
  assert.equal(yayinda({ date: new Date(date) }, SIMDI), true);
  assert.equal(yayinda({ date: new Date(date) }, SIMDI - 60_000), false);
});

test('yayinda: ofsetsiz tarih UTC sayılır (zod coerce.date gibi)', () => {
  assert.equal(yayinda({ date: '2026-11-14T05:00:00' }, SIMDI), true);
  assert.equal(yayinda({ date: '2026-11-14T05:00:00' }, SIMDI - 60_000), false);
  assert.equal(yayinda({ date: '2026-11-14' }, Date.parse('2026-11-14T00:00:00Z')), true);
  assert.equal(yayinda({ date: '2026-11-14' }, Date.parse('2026-11-13T23:59:00Z')), false);
});

test('yayinda: geçersiz tarih yayında değil', () => {
  assert.equal(yayinda({ date: 'yarın' }, SIMDI), false);
  assert.equal(yayinda({ date: new Date('') }, SIMDI), false);
});

const md = (onyuz) => `---\n${onyuz}\n---\n\nGövde metni.\n`;

test('onyuzMaddesiYayinda: tırnaksız date satırı', () => {
  assert.equal(onyuzMaddesiYayinda(md('title: "A"\ndate: 2026-11-14T08:00:00+03:00'), SIMDI), true);
  assert.equal(onyuzMaddesiYayinda(md('title: "A"\ndate: 2026-11-14T08:00:00+03:00'), SIMDI - 60_000), false);
});

test('onyuzMaddesiYayinda: tırnaklı date satırı', () => {
  assert.equal(onyuzMaddesiYayinda(md('date: "2026-11-14T08:00:00+03:00"'), SIMDI), true);
  assert.equal(onyuzMaddesiYayinda(md('date: "2026-11-14T08:00:00+03:00"'), SIMDI - 60_000), false);
  assert.equal(onyuzMaddesiYayinda(md("date: '2026-11-14T05:00:00Z'"), SIMDI), true);
  assert.equal(onyuzMaddesiYayinda(md("date: '2026-11-14T05:00:00Z'"), SIMDI - 60_000), false);
});

test('onyuzMaddesiYayinda: CRLF satır sonları', () => {
  assert.equal(onyuzMaddesiYayinda('---\r\ntitle: A\r\ndate: 2026-11-13T05:00:00.000Z\r\n---\r\n\r\nGövde\r\n', SIMDI), true);
});

test('onyuzMaddesiYayinda: draft: true ise yayında değil', () => {
  assert.equal(onyuzMaddesiYayinda(md('date: 2026-11-13T05:00:00.000Z\ndraft: true'), SIMDI), false);
  assert.equal(onyuzMaddesiYayinda(md('date: 2026-11-13T05:00:00.000Z\ndraft: false'), SIMDI), true);
});

test('onyuzMaddesiYayinda: date yoksa false', () => {
  assert.equal(onyuzMaddesiYayinda(md('title: "A"'), SIMDI), false);
  assert.equal(onyuzMaddesiYayinda('ön bilgisi olmayan metin', SIMDI), false);
  // Gövdedeki "date:" satırı ön bilgi sayılmaz.
  assert.equal(onyuzMaddesiYayinda('---\ntitle: A\n---\n\ndate: 2026-11-13T05:00:00Z\n', SIMDI), false);
});

test('onyuzMaddesiTarihi: ön bilgideki tarih ms olarak okunur; ofsetsiz UTC, ofsetli ofsetiyle', () => {
  const md = (on) => `---\ntitle: "A"\n${on}\n---\n\nGövde\n`;
  assert.equal(onyuzMaddesiTarihi(md('date: 2026-11-14T08:00:00+03:00')), Date.parse('2026-11-14T05:00:00Z'));
  assert.equal(onyuzMaddesiTarihi(md('date: "2026-11-14T08:00:00"')), Date.parse('2026-11-14T08:00:00Z'));
  assert.equal(onyuzMaddesiTarihi(md("date: '2026-11-14'")), Date.parse('2026-11-14T00:00:00Z'));
});

test('onyuzMaddesiTarihi: tarih yoksa ya da okunamıyorsa NaN', () => {
  assert.ok(Number.isNaN(onyuzMaddesiTarihi('---\ntitle: A\n---\n')));
  assert.ok(Number.isNaN(onyuzMaddesiTarihi('---\ndate: dün\n---\n')));
  assert.ok(Number.isNaN(onyuzMaddesiTarihi('ön bilgisi olmayan metin')));
});
