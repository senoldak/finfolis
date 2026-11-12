import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yayinKurulu } from './yayin-kurulu.mjs';

const aday = { id: 'x', baslik: 'Fed', kaynakMetni: 'The Federal Reserve kept the target range at 4.25 percent to 4.5 percent.', kaynaklar: [] };
const iyi = { baslik: 'Fed faizi sabit tuttu', spot: 'Fed, hedef aralığı yüzde 4,25-4,5 olarak korudu.', govde: "Fed'e göre aralık yüzde 4,25 ile 4,5 arasında kaldı.\n\n## Neden önemli?\n\nKredi maliyetlerini etkiler.." };
// Dil kapısı tekrar eden cümleyi yakalar; çoğaltılan fixture cümleleri farklı sözcükle başlar.
const ADLAR = ['Alfa', 'Beta', 'Gama', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Teta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Ksi', 'Omikron', 'Pi', 'Ro', 'Sigma', 'Tau', 'Upsilon', 'Fi', 'Ki', 'Psi', 'Omega', 'Birinci', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı', 'Yedinci', 'Sekizinci'];
const cogalt = (cumle, n, ofs = 0) => Array.from({ length: n }, (_, i) => `${ADLAR[i + ofs]}: ${cumle.trim()}`).join(' ');
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
  const r = await yayinKurulu(kotu, aday, { enAzKelime: 0, gemini, log: () => {} });
  assert.deepEqual(r.yazi, iyi);
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

// Dil redaksiyonu ayrı çağrıdır (yazı şemalı: baslik/spot/govde); olgu denetimi onay şemalıdır.
function redStub(redCikti, masa = () => ({ onay: true, sorunlar: [] })) {
  return async ({ sema, istem }) => {
    if (sema.properties.onay) return masa(istem);
    return redCikti ?? iyi;
  };
}

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
const uzunGovde = cogalt("Fed'e göre aralık yüzde 4,25 ile 4,5 arasında kaldı ve kurul kararını oy birliğiyle verdi, toplantı tutanağı da üç hafta sonra yayımlanacak.", 6)
  .concat(' ', cogalt('Kurul enflasyonun hedefin üzerinde kaldığını, istihdamın ise güçlü seyrettiğini belirtti.', 8, 10));

// 150-199 kelimelik taslak (Katman 2: uzatma yalnız bu aralıkta denenir).
const ortaGovde = `${iyi.govde}

${cogalt('Kurul kararını açıkladı ve piyasalar bunu bekliyordu.', 22)}`.trim();

test('150-199 kelimelik taslak genişletilir; genişletme yeterliyse yayınlanır', async () => {
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
  const uzun = { ...iyi, govde: '## Ekonomi\n\n' +cogalt('Fed aralığı yüzde 4,25 ile 4,5 arasında korudu.', 30) };
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

test('derlemeEnAz: haber başına 20 kelime, 150 ile EN_AZ_KELIME arası', async () => {
  const { derlemeEnAz, EN_AZ_KELIME } = await import('./yayin-kurulu.mjs');
  assert.equal(derlemeEnAz(2), 150);
  assert.equal(derlemeEnAz(8), 160);
  assert.equal(derlemeEnAz(50), EN_AZ_KELIME);
});

test('yayinKurulu: 8 haberlik derleme 168 kelimeyle yayımlanır (tek haberin 200 sınırı uygulanmaz)', async () => {
  const haberler = Array.from({ length: 8 }, (_, i) => ({ baslik: `Haber ${i}`, kategori: 'Ekonomi', kaynakMetni: aday.kaynakMetni }));
  const govde = '## Ekonomi\n\n' + cogalt('Fed aralığı yüzde 4,25 ile 4,5 arasında korudu ve kararını açıkladı.', 16);
  const r = await yayinKurulu({ ...iyi, govde }, { ...aday, haberler }, { gemini: async ({ sema }) => (sema.properties.onay ? { onay: true, sorunlar: [] } : null) });
  assert.ok(r.yazi, r.dur);
});

test('yayinKurulu: uzatma sonrası kısa kalan derlemenin durma sebebi önceki kelime sayısını da yazar', async () => {
  const derlemeAday = { ...aday, haberler: [{ baslik: 'Fed', kategori: 'Ekonomi', kaynakMetni: aday.kaynakMetni }] };
  const r = await yayinKurulu({ ...iyi, govde: '## Ekonomi\n\nFed aralığı korudu.' }, derlemeAday, { gemini: async () => null });
  assert.equal(r.kisa, true);
  assert.match(r.dur, /uzatmadan önce \d+/);
  assert.match(r.dur, /en az 150/);
});

test('yayinKurulu: tek haber eşik altındaysa uzatılmaz', async () => {
  const istemler = [];
  const r = await yayinKurulu({ ...iyi, govde: 'Kısa.' }, aday, { gemini: async ({ istem }) => (istemler.push(istem), null) });
  assert.ok(r.kisa);
  assert.equal(istemler.length, 0);
});

test('kontrol masası yayın kuruluşu adını why_matters, key_points ve tabloda da yakalar', async () => {
  const gemini = async () => ({ onay: true, sorunlar: [] });
  for (const ek of [
    { why_matters: 'Reuters bunu önemli buldu.' },
    { key_points: ['Endeks düştü', 'CNBC yorumladı'] },
    { tablo: { baslik: 'Özet', sutunlar: ['Kaynak', 'Değer'], satirlar: [['Bloomberg', '5']] } },
  ]) {
    const karar = await kontrolMasasi({ ...iyi, ...ek }, aday, { gemini });
    assert.equal(karar.onay, false, JSON.stringify(ek));
    assert.ok(karar.sorunlar.some((s) => s.startsWith('Yayın kuruluşu adı geçiyor')), JSON.stringify(karar.sorunlar));
  }
});

// ── Dil redaksiyonu (ayrı çağrı) ve dil kapısı ──────────────────────────────
const sessiz = () => {};
// Dil kusurlu ama olgusu doğru taslak: "oranında" dolgusu ve Duvar Sokağı çevirisi.
const ham = { ...iyi, govde: "Duvar Sokağı analistlerine göre Fed, aralığı yüzde 4,25 oranında korudu ve ikinci bir değişiklik yapmadı.\n\nFed'e göre aralık yüzde 4,25 ile 4,5 arasında kaldı.\n\nKredi maliyetlerini etkiler." };
const duzgun = { ...iyi, govde: "Wall Street analistlerine göre Fed, aralığı yüzde 4,25 düzeyinde korudu ve ikinci bir değişiklik yapmadı.\n\nFed'e göre aralık yüzde 4,25 ile 4,5 arasında kaldı.\n\nKredi maliyetlerini etkiler." };

// Olgu denetimi (onay şemalı) hep onaylar; redaksiyon çağrıları (baslik şemalı) sırayla cevaplardan yanıt alır.
function dilStub(cevaplar) {
  const cagrilar = [];
  let n = 0;
  const gemini = async (x) => {
    cagrilar.push(x);
    if (x.sema.properties.onay) return { onay: true, sorunlar: [] };
    const c = cevaplar[Math.min(n++, cevaplar.length - 1)];
    return typeof c === 'function' ? c(x) : c;
  };
  return { gemini, cagrilar, redCagrilari: () => cagrilar.filter((c) => c.sema.properties.baslik) };
}

test('dil redaksiyonu: olgu denetiminden sonra ayrı çağrıyla gider (medium düşünme, sıcaklık 0,2, denetim değil, kaynak ve sorun listesi istemde)', async () => {
  const { gemini, cagrilar, redCagrilari } = dilStub([duzgun]);
  const r = await yayinKurulu(ham, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.deepEqual(r, { yazi: duzgun });
  assert.equal(cagrilar.length, 2); // 1 olgu denetimi + 1 redaksiyon; ikinci kontrol masası yok
  assert.ok(cagrilar[0].sema.properties.onay);
  const red = redCagrilari();
  assert.equal(red.length, 1);
  assert.notEqual(red[0].denetim, true);
  assert.equal(red[0].dusunme, 'medium');
  assert.equal(red[0].sicaklik, 0.2);
  assert.match(red[0].sistem, /kıdemli redaktör/);
  assert.match(red[0].istem, /Federal Reserve kept/); // kaynak
  assert.match(red[0].istem, /yanlış çeviri/); // sorun listesi
  assert.ok(!red[0].istem.includes('SORUNLAR')); // yazar düzeltme çağrısıyla karışmaz
});

test('dil redaksiyonu: uydurma rakam eklerse reddedilir, nedenle bir kez yeniden denenir, olmazsa önceki metin kalır ve log düşer', async () => {
  const kotu2 = { ...iyi, spot: iyi.spot + ' Oran 9,9 oldu.' };
  const { gemini, redCagrilari } = dilStub([kotu2]);
  const loglar = [];
  const r = await yayinKurulu(iyi, aday, { enAzKelime: 0, gemini, log: (m) => loglar.push(m) });
  assert.deepEqual(r.yazi, iyi);
  const red = redCagrilari();
  assert.equal(red.length, 2); // ilk deneme + tek yeniden deneme
  assert.ok(!red[0].istem.includes('reddedildi'));
  assert.match(red[1].istem, /reddedildi/);
  assert.match(red[1].istem, /9,9/);
  assert.equal(r.dilNotlari.length, 1);
  assert.match(r.dilNotlari[0], /^dil redaksiyonu atıldı: .*9,9/);
  assert.ok(loglar.some((l) => l.includes('dil redaksiyonu atıldı')));
});

test('dil redaksiyonu: ilk deneme reddedilir, nedenle yapılan ikinci deneme kabul edilir', async () => {
  const kotu2 = { ...duzgun, spot: duzgun.spot + ' Oran 9,9 oldu.' };
  const { gemini, redCagrilari } = dilStub([kotu2, duzgun]);
  const r = await yayinKurulu(ham, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.deepEqual(r, { yazi: duzgun });
  assert.equal(redCagrilari().length, 2);
});

test('dil redaksiyonu: gövde %90-115 dışına çıkarsa (kısaltma ya da şişirme) reddedilir', async () => {
  const uzunHam = { ...iyi, govde: [iyi.govde, 'Kurul kararını oy birliğiyle verdi ve toplantı tutanağını açıkladı.', 'Piyasalar kararı bekliyordu ve işlemler sakin geçti.'].join('\n\n') };
  const kisaltilmis = { ...uzunHam, govde: iyi.govde };
  const sisirilmis = { ...uzunHam, govde: uzunHam.govde + '\n\nKurul toplantısı sırasında ek bir değişiklik gündeme gelmedi ve görüşmeler sakin geçti. Bütün üyeler aynı görüşte birleşti.' };
  for (const cikti of [kisaltilmis, sisirilmis]) {
    const { gemini } = dilStub([cikti]);
    const r = await yayinKurulu(uzunHam, aday, { enAzKelime: 0, gemini, log: sessiz });
    assert.equal(r.yazi.govde, uzunHam.govde);
    assert.match(r.dilNotlari[0], /kelime/);
  }
});

test('dil redaksiyonu: yanıt yok ya da bozuksa yeniden denenmez, metin kalır ve log düşer', async () => {
  const { gemini, redCagrilari } = dilStub([null]);
  const r = await yayinKurulu(iyi, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.deepEqual(r.yazi, iyi);
  assert.equal(redCagrilari().length, 1);
  assert.match(r.dilNotlari[0], /dil redaksiyonu atıldı: yanıt yok/);
});

test('dil redaksiyonu: özel adı küçültürse biçim kontrolü reddeder', async () => {
  const buyuk = { ...iyi, baslik: 'Trex Bio faizi sabit tuttu', spot: 'Trex Bio, aralığı korudu.' };
  const { gemini } = dilStub([{ ...buyuk, baslik: 'Trex bio faizi sabit tuttu' }]);
  const r = await yayinKurulu(buyuk, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.equal(r.yazi.baslik, 'Trex Bio faizi sabit tuttu');
  assert.match(r.dilNotlari[0], /biçim/);
});

test('dil kapısı: redaksiyondan sonra kalan kesin sorun (Duvar Sokağı) haberi durdurur, sebep "dil:" ile başlar', async () => {
  const { gemini, redCagrilari } = dilStub([ham]); // redaksiyon düzeltmez
  const r = await yayinKurulu(ham, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.match(r.dur, /^dil: /);
  assert.match(r.dur, /Duvar Sokağı/);
  assert.equal(r.yazi, undefined);
  assert.ok(redCagrilari().length >= 2); // ilk redaksiyon + kapı turu
});

test('dil kapısı: yazıyla yazılmış sayı kalırsa haber durur', async () => {
  const yazili = { ...iyi, govde: iyi.govde.replace('Kredi maliyetlerini etkiler.', 'Fed otuz dört milyon dolarlık bir fon açtı.') };
  const { gemini } = dilStub([yazili]);
  const r = await yayinKurulu(yazili, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.match(r.dur, /^dil: .*yazıyla/);
});

test('dil kapısı: ilk redaksiyon atılırsa kapı turu yalnız kesin sorunlarla çalışır ve düzeltirse haber yayımlanır', async () => {
  const { gemini, redCagrilari } = dilStub([null, duzgun]);
  const r = await yayinKurulu(ham, aday, { enAzKelime: 0, gemini, log: sessiz });
  assert.deepEqual(r.yazi, duzgun);
  const red = redCagrilari();
  assert.equal(red.length, 2);
  assert.match(red[0].istem, /dolgu/); // ilk tur: kesin olmayan "oranında" da listede
  assert.doesNotMatch(red[1].istem, /dolgu/); // kapı turu: yalnız kesin
  assert.match(red[1].istem, /yanlış çeviri/);
  assert.equal(r.dilNotlari.length, 1);
});

test('dilDuzeltTr son metne uygulanır: %, kıvrık kesme, İngilizce ondalık', async () => {
  const kaynakli = { ...aday, kaynakMetni: 'The Federal Reserve kept the target range at 4.25 percent. It sold 3.5 billion dollars.' };
  const taslak = { baslik: 'Fed faizi sabit tuttu', spot: 'Fed oranı %4,25 olarak korudu.', govde: 'Fed’in faiz kararı %4,25 düzeyinde kaldı ve kurul 3.5 milyar dolar sattı.\n\nKararın ardından piyasalar sakin kaldı.' };
  const { gemini } = dilStub([null]); // redaksiyon çıktı vermese de yerel düzeltme uygulanır
  const r = await yayinKurulu(taslak, kaynakli, { enAzKelime: 0, gemini, log: sessiz });
  assert.ok(r.yazi, r.dur);
  assert.equal(r.yazi.spot, 'Fed oranı yüzde 4,25 olarak korudu.');
  assert.match(r.yazi.govde, /^Fed'in faiz kararı yüzde 4,25 düzeyinde kaldı ve kurul 3,5 milyar dolar sattı\./);
});

test('dilDuzeltTr redaksiyon çıktısına da uygulanır', async () => {
  const kaynakli = { ...aday, kaynakMetni: 'The Federal Reserve kept the target range at 4.25 percent.' };
  const taslak = { baslik: 'Fed faizi sabit tuttu', spot: 'Fed oranı korudu.', govde: 'Fed oranı yüzde 4,25 düzeyinde korudu.\n\nPiyasalar sakin kaldı.' };
  const { gemini } = dilStub([{ ...taslak, govde: 'Fed oranı %4,25 düzeyinde korudu.\n\nPiyasalar sakin kaldı.' }]);
  const r = await yayinKurulu(taslak, kaynakli, { enAzKelime: 0, gemini, log: sessiz });
  assert.equal(r.yazi.govde, 'Fed oranı yüzde 4,25 düzeyinde korudu.\n\nPiyasalar sakin kaldı.');
});

test('derleme: temiz derlemede redaksiyon çağrısı yok; kesin sorun varsa kapı turu çalışır, ara başlıklar sorun sayılmaz', async () => {
  const haberler = Array.from({ length: 8 }, (_, i) => ({ baslik: `Haber ${i}`, kategori: 'Ekonomi', kaynakMetni: aday.kaynakMetni }));
  const govde = '## Ekonomi\n\n' + cogalt('Fed aralığı yüzde 4,25 ile 4,5 arasında korudu ve kararını açıkladı.', 16);
  const temiz = dilStub([null]);
  const r1 = await yayinKurulu({ ...iyi, govde }, { ...aday, haberler }, { gemini: temiz.gemini, log: sessiz });
  assert.ok(r1.yazi, r1.dur);
  assert.equal(temiz.redCagrilari().length, 0);

  const kusurlu = { ...iyi, govde: govde.replace('Alfa: Fed', 'Alfa: Duvar Sokağı için Fed') };
  const { gemini, redCagrilari } = dilStub([{ ...kusurlu, govde: kusurlu.govde.replace('Duvar Sokağı', 'Wall Street') }]);
  const r2 = await yayinKurulu(kusurlu, { ...aday, haberler }, { gemini, log: sessiz });
  assert.ok(r2.yazi, r2.dur);
  assert.match(r2.yazi.govde, /Wall Street/);
  assert.equal(redCagrilari().length, 1);
});

test('kontrolMasasi: duzenle olmadan şema duzeltilmis taşımaz ve sonuç düzenleme döndürmez', async () => {
  let sema;
  const r = await kontrolMasasi(iyi, aday, { gemini: async (x) => { sema = x.sema; return { onay: true, sorunlar: [], duzeltilmis: iyi }; } });
  assert.ok(!sema.properties.duzeltilmis);
  assert.equal(r.duzeltilmis, undefined);
});

test('yayinKurulu: düzeltme derlemeyi alt sınırın altına indirirse derleme bir kez yeniden uzatılır', async () => {
  const haberler = Array.from({ length: 8 }, (_, i) => ({ baslik: `Haber ${i}`, kategori: 'Ekonomi', kaynakMetni: aday.kaynakMetni }));
  const cumle = 'Fed aralığı yüzde 4,25 ile 4,5 arasında korudu ve kararını açıkladı. ';
  const uzun = { ...iyi, govde: '## Ekonomi\n\n' + cogalt(cumle, 18) };
  const kisalmis = { ...iyi, govde: '## Ekonomi\n\n' + cogalt(cumle, 10) };
  let kontrol = 0;
  const istemler = [];
  const gemini = async ({ sema, istem }) => {
    istemler.push(istem);
    if (sema.properties.onay) return kontrol++ === 0 ? { onay: false, sorunlar: ['bir cümle sorunlu'] } : { onay: true, sorunlar: [] };
    if (istem.includes('Bu derleme haberinin gövdesi')) return uzun;
    return kisalmis; // düzeltme metni kısaltır
  };
  const r = await yayinKurulu(uzun, { ...aday, haberler }, { gemini });
  assert.ok(r.yazi, r.dur);
  assert.equal(istemler.filter((i) => i.includes('Bu derleme haberinin gövdesi')).length, 1);
});

test('veri haberi (kendi grafiğimiz) 120 kelimelik alt sınırla geçer; sıradan haber 200 ister', async () => {
  const kelime = (n) => Array.from({ length: n }, () => 'Fed').join(' ');
  const yazi = { ...iyi, govde: `${iyi.govde}\n\n${kelime(130)}` };
  const onay = async ({ sema }) => (sema.properties.onay ? { onay: true, sorunlar: [] } : null);
  const veri = await yayinKurulu(yazi, { ...aday, adaylar: [{ id: 'esik:x', veriHaberi: true }] }, { gemini: onay });
  assert.ok(veri.yazi, veri.dur);
  const sirada = await yayinKurulu(yazi, { ...aday, adaylar: [{ id: 'k:x' }] }, { gemini: onay });
  assert.ok(sirada.kisa);
});

test('kaynağın İngilizce başlığı metne geçerse yakalanır; kurum adları geçer', async () => {
  const { yabanciBaslikKontrol } = await import('./yayin-kurulu.mjs');
  assert.equal(yabanciBaslikKontrol('Hormuz Is Turning Shipping’s Fuel Bill Into a Supply Crisis başlıklı raporda veriler yer aldı.').length, 1);
  assert.equal(yabanciBaslikKontrol('Why Investors Are Fleeing the Bond Market Now adlı analiz yayımlandı.').length, 1);
  assert.equal(yabanciBaslikKontrol('Şirketin “Yeni Dönem” başlıklı raporu yayımlandı.').length, 0);
  assert.deepEqual(yabanciBaslikKontrol('Federal Reserve Bank of New York ve Bank of America açıklama yaptı. S&P 500 ve Nasdaq yükseldi.'), []);
});

test('150 kelimenin altındaki taslak uzatılmaz (19 Ekim: bu aralıkta uzatma neredeyse hiç 200e ulaşmadı)', async () => {
  let cagri = 0;
  const govde = `${iyi.govde}\n\n${'Kurul kararını açıkladı ve piyasalar bunu bekliyordu. '.repeat(16)}`.trim();
  const r = await yayinKurulu({ ...iyi, govde }, aday, { gemini: async () => { cagri++; return null; } });
  assert.equal(r.kisa, true);
  assert.equal(cagri, 0);
});

// Standartlar Faz 1: okura görünen ek alanlar da rakam ve ölçek kontrolüne girer.
test('kontrol masası why_matters ve key_points içindeki kaynakta olmayan rakamı ve ölçek hatasını yakalar', async () => {
  const gemini = async () => ({ onay: true, sorunlar: [] });
  const rakam = await kontrolMasasi({ ...iyi, why_matters: 'Enflasyon yüzde 7,9 oldu.' }, aday, { gemini });
  assert.equal(rakam.onay, false);
  assert.ok(rakam.sorunlar.some((s) => s.includes('7,9')), JSON.stringify(rakam.sorunlar));
  const crore = { ...aday, kaynakMetni: 'The Rs 852 crore IPO was subscribed 7.78 times.' };
  const yazi = { baslik: 'Halka arz talep gördü', spot: 'Arz 7,78 kat talep gördü.', govde: 'Arz 7,78 kat talep gördü.', key_points: ['Arz büyüklüğü 852 milyar rupi'] };
  const olcek = await kontrolMasasi(yazi, crore, { gemini });
  assert.equal(olcek.onay, false);
  assert.ok(olcek.sorunlar.some((s) => s.startsWith('Ölçek hatası')), JSON.stringify(olcek.sorunlar));
});

test('turkceHarfKontrol: Türkçe harfsiz uzun metin takılır, normal ve kısa metin geçer', async () => {
  const { turkceHarfKontrol } = await import('./yayin-kurulu.mjs');
  const harfsiz = 'Fonun ilk kapanisina Kanada araciligiyla 75 milyon dolar katki sunulurken, Peru kalkinma bankasi 15 milyon dolar yatirim yapti. '.repeat(4);
  const turkce = 'Fonun ilk kapanışına Kanada aracılığıyla 75 milyon dolar katkı sunulurken, Peru kalkınma bankası 15 milyon dolar yatırım yaptı. '.repeat(4);
  assert.equal(turkceHarfKontrol(harfsiz).length, 1);
  assert.deepEqual(turkceHarfKontrol(turkce), []);
  assert.deepEqual(turkceHarfKontrol('Kisa bir metin'), []);
});

test('alfabeKontrol: Latin sözcüğe karışan yabancı alfabe harfi takılır, düz metin ve ayrı yazılmış ad geçer', async () => {
  const { alfabeKontrol } = await import('./yayin-kurulu.mjs');
  assert.equal(alfabeKontrol('Petrol fiyatları gerileді ve 13,4 milyار dolar oldu.').length, 1);
  assert.deepEqual(alfabeKontrol('Petrol fiyatları geriledi; α-sinüklein çalışması ve Москва adı geçti.'), []);
});
