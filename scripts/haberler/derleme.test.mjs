// Tema derlemesi: kısa olayların kategoriye göre gruplanması, derleme isteminin biçimi ve hattaki akış.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { calistir } from './hent-haberler.mjs';
import { kisaGruplari, derlemeAdayi, DERLEME_AZAMI } from './derleme.mjs';
import { derlemeIstemi } from './yazar.mjs';
import { havuzAc, havuzKapat, HAVUZ_SAAT, SON_SAAT } from './havuz.mjs';

const simdi = new Date('2026-10-12T07:00:00Z');
const olay = (id, kategori, onem = 4) => ({
  id,
  baslik: `Başlık ${id}`,
  kategori,
  onem,
  tarih: '2026-10-12T06:00:00Z',
  adaylar: [{ id, baslik: `Başlık ${id}`, kaynakMetni: `Kaynak ${id} `.repeat(20), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }] }],
  kaynaklar: [{ ad: 'K', url: `https://k/${id}` }],
});

test('kisaGruplari: kategoriye göre gruplar, tek kalanı dışarıda bırakır', () => {
  const g = kisaGruplari([olay('a', 'piyasalar'), olay('b', 'piyasalar'), olay('c', 'ekonomi'), olay('d', 'piyasalar')]);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].map((o) => o.id), ['a', 'b', 'd']); // önem eşit; sıra korunur
});

test('kisaGruplari: bir grup en fazla DERLEME_AZAMI olay içerir', () => {
  const liste = Array.from({ length: DERLEME_AZAMI + 2 }, (_, i) => olay(`x${i}`, 'piyasalar', 3 + (i % 2)));
  const g = kisaGruplari(liste);
  assert.ok(g.every((grup) => grup.length <= DERLEME_AZAMI));
  // Kalan 2 olay ayrı bir grup olur; tek olay kalsaydı gruba girmezdi.
  assert.deepEqual(g.map((grup) => grup.length), [DERLEME_AZAMI, 2]);
});

test('derlemeAdayi: haberleri, birleşik kaynak metnini ve kaynakları taşır', () => {
  const g = kisaGruplari([olay('a', 'piyasalar'), olay('b', 'piyasalar')])[0];
  const aday = derlemeAdayi(g);
  assert.equal(aday.haberler.length, 2);
  assert.match(aday.kaynakMetni, /Kaynak a/);
  assert.match(aday.kaynakMetni, /Kaynak b/);
  assert.deepEqual(aday.kaynaklar.map((k) => k.url), ['https://k/a', 'https://k/b']);
  assert.equal(aday.kategori, 'piyasalar');
});

test('derlemeIstemi: her haber ayrı bölümde ve tablo/grafik yasak', () => {
  const g = kisaGruplari([olay('a', 'piyasalar'), olay('b', 'piyasalar')])[0];
  const istem = derlemeIstemi(derlemeAdayi(g));
  assert.match(istem, /### 1\. Başlık a/);
  assert.match(istem, /### 2\. Başlık b/);
  assert.match(istem, /tablo, grafik, sirada: kullanma/);
});

async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'hbd-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  const aday = (id, baslik) => ({ id, baslik, ozet: '', tarih: '2026-10-12T06:00:00Z', onem: 4, kategori: 'piyasalar', kaynakMetni: `Uzun tam metin ${id} `.repeat(5), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }] });
  return {
    rot,
    simdi,
    geminiVar: true,
    gemini: async () => ({ gruplar: [] }),
    log: () => {},
    ipucu: { hent: async () => [], onemArtir: (a) => a },
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'g' }),
    // Tek haberler kısa kalır; derleme (haberler alanı olan aday) kurulu geçer.
    yayinKurulu: async (t, a) => (a.haberler ? { yazi: t } : { dur: 'Metin kısa', kisa: true }),
    derlemeYaz: async () => ({ baslik: 'Piyasalar derlemesi', spot: 's', govde: 'g', rakamlar: [] }),
    bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
    piyasa: async () => ({ guncelleme: simdi.toISOString(), gostergeler: [] }),
    durum: { gorulen: {}, sonBulten: null, kaynaklar: { A: 'x' } },
    kaynaklar: [
      { ad: 'A', hent: async () => [aday('a1', 'Copper prices climb'), aday('a2', 'Gold slips'), aday('a3', 'Silver rises')] },
    ],
    aday,
    ...extra,
  };
}

test('kısa haberler tek derleme yazısına dönüşür ve bültene girmez', async () => {
  let bultendekiler = null;
  const s = await ortam({
    bulten: { bultenGerekli: (n) => n >= 1, bultenYaz: async (ol) => ((bultendekiler = ol.map((o) => o.id)), null) },
  });
  const r = await calistir(s);
  assert.equal(r.adet, 1);
  assert.equal(r.yazilar.length, 1);
  const dosyalar = await readdir(path.join(s.rot, 'src/content/haberler'));
  assert.equal(dosyalar.length, 1);
  assert.equal(bultendekiler, null); // üç kısa haber de derlemeye girdi, bültende kalan yok
  for (const id of ['a1', 'a2', 'a3']) assert.equal(s.durum.gorulen[id].yazildi, true);
});

test('derleme yayın kurulundan geçemezse kısa haberler bülten satırı olarak kalır', async () => {
  let bultendekiler = [];
  const s = await ortam({
    yayinKurulu: async () => ({ dur: 'Metin kısa', kisa: true }),
    bulten: { bultenGerekli: () => true, bultenYaz: async (ol) => ((bultendekiler = ol.map((o) => o.id)), null) },
  });
  const r = await calistir(s);
  assert.equal(r.adet, 0);
  assert.deepEqual(bultendekiler.sort(), ['a1', 'a2', 'a3']);
});

// Kısa haber havuzu (havuz.mjs): tek kalan kısa haber çalıştırmalar arasında eş bekler.
const saatSonra = (h) => new Date(simdi.getTime() + h * 3600e3);
const tekKaynak = (s, ...liste) => [{ ad: 'A', hent: async () => liste.map(([id, baslik]) => s.aday(id, baslik)) }];
const bultenYazan = (kayit) => ({
  bultenGerekli: (n) => n >= 1,
  bultenYaz: async (ol, _p, { simdi: t }) => {
    kayit.push(...ol.map((o) => o.id));
    return { yazi: { baslik: `Bülten ${t.toISOString()}`, spot: 's', govde: 'g', kategori: 'piyasalar', tarih: t, tur: 'bulten', kaynaklar: [] }, anlik: { zaman: 'z', degerler: {} } };
  },
});

test('havuz: tek kısa haber bekler, sonraki çalıştırmada gelen eşiyle derleme olur', async () => {
  const bultendekiler = [];
  const s = await ortam({ bulten: bultenYazan(bultendekiler) });
  s.kaynaklar = tekKaynak(s, ['a1', 'Copper prices climb']);
  assert.equal((await calistir(s)).adet, 0);
  assert.deepEqual(bultendekiler, []);
  assert.deepEqual(s.durum.havuz.map((o) => o.id), ['a1']);

  const r = await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s, ['a2', 'Gold slips']) });
  assert.equal(r.adet, 1);
  assert.deepEqual(s.durum.havuz, []);
  assert.deepEqual(bultendekiler, []);
  for (const id of ['a1', 'a2']) assert.equal(s.durum.gorulen[id].yazildi, true);
});

test('havuz: durum dosyasında kaynak metni ve adresi şifreli durur', async () => {
  const s = await ortam();
  s.kaynaklar = tekKaynak(s, ['a1', 'Copper prices climb']);
  await calistir(s);
  const kapali = havuzKapat(s.durum.havuz);
  const metin = JSON.stringify(kapali);
  assert.doesNotMatch(metin, /Uzun tam metin|https:\/\/k\/|Copper/);
  assert.deepEqual(Object.keys(kapali[0]).sort(), ['havuzaGirdi', 'id', 'kategori', 'sifreli']);
  const acik = havuzAc(kapali);
  assert.equal(acik[0].id, 'a1');
  assert.match(acik[0].adaylar[0].kaynakMetni, /Uzun tam metin a1/);
});

test('havuz: HAVUZ_SAAT içinde eş bulamayan kısa haber bülten satırı olur ve havuzdan çıkar', async () => {
  const bultendekiler = [];
  const s = await ortam({ bulten: bultenYazan(bultendekiler) });
  s.kaynaklar = tekKaynak(s, ['a1', 'Copper prices climb']);
  await calistir(s);
  await calistir({ ...s, simdi: saatSonra(HAVUZ_SAAT - 1), kaynaklar: tekKaynak(s) });
  assert.deepEqual(bultendekiler, []); // süre dolmadan bültene girmez
  const r = await calistir({ ...s, simdi: saatSonra(HAVUZ_SAAT), kaynaklar: tekKaynak(s) });
  assert.equal(r.bultenYazildi, true);
  assert.deepEqual(bultendekiler, ['a1']);
  assert.deepEqual(s.durum.havuz, []);
});

test('havuz: bültene de giremeyen kısa haber SON_SAAT sonra düşer', async () => {
  const s = await ortam();
  s.kaynaklar = tekKaynak(s, ['a1', 'Copper prices climb']);
  await calistir(s);
  await calistir({ ...s, simdi: saatSonra(HAVUZ_SAAT), kaynaklar: tekKaynak(s) });
  assert.deepEqual(s.durum.havuz.map((o) => o.id), ['a1']); // bülten yazılmadı: bekler
  await calistir({ ...s, simdi: saatSonra(SON_SAAT), kaynaklar: tekKaynak(s) });
  assert.deepEqual(s.durum.havuz, []);
});

test('havuz: bekleyen olay bu arada başka kaynaktan tam haber olarak yazıldıysa havuzdan düşer', async () => {
  const baslik = 'IonQ to buy cybersecurity firm Elisity in up to $1.3 billion deal';
  const s = await ortam({ yayinKurulu: async (t, a) => (a.id === 'a1' ? { dur: 'Metin kısa', kisa: true } : { yazi: t }) });
  s.kaynaklar = tekKaynak(s, ['a1', baslik]);
  await calistir(s);
  assert.equal(s.durum.havuz.length, 1);
  const r = await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s, ['b1', baslik]) });
  assert.equal(r.adet, 1);
  assert.deepEqual(s.durum.havuz, []);
});

test('havuz: derlemesi yayımlanamayan grup bir daha denenmez, bülten satırı bekler', async () => {
  let denemeler = 0;
  const s = await ortam({
    yayinKurulu: async () => ({ dur: 'Metin kısa', kisa: true }),
    derlemeYaz: async () => (denemeler++, { baslik: 'D', spot: 's', govde: 'g', rakamlar: [] }),
  });
  await calistir(s); // a1–a3 kısa, derleme denenir ve durur; bülten yazılmaz
  assert.equal(denemeler, 1);
  assert.equal(s.durum.havuz.length, 3);
  await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) });
  assert.equal(denemeler, 1);
  const acik = havuzAc(havuzKapat(s.durum.havuz));
  assert.ok(acik.every((o) => o.derlemeDenendi));
});
