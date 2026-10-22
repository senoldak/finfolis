// Dilim derlemesi: tek başına yayın eşiğinin altında kalan kısa haberler bir zaman dilimi (açılış/öğle/kapanış,
// İstanbul) boyunca havuzda birikir; dilim bitince kategori aranmadan tek derleme yazısı olur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { calistir } from './hent-haberler.mjs';
import { dilimGruplari, derlemeAdayi, DERLEME_AZAMI } from './derleme.mjs';
import { derlemeIstemi, derlemeHedefi } from './yazar.mjs';
import { havuzAc, havuzKapat, SON_SAAT } from './havuz.mjs';

const simdi = new Date('2026-10-12T07:00:00Z'); // İstanbul 10:00, açılış dilimi; öğle 09:00Z'de başlar
const GIRIS = '2026-10-12T06:30:00Z'; // açılış dilimi
const olay = (id, kategori, onem = 80, havuzaGirdi = GIRIS) => ({
  id,
  baslik: `Başlık ${id}`,
  kategori,
  onem,
  havuzaGirdi,
  tarih: '2026-10-12T06:00:00Z',
  adaylar: [{ id, baslik: `Başlık ${id}`, kaynakMetni: `Kaynak ${id} `.repeat(20), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }] }],
  kaynaklar: [{ ad: 'K', url: `https://k/${id}` }],
});

test('dilimGruplari: kategori aramadan aynı dilimin kısa haberlerini tek grup yapar, tek kalanı artana bırakır', () => {
  const { gruplar, artan } = dilimGruplari([
    olay('a', 'piyasalar'),
    olay('b', 'ekonomi'),
    olay('c', 'borsa'),
    olay('d', 'kripto', 4, '2026-10-12T10:00:00Z'), // öğle dilimi: tek
  ]);
  assert.deepEqual(gruplar.map((g) => g.map((o) => o.id)), [['a', 'b', 'c']]);
  assert.deepEqual(artan.map((o) => o.id), ['d']);
});

test('dilimGruplari: grupta en fazla DERLEME_AZAMI haber; fazlası önem sırasıyla artana kalır', () => {
  const liste = Array.from({ length: DERLEME_AZAMI + 2 }, (_, i) => olay(`x${i}`, 'piyasalar', i));
  const { gruplar, artan } = dilimGruplari(liste);
  assert.equal(gruplar[0].length, DERLEME_AZAMI);
  assert.deepEqual(artan.map((o) => o.id).sort(), ['x0', 'x1']); // en düşük önemli ikisi
});

test('derlemeAdayi: kaynakları, en sık kategoriyi ve dilim ekini taşır', () => {
  const aday = derlemeAdayi([olay('a', 'ekonomi'), olay('b', 'piyasalar'), olay('c', 'piyasalar')]);
  assert.equal(aday.haberler.length, 3);
  assert.match(aday.kaynakMetni, /Kaynak a/);
  assert.deepEqual(aday.kaynaklar.map((k) => k.url), ['https://k/a', 'https://k/b', 'https://k/c']);
  assert.equal(aday.kategori, 'piyasalar');
  assert.equal(aday.dilimEki, '12 Ekim, açılış');
});

test('derlemeIstemi: haberler kategori ara başlıkları altında; tablo/grafik yasak', () => {
  const istem = derlemeIstemi(derlemeAdayi([olay('a', 'piyasalar'), olay('b', 'ekonomi'), olay('c', 'piyasalar')]));
  assert.match(istem, /## Piyasalar\n### Başlık a[\s\S]*### Başlık c[\s\S]*## Ekonomi\n### Başlık b/);
  assert.match(istem, /ara başlık/);
  assert.match(istem, /tablo, grafik, sirada: kullanma/);
});

test('derlemeIstemi: gövde hedefi haber sayısıyla büyür, paragraf başına 50-80 kelime', () => {
  assert.deepEqual(derlemeHedefi(2), { alt: 250, ust: 400 });
  assert.deepEqual(derlemeHedefi(8), { alt: 400, ust: 640 });
  const istem = derlemeIstemi(derlemeAdayi('abcdefgh'.split('').map((id) => olay(id, 'piyasalar'))));
  assert.match(istem, /govde: Markdown, 400-640 kelime/);
  assert.match(istem, /Her paragraf 50-80 kelime/);
});

async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'hbd-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  const aday = (id, baslik, kategori = 'piyasalar') => ({ id, baslik, ozet: '', tarih: '2026-10-12T06:00:00Z', onem: 80, kategori, kaynakMetni: `Uzun tam metin ${id} `.repeat(5), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }] });
  return {
    rot,
    simdi,
    geminiVar: true,
    okuyucu: null, // haber kapağına grafik için ağa çıkılmaz
    karneler: async () => [], // test tarihi karne pencerelerine denk gelebilir; karneler ayrıca test edilir
    gemini: async () => ({ gruplar: [] }),
    log: () => {},
    ipucu: { hent: async () => [], onemArtir: (a) => a },
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'g' }),
    // Tek haberler kısa kalır; derleme (haberler alanı olan aday) kurulu geçer.
    yayinKurulu: async (t, a) => (a.haberler ? { yazi: t } : { dur: 'Metin kısa', kisa: true }),
    derlemeYaz: async () => ({ baslik: 'Faiz ve emtia gündemi', spot: 's', govde: 'g', rakamlar: [] }),
    bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
    piyasa: async () => ({ guncelleme: simdi.toISOString(), gostergeler: [] }),
    durum: { gorulen: {}, sonBulten: null, kaynaklar: { A: 'x' } },
    kaynaklar: [
      { ad: 'A', hent: async () => [aday('a1', 'Copper prices climb'), aday('a2', 'Gold slips', 'doviz'), aday('a3', 'Lira weakens', 'ekonomi')] },
    ],
    aday,
    ...extra,
  };
}

const saatSonra = (h) => new Date(simdi.getTime() + h * 3600e3);
const tekKaynak = (s, ...liste) => [{ ad: 'A', hent: async () => liste.map(([id, baslik]) => s.aday(id, baslik)) }];
const bultenYazan = (kayit) => ({
  bultenGerekli: (n) => n >= 1,
  bultenYaz: async (ol, _p, { simdi: t }) => {
    kayit.push(...ol.map((o) => o.id));
    return { yazi: { baslik: `Bülten ${t.toISOString()}`, spot: 's', govde: 'g', kategori: 'piyasalar', tarih: t, tur: 'bulten', kaynaklar: [] }, anlik: { zaman: 'z', degerler: {} } };
  },
});

test('kısa haberler dilim boyunca havuzda bekler; dilim bitince tek derleme olur ve bültene girmez', async () => {
  const bultendekiler = [];
  const s = await ortam({ bulten: bultenYazan(bultendekiler) });
  assert.equal((await calistir(s)).adet, 0); // tek başına yayımlanmaz
  assert.deepEqual(await readdir(path.join(s.rot, 'src/content/haberler')), []);
  assert.equal(s.durum.havuz.length, 3);
  assert.equal((await calistir({ ...s, simdi: saatSonra(1), kaynaklar: tekKaynak(s) })).adet, 0); // dilim sürüyor

  const r = await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) }); // öğle dilimi
  assert.equal(r.adet, 1);
  const dosyalar = await readdir(path.join(s.rot, 'src/content/haberler'));
  assert.equal(dosyalar.length, 1);
  const md = await readFile(path.join(s.rot, 'src/content/haberler', dosyalar[0], 'index.md'), 'utf8');
  assert.match(md, /title: "Faiz ve emtia gündemi · 12 Ekim, açılış"/);
  assert.deepEqual(s.durum.havuz, []);
  assert.deepEqual(bultendekiler, []);
  for (const id of ['a1', 'a2', 'a3']) assert.equal(s.durum.gorulen[id].yazildi, true);
});

test('dilimde tek kalan kısa haber dilim bitince bülten satırı olur ve havuzdan çıkar', async () => {
  const bultendekiler = [];
  const s = await ortam({ bulten: bultenYazan(bultendekiler) });
  s.kaynaklar = tekKaynak(s, ['a1', 'Copper prices climb']);
  await calistir(s);
  await calistir({ ...s, simdi: saatSonra(1), kaynaklar: tekKaynak(s) });
  assert.deepEqual(bultendekiler, []); // dilim bitmeden bültene girmez
  const r = await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) });
  assert.equal(r.adet, 0);
  assert.equal(r.bultenYazildi, true);
  assert.deepEqual(bultendekiler, ['a1']);
  assert.deepEqual(s.durum.havuz, []);
});

test('derleme yayın kurulundan geçemezse haberler bülten satırı bekler, derleme bir daha denenmez', async () => {
  let denemeler = 0;
  const s = await ortam({
    yayinKurulu: async () => ({ dur: 'Metin kısa', kisa: true }),
    derlemeYaz: async () => (denemeler++, { baslik: 'D', spot: 's', govde: 'g', rakamlar: [] }),
  });
  await calistir(s);
  await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) }); // derleme denenir, durur; bülten yazılmaz
  assert.equal(denemeler, 1);
  await calistir({ ...s, simdi: saatSonra(4), kaynaklar: tekKaynak(s) });
  assert.equal(denemeler, 1);
  const acik = havuzAc(havuzKapat(s.durum.havuz));
  assert.equal(acik.length, 3);
  assert.ok(acik.every((o) => o.derlemeDenendi));
});

test('derlemede geçici Gemini hatası: kısa haberler havuzda kalır, sonraki turda yeniden denenir', async () => {
  let n = 0;
  const s = await ortam({
    derlemeYaz: async () => {
      if (n++ === 0) throw new Error('Gemini: çok fazla deneme');
      return { baslik: 'Faiz ve emtia gündemi', spot: 's', govde: 'g', rakamlar: [] };
    },
  });
  await calistir(s);
  assert.equal((await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) })).adet, 0);
  const acik = havuzAc(havuzKapat(s.durum.havuz));
  assert.equal(acik.length, 3);
  assert.ok(acik.every((o) => !o.derlemeDenendi));
  assert.equal((await calistir({ ...s, simdi: saatSonra(4), kaynaklar: tekKaynak(s) })).adet, 1);
  assert.deepEqual(s.durum.havuz, []);
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

test('havuz: bültene de giremeyen kısa haber SON_SAAT sonra düşer', async () => {
  const s = await ortam();
  s.kaynaklar = tekKaynak(s, ['a1', 'Copper prices climb']);
  await calistir(s);
  await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) });
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
  const r = await calistir({ ...s, simdi: saatSonra(1), kaynaklar: tekKaynak(s, ['b1', baslik]) });
  assert.equal(r.adet, 1);
  assert.deepEqual(s.durum.havuz, []);
});

// Katman 3 öncelik sırası: önem 70+ haberler > dilim derlemeleri > önem 60-69 haberler.
test('öncelik: derleme, önem 60-69 haberlerden önce yazılır; 70+ haber derlemeden önce', async () => {
  const sira = [];
  const s = await ortam({
    yaz: async (a) => (sira.push(`haber:${a.id}`), { baslik: a.baslik, spot: 's', govde: 'g' }),
    derlemeYaz: async () => (sira.push('derleme'), { baslik: 'Gündem', spot: 's', govde: 'g', rakamlar: [] }),
    yayinKurulu: async (t, a) => (a.haberler || !/^a\d/.test(a.id) ? { yazi: t } : { dur: 'Metin kısa', kisa: true }),
  });
  await calistir(s); // a1-a3 kısa kalır, havuza girer
  sira.length = 0;
  const yeni = (id, onem) => ({ ...s.aday(id, `Baslik ${id}`), onem });
  const r = await calistir({ ...s, simdi: saatSonra(2), kaynaklar: [{ ad: 'A', hent: async () => [yeni('d1', 65), yeni('y1', 90), yeni('d2', 62)] }] });
  assert.equal(r.adet, 4);
  assert.deepEqual(sira, ['haber:y1', 'derleme', 'haber:d1', 'haber:d2']);
});

test('öncelik: tur payı derleme sonrası bitince önem 60-69 haber yazılmaz, derleme yazılmış olur', async () => {
  const sira = [];
  let yazilanSayi = 0;
  const s = await ortam({
    yaz: async (a) => (sira.push(`haber:${a.id}`), { baslik: a.baslik, spot: 's', govde: 'g' }),
    derlemeYaz: async () => (sira.push('derleme'), yazilanSayi++, { baslik: 'Gündem', spot: 's', govde: 'g', rakamlar: [] }),
    yayinKurulu: async (t, a) => (a.haberler || !/^a\d/.test(a.id) ? { yazi: t } : { dur: 'Metin kısa', kisa: true }),
  });
  await calistir(s);
  sira.length = 0;
  const yeni = (id, onem) => ({ ...s.aday(id, `Baslik ${id}`), onem });
  // derleme yazıldıktan sonra Gemini payı dolmuş sayılır: harcananToken derleme sayısına bağlı
  const r = await calistir({
    ...s, simdi: saatSonra(2), tokenTavani: 100_000, harcananToken: () => (yazilanSayi ? 99_999 : 0),
    kaynaklar: [{ ad: 'A', hent: async () => [yeni('d1', 65), yeni('y1', 90)] }],
  });
  assert.deepEqual(sira, ['haber:y1', 'derleme']);
  assert.equal(r.adet, 2);
  assert.equal(s.durum.gorulen.d1, undefined); // görülmedi kaldı, sonraki turda yazılır
});

test('dilimGruplari: aynı günün dilimleri gün içi sırayla gelir (öğle kapanıştan önce)', () => {
  // 18 Ekim 2026 İstanbul: 13:00 öğle, 19:00 kapanış (UTC+3)
  const { gruplar } = dilimGruplari([
    olay('k1', 'piyasalar', 80, '2026-10-18T16:00:00Z'),
    olay('k2', 'piyasalar', 80, '2026-10-18T16:30:00Z'),
    olay('o1', 'piyasalar', 80, '2026-10-18T10:00:00Z'),
    olay('o2', 'piyasalar', 80, '2026-10-18T10:30:00Z'),
  ]);
  assert.deepEqual(gruplar.map((g) => g.map((o) => o.id).sort()), [['o1', 'o2'], ['k1', 'k2']]);
});

test('oncekiDilimAnahtari: şu andan önce biten dilim (gece yarısı sonrası dünün kapanışı sürer)', async () => {
  const { oncekiDilimAnahtari } = await import('./bulten.mjs');
  assert.equal(oncekiDilimAnahtari(new Date('2026-10-12T11:40:00Z')), '2026-10-12:acilis'); // İstanbul 14:40
  assert.equal(oncekiDilimAnahtari(new Date('2026-10-12T16:40:00Z')), '2026-10-12:ogle'); // 19:40
  assert.equal(oncekiDilimAnahtari(new Date('2026-10-12T22:40:00Z')), '2026-10-12:ogle'); // 01:40, hâlâ dünün kapanışı
  assert.equal(oncekiDilimAnahtari(new Date('2026-10-12T05:40:00Z')), '2026-10-11:kapanis'); // 08:40
});

test('derleme yalnız dilim biter bitmez yazılır; iki dilim sonra kalan grup bülten satırı olur', async () => {
  const bultendekiler = [];
  const s = await ortam({ bulten: bultenYazan(bultendekiler) });
  await calistir(s); // açılışta havuza girer
  const r = await calistir({ ...s, simdi: saatSonra(9), kaynaklar: tekKaynak(s) }); // İstanbul 19:00, kapanış
  assert.equal(r.adet, 0);
  assert.equal(r.bultenYazildi, true);
  for (const d of await readdir(path.join(s.rot, 'src/content/haberler'))) {
    assert.doesNotMatch(await readFile(path.join(s.rot, 'src/content/haberler', d, 'index.md'), 'utf8'), /Faiz ve emtia/); // derleme yok
  }
  assert.deepEqual(bultendekiler.sort(), ['a1', 'a2', 'a3']);
});

test('bir dilimin tek derlemesi olur: fazlası sonraki turda ikinci derleme olmaz, bülten bekler', async () => {
  let derlemeler = 0;
  const s = await ortam({ derlemeYaz: async () => (derlemeler++, { baslik: 'Faiz ve emtia gündemi', spot: 's', govde: 'g', rakamlar: [] }) });
  s.kaynaklar = tekKaynak(s, ...Array.from({ length: DERLEME_AZAMI + 3 }, (_, i) => [`a${i}`, `Haber ${i} fiyatlar`]));
  await calistir(s);
  assert.equal((await calistir({ ...s, simdi: saatSonra(2), kaynaklar: tekKaynak(s) })).adet, 1);
  assert.equal((await calistir({ ...s, simdi: saatSonra(4), kaynaklar: tekKaynak(s) })).adet, 0); // hâlâ öğle
  assert.equal(derlemeler, 1);
  assert.deepEqual(s.durum.derlemeDilimleri, ['2026-10-12:acilis']);
});
