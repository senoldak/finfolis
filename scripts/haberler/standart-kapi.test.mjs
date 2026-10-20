// Standartlar Faz 0: süzgeç ve acil durdurma finfolis haber botuna bağlanışı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { calistir, turBaslat } from './hent-haberler.mjs';
import { standartKapisi, derlemeSuz, yaziEkleri, acilDurdurma } from './standart-kapi.mjs';
import { yayinKurulu, kontrolMasasi } from './yayin-kurulu.mjs';
import { bultenYaz } from './bulten.mjs';

const simdi = new Date('2026-10-12T09:00:00Z');
const aday = (id, ek = {}) => ({ id, baslik: `Baslik ${id}`, tarih: '2026-10-12T08:00:00Z', onem: 80, kategori: 'piyasalar', kaynakMetni: `Uzun tam metin ${id} `.repeat(5), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }], ...ek });
const kaynak = (ad, liste) => ({ ad, hent: async () => liste });

async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'std-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  return {
    secenek: {
      rot,
      simdi,
      geminiVar: true,
      okuyucu: null,
      karneler: async () => [],
      gemini: async () => ({ gruplar: [] }),
      log: () => {},
      ipucu: { hent: async () => [], onemArtir: (a) => a },
      yaz: async (a) => ({ baslik: a.baslik, spot: 'Faiz sabit kaldı.', govde: 'Merkez bankası faizi sabit tuttu.' }),
      yayinKurulu: async (t) => ({ yazi: t }),
      bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
      piyasa: async () => ({ guncelleme: simdi.toISOString(), gostergeler: [] }),
      durum: { gorulen: {}, sonBulten: null, kaynaklar: { A: 'x' } },
      ...extra,
    },
  };
}
const dosyalar = async (rot) => readdir(path.join(rot, 'src/content/haberler'));

test('kırmızı haber yazılmaz, elendi olarak gerekçeyle kaydedilir', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('k1')])],
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'Şirketin mühendisi tutuklandı.' }),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal((await dosyalar(secenek.rot)).length, 0);
  const g = secenek.durum.gorulen.k1;
  assert.equal(g.elendi, true);
  assert.equal(g.zaman, simdi.toISOString());
  assert.match(g.gerekce, /^standart:kirmizi:suc/);
  assert.equal(g.yazildi, undefined);
});

test('sarı haber yazılır, gerekçe yazildi kaydına girer', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('s1')])],
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'Fabrikadaki kazada iki kişi öldü.' }),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
  assert.equal((await dosyalar(secenek.rot)).length, 1);
  const g = secenek.durum.gorulen.s1;
  assert.equal(g.yazildi, true);
  assert.equal(g.gerekce, 'standart:sari:olum-kaza');
});

test('temiz haberde gerekçe alanı yok', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('t1')])] });
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.t1.yazildi, true);
  assert.equal('gerekce' in secenek.durum.gorulen.t1, false);
});

test('okura görünen ek alanlar (Hızlı Çıkarım) da süzgeçten geçer', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('e1')])],
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'Merkez bankası faizi sabit tuttu.', key_points: ['Yönetici tutuklandı'] }),
  });
  await calistir(secenek);
  assert.equal((await dosyalar(secenek.rot)).length, 0);
  assert.equal(secenek.durum.gorulen.e1.elendi, true);
});

test('süzgeç hata verirse haber bekletilir: yazılmaz, görüldü sayılmaz', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('h1')])],
    standart: () => {
      throw new Error('süzgeç çöktü');
    },
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal((await dosyalar(secenek.rot)).length, 0);
  assert.equal(secenek.durum.gorulen.h1, undefined);
  assert.ok(s.hatalar.some((h) => /standart denetimi çalıştırılamadı/.test(h)));
});

test('yayın kurulu denetimi çalıştıramazsa haber bekletilir (görüldü ya da deneme sayılmaz)', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('b1')])],
    yayinKurulu: async () => ({ dur: 'Yayın kurulu denetimi çalıştırılamadı', bekle: true }),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal(secenek.durum.gorulen.b1, undefined);
});

test('Gemini kotası bitince haber yazılmaz ve deneme sayılmaz', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('q1')])],
    yayinKurulu: async () => {
      const e = new Error('Gemini: bütün modellerin günlük kotası dolu');
      e.kota = true;
      throw e;
    },
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal(secenek.durum.gorulen.q1, undefined);
});

test('yayinKurulu: kontrol masası yanıt vermezse bekle işaretiyle durur, düzeltmeye gitmez', async () => {
  const taslak = { baslik: 'Faiz kararı', spot: 'Faiz sabit.', govde: 'Merkez bankası faizi yüzde 40 düzeyinde sabit tuttu. '.repeat(40) };
  const aday1 = { id: 'x', kaynakMetni: taslak.govde };
  let cagri = 0;
  const gemini = async () => {
    cagri++;
    return null;
  };
  const r = await yayinKurulu(taslak, aday1, { gemini });
  assert.equal(r.bekle, true);
  assert.ok(r.dur);
  assert.equal(cagri, 1);
  const k = await kontrolMasasi(taslak, aday1, { gemini: async () => ({ sorunlar: [] }) }); // onay alanı yok: bozuk yanıt
  assert.equal(k.onay, false);
  assert.equal(k.calismadi, true);
});

test('yayinKurulu: ret kalıcı karar olarak bekle işareti taşımaz', async () => {
  const taslak = { baslik: 'Faiz kararı', spot: 'Faiz sabit.', govde: 'Merkez bankası faizi yüzde 40 düzeyinde sabit tuttu. '.repeat(40) };
  const gemini = async ({ sema }) => (sema.properties.duzeltilmis || sema.properties.onay ? { onay: false, sorunlar: ['sorun'] } : taslak);
  const r = await yayinKurulu(taslak, { id: 'x', kaynakMetni: taslak.govde }, { gemini });
  assert.ok(r.dur);
  assert.equal(r.bekle, undefined);
});

test('yaziEkleri: why_matters, key_points, rakam, sırada, tablo ve grafik toplanır', () => {
  const e = yaziEkleri({
    why_matters: 'Önemli',
    key_points: ['bir', 'iki'],
    rakamlar: [{ etiket: 'Faiz', deger: '%40' }],
    sirada: { tarih: '12 Ekim', olay: 'Karar' },
    tablo: { baslik: 'T', sutunlar: ['a', 'b'], satirlar: [['1', '2']] },
    grafik: { baslik: 'G', birimEtiket: 'bin', satirlar: [{ etiket: 'x', metin: '3' }] },
  });
  assert.deepEqual(e, ['Önemli', 'bir', 'iki', 'Faiz: %40', '12 Ekim: Karar', 'T', 'a', 'b', '1', '2', 'G', 'bin', 'x: 3']);
});

test('standartKapisi: beklenmeyen yanıt hata sayılır', () => {
  assert.equal(standartKapisi({ baslik: 'a', spot: 'b', govde: 'c' }, '', () => null).karar, 'hata');
  assert.equal(standartKapisi({ baslik: 'a', spot: 'b', govde: 'c' }, '', () => ({ karar: 'belki' })).karar, 'hata');
});

test('derlemeSuz: kırmızı paragraf atılır, yazı düşmez; başlıkta kırmızı varsa tümü kırmızı', () => {
  const govde = '## Piyasalar\n\nMerkez bankası faizi sabit tuttu.\n\nŞirketin mühendisi tutuklandı.\n\n## Enerji\n\nPetrol fiyatı yüzde 2 arttı.';
  const yazi = { baslik: 'Günün özeti', spot: 'Öne çıkanlar.', govde, rakamlar: [{ etiket: 'Faiz', deger: '%40' }] };
  const s = derlemeSuz(yazi, '');
  assert.equal(s.karar, 'temiz');
  assert.deepEqual(s.atilan.map((b) => b.kural), ['suc']);
  assert.doesNotMatch(s.yazi.govde, /tutuklandı/);
  assert.match(s.yazi.govde, /## Piyasalar/);
  assert.match(s.yazi.govde, /Petrol/);
  assert.equal(s.yazi.rakamlar, undefined);
  const k = derlemeSuz({ ...yazi, baslik: 'Mühendis tutuklandı' }, '');
  assert.equal(k.karar, 'kirmizi');
  assert.equal(k.atilan.length, 0);
});

test('derlemeSuz: paragrafı kalmayan ara başlık da atılır', () => {
  const s = derlemeSuz({ baslik: 'Özet', spot: 'Spot.', govde: '## A\n\nMüdür tutuklandı.\n\n## B\n\nFaiz sabit kaldı.' }, '');
  assert.doesNotMatch(s.yazi.govde, /## A/);
  assert.match(s.yazi.govde, /## B/);
});

test('bülten: kırmızı madde tek başına atılır, bülten yazılır; süzgeç hatasında madde bekler', async () => {
  const olay = (id, kaynakMetni = 'Fed held rates at 4.25 percent.') => ({ id, baslik: id, bolge: 'abd', onem: 100, kategori: 'piyasalar', tarih: '2026-10-11T10:00:00Z', adaylar: [{ id: `a-${id}` }], kaynakMetni, kaynaklar: [] });
  const metinler = { a: 'Fed faizi yüzde 4,25 düzeyinde tuttu.', b: 'Fed faizi yüzde 4,25 düzeyinde tuttu.', c: 'Fed faizi yüzde 4,25 düzeyinde tuttu.', d: 'Fed faizi yüzde 4,25 düzeyinde tuttu. Bir yönetici tutuklandı.' };
  const gemini = async ({ sema }) => {
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    return { maddeler: Object.entries(metinler).map(([k, metin], i) => ({ olay: String(i + 1), etiket: `Olay ${k}`, metin })) };
  };
  const olaylar = ['a', 'b', 'c', 'd'].map((i) => olay(i));
  const izleyici = {};
  const r = await bultenYaz(olaylar, { gostergeler: [] }, { gemini, simdi, izleyici });
  assert.doesNotMatch(r.yazi.govde, /Olay d/);
  assert.match(r.yazi.govde, /Olay c/);
  assert.deepEqual(izleyici.elenen.map((e) => e.olay.id), ['d']);
  assert.match(izleyici.elenen[0].gerekce, /^standart:kirmizi:suc/);

  const hata = {};
  const r2 = await bultenYaz(olaylar, { gostergeler: [] }, { gemini, simdi, izleyici: hata, standart: () => { throw new Error('çöktü'); } });
  assert.equal(r2, null); // hiçbir madde süzgeçten geçemedi: bülten yok
  assert.equal(hata.bekleyen.length, 4);
  assert.equal(hata.elenen.length, 0);
});

test('bülten kırmızı madde: hent kaydı elendi + gerekçe, bekleyen görülmedi kalır', async () => {
  const bulten = {
    bultenGerekli: () => true,
    bultenYaz: async (olaylar, p, { izleyici }) => {
      izleyici.elenen = [{ olay: olaylar[0], gerekce: 'standart:kirmizi:suc', ozet: { karar: 'kirmizi', kirmizi: [{ kural: 'suc', ham: 'x' }], sari: [] } }];
      izleyici.bekleyen = [olaylar[1]];
      izleyici.sari = [];
      return { yazi: { baslik: 'Piyasa bülteni', spot: 's', govde: 'g', kategori: 'piyasalar', tarih: simdi, tur: 'bulten', kaynaklar: [] }, anlik: { zaman: 'z', degerler: {} }, olaylar: [olaylar[2]] };
    },
  };
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('b1', { onem: 40 }), aday('b2', { onem: 40 }), aday('b3', { onem: 40 })])], bulten });
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.b1.elendi, true);
  assert.equal(secenek.durum.gorulen.b1.gerekce, 'standart:kirmizi:suc');
  assert.equal(secenek.durum.gorulen.b2, undefined);
  assert.ok(secenek.durum.gorulen.b3);
});

test('acil durdurma açıksa tur Gemini ve yazı işine girmeden biter', async () => {
  const dizin = await mkdtemp(path.join(os.tmpdir(), 'gh-'));
  const cikti = path.join(dizin, 'out.txt');
  let calisti = false;
  const loglar = [];
  const s = await turBaslat({
    env: { GITHUB_OUTPUT: cikti, MOTOR_URL: 'https://saat.test', MOTOR_ANAHTARI: 'x'.repeat(20) },
    acil: async ({ log }) => {
      log('Acil durdurma açık: test');
      return { durdu: true, neden: 'test' };
    },
    calis: async () => {
      calisti = true;
      return { durum: {}, hatalar: [], adet: 0 };
    },
    log: (m) => loglar.push(m),
  });
  assert.equal(s.durdu, true);
  assert.equal(calisti, false);
  assert.match(await readFile(cikti, 'utf8'), /durdu=1/);
  assert.ok(loglar.some((m) => /^Acil durdurma açık/.test(m)));
});

test('acilDurdurma: bayrak açık ve kapalı durumları loga yazılır', async () => {
  const yanit = (j) => async () => ({ ok: true, json: async () => j });
  const loglar = [];
  const env = { MOTOR_URL: 'https://saat.test', MOTOR_ANAHTARI: 'x'.repeat(20) };
  const a = await acilDurdurma({ env, log: (m) => loglar.push(m), fetchFn: yanit({ durdu: true, zaman: '2026-10-20T10:00:00Z' }) });
  assert.equal(a.durdu, true);
  assert.match(loglar[0], /^Acil durdurma açık: acil durdurma/);
  const b = await acilDurdurma({ env, log: (m) => loglar.push(m), fetchFn: yanit({ durdu: false }) });
  assert.equal(b.durdu, false);
  assert.match(loglar[1], /açık$/);
});

test('motor defteri: kırmızı elendi, sarı yazildi+slug; kimlik adres taşımaz', async () => {
  const kayitlar = [];
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('https://k/kirmizi1:x'), aday('s2')])],
    motor: async (k) => kayitlar.push(k),
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: a.id.startsWith('http') ? 'Şirketin mühendisi tutuklandı.' : 'Fabrikadaki kazada iki kişi öldü.' }),
  });
  await calistir(secenek);
  const red = kayitlar.find((k) => k.durum === 'elendi');
  const sari = kayitlar.find((k) => k.durum === 'yazildi');
  assert.match(red.gerekce, /^standart:kirmizi:suc/);
  assert.equal(red.slug, undefined);
  assert.match(sari.gerekce, /^standart:sari:/);
  assert.match(sari.slug, /^[a-z0-9-]{1,120}$/);
  for (const k of kayitlar) assert.match(k.kimlik, /^[A-Za-z0-9:_-]{1,128}$/);
  assert.equal(kayitlar.length, 2);
});

test('motor yazılamazsa tur durmaz; temiz habere kayıt gitmez', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('m1'), aday('m2')])],
    motor: async () => {
      throw new Error('saat kapalı');
    },
    yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: a.id === 'm1' ? 'Fabrikadaki kazada iki kişi öldü.' : 'Merkez bankası faizi sabit tuttu.' }),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 2);
  const kayitlar = [];
  const { secenek: s2 } = await ortam({ kaynaklar: [kaynak('A', [aday('t9')])], motor: async (k) => kayitlar.push(k) });
  await calistir(s2);
  assert.equal(kayitlar.length, 0);
});
