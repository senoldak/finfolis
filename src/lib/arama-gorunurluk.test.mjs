import { test } from 'node:test';
import assert from 'node:assert/strict';
import { akisCevirisi, aramayaAcik } from './arama-gorunurluk.mjs';

const uzun = Array.from({ length: 200 }, (_, i) => `kelime${i}`).join(' ');

test('akıştan çevrilen düz haber kapalı', () => {
  assert.equal(akisCevirisi({ tur: 'haber', uretim: 'bot' }), true);
  assert.equal(akisCevirisi({}), true);
  assert.equal(aramayaAcik({ govde: uzun, tur: 'haber', uretim: 'bot' }), false);
});

test('bülten, veri/resmî/araştırma, zincir ve yazarlı yazı açık', () => {
  assert.equal(aramayaAcik({ govde: uzun, tur: 'bulten', uretim: 'bot' }), true);
  for (const icerikTuru of ['veri', 'resmi', 'arastirma']) assert.equal(aramayaAcik({ govde: uzun, uretim: 'bot', icerikTuru }), true);
  assert.equal(aramayaAcik({ govde: uzun, uretim: 'yazi-isleri' }), true);
  assert.equal(aramayaAcik({ govde: uzun, uretim: 'editor' }), true);
  assert.equal(aramayaAcik({ govde: uzun, author: 'Şenol Dak' }), true);
});

test('kısa yazı türünden bağımsız kapalı', () => {
  assert.equal(aramayaAcik({ govde: 'kısa', tur: 'bulten' }), false);
  assert.equal(aramayaAcik({ govde: 'kısa', icerikTuru: 'resmi' }), false);
});
