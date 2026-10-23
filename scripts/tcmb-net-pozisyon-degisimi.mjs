import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. EVDS API Anahtarını Yükle
let apiKey = process.env.EVDS_API_KEY;
if (!apiKey) {
  try {
    const configPath = resolve(homedir(), '.evds-mcp.json');
    const conf = JSON.parse(readFileSync(configPath, 'utf8'));
    apiKey = conf.api_key;
  } catch (e) {
    console.error('Hata: EVDS API anahtarı bulunamadı (~/.evds-mcp.json veya EVDS_API_KEY)');
    process.exit(1);
  }
}

// EVDS veri çekme fonksiyonu
async function evdsCek(seriler, baslangic, bitis) {
  const seriStr = Array.isArray(seriler) ? seriler.join('-') : seriler;
  const url = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=${seriStr}&startDate=${baslangic}&endDate=${bitis}&type=json`;
  const res = await fetch(url, { headers: { key: apiKey } });
  if (!res.ok) {
    throw new Error(`EVDS API hatası (${seriStr}): ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.items || [];
}

function formatTarihKisa(tarihStr) {
  // '25-09-2026' -> '25.09'
  const [g, a] = tarihStr.split('-');
  return `${g}.${a}`;
}

// Finfolis Tasarım Sistemine (DESIGN.md) Uygun SVG Üretici
// Renkler: kâğıt (#f4f3ee), mürekkep (#1b1b1b), yükseliş (#3f7350), düşüş (#a3243b), gri (#5d5b55), çizgi (#cfccc2)
function svgUret(veriler) {
  const W = 960;
  const H = 480;
  const padL = 60;
  const padR = 40;
  const padT = 80;
  const padB = 70;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Y ekseni min ve max belirleme
  const vals = veriler.map(d => d.degisim_altin_arindirilmis_milyar_usd);
  const minVal = Math.min(...vals, -5);
  const maxVal = Math.max(...vals, 5);
  const bound = Math.max(Math.ceil(Math.abs(minVal)), Math.ceil(Math.abs(maxVal)));
  const yMin = -bound;
  const yMax = bound;

  const yToPx = (val) => padT + innerH - ((val - yMin) / (yMax - yMin)) * innerH;
  const zeroY = yToPx(0);

  // Izgara çizgileri (-6, -4, -2, 0, 2, 4, 6 vb.)
  let gridLines = '';
  const adimY = bound > 6 ? 2 : 1;
  for (let val = yMin; val <= yMax; val += adimY) {
    const py = yToPx(val);
    const isZero = val === 0;
    const stroke = isZero ? '#1b1b1b' : '#e4e1d7';
    const strokeWidth = isZero ? 1.5 : 1;
    gridLines += `
      <line x1="${padL}" y1="${py}" x2="${W - padR}" y2="${py}" stroke="${stroke}" stroke-width="${strokeWidth}" />
      <text x="${padL - 10}" y="${py + 4}" fill="${isZero ? '#1b1b1b' : '#5d5b55'}" font-size="12" font-weight="${isZero ? '600' : '400'}" font-family="system-ui, -apple-system, sans-serif" text-anchor="end">${val > 0 ? `+${val}` : val}</text>
    `;
  }

  // Barlar ve Etiketler
  const n = veriler.length;
  const slotW = innerW / n;
  const barW = Math.max(8, Math.min(26, slotW * 0.65));

  let bars = '';
  let xLabels = '';

  veriler.forEach((d, i) => {
    const val = d.degisim_altin_arindirilmis_milyar_usd;
    const cx = padL + i * slotW + slotW / 2;
    const bx = cx - barW / 2;
    const isPos = val >= 0;
    const py = yToPx(val);

    const barY = isPos ? py : zeroY;
    const barH = Math.max(2, Math.abs(py - zeroY));
    const fill = isPos ? '#3f7350' : '#a3243b'; // Finfolis: yukselis (#3f7350), dusus (#a3243b)

    // Değer Etiketi
    const labelY = isPos ? py - 8 : py + 14;
    const valText = (val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)).replace('.', ',');

    bars += `
      <rect x="${bx.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" />
      <text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" fill="${fill}" font-size="11" font-weight="700" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${valText}</text>
    `;

    // Tarih Etiketi (her barda veya yoğunsa 2 barda bir)
    const showLabel = n <= 22 || i % 2 === 0 || i === n - 1;
    if (showLabel) {
      xLabels += `
        <text x="${cx.toFixed(1)}" y="${H - padB + 24}" fill="#5d5b55" font-size="11" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" transform="rotate(-35 ${cx.toFixed(1)} ${H - padB + 24})">${formatTarihKisa(d.tarih)}</text>
      `;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <!-- Zemin: Finfolis kâğıt rengi -->
  <rect width="${W}" height="${H}" fill="#f4f3ee" />
  
  <!-- Üst Pişmiş Toprak Marka Bandı -->
  <rect x="0" y="0" width="${W}" height="5" fill="#c2502b" />

  <!-- Başlık ve Alt Başlık -->
  <text x="${padL}" y="36" fill="#1b1b1b" font-size="18" font-weight="700" font-family="system-ui, -apple-system, sans-serif">
    TCMB Net Döviz Pozisyonu Günlük Değişimi
  </text>
  <text x="${padL}" y="56" fill="#5d5b55" font-size="12" font-family="system-ui, -apple-system, sans-serif">
    Altın etkisi dışlanmış tahmini döviz alım/satımı · milyar $ · Kaynak: TCMB Analitik Bilanço &amp; EVDS · finfolis
  </text>

  <!-- Izgara -->
  ${gridLines}

  <!-- Barlar -->
  ${bars}

  <!-- X Eksen Etiketleri -->
  ${xLabels}
</svg>`;
}

async function main() {
  console.log('--- TCMB Net Pozisyon Günlük Değişimi Hesaplanıyor ---');

  // Son ~45 günlük işgünü verilerini çekelim
  const bugun = new Date();
  const gecmis = new Date();
  gecmis.setDate(bugun.getDate() - 45);

  const formatEvdsTarih = (d) => {
    const gun = String(d.getDate()).padStart(2, '0');
    const ay = String(d.getMonth() + 1).padStart(2, '0');
    const yil = d.getFullYear();
    return `${gun}-${ay}-${yil}`;
  };

  const baslangic = formatEvdsTarih(gecmis);
  const bitis = formatEvdsTarih(bugun);

  console.log(`Tarih aralığı: ${baslangic} -> ${bitis}`);

  const seriler = [
    'TP.AB.A02',                       // A.1 Dış Varlıklar (Bin TL)
    'TP.AB.A10',                       // P.1 Toplam Döviz Yükümlülükleri (Bin TL)
    'TP.DK.USD.A.YTL',                  // TCMB USD Alış Kuru
    'TP.SWAPTEKTAR.TOTALSTOKALIMYONLU', // TCMB Toplam Swap Stoku (Milyon USD)
    'TP.ALTINPIYASA.KAP03'              // Altın Ons Kapanış Fiyatı (USD/ons)
  ];

  const items = await evdsCek(seriler, baslangic, bitis);
  console.log(`EVDS'den ${items.length} iş günü kaydı alındı.`);

  if (items.length < 2) {
    throw new Error('Yeterli veri bulunamadı.');
  }

  // TCMB'nin yaklaşık net altın rezervi (milyon troy ons)
  // 1 ton = 32,150.7 troy ons. TCMB altın varlıkları yaklaşık 21.0 - 21.5 milyon ons civarındadır.
  const TAHMINI_ALTIN_ONS_STOKU = 21.0; // Milyon ons

  const sonuclar = [];

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];

    // Eksik veri kontrolü
    if (!curr.TP_AB_A02 || !curr.TP_AB_A10 || !curr.TP_DK_USD_A_YTL) continue;
    if (!prev.TP_AB_A02 || !prev.TP_AB_A10 || !prev.TP_DK_USD_A_YTL) continue;

    // Bilanço İçi Net Rezerv (TL)
    const prevNetTL = parseFloat(prev.TP_AB_A02) - parseFloat(prev.TP_AB_A10);
    const currNetTL = parseFloat(curr.TP_AB_A02) - parseFloat(curr.TP_AB_A10);

    // USD Cinsinden Net Rezerv (Milyar USD)
    const prevNetUSD = (prevNetTL / parseFloat(prev.TP_DK_USD_A_YTL)) / 1e6;
    const currNetUSD = (currNetTL / parseFloat(curr.TP_DK_USD_A_YTL)) / 1e6;

    // Ham Değişim (Milyar USD)
    const hamDegisimMilyarUSD = currNetUSD - prevNetUSD;

    // Altın Fiyatı Değişimi (USD/ons)
    const prevAltinOns = parseFloat(prev.TP_ALTINPIYASA_KAP03 || 0);
    const currAltinOns = parseFloat(curr.TP_ALTINPIYASA_KAP03 || 0);
    const altinFiyatFarki = (currAltinOns > 0 && prevAltinOns > 0) ? (currAltinOns - prevAltinOns) : 0;

    // Altın Değerleme Etkisi (Milyar USD)
    // Değerleme Farkı = (Ons Fiyat Farkı * Altın Ons Miktarı)
    const altinDegerlemeEtkisiMilyarUSD = (altinFiyatFarki * TAHMINI_ALTIN_ONS_STOKU * 1e6) / 1e9;

    // Altın Etkisi Dışlanmış Net Değişim (Milyar USD)
    const altinArindirilmisDegisim = hamDegisimMilyarUSD - altinDegerlemeEtkisiMilyarUSD;

    sonuclar.push({
      tarih: curr.Tarih,
      etiket: formatTarihKisa(curr.Tarih),
      usd_kuru: Number(parseFloat(curr.TP_DK_USD_A_YTL).toFixed(4)),
      altin_ons_usd: Number(currAltinOns.toFixed(2)),
      altin_fiyat_farki_usd: Number(altinFiyatFarki.toFixed(2)),
      altin_degerleme_etkisi_milyar_usd: Number(altinDegerlemeEtkisiMilyarUSD.toFixed(2)),
      net_rezerv_milyar_usd: Number(currNetUSD.toFixed(2)),
      ham_degisim_milyar_usd: Number(hamDegisimMilyarUSD.toFixed(2)),
      degisim_altin_arindirilmis_milyar_usd: Number(altinArindirilmisDegisim.toFixed(1))
    });
  }

  // Dosya Yolları
  const dataDir = resolve(__dirname, '../public/data');
  const grafDir = resolve(__dirname, '../public/grafikler');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(grafDir, { recursive: true });

  // JSON Kaydet
  const jsonIcerik = JSON.stringify({
    guncellenme: new Date().toISOString(),
    kaynak: 'TCMB Analitik Bilanço & BİST Kıymetli Madenler Piyasası & EVDS',
    birim: 'milyar USD',
    kayit_sayisi: sonuclar.length,
    seri: sonuclar
  }, null, 2);
  const jsonYolu = resolve(dataDir, 'tcmb-net-pozisyon-degisimi.json');
  writeFileSync(jsonYolu, jsonIcerik);
  const srcDataYolu = resolve(__dirname, '../src/data/tcmb-net-pozisyon-degisimi.json');
  writeFileSync(srcDataYolu, jsonIcerik);
  console.log(`JSON yazıldı: ${jsonYolu} ve ${srcDataYolu}`);

  // SVG Kaydet
  const svgYolu = resolve(grafDir, 'tcmb-net-pozisyon-degisimi.svg');
  const svg = svgUret(sonuclar);
  writeFileSync(svgYolu, svg);
  console.log(`SVG çizildi: ${svgYolu}`);

  // Son 7 günün özet tablosunu yazdır
  console.log('\n--- Son 7 İş Günü Net Döviz Pozisyon Değişimi ---');
  console.table(sonuclar.slice(-7).map(x => ({
    Tarih: x.etiket,
    'USD Kuru': x.usd_kuru,
    'Ons ($)': x.altin_ons_usd,
    'Ham Değişim ($Mlr)': x.ham_degisim_milyar_usd,
    'Altın Etkisi ($Mlr)': x.altin_degerleme_etkisi_milyar_usd,
    'Net Değişim (Altınsız)': `${x.degisim_altin_arindirilmis_milyar_usd > 0 ? '+' : ''}${x.degisim_altin_arindirilmis_milyar_usd} Mr $`
  })));
}

main().catch(err => {
  console.error('Hata oluştu:', err);
  process.exit(1);
});
