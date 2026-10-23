import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

// 1. Read EVDS key
const evdsConfig = JSON.parse(readFileSync(resolve(homedir(), '.evds-mcp.json'), 'utf8'));
const key = evdsConfig.api_key;

async function fetchEvds(series, start = '01-01-2004', end = '01-11-2026') {
  const url = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=${series}&startDate=${start}&endDate=${end}&type=json`;
  const res = await fetch(url, { headers: { key } });
  if (!res.ok) throw new Error(`EVDS error ${res.status} for ${series}`);
  const data = await res.json();
  return data.items || [];
}

// 2. Fetch BIST 100 from Yahoo Finance
async function fetchBist100() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?range=25y&interval=1mo';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const quote = data.chart.result[0];
  const timestamps = quote.timestamp;
  const closes = quote.indicators.quote[0].close;
  
  const map = {};
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c !== null && c !== undefined) {
      const dt = new Date(timestamps[i] * 1000);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      map[ym] = c;
    }
  }
  return map;
}

const TR_MONTHS = {
  '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
  '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
  '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
};

function formatLabel(ym) {
  const [y, m] = ym.split('-');
  return `${TR_MONTHS[m]} '${y.slice(2)}`;
}

async function run() {
  console.log('1. BIST 100 verisi çekiliyor...');
  const bist = await fetchBist100();
  const bistDates = Object.keys(bist).sort();

  console.log('2. EVDS serileri çekiliyor...');
  // TGE Archive & Current
  const tgeArc = await fetchEvds('TP.TG.EN', '01-01-2004', '31-12-2012');
  const tgeCur = await fetchEvds('TP.TG2.Y01', '01-01-2012', '01-11-2026');
  // RKGE MA
  const rkgeItems = await fetchEvds('TP.GY1.N2.MA', '01-01-2005', '01-11-2026');
  // Sanayi Üretimi MA
  const sanayiItems = await fetchEvds('TP.TSANAYMT2021.BCD', '01-01-2005', '01-11-2026');
  // Reel Efektif Döviz Kuru
  const rekItems = await fetchEvds('TP.RK.T1.Y', '01-01-2004', '01-11-2026');

  // Parser helper
  function parseSeries(items, keyName) {
    const map = {};
    for (const it of items) {
      const val = it[keyName];
      if (val !== null && val !== undefined) {
        const parts = it.Tarih.split('-');
        const ym = `${String(parts[0]).padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}`;
        map[ym] = parseFloat(val);
      }
    }
    return map;
  }

  // TGE combine
  const tgeMap = parseSeries(tgeArc, 'TP_TG_EN');
  const tgeCurMap = parseSeries(tgeCur, 'TP_TG2_Y01');
  for (const [ym, v] of Object.entries(tgeCurMap)) {
    tgeMap[ym] = v;
  }

  const rkgeMap = parseSeries(rkgeItems, 'TP_GY1_N2_MA');
  const sanayiMap = parseSeries(sanayiItems, 'TP_TSANAYMT2021_BCD');
  const rekMap = parseSeries(rekItems, 'TP_RK_T1_Y');

  function buildShockTable(dataMap, metricName, unit = 'puan', sortMode = 'diff') {
    const dates = Object.keys(dataMap).sort();
    const rows = [];

    for (let i = 1; i < dates.length; i++) {
      const ym = dates[i];
      const prevYm = dates[i - 1];

      const val = dataMap[ym];
      const prevVal = dataMap[prevYm];
      const diff = val - prevVal;
      const pct = ((val - prevVal) / prevVal) * 100;

      const cCurr = bist[ym];
      const cPrev = bist[prevYm];

      let sameRet = null;
      if (cCurr && cPrev) {
        sameRet = Math.round(((cCurr - cPrev) / cPrev) * 1000) / 10;
      }

      let nextRet = null;
      if (i + 1 < dates.length) {
        const nextYm = dates[i + 1];
        const cNext = bist[nextYm];
        if (cNext && cCurr) {
          nextRet = Math.round(((cNext - cCurr) / cCurr) * 1000) / 10;
        }
      }

      let ret3m = null;
      if (i + 3 < dates.length) {
        const ym3 = dates[i + 3];
        const c3 = bist[ym3];
        if (c3 && cCurr) {
          ret3m = Math.round(((c3 - cCurr) / cCurr) * 1000) / 10;
        }
      }

      let ret6m = null;
      if (i + 6 < dates.length) {
        const ym6 = dates[i + 6];
        const c6 = bist[ym6];
        if (c6 && cCurr) {
          ret6m = Math.round(((c6 - cCurr) / cCurr) * 1000) / 10;
        }
      }

      rows.push({
        ym,
        label: formatLabel(ym),
        val: Math.round(val * 100) / 100,
        diff: Math.round(diff * 100) / 100,
        pct: Math.round(pct * 100) / 100,
        sameRet,
        nextRet,
        ret3m,
        ret6m
      });
    }

    // Sort by largest drop
    if (sortMode === 'diff') {
      rows.sort((a, b) => a.diff - b.diff);
    } else {
      rows.sort((a, b) => a.pct - b.pct);
    }

    const top10 = rows.slice(0, 10);
    const validSame = top10.filter(r => r.sameRet !== null);
    const positiveSameCount = validSame.filter(r => r.sameRet > 0).length;
    const positiveSameRatio = Math.round((positiveSameCount / validSame.length) * 100);

    const validNext = top10.filter(r => r.nextRet !== null);
    const positiveNextCount = validNext.filter(r => r.nextRet > 0).length;
    const positiveNextRatio = Math.round((positiveNextCount / validNext.length) * 100);

    const avgSame = validSame.length ? Math.round((validSame.reduce((acc, r) => acc + r.sameRet, 0) / validSame.length) * 10) / 10 : 0;
    const avgNext = validNext.length ? Math.round((validNext.reduce((acc, r) => acc + r.nextRet, 0) / validNext.length) * 10) / 10 : 0;

    return {
      top10,
      istatistik: {
        ayniAyPozitifOrani: positiveSameRatio,
        sonrakiAyPozitifOrani: positiveNextRatio,
        ortalamaAyniAyGetiri: avgSame,
        ortalamaSonrakiAyGetiri: avgNext
      }
    };
  }

  console.log('3. Şok tabloları hesaplanıyor...');
  const sonuclar = {
    guncelleme: new Date().toISOString(),
    gostergeler: {
      tge: {
        id: 'tge',
        ad: 'Tüketici Güven Endeksi (TGE)',
        kisaAd: 'Tüketici Güveni',
        kaynak: 'TÜİK & TCMB',
        seriKod: 'TP.TG2.Y01 / TP.TG.EN',
        aciklama: 'Hanehalkının mevcut ve gelecek 12 aylık maddi durum ile genel ekonomik gidişata yönelik beklentilerini ölçer.',
        ...buildShockTable(tgeMap, 'TGE', 'puan', 'diff')
      },
      rkge: {
        id: 'rkge',
        ad: 'Reel Kesim Güven Endeksi (RKGE)',
        kisaAd: 'Reel Kesim',
        kaynak: 'TCMB',
        seriKod: 'TP.GY1.N2.MA',
        aciklama: 'İmalat sanayi yöneticilerinin sipariş, üretim, istihdam ve yatırım beklentilerini ölçen mevsimsellikten arındırılmış gösterge.',
        ...buildShockTable(rkgeMap, 'RKGE', 'puan', 'diff')
      },
      sanayi: {
        id: 'sanayi',
        ad: 'Sanayi Üretim Endeksi (SÜE)',
        kisaAd: 'Sanayi Üretimi',
        kaynak: 'TÜİK',
        seriKod: 'TP.TSANAYMT2021.BCD',
        aciklama: 'Madencilik, imalat ve enerji sektörlerinin reel fiziki üretim çıktısını gösteren mevsim ve takvimden arındırılmış endeks.',
        ...buildShockTable(sanayiMap, 'Sanayi', '%', 'pct')
      },
      rek: {
        id: 'rek',
        ad: 'Reel Efektif Döviz Kuru (REK)',
        kisaAd: 'Reel Döviz Kuru',
        kaynak: 'TCMB',
        seriKod: 'TP.RK.T1.Y',
        aciklama: 'Türk lirasının ticaret ortağı ülkelerin para birimlerine göre TÜFE bazlı reel değerini ölçen endeks.',
        ...buildShockTable(rekMap, 'REK', '%', 'pct')
      }
    }
  };

  const outPath = resolve('finfolis/src/data/makro-soklar.json');
  writeFileSync(outPath, JSON.stringify(sonuclar, null, 2), 'utf8');
  console.log('4. Başarıyla kaydedildi:', outPath);
}

run().catch(err => {
  console.error('Hata:', err);
  process.exit(1);
});
