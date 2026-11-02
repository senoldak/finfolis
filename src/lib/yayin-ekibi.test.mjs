import test from 'node:test';
import assert from 'node:assert/strict';
import { AJANLAR, adimlar, kartMetinleri, uretimTuru } from './yayin-ekibi.mjs';
import { portre } from './portre.mjs';

test('uretimTuru: sahip, zincir, bot, bülten', () => {
  assert.equal(uretimTuru({ yaziTuru: 'analiz', uretim: 'yazi-isleri' }), 'sahip');
  assert.equal(uretimTuru({ author: 'Şenol Dak' }), 'sahip');
  assert.equal(uretimTuru({ uretim: 'yazi-isleri' }), 'zincir');
  assert.equal(uretimTuru({ uretim: 'bot' }), 'bot');
  assert.equal(uretimTuru({}), 'bot');
  assert.equal(uretimTuru({ tur: 'bulten' }), null);
  assert.equal(uretimTuru({ uretim: 'editor' }), null);
});

test('adimlar: her adımın figürü tanımlı; sahip yazısında yalnız Şenol ve dil editörü', () => {
  for (const v of [{ yaziTuru: 'analiz' }, { uretim: 'yazi-isleri' }, { uretim: 'bot' }]) {
    for (const a of adimlar(v)) assert.ok(AJANLAR[a.id], a.id);
  }
  assert.deepEqual(adimlar({ yaziTuru: 'analiz' }).map((a) => a.id), ['senol', 'sevgi']);
  assert.deepEqual(adimlar({ tur: 'bulten' }), []);
});

test('bot haberi: bulma metni içerik türüne göre; kaynak adı yok', () => {
  assert.match(adimlar({ icerikTuru: 'resmi' })[0].metin, /resmî kurumun/);
  assert.match(adimlar({})[0].metin, /takip ettiğimiz kaynakların/);
});

test('kartMetinleri: bot haberinde YZ ve program adımları sayılır, insan okumadı', () => {
  const m = kartMetinleri({ uretim: 'bot' });
  assert.equal(m.ozet, 'Otomatik yazıldı: üç yapay zekâ adımı, dört program adımı.');
  assert.equal(m.insanOkumadi, true);
  assert.equal(kartMetinleri({ yaziTuru: 'analiz' }).insanOkumadi, false);
});

test('portre: SVG, yapay zekâ yaka kartı yalnız yz=true iken', () => {
  const s = portre(AJANLAR.kemal.u, true);
  assert.ok(s.startsWith('<svg ') && s.endsWith('</svg>'));
  assert.ok(s.includes('#c2502b'));
  assert.ok(!portre(AJANLAR.kemal.u, false).includes('#c2502b'));
});
