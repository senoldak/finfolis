// Grafikli kapaklar: kaynağı kapak tarifi vermeyen haberlere kendi verimizden çizgi grafiği.
//  - haberGrafigi: başlık açıkça bir piyasa aracını anıyorsa (Brent, BIST 100, Nvidia…) o aracın son altı aylık
//    günlük kapanış grafiği. Eşleşme yalnız başlıkta aranır; birden çok araç varsa başlıkta ilk geçen. Eşleşme
//    yoksa ya da veri bayatsa null döner, çağıran başlık kartına düşer (yanlış grafik basılmaz).
//  - faizGrafigi: merkez bankası duyurusuna o bankanın politika faizinin son beş yılı (resmî kaynaklardan:
//    Fed için St. Louis Fed FRED, ECB için ECB veri portalı, TCMB için resmi.json'daki repo faizi geçmişi).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { grafikKapagi } from '../kapak/kapak.mjs';
import { ENSTRUMANLAR } from './kaynaklar/esik-olaylari.mjs';
import { hentMetin } from './lib.mjs';

const GUN = 864e5;
const zaman = (t) => Date.parse(`${t}T00:00:00Z`);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const tr = (n, d = 1) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

const tanim = (id) => {
  const e = ENSTRUMANLAR.find((x) => x.id === id);
  if (!e) throw new Error(`Bilinmeyen enstrüman: ${id}`);
  return e;
};
// Eşik listesinde olmayan, yalnız kapak için kullanılan seriler.
const EK = {
  usdtry: { id: 'usdtry', ad: 'Dolar/TL', sembol: 'USDTRY=X', sonEk: ' TL', ondalik: 4 },
  eurtry: { id: 'eurtry', ad: 'Euro/TL', sembol: 'EURTRY=X', sonEk: ' TL', ondalik: 4 },
  gramaltin: { id: 'gramaltin', ad: 'Gram altın', turet: 'gramaltin', sonEk: ' TL', ondalik: 2 },
};

// Desenler küçük harfe çevrilmiş ve "ı" yerine "i" yazılmış başlıkta aranır (BIST → bist, ALTIN → altin).
// Önünde ve arkasında harf olmamalı; Türkçe ek kesmeyle ayrılır (Nvidia'nın), kesmesiz ekler desende açıkça yazılır.
export const ESLESTIRME = [
  ['s&p ?500', 'sp500'],
  ['nasdaq', 'nasdaq'],
  ['dow jones', 'dow'],
  ['euro stoxx', 'stoxx50'],
  ['dax', 'dax'],
  ['ftse ?100', 'ftse'],
  ['ftse mib', 'ftsemib'],
  ['cac ?40', 'cac40'],
  ['ibex', 'ibex'],
  ['nikkei', 'nikkei'],
  ['hang seng', 'hangseng'],
  ['şanghay bileşik|shanghai bileşik', 'sanghay'],
  ['nifty', 'nifty'],
  ['kospi', 'kospi'],
  ['taiex', 'taiex'],
  ['asx ?200', 'asx200'],
  ['i?bovespa', 'bovespa'],
  ['yari iletken endeks\\p{L}*', 'sox'],
  ['bist(?: ?100| ?30)?|borsa istanbul', 'bist100'],
  ['vix', 'vix'],
  ['abd\\p{L}*(?:\'\\p{L}+)? 10 yillik|10 yillik abd|abd tahvil faiz\\p{L}*', 'abd10y'],
  ['eur/usd|euro/dolar|euro-dolar', 'eurusd'],
  ['usd/jpy|dolar/yen|japon yen\\p{L}*|yen', 'usdjpy'],
  ['sterlin\\p{L}*|gbp/usd', 'gbpusd'],
  ['yuan\\p{L}*|usd/cny', 'usdcny'],
  ['isviçre frang\\p{L}*|usd/chf', 'usdchf'],
  ['dolar endeks\\p{L}*|dxy', 'dxy'],
  ['dolar/tl|dolar/türk lirasi|dolar kuru\\p{L}*|dolar-tl', 'usdtry'],
  ['euro/tl|avro/tl|euro kuru\\p{L}*', 'eurtry'],
  ['gram altin\\p{L}*', 'gramaltin'],
  ['ons altin\\p{L}*|altin(?:in|a|da|dan)?(?= fiyat)|altin(?:in)?', 'altin'],
  ['gümüş(?:ün)?', 'gumus'],
  ['platin', 'platin'],
  ['brent|ham petrol\\p{L}*|petrol fiyat\\p{L}*', 'brent'],
  ['wti', 'wti'],
  ['henry hub', 'dogalgaz'],
  ['bakir(?:in)?', 'bakir'],
  ['kakao', 'kakao'],
  ['bitcoin|btc', 'bitcoin'],
  ['ethereum|ether', 'ethereum'],
  ['apple', 'aapl'],
  ['microsoft', 'msft'],
  ['nvidia', 'nvda'],
  ['amazon', 'amzn'],
  ['alphabet|google', 'googl'],
  ['meta', 'meta'],
  ['tesla', 'tsla'],
  ['broadcom', 'avgo'],
  ['tsmc', 'tsm'],
  ['jpmorgan', 'jpm'],
  ['eli lilly', 'lly'],
  ['netflix', 'nflx'],
  ['amd', 'amd'],
  ['palantir', 'pltr'],
  ['asml', 'asml'],
  ["sap(?= hisse|['’])", 'sap'],
  ['lvmh', 'lvmh'],
  ['novo nordisk', 'novo'],
  ['toyota', 'toyota'],
  ['samsung', 'samsung'],
  ['thy|thyao|türk hava yollari', 'thyao'],
  ['aselsan', 'asels'],
  ['garanti bbva', 'garan'],
  ['akbank', 'akbnk'],
  ['koç holding', 'kchol'],
  ['tüpraş', 'tuprs'],
  ['bim|bimas', 'bimas'],
  ['ereğli demir|erdemir|eregl', 'eregl'],
  ['sabanci holding', 'sahol'],
  ['yapi kredi', 'ykbnk'],
  ['iş bankasi|işbank', 'isctr'],
  ['ford otosan', 'froto'],
  ['pegasus', 'pgsus'],
  ['turkcell', 'tcell'],
  ['şişecam', 'sise'],
].map(([desen, id]) => ({ re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${desen})(?![\\p{L}])`, 'u'), e: EK[id] ?? tanim(id) }));

export const normalize = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

// Başlıkta ilk anılan piyasa aracı ya da null.
export function enstrumanBul(baslik) {
  const b = normalize(baslik);
  let enIyi = null;
  for (const { re, e } of ESLESTIRME) {
    const m = re.exec(b);
    if (m && (!enIyi || m.index < enIyi.index)) enIyi = { index: m.index, e };
  }
  return enIyi?.e ?? null;
}

const yuzde = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}%${tr(Math.abs(v))}`;

// Haberin kapağı için aracın son altı aylık grafiği; { kapak, kapakAlt } ya da null.
export async function haberGrafigi(yazi, o, okuyucu, simdi = new Date()) {
  if (!okuyucu) return null;
  const e = enstrumanBul(yazi.baslik);
  if (!e) return null;
  try {
    const ham = await okuyucu.seri(e);
    const son = ham.at(-1);
    const referans = Math.min(simdi.getTime(), new Date(o.tarih ?? simdi).getTime() || simdi.getTime());
    // Veri haberin gününden bir haftadan eskiyse grafik eski bir tabloyu gösterir: çizilmez.
    if (!son || referans - zaman(son.tarih) > 7 * GUN) return null;
    const seri = ham.filter((p) => zaman(p.tarih) >= zaman(son.tarih) - 182 * GUN);
    if (seri.length < 60) return null;
    const degisim = (son.deger / seri[0].deger - 1) * 100;
    const gunluk = son.deger - seri.at(-2).deger;
    const od = e.ondalik ?? 2;
    const deger = `${e.onEk ?? ''}${tr(son.deger, od)}${e.sonEk ?? ''}`;
    return {
      kapak: grafikKapagi({
        kategori: o.kategori ?? yazi.kategori,
        ust: `${e.ad} · son 6 ay`,
        baslik: yazi.baslik,
        seri,
        vurgu: `6 ayda ${yuzde(degisim)}`,
        olay: { bas: seri.at(-2).tarih, yon: gunluk < 0 ? 'dusus' : 'yukselis' },
        onEk: e.onEk ?? '',
        sonEk: e.sonEk ?? '',
        ondalik: od,
      }),
      kapakAlt: `${e.ad} son altı ay günlük kapanış grafiği: altı ayda ${yuzde(degisim)}, son kapanış ${deger}`,
    };
  } catch (err) {
    console.error(`[grafik-kapak] ${e.sembol ?? e.turet}: ${err.message}`);
    return null;
  }
}

// ── Politika faizi ──────────────────────────────────────────────────────

const FRED = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARU';
const ECB_DFR = 'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?format=csvdata';
const RESMI = fileURLToPath(new URL('../../src/data/resmi.json', import.meta.url));

// FRED CSV: "observation_date,DFEDTARU" başlığı, ardından "YYYY-MM-DD,4.00". Boş değer "." olabilir.
export function fredCsv(metin) {
  return metin
    .split(/\r?\n/)
    .slice(1)
    .map((s) => s.split(','))
    .filter(([t, v]) => /^\d{4}-\d{2}-\d{2}$/.test(t) && Number.isFinite(Number(v)) && v !== '')
    .map(([tarih, v]) => ({ tarih, deger: Number(v) }));
}

// ECB veri portalı csvdata: başlık satırında TIME_PERIOD ve OBS_VALUE sütunları.
export function ecbCsv(metin) {
  const [bas, ...satirlar] = metin.split(/\r?\n/).filter(Boolean);
  const sutun = bas.split(',');
  const [ti, vi] = [sutun.indexOf('TIME_PERIOD'), sutun.indexOf('OBS_VALUE')];
  if (ti < 0 || vi < 0) throw new Error('ECB yanıtı beklenen sütunları içermiyor');
  return satirlar
    .map((s) => s.split(','))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p[ti]) && p[vi] !== '' && Number.isFinite(Number(p[vi])))
    .map((p) => ({ tarih: p[ti], deger: Number(p[vi]) }));
}

// Değişiklik listesinden ([{ tarih, oran }]) basamaklı seri: her değişiklikten bir gün önce eski oran, o gün yeni oran.
export function basamakli(degisiklikler, bitis) {
  const out = [];
  for (const [i, d] of degisiklikler.entries()) {
    if (i) out.push({ tarih: iso(zaman(d.tarih) - GUN), deger: degisiklikler[i - 1].oran });
    out.push({ tarih: d.tarih, deger: d.oran });
  }
  if (out.length && out.at(-1).tarih < bitis) out.push({ tarih: bitis, deger: out.at(-1).deger });
  return out;
}

const FAIZ = {
  Fed: { ad: 'Fed politika faizi üst sınırı', kaynak: async (bas) => fredCsv(await hentMetin(`${FRED}&cosd=${bas}`)) },
  ECB: { ad: 'ECB mevduat faizi', kaynak: async (bas) => ecbCsv(await hentMetin(`${ECB_DFR}&startPeriod=${bas}`)) },
  TCMB: {
    ad: 'TCMB politika faizi',
    kaynak: async (bas, bitis) => {
      const r = JSON.parse(await readFile(RESMI, 'utf8'));
      return basamakli(r.faiz?.gecmis ?? [], bitis).filter((p) => p.tarih >= bas);
    },
  },
};

// Merkez bankası duyurusu kapağı: politika faizinin son beş yılı. yeni: bu duyuruyla açıklanan oran (seride henüz
// yoksa duyuru gününe eklenir). { kapak, kapakAlt } ya da null.
export async function faizGrafigi({ kurum, konu, kategori, tarih = new Date(), yeni }) {
  const f = FAIZ[kurum];
  if (!f) return null;
  try {
    const bitis = iso(tarih.getTime());
    const bas = iso(tarih.getTime() - 5 * 365.25 * GUN);
    let seri = (await f.kaynak(bas, bitis)).filter((p) => p.tarih <= bitis);
    if (seri.length < 2) return null;
    if (Number.isFinite(yeni) && yeni !== seri.at(-1).deger) {
      seri = [...seri.filter((p) => p.tarih < bitis), { tarih: iso(zaman(bitis) - GUN), deger: seri.at(-1).deger }, { tarih: bitis, deger: yeni }];
    }
    const son = seri.at(-1).deger;
    const yilOnce = [...seri].reverse().find((p) => zaman(p.tarih) <= zaman(bitis) - 365.25 * GUN);
    const fark = yilOnce ? son - yilOnce.deger : null;
    const vurgu = fark == null || Math.abs(fark) < 0.001 ? `Faiz %${tr(son, 2)}` : `Bir yılda ${fark > 0 ? '+' : '−'}${tr(Math.abs(fark) * 100, 0)} baz puan`;
    return {
      kapak: grafikKapagi({
        kategori,
        ust: `${f.ad} · son 5 yıl`,
        baslik: konu,
        seri,
        vurgu,
        onEk: '%',
        ondalik: 2,
      }),
      kapakAlt: `${f.ad} son beş yıl grafiği: güncel oran yüzde ${tr(son, 2)}`,
    };
  } catch (err) {
    console.error(`[grafik-kapak] ${kurum} faiz geçmişi: ${err.message}`);
    return null;
  }
}
