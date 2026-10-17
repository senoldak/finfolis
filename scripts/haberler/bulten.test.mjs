import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bultenGerekli, bultenYaz, BULTEN_AZAMI } from './bulten.mjs';

const piyasa = { gostergeler: [{ id: 'dolar', ad: 'Dolar / TL', deger: 41.2, degisim: 0.5, ondalik: 2, kaynak: { ad: 'AMB', url: 'https://x.test/' } }] };
const simdi = new Date('2026-10-11T11:00:00Z'); // İstanbul 14:00

const olay = (id, bolge, kaynakMetni = 'Fed held rates at 4.25 percent.', ek = {}) => ({
  id, baslik: `Olay ${id}`, bolge, onem: 100, kategori: 'piyasalar', tarih: '2026-10-11T10:00:00Z',
  adaylar: [], kaynakMetni, kaynaklar: [{ ad: 'Kaynak', url: `https://k.test/${id}` }], ucretliTek: false, icerikli: true, ...ek,
});

// maddeler: id -> metin. Kontrol masası varsayılan olarak onaylar.
const sahteGemini = (metinler, { onay = true } = {}) => async ({ sema, istem }) => {
  if (sema.properties.onay) {
    const o = typeof onay === 'function' ? onay(istem) : onay;
    return { onay: o, sorunlar: o ? [] : ['sorun'] };
  }
  if (sema.properties.maddeler) return { maddeler: Object.entries(metinler).map(([k, metin], i) => ({ olay: String(i + 1), etiket: `Olay ${k}`, metin })) };
  return null;
};
const iyi = { a: 'Fed faizi yüzde 4,25 düzeyinde tuttu.', b: 'Fed faizi yüzde 4,25 düzeyinde tuttu.', c: 'Fed faizi yüzde 4,25 düzeyinde tuttu.' };

test('bultenGerekli: 3 ve üstü', () => {
  assert.equal(bultenGerekli(2), false);
  assert.equal(bultenGerekli(3), true);
});

test('başlık biçimi', async () => {
  const r = await bultenYaz([olay('a', 'abd'), olay('b', 'abd'), olay('c', 'abd')], piyasa, { gemini: sahteGemini(iyi), simdi });
  assert.equal(r.yazi.baslik, 'Piyasa bülteni · 11 Ekim 2026, öğle');
  assert.equal(r.yazi.tur, 'bulten');
  assert.equal(r.yazi.kategori, 'piyasalar');
  assert.deepEqual(r.anlik.degerler, { dolar: 41.2 });
});

test('bölge başlıkları sırayla, boş bölge yok', async () => {
  const olaylar = [olay('a', 'asya'), olay('b', 'abd'), olay('c', 'abd')];
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini(iyi), simdi });
  const g = r.yazi.govde;
  assert.ok(g.indexOf('## ABD') >= 0 && g.indexOf('## ABD') < g.indexOf('## Asya'));
  assert.doesNotMatch(g, /## Avrupa/);
});

test('olay başına tek madde; dış kaynak adı/linki yok, haberSlug varsa site linki', async () => {
  const olaylar = [olay('a', 'abd', undefined, { haberSlug: 'fed-faiz' }), olay('b', 'avrupa'), olay('c', 'kuresel')];
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini(iyi), simdi });
  const g = r.yazi.govde;
  assert.equal((g.match(/^- \*\*Olay/gm) ?? []).length, 3);
  assert.match(g, /https:\/\/finfolis\.com\/haber\/fed-faiz\//);
  assert.doesNotMatch(g, /k\.test/);
});

test('doğrulanamayan madde düşer, kalanlar yayınlanır', async () => {
  const olaylar = [olay('a', 'abd'), olay('b', 'abd'), olay('c', 'abd'), olay('d', 'abd')];
  const metinler = { ...iyi, d: 'Enflasyon yüzde 7,9 oldu.' };
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini(metinler), simdi });
  assert.doesNotMatch(r.yazi.govde, /7,9/);
  assert.doesNotMatch(r.yazi.govde, /Olay d/);
  assert.match(r.yazi.govde, /Olay c/);
});

test('3’ten az geçerli madde kalırsa null', async () => {
  const olaylar = [olay('a', 'abd'), olay('b', 'abd'), olay('c', 'abd')];
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini({ ...iyi, c: 'Enflasyon yüzde 7,9 oldu.' }), simdi });
  assert.equal(r, null);
});

test('kontrol masası reddederse bülten yayınlanmaz', async () => {
  const olaylar = [olay('a', 'abd'), olay('b', 'abd'), olay('c', 'abd')];
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini(iyi, { onay: false }), simdi });
  assert.equal(r, null);
});

test('göstergeler sonda kısa bölüm', async () => {
  const r = await bultenYaz([olay('a', 'abd'), olay('b', 'asya'), olay('c', 'kuresel')], piyasa, { gemini: sahteGemini(iyi), simdi });
  const basliklar = r.yazi.govde.match(/^## .+$/gm);
  assert.equal(basliklar.at(-1), '## Göstergeler');
  assert.match(r.yazi.govde, /Dolar \/ TL:\*\* 41,20 \(günlük değişim: %\+0,5\)/);
});

test('Gemini sıra anahtarı döndürür; maddeler doğru olaya gider', async () => {
  const olaylar = ['a', 'b', 'c'].map((i) => olay(`https://uzun.test/${i}?x=1`, 'abd', undefined, { baslik: `Olay ${i}` }));
  const gemini = async ({ sema, istem }) => {
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    assert.doesNotMatch(istem, /uzun\.test/);
    return { maddeler: [{ olay: '3', etiket: 'Olay c', metin: 'Üçüncü: yüzde 4,25.' }, { olay: '1', etiket: 'Olay a', metin: 'Birinci: yüzde 4,25.' }, { olay: '2', etiket: 'Olay b', metin: 'İkinci: yüzde 4,25.' }, { olay: '9', etiket: 'Yok', metin: 'Yok.' }] };
  };
  const r = await bultenYaz(olaylar, piyasa, { gemini, simdi });
  assert.match(r.yazi.govde, /Olay a:\*\* Birinci/);
  assert.match(r.yazi.govde, /Olay c:\*\* Üçüncü/);
  assert.doesNotMatch(r.yazi.govde, /Yok\./);
});

test('toplu kontrol reddeder, tek tek kontrolde 1 madde düşer: 3 madde yayınlanır', async () => {
  const olaylar = ['a', 'b', 'c', 'd'].map((i) => olay(i, 'abd'));
  const metinler = { a: 'Madde A yüzde 4,25.', b: 'Madde B yüzde 4,25.', c: 'Madde C yüzde 4,25.', d: 'Madde D yüzde 4,25.' };
  const onay = (istem) => !(istem.includes('Madde A') && istem.includes('Madde B')) && !istem.includes('Madde C');
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini(metinler, { onay }), simdi });
  assert.equal((r.yazi.govde.match(/^- \*\*Olay/gm) ?? []).length, 3);
  assert.doesNotMatch(r.yazi.govde, /Olay c/);
});

test('maddeler Türkçe etiketle yazılır, İngilizce kaynak başlığı kullanılmaz; kapak etiketleri alır', async () => {
  const olaylar = ['a', 'b', 'c'].map((i) => olay(i, 'abd', undefined, { baslik: `Fed holds rates steady ${i}` }));
  let kapakBasliklari;
  const kapakYap = ({ basliklar }) => ((kapakBasliklari = basliklar), 'kapak');
  const r = await bultenYaz(olaylar, piyasa, { gemini: sahteGemini(iyi), simdi, kapakYap });
  assert.doesNotMatch(r.yazi.govde, /Fed holds/);
  assert.match(r.yazi.govde, /^- \*\*Olay a:\*\* Fed faizi/m);
  assert.deepEqual(kapakBasliklari, ['Olay a', 'Olay b', 'Olay c']);
});

test('etiketi olmayan ya da etiketi doğrulanamayan madde düşer', async () => {
  const olaylar = ['a', 'b', 'c', 'd', 'e'].map((i) => olay(i, 'abd'));
  const gemini = async ({ sema }) => {
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    const m = (n, etiket) => ({ olay: String(n), etiket, metin: 'Fed faizi yüzde 4,25 düzeyinde tuttu.' });
    return { maddeler: [m(1, 'Fed kararı'), m(2, 'Fed kararı'), m(3, 'Fed kararı'), m(4, ''), m(5, 'Yüzde 9 artış')] };
  };
  const r = await bultenYaz(olaylar, piyasa, { gemini, simdi });
  assert.equal((r.yazi.govde.match(/^- \*\*Fed kararı/gm) ?? []).length, 3);
  assert.doesNotMatch(r.yazi.govde, /Yüzde 9/);
});

test(`en fazla ${BULTEN_AZAMI} madde: önem, sonra tarih sırasıyla`, async () => {
  assert.equal(BULTEN_AZAMI, 12);
  const olaylar = Array.from({ length: 15 }, (_, i) =>
    olay(`o${i}`, 'abd', undefined, { onem: i < 3 ? 20 : 60, tarih: `2026-10-11T${String(i % 10).padStart(2, '0')}:00:00Z` }));
  let gonderilen;
  const gemini = async ({ sema, istem }) => {
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    gonderilen = (istem.match(/^\[\d+\]/gm) ?? []).length;
    return { maddeler: Array.from({ length: gonderilen }, (_, i) => ({ olay: String(i + 1), etiket: `Etiket ${String.fromCharCode(65 + i)}`, metin: 'Fed faizi yüzde 4,25 düzeyinde tuttu.' })) };
  };
  const r = await bultenYaz(olaylar, piyasa, { gemini, simdi });
  assert.equal(gonderilen, 12);
  assert.equal(r.olaylar.length, 12);
  assert.ok(!r.olaylar.some((o) => ['o0', 'o1', 'o2'].includes(o.id)));
});

test('aynı önemde yeni tarihli olay öne geçer', async () => {
  const olaylar = Array.from({ length: 13 }, (_, i) => olay(`o${i}`, 'abd', undefined, { tarih: new Date(Date.UTC(2026, 9, 11, i)).toISOString() }));
  const gemini = async ({ sema, istem }) => {
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    const n = (istem.match(/^\[\d+\]/gm) ?? []).length;
    return { maddeler: Array.from({ length: n }, (_, i) => ({ olay: String(i + 1), etiket: `Etiket ${String.fromCharCode(65 + i)}`, metin: 'Fed faizi yüzde 4,25 düzeyinde tuttu.' })) };
  };
  const r = await bultenYaz(olaylar, piyasa, { gemini, simdi });
  assert.ok(!r.olaylar.some((o) => o.id === 'o0'));
});

test('bütçe bittiyse tek tek kontrol yapılmaz, bülten null', async () => {
  const olaylar = ['a', 'b', 'c'].map((i) => olay(i, 'abd'));
  let kontrol = 0;
  const g = sahteGemini(iyi, { onay: () => (kontrol++, false) });
  const r = await bultenYaz(olaylar, piyasa, { gemini: g, simdi, butceBitti: () => true });
  assert.equal(r, null);
  assert.equal(kontrol, 1);
});

test('bultenDilimi: İstanbul saatine göre açılış, öğle, kapanış; gece önceki günün kapanışı', async () => {
  const { bultenDilimi } = await import('./bulten.mjs');
  assert.equal(bultenDilimi(new Date('2026-10-14T06:40:00Z')).anahtar, '2026-10-14:acilis'); // 09:40
  assert.equal(bultenDilimi(new Date('2026-10-14T10:40:00Z')).anahtar, '2026-10-14:ogle'); // 13:40
  assert.equal(bultenDilimi(new Date('2026-10-14T16:40:00Z')).anahtar, '2026-10-14:kapanis'); // 19:40
  const gece = bultenDilimi(new Date('2026-10-14T22:40:00Z')); // 15 Ekim 01:40
  assert.equal(gece.anahtar, '2026-10-14:kapanis');
  assert.equal(`${gece.gun} ${gece.ay} ${gece.yil}, ${gece.ad}`, '14 Ekim 2026, kapanış');
});

test('dilimDolu / dilimKaydet: aynı dilimde ikinci bülten yok, hafıza sınırlı', async () => {
  const { dilimDolu, dilimKaydet, DILIM_HAFIZA } = await import('./bulten.mjs');
  const durum = {};
  const t = new Date('2026-10-14T06:40:00Z');
  assert.equal(dilimDolu(durum, t), false);
  dilimKaydet(durum, t);
  assert.equal(dilimDolu(durum, new Date('2026-10-14T08:40:00Z')), true); // 11:40, yine açılış
  assert.equal(dilimDolu(durum, new Date('2026-10-14T10:40:00Z')), false); // öğle
  for (let i = 0; i < 20; i++) dilimKaydet(durum, new Date(t.getTime() + i * 6 * 3600e3));
  assert.equal(durum.bultenDilimleri.length, DILIM_HAFIZA);
});
