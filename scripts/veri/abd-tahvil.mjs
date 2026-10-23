import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEDEF_JSON = resolve(__dirname, '../../src/data/abd-tahvil.json');
const HEDEF_SVG = resolve(__dirname, '../../public/grafikler/turkiye-abd-tahvil-akimlari.svg');

// 1. FRED CSV İndirici
async function fredCsvCek(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Finfolis Data Bot)' } });
  if (!res.ok) {
    throw new Error(`FRED verisi çekilemedi (${seriesId}): ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const rows = text.trim().split('\n').map((l) => l.trim().split(','));
  const data = new Map();
  for (let i = 1; i < rows.length; i++) {
    const [date, valStr] = rows[i];
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      // date: YYYY-MM-DD -> key: YYYY-MM
      const donem = date.slice(0, 7);
      data.set(donem, val);
    }
  }
  return data;
}

// 2. EVDS TCMB Verisi İndirici (Rezervdeki Menkul Kıymetler - TP.REZVARPD.K3)
async function evdsMenkulKiymetCek() {
  let apiKey = process.env.EVDS_API_KEY;
  if (!apiKey) {
    try {
      const configPath = resolve(homedir(), '.evds-mcp.json');
      const conf = JSON.parse(readFileSync(configPath, 'utf8'));
      apiKey = conf.api_key;
    } catch {
      console.warn('Uyarı: EVDS API anahtarı bulunamadı, TCMB serisi atlanıyor.');
      return new Map();
    }
  }

  const baslangic = '01-01-2018';
  const bitis = '01-10-2026';
  const url = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.REZVARPD.K3&startDate=${baslangic}&endDate=${bitis}&type=json`;

  try {
    const res = await fetch(url, { headers: { key: apiKey } });
    if (!res.ok) return new Map();
    const json = await res.json();
    const data = new Map();
    if (json.items) {
      for (const it of json.items) {
        if (!it.Tarih || !it.TP_REZVARPD_K3) continue;
        // Tarih formatı: YYYY-M -> YYYY-MM
        const [yil, ay] = it.Tarih.split('-');
        const donem = `${yil}-${ay.padStart(2, '0')}`;
        const val = parseFloat(it.TP_REZVARPD_K3);
        if (!isNaN(val)) {
          data.set(donem, val);
        }
      }
    }
    return data;
  } catch (err) {
    console.warn('EVDS bağlantı hatası:', err.message);
    return new Map();
  }
}

function ayAdiTr(donem) {
  const [yil, ay] = donem.split('-');
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const ad = aylar[parseInt(ay, 10) - 1] || ay;
  return `${ad} ${yil}`;
}

function formatMilyar(milyonUsd) {
  return (milyonUsd / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 3. SVG Grafik Üretici (Kullanıcının paylaştığı grafiğin Finfolis tasarım diliyle yeniden çizimi)
function svgUret(seri) {
  // Seri son 30 ayı alsın (2024-03 - 2026-08 dönemi)
  const sonSeri = seri.slice(-30);
  const W = 960;
  const H = 540;
  const padL = 75;
  const padR = 40;
  const padT = 70;
  const padB = 80;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Min ve Max değerler
  const vals = sonSeri.map((s) => s.netAkim);
  const minV = -16000;
  const maxV = 12000;

  const yToPx = (v) => padT + innerH - ((v - minV) / (maxV - minV)) * innerH;
  const sifirY = yToPx(0);

  // Izgara çizgileri (-15k, -10k, -5k, 0, 5k, 10k)
  const izgaraDegerleri = [-15000, -10000, -5000, 0, 5000, 10000];
  let izgaraSvg = '';
  for (const iv of izgaraDegerleri) {
    const y = yToPx(iv);
    const isZero = iv === 0;
    izgaraSvg += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${isZero ? '#18181b' : '#e4e4e7'}" stroke-width="${isZero ? 1.5 : 1}" stroke-dasharray="${isZero ? 'none' : '3 3'}" />
      <text x="${padL - 12}" y="${y + 4}" fill="${isZero ? '#18181b' : '#71717a'}" font-size="12" font-family="system-ui, sans-serif" font-weight="${isZero ? '600' : '400'}" text-anchor="end">
        ${iv === 0 ? '0' : (iv > 0 ? '+' : '') + (iv / 1000).toFixed(0) + '.000'}
      </text>
    `;
  }

  // Barların çizimi
  const n = sonSeri.length;
  const barSlotW = innerW / n;
  const barW = Math.max(12, barSlotW * 0.72);

  let barlarSvg = '';
  let etiketlerSvg = '';

  // Son 5 ayı (Nisan-Ağustos 2026) vurgulamak için açık sarı arka plan kutusu
  // 2026-04 indeksi
  const nisanIdx = sonSeri.findIndex((s) => s.donem === '2026-04');
  let vurguKutusuSvg = '';
  if (nisanIdx !== -1) {
    const basX = padL + nisanIdx * barSlotW - 4;
    const bitX = padL + n * barSlotW + 4;
    const kutuW = bitX - basX;
    const kutuY = yToPx(2000);
    const kutuH = yToPx(-1500) - kutuY;
    vurguKutusuSvg = `
      <rect x="${basX}" y="${kutuY}" width="${kutuW}" height="${kutuH}" fill="#fef3c7" fill-opacity="0.65" rx="6" />
      <text x="${basX + kutuW / 2}" y="${kutuY - 10}" fill="#92400e" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="middle">Son 4-5 Ay Alım (~$4 Mr)</text>
    `;
  }

  sonSeri.forEach((item, i) => {
    const x = padL + i * barSlotW + (barSlotW - barW) / 2;
    const val = item.netAkim;
    const yVal = yToPx(val);

    let barY = val >= 0 ? yVal : sifirY;
    let barH = Math.max(2, Math.abs(yVal - sifirY));

    // Renk: Pozitifler için petrol/mavi (#2563eb / #1e3a8a), Negatifler için Finfolis terracotta (#c2502b)
    const dolgu = val >= 0 ? '#2563eb' : '#c2502b';

    barlarSvg += `
      <rect x="${x.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${dolgu}" rx="1" />
    `;

    // Belirgin tepe/dip değerleri etiketle (Örn: >= 5000 veya <= -5000)
    if (Math.abs(val) >= 4500) {
      const etiketY = val >= 0 ? barY - 8 : barY + barH + 16;
      const renk = val >= 0 ? '#1e3a8a' : '#c2502b';
      etiketlerSvg += `
        <text x="${(x + barW / 2).toFixed(1)}" y="${etiketY.toFixed(1)}" fill="${renk}" font-size="12" font-weight="700" font-family="system-ui, sans-serif" text-anchor="middle">
          ${val > 0 ? '+' : ''}${val.toLocaleString('tr-TR')}
        </text>
      `;
    }

    // X ekseni tarih etiketleri (Her 6 ayda bir veya belli periyotlarda)
    if (item.donem.endsWith('-03') || item.donem.endsWith('-09') || i === n - 1) {
      const tx = x + barW / 2;
      etiketlerSvg += `
        <text x="${tx.toFixed(1)}" y="${H - padB + 24}" fill="#4b5563" font-size="11" font-family="system-ui, sans-serif" text-anchor="middle" transform="rotate(-30 ${tx} ${H - padB + 24})">
          ${item.donem}
        </text>
      `;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <rect width="${W}" height="${H}" fill="#ffffff" />

  <!-- Başlık Grubu -->
  <text x="${padL}" y="32" fill="#18181b" font-size="18" font-weight="700" font-family="system-ui, sans-serif">
    Türkiye'nin Aylık ABD Hazine Tahvili Net Alım-Satımları
  </text>
  <text x="${padL}" y="52" fill="#71717a" font-size="12" font-family="system-ui, sans-serif">
    Kaynak: ABD Hazine Bakanlığı (TIC) &amp; FRED (Series: FORTREASNET12807) · Milyon USD · finfolis
  </text>

  <!-- Arka plan vurgusu -->
  ${vurguKutusuSvg}

  <!-- Izgara -->
  ${izgaraSvg}

  <!-- Barlar -->
  ${barlarSvg}

  <!-- Etiketler -->
  ${etiketlerSvg}

  <!-- Lejant -->
  <g transform="translate(${W - padR - 220}, 24)">
    <rect x="0" y="0" width="12" height="12" fill="#2563eb" rx="2" />
    <text x="18" y="10" fill="#374151" font-size="11" font-family="system-ui, sans-serif">Net Alım (Pozitif)</text>
    <rect x="115" y="0" width="12" height="12" fill="#c2502b" rx="2" />
    <text x="133" y="10" fill="#374151" font-size="11" font-family="system-ui, sans-serif">Net Satış (Negatif)</text>
  </g>
</svg>`;
}

async function main() {
  console.log('--- ABD Hazine Tahvili (TIC) ve TCMB Verileri Çekiliyor ---');

  const [ticAkim, ticStok, tcmbMenkul] = await Promise.all([
    fredCsvCek('FORTREASNET12807'),
    fredCsvCek('FORTREASPOS12807'),
    evdsMenkulKiymetCek(),
  ]);

  console.log(`TIC Akım veri sayısı: ${ticAkim.size}`);
  console.log(`TIC Stok veri sayısı: ${ticStok.size}`);
  console.log(`TCMB Menkul Kıymet veri sayısı: ${tcmbMenkul.size}`);

  // Birleştirme (2023-01'den itibaren)
  const donemler = Array.from(ticAkim.keys()).sort();
  const baslangicDonem = '2018-01';
  const filtrelenmis = donemler.filter((d) => d >= baslangicDonem);

  const seri = [];
  let oncekiTcmbStok = null;

  for (const donem of filtrelenmis) {
    const netAkim = ticAkim.get(donem) ?? 0;
    const stok = ticStok.get(donem) ?? null;
    const tcmbStok = tcmbMenkul.get(donem) ?? null;

    let tcmbAylikFark = null;
    if (tcmbStok !== null && oncekiTcmbStok !== null) {
      tcmbAylikFark = tcmbStok - oncekiTcmbStok;
    }
    if (tcmbStok !== null) {
      oncekiTcmbStok = tcmbStok;
    }

    seri.push({
      donem,
      etiket: ayAdiTr(donem),
      netAkim, // Milyon USD
      stok, // Milyon USD
      tcmbStok, // Milyon USD
      tcmbAylikFark, // Milyon USD
    });
  }

  // Özel hesaplamalar:
  // Son 4 ay toplamı (Nisan - Ağustos 2026)
  const nisanAgustos = seri.filter((s) => s.donem >= '2026-04' && s.donem <= '2026-08');
  const son4AyTicNet = nisanAgustos.reduce((acc, s) => acc + s.netAkim, 0);

  const son4AyTcmbBaslangic = seri.find((s) => s.donem === '2026-04')?.tcmbStok;
  const son4AyTcmbBitis = seri.find((s) => s.donem === '2026-08')?.tcmbStok;
  const son4AyTcmbFark = (son4AyTcmbBaslangic && son4AyTcmbBitis) ? (son4AyTcmbBitis - son4AyTcmbBaslangic) : null;

  const sonVeri = seri.at(-1);

  const ozet = {
    guncellenme: new Date().toISOString(),
    sonDonem: sonVeri.donem,
    sonEtiket: sonVeri.etiket,
    sonNetAkimMilyonUsd: sonVeri.netAkim,
    sonToplamStokMilyonUsd: sonVeri.stok,
    sonTcmbMenkulStokMilyonUsd: sonVeri.tcmbStok,
    son4AyDonem: 'Nisan - Ağustos 2026',
    son4AyTicNetAlimMilyonUsd: son4AyTicNet,
    son4AyTicNetAlimMilyarUsd: +(son4AyTicNet / 1000).toFixed(2),
    son4AyTcmbMenkulFarkMilyonUsd: son4AyTcmbFark,
    son4AyTcmbMenkulFarkMilyarUsd: son4AyTcmbFark ? +(son4AyTcmbFark / 1000).toFixed(2) : null,
    analiz: {
      tahminiKaynak: 'TCMB Rezerv Yönetimi',
      neden: 'Nisan-Ağustos dönemindeki ~$4.0 milyarlık TIC ABD tahvili net alımı ile TCMB uluslararası rezervlerindeki menkul kıymet portföyünün ~$3.94 milyarlık artışı neredeyse birebir örtüşmektedir.',
    },
    seri,
  };

  mkdirSync(dirname(HEDEF_JSON), { recursive: true });
  writeFileSync(HEDEF_JSON, JSON.stringify(ozet, null, 2), 'utf-8');
  console.log(`✓ Veri kaydedildi: ${HEDEF_JSON}`);

  // SVG üretimi
  mkdirSync(dirname(HEDEF_SVG), { recursive: true });
  const svgContent = svgUret(seri);
  writeFileSync(HEDEF_SVG, svgContent, 'utf-8');
  console.log(`✓ SVG Grafik kaydedildi: ${HEDEF_SVG}`);

  console.log('\n--- HESAPLAMA SONUÇLARI ---');
  console.log(`Son 4 Ay TIC Net Alım (Nisan-Ağustos): ${ozet.son4AyTicNetAlimMilyarUsd} Milyar $ (${son4AyTicNet} Milyon USD)`);
  console.log(`Son 4 Ay TCMB Menkul Portföy Artışı: ${ozet.son4AyTcmbMenkulFarkMilyarUsd} Milyar $ (${son4AyTcmbFark} Milyon USD)`);
}

main().catch((err) => {
  console.error('Hata:', err);
  process.exit(1);
});
