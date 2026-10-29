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
