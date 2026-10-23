import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hesaplaAltinPL, svgUret, TCMB_NET_ALTIN_ONS, BAZ_TARIH } from './tcmb-altin-kazanci.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('hesaplaAltinPL fonksiyonu matematiksel olarak doğru çalışıyor', () => {
  const ornekFiyatlar = [
    { tarih: '2025-03-19', fiyat: 3000 },
    { tarih: '2025-03-20', fiyat: 3040 }, // baz
    { tarih: '2025-06-20', fiyat: 3540 }, // +500$
    { tarih: '2026-01-29', fiyat: 5310 }, // +2270$
    { tarih: '2026-06-20', fiyat: 4240 }  // +1200$
  ];

  const sonuc = hesaplaAltinPL(ornekFiyatlar, '2025-03-20', TCMB_NET_ALTIN_ONS);

  assert.equal(sonuc.baz_tarih, '2025-03-20');
  assert.equal(sonuc.baz_fiyat_usd, 3040);
  assert.equal(sonuc.seri.length, 4, 'Baz tarihten önceki günler filtrelenmiş olmalı');

  // Baz tarihte P/L sıfır olmalı
  assert.equal(sonuc.seri[0].kazanc_milyar_usd, 0);

  // +500$ fark -> 500 * 20.75M / 1e9 = 10.375 Milyar $
  const p1 = sonuc.seri[1];
  assert.equal(p1.ons_fark_usd, 500);
  assert.equal(p1.kazanc_milyar_usd, 10.38);

  // Zirve +2270$ fark -> 2270 * 20.75M / 1e9 = 47.10 Milyar $ (Grafikteki 47!)
  const pZirve = sonuc.seri[2];
  assert.equal(Math.round(pZirve.kazanc_milyar_usd), 47);
});

test('svgUret finfolis tasarım diline uygun geçerli bir SVG çıktısı verir', () => {
  const sahteSonuc = {
    baz_tarih: '2025-03-20',
    baz_fiyat_usd: 3043.8,
    rezerv_ons: TCMB_NET_ALTIN_ONS,
    seri: [
      { tarih: '2025-03-20', ons_fiyat_usd: 3043.8, ons_fark_usd: 0, kazanc_milyar_usd: 0 },
      { tarih: '2025-09-20', ons_fiyat_usd: 3330.0, ons_fark_usd: 286.2, kazanc_milyar_usd: 5.94 },
      { tarih: '2026-01-29', ons_fiyat_usd: 5318.4, ons_fark_usd: 2274.6, kazanc_milyar_usd: 47.2 },
      { tarih: '2026-06-20', ons_fiyat_usd: 4245.0, ons_fark_usd: 1201.2, kazanc_milyar_usd: 24.9 },
      { tarih: '2026-09-20', ons_fiyat_usd: 4440.0, ons_fark_usd: 1396.2, kazanc_milyar_usd: 28.98 }
    ]
  };

  const svg = svgUret(sahteSonuc);
  assert.ok(svg.includes('<svg'), 'SVG tag bulunmalı');
  assert.ok(svg.includes('TCMB ALTIN KAZANCI'), 'Başlık bulunmalı');
  assert.ok(svg.includes('#f4f3ee'), 'finfolis paper rengi bulunmalı');
  assert.ok(svg.includes('47'), 'Zirve etiketi 47 bulunmalı');
});

test('Üretilen tcmb-altin-kazanci.json ve svg dosyaları mevcutsa şemaya uygundur', () => {
  const jsonPath = resolve(__dirname, '../public/data/tcmb-altin-kazanci.json');
  const svgPath = resolve(__dirname, '../public/grafikler/tcmb-altin-pl.svg');

  if (existsSync(jsonPath)) {
    const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
    assert.ok(Array.isArray(json.seri), 'seri dizisi bulunmalı');
    assert.ok(json.seri.length > 50, 'en az 50 günlük veri bulunmalı');
    assert.ok('baz_fiyat_usd' in json);
    assert.ok('rezerv_ons' in json);
  }

  if (existsSync(svgPath)) {
    const svg = readFileSync(svgPath, 'utf8');
    assert.ok(svg.includes('<svg'));
  }
});
