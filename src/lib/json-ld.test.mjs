import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonLdMetni } from './json-ld.mjs';

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

test('jsonLdMetni: başlıktaki script kapanışı <script> öğesini bitiremez', () => {
  const metin = jsonLdMetni({ headline: 'Faiz </script><a href="https://haber.example.com">tıkla</a> <!-- x -->' });
  assert.ok(!metin.includes('<'));
  assert.ok(!metin.includes('>'));
  assert.ok(metin.includes('\\u003c/script\\u003e'));
});

test('jsonLdMetni: çıktı geçerli JSON kalır ve aynı değeri verir', () => {
  const veri = { '@type': 'NewsArticle', headline: 'A & B <tez> "alıntı"', satir: `a${LS}b${PS}c` };
  const metin = jsonLdMetni(veri);
  for (const c of ['&', LS, PS]) assert.ok(!metin.includes(c));
  assert.deepEqual(JSON.parse(metin), veri);
});

test('haberAlanlari: resmî kaynaklar isBasedOn, il contentLocation olur; boş girdi boş nesne', async () => {
  const { haberAlanlari } = await import('./json-ld.mjs');
  assert.deepEqual(haberAlanlari(), {});
  const a = haberAlanlari({ kaynaklar: [{ ad: 'TCMB', url: 'https://www.tcmb.gov.tr/x' }, { ad: '', url: 'https://y' }], yer: { ad: 'İzmir', boylam: 27.4, enlem: 38.5 } });
  assert.deepEqual(a.isBasedOn, [{ '@type': 'CreativeWork', url: 'https://www.tcmb.gov.tr/x', publisher: { '@type': 'Organization', name: 'TCMB' } }]);
  assert.equal(a.contentLocation.name, 'İzmir');
  assert.equal(a.contentLocation.address.addressCountry, 'TR');
  assert.deepEqual(a.contentLocation.geo, { '@type': 'GeoCoordinates', latitude: 38.5, longitude: 27.4 });
  assert.equal(haberAlanlari({ duzeltme: '  ' }).correction, undefined);
  assert.equal(haberAlanlari({ duzeltme: 'Rakam düzeltildi.' }).correction.text, 'Rakam düzeltildi.');
});

test('haberAlanlari: medya kaynakları NewsArticle olarak isBasedOn\'a eklenir', async () => {
  const { haberAlanlari } = await import('./json-ld.mjs');
  const a = haberAlanlari({ medya: [{ ad: 'Örnek Haber', url: 'https://haber.example.com/a' }] });
  assert.deepEqual(a.isBasedOn, [{ '@type': 'NewsArticle', url: 'https://haber.example.com/a', publisher: { '@type': 'NewsMediaOrganization', name: 'Örnek Haber' } }]);
});
