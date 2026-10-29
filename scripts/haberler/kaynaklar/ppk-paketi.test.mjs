import { test } from 'node:test';
import assert from 'node:assert/strict';
import ppk, { ppkPaketiAdayi, ek, baslikKur, enCokDegisenler } from './ppk-paketi.mjs';
import { cumleFarki } from '../../../src/lib/ppk-fark.mjs';
import { sablonKontrol } from '../yayin-kurulu.mjs';
import { kapakCiz } from '../../kapak/kapak.mjs';

const EKI = [
  'Para Politikası Kurulu (Kurul), politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’de sabit tutulmasına karar vermiştir.',
  'Kurul ayrıca, Merkez Bankası gecelik vadede borç verme faiz oranını yüzde 40’ta, gecelik vadede borçlanma faiz oranını ise yüzde 35,5’te sabit tutmuştur.',
  'Aylık dalgalanmalara karşın, son dönem enflasyon gerçekleşmeleri ve öncü göstergeler enflasyonun ana eğiliminin gerilediğine işaret etmektedir.',
  'Para politikası kararları enflasyon görünümü odaklı, toplantı bazlı ve ihtiyatlı bir yaklaşımla alınmaktadır.',
  'Kurul, kararlarını öngörülebilir, veri odaklı ve şeffaf bir çerçevede alacaktır.',
];
const YENI = [
  'Para Politikası Kurulu (Kurul), politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir.',
  'Kurul ayrıca, Merkez Bankası gecelik vadede borç verme faiz oranını yüzde 40’tan yüzde 39’a, gecelik vadede borçlanma faiz oranını ise yüzde 35,5’ten yüzde 34,5’e indirmiştir.',
  'Aylık dalgalanmalara karşın, son dönem enflasyon gerçekleşmeleri ve öncü göstergeler ana eğilimdeki gerilemeyi teyit etmektedir.',
  'Adımların büyüklüğü ve zamanlaması enflasyon görünümü odaklı, toplantı bazlı ve ihtiyatlı bir yaklaşımla belirlenecektir.',
  'Kurul, kararlarını öngörülebilir, veri odaklı ve şeffaf bir çerçevede alacaktır.',
];
const belge = (id, tarih, cumleler, tur = 'karar') => ({ id, tur, tarih, baslik: 'Faiz Oranlarına İlişkin Basın Duyurusu', url: `https://www.tcmb.gov.tr/x/${id}`, paragraflar: cumleler, cumleler });
// İki karar + eski bir karar (ton serisi için üç nokta).
const METINLER = {
  belgeler: [
    belge('ppk_a', '2026-07-23', EKI),
    belge('ppk_b', '2026-09-10', EKI),
    belge('ppk_c', '2026-10-22', YENI),
  ],
};
const puan = (ileriYon, durus, alintilar) => ({ ileriYon, durus, gerekce: 'Faizin indirilmesi gevşeme yönünde bir işaret olarak okundu.', alintilar });
const TON = {
  puanlar: {
    ppk_a: puan(0.5, 2, []),
    ppk_b: puan(0.5, 2, []),
    ppk_c: puan(-1.5, 2, ['politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir.', 'Kurul, kararlarını öngörülebilir, veri odaklı ve şeffaf bir çerçevede alacaktır.']),
  },
};
const satir = (kod, faiz, faz, reel) => ({ kod, ad: kod, banka: kod, faiz, faz, reel, tufe: kod === 'TUR' ? { donem: '2026-08', deger: 31.51 } : null });
const DUNYA = {
  referansTarih: '2026-10-23',
  satirlar: [
    satir('BRA', 13.75, 'Gevşeme', 9.53),
    satir('COL', 12.25, 'Sıkılaştırma', 6.01),
    satir('TUR', 36, 'Gevşeme', 4.49),
    satir('MEX', 6.5, 'Gevşeme', 3.24),
    satir('IDN', 5.75, 'Sıkılaştırma', 2.56),
    satir('CHN', 3, 'Beklemede', 2.2),
    satir('USA', 3.875, 'Sıkılaştırma', 0.48),
    satir('GBR', 3.75, 'Beklemede', 0.66),
    satir('JPN', 1.25, 'Sıkılaştırma', -0.65),
    satir('XM', 2.5, 'Sıkılaştırma', -0.75),
    satir('CHE', 0, 'Beklemede', -0.81),
  ],
};
const SIMDI = new Date('2026-10-22T16:00:00+03:00');
const adayKur = (ek_ = {}) => ppkPaketiAdayi({ metinler: METINLER, ton: TON, dunya: DUNYA, simdi: SIMDI, ...ek_ });

test('ek: sayıdan sonra Türkçe ekler', () => {
  assert.equal(ek('37', 'ayrilma'), "37'den");
  assert.equal(ek('36', 'yonelme'), "36'ya");
  assert.equal(ek('37', 'bulunma'), "37'de");
  assert.equal(ek('40', 'ayrilma'), "40'tan");
  assert.equal(ek('40', 'bulunma'), "40'ta");
  assert.equal(ek('35,5', 'ayrilma'), "35,5'ten");
  assert.equal(ek('39', 'yonelme'), "39'a");
  assert.equal(ek('38', 'yonelme'), "38'e");
});

test('başlık: indirim, artış, sabit', () => {
  assert.equal(baslikKur({ onceki: 37, yeni: 36, karar: 'indirim' }), "PPK politika faizini %37'den %36'ya indirdi: karar metninde neler değişti");
  assert.equal(baslikKur({ onceki: 36, yeni: 38, karar: 'artis' }), "PPK politika faizini %36'dan %38'e yükseltti: karar metninde neler değişti");
  assert.equal(baslikKur({ onceki: 37, yeni: 37, karar: 'sabit' }), "PPK politika faizini %37'de sabit tuttu: karar metninde neler değişti");
});

test('enCokDegisenler: faiz cümleleri hariç, en çok değişen belge sırasıyla', () => {
  const f = cumleFarki(EKI, YENI);
  const s = enCokDegisenler(f.satirlar, 2);
  assert.equal(s.length, 2);
  assert.ok(s.every((x) => !/faiz oran/i.test(x.yeni)));
  assert.match(s[0].yeni, /ana eğilimdeki gerilemeyi|Adımların/);
});

test('tam aday: başlık, rakamlar, bölümler, bağlantılar ve açık yapay zekâ notu', () => {
  const a = adayKur();
  assert.equal(a.id, 'ppk-paketi:ppk_c');
  assert.equal(a.baslik, "PPK politika faizini %37'den %36'ya indirdi: karar metninde neler değişti");
  assert.equal(a.kategori, 'piyasalar');
  assert.equal(a.ucretli, false);
  assert.equal(a.onem, 90);
  assert.equal(a.ozet, undefined);
  assert.ok(!/^(tcmb|fed|ecb|boj|sec):/i.test(a.id), 'resmi önek taşımamalı (içerik türü resmi olmasın)');
  const g = a.sablonYazi.govde;
  assert.match(g, /yüzde 37'den yüzde 36'ya indirdi; değişim 100 baz puan/);
  assert.match(g, /5 cümlesinden 1 cümlesi önceki metinle aynı, 4 cümlesi değişmiş/);
  assert.match(g, /Önceki metin: “.*” Yeni metin: “.*”/);
  assert.match(g, /ileri yön puanı −1,5 \(ılımlı güvercin\)/);
  assert.match(g, /\+0,5 \(dengeli\)/);
  assert.match(g, /Bu puan bir yapay zekâ okumasıdır, TCMB'nin değerlendirmesi değildir/);
  assert.match(g, /finfolis'in yapay zekâ okumasına göre/);
  assert.match(g, /3\. sırada/);
  for (const yol of ['/veri/politika-faizi/', '/veri/ppk-karar-metni/', '/veri/ppk-tonu/', '/veri/dunya-politika-faizleri/']) assert.ok(g.includes(yol), yol);
  assert.deepEqual(a.sablonYazi.rakamlar.map((r) => r.etiket), ['Politika faizi', 'Önceki faiz', 'Değişen cümle', 'İleri yön puanı']);
  assert.equal(a.kaynaklar.length, 3);
  assert.equal(a.tarih.toISOString(), '2026-10-22T11:00:00.000Z');
});

test('şablon yazı kesin kontrolden geçer (her rakam ve alıntı kaynakMetni içinde)', () => {
  const a = adayKur();
  const r = sablonKontrol(a.sablonYazi, a);
  // Gövde 200 kelimenin altındaysa yalnızca kısalık sebebiyle düşer; rakam/alıntı sorunu olmamalı.
  if (r.dur) assert.match(r.dur, /kısa/);
  else assert.ok(r.yazi);
});

test('ton yoksa ton bölümü konmaz; yazı yine çıkar', () => {
  const a = adayKur({ ton: null });
  const g = a.sablonYazi.govde;
  assert.ok(!/yapay zekâ/.test(g));
  assert.ok(!g.includes('/veri/ppk-tonu/'));
  assert.ok(g.includes('/veri/dunya-politika-faizleri/'));
  assert.ok(!a.sablonYazi.rakamlar.some((r) => r.etiket === 'İleri yön puanı'));
  assert.equal(a.sablonYazi.rakamlar.at(-1).etiket, 'Reel faiz sırası');
  assert.equal(sablonKontrol(a.sablonYazi, a).dur?.match(/rakam|alıntı/), undefined);
});

test('yalnız önceki karar puanlıysa (bu karar puansız) ton bölümü yok', () => {
  const a = adayKur({ ton: { puanlar: { ppk_b: TON.puanlar.ppk_b } } });
  assert.ok(!/yapay zekâ/.test(a.sablonYazi.govde));
});

test('dünya verisi yoksa ya da TCMB oranı bu kararla uyuşmuyorsa dünya bölümü konmaz', () => {
  assert.ok(!adayKur({ dunya: null }).sablonYazi.govde.includes('dunya-politika-faizleri'));
  const geride = { ...DUNYA, satirlar: DUNYA.satirlar.map((s) => (s.kod === 'TUR' ? { ...s, faiz: 37 } : s)) };
  assert.ok(!adayKur({ dunya: geride }).sablonYazi.govde.includes('dunya-politika-faizleri'));
});

test('ton yokken kapak faiz rakamı kartıdır; ton varken grafiktir; ikisi de PNG çizer', async () => {
  const grafikli = adayKur();
  assert.match(grafikli.kapakAlt, /ileri yön puanı/);
  const png = await kapakCiz(grafikli.kapak);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const sade = adayKur({ ton: null });
  assert.equal(sade.kapakAlt, 'TCMB politika faizi %36');
  assert.equal((await kapakCiz(sade.kapak)).subarray(1, 4).toString(), 'PNG');
});

test('zaman penceresi: karardan önce ve duyuru gününden 2 gün sonrasından itibaren aday yok', () => {
  assert.equal(adayKur({ simdi: new Date('2026-10-22T10:00:00+03:00') }), null); // 14:00'ten önce
  assert.ok(adayKur({ simdi: new Date('2026-10-24T23:59:00+03:00') })); // 2. günün sonu
  assert.equal(adayKur({ simdi: new Date('2026-10-25T00:00:00+03:00') }), null);
});

test('aynı karar iki kez aday olmaz (goruldu)', () => {
  assert.equal(adayKur({ goruldu: (id) => id === 'ppk-paketi:ppk_c' }), null);
  assert.ok(adayKur({ goruldu: () => false }));
});

test('önceki karar yoksa ya da faiz kararı ayrıştırılamazsa aday yok', () => {
  assert.equal(adayKur({ metinler: { belgeler: [METINLER.belgeler[2]] } }), null);
  const bozuk = { belgeler: [METINLER.belgeler[1], belge('ppk_x', '2026-10-22', ['Kurul toplanmıştır.'])] };
  assert.equal(adayKur({ metinler: bozuk }), null);
});

test('toplantı özeti son belge olsa da son KARAR esas alınır', () => {
  const m = { belgeler: [...METINLER.belgeler, belge('ppk_o', '2026-10-27', ['Özet metni.'], 'ozet')] };
  assert.equal(adayKur({ metinler: m }).id, 'ppk-paketi:ppk_c');
});

test('sabit karar: başlık ve spot', () => {
  const m = { belgeler: [METINLER.belgeler[0], METINLER.belgeler[1], belge('ppk_s', '2026-10-22', EKI)] };
  const a = adayKur({ metinler: m, ton: null, dunya: null });
  assert.equal(a.baslik, "PPK politika faizini %37'de sabit tuttu: karar metninde neler değişti");
  assert.match(a.sablonYazi.spot, /yüzde 37'de sabit tuttu/);
});

test('hent: ctx verisiyle çalışır; veri okunamazsa boş döner', async () => {
  const l = await ppk.hent({ ppkMetinler: METINLER, ppkTon: TON, dunyaFaizleri: DUNYA, simdi: SIMDI, goruldu: () => false });
  assert.equal(l.length, 1);
  assert.equal(ppk.ad, 'ppk-paketi');
  const bos = await ppk.hent({ ppkMetinler: { belgeler: [] }, simdi: SIMDI });
  assert.deepEqual(bos, []);
});
