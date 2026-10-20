import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motorKaydet, motorKimlik, kirmiziKayit, sariKayit } from './motor.mjs';

test('motorKimlik: adresten bağımsız, kararlı, sıradan bağımsız, desen uyar', () => {
  const k = motorKimlik('ecb:https://x/y.html', 'sec:1');
  assert.match(k, /^[A-Za-z0-9:_-]{1,128}$/);
  assert.equal(k, motorKimlik('sec:1', 'ecb:https://x/y.html'));
  assert.ok(!k.includes('http'));
});

test('motorKaydet: doğru uca yazar; ayarsız false; hata fırlatmaz', async () => {
  let istek;
  const ok = await motorKaydet({ url: 'https://s.example/', anahtar: 'a'.repeat(20), kayit: kirmiziKayit(['a'], 'standart:kirmizi:suc'), fetchFn: async (u, o) => ((istek = { u, o }), { ok: true }) });
  assert.equal(ok, true);
  assert.equal(istek.u, 'https://s.example/motor/finfolis/kaydet');
  assert.equal(JSON.parse(istek.o.body).haberler[0].durum, 'elendi');
  assert.equal(await motorKaydet({ kayit: sariKayit(['a'], 's', 'g') }), false);
  assert.equal(await motorKaydet({ url: 'https://s', anahtar: 'x', kayit: sariKayit(['a'], 's', 'g'), fetchFn: async () => { throw new Error('ağ'); } }), false);
  assert.equal(await motorKaydet({ url: 'https://s', anahtar: 'x', kayit: sariKayit(['a'], 's', 'g'), fetchFn: async () => ({ ok: false, status: 500 }) }), false);
});
