import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resmiKaynaklar, adsizKaynakSatiri } from './resmi-kaynak.mjs';

test('resmî kurum bağlantısı gösterilir', () => {
  assert.deepEqual(resmiKaynaklar({ kaynaklar: [{ ad: 'TCMB', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/ppk' }] }), [
    { ad: 'TCMB', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/ppk' },
  ]);
  assert.equal(resmiKaynaklar({ kaynaklar: [{ ad: 'SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar' }] }).length, 1);
  assert.equal(resmiKaynaklar({ kaynaklar: [{ ad: 'BoJ', url: 'http://www.boj.or.jp/en/' }] })[0].url, 'https://www.boj.or.jp/en/');
});

test('medya izi taşıyan (karma) haberde satır yok', () => {
  assert.deepEqual(resmiKaynaklar({ kaynakIzi: 'v1.abc', kaynaklar: [{ ad: 'TCMB', url: 'https://www.tcmb.gov.tr/' }] }), []);
});

test('izin listesinde olmayan alan adı ve site içi bağlantı gösterilmez', () => {
  assert.deepEqual(resmiKaynaklar({ kaynaklar: [{ ad: 'Piyasa kapanış verisi', url: 'https://finfolis.com/yayin-ilkeleri/#piyasa-verisi' }] }), []);
  assert.deepEqual(resmiKaynaklar({ kaynaklar: [{ ad: 'Haber', url: 'https://haber.example.com/x' }] }), []);
  assert.deepEqual(resmiKaynaklar({ kaynaklar: [{ ad: 'Sahte', url: 'https://tcmb.gov.tr.example.com/' }] }), []);
  assert.deepEqual(resmiKaynaklar({ kaynaklar: [{ ad: 'Bozuk', url: 'değil' }] }), []);
});

test('aracı veri servisi kurumun sayfasına bağlanır; aynı adres bir kez', () => {
  const r = resmiKaynaklar({
    kaynaklar: [
      { ad: 'Avrupa Merkez Bankası referans kuru', url: 'https://www.frankfurter.dev/v1/latest' },
      { ad: 'Avrupa Merkez Bankası referans kuru', url: 'https://www.frankfurter.dev/v1/2026-10-01' },
    ],
  });
  assert.equal(r.length, 1);
  assert.match(r[0].url, /^https:\/\/www\.ecb\.europa\.eu\//);
});

test('medya kaynaklı haberde adsız kaynak satırı; bültende karma satır', () => {
  assert.equal(
    adsizKaynakSatiri({ kaynakIzi: 'v1.abc' }),
    'Kaynak: Kamuya açık finansal veriler ve bağımsız piyasa haber akışları.',
  );
  assert.equal(
    adsizKaynakSatiri({ kaynakIzi: 'v1.abc', tur: 'bulten' }),
    'Kaynak: Resmî kurum verileri ve kamuya açık piyasa haberleri.',
  );
});

test('kaynakIzi yoksa adsız satır yok (resmî kaynaklı haber, sahibin yazısı)', () => {
  assert.equal(adsizKaynakSatiri({ kaynaklar: [{ ad: 'TCMB', url: 'https://www.tcmb.gov.tr/' }] }), null);
  assert.equal(adsizKaynakSatiri({ kaynakIzi: '  ' }), null);
  assert.equal(adsizKaynakSatiri({ tur: 'bulten' }), null);
  assert.equal(adsizKaynakSatiri(undefined), null);
});
