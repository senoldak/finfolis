import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { motorTuru, turSec } from './motor-modu.mjs';
import { uyarlayiciKur } from './uyarlayici.mjs';
import { motorKimlik } from './motor.mjs';

mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});

const SIMDI = new Date('2026-10-22T09:00:00Z');

// Sahte motor dizini: gerçek motor, ağ yok. tur.mjs adayları alır, hepsini uyarlayıcıya verir (ya da fırlatır).
async function sahteMotor({ tur } = {}) {
  const dizin = await mkdtemp(path.join(tmpdir(), 'motor-'));
  await mkdir(path.join(dizin, 'ortak'));
  await writeFile(
    path.join(dizin, 'tur.mjs'),
    tur ??
      `export async function turCalistir(p) {
  globalThis.__tur = p;
  const a = await p.uyarlayici.adaylar({ simdi: p.simdi, log: p.log });
  const sonuclar = await p.uyarlayici.isle(a, { surVar: p.surVar, log: p.log });
  return { yazilan: sonuclar.filter((s) => s.durum === 'yazildi').map((s) => s.slug), elenen: 0, bekleyen: 0, hatalar: [] };
}\n`,
  );
  await writeFile(path.join(dizin, 'defter.mjs'), `export const defterIstemcisi = (p) => ({ sahte: 'defter', ...p });\n`);
  await writeFile(
    path.join(dizin, 'ortak/gizli.mjs'),
    `export const gizliKur = (p) => ({ sahte: 'gizli', ...p, anahtarAdi: 'KAYNAK_ANAHTARI', anahtarVar: () => true });\n`,
  );
  return dizin;
}

const bosDurum = () => ({ gorulen: {}, kaynaklar: {}, havuz: [] });
const env = (dizin) => ({ MOTOR_TUR: '1', MOTOR_DIZIN: dizin, MOTOR_URL: 'https://saat.example.com', MOTOR_ANAHTARI: 'x' });
const sahteUyarlayici = (isle, adaylar) => ({ adaylar: async () => adaylar, isle, ozet: {}, simdi: SIMDI });
const temizle = (dizin) => rm(dizin, { recursive: true, force: true });

test('MOTOR_TUR yokken yerelTur çağrılır', async () => {
  const cagrilar = [];
  const sonuc = await turSec({
    env: {},
    uyarlayici: {},
    durum: {},
    yerel: async (u, d) => cagrilar.push(['yerel', u, d]),
    motor: async () => cagrilar.push(['motor']),
  });
  assert.equal(cagrilar.length, 1);
  assert.equal(cagrilar[0][0], 'yerel');
  assert.ok(sonuc);
});

test('MOTOR_TUR=1 ve MOTOR_DIZIN yokken hata: MOTOR_DIZIN', async () => {
  const yerel = mock.fn();
  await assert.rejects(
    turSec({ env: { MOTOR_TUR: '1' }, uyarlayici: {}, durum: {}, yerel, motor: (p) => motorTuru(p) }),
    /MOTOR_DIZIN/,
  );
  assert.equal(yerel.mock.callCount(), 0); // yerel tura düşmez
});

test('MOTOR_TUR=1 ve motor import edilemezse hata ile biter, yerel tura düşmez', async () => {
  const dizin = await mkdtemp(path.join(tmpdir(), 'motor-bos-'));
  try {
    const yerel = mock.fn();
    await assert.rejects(
      turSec({ env: env(dizin), uyarlayici: {}, durum: bosDurum(), yerel, motor: (p) => motorTuru({ ...p, rot: '.' }) }),
      /motor/i,
    );
    assert.equal(yerel.mock.callCount(), 0);
  } finally {
    await temizle(dizin);
  }
});

test('motorTuru: ayar, gizli ve defter sözleşme değerleriyle kurulur', async () => {
  const dizin = await sahteMotor();
  try {
    const sonuc = await motorTuru({ motorDizin: dizin, uyarlayici: sahteUyarlayici(async () => [], []), durum: bosDurum(), env: env(dizin), simdi: SIMDI, rot: '/kok' });
    const p = globalThis.__tur;
    assert.deepEqual(p.ayar, { ad: 'finfolis', site: 'https://finfolis.com', yaziYolu: '/haber/{slug}/', havuzSaat: 24, bekleyenLimit: 50 });
    assert.equal(p.site, 'finfolis');
    assert.deepEqual(p.geminiKur(), { sayac: { cagri: 0, giris: 0, cikis: 0 } });
    assert.equal(p.defter.url, 'https://saat.example.com');
    assert.equal(p.defter.site, 'finfolis');
    assert.equal(p.defter.anahtar, 'x');
    assert.equal(p.gizli.sifreliDosya, 'scripts/haberler/kaynaklar/gizli-kaynaklar.sifreli');
    assert.equal(p.gizli.kokDizin, '/kok');
    assert.deepEqual(sonuc.yazilan, []);
  } finally {
    await temizle(dizin);
  }
});

test('surVar verilirse motora iletilir, verilmezse motor varsayılanını kullanır', async () => {
  const dizin = await sahteMotor();
  try {
    const surVar = () => false;
    await motorTuru({ motorDizin: dizin, uyarlayici: sahteUyarlayici(async () => [], []), durum: bosDurum(), env: env(dizin), simdi: SIMDI, surVar });
    assert.equal(globalThis.__tur.surVar, surVar);
    await motorTuru({ motorDizin: dizin, uyarlayici: sahteUyarlayici(async () => [], []), durum: bosDurum(), env: env(dizin), simdi: SIMDI });
    assert.equal(globalThis.__tur.surVar, undefined);
  } finally {
    await temizle(dizin);
  }
});

test("motor modunda da karar verilen üyeler gorulen'e işaretlenir (nesne kaydı) ve bekleyenler işaretlenmez", async () => {
  const dizin = await sahteMotor();
  try {
    const durum = bosDurum();
    const girdi = ['a', 'b', 'c', 'd'].map((id) => ({ kimlik: motorKimlik(`bir:${id}`), yuk: { id: `bir:${id}` }, baslik: id }));
    const [a, b, c, d] = girdi;
    const uyarlayici = sahteUyarlayici(async (liste) => {
      assert.equal(liste.length, 4);
      return [
        { kimlik: a.kimlik, durum: 'yazildi', slug: 's1' },
        { kimlik: b.kimlik, durum: 'elendi', gerekce: 'kapsam dışı' },
        { kimlik: c.kimlik, durum: 'bekliyor', hata: new Error('geçici') },
        { kimlik: d.kimlik, durum: 'bekliyor', gerekce: 'havuzda', havuzda: true },
      ];
    }, girdi);
    const sonuc = await motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' });
    assert.deepEqual(sonuc.yazilan, ['s1']);
    assert.deepEqual(Object.keys(durum.gorulen).sort(), ['bir:a', 'bir:b', 'bir:d']);
    assert.deepEqual(durum.gorulen['bir:a'], { zaman: SIMDI.toISOString() });
  } finally {
    await temizle(dizin);
  }
});

test("motor turu fırlatırsa kısmi sonuçlar gorulen'e işlenir ve hata yeniden fırlatılır", async () => {
  const dizin = await sahteMotor({
    tur: `export async function turCalistir(p) {
  const a = await p.uyarlayici.adaylar({});
  await p.uyarlayici.isle(a, {});
}
`,
  });
  try {
    const durum = bosDurum();
    const a = { kimlik: motorKimlik('bir:a'), yuk: { id: 'bir:a' }, baslik: 'a' };
    const hata = Object.assign(new Error('ayar'), { ayar: true, sonuclar: [{ kimlik: a.kimlik, durum: 'yazildi', slug: 's1' }] });
    const uyarlayici = sahteUyarlayici(async () => {
      throw hata;
    }, [a]);
    await assert.rejects(motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' }), (e) => e === hata);
    assert.ok(durum.gorulen['bir:a']);
  } finally {
    await temizle(dizin);
  }
});

test('motor modunda kaynaklar ve gorulen yine dolar (gerçek uyarlayıcı, sahte kaynak)', async () => {
  const dizin = await sahteMotor();
  try {
    const durum = bosDurum();
    const aday = { id: 'Kaynak:x1', baslik: 'Orionlab yeni çip tanıttı', ozet: '', tarih: new Date(SIMDI.getTime() - 3_600_000).toISOString(), onem: 10, kategori: 'piyasalar', kaynakMetni: 'metin', kaynaklar: [{ ad: 'K', url: 'https://haber.example.com/x1' }] };
    const uyarlayici = uyarlayiciKur({
      durum,
      simdi: SIMDI,
      ayar: { geminiVar: false, motorModu: true, log: () => {} },
      bag: { kaynaklar: [{ ad: 'Kaynak', hent: async () => [aday] }], bulten: { bultenGerekli: () => false, bultenYaz: async () => null } },
    });
    await motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' });
    assert.ok(durum.kaynaklar.Kaynak); // ilk çalışma: kaynak işaretlendi
  } finally {
    await temizle(dizin);
  }
});

// ── calistir / turBaslat: motor modu hata davranışı ──
const { calistir, turBaslat } = await import('./hent-haberler.mjs');
const { readFile, readdir } = await import('node:fs/promises');

async function ortam(tur) {
  const rot = await mkdtemp(path.join(tmpdir(), 'hb-motor-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  const aday = { id: 'Kaynak:m1', baslik: 'Orionlab yeni çip tanıttı', ozet: '', tarih: '2026-10-22T08:00:00Z', onem: 90, kategori: 'piyasalar', kaynakMetni: 'Uzun tam metin '.repeat(8), kaynaklar: [{ ad: 'K', url: 'https://haber.example.com/m1' }] };
  const secenek = {
    rot,
    simdi: SIMDI,
    geminiVar: true,
    okuyucu: null,
    karneler: async () => [],
    gemini: async () => ({ gruplar: [] }),
    log: () => {},
    ipucu: { hent: async () => [], onemArtir: (a) => a },
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'g' }),
    yayinKurulu: async (t) => ({ yazi: t }),
    bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
    piyasa: async () => ({ guncelleme: SIMDI.toISOString(), gostergeler: [] }),
    kaynaklar: [{ ad: 'Kaynak', hent: async () => [aday] }],
    durum: { gorulen: {}, sonBulten: null, kaynaklar: { Kaynak: 'x' } },
    ...(tur && { tur }),
  };
  return { rot, secenek };
}
const haberDosyalari = (rot) => readdir(path.join(rot, 'src/content/haberler'));

test('calistir: MOTOR_TUR=1 ve MOTOR_DIZIN yok → motorHatasi, yerel tura düşülmez, yazı yok', async () => {
  const { rot, secenek } = await ortam();
  const s = await calistir({ ...secenek, env: { MOTOR_TUR: '1' } });
  assert.match(s.motorHatasi.message, /MOTOR_DIZIN/);
  assert.equal((await haberDosyalari(rot)).length, 0);
  assert.deepEqual(s.durum.gorulen, {});
  assert.ok(s.hatalar.some((h) => /motor turu/.test(h)));
});

test('calistir: motor turu fırlatırsa yazılanlar ve durum sonuçta kalır, hata adres temizlenerek taşınır; yerel modda hata yine fırlar', async () => {
  const fail = async ({ uyarlayici }) => {
    const hepsi = await uyarlayici.adaylar();
    await uyarlayici.isle(hepsi, {});
    throw new Error('defter yazılamadı https://haber.example.com/gizli');
  };
  const { rot, secenek } = await ortam(fail);
  const s = await calistir({ ...secenek, env: { MOTOR_TUR: '1' } });
  assert.equal(s.adet, 1);
  assert.equal((await haberDosyalari(rot)).length, 1);
  assert.ok(s.durum.gorulen['Kaynak:m1']);
  assert.ok(s.motorHatasi);
  assert.ok(!s.hatalar.join(' ').includes('haber.example.com'));
  const yerel = await ortam(fail);
  await assert.rejects(calistir({ ...yerel.secenek, env: {} }), /defter yazılamadı/);
});

test('turBaslat: motor hatasında durum dosyası ve GITHUB_OUTPUT adet yazılır, hata döner (çıkış kodu 1 için)', async () => {
  const fail = async ({ uyarlayici }) => {
    await uyarlayici.isle(await uyarlayici.adaylar(), {});
    throw new Error('ayar');
  };
  const { secenek } = await ortam(fail);
  const dizin = await mkdtemp(path.join(tmpdir(), 'hb-cikti-'));
  const cikti = path.join(dizin, 'out.txt');
  const durumDosyasi = path.join(dizin, 'gorulen.json');
  const env = { MOTOR_TUR: '1', GITHUB_OUTPUT: cikti };
  const r = await turBaslat({ env, acil: async () => ({ durdu: false }), durumDosyasi, calis: (o) => calistir({ ...secenek, ...o, env }), log: () => {} });
  assert.ok(r.hata);
  assert.match(await readFile(cikti, 'utf8'), /adet=1/);
  assert.ok(JSON.parse(await readFile(durumDosyasi, 'utf8')).gorulen['Kaynak:m1']);
});
