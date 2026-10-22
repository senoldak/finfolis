import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { olaylariBul, adayYap, ENSTRUMANLAR } from './esik-olaylari.mjs';
import { sablonKontrol, EN_AZ_KELIME } from '../yayin-kurulu.mjs';
import { standartKapisi } from '../standart-kapi.mjs';
import { calistir } from '../hent-haberler.mjs';
import { kelimeSay } from '../../../src/lib/uzunluk.mjs';

const e = (id) => ENSTRUMANLAR.find((x) => x.id === id);

// Her iş günü bir nokta; deger(i) i. günün kapanışı. Başlangıç 2016-01-04.
function seriYap(gun, deger) {
  const out = [];
  let t = Date.UTC(2016, 0, 4);
  for (let i = 0; i < gun; i++) {
    while ([0, 6].includes(new Date(t).getUTCDay())) t += 864e5;
    out.push({ tarih: new Date(t).toISOString().slice(0, 10), deger: deger(i) });
    t += 864e5;
  }
  return out;
}
const N = 2600;
const dalga = (i) => 1000 + (i % 50);

// Tür başına bir seri ve enstrüman: şablonun her dalı çalışır.
const VAKALAR = [
  ['rekor', 'bist100', seriYap(N, (i) => (i === N - 1 ? 2000 : dalga(i)))],
  ['yuksek', 'eurusd', seriYap(N, (i) => (i === 10 ? 3000 : i > N - 250 ? 1000 + (i - (N - 250)) * 6 + (i % 2) * 10 : dalga(i)))],
  ['dusuk', 'sp500', seriYap(N, (i) => (i === 10 ? 100 : i > N - 250 ? 1000 - (i - (N - 250)) * 0.5 + ((i + 1) % 2) * 2 : dalga(i)))],
  ['olagandisi', 'sp500', seriYap(N, (i) => (i === N - 800 ? 950 : i === N - 1 ? 960 : 1000 + (i % 2) * 5))],
  ['seri-asagi', 'brent', seriYap(N, (i) => (i < N - 8 ? 1000 + (i % 2) : 1000 - (i - (N - 9)) * 5))],
  ['seri-yukari', 'altin', seriYap(N, (i) => (i < N - 8 ? 1000 + (i % 2) : 1000 + (i - (N - 9)) * 5))],
  ['dusus-borsa', 'bist100', seriYap(N, (i) => (i < N - 60 ? 1000 : i === N - 60 ? 1513 : i < N - 3 ? 1400 : 1194))],
  ['dusus-hisse', 'thyao', seriYap(N, (i) => (i < N - 60 ? 100 : i === N - 60 ? 151 : i < N - 3 ? 140 : 120))],
  ['yukselis', 'sp500', seriYap(N, (i) => (i < N - 100 ? 1000 : i === N - 100 ? 800 : i < N - 4 ? 850 : 1000))],
  ['parite', 'usdjpy', seriYap(N, (i) => (i === N - 1 ? 2000 : dalga(i)))], // pariteye rekor yazılmaz: "verinin başından beri en yüksek"
];

function adaylar() {
  const out = [];
  for (const [ad, id, seri] of VAKALAR) {
    const enst = e(id);
    for (const o of olaylariBul(seri, enst)) out.push({ ad, o, enst, seri, aday: adayYap(o, enst, seri) });
  }
  return out;
}

const YASAK = /fırsat|potansiyel|hedef fiyat|kaçırma|tahmin|beklent|öneri|(?<!\p{L})(?:al|sat)(?!\p{L})|tavsiye edil|Yahoo|Bloomberg|Reuters/iu;

test('şablon yazı her olay türünde en az 200 kelime, kesin kontrolden ve standart süzgecinden geçer', () => {
  const liste = adaylar();
  const turler = new Set(liste.map((x) => x.o.tur));
  for (const t of ['rekor', 'yuksek', 'dusuk', 'olagandisi', 'seri', 'dusus', 'yukselis']) assert.ok(turler.has(t), `tür çıkmadı: ${t}`);
  for (const { aday } of liste) {
    assert.ok(aday.sablonYazi, aday.id);
    const k = sablonKontrol(aday.sablonYazi, aday);
    assert.ok(k.yazi, `${aday.id}: ${k.dur}`);
    assert.ok(kelimeSay(k.yazi.govde) >= EN_AZ_KELIME, `${aday.id}: ${kelimeSay(k.yazi.govde)} kelime`);
    const std = standartKapisi(k.yazi, aday.kaynakMetni);
    assert.ok(['temiz', 'sari'].includes(std.karar), `${aday.id}: ${std.karar} ${std.gerekce}`);
  }
});

test('şablon yazıda yorum, tahmin, tavsiye, haber kaynağı adı yok; karne uyarısı var', () => {
  for (const { aday } of adaylar()) {
    const y = aday.sablonYazi;
    const metin = [y.baslik, y.spot, y.govde, ...y.rakamlar.map((r) => `${r.etiket} ${r.deger}`)].join('\n');
    assert.doesNotMatch(metin, YASAK, aday.id);
    assert.match(y.govde, /Geçmiş performans gelecekteki sonuçların göstergesi değildir; bu yazı yatırım tavsiyesi değildir\./);
    assert.equal(y.baslik, aday.baslik);
    assert.ok(y.rakamlar.length >= 3 && y.rakamlar.length <= 4);
  }
});

test('şablon yazı kısa kalırsa, kaynakta olmayan rakam ya da yayın kuruluşu adı taşırsa durdurulur', () => {
  const { aday } = adaylar()[0];
  assert.match(sablonKontrol({ ...aday.sablonYazi, govde: 'Kısa metin.' }, aday).dur, /kısa/);
  const uydurma = sablonKontrol({ ...aday.sablonYazi, govde: `${aday.sablonYazi.govde}\n\nBu seviye 7777,5 puan olarak kaydedildi.` }, aday);
  assert.match(uydurma.dur, /kesin kontrol/);
  assert.ok(sablonKontrol({ ...aday.sablonYazi, govde: `${aday.sablonYazi.govde}\n\nBloomberg verisine göre.` }, aday).dur);
});

test('kalıp seçimi deterministik: aynı kimlik aynı metin, farklı kimlikler farklı kalıplar verir', () => {
  const { o, enst, seri } = adaylar()[0];
  const a1 = adayYap(o, enst, seri).sablonYazi;
  assert.equal(adayYap(o, enst, seri).sablonYazi.govde, a1.govde);
  const girisler = new Set();
  for (let i = 0; i < 12; i++) girisler.add(adayYap(o, { ...enst, id: `deneme${i}` }, seri).sablonYazi.govde.split('\n\n')[0]);
  assert.ok(girisler.size >= 2);
});

// --- hent-haberler akışı: Gemini'siz yazılır ---
const simdi = new Date('2026-10-12T09:00:00Z');
async function ortam(extra = {}) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'esik-'));
  await mkdir(path.join(rot, 'src/data'), { recursive: true });
  await mkdir(path.join(rot, 'src/content/haberler'), { recursive: true });
  const cagrilar = { gemini: 0, yaz: 0, kurul: 0 };
  return {
    cagrilar,
    rot,
    secenek: {
      rot,
      simdi,
      geminiVar: true,
      okuyucu: null,
      karneler: async () => [],
      gemini: async () => {
        cagrilar.gemini++;
        return { gruplar: [] };
      },
      log: () => {},
      ipucu: { hent: async () => [], onemArtir: (a) => a },
      yaz: async (a) => {
        cagrilar.yaz++;
        return { baslik: a.baslik, spot: 's', govde: 'g' };
      },
      yayinKurulu: async (t) => {
        cagrilar.kurul++;
        return { yazi: t };
      },
      bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
      piyasa: async () => ({ guncelleme: simdi.toISOString(), gostergeler: [] }),
      durum: { gorulen: {}, sonBulten: null, kaynaklar: { 'esik-olaylari': 'x', B: 'x' } },
      ...extra,
    },
  };
}

test('eşik olayı Gemini çağrılmadan şablonla yazılır: gruplama, yazar ve yayın kurulu yok; kapak sürer', async () => {
  const { o, enst, seri } = adaylar()[0];
  const aday = adayYap(o, enst, seri);
  const { secenek, cagrilar, rot } = await ortam({ kaynaklar: [{ ad: 'esik-olaylari', hent: async () => [aday] }] });
  const s = await calistir(secenek);
  assert.equal(s.adet, 1);
  assert.deepEqual(cagrilar, { gemini: 0, yaz: 0, kurul: 0 });
  assert.equal(secenek.durum.gorulen[aday.id].yazildi, true);
  const md = await readFile(path.join(rot, 'src/content/haberler', s.yazilar[0], 'index.md'), 'utf8');
  assert.match(md, /icerikTuru: "veri"/);
  assert.match(md, /cover: kapak\.png/);
  assert.ok(kelimeSay(md.split('\n---\n')[1]) >= 200);
  // ikinci tur: aynı olay yeniden yazılmaz
  assert.equal((await calistir(secenek)).adet, 0);
});

test('şablon yazılar MAKS_HABER sayısını tüketmez; yalnızca öteki haber Gemini kullanır', async () => {
  const sablonlar = adaylar().slice(0, 3).map(({ o, enst, seri }) => adayYap(o, enst, seri));
  const diger = { id: 'x1', baslik: 'Baslik x1', tarih: '2026-10-12T08:00:00Z', onem: 80, kategori: 'piyasalar', kaynaklar: [{ ad: 'K', url: 'https://k/x1' }] };
  diger.kaynakMetni = 'Uzun tam metin x1 '.repeat(5);
  const { secenek, cagrilar } = await ortam({ kaynaklar: [{ ad: 'esik-olaylari', hent: async () => sablonlar }, { ad: 'B', hent: async () => [diger] }], maksHaber: 1 });
  const s = await calistir(secenek);
  assert.equal(s.adet, 4);
  assert.equal(cagrilar.yaz, 1);
  assert.equal(cagrilar.kurul, 1);
  assert.equal(cagrilar.gemini, 1); // yalnızca öteki haberin gruplaması
});

test('şablon standart süzgecinden kırmızı çıkarsa yazılmaz ve elendi sayılır', async () => {
  const { o, enst, seri } = adaylar()[0];
  const aday = adayYap(o, enst, seri);
  const { secenek } = await ortam({
    kaynaklar: [{ ad: 'esik-olaylari', hent: async () => [aday] }],
    standart: () => ({ karar: 'kirmizi', kirmizi: [{ kural: 'deneme', ham: 'x' }], sari: [], gerekce: 'standart:kirmizi:deneme' }),
  });
  const s = await calistir(secenek);
  assert.equal(s.adet, 0);
  assert.equal(secenek.durum.gorulen[aday.id].elendi, true);
});
