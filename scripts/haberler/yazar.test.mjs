import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yaz, mojibakeDuzelt } from './yazar.mjs';
import { onemArtir } from './ipucu.mjs';

test('ipucu metni yazarın istemine asla girmez', async () => {
  const ipucuMetni = 'Anadolu Ajansı özel: piyasalarda büyük panik yaşandı';
  const [aday] = onemArtir(
    [{ id: 'x', baslik: 'Fed faiz kararı', onem: 3, kategori: 'Merkez bankaları', kaynakMetni: 'The Fed kept rates at 4.25 percent.', kaynaklar: [{ ad: 'Fed', url: 'https://fed' }] }],
    [{ baslik: 'Fed faiz kararı ' + ipucuMetni, tarih: new Date() }],
  );
  const alinan = [];
  const gemini = async (a) => { alinan.push(a); return { baslik: 'B', spot: 'S', govde: 'G' }; };
  const yazi = await yaz(aday, { gemini });
  assert.deepEqual(yazi, { baslik: 'B', spot: 'S', govde: 'G' });
  const butun = alinan.map((a) => a.sistem + a.istem).join('\n');
  assert.ok(!butun.includes('panik'));
  assert.ok(butun.includes('4.25 percent'));
});

test('anahtar yoksa null', async () => {
  assert.equal(await yaz({ baslik: 'x', kaynakMetni: 'y' }, { gemini: async () => null }), null);
});

test('yazarIstemi "Neden önemli" içermez ve 2-4 cümle ister', async () => {
  const { yazarIstemi, YAZI_SEMASI } = await import('./yazar.mjs');
  const istem = yazarIstemi({ baslik: 'x', kaynakMetni: 'y', kaynaklar: [] });
  assert.ok(!/neden önemli/i.test(istem));
  assert.match(istem, /2-4 cümle/);
  assert.ok(YAZI_SEMASI.properties.rakamlar && YAZI_SEMASI.properties.sirada);
  assert.deepEqual(YAZI_SEMASI.required, ['baslik', 'spot', 'govde']);
});

test('yaz rakamlar ve sirada alanlarını taşır', async () => {
  const gemini = async () => ({ baslik: 'B', spot: 'S', govde: 'G', rakamlar: [{ etiket: 'Faiz', deger: '4,25' }], sirada: { tarih: '12 Kasım 2026', olay: 'Toplantı' } });
  const yazi = await yaz({ baslik: 'x', kaynakMetni: 'y' }, { gemini });
  assert.deepEqual(yazi.rakamlar, [{ etiket: 'Faiz', deger: '4,25' }]);
  assert.equal(yazi.sirada.olay, 'Toplantı');
});

test('yaz why_matters ve key_points alanlarını taşır', async () => {
  const gemini = async () => ({
    baslik: 'B', spot: 'S', govde: 'G',
    why_matters: 'Faiz kararı piyasalar için kritik önemde.',
    key_points: ['Politika faizi %4,25', 'Enflasyon beklentisi düştü'],
  });
  const yazi = await yaz({ baslik: 'x', kaynakMetni: 'y' }, { gemini });
  assert.equal(yazi.why_matters, 'Faiz kararı piyasalar için kritik önemde.');
  assert.deepEqual(yazi.key_points, ['Politika faizi %4,25', 'Enflasyon beklentisi düştü']);
});


test('mojibakeDuzelt: Windows-1252 bozulmasını geri çevirir, sağlam metne dokunmaz', async () => {
  const cp = new Map([...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'].map((c, i) => [0x80 + i, c]));
  const bozuk = (s) => [...Buffer.from(s, 'utf8')].map((b) => cp.get(b) ?? String.fromCharCode(b)).join('');
  for (const w of ['Nasdaq Düşüşü', 'Eylül', 'Türkçe', 'İstanbul', 'ığdır', 'Şişli', 'ağır', 'Ödeme']) {
    assert.equal(mojibakeDuzelt(bozuk(w)), w);
    assert.equal(mojibakeDuzelt(w), w);
  }
  assert.equal(mojibakeDuzelt('yüzde 3,7'), 'yüzde 3,7');
});
