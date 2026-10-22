import test from 'node:test';
import assert from 'node:assert/strict';
import { TUR_TOKEN_TAVANI, TPM_SINIRI, tokenTahmini, olayTokenTahmini, derlemeTokenTahmini, tokenTavaniAsildi } from './token-tavani.mjs';

test('tavan TPM sınırından türetilir ve bir turda dakikalık sınırın katıdır', () => {
  assert.equal(TUR_TOKEN_TAVANI, Math.floor(TPM_SINIRI * 18 * 0.8));
});

test('tokenTahmini: karakter / 4 yukarı yuvarlanır', () => {
  assert.equal(tokenTahmini('a'.repeat(401)), 101);
  assert.equal(tokenTahmini(undefined), 0);
});

test('olayTokenTahmini: kaynak 20 bin karakterde kesilir, 3 çağrıyla çarpılır', () => {
  const kisa = olayTokenTahmini({ kaynakMetni: 'x'.repeat(4000) });
  const dev = olayTokenTahmini({ kaynakMetni: 'x'.repeat(200_000) });
  assert.equal(kisa, 3 * (1000 + 2500));
  assert.equal(dev, 3 * (5000 + 2500));
  assert.equal(olayTokenTahmini({ adaylar: [{ kaynakMetni: 'x'.repeat(4000) }] }), kisa);
});

test('derlemeTokenTahmini: grubun kaynakları toplanır', () => {
  assert.equal(derlemeTokenTahmini([{ kaynakMetni: 'x'.repeat(4000) }, { kaynakMetni: 'x'.repeat(4000) }]), 3 * (2000 + 2500));
});

test('tokenTavaniAsildi: harcanan + tahmin tavanı aşarsa true', () => {
  assert.equal(tokenTavaniAsildi(10, { harcanan: 90, tavan: 100 }), false);
  assert.equal(tokenTavaniAsildi(11, { harcanan: 90, tavan: 100 }), true);
});
