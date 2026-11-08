import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { formatTarihEvds, evdsAnahtariAl } from './tcmb-swap-orani.mjs';

test('tcmb-swap-orani formatTarihEvds güncel tarihi DD-MM-YYYY biçiminde döndürür', () => {
  const d = new Date('2026-11-08T12:00:00Z');
  assert.equal(formatTarihEvds(d), '08-11-2026');
  const simdi = formatTarihEvds();
  assert.match(simdi, /^\d{2}-\d{2}-\d{4}$/);
});

test('EVDS anahtarından BOM (\\uFEFF) ve boşluklar temizlenir', () => {
  const gercek = process.env.EVDS_API_KEY;
  try {
    process.env.EVDS_API_KEY = '\uFEFF\uFEFFmy-secret-key\uFEFF   ';
    assert.equal(evdsAnahtariAl(), 'my-secret-key');
  } finally {
    if (gercek !== undefined) process.env.EVDS_API_KEY = gercek;
    else delete process.env.EVDS_API_KEY;
  }
});

test('tcmb-swap-orani json ve svg çıktı dosyaları mevcut ve geçerli', () => {
  const jsonPath = resolve(__dirname, '../public/data/tcmb-swap-orani.json');
  const svgPath = resolve(__dirname, '../public/grafikler/tcmb-swap-orani.svg');

  assert.ok(existsSync(jsonPath), 'JSON veri dosyası üretilmiş olmalı');
  assert.ok(existsSync(svgPath), 'SVG grafik dosyası üretilmiş olmalı');

  const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
  assert.ok(Array.isArray(json.seri), 'seri dizisi bulunmalı');
  assert.ok(json.seri.length > 50, 'en az 50 aylık veri bulunmalı');

  const ilk = json.seri[0];
  assert.ok('tarih' in ilk);
  assert.ok('toplam_rezerv_milyar_usd' in ilk);
  assert.ok('swap_stoku_milyar_usd' in ilk);
  assert.ok('swap_payi_toplam_yuzde' in ilk);

  // Oran testi: swap payı %0 ile %100 arasında (veya dövize göre biraz üstünde) mantıklı bir aralıkta olmalı
  assert.ok(ilk.swap_payi_toplam_yuzde > 0 && ilk.swap_payi_toplam_yuzde < 100);

  const svg = readFileSync(svgPath, 'utf8');
  assert.ok(svg.includes('<svg'), 'SVG tag bulunmalı');
  assert.ok(svg.includes('TCMB Resmi Rezervlerinin Ne Kadarı Swap Kaynaklı?'), 'Grafik başlığı bulunmalı');
});
