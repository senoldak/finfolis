import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yayinKurulu } from './yayin-kurulu.mjs';

const aday = { id: 'x', baslik: 'Fed', kaynakMetni: 'The Federal Reserve kept the target range at 4.25 percent to 4.5 percent.', kaynaklar: [] };
const iyi = { baslik: 'Fed faizi sabit tuttu', spot: 'Fed, hedef aralığı yüzde 4,25-4,5 olarak korudu.', govde: 'Fed’e göre aralık yüzde 4,25 ile 4,5 arasında kaldı.\n\n## Neden önemli?\n\nKredi maliyetlerini etkiler.' };
const kotu = { ...iyi, govde: iyi.govde + '\n\nEnflasyon yüzde 7,9 oldu.' };

// Şema türüne göre yanıt veren sahte Gemini
function sahte({ duzelt }) {
  const cagrilar = [];
  const gemini = async ({ sema, istem }) => {
    cagrilar.push(istem);
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    if (istem.includes('SORUNLAR')) return duzelt();
    return null; // redaksiyon: değişiklik yok
  };
  return { enAzKelime: 0, gemini, cagrilar };
}

test('uydurma rakam düzeltilir ve geçer', async () => {
  const { gemini } = sahte({ duzelt: () => iyi });
  const r = await yayinKurulu(kotu, aday, { enAzKelime: 0, gemini });
  assert.deepEqual(r, { yazi: iyi });
});

test('2 turdan sonra hâlâ yanlışsa dur', async () => {
  const { gemini } = sahte({ duzelt: () => kotu });
  const r = await yayinKurulu(kotu, aday, { enAzKelime: 0, gemini });
  assert.ok(r.dur);
  assert.match(r.dur, /7,9/);
});

test('kontrol masası reddederse dur', async () => {
  const gemini = async ({ sema, istem }) => (sema.properties.onay ? { onay: false, sorunlar: ['Yatırım tavsiyesi var'] } : istem.includes('SORUNLAR') ? iyi : null);
  const r = await yayinKurulu(iyi, aday, { enAzKelime: 0, gemini });
  assert.match(r.dur, /tavsiye/);
});

test('Gemini yoksa dur', async () => {
  const r = await yayinKurulu(iyi, aday, { enAzKelime: 0, gemini: async () => null });
  assert.ok(r.dur);
});

// Redaksiyon istemi "redaksiyon" kelimesiyle ayırt edilir.
function redStub(redCikti, masa = () => ({ onay: true, sorunlar: [] })) {
  return async ({ sema, istem }) => {
    if (sema.properties.onay) return masa(istem);
    if (istem.includes('redaksiyonunu')) return redCikti;
    return iyi;
  };
}

test('redaksiyon uydurma rakam eklerse önceki metin yayınlanır', async () => {
  const r = await yayinKurulu(iyi, aday, { enAzKelime: 0, gemini: redStub({ ...iyi, spot: iyi.spot + ' Oran 9,9 oldu.' }) });
  assert.deepEqual(r, { yazi: iyi });
});

test('redaksiyon nedensellik ekler, masa reddederse önceki metin yayınlanır', async () => {
  const ekli = { ...iyi, govde: iyi.govde + ' Bu yüzden borsa yükseldi.' };
  const masa = (istem) => (istem.includes('Bu yüzden') ? { onay: false, sorunlar: ['Kaynaksız neden-sonuç'] } : { onay: true, sorunlar: [] });
  const r = await yayinKurulu(iyi, aday, { enAzKelime: 0, gemini: redStub(ekli, masa) });
  assert.deepEqual(r, { yazi: iyi });
});

test('masa önce reddeder, bir düzeltmeden sonra onaylar', async () => {
  let n = 0;
  const masa = () => (n++ === 0 ? { onay: false, sorunlar: ['Atıf yok'] } : { onay: true, sorunlar: [] });
  const r = await yayinKurulu({ ...iyi, baslik: 'Eski' }, aday, { enAzKelime: 0, gemini: redStub(null, masa) });
  assert.deepEqual(r, { yazi: iyi });
});

test('redaksiyon özel adı küçültür ya da satırları silerse atılır', async () => {
  const { bicimKorunur } = await import('./yayin-kurulu.mjs');
  const once = { baslik: 'Trex Bio halka arz izahnamesini sundu', govde: 'A.\n\n## Neden önemli?\n\nB.' };
  assert.equal(bicimKorunur(once, { ...once, baslik: 'Trex bio halka arz izahnamesini sundu' }), false);
  assert.equal(bicimKorunur(once, { ...once, govde: 'A. ## Neden önemli? B.' }), false);
  assert.equal(bicimKorunur(once, { ...once, baslik: 'Trex Bio halka arz izahnamesi sundu' }), true);
});

const seritAday = { id: 's', baslik: 'Fed', kaynakMetni: 'The Fed kept the range at 4.25 percent. Next meeting on November 12, 2026 (12 Kasım 2026).', kaynaklar: [] };
const seritliYazi = (ek) => ({ baslik: 'Fed faizi sabit tuttu', spot: 'Fed, aralığı yüzde 4,25 olarak korudu.', govde: 'Fed, aralığı yüzde 4,25 olarak korudu.', ...ek });
const onayGemini = async ({ sema }) => (sema.properties.onay ? { onay: true, sorunlar: [] } : null);

test('şeritteki kaynakta olmayan rakam şeritten düşer, haber durmaz', async () => {
  const r = await yayinKurulu(
    seritliYazi({ rakamlar: [{ etiket: 'Faiz', deger: '4,25' }, { etiket: 'Enflasyon', deger: '7,9' }] }),
    seritAday, { enAzKelime: 0, gemini: onayGemini });
  assert.ok(!r.dur);
  assert.deepEqual(r.yazi.rakamlar, [{ etiket: 'Faiz', deger: '4,25' }]);
});

test('şerit en fazla 4 rakam', async () => {
  const dort = ['4,25', '4,25', '4,25', '4,25', '4,25'].map((deger, i) => ({ etiket: 'E' + 'abcde'[i], deger }));
  const r = await yayinKurulu(seritliYazi({ rakamlar: dort }), seritAday, { enAzKelime: 0, gemini: onayGemini });
  assert.equal(r.yazi.rakamlar.length, 4);
});

test('sirada.tarih kaynakta yoksa sirada silinir', async () => {
  const r = await yayinKurulu(seritliYazi({ sirada: { tarih: '17 Aralık 2026', olay: 'Toplantı' } }), seritAday, { enAzKelime: 0, gemini: onayGemini });
  assert.ok(!r.dur);
  assert.equal(r.yazi.sirada, undefined);
});

test('sirada.tarih kaynakta varsa (İngilizce biçimde de) kalır', async () => {
  const r = await yayinKurulu(seritliYazi({ sirada: { tarih: '12 Kasım 2026', olay: 'Toplantı' } }), { ...seritAday, kaynakMetni: seritAday.kaynakMetni.replace('(12 Kasım 2026)', '') }, { enAzKelime: 0, gemini: onayGemini });
  assert.equal(r.yazi.sirada.olay, 'Toplantı');
});

test('şerit ve sirada metni kesin kontrole girer (kaynakta olmayan rakam durdurur)', async () => {
  const r = await yayinKurulu(seritliYazi({ sirada: { tarih: '12 Kasım 2026', olay: 'Faiz 9,9 olabilir' } }), seritAday, { enAzKelime: 0, gemini: onayGemini });
  assert.ok(!r.dur);
  assert.equal(r.yazi.sirada, undefined);
});

test('etiketteki kaynakta olmayan rakam şeritten düşer', async () => {
  const r = await yayinKurulu(
    seritliYazi({ rakamlar: [{ etiket: 'Faiz', deger: '4,25' }, { etiket: '10 yıllık tahvil', deger: '4,25' }] }),
    seritAday, { enAzKelime: 0, gemini: onayGemini });
  assert.ok(!r.dur);
  assert.deepEqual(r.yazi.rakamlar, [{ etiket: 'Faiz', deger: '4,25' }]);
});

test('Her Kelimesi Büyük başlık redaksiyonda cümle düzenine inebilir, metindeki özel adlar korunur', async () => {
  const { bicimKorunur } = await import('./yayin-kurulu.mjs');
  const a = { baslik: 'Amerikalıların Borç Ödemelerinde Büyük Artış', spot: 'Amerikalıların borç ödemeleri arttı.', govde: 'A.\n\nB.' };
  assert.equal(bicimKorunur(a, { ...a, baslik: 'Amerikalıların borç ödemelerinde büyük artış' }), true);
  const b = { baslik: "Elon Musk'tan Hindistan'da Uygun Fiyatlı Starlink Açıklaması", spot: "Elon Musk, Hindistan'da Starlink fiyatını açıkladı.", govde: 'A.\n\nB.' };
  assert.equal(bicimKorunur(b, { ...b, baslik: "Elon Musk'tan Hindistan'da uygun fiyatlı Starlink açıklaması" }), true);
  assert.equal(bicimKorunur(b, { ...b, baslik: "Elon musk'tan Hindistan'da uygun fiyatlı Starlink açıklaması" }), false);
});

test('metinde haber sitesi ya da ajans adı geçerse yakalanır', async () => {
  const { medyaKontrol } = await import('./yayin-kurulu.mjs');
  assert.deepEqual(medyaKontrol("CNBC'nin haberine göre endeks düştü. Reuters ve Financial Times da yazdı."), ['Yayın kuruluşu adı geçiyor: CNBC, Reuters, Financial Times']);
  assert.deepEqual(medyaKontrol('Fed faizi sabit tuttu; Bank of England da bekledi.'), []);
});

import { yerelDuzelt, yerelDuzeltMetin } from './yayin-kurulu.mjs';

test('yerelDuzelt: cümle başındaki göreli zaman silinir, ilk harf büyür', () => {
  assert.equal(yerelDuzeltMetin('Bugün Fed faizi sabit tuttu. Yarın, piyasalar açılacak.'), 'Fed faizi sabit tuttu. Piyasalar açılacak.');
  assert.equal(yerelDuzeltMetin('Piyasalar dün yüzde 1,5 düştü.'), 'Piyasalar yüzde 1,5 düştü.');
});

test('yerelDuzelt: tırnak içi ve "dünya" gibi kelimeler değişmez', () => {
  const t = 'Başkan "bugün karar verdik" dedi. Dünya piyasaları yükseldi.';
  assert.equal(yerelDuzeltMetin(t), t);
  assert.equal(yerelDuzeltMetin('“Reuters’a göre” diye yazıldı.'), '“Reuters’a göre” diye yazıldı.');
});

test('yerelDuzelt: yayın kuruluşu atfı silinir, başka yapı kalır', () => {
  assert.equal(yerelDuzeltMetin("Reuters'ın haberine göre, şirket 1.250 kişiyi işten çıkardı."), 'Şirket 1.250 kişiyi işten çıkardı.');
  assert.equal(yerelDuzeltMetin('Şirket, Bloomberg’e göre satışa hazırlanıyor.'), 'Şirket, satışa hazırlanıyor.');
  assert.equal(yerelDuzeltMetin("Yetkili Reuters'a konuştu."), "Yetkili Reuters'a konuştu.");
  const y = yerelDuzelt({ baslik: 'Fed bugün faizi sabit tuttu', spot: 's', govde: 'g', rakamlar: [{ etiket: 'a', deger: 'dün' }] });
  assert.equal(y.baslik, 'Fed faizi sabit tuttu');
  assert.equal(y.rakamlar[0].deger, 'dün');
});

test('yayinKurulu: göreli zaman yerelde düzelir, Gemini düzeltme çağrılmaz', async () => {
  const cagrilar = [];
  const gemini = async ({ sema, istem }) => {
    cagrilar.push(istem);
    if (sema.properties.onay) return { onay: !/bugün/i.test(istem.split('TASLAK:')[1]), sorunlar: [] };
    return null;
  };
  const r = await yayinKurulu({ ...iyi, spot: 'Bugün ' + iyi.spot }, aday, { enAzKelime: 0, gemini });
  assert.ok(r.yazi);
  assert.equal(r.yazi.spot, iyi.spot);
  assert.ok(!cagrilar.some((c) => c.includes('SORUNLAR')));
});

// En az uzunluk: kısa taslak bir kez kaynaktan genişletilir; yine kısaysa durur.
const uzunGovde = Array.from({ length: 6 }, () => 'Fed’e göre aralık yüzde 4,25 ile 4,5 arasında kaldı ve kurul kararını oy birliğiyle verdi, toplantı tutanağı da üç hafta sonra yayımlanacak.').join(' ')
  .concat(' ', 'Kurul enflasyonun hedefin üzerinde kaldığını, istihdamın ise güçlü seyrettiğini belirtti. '.repeat(8));

// 120-199 kelimelik taslak (Katman 2: uzatma yalnız bu aralıkta denenir).
const ortaGovde = `${iyi.govde}

${'Kurul kararını açıkladı ve piyasalar bunu bekliyordu. '.repeat(18)}`.trim();

test('120-199 kelimelik taslak genişletilir; genişletme yeterliyse yayınlanır', async () => {
  const istemler = [];
  const gemini = async ({ sema, istem }) => {
    istemler.push(istem);
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    if (istem.includes('genişlet')) return { ...iyi, govde: uzunGovde };
    return null;
  };
  const r = await yayinKurulu({ ...iyi, govde: ortaGovde }, aday, { gemini });
  assert.ok(r.yazi, r.dur);
  assert.equal(r.yazi.govde, uzunGovde);
  assert.ok(istemler.some((i) => i.includes('250-400 kelime')));
});

test('genişletme sonrası da kısaysa dur (kisa işaretli); kısa metin denetime girmez', async () => {
  const cagrilar = [];
  const gemini = async ({ sema, istem }) => {
    cagrilar.push(istem);
    return sema.properties.onay ? { onay: true, sorunlar: [] } : null;
  };
  const r = await yayinKurulu({ ...iyi, govde: ortaGovde }, aday, { gemini });
  assert.match(r.dur, /Metin kısa/);
  assert.equal(r.kisa, true);
  assert.equal(cagrilar.length, 1); // yalnız uzatma
});

test('120 kelimenin altındaki taslak uzatılmaz; Gemini hiç çağrılmadan kisa döner', async () => {
  let cagri = 0;
  const r = await yayinKurulu(iyi, aday, { gemini: async () => { cagri++; return null; } });
  assert.match(r.dur, /Metin kısa/);
  assert.equal(r.kisa, true);
  assert.equal(cagri, 0);
});

import { kontrolMasasi } from './yayin-kurulu.mjs';

// Katman 4: kontrol masası evet/hayır denetimidir; ana model düşerse yedek Gemma olur.
test('kontrol masası denetim çağrısı olarak gider', async () => {
  let p;
  await kontrolMasasi(iyi, aday, { gemini: async (x) => { p = x; return { onay: true, sorunlar: [] }; } });
  assert.equal(p.denetim, true);
});

test('yayinKurulu: kısa derleme eşik altında da derleme uzatmasıyla genişler, ara başlıklar korunur', async () => {
  const derlemeAday = { ...aday, haberler: [{ baslik: 'Fed', kategori: 'Ekonomi', kaynakMetni: aday.kaynakMetni }] };
  const kisa = { ...iyi, govde: '## Ekonomi\n\nFed aralığı korudu.' };
  const uzun = { ...iyi, govde: '## Ekonomi\n\n' +'Fed aralığı yüzde 4,25 ile 4,5 arasında korudu. '.repeat(30) };
  const istemler = [];
  const gemini = async ({ sema, istem }) => {
    istemler.push(istem);
    if (sema.properties.onay) return { onay: true, sorunlar: [] };
    if (istem.includes('Bu derleme haberinin gövdesi')) return uzun;
    return null;
  };
  const r = await yayinKurulu(kisa, derlemeAday, { gemini });
  assert.ok(r.yazi, r.dur);
  assert.ok(istemler.some((i) => i.includes('Ara başlıkları')));
});

test('yayinKurulu: tek haber eşik altındaysa uzatılmaz', async () => {
  const istemler = [];
  const r = await yayinKurulu({ ...iyi, govde: 'Kısa.' }, aday, { gemini: async ({ istem }) => (istemler.push(istem), null) });
  assert.ok(r.kisa);
  assert.equal(istemler.length, 0);
});
