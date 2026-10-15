// hent-haberler.mjs: çalıştırmalar arası tekrar denetimi, günlük bülten dilimi ve kısa haberin bültene düşmesi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { calistir } from './hent-haberler.mjs';

const simdi = new Date('2026-10-12T07:00:00Z'); // İstanbul 10:00, açılış dilimi
const aday = (id, baslik, ek = {}) => ({ id, baslik, ozet: '', tarih: '2026-10-12T06:00:00Z', onem: 4, kategori: 'piyasalar', kaynakMetni: `Uzun tam metin ${id} `.repeat(5), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }], ...ek });
const kaynak = (ad, liste) => ({ ad, hent: async () => liste });
const bultenSahte = () => ({
  bultenGerekli: (n) => n >= 1,
  bultenYaz: async (ol, _p, { simdi: t }) => ({
    yazi: { baslik: `Bülten ${t.toISOString()}`, spot: 's', govde: 'g', kategori: 'piyasalar', tarih: t, tur: 'bulten', kaynaklar: [] },
    anlik: { zaman: 'z', degerler: {} },
    olaylar: ol,
  }),
});

async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'hbk-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  return {
    rot,
    geminiVar: true,
    gemini: async () => ({ gruplar: [] }),
    log: () => {},
    ipucu: { hent: async () => [], onemArtir: (a) => a },
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'g' }),
    yayinKurulu: async (t) => ({ yazi: t }),
    bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
    karneler: async () => [],
    piyasa: async () => ({ guncelleme: simdi.toISOString(), gostergeler: [] }),
    durum: { gorulen: {}, sonBulten: null, kaynaklar: { A: 'x', B: 'x' } },
    simdi,
    ...extra,
  };
}

test('sonraki çalıştırmada başka kaynaktan gelen aynı olay yazılmaz, görüldü sayılır', async () => {
  const s = await ortam({ kaynaklar: [kaynak('A', [aday('a1', 'IonQ to buy cybersecurity firm Elisity in up to $1.3 billion deal')])] });
  assert.equal((await calistir(s)).adet, 1);
  assert.equal(s.durum.yayinlar.length, 1);
  const r = await calistir({
    ...s,
    simdi: new Date(simdi.getTime() + 4 * 3600e3),
    kaynaklar: [kaynak('B', [aday('b1', 'IonQ to acquire cybersecurity firm Elisity in an all-stock deal for up to $1.3 billion')])],
  });
  assert.equal(r.adet, 0);
  assert.ok(s.durum.gorulen.b1 && !s.durum.gorulen.b1.deneme);
  assert.equal((await readdir(path.join(s.rot, 'src/content/haberler'))).length, 1);
});

test('aynı dilimde ikinci bülten yazılmaz; sonraki dilimde yazılır', async () => {
  const s = await ortam({ bulten: bultenSahte(), geminiVar: false, kaynaklar: [kaynak('A', [aday('a1', 'Copper prices climb')])] });
  assert.equal((await calistir(s)).bultenYazildi, true);
  const ikinci = await calistir({ ...s, simdi: new Date(simdi.getTime() + 1.5 * 3600e3), kaynaklar: [kaynak('A', [aday('a2', 'Gold slips')])] });
  assert.equal(ikinci.bultenYazildi, false); // 11:30, yine açılış
  assert.equal(s.durum.gorulen.a2, undefined); // aday sonraki dilime kalır
  const ucuncu = await calistir({ ...s, simdi: new Date(simdi.getTime() + 4 * 3600e3), kaynaklar: [kaynak('A', [aday('a2', 'Gold slips')])] });
  assert.equal(ucuncu.bultenYazildi, true); // öğle
  assert.deepEqual(s.durum.bultenDilimleri, ['2026-10-12:acilis', '2026-10-12:ogle']);
});

test('yalnızca kısa kaldığı için duran olay bültene girer', async () => {
  let gelen = [];
  const s = await ortam({
    kaynaklar: [kaynak('A', [aday('a1', 'Copper prices climb')])],
    yayinKurulu: async () => ({ dur: 'Metin kısa', kisa: true }),
    bulten: { bultenGerekli: (n) => n >= 1, bultenYaz: async (ol) => ((gelen = ol.map((o) => o.id)), null) },
  });
  const r = await calistir(s);
  assert.equal(r.adet, 0);
  assert.deepEqual(gelen, ['a1']);
});
