import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  evdsCek,
  kiraAl,
  kartAl,
  guvenAl,
  brutRezervAl,
  kurHaftalikAl,
  birimFiyatAl,
  buyumeAl,
  konutSatisAl,
  ufeAl,
  insaatIzinAl,
  kesimBeklentiAl,
  paraPiyasasiAl,
  paraArziAl,
  kkmAl,
  tcmbBilancoAl,
  faizAyrintiAl,
  dovizHacmiAl,
  elektrikAl,
  TCMB_BILANCO_SERILERI,
  PARA_PIYASASI_SERILERI,
  HANE_BEKLENTI_SERILERI,
  INSAAT_IZIN_SERILERI,
  UFE_SERILERI,
  UFE_HIZMET_SERILERI,
  UFE_TARIM_SERILERI,
  UFE_TARIM_GIRDI_SERILERI,
  BUYUME_SERILERI,
  KONUT_SATIS_SERILERI,
  KIRA_BOLGELERI,
  KIRA_TUM_BOLGELER,
  KART_SEKTORLERI,
} from './evds-ek.mjs';

const gercekFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = gercekFetch;
});
const SIMDI = new Date('2026-10-27T10:00:00Z');
const yanit = (govde) => new Response(JSON.stringify(govde), { status: 200 });
const aylar = (bas, n) =>
  Array.from({ length: n }, (_, i) => ({ yil: bas[0] + Math.floor((bas[1] - 1 + i) / 12), ay: ((bas[1] - 1 + i) % 12) + 1 }));
// İstekteki seri ve formüllerden EVDS alan adları: TP.YKKE.TR + formül 3 -> TP_YKKE_TR-3.
const alanlar = (url) => {
  const u = decodeURIComponent(String(url));
  const seriler = u.match(/series=([^&]+)/)[1].split('-');
  const formuller = u.match(/formulas=([^&]+)/)[1].split('-');
  return seriler.map((s, i) => s.replaceAll('.', '_') + (formuller[i] !== '0' ? `-${formuller[i]}` : ''));
};

test('evdsCek: aylık ve haftalık tarih ayrıştırılır, boş değer null, sıra eskiden yeniye', async () => {
  let baslik;
  globalThis.fetch = async (url, op) => {
    baslik = op.headers.key;
    const items = String(url).includes('TP.H')
      ? [
          { Tarih: '16-10-2026', TP_H: '7' },
          { Tarih: '09-10-2026', TP_H: '6' },
        ]
      : [
          { Tarih: '2026-10', TP_A: '2.5' },
          { Tarih: '2026-9', TP_A: '' },
          { Tarih: 'bozuk', TP_A: '1' },
        ];
    return yanit({ items });
  };
  const s = await evdsCek(['TP.A'], [0], new Date('2026-01-01'), SIMDI, 'anahtar');
  assert.equal(baslik, 'anahtar');
  assert.deepEqual(s, [
    { yil: 2026, ay: 9, TP_A: null },
    { yil: 2026, ay: 10, TP_A: 2.5 },
  ]);
  const h = await evdsCek(['TP.H'], [0], new Date('2026-01-01'), SIMDI, 'anahtar');
  assert.deepEqual(h, [
    { tarih: '2026-10-09', TP_H: 6 },
    { tarih: '2026-10-16', TP_H: 7 },
  ]);
});

test('kiraAl: dört bölge endeks, yıllık ve konut yıllık; boş son ay atılır; bölge tablosu son aydan', async () => {
  globalThis.fetch = async (url) => {
    const a = alanlar(url);
    if (a.length === KIRA_TUM_BOLGELER.length) {
      return yanit({ items: [{ Tarih: '2026-9', ...Object.fromEntries(a.map((x, i) => [x, String(20 + i)])) }] });
    }
    const items = aylar([2019, 1], 94).map((m, i) => ({
      Tarih: `${m.yil}-${m.ay}`,
      ...Object.fromEntries(a.map((x) => [x, i < 93 ? String(x.endsWith('-3') ? 25 : 100 + i) : null])),
    }));
    return yanit({ items });
  };
  const k = await kiraAl(SIMDI, 'x');
  assert.equal(k.satirlar.length, 93);
  assert.deepEqual(k.satirlar.at(-1), {
    yil: 2026,
    ay: 9,
    bolgeler: Object.fromEntries(KIRA_BOLGELERI.map((b) => [b.kod, { endeks: 192, yillik: 25, konutYillik: 25 }])),
  });
  assert.equal(k.bolgeTablosu.bolgeler.length, KIRA_TUM_BOLGELER.length);
  assert.deepEqual(k.bolgeTablosu.bolgeler[0], { kod: 'TR10', ad: 'İstanbul', yillik: 20 });
});

test('kiraAl: aylık seride boşluk varsa hata verir', async () => {
  globalThis.fetch = async (url) => {
    const a = alanlar(url);
    const items = aylar([2019, 1], 40)
      .filter((_, i) => i !== 20)
      .map((m) => ({ Tarih: `${m.yil}-${m.ay}`, ...Object.fromEntries(a.map((x) => [x, '10'])) }));
    return yanit({ items });
  };
  await assert.rejects(() => kiraAl(SIMDI, 'x'), /boşluk/);
});

test('kartAl: haftalık tutar ve yıllık değişim, sektör kodlarıyla', async () => {
  globalThis.fetch = async (url) => {
    const a = alanlar(url);
    const items = Array.from({ length: 157 }, (_, i) => {
      const d = new Date(Date.UTC(2023, 9, 27) + i * 7 * 86400000);
      const t = `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
      return { Tarih: t, ...Object.fromEntries(a.map((x) => [x, i < 156 ? (x.endsWith('-3') ? '30' : '1000') : null])) };
    });
    return yanit({ items });
  };
  const k = await kartAl(SIMDI, 'x');
  assert.equal(k.satirlar.length, 156);
  assert.equal(k.satirlar[0].tarih, '2023-10-27');
  assert.deepEqual(Object.keys(k.satirlar[0].sektorler), KART_SEKTORLERI.map((s) => s.kod));
  assert.deepEqual(k.satirlar[0].sektorler.KT1, { tutar: 1000, yillik: 30 });
});

const ceyrekler = (bas, n) =>
  Array.from({ length: n }, (_, i) => ({ yil: bas[0] + Math.floor((bas[1] - 1 + i) / 4), ceyrek: ((bas[1] - 1 + i) % 4) + 1 }));

test('buyumeAl: çeyrek satırları, baştaki boş yıllık değişimler ve yayımlanmamış son çeyrek atılır', async () => {
  let istek;
  globalThis.fetch = async (url) => {
    istek = decodeURIComponent(String(url));
    const a = alanlar(url);
    const items = ceyrekler([1998, 1], 110).map((c, i) => ({
      Tarih: `${c.yil}-Q${c.ceyrek}`,
      // 1998 yılında yıllık değişim yok; son çeyrek (2025-Q2) henüz yayımlanmamış.
      ...Object.fromEntries(a.map((x) => [x, i === 109 || (i < 4 && x.endsWith('-3')) ? null : x.endsWith('-3') ? '5' : x.endsWith('-1') ? '1.5' : '200'])),
    }));
    return yanit({ items });
  };
  const b = await buyumeAl(SIMDI, 'x');
  assert.ok(istek.includes('startDate=01-01-1998'));
  assert.equal(b.satirlar.length, 105);
  assert.deepEqual(b.satirlar[0], {
    yil: 1999,
    ceyrek: 1,
    ...Object.fromEntries(BUYUME_SERILERI.map((s) => [s.alan, s.formul === 3 ? 5 : s.formul === 1 ? 1.5 : 200])),
  });
  assert.deepEqual(b.satirlar.at(-1).yil, 2025);
  assert.deepEqual(b.satirlar.at(-1).ceyrek, 1);
  assert.deepEqual(b.seriler.map((s) => s.alan), BUYUME_SERILERI.map((s) => s.alan));
});

test('buyumeAl: çeyrek serisinde boşluk varsa hata verir', async () => {
  globalThis.fetch = async (url) => {
    const a = alanlar(url);
    const items = ceyrekler([1998, 1], 110)
      .filter((_, i) => i !== 50)
      .map((c) => ({ Tarih: `${c.yil}-Q${c.ceyrek}`, ...Object.fromEntries(a.map((x) => [x, '5'])) }));
    return yanit({ items });
  };
  await assert.rejects(() => buyumeAl(SIMDI, 'x'), /boşluk/);
});

// Konut satışı: Türkiye serileri 2013-01'den (2026-09'a kadar 165 ay), il tablosu son ayın tek aylık isteklerinden. Mock iki
// serieList adresini (bie_akonutsat1 toplam, bie_akonutsat2 ipotekli) ve seri isteklerini yanıtlar; listelere elenmesi
// gereken girdiler (Türkiye, iş yeri, arındırılmış) karıştırılmıştır ve ikisinde de karşılığı vardır.
const konutListe = (no, ek, n) => [
  { SERIE_CODE: `TP.AKONUTSAT${no}.KTRTOPLAM`, SERIE_NAME: `Türkiye_Konut_${ek}` },
  ...Array.from({ length: n }, (_, i) => ({ SERIE_CODE: `TP.AKONUTSAT${no}.KTR${i + 1}`, SERIE_NAME: `İl${i + 1}_Konut_${ek}` })),
  { SERIE_CODE: `TP.AKONUTSAT${no}.ISYERI1`, SERIE_NAME: `Fazla1_İş Yeri_${ek}` },
  { SERIE_CODE: `TP.AKONUTSAT${no}.KMA1`, SERIE_NAME: `Fazla2_Konut_${ek}-Mevsim ve Takvim Etkilerinden Arındırılmış` },
];
const konutMock =
  (n = 81, istekler = []) =>
  async (url) => {
    const u = decodeURIComponent(String(url));
    if (u.includes('serieList')) {
      return yanit(u.includes('bie_akonutsat1') ? konutListe(1, 'Toplam Satışlar', n) : konutListe(2, 'İpotekli Satışlar', n));
    }
    istekler.push(url);
    const a = alanlar(url);
    if (u.includes('startDate=01-01-2013')) {
      // İlk 12 ayda yıllık değişim yok.
      const items = aylar([2013, 1], 165).map((m, i) => ({
        Tarih: `${m.yil}-${m.ay}`,
        ...Object.fromEntries(a.map((x) => [x, x.endsWith('-3') ? (i < 12 ? null : '12') : '5000'])),
      }));
      return yanit({ items });
    }
    const deger = (x) => {
      const il = Number(x.match(/KTR(\d+)/)?.[1]);
      return x.endsWith('-3') ? '7.5' : x.includes('AKONUTSAT2') ? String(il * 10) : String(il * 100);
    };
    return yanit({ items: [{ Tarih: '2026-9', ...Object.fromEntries(a.map((x) => [x, deger(x)])) }] });
  };
const tekAyIstekleri = (istekler) => istekler.filter((u) => !decodeURIComponent(String(u)).includes('startDate=01-01-2013'));

test('konutSatisAl: satır şekli, il tablosu serieList adlarından; Türkiye, iş yeri ve arındırılmış girdiler elenir', async () => {
  const istekler = [];
  globalThis.fetch = konutMock(81, istekler);
  const k = await konutSatisAl(SIMDI, 'x');
  assert.equal(k.birim, 'adet');
  assert.deepEqual(k.seriler.map((s) => s.alan), KONUT_SATIS_SERILERI.map((s) => s.alan));
  // İlk 12 ayın yıllık değişimi boş, bu satırlar atılır: 2014-01'den 2026-09'a 153 satır.
  assert.equal(k.satirlar.length, 153);
  assert.deepEqual(k.satirlar[0], {
    yil: 2014,
    ay: 1,
    toplam: 5000,
    toplamYillik: 12,
    arindirilmis: 5000,
    ilkEl: 5000,
    ikinciEl: 5000,
    ipotekli: 5000,
    isyeri: 5000,
  });
  assert.deepEqual([k.satirlar.at(-1).yil, k.satirlar.at(-1).ay], [2026, 9]);
  assert.deepEqual([k.ilTablosu.yil, k.ilTablosu.ay], [2026, 9]);
  assert.equal(k.ilTablosu.iller.length, 81);
  assert.deepEqual(k.ilTablosu.iller.map((i) => i.ad), Array.from({ length: 81 }, (_, i) => `İl${i + 1}`));
  assert.deepEqual(k.ilTablosu.iller[6], { ad: 'İl7', toplam: 700, yillik: 7.5, ipotekli: 70 });
  // Elenen girdilerin serileri il isteklerine girmez.
  const ilAlanlari = tekAyIstekleri(istekler).flatMap((u) => alanlar(u));
  assert.ok(!ilAlanlari.some((a) => /KTRTOPLAM|ISYERI|KMA/.test(a)));
});

test('konutSatisAl: il serileri en çok 60 serilik parçalarda ve tek ay için istenir', async () => {
  const istekler = [];
  globalThis.fetch = konutMock(81, istekler);
  await konutSatisAl(SIMDI, 'x');
  assert.ok(istekler.every((u) => alanlar(u).length <= 60));
  const il = tekAyIstekleri(istekler);
  assert.deepEqual(il.map((u) => alanlar(u).length), [60, 60, 60, 60, 3]);
  assert.ok(
    il.every((u) => {
      const d = decodeURIComponent(String(u));
      return d.includes('startDate=01-09-2026') && d.includes('endDate=01-09-2026');
    }),
  );
});

test('konutSatisAl: 81’den az il varsa hata verir', async () => {
  globalThis.fetch = konutMock(80);
  await assert.rejects(() => konutSatisAl(SIMDI, 'x'), /il listesi eksik/);
});

// Üretici fiyatları: dört istek, her birinin ay aralığı farklı. Yurt içi ÜFE 2005-01..2026-09, hizmet 2017-01..2026-09,
// tarım ürünleri 2020-01..2026-09, tarımsal girdi 2015-01..2026-08 (bir ay geç). Yıllık değişim ilk 12 ayda, aylık değişim
// ilk ayda boştur; o satırlar elenir.
const ufeMock =
  (istekler = []) =>
  async (url) => {
    const u = decodeURIComponent(String(url));
    istekler.push(u);
    const [bas, n] = u.includes('TUFE1YI')
      ? [[2005, 1], 261]
      : u.includes('HUFE')
        ? [[2017, 1], 117]
        : u.includes('TARIMUFE')
          ? [[2020, 1], 81]
          : [[2015, 1], 140];
    const a = alanlar(url);
    const items = aylar(bas, n).map((m, i) => ({
      Tarih: `${m.yil}-${m.ay}`,
      ...Object.fromEntries(
        a.map((x) => [x, x.endsWith('-3') ? (i < 12 ? null : '30') : x.endsWith('-1') ? (i === 0 ? null : '2') : '500']),
      ),
    }));
    return yanit({ items });
  };

test('ufeAl: dört ayrı dizi, her biri kendi son ayını korur; geç yayımlanan seri diğerlerini kısaltmaz', async () => {
  const istekler = [];
  globalThis.fetch = ufeMock(istekler);
  const u = await ufeAl(SIMDI, 'x');
  assert.equal(istekler.length, 4);
  assert.ok(istekler[0].includes('startDate=01-01-2005'));
  assert.ok(istekler[1].includes('startDate=01-01-2017'));
  assert.ok(istekler[2].includes('startDate=01-01-2020'));
  assert.ok(istekler[3].includes('startDate=01-01-2015'));
  assert.deepEqual(u.seriler.map((s) => s.alan), UFE_SERILERI.map((s) => s.alan));
  assert.deepEqual(u.hizmetSeriler.map((s) => s.alan), UFE_HIZMET_SERILERI.map((s) => s.alan));
  assert.deepEqual(u.tarimSeriler.map((s) => s.alan), UFE_TARIM_SERILERI.map((s) => s.alan));
  assert.deepEqual(u.tarimGirdiSeriler.map((s) => s.alan), UFE_TARIM_GIRDI_SERILERI.map((s) => s.alan));
  // Her dizi kendi alanlarının dolu olduğu ilk aydan başlar.
  assert.equal(u.satirlar.length, 249);
  assert.deepEqual(u.satirlar[0], {
    yil: 2006,
    ay: 1,
    endeks: 500,
    aylik: 2,
    yillik: 30,
    tufeYillik: 30,
    madencilik: 30,
    imalat: 30,
    enerji: 30,
    su: 30,
    gida: 30,
    petrol: 30,
    metal: 30,
  });
  assert.deepEqual(u.hizmet[0], { yil: 2018, ay: 1, aylik: 2, yillik: 30 });
  assert.deepEqual(u.tarim[0], { yil: 2021, ay: 1, aylik: 2, yillik: 30 });
  assert.deepEqual(u.tarimGirdi[0], { yil: 2016, ay: 1, aylik: 2, yillik: 30 });
  assert.deepEqual([u.hizmet.length, u.tarim.length, u.tarimGirdi.length], [105, 69, 128]);
  // Tarımsal girdi bir ay geride; diğer diziler son aylarını korur.
  assert.deepEqual([u.satirlar.at(-1).yil, u.satirlar.at(-1).ay], [2026, 9]);
  assert.deepEqual([u.hizmet.at(-1).yil, u.hizmet.at(-1).ay], [2026, 9]);
  assert.deepEqual([u.tarim.at(-1).yil, u.tarim.at(-1).ay], [2026, 9]);
  assert.deepEqual([u.tarimGirdi.at(-1).yil, u.tarimGirdi.at(-1).ay], [2026, 8]);
});

test('ufeAl: seri istekleri doğru kod ve formüllerle yapılır', async () => {
  const istekler = [];
  globalThis.fetch = ufeMock(istekler);
  await ufeAl(SIMDI, 'x');
  assert.deepEqual(alanlar(istekler[0]), [
    'TP_TUFE1YI_T1',
    'TP_TUFE1YI_T1-1',
    'TP_TUFE1YI_T1-3',
    'TP_TUKFIY2025_GENEL-3',
    'TP_TUFE1YI_T2-3',
    'TP_TUFE1YI_T15-3',
    'TP_TUFE1YI_T118-3',
    'TP_TUFE1YI_T123-3',
    'TP_TUFE1YI_T16-3',
    'TP_TUFE1YI_T49-3',
    'TP_TUFE1YI_T73-3',
  ]);
  assert.deepEqual(alanlar(istekler[1]), ['TP_HUFE_GK378119440-1', 'TP_HUFE_GK378119440-3']);
  assert.deepEqual(alanlar(istekler[2]), ['TP_TARIMUFE01-3', 'TP_TARIMUFE01-1']);
  assert.deepEqual(alanlar(istekler[3]), ['TP_TARIMGFE_GK378650484-3', 'TP_TARIMGFE_GK378650484-1']);
});

// İnşaat izinleri: 26 seri tek istekte, hepsi düzey (formül 0); son ay boş gelirse (yayımlanmamış) satır atılır.
test('insaatIzinAl: tek istek, düzey serileri, alan adları belge önekiyle; boş son ay atılır', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    istekler.push(decodeURIComponent(String(url)));
    const a = alanlar(url);
    const items = aylar([2010, 1], 200).map((m, i) => ({
      Tarih: `${m.yil}-${m.ay}`,
      ...Object.fromEntries(a.map((x) => [x, i === 199 ? null : '1000'])),
    }));
    return yanit({ items });
  };
  const k = await insaatIzinAl(SIMDI, 'x');
  assert.equal(istekler.length, 1);
  assert.ok(istekler[0].includes('startDate=01-01-2010'));
  assert.equal(alanlar(istekler[0]).length, 26);
  assert.ok(alanlar(istekler[0]).every((x) => !x.includes('-')));
  assert.deepEqual(alanlar(istekler[0]).slice(0, 4), ['TP_IN_RH2_TOPLAM_TOP_D', 'TP_IN_RH2_TOPLAM_TOP_B', 'TP_IN_RH2_TOPLAM_TOP_A', 'TP_IN_RH2_APT_TOP_B']);
  assert.deepEqual(k.seriler.map((x) => x.alan), INSAAT_IZIN_SERILERI.map((x) => x.alan));
  assert.equal(k.satirlar.length, 199);
  const son = k.satirlar.at(-1);
  assert.deepEqual([son.yil, son.ay], [2026, 7]);
  assert.equal(son.ruhsatDaire, 1000);
  assert.equal(son.iskanDiger, 1000);
  assert.equal(Object.keys(son).length, 28);
});

test('insaatIzinAl: 120 aydan az satır varsa hata verir', async () => {
  globalThis.fetch = async (url) =>
    yanit({ items: aylar([2020, 1], 60).map((m) => ({ Tarih: `${m.yil}-${m.ay}`, ...Object.fromEntries(alanlar(url).map((x) => [x, '5'])) })) });
  await assert.rejects(() => insaatIzinAl(SIMDI, 'x'), /İnşaat izinleri yetersiz/);
});

// Kesim beklentileri: iki aylık istek (kesimler 2015'ten, hanehalkı 2026'dan) ve dağılım için seri listesi + son aylar.
// Dağılım listesinde gözlem sayısı ve aralıklar adlarından ayrıştırılır; ilgisiz ad atlanır. Son ayın gözlemi boşsa bir
// önceki ay alınır.
const BEKOD_LISTE = [12, 24].flatMap((v, j) => {
  const o = j * 60;
  return [
    { SERIE_CODE: `TP.BEKODTUFEYENI.BT${o + 1}`, SERIE_NAME: `(Gözlem Sayısı) ${v} Ay Sonrası Yıllık Tüketici Enflasyonu Beklentilerinin Olasılık Dağılımı` },
    { SERIE_CODE: `TP.BEKODTUFEYENI.BT${o + 2}`, SERIE_NAME: `(0.00-2.99) ${v} Ay Sonrası Yıllık Tüketici Enflasyonu Beklentisi Olasılığı (%)` },
    ...Array.from({ length: 37 }, (_, i) => ({
      SERIE_CODE: `TP.BEKODTUFEYENI.BT${o + 3 + i}`,
      SERIE_NAME: `(${3 + i}.00-${3 + i}.99) ${v} Ay Sonrası Yıllık Tüketici Enflasyonu Beklentisi Olasılığı (%)`,
    })),
    { SERIE_CODE: `TP.BEKODTUFEYENI.BT${o + 40}`, SERIE_NAME: `(>=40.00) ${v} Ay Sonrası Yıllık Tüketici Enflasyonu Beklentisi Olasılığı (%)` },
  ];
}).concat([{ SERIE_CODE: 'TP.BEKODTUFEYENI.X', SERIE_NAME: 'İlgisiz seri' }]);

const beklentiMock = (istekler = []) => async (url) => {
  const u = decodeURIComponent(String(url));
  istekler.push(u);
  if (u.includes('serieList')) return yanit(BEKOD_LISTE);
  const a = alanlar(url);
  if (u.includes('BEKODTUFEYENI')) {
    // Temmuz–ekim; ekimde gözlem yok (yayımlanmamış), eylülün değerleri alınır.
    const items = aylar([2026, 7], 4).map((m, i) => ({
      Tarih: `${m.yil}-${m.ay}`,
      ...Object.fromEntries(a.map((x) => [x, i === 3 ? null : x.endsWith('_BT1') || x.endsWith('_BT61') ? '40' : x.endsWith('_BT25') ? '60' : x.endsWith('_BT26') ? '40' : '0'])),
    }));
    return yanit({ items });
  }
  const bas = u.includes('HANEBEK') ? [2026, 1] : [2015, 1];
  const n = u.includes('HANEBEK') ? 10 : 142;
  return yanit({ items: aylar(bas, n).map((m) => ({ Tarih: `${m.yil}-${m.ay}`, ...Object.fromEntries(a.map((x) => [x, '20'])) })) });
};

test('kesimBeklentiAl: kesimler, hanehalkı ve son ayın dağılımı; aralıklar seri listesinden', async () => {
  const istekler = [];
  globalThis.fetch = beklentiMock(istekler);
  const k = await kesimBeklentiAl(SIMDI, 'x');
  assert.deepEqual(k.seriler.map((s) => s.alan), ['piyasa', 'reel', 'hanehalki']);
  assert.deepEqual(k.haneSeriler.map((s) => s.alan), HANE_BEKLENTI_SERILERI.map((s) => s.alan));
  assert.equal(k.satirlar.length, 142);
  assert.deepEqual(k.satirlar.at(-1), { yil: 2026, ay: 10, piyasa: 20, reel: 20, hanehalki: 20 });
  assert.equal(k.hane.length, 10);
  assert.equal(Object.keys(k.hane[0]).length, 2 + 17);
  // Kur, konut fiyatı ve yatırım tercihi soruları istenmez.
  assert.ok(!istekler.some((u) => /HAN1[4789]|HAN20/.test(u)));
  const d = k.dagilim;
  assert.deepEqual([d.yil, d.ay], [2026, 9]);
  assert.equal(d.ay12.gozlem, 40);
  assert.equal(d.ay12.kutular.length, 39);
  assert.deepEqual(d.ay12.kutular[0], { alt: 0, ust: 2.99, pay: 0 });
  assert.deepEqual(d.ay12.kutular.at(-1), { alt: 40, ust: null, pay: 0 });
  assert.equal(d.ay12.kutular.find((x) => x.alt === 25).pay, 60);
  assert.equal(d.ay12.kutular.find((x) => x.alt === 26).pay, 40);
  assert.equal(d.ay24.kutular.find((x) => x.alt === 25).pay, 0);
});

test('kesimBeklentiAl: dağılım seri listesi eksikse hata verir', async () => {
  globalThis.fetch = async (url) => (String(url).includes('serieList') ? yanit(BEKOD_LISTE.slice(0, 10)) : beklentiMock()(url));
  await assert.rejects(() => kesimBeklentiAl(SIMDI, 'x'), /dağılımı .* seri listesi eksik/);
});

// Para piyasası: haftalık istek (frequency=3, ortalama) ve son 15 günün günlük isteği. Haftalıkta repo ilk 100 haftada
// boştur (satır kalır), bitmemiş hafta (cuma bugünden sonra) atılır; günlükte son gün boşsa bir önceki gün alınır.
const gunTarihi = (d) => `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
const paraMock = (istekler = []) => async (url) => {
  const u = decodeURIComponent(String(url));
  istekler.push(u);
  const a = alanlar(url);
  if (u.includes('frequency=3')) {
    // 7 Ocak 2011 cumasından başlayıp SIMDI'den (27 Ekim 2026 salı) sonraki cumaya kadar.
    const items = [];
    for (let t = Date.UTC(2011, 0, 7), i = 0; t <= Date.UTC(2026, 9, 30); t += 7 * 864e5, i++) {
      items.push({ Tarih: gunTarihi(new Date(t)), ...Object.fromEntries(a.map((x) => [x, x === 'TP_PY_P02_1H' && i < 100 ? null : '10'])) });
    }
    return yanit({ items });
  }
  const items = [Date.UTC(2026, 9, 23), Date.UTC(2026, 9, 26), Date.UTC(2026, 9, 27)].map((t, i) => ({
    Tarih: gunTarihi(new Date(t)),
    ...Object.fromEntries(a.map((x) => [x, i === 2 ? null : String(30 + i)])),
  }));
  return yanit({ items });
};

test('paraPiyasasiAl: haftalık ortalama ve son iş günü; repo boş haftalar kalır, bitmemiş hafta atılır', async () => {
  const istekler = [];
  globalThis.fetch = paraMock(istekler);
  const p = await paraPiyasasiAl(SIMDI, 'x');
  assert.equal(istekler.length, 2);
  assert.ok(istekler[0].includes('aggregationTypes=avg-avg-avg-avg-avg-avg-avg-avg'));
  assert.deepEqual(alanlar(istekler[0]), PARA_PIYASASI_SERILERI.map((t) => t.kod.replaceAll('.', '_')));
  assert.ok(!istekler.some((u) => /BISTTLREF|AOFOBAP/.test(u)));
  assert.equal(p.satirlar[0].tarih, '2011-01-07');
  assert.equal(p.satirlar[0].repo, null);
  assert.equal(p.satirlar[0].aofm, 10);
  assert.equal(p.satirlar.at(-1).tarih, '2026-10-23');
  assert.deepEqual(p.son, { tarih: '2026-10-26', borcVerme: 31, borcAlma: 31, repo: 31, bankalararasi: 31, aofm: 31, fonlama: 31, sterilizasyon: 31, net: 31 });
});

// Para arzı: tek istek, düzey ve yıllık değişim formülleri; alanı boş haftalar (menkul kıymetler 2010 sonundan, yıllık
// değişim bir yıl sonra) atılır.
test('paraArziAl: formüller, boş haftalar atılır, satır şekli', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    istekler.push(u);
    const items = [];
    for (let t = Date.UTC(2010, 0, 1), i = 0; t <= Date.UTC(2026, 9, 16); t += 7 * 864e5, i++) {
      items.push({
        Tarih: gunTarihi(new Date(t)),
        ...Object.fromEntries(alanlar(url).map((x) => [x, (x.endsWith('-3') && i < 52) || (x === 'TP_HPBITABLO1_21' && i < 51) ? null : '7'])),
      });
    }
    return yanit({ items });
  };
  const p = await paraArziAl(SIMDI, 'x');
  assert.equal(istekler.length, 1);
  assert.ok(istekler[0].includes('startDate=01-01-2010'));
  assert.ok(istekler[0].includes('formulas=0-0-0-3-3-3-0-0-0-0-0-0-0-0'));
  assert.equal(p.birim, 'bin TL');
  assert.equal(p.satirlar[0].tarih, '2010-12-31');
  assert.equal(Object.keys(p.satirlar[0]).length, 15);
  assert.equal(p.satirlar.at(-1).tarih, '2026-10-16');
  assert.equal(p.satirlar.at(-1).m2Yillik, 7);
});

test('kkmAl: aylık dört seri, Aralık 2021’den', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    istekler.push(decodeURIComponent(String(url)));
    return yanit({ items: aylar([2021, 12], 56).map((m) => ({ Tarih: `${m.yil}-${m.ay}`, ...Object.fromEntries(alanlar(url).map((x) => [x, '1.5'])) })) });
  };
  const k = await kkmAl(SIMDI, 'x');
  assert.ok(istekler[0].includes('startDate=01-12-2021'));
  assert.deepEqual(alanlar(istekler[0]), ['TP_KKM_K1', 'TP_KKM_K2', 'TP_KKM_K3', 'TP_KKM_K4']);
  assert.deepEqual(k.satirlar[0], { yil: 2021, ay: 12, dd: 1.5, ddGercek: 1.5, ddTuzel: 1.5, tl: 1.5 });
  assert.equal(k.satirlar.length, 56);
});

// TCMB bilançosu: haftalık istek haftanın son değeriyle (last), günlük istek son iş günü için; para piyasası sahtesi
// gibi bitmemiş hafta atılır, günlükte boş son gün geçilir.
test('tcmbBilancoAl: haftanın son değeri ve son iş günü', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    istekler.push(u);
    const a = alanlar(url);
    const items = [];
    if (u.includes('frequency=3')) {
      for (let t = Date.UTC(2013, 0, 4); t <= Date.UTC(2026, 9, 30); t += 7 * 864e5) items.push({ Tarih: gunTarihi(new Date(t)), ...Object.fromEntries(a.map((x) => [x, '5'])) });
    } else {
      items.push({ Tarih: '26-10-2026', ...Object.fromEntries(a.map((x) => [x, '6'])) }, { Tarih: '27-10-2026', ...Object.fromEntries(a.map((x) => [x, null])) });
    }
    return yanit({ items });
  };
  const b = await tcmbBilancoAl(SIMDI, 'x');
  assert.ok(istekler[0].includes(`aggregationTypes=${TCMB_BILANCO_SERILERI.map(() => 'last').join('-')}`));
  assert.ok(istekler[0].includes('startDate=01-01-2013'));
  assert.equal(b.satirlar[0].tarih, '2013-01-04');
  assert.equal(b.satirlar.at(-1).tarih, '2026-10-23');
  assert.equal(b.son.tarih, '2026-10-26');
  assert.equal(b.son.rezervPara, 6);
  assert.equal(Object.keys(b.son).length, 15);
});

test('faizAyrintiAl: haftalık akım faizler 2012’den, finansman şirketleri aylık', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    istekler.push(u);
    const a = alanlar(url);
    if (u.includes('FKF')) return yanit({ items: aylar([2013, 12], 153).map((m) => ({ Tarih: `${m.yil}-${m.ay}`, ...Object.fromEntries(a.map((x) => [x, '50'])) })) });
    const items = [];
    for (let t = Date.UTC(2012, 6, 6); t <= Date.UTC(2026, 9, 16); t += 7 * 864e5) items.push({ Tarih: gunTarihi(new Date(t)), ...Object.fromEntries(a.map((x) => [x, '40'])) });
    return yanit({ items });
  };
  const f = await faizAyrintiAl(SIMDI, 'x');
  assert.equal(alanlar(istekler[0]).length, 17);
  assert.ok(istekler[0].includes('startDate=01-07-2012'));
  assert.equal(f.satirlar[0].tarih, '2012-07-06');
  assert.equal(Object.keys(f.satirlar[0]).length, 18);
  assert.deepEqual(f.finansman.at(-1), { yil: 2026, ay: 8, ticari: 50, tuketici: 50 });
});

test('dovizHacmiAl: haftalık günlük ortalama; son iş gününden sonra biten yarım hafta atılır', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    istekler.push(u);
    const a = alanlar(url);
    const items = [];
    if (u.includes('frequency=3')) {
      for (let t = Date.UTC(2010, 0, 1); t <= Date.UTC(2026, 9, 23); t += 7 * 864e5) items.push({ Tarih: gunTarihi(new Date(t)), ...Object.fromEntries(a.map((x) => [x, '100'])) });
    } else {
      items.push({ Tarih: '20-10-2026', ...Object.fromEntries(a.map((x) => [x, '90'])) }, { Tarih: '21-10-2026', ...Object.fromEntries(a.map((x) => [x, '95'])) });
    }
    return yanit({ items });
  };
  const d = await dovizHacmiAl(SIMDI, 'x');
  assert.ok(istekler.some((u) => u.includes('aggregationTypes=avg-avg-avg-avg-avg-avg')));
  assert.ok(!istekler.some((u) => u.includes('TLUZVADDOV')));
  assert.equal(d.son.tarih, '2026-10-21');
  assert.equal(d.son.spot, 95);
  assert.equal(d.satirlar.at(-1).tarih, '2026-10-16');
  assert.equal(d.birim, 'milyon ABD doları');
});

test('elektrikAl: günlük son 400 gün ve haftalık ortalama; yarım hafta atılır, kaynak kırılımı boş kalabilir', async () => {
  const istekler = [];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    istekler.push(u);
    const a = alanlar(url);
    const items = [];
    if (u.includes('frequency=3')) {
      for (let t = Date.UTC(2016, 0, 1); t <= Date.UTC(2026, 9, 30); t += 7 * 864e5) items.push({ Tarih: gunTarihi(new Date(t)), ...Object.fromEntries(a.map((x) => [x, '900'])) });
    } else {
      for (let t = Date.UTC(2025, 8, 22); t <= Date.UTC(2026, 9, 25); t += 864e5) {
        const once = t < Date.UTC(2026, 1, 1);
        items.push({ Tarih: gunTarihi(new Date(t)), ...Object.fromEntries(a.map((x) => [x, once && /URTY/.test(x) ? null : '800'])) });
      }
    }
    return yanit({ items });
  };
  const el = await elektrikAl(SIMDI, 'x');
  assert.equal(el.birim, 'MWh');
  assert.equal(el.gunluk.at(-1).tarih, '2026-10-25');
  assert.equal(el.gunluk[0].yenilenebilir, null);
  assert.equal(el.gunluk.at(-1).yenilenebilir, 800);
  assert.equal(el.satirlar.at(-1).tarih, '2026-10-23');
  assert.equal(el.satirlar[0].tuketim, 900);
  assert.ok(istekler.some((x) => x.includes('aggregationTypes=avg-avg-avg-avg')));
});

test('guvenAl ve brutRezervAl: alan adları tanımdan', async () => {
  globalThis.fetch = async (url) => {
    const a = alanlar(url);
    const haftalik = a.includes('TP_AB_TOPLAM');
    const items = haftalik
      ? Array.from({ length: 261 }, (_, i) => {
          const d = new Date(Date.UTC(2021, 9, 29) + i * 7 * 86400000);
          return {
            Tarih: `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`,
            ...Object.fromEntries(a.map((x, j) => [x, String(100 + j)])),
          };
        })
      : aylar([2012, 1], 178).map((m) => ({ Tarih: `${m.yil}-${m.ay}`, ...Object.fromEntries(a.map((x, j) => [x, String(80 + j)])) }));
    return yanit({ items });
  };
  const g = await guvenAl(SIMDI, 'x');
  assert.deepEqual(g.satirlar.at(-1), { yil: 2026, ay: 10, endeks: 80, haneGecmis: 81, haneBeklenti: 82, ekonomiBeklenti: 83 });
  const r = await brutRezervAl(SIMDI, 'x');
  assert.equal(r.satirlar.length, 261);
  assert.deepEqual(Object.keys(r.satirlar[0]), ['tarih', 'toplam', 'altin', 'doviz']);
});

const haftaTarihi = (d) => `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

test('kurHaftalikAl: haftalık son değer istenir, cuması bugünden sonraki bitmemiş hafta atılır', async () => {
  let istek;
  globalThis.fetch = async (url) => {
    istek = decodeURIComponent(String(url));
    const items = Array.from({ length: 210 }, (_, i) => ({
      Tarih: haftaTarihi(new Date(Date.UTC(2022, 9, 28) + i * 7 * 86400000)),
      TP_DK_USD_S_YTL: String(18 + i / 10),
      TP_DK_EUR_S_YTL: String(19 + i / 10),
    }));
    return yanit({ items });
  };
  const k = await kurHaftalikAl(SIMDI, 'x');
  assert.match(istek, /frequency=3&aggregationTypes=last-last/);
  assert.equal(k.satirlar.at(-1).tarih, '2026-10-23');
  assert.ok(k.satirlar.every((s) => s.tarih <= '2026-10-27'));
  assert.deepEqual(Object.keys(k.satirlar[0]), ['tarih', 'usd', 'eur']);
});

test('birimFiyatAl: il adları iki gruptan eşleşir, çeyrek tarihi ayrıştırılır, il tablosu son çeyrekten', async () => {
  const iller = ['Türkiye', 'İstanbul', 'Ankara', 'İzmir', ...Array.from({ length: 70 }, (_, i) => `İl${i}`)];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    if (u.includes('serieList')) {
      const fiyat = u.includes('bie_birimfiyat');
      return yanit(
        iller.map((ad, i) => ({
          SERIE_CODE: fiyat ? `TP.BF.K${i}` : `TP.BK.K${i}`,
          SERIE_NAME: `${ad} Konut Birim ${fiyat ? 'Fiyatları' : 'Kiraları'}`,
        })),
      );
    }
    const a = alanlar(url);
    const tek = u.includes('startDate=01-07-2026');
    const items = (tek ? [{ yil: 2026, c: 3 }] : Array.from({ length: 36 }, (_, i) => ({ yil: 2018 + Math.floor(i / 4), c: (i % 4) + 1 }))).map(
      (q, i, dizi) => ({
        Tarih: `${q.yil}-Q${q.c}`,
        ...Object.fromEntries(a.map((x) => [x, !tek && i === dizi.length - 1 ? null : x.startsWith('TP_BF') ? '50000' : '250'])),
      }),
    );
    return yanit({ items });
  };
  const b = await birimFiyatAl(SIMDI, 'x');
  assert.equal(b.satirlar.length, 35);
  assert.deepEqual(b.satirlar.at(-1), {
    yil: 2026,
    ceyrek: 3,
    iller: Object.fromEntries(['Türkiye', 'İstanbul', 'Ankara', 'İzmir'].map((ad) => [ad, { fiyat: 50000, kira: 250 }])),
  });
  assert.equal(b.ilTablosu.iller.length, iller.length);
  assert.deepEqual([b.ilTablosu.yil, b.ilTablosu.ceyrek], [2026, 3]);
});
