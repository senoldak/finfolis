import test from 'node:test';
import assert from 'node:assert/strict';
import rawData from '../data/ajanda.json' with { type: 'json' };
import {
  ajandaVerisiSemasi,
  gostergeSemasi,
  sayiCoz,
  pmiDegerlendir,
  onemBilgisi,
  gostergeFarkiniHesapla,
  gunlukAjandaGetir,
  gostergeleriFiltrele,
  GOSTERGE_REHBERI,
} from './ajanda.mjs';

test('ajanda verisi şema doğrulaması: ajanda.json tam uyumludur', () => {
  const sonuc = ajandaVerisiSemasi.safeParse(rawData);
  assert.ok(sonuc.success, 'ajanda.json şemadan geçmelidir');
  assert.ok(sonuc.data.ajandalar.length >= 2, 'En az 2 günlük ajanda bulunmalıdır');
});

test('gostergeSemasi: geçersiz saat ve eksik alanlar reddedilir', () => {
  const gecersizSaat = {
    id: 'test-1',
    saat: '25-00', // hatalı biçim
    ulke: 'Türkiye',
    ulkeKodu: 'TR',
    bayrak: '🇹🇷',
    gosterge: 'Test',
    onceki: '10',
    nedenOnemli: 'Yeterince uzun açıklayıcı metin buradadır.',
    kaynak: 'Test Kurumu',
  };
  const sonuc = gostergeSemasi.safeParse(gecersizSaat);
  assert.equal(sonuc.success, false);

  const kisaNot = {
    ...gecersizSaat,
    saat: '10:00',
    nedenOnemli: 'Kısa', // 10 karakterden az
  };
  const sonucKisa = gostergeSemasi.safeParse(kisaNot);
  assert.equal(sonucKisa.success, false);
});

test('sayiCoz: Türkçe ve uluslararası biçimleri, eksi işaretlerini ve sayıları doğru ayrıştırır', () => {
  // Virgül ve nokta ondalık ayrıştırıcılar
  assert.equal(sayiCoz('49,8'), 49.8);
  assert.equal(sayiCoz('49.8'), 49.8);
  assert.equal(sayiCoz('%2,1'), 2.1);
  assert.equal(sayiCoz('%2.1'), 2.1);

  // Eksi işaretleri (ASCII, Unicode U+2212 eksi ve U+2013 en-dash)
  assert.equal(sayiCoz('%-0,2'), -0.2);
  assert.equal(sayiCoz('−0,2'), -0.2);
  assert.equal(sayiCoz('–0,2'), -0.2);
  assert.equal(sayiCoz('−0.2'), -0.2);
  assert.equal(sayiCoz('-4,8 Milyar $'), -4.8);

  // Doğrudan sayı veya sıfır girdisi
  assert.equal(sayiCoz(50), 50);
  assert.equal(sayiCoz(49.8), 49.8);
  assert.equal(sayiCoz(0), 0);
  assert.equal(sayiCoz('0'), 0);

  // Binlik ayırıcılar
  assert.equal(sayiCoz('1.250,50'), 1250.5);
  assert.equal(sayiCoz('1,250.50'), 1250.5);

  // Geçersiz veya boş girdiler
  assert.equal(sayiCoz(null), null);
  assert.equal(sayiCoz(undefined), null);
  assert.equal(sayiCoz('sayı yok'), null);
});

test('pmiDegerlendir: 50 eşik kuralını sakin ve doğru yorumlar', () => {
  // Büyüme (genişleme) bölgesi
  const genisleme = pmiDegerlendir('51,2');
  assert.equal(genisleme.durum, 'genisleme');
  assert.ok(genisleme.aciklama.includes('büyüme'));

  // Nokta ile ondalık yazılmış büyüme
  const genislemeNoktali = pmiDegerlendir('50.4');
  assert.equal(genislemeNoktali.durum, 'genisleme');

  // Daralma bölgesi (noktalı ve virgüllü değerler 50'nin altı olmalıdır, 498 gibi büyümemelidir)
  const daralma = pmiDegerlendir(48.5);
  assert.equal(daralma.durum, 'daralma');
  assert.ok(daralma.aciklama.includes('daralma'));

  const daralmaNoktali = pmiDegerlendir('49.8');
  assert.equal(daralmaNoktali.durum, 'daralma');

  const notr = pmiDegerlendir('50,0');
  assert.equal(notr.durum, 'notr');

  const belirsiz = pmiDegerlendir(null);
  assert.equal(belirsiz.durum, 'belirsiz');
});

test('onemBilgisi: önem derecelerine göre etiket ve sınıf üretir', () => {
  assert.equal(onemBilgisi('kritik').sinif, 'onem-kritik');
  assert.equal(onemBilgisi('yuksek').sinif, 'onem-yuksek');
  assert.equal(onemBilgisi('orta').sinif, 'onem-orta');
  assert.equal(onemBilgisi('dusuk').sinif, 'onem-dusuk');
});

test('gostergeFarkiniHesapla: açıklanan değer ile beklenti/önceki karşılaştırması ve Türkçe uyumu', () => {
  const ornekGosterge = {
    id: 'test',
    saat: '10:00',
    ulke: 'Türkiye',
    ulkeKodu: 'TR',
    bayrak: '🇹🇷',
    gosterge: 'PMI',
    onceki: '49,0',
    beklenti: '50,0',
    aciklanan: '50,8',
    nedenOnemli: 'Açıklayıcı not metnimiz buradadır.',
    kaynak: 'Test',
  };

  // Beklenti varken karşılaştırma
  const ust = gostergeFarkiniHesapla(ornekGosterge);
  assert.equal(ust.durumu, 'beklenti-ustu');
  assert.equal(ust.yon, 'yukari');
  assert.ok(ust.metin.includes('beklenti üzerinde'));

  const alt = gostergeFarkiniHesapla({ ...ornekGosterge, aciklanan: '49,2' });
  assert.equal(alt.durumu, 'beklenti-alti');
  assert.equal(alt.yon, 'asagi');
  assert.ok(alt.metin.includes('beklenti altında'));

  const paralel = gostergeFarkiniHesapla({ ...ornekGosterge, aciklanan: '50,0' });
  assert.equal(paralel.durumu, 'paralel');
  assert.equal(paralel.metin, 'beklentiye paralel');

  // Beklenti yokken 'önceki' ile karşılaştırma Türkçe gramer kontrolü
  const beklentisiz = {
    ...ornekGosterge,
    beklenti: null,
    onceki: '50,0',
    aciklanan: '50,0',
  };
  assert.equal(gostergeFarkiniHesapla(beklentisiz).metin, 'öncekine paralel');

  const oncekiUstu = gostergeFarkiniHesapla({ ...beklentisiz, aciklanan: '51,0' });
  assert.ok(oncekiUstu.metin.includes('öncekinin üzerinde'));

  const oncekiAlti = gostergeFarkiniHesapla({ ...beklentisiz, aciklanan: '49,0' });
  assert.ok(oncekiAlti.metin.includes('öncekinin altında'));

  const bekleniyor = gostergeFarkiniHesapla({ ...ornekGosterge, aciklanan: null });
  assert.equal(bekleniyor.durumu, 'bekleniyor');
});

test('gunlukAjandaGetir: tarih seçimi ve varsayılan ajanda alma', () => {
  const bugun = gunlukAjandaGetir('2026-10-31', rawData);
  assert.equal(bugun.tarih, '2026-10-31');
  assert.ok(bugun.gostergeler.length > 0);

  const varsayilan = gunlukAjandaGetir(undefined, rawData);
  assert.equal(varsayilan.tarih, '2026-10-31');

  const bulunamayan = gunlukAjandaGetir('2099-01-01', rawData);
  assert.equal(bulunamayan.tarih, '2026-10-31', 'Bulunamayan tarihte ilk ajandaya dönmelidir');

  assert.throws(() => gunlukAjandaGetir('2026-10-31', { ajandalar: [] }), /boş veya bulunamadı/);
});

test('gostergeleriFiltrele: ülke ve önem filtreleri doğru çalışır', () => {
  const gostergeler = rawData.ajandalar[0].gostergeler;
  const tumu = gostergeleriFiltrele(gostergeler, 'tumu');
  assert.equal(tumu.length, gostergeler.length);

  const kritik = gostergeleriFiltrele(gostergeler, 'kritik');
  assert.ok(kritik.every((g) => g.onem === 'kritik' || g.onem === 'yuksek'));

  const tr = gostergeleriFiltrele(gostergeler, 'turkiye');
  assert.ok(tr.every((g) => g.ulkeKodu === 'TR'));

  const kuresel = gostergeleriFiltrele(gostergeler, 'kuresel');
  assert.ok(kuresel.every((g) => g.ulkeKodu !== 'TR'));
});

test('GOSTERGE_REHBERI: temel makro göstergelerin açıklamaları mevcuttur', () => {
  assert.ok(GOSTERGE_REHBERI.pmi);
  assert.ok(GOSTERGE_REHBERI.tufe);
  assert.ok(GOSTERGE_REHBERI.faiz);
  assert.ok(GOSTERGE_REHBERI.pce);
  assert.ok(GOSTERGE_REHBERI.pmi.esik.includes('50'));
});
