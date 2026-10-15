import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import esik, { olaylariBul, adayYap, kapanislar, ENSTRUMANLAR, GUNLUK_AZAMI, TR_AZAMI, rekorDenetle, tavanUygula } from './esik-olaylari.mjs';
import { dogrula } from '../dogrula.mjs';
import { kapakCiz } from '../../kapak/kapak.mjs';

const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});

const BIST = ENSTRUMANLAR.find((e) => e.id === 'bist100');
const BTC = ENSTRUMANLAR.find((e) => e.id === 'bitcoin');

// Her iş günü bir nokta; degerler(i) i. günün kapanışı. Başlangıç 2016-01-04.
function seriYap(gun, degerler) {
  const out = [];
  let t = Date.UTC(2016, 0, 4);
  for (let i = 0; i < gun; i++) {
    while ([0, 6].includes(new Date(t).getUTCDay())) t += 864e5;
    out.push({ tarih: new Date(t).toISOString().slice(0, 10), deger: degerler(i) });
    t += 864e5;
  }
  return out;
}
const N = 2600; // ~10 yıl

test('son kapanış serinin en yükseğiyse rekor olayı çıkar', () => {
  const seri = seriYap(N, (i) => (i === N - 1 ? 2000 : 1000 + (i % 50)));
  const o = olaylariBul(seri, BIST);
  assert.deepEqual(o.map((x) => x.tur), ['rekor']);
  assert.equal(o[0].referans.deger, 1049);
});

test('aynı gün rekor ve dipten yükseliş varsa yalnızca rekor haber olur', () => {
  // Son yılın dibi 800, son kapanış 2000: hem rekor hem +%150; tek olay.
  const seri = seriYap(N, (i) => (i === N - 100 ? 800 : i === N - 1 ? 2000 : 1000 + (i % 50)));
  assert.deepEqual(olaylariBul(seri, BIST).map((x) => x.tur), ['rekor']);
});

test('seri beş yıldan kısaysa "tüm zamanlar" denmez', () => {
  const seri = seriYap(800, (i) => (i === 799 ? 2000 : 1000 + (i % 50)));
  assert.ok(!olaylariBul(seri, BIST).some((x) => x.tur === 'rekor'));
});

test('çok yıllık zirve: son kapanış 2 yıldan uzun süredir görülmemiş seviyede', () => {
  // Başta 3000'lik tepe, sonra 1000 civarı; son yıl kademeli yükseliş (dipten yükseliş eşiği çoktan aşıldı, taze değil).
  const k = N - 250;
  const seri = seriYap(N, (i) => (i === 10 ? 3000 : i > k ? 1000 + (i - k) * 6 + (i % 2) * 10 : 1000 + (i % 50)));
  const o = olaylariBul(seri, BIST);
  assert.equal(o[0].tur, 'yuksek');
  assert.ok(o[0].yil >= 9);
  assert.equal(o[0].referans.deger, 3000);
});

test('zirveden yüzde 10 düşüş, eşik son günlerde aşıldıysa haber olur; eskiyse olmaz', () => {
  // Düz 1000, son yıl içinde 1500 zirve, sonra kademeli düşüş; eşik (1350) son 3 günde aşılıyor.
  const z = N - 60;
  const f = (i) => (i < z ? 1000 : i === z ? 1500 : i < N - 3 ? 1400 : 1340);
  const o = olaylariBul(seriYap(N, f), BIST);
  const d = o.find((x) => x.tur === 'dusus');
  assert.equal(d.esik, 10);
  assert.equal(d.referans.deger, 1500);
  // Aynı düşüş 20 gün önce yaşandıysa artık taze değil.
  const eski = (i) => (i < z ? 1000 : i === z ? 1500 : i < N - 20 ? 1400 : 1340);
  assert.ok(!olaylariBul(seriYap(N, eski), BIST).some((x) => x.tur === 'dusus'));
});

test('derin eşik aşılıp fiyat toparlanınca sığ eşik ikinci kez haber olmaz', () => {
  const z = N - 60;
  // Zirve 1500 → 1100 (-%26,7, %20 aşıldı) → 1300'e toparlanma (-%13,3): %10 yeniden haber değil.
  const f = (i) => (i < z ? 1000 : i === z ? 1500 : i < N - 10 ? 1100 : 1300);
  assert.ok(!olaylariBul(seriYap(N, f), BIST).some((x) => x.tur === 'dusus'));
});

test('Bitcoin için yüzde 10 düşüş haber değil, eşik 20', () => {
  const z = N - 60;
  const f = (i) => (i < z ? 1000 : i === z ? 1500 : i < N - 3 ? 1400 : 1340);
  assert.ok(!olaylariBul(seriYap(N, f), BTC).some((x) => x.tur === 'dusus'));
});

test('dipten yüzde 20 yükseliş taze aşıldıysa haber olur', () => {
  const d = N - 60;
  const f = (i) => (i < d ? 1000 : i === d ? 800 : i < N - 2 ? 900 : 970);
  const o = olaylariBul(seriYap(N, f), BIST).find((x) => x.tur === 'yukselis');
  assert.equal(o.esik, 20);
  assert.equal(o.referans.deger, 800);
});

test('aday: kimlik, kaynak metni rakamları ve Türkçe yazılmış cümle doğrulamadan geçer', async () => {
  const z = N - 60;
  const seri = seriYap(N, (i) => (i < z ? 1000 : i === z ? 15133.5 : i < N - 3 ? 14000 : 11947.2));
  const o = olaylariBul(seri, BIST).find((x) => x.tur === 'dusus');
  const a = adayYap(o, BIST, seri);
  assert.equal(a.id, `esik:bist100:dusus-20:${seri[z].tarih}`);
  assert.equal(a.kategori, 'borsa');
  assert.equal(a.onem, 4);
  assert.match(a.baslik, /yüzde 20'nin üzerinde geriledi/);
  assert.match(a.kaynakMetni, /ayı piyasası/);
  const cumle = `BIST 100 11.947,20 puandan kapandı ve 15.133,50 puanlık zirvesinin yüzde 21,1 altına indi. Zirveden yüzde 20 ve üzeri düşüşe ayı piyasası denir.`;
  assert.deepEqual(dogrula(cumle, [a.kaynakMetni]).eksik, []);
  const png = await kapakCiz(a.kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('rekor ve çok yıllık olaylar ay başına bir kimlik alır', () => {
  const seri = seriYap(N, (i) => (i === N - 1 ? 2000 : 1000 + (i % 50)));
  const a = adayYap(olaylariBul(seri, BIST)[0], BIST, seri);
  assert.equal(a.id, `esik:bist100:rekor:${seri.at(-1).tarih.slice(0, 7)}`);
  assert.match(a.kaynakMetni, /all-time high/);
});

// Yahoo yanıtı: zaman damgaları saniye; son çubuk bugüne ait.
function yahoo(gunler, { bitis } = {}) {
  return {
    chart: {
      result: [
        {
          meta: { exchangeTimezoneName: 'Europe/Istanbul', currentTradingPeriod: { regular: { end: bitis } } },
          timestamp: gunler.map(([t]) => Date.parse(`${t}T07:00:00Z`) / 1000),
          indicators: { quote: [{ close: gunler.map(([, v]) => v), high: gunler.map(([, v]) => v) }] },
        },
      ],
    },
  };
}

test('işlem sürerken bugünkü çubuk atılır, kapanıştan sonra kalır; boş kapanışlar atlanır', () => {
  const simdi = new Date('2026-10-15T10:00:00Z');
  const v = yahoo([['2026-10-13', 10], ['2026-10-14', null], ['2026-10-15', 12]], { bitis: Date.parse('2026-10-15T15:00:00Z') / 1000 });
  assert.deepEqual(kapanislar(v, simdi).map((p) => p.tarih), ['2026-10-13']);
  const sonra = new Date('2026-10-15T16:00:00Z');
  assert.deepEqual(kapanislar(v, sonra).map((p) => p.tarih), ['2026-10-13', '2026-10-15']);
});

test('hent: bir enstrümanın hatası diğerlerini durdurmaz', async () => {
  const seri = seriYap(N, (i) => (i === N - 1 ? 2000 : 1000 + (i % 50)));
  const govde = JSON.stringify(yahoo(seri.map((p) => [p.tarih, p.deger])));
  globalThis.fetch = async (url) => (String(url).includes('XU100') ? new Response(govde) : new Response('hata', { status: 500 }));
  const hata = console.error;
  console.error = () => {};
  try {
    const adaylar = await esik.hent({ simdi: new Date('2030-01-01T00:00:00Z') });
    assert.equal(esik.ad, 'esik-olaylari');
    assert.deepEqual(adaylar.map((a) => a.id), [`esik:bist100:rekor:${seri.at(-1).tarih.slice(0, 7)}`]);
  } finally {
    console.error = hata;
  }
});

test('tek günlük aşırı sıçrama (düzeltilmemiş bölünme/bedelsiz) varsa hissede olay aranmaz', () => {
  const thy = ENSTRUMANLAR.find((e) => e.id === 'thyao');
  const z = N - 60;
  // Bedelsiz sonrası fiyat yarıya inmiş gibi: -%50 tek gün; sahte "zirveden düşüş" yazılmamalı.
  const f = (i) => (i < z ? 1000 : i < N - 3 ? 1500 : 700);
  assert.deepEqual(olaylariBul(seriYap(N, f), thy), []);
  // Endekste sıçrama sınırı yok: aynı seri olay üretir.
  assert.ok(olaylariBul(seriYap(N, f), BIST).length > 0);
});

test('parite dört ondalıkla yazılır, kapakta binlik ayırıcı ondalığı bozmaz', async () => {
  const eur = ENSTRUMANLAR.find((e) => e.id === 'eurusd');
  const k = N - 250;
  const seri = seriYap(N, (i) => (i === 10 ? 1.6 : i > k ? 1.05 + (i - k) * 0.0012 + (i % 2) * 0.002 : 1.05 + (i % 50) / 1000));
  const o = olaylariBul(seri, eur)[0];
  assert.equal(o.tur, 'yuksek');
  const a = adayYap(o, eur, seri);
  assert.match(a.kaynakMetni, /daily close: 1\.3508 on/);
  assert.match(a.kapakAlt, /1,3508$/);
  const png = await kapakCiz(a.kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
});

test('günlük tavan: son 24 saatte görülen eşik olayları hakkı düşürür, öncelik sırası korunur', async () => {
  const rekor = seriYap(N, (i) => (i === N - 1 ? 2000 : 1000 + (i % 50)));
  const govde = JSON.stringify(yahoo(rekor.map((p) => [p.tarih, p.deger])));
  globalThis.fetch = async () => new Response(govde);
  const simdi = new Date('2030-01-01T00:00:00Z');
  const gorulen = {
    'esik:x:rekor:2029-12': { zaman: '2029-12-31T12:00:00Z' },
    'esik:y:rekor:2029-12': { zaman: '2029-12-30T12:00:00Z' }, // 24 saatten eski, sayılmaz
    'kur:dolar:2029-12-31': { zaman: '2029-12-31T12:00:00Z' }, // eşik olayı değil
  };
  const adaylar = await esik.hent({ simdi, gorulen });
  assert.equal(adaylar.length, GUNLUK_AZAMI - 1);
  // Hepsi aynı veriyle rekor; önce sira 1 (endeks/altın/ana pariteler).
  for (const a of adaylar) assert.equal(ENSTRUMANLAR.find((e) => a.id.startsWith(`esik:${e.id}:`)).sira, 1);
  // Daha önce görülen aday tavana sayılmaz ve dönmez.
  const ilk = adaylar[0].id;
  const tekrar = await esik.hent({ simdi, gorulen, goruldu: (id) => id === ilk });
  assert.ok(!tekrar.some((a) => a.id === ilk));
  assert.equal(tekrar.length, GUNLUK_AZAMI - 1);
});

const SP = ENSTRUMANLAR.find((e) => e.id === 'sp500');
const EUR = ENSTRUMANLAR.find((e) => e.id === 'eurusd');

test('olağandışı gün: aynı yönde bu kadar sert gün bir yıldır yoksa haber, kaynakta önceki gün yazılır', () => {
  // Sakin dalgalanma (±%0,5), 3 yıl önce bir kez -%5, bugün -%4.
  const f = (i) => (i === N - 800 ? 950 : i === N - 1 ? 960 : 1000 + (i % 2) * 5);
  const seri = seriYap(N, f);
  const o = olaylariBul(seri, SP)[0];
  assert.equal(o.tur, 'olagandisi');
  assert.ok(o.yuzde < -3.9);
  const a = adayYap(o, SP, seri);
  assert.equal(a.id, `esik:sp500:olagandisi:${seri.at(-1).tarih}`);
  assert.match(a.baslik, /son \d+ yılın en sert günlük düşüşünü yaşadı/);
  // Eşik altı hareket (−%2) haber değil.
  assert.ok(!olaylariBul(seriYap(N, (i) => (i === 10 ? 900 : i === N - 1 ? 985 : 1000 + (i % 2) * 5)), SP).some((x) => x.tur === 'olagandisi'));
});

test('seri: üst üste yükseliş bir yıldır görülmemiş uzunluktaysa haber; kimlik seri başı', () => {
  // Zikzak, son 9 gün art arda +1.
  const bas = N - 10;
  const f = (i) => (i === 10 ? 3000 : i > bas ? 1000 + (i - bas) : 1000 + (i % 2) * 3);
  const seri = seriYap(N, f);
  const o = olaylariBul(seri, SP)[0];
  assert.equal(o.tur, 'seri');
  assert.equal(o.uzunluk, 9);
  const a = adayYap(o, SP, seri);
  assert.equal(a.id, `esik:sp500:seri-yukari:${seri[bas].tarih}`);
  assert.match(a.baslik, /üst üste 9 işlem günüdür yükseliyor/);
  assert.match(a.kaynakMetni, /9 consecutive trading days/);
});

test('pariteye rekor yazılmaz: seri tepesi "verinin başından beri en yüksek" olur', () => {
  // Son 300 günde zikzaklı, yavaş yükseliş (seri yok, olağandışı gün yok); son gün serinin tepesi.
  const k = N - 300;
  const seri = seriYap(N, (i) => (i > k ? 1.15 + (i - k) * 0.0025 + (i % 2) * 0.004 : 1.1 + (i % 50) / 1000));
  const o = olaylariBul(seri, EUR)[0];
  assert.equal(o.tur, 'yuksek');
  assert.equal(o.veriBasi, seri[0].tarih);
  const a = adayYap(o, EUR, seri);
  assert.match(a.baslik, /son 9 yılın en yüksek seviyesinde/);
  assert.match(a.kaynakMetni, /since the daily data series begins/);
});

test('rekor denetimi: 30 yıldan eski aylık tepe daha yüksekse rekor yazılmaz', () => {
  const seri = seriYap(N, (i) => (i === N - 1 ? 2000 : 1000 + (i % 50)));
  const o = olaylariBul(seri, SP)[0];
  assert.equal(o.tur, 'rekor');
  assert.equal(rekorDenetle(o, seri, 1500), o);
  const inen = rekorDenetle(o, seri, 2500);
  assert.equal(inen.tur, 'yuksek');
  assert.equal(inen.veriBasi, seri[0].tarih);
});

test('tavan: Türkiye olayları ayrıca sınırlanır, öncelik sırası korunur', () => {
  const a = (id, sira, tr) => ({ id, _sira: sira, _tur: 0, _tr: tr });
  const sonuc = tavanUygula([a('t1', 1, true), a('t2', 1, true), a('t3', 1, true), a('d1', 2, false), a('d2', 3, false)], { toplam: 4, tr: TR_AZAMI });
  assert.deepEqual(sonuc.map((x) => x.id), ['t1', 't2', 'd1', 'd2']);
  assert.ok(!('_sira' in sonuc[0]));
});
