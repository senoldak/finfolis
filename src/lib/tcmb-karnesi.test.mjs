import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  erTahminleriCikar, ortaDeger, yilSonuTufe, erKarne, pkaEsle, hataOzeti, yilaGore, tonSinifi, tonIsabeti, kararlariCikar, tonKarnesi,
} from './tcmb-karnesi.mjs';

// Gerçek raporlardaki cümle kalıplarıyla kurulmuş kısa metinler (sayfa başlığı ve grafik başlığı dahil).
const ESKI = `3. Orta Vadeli Öngörüler 42
3.2 Orta Vadeli Görünüm Enflasyonun 2023 yılı sonunda yüzde 22,3 olarak gerçekleşeceği, 2024 yıl sonunda yüzde 8,8 ve 2025 yıl sonunda ise yüzde 5,0
seviyesine gerileyerek azalış eğilimini sürdüreceği tahmin edilmektedir (Grafik 3.2.1). Bu çerçevede, enflasyonun, yüzde 70 olasılıkla, 2023 yılı sonunda orta noktası yüzde 22,3 olmak üzere,
yüzde 17,8 ile yüzde 26,9 aralığında; 2024 yılı sonunda orta noktası yüzde 8,8 olmak üzere yüzde 4,0 ile yüzde 13,7 aralığında gerçekleşeceği tahmin edilmektedir.
Grafik 3.2.1: Enflasyon Tahminleri* (%) 50 40`;

const ARAHEDEFLI = `3.2 Orta Vadeli Görünüm Enflasyonun yüzde 70 olasılıkla, 2025 yıl sonunda yüzde 25 ile yüzde 29 aralığında; 2026 yıl sonunda ise yüzde 13 ile yüzde 19 aralığında gerçekleşeceği tahmin edilmektedir.
Enflasyonun 2027 yıl sonunda tek haneli seviyelere geriledikten sonra yüzde 5 seviyesinde istikrar kazanacağı öngörülmektedir (Grafik 3.2.1). 2025, 2026 ve 2027 yılları için ara hedefler sırasıyla
yüzde 24, yüzde 16 ve yüzde 9 olarak belirlenmiştir. Grafik 3.2.1: Enflasyon Tahminleri* (%)
Grafik sonrası: 2025 yılı için ara hedef yüzde 99 olarak belirlenmiştir.`;

const NOKTALI = `3.2 Orta Vadeli Görünüm Enflasyon ara hedefleri 2026, 2027 ve 2028 yılları için sırasıyla yüzde 24, yüzde 15 ve yüzde 9 olarak güncellenmiştir. Enflasyonun, 2026 yıl sonunda yüzde 26; 2027 yıl sonunda
ise yüzde 15 olarak gerçekleşeceği tahmin edilmektedir. 2028 yıl sonunda yüzde 9’a geriledikten sonra istikrar kazanacağı öngörülmektedir (Grafik 3.2.1). Grafik 3.2.1: Enflasyon Tahminleri (%)`;

const sirali = (l) => Object.fromEntries(l.map((t) => [t.yil, t]));

test('ER metni: nokta ve aralık; "(Grafik 3.2.1)" göndermesi bölümü bitirmez', () => {
  const t = sirali(erTahminleriCikar(ESKI));
  assert.deepEqual(t[2023], { yil: 2023, nokta: 22.3, alt: 17.8, ust: 26.9, araHedef: null });
  assert.deepEqual(t[2024], { yil: 2024, nokta: 8.8, alt: 4, ust: 13.7, araHedef: null });
  assert.deepEqual(t[2025], { yil: 2025, nokta: 5, alt: null, ust: null, araHedef: null });
});

test('ER metni: orta noktası yazılmayan aralık ve ara hedefler; grafikten sonraki metin sayılmaz', () => {
  const t = sirali(erTahminleriCikar(ARAHEDEFLI));
  assert.deepEqual(t[2025], { yil: 2025, nokta: null, alt: 25, ust: 29, araHedef: 24 });
  assert.deepEqual(t[2026], { yil: 2026, nokta: null, alt: 13, ust: 19, araHedef: 16 });
  assert.deepEqual(t[2027], { yil: 2027, nokta: null, alt: null, ust: null, araHedef: 9 });
});

test('ER metni: yalnız nokta tahmini ve ara hedef (aralık verilmeyen dönem)', () => {
  const t = sirali(erTahminleriCikar(NOKTALI));
  assert.deepEqual(t[2026], { yil: 2026, nokta: 26, alt: null, ust: null, araHedef: 24 });
  assert.deepEqual(t[2027], { yil: 2027, nokta: 15, alt: null, ust: null, araHedef: 15 });
  // 2028: nokta tahmini yok ("yüzde 9’a gerileyecek" ikinci cümlede), yalnız ara hedef
  assert.deepEqual(t[2028], { yil: 2028, nokta: null, alt: null, ust: null, araHedef: 9 });
});

test('ER metni: bölüm yoksa ya da aralık bozuksa hata', () => {
  assert.throws(() => erTahminleriCikar('başka metin'), /bulunamadı/);
  assert.throws(() => erTahminleriCikar('3.2 Orta Vadeli Görünüm 2024 yılı sonunda yüzde 30 ile yüzde 20 aralığında Grafik 3.2.1:'), /geçersiz/);
});

test('orta değer: açık nokta, yoksa aralığın ortası (işaretli), yoksa null', () => {
  assert.deepEqual(ortaDeger({ nokta: 24, alt: 19, ust: 29 }), { deger: 24, tur: 'acik' });
  assert.deepEqual(ortaDeger({ nokta: null, alt: 25, ust: 29 }), { deger: 27, tur: 'aralik-ortasi' });
  assert.deepEqual(ortaDeger({ nokta: null, alt: null, ust: null }), { deger: null, tur: null });
});

const ENF = [
  { yil: 2023, ay: 12, yillik: 64.77 },
  { yil: 2024, ay: 11, yillik: 47.09 },
  { yil: 2024, ay: 12, yillik: 44.38 },
  { yil: 2026, ay: 9, yillik: 29.73 },
];

test('gerçekleşen yıl sonu yalnız Aralık verisinden gelir', () => {
  const m = yilSonuTufe(ENF);
  assert.equal(m.get(2023), 64.77);
  assert.equal(m.get(2026), undefined);
});

test('ER karnesi: fark = gerçekleşen − orta; aralık durumu; gerçekleşmemiş yıl için fark yok', () => {
  const raporlar = [
    { id: 'b', donem: '2024-II', tarih: '2024-05-09', url: 'u2', tahminler: [{ yil: 2024, nokta: 38, alt: 34, ust: 42, araHedef: null }, { yil: 2026, nokta: 9, alt: null, ust: null, araHedef: null }] },
    { id: 'a', donem: '2024-I', tarih: '2024-02-08', url: 'u1', tahminler: [{ yil: 2024, nokta: 36, alt: 30, ust: 42, araHedef: null }] },
    { id: 'c', donem: '2024-IV', tarih: '2024-11-08', url: 'u3', tahminler: [{ yil: 2024, nokta: 44, alt: 42, ust: 46, araHedef: null }] },
  ];
  const k = erKarne(raporlar, ENF);
  assert.deepEqual(k.map((y) => y.yil), [2024, 2026]);
  const y24 = k[0];
  assert.equal(y24.gerceklesen, 44.38);
  assert.deepEqual(y24.satirlar.map((s) => s.donem), ['2024-I', '2024-II', '2024-IV']); // tarihe göre
  assert.deepEqual(y24.satirlar.map((s) => s.fark), [8.38, 6.38, 0.38]);
  assert.deepEqual(y24.satirlar.map((s) => s.aralikta), ['ust', 'ust', 'icinde']);
  assert.equal(y24.satirlar[0].ufuk, 0);
  const y26 = k[1];
  assert.equal(y26.gerceklesen, null);
  assert.equal(y26.sonVeri.yillik, 29.73);
  assert.equal(y26.satirlar[0].fark, null);
  assert.equal(y26.satirlar[0].ufuk, 2);
});

test('ER karnesi: ara hedefe göre fark ve aralık ortası işareti', () => {
  const k = erKarne([{ id: 'x', donem: '2025-III', tarih: '2025-08-14', url: 'u', tahminler: [{ yil: 2024, nokta: null, alt: 40, ust: 46, araHedef: 38 }] }], ENF);
  const s = k[0].satirlar[0];
  assert.equal(s.ortaTuru, 'aralik-ortasi');
  assert.equal(s.orta, 43);
  assert.equal(s.fark, 1.38);
  assert.equal(s.farkAraHedef, 6.38);
});

// PKA eşleştirme -------------------------------------------------------------------------------------------------
const BEK = [
  { yil: 2023, ay: 11, ay12: 30, ay24: 15 },
  { yil: 2023, ay: 12, ay12: 36, ay24: 20 },
  { yil: 2025, ay: 9, ay12: 25, ay24: 12 },
  { yil: 2025, ay: 10, ay12: null, ay24: null },
];

test('PKA: anket ayı t ile t+12 eşleşir; t+12 verisi yoksa eşleşme oluşmaz', () => {
  const e = pkaEsle(BEK, ENF);
  // 2023-11 → 2024-11 (47,09); 2023-12 → 2024-12 (44,38); 2025-09 → 2026-09 (29,73)
  assert.equal(e.length, 3);
  assert.deepEqual(e[0], { anketYil: 2023, anketAy: 11, hedefYil: 2024, hedefAy: 11, beklenti: 30, gerceklesen: 47.09, sapma: 17.09 });
  assert.equal(e[1].sapma, 8.38);
  assert.deepEqual([e[2].hedefYil, e[2].hedefAy, e[2].sapma], [2026, 9, 4.73]);
});

test('PKA hata ölçüleri: ortalama sapma (işaretli), ortalama mutlak sapma, son N', () => {
  const esler = [4, -2, 6, -4].map((sapma, i) => ({ anketYil: 2020, anketAy: i + 1, sapma }));
  const o = hataOzeti(esler, 2);
  assert.equal(o.tumu.n, 4);
  assert.equal(o.tumu.ortSapma, 1);
  assert.equal(o.tumu.ortMutlak, 4);
  assert.equal(o.son.n, 2);
  assert.equal(o.son.ortSapma, 1);
  assert.equal(o.son.ortMutlak, 5);
  assert.deepEqual(o.son.ilk, { yil: 2020, ay: 3 });
  assert.equal(hataOzeti([]).tumu.ortMutlak, null);
});

test('PKA: anket yılına göre ölçü', () => {
  const y = yilaGore([
    { anketYil: 2021, anketAy: 1, sapma: 10 },
    { anketYil: 2020, anketAy: 12, sapma: -2 },
    { anketYil: 2021, anketAy: 2, sapma: 20 },
  ]);
  assert.deepEqual(y.map((x) => [x.yil, x.n, x.ortSapma, x.ortMutlak]), [[2020, 1, -2, 2], [2021, 2, 15, 15]]);
});

// Ton karnesi ---------------------------------------------------------------------------------------------------
test('ton sınıfı ve isabet kuralı (eşik ±0,75)', () => {
  assert.equal(tonSinifi(-0.75), 'guvercin');
  assert.equal(tonSinifi(-0.5), 'dengeli');
  assert.equal(tonSinifi(0.75), 'sahin');
  assert.equal(tonIsabeti('guvercin', 'indirim'), true);
  assert.equal(tonIsabeti('guvercin', 'sabit'), false);
  assert.equal(tonIsabeti('sahin', 'artis'), true);
  assert.equal(tonIsabeti('sahin', 'sabit'), true);
  assert.equal(tonIsabeti('sahin', 'indirim'), false);
  assert.equal(tonIsabeti('dengeli', 'sabit'), true);
  assert.equal(tonIsabeti('dengeli', 'artis'), false);
});

test('kararlariCikar: yalnız karar belgeleri, faiz yönü metinden', () => {
  const k = kararlariCikar([
    { tur: 'karar', tarih: '2026-10-22', cumleler: ['Kurul, politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir.'] },
    { tur: 'ozet', tarih: '2026-10-29', cumleler: ['Özet metni.'] },
    { tur: 'karar', tarih: '2026-09-10', cumleler: ['Kurul belirsiz bir şey söyledi.'] },
  ]);
  assert.deepEqual([...k], [['2026-10-22', 'indirim']]);
});

test('ton karnesi: sonraki toplantının kararı, taban kural, yön değişimleri', () => {
  const d = [
    { toplanti: '2024-01-01', ileriYon: 2 }, // şahin; bugün artış → sonraki artış
    { toplanti: '2024-02-01', ileriYon: 1 }, // şahin; bugün artış → sonraki sabit (değişim, ton isabetli)
    { toplanti: '2024-03-01', ileriYon: 0 }, // dengeli; bugün sabit → sonraki indirim (değişim, ton yanlış)
    { toplanti: '2024-04-01', ileriYon: -2 }, // güvercin; bugün indirim → sonraki sabit (değişim, ton yanlış)
    { toplanti: '2024-05-01', ileriYon: null }, // ton yok
  ];
  const kararlar = new Map([['2024-01-01', 'artis'], ['2024-02-01', 'artis'], ['2024-03-01', 'sabit'], ['2024-04-01', 'indirim'], ['2024-05-01', 'sabit']]);
  // Sonraki kararlar: 02-01 → artis, 03-01 → sabit, 04-01 → indirim, 05-01 → sabit.
  const r = tonKarnesi(d, kararlar);
  const s = r.satirlar;
  assert.deepEqual(s.map((x) => x.sonraki), ['artis', 'sabit', 'indirim', 'sabit', null]);
  assert.deepEqual(s.map((x) => x.tonIsabet), [true, true, false, false, null]);
  assert.deepEqual(s.map((x) => x.tabanIsabet), [true, false, false, false, null]);
  assert.equal(r.n, 4);
  assert.equal(r.tonIsabet, 2);
  assert.equal(r.tabanIsabet, 1);
  assert.deepEqual(r.degisim, { n: 3, tonIsabet: 1 });
  assert.deepEqual(r.siniflar.sahin, { n: 2, isabet: 2 });
  assert.deepEqual(r.siniflar.guvercin, { n: 1, isabet: 0 });
  assert.deepEqual(r.sonrakiYok, []);
});

test('ton karnesi: son toplantının sonraki kararı yoksa ölçülmez ve listelenir', () => {
  const r = tonKarnesi([{ toplanti: '2024-01-01', ileriYon: 2 }, { toplanti: '2024-02-01', ileriYon: 1 }], new Map([['2024-01-01', 'artis'], ['2024-02-01', 'sabit']]));
  assert.equal(r.n, 1);
  assert.deepEqual(r.sonrakiYok, ['2024-02-01']);
});
