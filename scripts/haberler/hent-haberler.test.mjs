import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { calistir } from './hent-haberler.mjs';

const simdi = new Date('2026-10-12T09:00:00Z'); // Pazartesi
const aday = (id, onem = 4, ek = {}) => ({ id, baslik: `Baslik ${id}`, tarih: '2026-10-12T08:00:00Z', onem, kategori: 'piyasalar', kaynakMetni: `Uzun tam metin ${id} `.repeat(5), kaynaklar: [{ ad: 'K', url: `https://k/${id}` }], ...ek });
const kaynak = (ad, liste) => ({ ad, hent: async () => liste });

async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'hb-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  return {
    secenek: {
      rot,
      simdi,
      geminiVar: true,
      gemini: async () => ({ gruplar: [] }), // gruplama: her aday kendi olayı
      log: () => {},
      ipucu: { hent: async () => [], onemArtir: (a) => a },
      yaz: async (a) => ({ baslik: a.baslik, spot: 's', govde: 'g' }),
      yayinKurulu: async (t) => ({ yazi: t }),
      bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
      piyasa: async () => ({ guncelleme: simdi.toISOString(), gostergeler: [] }),
      durum: { gorulen: {}, sonBulten: null, kaynaklar: { A: 'x', B: 'x' } },
      ...extra,
    },
  };
}

test('ikinci çalıştırma aynı adaylarla 0 haber yazar', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('a1'), aday('a2')])] });
  assert.equal((await calistir(secenek)).adet, 2);
  assert.equal((await calistir(secenek)).adet, 0);
});

test('hata veren kaynak diğerlerini durdurmaz', async () => {
  const { secenek } = await ortam({
    kaynaklar: [
      {
        ad: 'A',
        hent: async () => {
          throw new Error('kırık');
        },
      },
      kaynak('B', [aday('b1')]),
    ],
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
  assert.equal(s.hatalar.length, 1);
});

test('yayın kurulu durdurursa görüldü sayılır, istisna olursa sayılmaz', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('a1')])], yayinKurulu: async () => ({ dur: 'sebep' }) });
  await calistir(secenek);
  assert.ok(secenek.durum.gorulen.a1);
  const o2 = await ortam({
    kaynaklar: [kaynak('A', [aday('a2')])],
    yaz: async () => {
      throw new Error('gemini yok');
    },
  });
  await calistir(o2.secenek);
  assert.equal(o2.secenek.durum.gorulen.a2.deneme, 1); // bekliyor, kalıcı görüldü değil
});

test('ilk çalışmada yalnızca en yeni 2 aday alınır, kalanı görüldü sayılır', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('Yeni', [aday('1'), aday('2'), aday('3'), aday('4')])],
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 2);
  assert.equal(Object.keys(secenek.durum.gorulen).length, 4);
});

test('kuru modda hiçbir şey yazılmaz', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('a1')])], kuru: true });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.deepEqual(secenek.durum.gorulen, {});
});

test('anahtar yoksa haber yazılmaz ama bülten yazılır', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1')])],
    geminiVar: false,
    bulten: {
      bultenGerekli: () => true,
      bultenYaz: async () => ({
        yazi: { baslik: 'Piyasa bülteni', spot: 's', govde: 'g', kategori: 'piyasalar', tarih: simdi, tur: 'bulten', kaynaklar: [] },
        anlik: { zaman: 'z', degerler: {} },
      }),
    },
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal(s.bultenYazildi, true);
  assert.equal(secenek.durum.sonBulten.zaman, 'z');
});

test('bozuk gorulen.json çalıştırmayı durdurur', async () => {
  const { secenek } = await ortam({ kaynaklar: [] });
  const dosya = path.join(secenek.rot, 'x.json');
  await writeFile(dosya, '{bozuk');
  const { jsonOku } = await import('./hent-haberler.mjs');
  await assert.rejects(() => jsonOku(dosya, {}));
  assert.deepEqual(await jsonOku(path.join(secenek.rot, 'yok.json'), { a: 1 }), { a: 1 });
});

test('üçüncü başarısızlıkta görüldü sayılır', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1')])],
    yaz: async () => {
      throw new Error('gemini yok');
    },
  });
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.a1.deneme, 1);
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.a1.deneme, 2);
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.a1.deneme, undefined);
  assert.ok(secenek.durum.gorulen.a1);
});

test('kaynaklar arası aynı id bir kez işlenir', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('x')]), kaynak('B', [aday('x')])] });
  assert.equal((await calistir(secenek)).adet, 1);
});

test('haber dosyası yazılır', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('a1')])] });
  await calistir(secenek);
  assert.equal((await readdir(path.join(secenek.rot, 'src/content/haberler'))).length, 1);
});

test('kuru modda piyasa.json dokunulmaz', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('a1')])], kuru: true });
  await calistir(secenek);
  await assert.rejects(() => readFile(path.join(secenek.rot, 'src/data/piyasa.json')));
});

test('bülten yalnızca görünür göstergeleri alır', async () => {
  let gelen;
  const eski = { id: 'eski', deger: 1, gecerlilik: 'kur', zaman: '2026-09-01T00:00:00Z' };
  const taze = { id: 'taze', deger: 2, gecerlilik: 'kur', zaman: '2026-10-12T00:00:00Z' };
  const { secenek } = await ortam({
    kaynaklar: [],
    piyasa: async () => ({ guncelleme: 'z', gostergeler: [eski, taze] }),
    bulten: {
      bultenGerekli: () => true,
      bultenYaz: async (_o, p) => {
        gelen = p.gostergeler.map((g) => g.id);
        return null;
      },
    },
  });
  await calistir(secenek);
  assert.deepEqual(gelen, ['taze']);
});

test('60 günden eski kayıtlar silinir', async () => {
  const { secenek } = await ortam({
    kaynaklar: [],
    durum: { gorulen: { eski: { zaman: '2026-07-01T00:00:00Z' }, yeni: { zaman: '2026-10-01T00:00:00Z' } }, sonBulten: null, kaynaklar: {} },
  });
  await calistir(secenek);
  assert.deepEqual(Object.keys(secenek.durum.gorulen), ['yeni']);
});

test('yapılandırma hatası deneme saymaz ve ilk haberden sonra durur', async () => {
  let cagri = 0;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1'), aday('a2')])],
    yaz: async () => {
      cagri++;
      throw Object.assign(new Error('Gemini 403: anahtar'), { konfig: true });
    },
  });
  const s = await calistir(secenek);
  assert.equal(cagri, 1);
  assert.equal(s.konfigHatasi, true);
  assert.equal(secenek.durum.gorulen.a1, undefined);
  assert.equal(secenek.durum.gorulen.a2, undefined);
  assert.equal(s.hatalar.length, 1);
});

test('bülten olayları yayın kurulunun durdurduğu adayı içermez', async () => {
  let gelen;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1'), aday('a2')])],
    yayinKurulu: async (t, a) => (a.id === 'a1' ? { dur: 'riskli' } : { yazi: t }),
    bulten: { bultenGerekli: () => true, bultenYaz: async (ol) => ((gelen = ol.map((x) => x.id)), null) },
  });
  await calistir(secenek);
  assert.deepEqual(gelen, ['a2']);
});

const bultenSahte = (kayit) => ({
  bultenGerekli: (n) => n >= 3,
  bultenYaz: async (ol) => {
    kayit.olaylar = ol;
    return { yazi: { baslik: 'Bülten', spot: 's', govde: 'g', kategori: 'piyasalar', tarih: simdi, tur: 'bulten', kaynaklar: [] }, anlik: { zaman: 'z', degerler: {} } };
  },
});

test('MAKS_HABER yoksa çalıştırma başına 8 haber; kalanlar görülmedi kalır, sonraki çalıştırmada yazılır', async () => {
  const eski = process.env.MAKS_HABER;
  delete process.env.MAKS_HABER;
  try {
    const liste = Array.from({ length: 10 }, (_, i) => aday(`a${i}`));
    const { secenek } = await ortam({ kaynaklar: [kaynak('A', liste)], maksHaber: undefined });
    assert.equal((await calistir(secenek)).adet, 8);
    assert.equal(Object.values(secenek.durum.gorulen).filter((g) => g.yazildi).length, 8);
    assert.equal((await calistir(secenek)).adet, 2);
  } finally {
    if (eski !== undefined) process.env.MAKS_HABER = eski;
  }
});

test('ücretli tek kaynaklı olay habere terfi etmez, bültende madde olur', async () => {
  const kayit = {};
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('u1', 5, { ucretli: true }), aday('d1', 2), aday('d2', 2)])],
    bulten: bultenSahte(kayit),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal(s.bultenYazildi, true);
  assert.deepEqual(kayit.olaylar.map((o) => o.id).sort(), ['d1', 'd2', 'u1']);
  assert.ok(secenek.durum.gorulen.u1 && secenek.durum.gorulen.d1);
});

test('terfi eden olay bültende bizim linkimizle', async () => {
  const kayit = {};
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('t1', 5), aday('d1', 2), aday('d2', 2)])],
    bulten: bultenSahte(kayit),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
  const o = kayit.olaylar.find((x) => x.id === 't1');
  assert.ok(o.haberSlug);
  assert.ok(s.yazilar.includes(o.haberSlug));
  assert.equal(secenek.durum.olaylar.length, 3);
});

test('eşik altında bülten yazılmazsa terfi etmeyen adaylar görülmedi kalır', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('d1', 2)])], bulten: bultenSahte({}) });
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.d1, undefined);
});

test('ikinci çalıştırmada aynı olay yeni kaynakla gelirse yazı açılmaz', async () => {
  let tur = 0;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1')]), { ad: 'B', hent: async () => (tur === 0 ? [] : [aday('b1')]) }],
    // ikinci çalıştırmada b1 hafızadaki a1 ile eşleşir
    gemini: async ({ istem }) => (istem.includes('[a1]') ? { gruplar: [[0]], eslesen: [{ aday: 0, hafiza: 'a1' }] } : { gruplar: [] }),
  });
  assert.equal((await calistir(secenek)).adet, 1);
  tur = 1;
  assert.equal((await calistir(secenek)).adet, 0);
  assert.ok(secenek.durum.gorulen.b1);
  assert.equal(secenek.durum.gorulen.b1.yazildi, undefined);
});

test('yeni kaynağın ilk çalıştırmasında yalnızca en yeni 2 aday', async () => {
  const t = (id, saat) => aday(id, 4, { tarih: `2026-10-12T0${saat}:00:00Z` });
  const { secenek } = await ortam({ kaynaklar: [kaynak('Taze', [t('e1', 1), t('e3', 3), t('e2', 2), t('e4', 4)])] });
  const s = await calistir(secenek);
  assert.equal(s.adet, 2);
  assert.ok(secenek.durum.gorulen.e4.yazildi && secenek.durum.gorulen.e3.yazildi);
  assert.equal(secenek.durum.gorulen.e1.yazildi, undefined);
});

test('kaynaklara goruldu işlevi verilir', async () => {
  let gelen;
  const { secenek } = await ortam({ kaynaklar: [{ ad: 'A', hent: async (ctx) => ((gelen = ctx.goruldu), []) }] });
  secenek.durum.gorulen.x = { zaman: simdi.toISOString() };
  await calistir(secenek);
  assert.equal(gelen('x'), true);
  assert.equal(gelen('y'), false);
});

test('bir kaynak hata fırlatırsa diğerleri işlenir', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1')]), { ad: 'K', hent: async () => { throw new Error('ağ'); } }, kaynak('B', [aday('b1')])],
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 2);
  assert.equal(s.hatalar.length, 1);
});

test('çalıştırma bütçesi aşılınca kalan olaylar görülmedi kalır', async () => {
  let t = 0;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1'), aday('a2'), aday('a3')])],
    saat: () => t,
    yaz: async (a) => {
      t += 10 * 60_000; // her haber 10 dakika
      return { baslik: a.baslik, spot: 's', govde: 'g' };
    },
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 2);
  assert.equal(secenek.durum.gorulen.a3, undefined);
});

test('bültene giren bekleyen (deneme) aday görüldü olur, sonraki bültene girmez', async () => {
  const kayit = {};
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('p1', 2), aday('d1', 2), aday('d2', 2)])], bulten: bultenSahte(kayit) });
  secenek.durum.gorulen.p1 = { zaman: simdi.toISOString(), deneme: 1 };
  await calistir(secenek);
  assert.equal(secenek.durum.gorulen.p1.deneme, undefined);
  kayit.olaylar = undefined;
  secenek.kaynaklar = [kaynak('A', [aday('p1', 2), aday('n1', 2), aday('n2', 2)])];
  await calistir(secenek);
  assert.ok(!(kayit.olaylar ?? []).some((o) => o.id === 'p1'));
});

test('bultenYaz hata verirse adaylar görülmedi kalır', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('d1', 2), aday('d2', 2), aday('d3', 2)])],
    bulten: { bultenGerekli: (n) => n >= 3, bultenYaz: async () => { throw new Error('bozuk'); } },
  });
  const s = await calistir(secenek);
  assert.equal(s.bultenYazildi, false);
  assert.equal(secenek.durum.gorulen.d1, undefined);
});

test('hafizaGuncelle hata verirse gorulen güncellemeleri korunur', async () => {
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1')])],
    olaylar: { olaylariGrupla: (await import('./olaylar.mjs')).olaylariGrupla, hafizaGuncelle: () => { throw new Error('x'); } },
  });
  const s = await calistir(secenek);
  assert.ok(secenek.durum.gorulen.a1.yazildi);
  assert.ok(s.durum);
});

test('tavan yüzünden yazılmayan olay bültende yok ve eşiğe sayılmaz', async () => {
  let sayi;
  const kayit = {};
  const b = bultenSahte(kayit);
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1', 5), aday('a2', 4), aday('d1', 2), aday('d2', 2)])],
    maksHaber: 1,
    bulten: { ...b, bultenGerekli: (n) => ((sayi = n), n >= 3) },
  });
  await calistir(secenek);
  assert.equal(sayi, 3);
  assert.ok(!kayit.olaylar.some((o) => o.id === 'a2'));
  assert.equal(secenek.durum.gorulen.a2, undefined);
});

test('kaynaklara limit verilir: ilk çalıştırmada 2 (kesilenler görüldü), sonra 15', async () => {
  const gelen = {};
  const k = (ad) => ({ ad, hent: async (ctx) => { gelen[ad] = ctx.limit; ctx.kesilen?.(`${ad}:eski`); return []; } });
  const { secenek } = await ortam({ kaynaklar: [k('A'), k('Yeni')] });
  await calistir(secenek);
  assert.deepEqual(gelen, { A: 15, Yeni: 2 });
  assert.ok(secenek.durum.gorulen['Yeni:eski']);
  assert.equal(secenek.durum.gorulen['A:eski'], undefined);
});

test('kaynak bütçesi (8 dk) dolunca yeni kaynak başlatılmaz', async () => {
  let t = 0;
  const cagrilan = [];
  const k = (ad) => ({ ad, hent: async () => { cagrilan.push(ad); t += 5 * 60_000; return [aday(`${ad}1`)]; } });
  const { secenek } = await ortam({ kaynaklar: [k('A'), k('B'), k('C')], saat: () => t });
  secenek.durum.kaynaklar.C = 'x';
  const s = await calistir(secenek);
  assert.deepEqual(cagrilan, ['A', 'B']);
  assert.equal(s.adet, 2);
});

test('gruplama hatasında terfi ve bülten yapılmaz, adaylar görülmedi kalır', async () => {
  let bultenCagrildi = false;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1'), aday('d1', 2), aday('d2', 2), aday('d3', 2)])],
    gemini: async () => null,
    bulten: { bultenGerekli: () => true, bultenYaz: async () => ((bultenCagrildi = true), null) },
  });
  const uyari = console.warn;
  console.warn = () => {};
  try {
    const s = await calistir(secenek);
    assert.equal(s.adet, 0);
  } finally {
    console.warn = uyari;
  }
  assert.equal(bultenCagrildi, false);
  assert.deepEqual(secenek.durum.gorulen, {});
});

test('bülten tavanı aşan olaylar bülten yazılınca görüldü sayılır; bültene butceBitti verilir', async () => {
  let secenekler;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('d1', 2), aday('d2', 2), aday('d3', 2), aday('d4', 2)])],
    bulten: {
      bultenGerekli: () => true,
      bultenYaz: async (ol, _p, s) => ((secenekler = s), {
        yazi: { baslik: 'Bülten', spot: 's', govde: 'g', kategori: 'piyasalar', tarih: simdi, tur: 'bulten', kaynaklar: [] },
        anlik: { zaman: 'z', degerler: {} },
        olaylar: ol.slice(0, 3),
      }),
    },
  });
  await calistir(secenek);
  assert.equal(typeof secenekler.butceBitti, 'function');
  for (const id of ['d1', 'd2', 'd3', 'd4']) assert.ok(secenek.durum.gorulen[id], id);
  assert.equal(secenek.durum.olaylar.length, 4); // tavan dışı kalanlar da hafızaya girer
});

test('bütçe bittiyse bultenYaz çağrılmaz', async () => {
  let t = 0;
  let cagri = false;
  const { secenek } = await ortam({
    kaynaklar: [kaynak('A', [aday('a1'), aday('d1', 2), aday('d2', 2), aday('d3', 2)])],
    saat: () => t,
    yaz: async (a) => ((t += 19 * 60_000), { baslik: a.baslik, spot: 's', govde: 'g' }),
    bulten: { bultenGerekli: () => true, bultenYaz: async () => ((cagri = true), null) },
  });
  await calistir(secenek);
  assert.equal(cagri, false);
  assert.equal(secenek.durum.gorulen.d1, undefined);
});

test('genel RSS: önemi 3 olan içerikli olay habere terfi eder, 2 olan etmez', async () => {
  const { secenek } = await ortam({ kaynaklar: [kaynak('A', [aday('u3', 3), aday('d2', 2)])] });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
});

test('kendi kapağı olmayan kısa habere varsayılan kapak: rakam varsa rakam kartı, yoksa bölge kartı', async () => {
  const { varsayilanKapak } = await import('./hent-haberler.mjs');
  const o = { kategori: 'ekonomi', bolge: 'abd', kaynaklar: [{ ad: 'Örnek Kurum', url: 'https://kurum.example.com/a' }] };
  const r1 = varsayilanKapak({ baslik: 'Borç ödemelerinde artış', rakamlar: [{ etiket: 'Geciken aile oranı', deger: '%20' }] }, o);
  assert.equal(typeof r1.kapak, 'function');
  assert.equal(r1.kapakAlt, 'Geciken aile oranı %20');
  const r2 = varsayilanKapak({ baslik: 'Yandex veri merkezi kapatıldı', rakamlar: [] }, { ...o, bolge: 'avrupa' });
  assert.equal(typeof r2.kapak, 'function');
  assert.equal(r2.kapakAlt, 'Avrupa · Yandex veri merkezi kapatıldı');
  const r3 = varsayilanKapak({ baslik: 'Tahvil getirisi', rakamlar: [{ etiket: 'Getiri', deger: 'yüzde 8,1' }] }, o);
  assert.equal(r3.kapakAlt, 'Getiri %8,1');
  const r4 = varsayilanKapak({ baslik: 'Dev satın alma', rakamlar: [{ etiket: 'Tutar', deger: '1,2 milyar dolar' }] }, o);
  assert.equal(r4.kapakAlt, 'ABD · Dev satın alma');
});

test('karneler Gemini olmadan yazılır, sayılır; karne hatası çalıştırmayı durdurmaz', async () => {
  const yazi = { baslik: 'Haftalık piyasa karnesi · 12–16 Ekim 2026', spot: 's', govde: 'g', kategori: 'piyasalar', tarih: simdi, tur: 'haber', kaynaklar: [] };
  const { secenek } = await ortam({ kaynaklar: [], geminiVar: false, karneler: async ({ durum }) => ((durum.karne = { hafta: 'x' }), [yazi]) });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
  assert.deepEqual(s.yazilar, ['haftalik-piyasa-karnesi-12-16-ekim-2026']);
  assert.equal(secenek.durum.karne.hafta, 'x');
  const { secenek: kirik } = await ortam({ kaynaklar: [], karneler: async () => { throw new Error('yahoo yok'); } });
  const h = await calistir(kirik);
  assert.ok(h.hatalar.some((x) => /karne: yahoo yok/.test(x)));
});

test('gruplamanın kaçırdığı aynı makro olay ikinci kez yazılmaz', async () => {
  const { secenek } = await ortam({
    kaynaklar: [
      kaynak('A', [aday('c', 4, { baslik: 'UK economy grew 0.1% in August, beating expectations' })]),
      kaynak('B', [aday('g', 4, { baslik: 'Tech stock sell-off intensifies; UK growth beats forecasts in August – business live', kaynakMetni: 'Canlı yayın metni '.repeat(20) })]),
    ],
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
  assert.ok(secenek.durum.gorulen.g && !secenek.durum.gorulen.g.yazildi);
});
