import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enstrumanBul, haberGrafigi, fredCsv, ecbCsv, basamakli, faizGrafigi } from './grafik-kapak.mjs';
import { kapakCiz } from '../kapak/kapak.mjs';

test('eşleştirme: başlıkta ilk anılan araç; Türkçe ekler ve büyük harf; benzer sözcükler eşleşmez', () => {
  const id = (b) => enstrumanBul(b)?.id ?? null;
  assert.equal(id('Brent petrol OPEC kararıyla yükseldi'), 'brent');
  assert.equal(id('BIST 100 günü düşüşle kapattı'), 'bist100');
  assert.equal(id('ALTIN REKORDA'), 'altin');
  assert.equal(id('Gram altın 5 bin lirayı aştı'), 'gramaltin');
  assert.equal(id("Nvidia'nın geliri beklentiyi aştı"), 'nvda');
  assert.equal(id('Fed kararı öncesi altın ve gümüş'), 'altin');
  assert.equal(id("ABD'de 10 yıllık tahvil faizi yükseldi"), 'abd10y');
  assert.equal(id('Dolar/TL güne yükselişle başladı'), 'usdtry');
  // Ülke + borsa/hisse/piyasa: o ülkenin ana endeksi.
  assert.equal(id('Hindistan hisse senedi piyasası geriledi'), 'nifty');
  assert.equal(id('Endonezya hisseleri altı yılın en düşük seviyesinde'), 'jakarta');
  assert.equal(id('Japon borsası sert düştü'), 'nikkei');
  assert.equal(id('Wall Street rekorla kapandı'), 'sp500');
  assert.equal(id('Güney Kore emeklilik fonu hisse senetlerinde zarar etti'), null);
  assert.equal(id('Japon sigorta şirketi satın alma teklifi verdi'), null);
  // "altında", "yeni", "garanti etti", "sap" eşleşmez.
  assert.equal(id('Enflasyon beklentilerin altında kaldı'), null);
  assert.equal(id('Yeni yatırım planı açıklandı'), null);
  assert.equal(id('Hükümet ödemeyi garanti etti'), null);
  assert.equal(id('Sap kırıldı'), null);
});

function seri(gun, bitis = '2026-10-16', f = (i) => 100 + i) {
  const out = [];
  for (let i = gun - 1, t = Date.parse(`${bitis}T00:00:00Z`); i >= 0; i--, t -= 864e5) out.unshift({ tarih: new Date(t).toISOString().slice(0, 10), deger: f(i) });
  return out;
}

test('haber grafiği: altı aylık seri, vurgu ve üst satır; veri bayatsa ya da eşleşme yoksa null', async () => {
  const s = seri(400);
  const okuyucu = { seri: async () => s };
  const simdi = new Date('2026-10-17T09:00:00Z');
  const o = { kategori: 'piyasalar', tarih: '2026-10-17T08:00:00Z' };
  const g = await haberGrafigi({ baslik: 'Brent petrol haftayı yükselişle kapattı' }, o, okuyucu, simdi);
  assert.match(g.kapakAlt, /^Brent petrol son altı ay günlük kapanış grafiği: altı ayda \+%/);
  assert.equal((await kapakCiz(g.kapak)).subarray(1, 4).toString(), 'PNG');
  assert.equal(await haberGrafigi({ baslik: 'Şirket yeni CEO atadı' }, o, okuyucu, simdi), null);
  assert.equal(await haberGrafigi({ baslik: 'Brent yükseldi' }, o, null, simdi), null);
  const bayat = { seri: async () => seri(400, '2026-10-01') };
  assert.equal(await haberGrafigi({ baslik: 'Brent yükseldi' }, o, bayat, simdi), null);
  const hatali = { seri: async () => { throw new Error('ağ yok'); } };
  const hata = console.error;
  console.error = () => {};
  try {
    assert.equal(await haberGrafigi({ baslik: 'Brent yükseldi' }, o, hatali, simdi), null);
  } finally {
    console.error = hata;
  }
});

test('faiz serileri: FRED ve ECB CSV okunur; değişiklik listesi basamaklı seriye çevrilir', () => {
  assert.deepEqual(fredCsv('observation_date,DFEDTARU\n2026-10-16,4.00\n2026-10-17,.\n2026-10-18,4.00\n'), [
    { tarih: '2026-10-16', deger: 4 },
    { tarih: '2026-10-18', deger: 4 },
  ]);
  const ecb = 'KEY,FREQ,TIME_PERIOD,OBS_VALUE,OBS_STATUS\nFM.D,D,2026-10-17,2.5,A\nFM.D,D,2026-10-18,2.25,A\n';
  assert.deepEqual(ecbCsv(ecb), [
    { tarih: '2026-10-17', deger: 2.5 },
    { tarih: '2026-10-18', deger: 2.25 },
  ]);
  assert.deepEqual(basamakli([{ tarih: '2025-01-23', oran: 45 }, { tarih: '2026-01-23', oran: 37 }], '2026-10-18'), [
    { tarih: '2025-01-23', deger: 45 },
    { tarih: '2026-01-22', deger: 45 },
    { tarih: '2026-01-23', deger: 37 },
    { tarih: '2026-10-18', deger: 37 },
  ]);
});

test('TCMB faiz grafiği resmi.json geçmişinden; seride olmayan yeni oran duyuru gününe eklenir', async () => {
  const g = await faizGrafigi({ kurum: 'TCMB', konu: 'TCMB politika faizi %35,0', kategori: 'piyasalar', tarih: new Date('2026-10-18T00:00:00Z'), yeni: 35 });
  assert.match(g.kapakAlt, /güncel oran yüzde 35,00/);
  assert.equal((await kapakCiz(g.kapak)).subarray(1, 4).toString(), 'PNG');
  assert.equal(await faizGrafigi({ kurum: 'BoJ', konu: 'x', kategori: 'ekonomi' }), null);
});
