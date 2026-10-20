import test from 'node:test';
import assert from 'node:assert/strict';
import { yapayZekaNotu, sahipYazisiMi, BOT_NOTU, SAHIP_NOTU } from './yapay-zeka-notu.mjs';

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
