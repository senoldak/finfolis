import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, '../../src/data/abd-tahvil.json');
const svgPath = resolve(__dirname, '../../public/grafikler/turkiye-abd-tahvil-akimlari.svg');

test('abd-tahvil.json var ve geçerli şemada', () => {
  assert.ok(existsSync(jsonPath), 'abd-tahvil.json dosyası mevcut olmalı');
  const data = JSON.parse(readFileSync(jsonPath, 'utf8'));

  assert.ok(data.guncellenme, 'guncellenme tarihi olmalı');
  assert.equal(data.son4AyDonem, 'Nisan - Ağustos 2026');
  assert.ok(typeof data.son4AyTicNetAlimMilyarUsd === 'number');
  assert.ok(data.son4AyTicNetAlimMilyarUsd > 3.5 && data.son4AyTicNetAlimMilyarUsd < 4.5, 'Son 4 ay net alım yaklaşık 4 milyar $ olmalı');

  assert.ok(Array.isArray(data.seri), 'seri dizisi olmalı');
  assert.ok(data.seri.length >= 20, 'en az 20 aylık veri olmalı');

  const son = data.seri.at(-1);
  assert.ok(son.donem >= '2026-08', 'son dönem en az Ağustos 2026 olmalı');
});

test('turkiye-abd-tahvil-akimlari.svg var ve geçerli SVG', () => {
  assert.ok(existsSync(svgPath), 'turkiye-abd-tahvil-akimlari.svg mevcut olmalı');
  const svg = readFileSync(svgPath, 'utf8');
  assert.ok(svg.includes('<svg'), 'SVG açılış etiketi olmalı');
  assert.ok(svg.includes('</svg>'), 'SVG kapanış etiketi olmalı');
  assert.ok(svg.includes("Türkiye'nin Aylık ABD Hazine Tahvili Net Alım-Satımları"), 'Başlık içermeli');
  assert.ok(svg.includes('FORTREASNET12807'), 'FRED seri kodunu içermeli');
});
