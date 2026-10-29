import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calistir } from './revizyon.mjs';

const kaynak = { ad: 'TÜİK verisi, TCMB', url: 'https://evds3.tcmb.gov.tr/' };
const resmi = (yillik) => ({ enflasyon: { kaynak, satirlar: [{ yil: 2026, ay: 8, yillik, aylik: 1.84 }], alinma: 'x' } });
const simdi = new Date('2026-10-29T08:00:00Z');

test('--yaz: revizyonu dosyaya yazar, ikinci çalıştırmada tekrar yazmaz', () => {
  const dosya = join(mkdtempSync(join(tmpdir(), 'rev-')), 'revizyonlar.json');
  const a = calistir({ yaz: true, simdi, eskiResmi: resmi(31.51), yeniResmi: resmi(31.6), cikti: dosya, log: () => {} });
  assert.equal(a.eklenen.length, 1);
  const k = JSON.parse(readFileSync(dosya, 'utf8'));
  assert.equal(k.revizyonlar[0].yeni, 31.6);
  const b = calistir({ yaz: true, simdi, eskiResmi: resmi(31.51), yeniResmi: resmi(31.6), cikti: dosya, log: () => {} });
  assert.equal(b.eklenen.length, 0);
  assert.equal(JSON.parse(readFileSync(dosya, 'utf8')).revizyonlar.length, 1);
});

test('--yaz olmadan dosya yazılmaz', () => {
  const dosya = join(mkdtempSync(join(tmpdir(), 'rev-')), 'revizyonlar.json');
  calistir({ yaz: false, simdi, eskiResmi: resmi(31.51), yeniResmi: resmi(31.6), cikti: dosya, log: () => {} });
  assert.equal(existsSync(dosya), false);
});

test('revizyon yoksa --yaz boş dosyayı oluşturur', () => {
  const dosya = join(mkdtempSync(join(tmpdir(), 'rev-')), 'revizyonlar.json');
  calistir({ yaz: true, simdi, eskiResmi: resmi(31.51), yeniResmi: resmi(31.51), cikti: dosya, log: () => {} });
  assert.deepEqual(JSON.parse(readFileSync(dosya, 'utf8')), { revizyonlar: [] });
});
