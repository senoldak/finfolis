import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('tcmb-net-pozisyon-degisimi json ve svg çıktı dosyaları mevcut ve geçerli', () => {
  const jsonPath = resolve(__dirname, '../public/data/tcmb-net-pozisyon-degisimi.json');
  const svgPath = resolve(__dirname, '../public/grafikler/tcmb-net-pozisyon-degisimi.svg');

  assert.ok(existsSync(jsonPath), 'JSON veri dosyası üretilmiş olmalı');
  assert.ok(existsSync(svgPath), 'SVG grafik dosyası üretilmiş olmalı');

  const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
  assert.ok(Array.isArray(json.seri), 'seri dizisi bulunmalı');
  assert.ok(json.seri.length > 5, 'en az 5 günlük veri bulunmalı');

  const ilk = json.seri[0];
  assert.ok('tarih' in ilk);
  assert.ok('usd_kuru' in ilk);
  assert.ok('net_rezerv_milyar_usd' in ilk);
  assert.ok('degisim_altin_arindirilmis_milyar_usd' in ilk);
  assert.ok('altin_degerleme_etkisi_milyar_usd' in ilk);

  // SVG içeriği doğrulaması
  const svg = readFileSync(svgPath, 'utf8');
  assert.ok(svg.includes('<svg'), 'SVG tag bulunmalı');
  assert.ok(svg.includes('TCMB Net Döviz Pozisyonu Günlük Değişimi'), 'Grafik başlığı bulunmalı');
  assert.ok(svg.includes('#3f7350') || svg.includes('#a3243b'), 'Finfolis veri renkleri (yükseliş/düşüş) bulunmalı');
});
