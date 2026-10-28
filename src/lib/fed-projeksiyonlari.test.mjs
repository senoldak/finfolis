import test from 'node:test';
import assert from 'node:assert/strict';
import {
  degerAyristir,
  tablolariAyir,
  tablo1Ayristir,
  sekil2Ayristir,
  sepAyristir,
  takvimLinkleri,
  noktaMedyani,
  gerceklesenFaiz,
  gecmisKarsilastirma,
  sepDonemi,
} from './fed-projeksiyonlari.mjs';

const BASLIK1 = `<tr><th rowspan="2">Variable</th><th colspan="3">Median<sup>1</sup></th><th colspan="3">Central Tendency</th><th colspan="3">Range</th></tr>`;
const YILLAR = ['2026', '2027', 'Longer run'];
const yilSatiri = `<tr>${[...YILLAR, ...YILLAR, ...YILLAR].map((y) => `<th class="colhead">${y}</th>`).join('')}</tr>`;
const satir = (ad, d, onceki = false) =>
  `<tr><th class="stub${onceki ? ' in1' : ''}">${ad}</th>${d.map((v) => `<td class="data">${v === null ? '&nbsp;' : v}</td>`).join('')}</tr>`;

const SAYFA = `
<h4 class="tablehead" id="xt1">Table 1. Economic projections, September 2026</h4>
<p>Percent</p>
<table><thead>${BASLIK1}${yilSatiri}</thead><tbody>
${satir('Change in real GDP', ['2.3', '2.4', '2.0', '2.2–2.4', '2.2–2.6', '2.0–2.2', '2.1–2.6', '2.0–2.9', '1.7–2.5'])}
${satir('June projection', ['2.2', '2.3', '2.0', '2.0–2.3', '2.0–2.4', '1.8–2.0', '1.8–2.6', '1.9–2.9', '1.7–2.5'], true)}
${satir('Unemployment rate', ['4.1', '4.1', '4.2', '4.1–4.2', '4.0–4.2', '4.0–4.3', '4.0–4.3', '4.0–4.5', '3.8–4.4'])}
${satir('June projection', ['4.3', '4.3', '4.2', '4.3–4.4', '4.2–4.5', '4.0–4.3', '4.3–4.6', '4.0–4.6', '3.8–4.5'], true)}
${satir('PCE inflation', ['3.7', '2.3', '2.0', '3.5–3.7', '2.2–2.5', '2.0', '2.9–3.8', '2.0–2.6', '2.0'])}
${satir('June projection', ['3.6', '2.3', '2.0', '3.5–3.7', '2.2–2.5', '2.0', '2.7–4.1', '1.9–2.8', '2.0'], true)}
${satir('Core PCE inflation<sup>4</sup>', ['3.4', '2.5', null, '3.3–3.4', '2.3–2.6', null, '2.8–3.5', '2.1–2.7', null])}
${satir('June projection', ['3.3', '2.5', null, '3.2–3.5', '2.3–2.6', null, '2.6–3.5', '2.0–3.0', null], true)}
<tr><th class="stub">Memo: Projected appropriate policy path</th></tr>
${satir('Federal funds rate', ['4.1', '4.1', '3.2', '4.1–4.4', '3.6–4.4', '3.0–3.6', '3.9–4.4', '3.1–4.4', '2.9–3.9'])}
${satir('June projection', ['3.8', '3.6', '3.1', '3.6–4.1', '3.1–3.9', '3.0–3.5', '3.4–4.4', '2.9–4.4', '2.9–3.9'], true)}
</tbody></table>
<h4 class="tablehead" id="xt6">Figure 2. FOMC participants’ assessments</h4>
<p>Number of participants</p>
<table><thead><tr><th>Midpoint (Percent)</th><th>2026</th><th>2027</th><th>Longer run</th></tr></thead><tbody>
<tr><th>3.875</th><td>&nbsp;</td><td>2</td><td>&nbsp;</td></tr>
<tr><th>4.125</th><td>12</td><td>6</td><td>&nbsp;</td></tr>
<tr><th>4.000</th><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
<tr><th>4.375</th><td>4</td><td>8</td><td>&nbsp;</td></tr>
<tr><th>3.125</th><td>&nbsp;</td><td>&nbsp;</td><td>9</td></tr>
<tr><th>3.250</th><td>&nbsp;</td><td>&nbsp;</td><td>9</td></tr>
</tbody></table>`;

test('degerAyristir: sayı, aralık, boş ve eksi', () => {
  assert.equal(degerAyristir('2.3'), 2.3);
  assert.equal(degerAyristir('-0.2'), -0.2);
  assert.deepEqual(degerAyristir('2.2–2.4'), [2.2, 2.4]);
  assert.deepEqual(degerAyristir('-0.2–1.3'), [-0.2, 1.3]);
  assert.equal(degerAyristir(''), null);
  assert.equal(degerAyristir('abc'), null);
});

test('tablolariAyir: başlıkları ve satırları verir, dipnot üst simgesini atar', () => {
  const t = tablolariAyir(SAYFA);
  assert.equal(t.length, 2);
  assert.match(t[0].baslik, /^Table 1/);
  assert.equal(t[0].satirlar[2][0].metin, 'Change in real GDP');
});

test('tablo1Ayristir: medyan, önceki projeksiyon, boş hücre ve çekirdek PCE', () => {
  const { yillar, degiskenler } = tablo1Ayristir(tablolariAyir(SAYFA)[0]);
  assert.deepEqual(yillar, [2026, 2027, 'uzun']);
  assert.deepEqual(degiskenler.faiz.medyan, [4.1, 4.1, 3.2]);
  assert.deepEqual(degiskenler.faiz.onceki, [3.8, 3.6, 3.1]);
  assert.deepEqual(degiskenler.gsyh.ortaEgilim[0], [2.2, 2.4]);
  assert.deepEqual(degiskenler.cekirdekPce.medyan, [3.4, 2.5, null]);
  assert.deepEqual(degiskenler.pce.medyan, [3.7, 2.3, 2.0]);
  assert.deepEqual(degiskenler.issizlik.onceki, [4.3, 4.3, 4.2]);
});

test('tablo1Ayristir: eksik değişken hata verir', () => {
  const t = tablolariAyir(SAYFA)[0];
  const eksik = { ...t, satirlar: t.satirlar.filter((s) => !/^Federal funds/.test(s[0].metin)) };
  assert.throws(() => tablo1Ayristir(eksik), /faiz/);
});

test('sekil2Ayristir: boş hücreleri null yapar, boş oran satırını atar, yüksekten alçağa sıralar', () => {
  const n = sekil2Ayristir(tablolariAyir(SAYFA)[1]);
  assert.deepEqual(n.yillar, [2026, 2027, 'uzun']);
  assert.deepEqual(n.satirlar.map((s) => s.oran), [4.375, 4.125, 3.875, 3.25, 3.125]);
  assert.deepEqual(n.satirlar[1].sayilar, [12, 6, null]);
});

test('noktaMedyani: çift sayıda katılımcıda ortadaki ikinin ortalaması', () => {
  const n = sekil2Ayristir(tablolariAyir(SAYFA)[1]);
  // 2026: 12×4.125 + 4×4.375 = 16 kişi; ortadaki ikisi 4.125.
  assert.equal(noktaMedyani(n, 0), 4.125);
  // uzun: 9×3.125 + 9×3.25 = 18 kişi; 9. 3.125, 10. 3.25.
  assert.equal(noktaMedyani(n, 2), 3.1875);
});

test('sepAyristir: tarih, url ve katılımcı sayısı', () => {
  const s = sepAyristir(SAYFA, { tarih: '2026-09-16', url: 'https://x/y.htm' });
  assert.equal(s.tarih, '2026-09-16');
  assert.deepEqual(s.katilimci, [16, 16, 18]);
  assert.throws(() => sepAyristir('<p>yok</p>', { tarih: 'a', url: 'b' }), /Tablo 1/);
});

test('takvimLinkleri: yalnız 2023 ve sonrası, tekrarsız, eskiden yeniye, göreli bağlantı mutlak olur', () => {
  const html = `
    <a href="/monetarypolicy/fomcprojtabl20220921.htm">HTML</a>
    <a href="/monetarypolicy/fomcprojtabl20230322.htm">HTML</a>
    <a href="/monetarypolicy/fomcprojtabl20230322.pdf">PDF</a>
    <a href="/monetarypolicy/fomcprojtabl20230322.htm">HTML</a>
    <a href="/monetarypolicy/fomcprojtabl20260916.htm">HTML</a>`;
  const l = takvimLinkleri(html);
  assert.deepEqual(l.map((x) => x.tarih), ['2023-03-22', '2026-09-16']);
  assert.equal(l[0].url, 'https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20230322.htm');
});

const csv = (ad, satirlar) => `observation_date,${ad}\n${satirlar.map(([g, v]) => `${g},${v}`).join('\n')}\n`;

test('gerceklesenFaiz: orta nokta, yıl sonu ve yalnız biten çeyrekler', () => {
  const ust = csv('DFEDTARU', [['2025-12-30', '3.75'], ['2025-12-31', '3.75'], ['2026-03-31', '4.00'], ['2026-04-02', '4.25']]);
  const alt = csv('DFEDTARL', [['2025-12-30', '3.50'], ['2025-12-31', '3.50'], ['2026-03-31', '3.75'], ['2026-04-02', '4.00']]);
  const g = gerceklesenFaiz(ust, alt);
  assert.equal(g.yilSonu[2025].orta, 3.625);
  assert.equal(g.yilSonu[2025].tamam, true);
  assert.equal(g.yilSonu[2026].tamam, false);
  assert.equal(g.yilSonu[2026].orta, 4.125);
  assert.equal(g.sonGozlem.orta, 4.125);
  assert.deepEqual(g.ceyrekSonu.map((c) => `${c.yil}Q${c.ceyrek}`), ['2025Q4', '2026Q1']);
  assert.throws(() => gerceklesenFaiz('', ''), /boş/);
});

test('sepDonemi ve gecmisKarsilastirma: yıl sonu medyanı ile gerçekleşen fark', () => {
  assert.deepEqual(sepDonemi('2026-09-16'), { yil: 2026, ceyrek: 3 });
  const sepler = [
    { tarih: '2025-12-10', yillar: [2025, 2026, 'uzun'], degiskenler: { faiz: { medyan: [3.6, 3.4, 3.0] } } },
    { tarih: '2026-09-16', yillar: [2026, 2027, 'uzun'], degiskenler: { faiz: { medyan: [4.1, 4.1, 3.2] } } },
  ];
  const ger = {
    yilSonu: {
      2025: { tarih: '2025-12-31', orta: 3.625, tamam: true },
      2026: { tarih: '2026-10-28', orta: 3.875, tamam: false },
    },
    sonGozlem: { tarih: '2026-10-28', orta: 3.875 },
  };
  const k = gecmisKarsilastirma(sepler, ger);
  assert.equal(k[0].medyan, 3.6);
  assert.equal(k[0].gercek, 3.625);
  assert.equal(k[0].fark, 0.025);
  assert.equal(k[0].tamam, true);
  assert.equal(k[1].tamam, false);
  assert.equal(k[1].fark, -0.225);
});
