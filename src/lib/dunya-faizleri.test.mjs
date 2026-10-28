import test from 'node:test';
import assert from 'node:assert/strict';
import {
  csvAyristir,
  bisSeriler,
  ayEkle,
  hareketler,
  sonHareket,
  degisim12Ay,
  faz,
  ayinSonu,
  ayAnahtari,
  reelFaiz,
  abdAraligi,
  tufeSonlari,
  cogunlukDonemi,
  faizSatiri,
  ULKELER,
} from './dunya-faizleri.mjs';

const seriOlustur = (noktalar) => noktalar.map(([t, v]) => ({ t, v }));

test('csvAyristir: tırnaklı virgülü ve çift tırnağı korur', () => {
  const s = csvAyristir('A,B,C\n1,"x, y",z\n2,"o ""q""",w\n');
  assert.deepEqual(s, [
    { A: '1', B: 'x, y', C: 'z' },
    { A: '2', B: 'o "q"', C: 'w' },
  ]);
});

test('bisSeriler: NaN satırlarını atar, tarihe göre sıralar', () => {
  const csv = `FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE
D,US,2026-10-02,3.875
D,US,2026-10-01,NaN
D,US,2026-09-30,3.625
D,TR,2026-10-01,37
`;
  const s = bisSeriler(csv);
  assert.deepEqual(s.US, [
    { t: '2026-09-30', v: 3.625 },
    { t: '2026-10-02', v: 3.875 },
  ]);
  assert.deepEqual(s.TR, [{ t: '2026-10-01', v: 37 }]);
});

test('ayEkle: ay sonu taşmasında ayın son gününe iner', () => {
  assert.equal(ayEkle('2026-08-31', -6), '2026-02-28');
  assert.equal(ayEkle('2026-10-20', -12), '2025-10-20');
  assert.equal(ayEkle('2026-01-15', -2), '2025-11-15');
});

test('hareketler ve sonHareket: yön ve baz puan', () => {
  const s = seriOlustur([
    ['2026-01-01', 4],
    ['2026-01-02', 4],
    ['2026-03-05', 3.75],
    ['2026-03-06', 3.75],
    ['2026-07-10', 4.0],
  ]);
  assert.deepEqual(
    hareketler(s).map((h) => [h.tarih, h.bp]),
    [
      ['2026-03-05', -25],
      ['2026-07-10', 25],
    ],
  );
  assert.deepEqual(sonHareket(s), { tarih: '2026-07-10', onceki: 3.75, yeni: 4, bp: 25 });
  assert.equal(sonHareket(seriOlustur([['2026-01-01', 1]])), null);
});

test('degisim12Ay: 12 ay önceki son gözleme göre baz puan; seri kısaysa null', () => {
  const s = seriOlustur([
    ['2025-09-01', 4.5],
    ['2025-10-20', 4.25],
    ['2026-02-01', 4.0],
    ['2026-10-20', 3.75],
  ]);
  assert.equal(degisim12Ay(s), -50);
  assert.equal(degisim12Ay(seriOlustur([['2026-05-01', 3], ['2026-10-20', 3.5]])), null);
});

test('faz: son 6 ayda artırım Sıkılaştırma, indirim Gevşeme, hareket yoksa Beklemede', () => {
  const ref = '2026-10-20';
  const artirim = seriOlustur([['2026-01-01', 3], ['2026-08-01', 3.25], ['2026-10-20', 3.25]]);
  const indirim = seriOlustur([['2026-01-01', 3], ['2026-06-01', 2.75], ['2026-10-20', 2.75]]);
  const eski = seriOlustur([['2025-01-01', 3], ['2025-12-01', 2.75], ['2026-10-20', 2.75]]);
  const sinir = seriOlustur([['2026-01-01', 3], ['2026-04-20', 2.75], ['2026-10-20', 2.75]]);
  assert.equal(faz(artirim, ref), 'Sıkılaştırma');
  assert.equal(faz(indirim, ref), 'Gevşeme');
  assert.equal(faz(eski, ref), 'Beklemede');
  // 20 Nisan tam 6 ay önce: pencerenin içinde sayılır
  assert.equal(faz(sinir, ref), 'Gevşeme');
  // iki yönlü hareket: en sonuncusu belirler
  const karma = seriOlustur([['2026-01-01', 3], ['2026-05-01', 2.75], ['2026-09-01', 3], ['2026-10-20', 3]]);
  assert.equal(faz(karma, ref), 'Sıkılaştırma');
});

test('ayinSonu ve ayAnahtari: ayın son gözlemi, ZamanGrafik anahtarı', () => {
  const s = seriOlustur([['2026-09-29', 1], ['2026-09-30', 2], ['2026-10-01', 3], ['2026-10-02', 4]]);
  assert.deepEqual(ayinSonu(s), [
    { ay: '2026-09', v: 2 },
    { ay: '2026-10', v: 4 },
  ]);
  assert.equal(ayAnahtari('2026-10'), 2026 * 12 + 9);
});

test('reelFaiz ve abdAraligi', () => {
  assert.equal(reelFaiz(37, 31.5073), 5.49);
  assert.equal(reelFaiz(3.875, 3.4), 0.48);
  assert.equal(reelFaiz(3, null), null);
  assert.deepEqual(abdAraligi(3.875), { alt: 3.75, ust: 4 });
});

test('tufeSonlari: her ülkenin son aylık gözlemi', () => {
  const csv = `FREQ,REF_AREA,UNIT_MEASURE,TIME_PERIOD,OBS_VALUE
M,TR,771,2026-07,31.7
M,TR,771,2026-08,31.5
M,US,771,2026-07,3.3
M,US,771,2026-08,NaN
`;
  assert.deepEqual(tufeSonlari(csv), {
    TR: { donem: '2026-08', deger: 31.5 },
    US: { donem: '2026-07', deger: 3.3 },
  });
});

test('cogunlukDonemi: çoğunluk, eşitlikte en yeni', () => {
  assert.equal(cogunlukDonemi(['2026-08', '2026-08', '2026-07', null]), '2026-08');
  assert.equal(cogunlukDonemi(['2026-07', '2026-08']), '2026-08');
  assert.equal(cogunlukDonemi([]), null);
});

test('faizSatiri: ABD aralığı, reel faiz orta noktayla, 12 aydan eski TÜFE dışarıda', () => {
  const abd = ULKELER.find((u) => u.kod === 'USA');
  const seri = seriOlustur([
    ['2025-10-01', 4.125],
    ['2025-10-31', 3.875],
    ['2026-09-17', 3.875],
    ['2026-10-20', 3.875],
  ]);
  const s = faizSatiri({ ulke: abd, seri, tufe: { donem: '2026-08', deger: 3.4 }, ref: '2026-10-20', bugun: '2026-10-28' });
  assert.deepEqual(s.aralik, { alt: 3.75, ust: 4 });
  assert.equal(s.reel, 0.48);
  assert.equal(s.faz, 'Beklemede');
  assert.equal(s.tarih, '2026-10-20');
  const eski = faizSatiri({ ulke: abd, seri, tufe: { donem: '2025-06', deger: 3.4 }, ref: '2026-10-20', bugun: '2026-10-28' });
  assert.equal(eski.tufe, null);
  assert.equal(eski.reel, null);
  assert.equal(faizSatiri({ ulke: abd, seri: [], tufe: null, ref: '2026-10-20' }), null);
});

test('tcmbIleUzat: BIS sonrasındaki TCMB kararları eklenir', async () => {
  const { tcmbIleUzat, sonHareket, faz } = await import('./dunya-faizleri.mjs');
  const seri = [
    { t: '2026-01-22', v: 38 },
    { t: '2026-01-23', v: 37 },
    { t: '2026-10-16', v: 37 },
  ];
  const gecmis = [
    { tarih: '2026-01-23', oran: 37 },
    { tarih: '2026-10-23', oran: 36 },
  ];
  const u = tcmbIleUzat(seri, gecmis);
  assert.equal(u.length, 4);
  assert.deepEqual(u.at(-1), { t: '2026-10-23', v: 36, kaynak: 'tcmb' });
  assert.equal(sonHareket(u).bp, -100);
  assert.equal(faz(u), 'Gevşeme');
  assert.equal(seri.length, 3);
  assert.equal(tcmbIleUzat(seri, null).length, 3);
});
