import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bultenMetniUret } from './sektor-bulteni-uret.mjs';

test('bultenMetniUret: geçerli bülten başlığı, slug ve markdown gövdesi üretir', () => {
  const sahteVeri = {
    sektorler: [
      { kod: 'XPTIC', ad: 'BIST Perakende', aylik: 3.4, aciklama: 'Perakende' },
      { kod: 'XFINK', ad: 'BIST Faktoring', aylik: -40.6, aciklama: 'Faktoring' },
      { kod: 'XU100', ad: 'BIST 100', aylik: -10.0 },
      { kod: 'XBANK', ad: 'BIST Banka', aylik: 0.0 },
      { kod: 'XUSIN', ad: 'BIST Sınai', aylik: -13.7 },
    ],
  };

  const sonuc = bultenMetniUret(sahteVeri, new Date('2026-10-23T12:00:00Z'));
  assert.ok(sonuc.slug.includes('ekim-2026'));
  assert.ok(sonuc.baslik.includes('Ekim 2026'));
  assert.ok(sonuc.govde.includes('XPTIC'));
  assert.ok(sonuc.govde.includes('XFINK'));
  assert.ok(sonuc.govde.includes('category: "borsa"'));
});
