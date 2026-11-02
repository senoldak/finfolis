import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const sahte = () => {
  const kayit = [];
  const sorulan = [];
  return {
    kayit,
    sorulan,
    env: {
      ASSETS: {
        fetch: async (r) => {
          const yol = new URL(r.url).pathname;
          sorulan.push(yol);
          return new Response('sayfa', { status: yol === '/haber/var/' || !yol.startsWith('/haber/') ? 200 : 404 });
        },
      },
      DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => kayit.push({ sql, a }) }) }) },
    },
  };
};
const post = (govde) => new Request('https://ornek.example/api/yararli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: govde });

test('Worker: yalnız yayımlanmış sayfası olan yazı sayılır', async () => {
  const { env, kayit, sorulan } = sahte();
  assert.equal((await worker.fetch(post('{"slug":"uydurma","yanit":"evet"}'), env)).status, 404);
  assert.equal(kayit.filter((k) => /INSERT/.test(k.sql)).length, 0);
  assert.equal((await worker.fetch(post('{"slug":"var","yanit":"evet"}'), env)).status, 204);
  assert.equal(kayit.filter((k) => /INSERT/.test(k.sql)).length, 1);
  assert.deepEqual(sorulan, ['/haber/uydurma/', '/haber/var/']);
});
