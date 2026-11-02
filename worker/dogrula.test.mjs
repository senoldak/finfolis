import test from 'node:test';
import assert from 'node:assert/strict';
import { yanitDenetle, istanbulGunu } from './dogrula.mjs';

const J = 'application/json';
test('geçerli yanıt', () => {
  assert.deepEqual(yanitDenetle('{"slug":"bir-haber-1","yanit":"evet"}', J), { ok: true, slug: 'bir-haber-1', yanit: 'evet' });
  assert.equal(yanitDenetle('{"slug":"a","yanit":"hayir"}', 'application/json; charset=utf-8').ok, true);
});
test('geçersiz gövde reddedilir', () => {
  for (const t of ['', 'x', '[]', 'null', '{"slug":"A","yanit":"evet"}', '{"slug":"a b","yanit":"evet"}', '{"slug":"","yanit":"evet"}', '{"slug":"a","yanit":"belki"}', '{"slug":1,"yanit":"evet"}', `{"slug":"${'a'.repeat(161)}","yanit":"evet"}`]) {
    assert.equal(yanitDenetle(t, J).ok, false, t);
  }
});
test('yanlış içerik türü ve büyük gövde reddedilir', () => {
  assert.equal(yanitDenetle('{"slug":"a","yanit":"evet"}', 'text/plain').ok, false);
  assert.equal(yanitDenetle('{"slug":"a","yanit":"evet"}', undefined).ok, false);
  assert.equal(yanitDenetle(`{"slug":"a","yanit":"evet","x":"${'y'.repeat(1100)}"}`, J).ok, false);
});
test('istanbulGunu İstanbul saatini kullanır', () => {
  assert.equal(istanbulGunu(new Date('2026-11-01T21:30:00Z')), '2026-11-02');
  assert.equal(istanbulGunu(new Date('2026-07-01T12:00:00Z')), '2026-07-01');
});
