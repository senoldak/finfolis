import test from 'node:test';
import assert from 'node:assert/strict';
import { okumaSuresi, turEtiketi } from './yazi-bilgisi.mjs';

test('okumaSuresi: 200 kelime/dk, en az 1 dakika, ön bilgi sayılmaz', () => {
  assert.equal(okumaSuresi(''), 1);
  assert.equal(okumaSuresi('kelime '.repeat(450)), 2);
  assert.equal(okumaSuresi('kelime '.repeat(700)), 4);
  assert.equal(okumaSuresi(`---\ntitle: x\n---\n${'kelime '.repeat(200)}`), 1);
});

test('turEtiketi: düz haberde etiket yok, bülten ve içerik türleri etiketlenir', () => {
  assert.equal(turEtiketi({ tur: 'haber' }), undefined);
  assert.equal(turEtiketi({ tur: 'bulten' }), 'Bülten');
  assert.equal(turEtiketi({ tur: 'haber', icerikTuru: 'arastirma' }), 'Araştırma');
  assert.equal(turEtiketi({ icerikTuru: 'resmi' }), 'Resmi açıklama');
  assert.equal(turEtiketi({ icerikTuru: 'veri' }), 'Veri');
});

test('turEtiketi: analiz yazısı "Analiz" etiketi alır (içerik türünden önce)', () => {
  assert.equal(turEtiketi({ yaziTuru: 'analiz' }), 'Analiz');
  assert.equal(turEtiketi({ yaziTuru: 'analiz', icerikTuru: 'veri' }), 'Analiz');
  assert.equal(turEtiketi({ yaziTuru: 'aciklayici' }), undefined);
});
