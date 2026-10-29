// Kur oynaklığı sayfası (/veri/kur-oynakligi/): yalnız geçmiş istatistik, tahmin yok (sahibi kararı, 29.10.2026).
//  - Günlük seriler resmi kaynaklardan: dolar/TL ve euro/TL TCMB gösterge niteliğindeki döviz satış kuru (EVDS), geniş
//      dolar endeksi Fed (FRED DTWEXBGS), euro/dolar ECB referans kuru. src/data/kur-gunluk.json'da birikir; her turda
//      yalnız son 60 gün yeniden çekilir (--tam bütün geçmişi 2005'ten yeniden çeker). Bir kaynak alınamazsa o sütunun
//      eski değerleri kalır.
//  - Hesap (ağsız, saniyeler): gerçekleşmiş oynaklık (30 ve 90 iş günü, yıllık %), 21 iş günlük değişimlerin dağılımı
//      ve dilimleri (yalnız yüzde), ay ve haftanın günü etkisi (Mann-Whitney U, Holm düzeltmesi; Kruskal-Wallis).
//      Sonuç src/data/kur-oynakligi.json. Kur düzeyi (TL) çıktıya yazılmaz.
//
// Kullanım: node scripts/veri/kur-oynakligi.mjs [--yaz] [--tam]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { evdsCek } from '../haberler/evds-ek.mjs';
import { hentMetin } from '../haberler/lib.mjs';

const GUNLUK_DOSYA = fileURLToPath(new URL('../../src/data/kur-gunluk.json', import.meta.url));
const CIKTI_DOSYA = fileURLToPath(new URL('../../src/data/kur-oynakligi.json', import.meta.url));
const BAS = '2005-01-01';
const GERI_GUN = 60;
export const YILLIK = 252;
export const SERILER = [
  { id: 'usdtry', ad: 'Dolar/TL', kaynak: 'TCMB gösterge niteliğindeki ABD doları satış kuru (EVDS)', ertesiGunTarihli: true },
  { id: 'eurtry', ad: 'Euro/TL', kaynak: 'TCMB gösterge niteliğindeki euro satış kuru (EVDS)', ertesiGunTarihli: true },
  { id: 'genisDolar', ad: 'Geniş dolar endeksi', kaynak: 'Fed, nominal geniş dolar endeksi (FRED DTWEXBGS)' },
  { id: 'eurusd', ad: 'Euro/dolar', kaynak: 'ECB euro referans kuru, ABD doları karşılığı' },
];
const ALFA = 0.05;
const yuvarla = (n, b) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** b) / 10 ** b);
const gunOf = (tarih) => Date.UTC(Number(tarih.slice(0, 4)), Number(tarih.slice(5, 7)) - 1, Number(tarih.slice(8, 10))) / 86400000;
const tarihOf = (gun) => new Date(gun * 86400000).toISOString().slice(0, 10);

// ---------- Kaynaklar ----------

async function evdsAl(bas, bit, anahtar) {
  // EVDS istek başına en çok 1000 satır verir (hafta sonları boş satır olarak gelir); iki yıllık parçalarla çekilir.
  const out = new Map();
  for (let g = gunOf(bas); g <= gunOf(bit); g += 730) {
    const p = await evdsCek(['TP.DK.USD.S.YTL', 'TP.DK.EUR.S.YTL'], [0, 0], new Date(g * 86400000), new Date(Math.min(g + 729, gunOf(bit)) * 86400000), anahtar);
    for (const s of p) {
      if (!s.tarih) continue;
      if (s.TP_DK_USD_S_YTL != null) out.set(`usdtry|${s.tarih}`, s.TP_DK_USD_S_YTL);
      if (s.TP_DK_EUR_S_YTL != null) out.set(`eurtry|${s.tarih}`, s.TP_DK_EUR_S_YTL);
    }
  }
  return out;
}

export function fredAyristir(csv) {
  const out = new Map();
  for (const satir of csv.split(/\r?\n/).slice(1)) {
    const [tarih, deger] = satir.split(',');
    const n = Number(deger);
    if (/^\d{4}-\d{2}-\d{2}$/.test(tarih) && deger !== '.' && deger !== '' && Number.isFinite(n)) out.set(`genisDolar|${tarih}`, n);
  }
  return out;
}

export function ecbAyristir(csv) {
  const satirlar = csv.split(/\r?\n/).filter(Boolean);
  const bas = satirlar[0].split(',');
  const ti = bas.indexOf('TIME_PERIOD');
  const vi = bas.indexOf('OBS_VALUE');
  if (ti < 0 || vi < 0) throw new Error('ECB yanıtı ayrıştırılamadı');
  const out = new Map();
  for (const s of satirlar.slice(1)) {
    const a = s.split(',');
    const n = Number(a[vi]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(a[ti]) && a[vi] !== '' && Number.isFinite(n)) out.set(`eurusd|${a[ti]}`, n);
  }
  return out;
}

const fredAl = async (bas) => fredAyristir(await hentMetin(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=DTWEXBGS&cosd=${bas}`, { timeout: 30000 }));
const ecbAl = async (bas) =>
  ecbAyristir(await hentMetin(`https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=${bas}&format=csvdata&detail=dataonly`, { timeout: 30000 }));

// Günlük tablo: her satır [tarih, ...SERILER sırasında değer|null]. Yeni çekilen değerler aynı günün eskisinin yerine geçer.
export function gunlukBirlestir(eskiSatirlar, yeni) {
  const tablo = new Map(eskiSatirlar.map((s) => [s[0], [...s]]));
  for (const [k, d] of yeni) {
    const [id, tarih] = k.split('|');
    const i = SERILER.findIndex((s) => s.id === id) + 1;
    if (!tablo.has(tarih)) tablo.set(tarih, [tarih, ...SERILER.map(() => null)]);
    tablo.get(tarih)[i] = d;
  }
  return [...tablo.values()].filter((s) => s.slice(1).some((d) => d != null)).sort((a, b) => a[0].localeCompare(b[0]));
}

// Elle okunur, satır başına bir gün; yeni günler dosyanın sonuna eklenir.
export const gunlukJson = (v) =>
  `{\n  "kaynaklar": ${JSON.stringify(v.kaynaklar)},\n  "sutunlar": ${JSON.stringify(v.sutunlar)},\n  "satirlar": [\n${v.satirlar
    .map((s) => `    ${JSON.stringify(s)}`)
    .join(',\n')}\n  ]\n}\n`;

// ---------- İstatistik ----------

export function ortalama(x) {
  return x.reduce((a, b) => a + b, 0) / x.length;
}

export function stdSapma(x) {
  const m = ortalama(x);
  return Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1));
}

// Doğrusal aradeğerli dilim (R type 7, Excel PERCENTILE.INC).
export function dilim(sirali, q) {
  const h = (sirali.length - 1) * q;
  const a = Math.floor(h);
  return sirali[a] + (h - a) * ((sirali[Math.min(a + 1, sirali.length - 1)] ?? sirali[a]) - sirali[a]);
}

export function medyan(x) {
  return dilim([...x].sort((a, b) => a - b), 0.5);
}

// Ortak sıralama (bağlarda ortalama sıra) ve bağ düzeltmesi için Σ(t³ − t).
function siralar(degerler) {
  const idx = degerler.map((d, i) => [d, i]).sort((a, b) => a[0] - b[0]);
  const sira = new Array(degerler.length);
  let bag = 0;
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) sira[idx[k][1]] = r;
    const t = j - i + 1;
    bag += t ** 3 - t;
    i = j + 1;
  }
  return { sira, bag };
}

// Standart normal üst kuyruk (erfc, Numerical Recipes erfcc; hata < 1,2e-7).
export function normalUst(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const e =
    t *
    Math.exp(
      -x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return z >= 0 ? e / 2 : 1 - e / 2;
}

// İki taraflı Mann-Whitney U, normal yaklaşım, bağ ve süreklilik düzeltmeli.
export function mannWhitney(a, b) {
  const { sira, bag } = siralar([...a, ...b]);
  const n1 = a.length;
  const n2 = b.length;
  const n = n1 + n2;
  const r1 = sira.slice(0, n1).reduce((s, r) => s + r, 0);
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const varyans = ((n1 * n2) / 12) * (n + 1 - bag / (n * (n - 1)));
  const z = (Math.abs(u - mu) - 0.5) / Math.sqrt(varyans);
  return { u, z: Math.sign(u - mu) * Math.max(z, 0), p: Math.min(1, 2 * normalUst(Math.max(z, 0))) };
}

// ln Γ (Lanczos) ve düzenlenmiş üst eksik gama Q(a, x) (Numerical Recipes gser/gcf).
function lnGama(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const t = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let s = 1.000000000190015;
  for (const k of c) s += k / ++y;
  return -t + Math.log((2.5066282746310005 * s) / x);
}

export function gamaUst(a, x) {
  if (x <= 0) return 1;
  const g = lnGama(a);
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let i = 0; i < 500; i++) {
      del *= x / ++ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - g);
  }
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - g) * h;
}

// Kruskal-Wallis H, bağ düzeltmeli; p ki-kare (k − 1 sd) yaklaşımıyla.
export function kruskalWallis(gruplar) {
  const dolu = gruplar.filter((g) => g.length > 0);
  const hepsi = dolu.flat();
  const n = hepsi.length;
  const { sira, bag } = siralar(hepsi);
  let i = 0;
  let h = 0;
  for (const g of dolu) {
    const r = sira.slice(i, i + g.length).reduce((s, x) => s + x, 0);
    h += r ** 2 / g.length;
    i += g.length;
  }
  h = (12 / (n * (n + 1))) * h - 3 * (n + 1);
  h /= 1 - bag / (n ** 3 - n);
  const sd = dolu.length - 1;
  return { h, sd, p: gamaUst(sd / 2, h / 2) };
}

// Holm-Bonferroni: düzeltilmiş p'ler, özgün sırada.
export function holm(pler) {
  const sira = pler.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(pler.length);
  let enBuyuk = 0;
  sira.forEach(([p, i], k) => {
    enBuyuk = Math.max(enBuyuk, Math.min(1, (pler.length - k) * p));
    out[i] = enBuyuk;
  });
  return out;
}

// [tarih, değer] dizisinden günlük log getiriler (ardışık iki gözlem arası; tatil ve hafta sonu atlanır).
export function logGetiriler(gozlem) {
  const out = [];
  for (let i = 1; i < gozlem.length; i++) out.push({ tarih: gozlem[i][0], onceki: gozlem[i - 1][0], r: Math.log(gozlem[i][1] / gozlem[i - 1][1]) });
  return out;
}

// Son `pencere` getirinin örneklem standart sapması × √252, yüzde.
export function kayanOynaklik(getiriler, pencere) {
  const out = [];
  for (let i = pencere - 1; i < getiriler.length; i++) {
    const p = getiriler.slice(i - pencere + 1, i + 1).map((g) => g.r);
    out.push({ tarih: getiriler[i].tarih, v: stdSapma(p) * Math.sqrt(YILLIK) * 100 });
  }
  return out;
}

// Her haftanın (pazartesi başlangıçlı) son gözlemi; grafik haftalık çizilir.
export function haftaSonlari(dizi) {
  const out = new Map();
  for (const x of dizi) out.set(Math.floor((gunOf(x.tarih) - 4) / 7), x);
  return [...out.values()];
}

// Örtüşen 21 iş günlük yüzde değişimler; `bitis` değişimin bittiği gün.
export function donemDegisimleri(gozlem, ufuk = 21) {
  const out = [];
  for (let i = ufuk; i < gozlem.length; i++) out.push({ bitis: gozlem[i][0], d: (gozlem[i][1] / gozlem[i - ufuk][1] - 1) * 100 });
  return out;
}

const KUTU_GENISLIKLERI = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10];

// Dağılım özeti: dilimler ve histogram. Kutular %0,5 ile %99,5 dilimleri arasını 20-40 kutuya böler; uç değerler
// ilk ve son kutuya katılır (etiketlerde "ve altı/üstü").
export function dagilimOzeti(degisimler) {
  const d = degisimler.map((x) => x.d).sort((a, b) => a - b);
  const alt0 = dilim(d, 0.005);
  const ust0 = dilim(d, 0.995);
  const genislik = KUTU_GENISLIKLERI.find((g) => (ust0 - alt0) / g <= 40) ?? 10;
  const alt = Math.floor(alt0 / genislik) * genislik;
  const ust = Math.ceil(ust0 / genislik) * genislik;
  const k = Math.max(1, Math.round((ust - alt) / genislik));
  const sayilar = new Array(k).fill(0);
  for (const x of d) sayilar[Math.min(k - 1, Math.max(0, Math.floor((x - alt) / genislik)))]++;
  return {
    n: d.length,
    bas: degisimler[0].bitis,
    bit: degisimler.at(-1).bitis,
    dilimler: Object.fromEntries([['p2_5', 0.025], ['p10', 0.1], ['p50', 0.5], ['p90', 0.9], ['p97_5', 0.975]].map(([a, q]) => [a, yuvarla(dilim(d, q), 2)])),
    enDusuk: yuvarla(d[0], 2),
    enYuksek: yuvarla(d.at(-1), 2),
    artisPayi: yuvarla((d.filter((x) => x > 0).length / d.length) * 100, 1),
    kutular: { alt: yuvarla(alt, 4), genislik, paylar: sayilar.map((s) => yuvarla((s / d.length) * 100, 2)) },
  };
}

// Grup etkisi tablosu: her grup için n, ortalama, medyan, artış payı; grup ile geri kalanı arasında Mann-Whitney
// (Holm düzeltmeli) ve bütün gruplar için Kruskal-Wallis.
export function etkiTablosu(degerler, grupOf, grupAnahtarlari, ondalik) {
  const gruplar = grupAnahtarlari.map((g) => degerler.filter((x) => grupOf(x) === g).map((x) => x.d));
  const testler = gruplar.map((g, i) => mannWhitney(g, gruplar.filter((_, j) => j !== i).flat()));
  const duzeltilmis = holm(testler.map((t) => t.p));
  const kw = kruskalWallis(gruplar);
  return {
    satirlar: grupAnahtarlari.map((g, i) => ({
      grup: g,
      n: gruplar[i].length,
      ortalama: yuvarla(ortalama(gruplar[i]), ondalik),
      medyan: yuvarla(medyan(gruplar[i]), ondalik),
      artisPayi: yuvarla((gruplar[i].filter((x) => x > 0).length / gruplar[i].length) * 100, 1),
      p: yuvarla(testler[i].p, 4),
      pDuzeltilmis: yuvarla(duzeltilmis[i], 4),
      anlamli: duzeltilmis[i] < ALFA,
      yon: testler[i].z > 0 ? 'yuksek' : 'dusuk',
    })),
    kruskalWallis: { h: yuvarla(kw.h, 2), sd: kw.sd, p: yuvarla(kw.p, 4), anlamli: kw.p < ALFA },
  };
}

// Ay sonundan ay sonuna yüzde değişim; son gözlemin ayı bitmemiş sayılır ve atılır.
export function aylikDegisimler(gozlem) {
  const sonlar = new Map();
  for (const g of gozlem) sonlar.set(g[0].slice(0, 7), g);
  const aylar = [...sonlar.values()].slice(0, -1);
  const out = [];
  for (let i = 1; i < aylar.length; i++) out.push({ ay: Number(aylar[i][0].slice(5, 7)), donem: aylar[i][0].slice(0, 7), d: (aylar[i][1] / aylar[i - 1][1] - 1) * 100 });
  return out;
}

// TCMB kuru 15.30'da belirlenir ve EVDS'ye ertesi iş gününün tarihiyle girer (TCMB arşivindeki 02032020.xml'in kuru
// EVDS'de 3 Mart 2020'dir). `ertesiGunTarihli` seride haftanın günü, kurun belirlendiği gün, yani önceki gözlemin tarihidir.
export function seriHesapla(gozlem, { ertesiGunTarihli = false } = {}) {
  const getiri = logGetiriler(gozlem);
  const v30 = kayanOynaklik(getiri, 30);
  const v90 = kayanOynaklik(getiri, 90);
  const v90m = new Map(v90.map((x) => [x.tarih, x.v]));
  const uzun = stdSapma(getiri.map((g) => g.r)) * Math.sqrt(YILLIK) * 100;
  const degisim = donemDegisimleri(gozlem);
  const sonTarih = gozlem.at(-1)[0];
  const bes = `${Number(sonTarih.slice(0, 4)) - 5}${sonTarih.slice(4)}`;
  const aylik = aylikDegisimler(gozlem);
  // Haftanın günü: o güne biten günlük değişim (pazartesininki cumadan itibaren), yüzde.
  const gunluk = getiri
    .map((g) => ({ gun: new Date(gunOf(ertesiGunTarihli ? g.onceki : g.tarih) * 86400000).getUTCDay(), d: (Math.exp(g.r) - 1) * 100 })).filter((g) => g.gun >= 1 && g.gun <= 5);
  return {
    ilk: gozlem[0][0],
    son: sonTarih,
    gozlem: gozlem.length,
    oynaklik: {
      son30: yuvarla(v30.at(-1).v, 1),
      son90: yuvarla(v90.at(-1).v, 1),
      uzun: yuvarla(uzun, 1),
      // Yüzdelik sıra: son 30 günlük oynaklık bütün geçmiş 30 günlük oynaklıkların yüzde kaçından yüksekti.
      son30Sira: yuvarla((v30.filter((x) => x.v < v30.at(-1).v).length / v30.length) * 100, 0),
      enYuksek30: { v: yuvarla(Math.max(...v30.map((x) => x.v)), 1), tarih: v30.reduce((a, b) => (b.v > a.v ? b : a)).tarih },
    },
    grafik: haftaSonlari(v30).map((x) => [gunOf(x.tarih), yuvarla(x.v, 1), yuvarla(v90m.get(x.tarih) ?? null, 1)]),
    dagilim: { tum: dagilimOzeti(degisim), son5: dagilimOzeti(degisim.filter((x) => x.bitis > bes)) },
    ay: { ilk: aylik[0].donem, son: aylik.at(-1).donem, ...etkiTablosu(aylik, (x) => x.ay, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2) },
    gun: etkiTablosu(gunluk, (x) => x.gun, [1, 2, 3, 4, 5], 3),
  };
}

export function hesapla(gunluk) {
  const seriler = SERILER.map((s, i) => {
    const gozlem = gunluk.satirlar.filter((r) => r[i + 1] != null && r[i + 1] > 0).map((r) => [r[0], r[i + 1]]);
    if (gozlem.length < 1000) throw new Error(`${s.id} serisi yetersiz (${gozlem.length} gün)`);
    return { id: s.id, ad: s.ad, kaynak: s.kaynak, ...seriHesapla(gozlem, s) };
  });
  return { yontem: { yillik: YILLIK, ufuk: 21, alfa: ALFA }, seriler };
}

// ---------- Çalıştırma ----------

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const tam = process.argv.includes('--tam');
  let eski = null;
  try {
    eski = JSON.parse(await readFile(GUNLUK_DOSYA, 'utf8'));
  } catch {}
  const simdi = new Date();
  const bugun = simdi.toISOString().slice(0, 10);
  const bas = !eski || tam ? BAS : tarihOf(gunOf(eski.satirlar.at(-1)[0]) - GERI_GUN);
  const yeni = new Map();
  const anahtar = process.env.EVDS_API_KEY?.replace(/^﻿/, '').trim();
  const kaynaklar = [
    ['TCMB EVDS', () => (anahtar ? evdsAl(bas, bugun, anahtar) : Promise.reject(new Error('EVDS_API_KEY yok')))],
    ['FRED', () => fredAl(bas)],
    ['ECB', () => ecbAl(bas)],
  ];
  for (const [ad, al] of kaynaklar) {
    try {
      const m = await al();
      for (const [k, d] of m) yeni.set(k, d);
      console.log(`[kur-oynakligi] ${ad}: ${m.size} gözlem`);
    } catch (e) {
      console.error(`[kur-oynakligi] ${ad} alınamadı, eski değerler kalıyor: ${e.message}`);
    }
  }
  const gunluk = {
    kaynaklar: SERILER.map((s) => s.kaynak),
    sutunlar: ['tarih', ...SERILER.map((s) => s.id)],
    satirlar: gunlukBirlestir(eski?.satirlar ?? [], yeni),
  };
  try {
    const sonuc = hesapla(gunluk);
    let ciktiEski = null;
    try {
      ciktiEski = JSON.parse(await readFile(CIKTI_DOSYA, 'utf8'));
    } catch {}
    const { alinma: _a, ...eskiVeri } = ciktiEski ?? {};
    const degisti = JSON.stringify(eskiVeri) !== JSON.stringify(sonuc);
    if (process.argv.includes('--yaz')) {
      const metin = gunlukJson(gunluk);
      if (!eski || metin !== gunlukJson(eski)) await writeFile(GUNLUK_DOSYA, metin);
      if (degisti) await writeFile(CIKTI_DOSYA, JSON.stringify({ alinma: simdi.toISOString(), ...sonuc }) + '\n');
      console.log(`[kur-oynakligi] ${gunluk.satirlar.length} gün${degisti ? ', sonuç güncellendi' : ', değişiklik yok'}`);
    } else {
      for (const s of sonuc.seriler) console.log(s.id, s.son, JSON.stringify(s.oynaklik), JSON.stringify(s.dagilim.tum.dilimler));
    }
  } catch (e) {
    console.error(`[kur-oynakligi] hesaplanamadı, dosyalar korunuyor: ${e.message}`);
    process.exit(1);
  }
}
