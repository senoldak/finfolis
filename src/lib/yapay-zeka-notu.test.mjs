import test from 'node:test';
import assert from 'node:assert/strict';
import { yapayZekaNotu, sahipYazisiMi, zincirYazisiMi, BOT_NOTU, SAHIP_NOTU, ZINCIR_NOTU } from './yapay-zeka-notu.mjs';

test('bot yazısı bot notunu alır', () => {
  const n = yapayZekaNotu({ uretim: 'bot' }, 'Faiz kararı', 'https://finfolis.com/haber/x/');
  assert.equal(n.metin, BOT_NOTU);
  assert.equal(n.metin, 'Bu haber yapay zekâ ile otomatik yazıldı ve otomatik denetimden geçti.');
  assert.equal(n.baglantiMetni, 'Hata bildir →');
});

test('yazarsız yazı ve bülten bot sayılır', () => {
  assert.equal(sahipYazisiMi({}), false);
  assert.equal(sahipYazisiMi({ uretim: 'bot', tur: 'bulten' }), false);
});

test('Şenol Dak yazısı ve açıklayıcı/referans yazısı sahip notunu alır', () => {
  assert.equal(yapayZekaNotu({ author: 'Şenol Dak', uretim: 'editor' }, 'b', 'https://finfolis.com/haber/x/').metin, SAHIP_NOTU);
  assert.equal(yapayZekaNotu({ yaziTuru: 'aciklayici' }, 'b', 'https://finfolis.com/haber/x/').metin, SAHIP_NOTU);
  assert.equal(yapayZekaNotu({ yaziTuru: 'referans', uretim: 'bot' }, 'b', 'https://finfolis.com/haber/x/').metin, SAHIP_NOTU);
});

test('bağlantı mailto: konu ve gövde kodlanır', () => {
  const n = yapayZekaNotu({}, 'Fed faizi %4,25 & sabit', 'https://finfolis.com/haber/fed/');
  const u = new URL(n.baglanti);
  assert.equal(u.protocol, 'mailto:');
  assert.equal(u.pathname, 'contact@finfolis.com');
  assert.equal(u.searchParams.get('subject'), 'Hata bildirimi: Fed faizi %4,25 & sabit');
  assert.equal(u.searchParams.get('body'), 'https://finfolis.com/haber/fed/');
});

test('metinlerde "sorumlu" geçmez', () => {
  assert.ok(!/sorumlu/i.test(BOT_NOTU + SAHIP_NOTU));
});

test('yazı işleri zinciri (uretim yazi-isleri): yazı türü dolu ya da yazar Şenol Dak olsa da zincir notu; bağlantı aynı', () => {
  const metin =
    'Bu yazı yapay zekâ araçlarıyla yazıldı. Rakamlar ve alıntılar resmî kaynaklarla karşılaştırıldı; yazı yayından önce editör tarafından okunup onaylandı.';
  assert.equal(ZINCIR_NOTU, metin);
  for (const veri of [{ uretim: 'yazi-isleri', yaziTuru: 'aciklayici' }, { uretim: 'yazi-isleri', yaziTuru: 'referans', author: 'Şenol Dak' }]) {
    const n = yapayZekaNotu(veri, 'Faiz kararı', 'https://finfolis.com/haber/x/');
    assert.equal(n.metin, metin);
    assert.notEqual(n.metin, SAHIP_NOTU);
    assert.equal(n.baglantiMetni, 'Hata bildir →');
    assert.equal(n.baglanti, yapayZekaNotu({}, 'Faiz kararı', 'https://finfolis.com/haber/x/').baglanti);
  }
  assert.equal(zincirYazisiMi({ uretim: 'yazi-isleri' }), true);
  assert.equal(zincirYazisiMi({ uretim: 'editor', yaziTuru: 'aciklayici' }), false);
  assert.ok(!/sorumlu/i.test(ZINCIR_NOTU));
});
