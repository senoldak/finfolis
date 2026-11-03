import { test } from 'node:test';
import assert from 'node:assert/strict';
import { akisCevirisi, aramayaAcik, googleaKapali, piyasaKalibi } from './arama-gorunurluk.mjs';

const uzun = Array.from({ length: 200 }, (_, i) => `kelime${i}`).join(' ');
const kapanis = [{ ad: 'Piyasa kapanış verisi' }];

test('akıştan çevrilen düz haber kapalı', () => {
  assert.equal(akisCevirisi({ tur: 'haber', uretim: 'bot' }), true);
  assert.equal(akisCevirisi({}), true);
  assert.equal(aramayaAcik({ govde: uzun, tur: 'haber', uretim: 'bot' }), false);
});

test('bülten Google\'a kapalı', () => {
  assert.equal(akisCevirisi({ tur: 'bulten', uretim: 'bot' }), false);
  assert.equal(googleaKapali({ tur: 'bulten', uretim: 'bot' }), true);
  assert.equal(aramayaAcik({ govde: uzun, tur: 'bulten', uretim: 'bot' }), false);
});

test('yalnız kapanış verisinden üretilen piyasa yazısı kapalı', () => {
  const kalip = { govde: uzun, tur: 'haber', icerikTuru: 'veri', uretim: 'bot', kaynaklar: kapanis };
  assert.equal(piyasaKalibi(kalip), true);
  assert.equal(aramayaAcik(kalip), false);
  // Başka kaynağı olan veri haberi, yazı işleri ve yazarlı yazı açık kalır.
  assert.equal(aramayaAcik({ ...kalip, kaynaklar: [...kapanis, { ad: 'TÜİK' }] }), true);
  assert.equal(aramayaAcik({ ...kalip, kaynaklar: [{ ad: 'TCMB EVDS' }] }), true);
  assert.equal(aramayaAcik({ ...kalip, uretim: 'yazi-isleri' }), true);
  assert.equal(aramayaAcik({ ...kalip, author: 'Şenol Dak' }), true);
  assert.equal(piyasaKalibi({ ...kalip, icerikTuru: 'resmi' }), false);
});

test('veri/resmî/araştırma, zincir ve yazarlı yazı açık', () => {
  for (const icerikTuru of ['veri', 'resmi', 'arastirma']) assert.equal(aramayaAcik({ govde: uzun, uretim: 'bot', icerikTuru }), true);
  assert.equal(aramayaAcik({ govde: uzun, uretim: 'yazi-isleri' }), true);
  assert.equal(aramayaAcik({ govde: uzun, uretim: 'editor' }), true);
  assert.equal(aramayaAcik({ govde: uzun, author: 'Şenol Dak' }), true);
});

test('kısa yazı türünden bağımsız kapalı', () => {
  assert.equal(aramayaAcik({ govde: 'kısa', tur: 'bulten' }), false);
  assert.equal(aramayaAcik({ govde: 'kısa', icerikTuru: 'resmi' }), false);
});
