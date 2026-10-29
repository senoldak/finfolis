import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { belirteclestir, ifadeKokleri, diziBul, kararda, bloklar, degisimSayisi, kesfet, izle, ifadeleriIzle, sonKararDegisimi, ifadeIziHesapla, vurgula } from './ppk-ifade.mjs';

test('küçük harf, kesme işareti ve noktalama temizlenir', () => {
  const t = belirteclestir('Para Politikası Kurulu (Kurul), Rapor’daki 37’den yüzde 36’ya, İNDİRİLMESİNE.');
  assert.deepEqual(t.map((x) => x.yuzey), ['para', 'politikası', 'kurulu', 'kurul', 'rapor', '37', 'yüzde', '36', 'indirilmesine']);
});

test('tr-TR büyük harf: I ve İ doğru küçülür', () => {
  assert.equal(belirteclestir('ISRAR İSTİKRAR')[0].yuzey, 'ısrar');
  assert.equal(belirteclestir('ISRAR İSTİKRAR')[1].yuzey, 'istikrar');
});

test('çekimli haller aynı köke iner', () => {
  assert.deepEqual(ifadeKokleri('duruşu'), ifadeKokleri('duruşunun'));
  assert.deepEqual(ifadeKokleri('sıkı para politikası duruşu'), ifadeKokleri('Sıkı para politikası duruşunun'));
});

test('ihtiyaç ve ihtiyatlı karışmaz', () => {
  assert.notDeepEqual(ifadeKokleri('ihtiyaç'), ifadeKokleri('ihtiyatlı'));
});

test('sayılar olduğu gibi kalır', () => {
  assert.deepEqual(ifadeKokleri('yüzde 35,5’ten'), ['yüzde', '35,5']);
});

test('diziBul art arda eşleşmeyi bulur, aradaki sözcük varsa bulmaz', () => {
  assert.equal(diziBul(['a', 'b', 'c', 'd'], ['b', 'c']), 1);
  assert.equal(diziBul(['a', 'b', 'c', 'd'], ['b', 'd']), -1);
  assert.equal(diziBul(['a'], []), -1);
});

test('bloklar ve değişim sayısı', () => {
  assert.deepEqual(bloklar([0, 1, 1, 0, 1]), [[1, 2], [4, 4]]);
  assert.deepEqual(bloklar([0, 0]), []);
  assert.equal(degisimSayisi([0, 1, 1, 0, 1]), 3);
  assert.equal(degisimSayisi([1, 1, 1]), 0);
});

test('kararda ifadenin geçtiği cümleyi birebir verir', () => {
  const c = ['Birinci cümle.', 'Sıkı para politikası duruşu sürecektir.'];
  const r = kararda(c, ifadeKokleri('sıkı para politikası duruşunun'));
  assert.equal(r.var, true);
  assert.equal(r.cumle, c[1]);
  assert.equal(kararda(c, ifadeKokleri('olmayan ifade')).var, false);
});

const SAHTE = [
  ['Kurul sabit kalan kalıp cümlesini korumuştur.', 'Özel ifade burada vardır şimdi.'],
  ['Kurul sabit kalan kalıp cümlesini korumuştur.', 'Özel ifade burada vardır şimdi.'],
  ['Kurul sabit kalan kalıp cümlesini korumuştur.'],
  ['Kurul sabit kalan kalıp cümlesini korumuştur.', 'Özel ifade burada vardır şimdi.'],
  ['Kurul sabit kalan kalıp cümlesini korumuştur.'],
].map((cumleler, i) => ({ id: `k${i}`, tarih: `2024-0${i + 1}-01`, cumleler }));

test('keşif: gelen giden ifadeyi bulur, her kararda olanı bulmaz, alt dizileri birleştirir', () => {
  const { ifadeler } = kesfet(SAHTE, { enAz: 3 });
  const metinler = ifadeler.map((a) => a.anahtar);
  assert.ok(metinler.some((m) => m.includes('özel ifade burada vardır')));
  assert.ok(!metinler.some((m) => m.includes('kalıp cümle')));
  // aynı bit dizisini paylaşan alt diziler tek ifadeye iner
  assert.equal(ifadeler.filter((a) => a.anahtar.includes('özel') || a.anahtar.includes('burada')).length, 1);
});

test('izle: bit dizisi, ilk, son, blok, şu an', () => {
  const { belirtec } = kesfet(SAHTE);
  const iz = izle(SAHTE, belirtec, ifadeKokleri('özel ifade burada'));
  assert.deepEqual(iz.bit, [1, 1, 0, 1, 0]);
  assert.equal(iz.ilk, '2024-01-01');
  assert.equal(iz.son, '2024-04-01');
  assert.equal(iz.simdi, false);
  assert.equal(iz.sayi, 3);
  assert.deepEqual(iz.bloklar.map((b) => b.adet), [2, 1]);
  assert.equal(iz.degisim, 3);
});

test('ifadeleriIzle: olmayan ifade atlanır', () => {
  const r = ifadeleriIzle(SAHTE, ['özel ifade burada', 'hiç geçmeyen ifade']);
  assert.equal(r.length, 1);
  assert.equal(r[0].ifade, 'özel ifade burada');
});

test('sonKararDegisimi: son metinde yeni, öncekinde kalan ifadeler; oran değişimi sayılmaz', () => {
  const k = [
    { tarih: '2024-01-01', cumleler: ['Kurul faizi yüzde 40’tan yüzde 38’e indirmiştir.', 'Eski tuhaf dizilim bu metinde yalnız vardı burada.'] },
    { tarih: '2024-02-01', cumleler: ['Kurul faizi yüzde 38’den yüzde 36’ya indirmiştir.', 'Yepyeni garip dizilim bu metinde yalnız vardır burada.'] },
  ];
  const { belirtec } = kesfet(k);
  const { giren, cikan } = sonKararDegisimi(k, belirtec);
  assert.ok(giren.some((g) => g.ifade.includes('yepyeni')));
  assert.ok(cikan.some((g) => g.ifade.includes('eski')));
  assert.ok(![...giren, ...cikan].some((g) => /^\d/.test(g.ifade)));
});

test('gerçek veri: kısa sürede çalışır, en çok 25 ifade, hiçbiri her kararda yok', () => {
  const d = JSON.parse(readFileSync(new URL('../data/ppk-metinler.json', import.meta.url), 'utf8'));
  const k = d.belgeler.filter((b) => b.tur === 'karar').sort((a, b) => a.tarih.localeCompare(b.tarih));
  const r = ifadeIziHesapla(k);
  assert.ok(r.ms < 3000, `süre ${r.ms} ms`);
  assert.ok(r.izler.length > 5 && r.izler.length <= 25);
  for (const i of r.izler) {
    assert.equal(i.bit.length, k.length);
    assert.ok(i.sayi >= 3 && i.sayi < k.length);
    // her ifade gerçekten ilk görüldüğü kararda cümle olarak var
    assert.equal(kararda(k[i.bit.indexOf(1)].cumleler, i.kokler).var, true);
  }
});

test('vurgula: ifadeyi birebir metinden ayırır', () => {
  const c = 'Kurul, sıkı para politikası duruşunu – yakından izleyecektir.';
  const bas = belirteclestir(c).findIndex((t) => t.kok === 'sıkı');
  assert.deepEqual(vurgula(c, bas, 4), ['Kurul,', 'sıkı para politikası duruşunu', '– yakından izleyecektir.']);
});
