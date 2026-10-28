import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tonMetni, istemKur, TUTANAK_SINIR } from './fomc-ton.mjs';
import { yanitDogrula, donguler } from './ppk-ton.mjs';

test('tutanak: yalnız politika bölümleri, sınırda kesilir', () => {
  const belge = {
    tur: 'tutanak',
    paragraflar: ['Staff review text.', 'Participants agreed inflation remained elevated.', 'The Committee decided to lower the range.'],
    bolumler: ['Staff Review of the Economic Situation', "Participants' Views on Current Conditions", 'Committee Policy Actions'],
  };
  assert.deepEqual(tonMetni(belge), belge.paragraflar.slice(1));
  const uzun = { tur: 'tutanak', paragraflar: Array.from({ length: 50 }, () => 'x'.repeat(1000)), bolumler: null };
  assert.ok(tonMetni(uzun).join('').length <= TUTANAK_SINIR);
  const aciklama = { tur: 'karar', paragraflar: ['a', 'b'] };
  assert.deepEqual(tonMetni(aciklama), ['a', 'b']);
});

test('İngilizce alıntı birebir doğrulanır', () => {
  const b = { tur: 'karar', paragraflar: ['The Committee decided to lower the target range for the federal funds rate by 1/4 percentage point to 3-3/4 to 4 percent.'] };
  assert.match(istemKur({ ...b, tarih: '2026-09-17', baslik: 'x' }), /federal funds rate/);
  const ok = yanitDogrula({ ileri_yon: -1, durus: 1, gerekce: 'İndirim.', alintilar: ['decided to lower the target range for the federal funds rate'] }, b);
  assert.equal(ok.ileriYon, -1);
  assert.equal(yanitDogrula({ ileri_yon: -1, durus: 1, gerekce: 'x', alintilar: ['faiz indirildi ve böyle sürecek'] }, b), null);
});

test('döngü: tutanak ikinci metin', () => {
  const d = donguler(
    [
      { id: 'k1', tur: 'karar', tarih: '2026-07-29' },
      { id: 't1', tur: 'tutanak', tarih: '2026-08-19' },
    ],
    { k1: { ileriYon: 0, durus: 1 }, t1: { ileriYon: -1, durus: 1 } },
    { ikinci: 'tutanak' },
  );
  assert.equal(d[0].ozetId, 't1');
  assert.equal(d[0].ileriYon, -0.5);
});
