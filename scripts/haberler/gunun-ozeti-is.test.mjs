import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gunHaberleri, ozetYaz } from './gunun-ozeti-is.mjs';

const SIMDI = new Date('2026-11-13T17:45:00Z'); // İstanbul 20:45
const md = ({ title, description = 'Açıklama metni yeterince uzun.', tur = 'haber', date, extra = '' }) =>
  `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ndate: ${date}\ncategory: "piyasalar"\ntur: ${JSON.stringify(tur)}\n${extra}---\n\nGövde.\n`;

async function kur(haberler) {
  const kok = await mkdtemp(path.join(os.tmpdir(), 'ozet-'));
  for (const [slug, h] of Object.entries(haberler)) {
    await mkdir(path.join(kok, 'src/content/haberler', slug), { recursive: true });
    await writeFile(path.join(kok, 'src/content/haberler', slug, 'index.md'), md(h));
  }
  return kok;
}

const GUN = {
  huang: { title: "Nvidia CEO'su Jensen Huang İstifa Etti", description: "Nvidia'nın kurucusu Jensen Huang, 12 Kasım 2026'da görevinden ayrıldı.", date: '2026-11-13T14:00:00.000Z' },
  bitcoin: { title: 'Bitcoin 12 haftanın en düşük seviyesine geriledi', description: 'Bitcoin 12 haftanın en düşük seviyesi olan 68.500 dolar civarına geriledi.', date: '2026-11-13T17:22:00.000Z' },
  anthropic: { title: 'Anthropic halka arz sürecini başlattı', description: 'Anthropic, 825 milyon hisse satışı ile 64,4 milyar dolara kadar fon toplamayı hedefliyor.', date: '2026-11-13T07:41:00.000Z' },
  dun: { title: 'Dünkü haber', date: '2026-11-12T20:00:00.000Z' },
  'piyasa-bulteni-13-kasim-2026-kapanis': { title: 'Piyasa bülteni · 13 Kasım 2026, kapanış', tur: 'bulten', date: '2026-11-13T15:41:00.000Z' },
  taslak: { title: 'Taslak', date: '2026-11-13T10:00:00.000Z', extra: 'draft: true\n' },
};
const GECERLI = "Nvidia'nın kurucusu Jensen Huang görevinden ayrıldı. Anthropic halka arz sürecini başlattı ve 64,4 milyar dolara kadar fon toplamayı hedefliyor. Bitcoin 68.500 dolar civarına inerek 12 haftanın en düşük seviyesine geriledi.";
const oku = async (kok) => JSON.parse(await readFile(path.join(kok, 'src/data/gunun-ozeti/2026-11-13.json'), 'utf8'));
const sessiz = () => {};

test('gunHaberleri: bugünün yayımlanmış haberleri yayın sırasıyla; bülten, taslak, dün yok', async () => {
  const kok = await kur(GUN);
  assert.deepEqual((await gunHaberleri({ simdi: SIMDI, kok })).map((h) => h.id), ['anthropic', 'huang', 'bitcoin']);
});

test('ozetYaz: haber yoksa null', async () => {
  const kok = await kur({ dun: GUN.dun });
  assert.equal(await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn: async () => assert.fail('çağrılmamalı') }), null);
});

test('ozetYaz: geçerli paragraf → kayıt ve kapak PNG (paragraftaki haberler önce)', async () => {
  const kok = await kur(GUN);
  let istem;
  const kapakGirdi = [];
  const r = await ozetYaz({
    simdi: SIMDI, kok, log: sessiz,
    geminiFn: async (a) => ((istem = a), { paragraf: GECERLI, kimlikler: ['huang', 'anthropic', 'bitcoin'] }),
    kapakFn: async (g) => (kapakGirdi.push(g), Buffer.from('\x89PNG sahte')),
  });
  assert.deepEqual(r, { tarih: '2026-11-13', yazan: 'gemini' });
  assert.match(istem.sistem, /ekonomi ve finansal piyasalar/);
  assert.match(istem.istem, /kimlik: huang/);
  assert.ok(istem.sema.required.includes('kimlikler'));
  const basliklar = [GUN.huang.title, GUN.anthropic.title, GUN.bitcoin.title];
  assert.deepEqual(kapakGirdi, [
    { tarih: '13 Kasım 2026', basliklar, toplam: 3 },
    { tarih: '13 Kasım 2026', basliklar, toplam: 3, bicim: 'dikey' },
  ]);
  assert.equal((await oku(kok)).yazan, 'gemini');
  await access(path.join(kok, 'public/gunun-ozeti/2026-11-13.png'));
  await access(path.join(kok, 'public/gunun-ozeti/2026-11-13-dikey.png'));
});

test('ozetYaz: gerçek kapak çizimi PNG üretir', async () => {
  const kok = await kur(GUN);
  await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn: async () => null });
  const png = await readFile(path.join(kok, 'public/gunun-ozeti/2026-11-13.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('ozetYaz: dosya varsa yeniden yazmaz', async () => {
  const kok = await kur(GUN);
  const kapakFn = async () => Buffer.from('x');
  await ozetYaz({ simdi: SIMDI, kok, log: sessiz, kapakFn, geminiFn: async () => null });
  assert.equal(await ozetYaz({ simdi: SIMDI, kok, log: sessiz, kapakFn, geminiFn: async () => assert.fail('çağrılmamalı') }), null);
});

for (const [ad, geminiFn] of [
  ['gemini null', async () => null],
  ['gemini hata', async () => { throw new Error('kota'); }],
  ['uydurma ad', async () => ({ paragraf: GECERLI.replace('Anthropic', 'OpenAI'), kimlikler: ['huang', 'anthropic', 'bitcoin'] })],
]) {
  test(`ozetYaz: ${ad} → yedek paragraf`, async () => {
    const kok = await kur(GUN);
    assert.deepEqual(await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn, kapakFn: async () => Buffer.from('x') }), { tarih: '2026-11-13', yazan: 'yedek' });
    assert.match((await oku(kok)).paragraf, /^Günün öne çıkanları: Anthropic halka arz sürecini başlattı\. /);
  });
}
