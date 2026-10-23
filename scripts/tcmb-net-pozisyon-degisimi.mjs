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

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Finfolis Tasarım Sistemine (DESIGN.md) Uygun SVG Üretici
function svgUret(veriler) {
  const W = 960;
  const H = 480;
  const padL = 60;
  const padR = 40;
  const padT = 80;
  const padB = 70;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Son 25 iş gününü çizelim (okunabilirlik için)
  const sonVeriler = veriler.slice(-25);

  const vals = sonVeriler.map(d => d.degisim_altin_arindirilmis_milyar_usd);
  const minVal = Math.min(...vals, -5);
  const maxVal = Math.max(...vals, 5);
  const bound = Math.max(Math.ceil(Math.abs(minVal)), Math.ceil(Math.abs(maxVal)));
  const yMin = -bound;
  const yMax = bound;

  const yToPx = (val) => padT + innerH - ((val - yMin) / (yMax - yMin)) * innerH;
  const zeroY = yToPx(0);

  // Izgara çizgileri
  let gridLines = '';
  const adimY = bound > 6 ? 2 : 1;
  for (let val = yMin; val <= yMax; val += adimY) {
    const py = yToPx(val);
    const isZero = val === 0;
    const stroke = isZero ? '#1b1b1b' : '#cfccc2';
    const strokeWidth = isZero ? 1.5 : 1;
    gridLines += `
      <line x1="${padL}" y1="${py}" x2="${W - padR}" y2="${py}" stroke="${stroke}" stroke-width="${strokeWidth}" />
      <text x="${padL - 10}" y="${py + 4}" fill="${isZero ? '#1b1b1b' : '#5d5b55'}" font-size="12" font-weight="${isZero ? '600' : '400'}" font-family="system-ui, -apple-system, sans-serif" text-anchor="end">${val > 0 ? `+${val}` : val}</text>
    `;
  }

  // Barlar ve Etiketler
  const n = sonVeriler.length;
  const slotW = innerW / n;
  const barW = Math.max(8, Math.min(26, slotW * 0.65));

  let bars = '';
  let xLabels = '';

  sonVeriler.forEach((d, i) => {
    const val = d.degisim_altin_arindirilmis_milyar_usd;
    const cx = padL + i * slotW + slotW / 2;
    const bx = cx - barW / 2;
    const isPos = val >= 0;
    const py = yToPx(val);

    const barY = isPos ? py : zeroY;
    const barH = Math.max(2, Math.abs(py - zeroY));
    const fill = isPos ? '#3f7350' : '#a3243b';

    const labelY = isPos ? py - 8 : py + 14;
    const valText = (val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)).replace('.', ',');

    bars += `
      <rect x="${bx.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" />
      <text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" fill="${fill}" font-size="11" font-weight="700" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${valText}</text>
    `;

    const showLabel = n <= 25 || i % 2 === 0 || i === n - 1;
    if (showLabel) {
      xLabels += `
        <text x="${cx.toFixed(1)}" y="${H - padB + 24}" fill="#5d5b55" font-size="11" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" transform="rotate(-35 ${cx.toFixed(1)} ${H - padB + 24})">${formatTarihKisa(d.tarih)}</text>
      `;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <rect width="${W}" height="${H}" fill="#f4f3ee" />
  <rect x="0" y="0" width="${W}" height="5" fill="#c2502b" />
  <text x="${padL}" y="36" fill="#1b1b1b" font-size="18" font-weight="700" font-family="system-ui, -apple-system, sans-serif">
    TCMB Net Döviz Pozisyonu Günlük Değişimi
  </text>
  <text x="${padL}" y="56" fill="#5d5b55" font-size="12" font-family="system-ui, -apple-system, sans-serif">
    Altın etkisi dışlanmış tahmini döviz alım/satımı · milyar $ · Kaynak: TCMB Analitik Bilanço &amp; EVDS · finfolis
  </text>
  ${gridLines}
  ${bars}
  ${xLabels}
</svg>`;
}

async function main() {
  console.log('--- TCMB Net Pozisyon Günlük, Haftalık ve Aylık Verileri Hesaplanıyor ---');

  // Tarih aralığı: Son 365 gün (1 Yıl)
  const gunArg = process.argv.find(arg => arg.startsWith('--gun='));
  const istenenGun = gunArg ? parseInt(gunArg.split('=')[1]) : 365;

  const bugun = new Date();
  const gecmis = new Date();
  gecmis.setDate(bugun.getDate() - istenenGun);

  const formatEvdsTarih = (d) => {
    const gun = String(d.getDate()).padStart(2, '0');
    const ay = String(d.getMonth() + 1).padStart(2, '0');
    const yil = d.getFullYear();
    return `${gun}-${ay}-${yil}`;
  };

  const baslangic = formatEvdsTarih(gecmis);
  const bitis = formatEvdsTarih(bugun);

  console.log(`Tarih aralığı: ${baslangic} -> ${bitis} (~${istenenGun} gün)`);

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

  // TCMB net altın rezervi (~21.0M troy ons)
  const TAHMINI_ALTIN_ONS_STOKU = 21.0;

  const sonuclar = [];

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];

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

  // --- 2. AY VE HAFTA BAZINDA KÜMÜLATİF TOPLAMLAR (ÖZETLER) ---

  // Aylık Kümülatif Net Pozisyon Değişimi
  const aylarMap = new Map();
  sonuclar.forEach(item => {
    const [g, a, y] = item.tarih.split('-');
    const ayKey = `${y}-${a}`;
    if (!aylarMap.has(ayKey)) {
      const ayIndex = parseInt(a, 10) - 1;
      aylarMap.set(ayKey, {
        yil: parseInt(y, 10),
        ay: parseInt(a, 10),
        ayKey,
        etiket: `${AYLAR[ayIndex]} ${y}`,
        toplam_net_degisim_milyar_usd: 0,
        toplam_ham_degisim_milyar_usd: 0,
        toplam_altin_etkisi_milyar_usd: 0,
        is_gunu_sayisi: 0,
        alis_gunleri: 0,
        satis_gunleri: 0,
        kapanis_net_rezerv: item.net_rezerv_milyar_usd,
        kapanis_usd_kuru: item.usd_kuru
      });
    }
    const grup = aylarMap.get(ayKey);
    const net = item.degisim_altin_arindirilmis_milyar_usd;
    grup.toplam_net_degisim_milyar_usd = Number((grup.toplam_net_degisim_milyar_usd + net).toFixed(1));
    grup.toplam_ham_degisim_milyar_usd = Number((grup.toplam_ham_degisim_milyar_usd + item.ham_degisim_milyar_usd).toFixed(2));
    grup.toplam_altin_etkisi_milyar_usd = Number((grup.toplam_altin_etkisi_milyar_usd + item.altin_degerleme_etkisi_milyar_usd).toFixed(2));
    grup.is_gunu_sayisi += 1;
    if (net > 0) grup.alis_gunleri += 1;
    else if (net < 0) grup.satis_gunleri += 1;
    grup.kapanis_net_rezerv = item.net_rezerv_milyar_usd;
    grup.kapanis_usd_kuru = item.usd_kuru;
  });

  const aylikOzet = Array.from(aylarMap.values());

  // Haftalık Kümülatif Net Pozisyon Değişimi (Son 15 Hafta)
  const haftalarMap = new Map();
  sonuclar.forEach(item => {
    const [g, a, y] = item.tarih.split('-');
    const d = new Date(`${y}-${a}-${g}T12:00:00Z`);
    // ISO Hafta numarası
    const target = new Date(d.valueOf());
    const dayNr = (d.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
      target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
    }
    const weekNr = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const haftaKey = `${y}-W${String(weekNr).padStart(2, '0')}`;

    if (!haftalarMap.has(haftaKey)) {
      haftalarMap.set(haftaKey, {
        haftaKey,
        etiket: `${weekNr}. Hafta (${y})`,
        tarih_son: item.tarih,
        toplam_net_degisim_milyar_usd: 0,
        toplam_ham_degisim_milyar_usd: 0,
        is_gunu_sayisi: 0,
        alis_gunleri: 0,
        satis_gunleri: 0,
        kapanis_net_rezerv: item.net_rezerv_milyar_usd
      });
    }
    const hGrup = haftalarMap.get(haftaKey);
    const net = item.degisim_altin_arindirilmis_milyar_usd;
    hGrup.toplam_net_degisim_milyar_usd = Number((hGrup.toplam_net_degisim_milyar_usd + net).toFixed(1));
    hGrup.toplam_ham_degisim_milyar_usd = Number((hGrup.toplam_ham_degisim_milyar_usd + item.ham_degisim_milyar_usd).toFixed(2));
    hGrup.is_gunu_sayisi += 1;
    if (net > 0) hGrup.alis_gunleri += 1;
    else if (net < 0) hGrup.satis_gunleri += 1;
    hGrup.tarih_son = item.tarih;
    hGrup.kapanis_net_rezerv = item.net_rezerv_milyar_usd;
  });

  const haftalikOzet = Array.from(haftalarMap.values());

  // Dosya Yolları
  const dataDir = resolve(__dirname, '../public/data');
  const grafDir = resolve(__dirname, '../public/grafikler');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(grafDir, { recursive: true });

  const cıktıVerisi = {
    guncellenme: new Date().toISOString(),
    kaynak: 'TCMB Analitik Bilanço, EVDS & BİST Kıymetli Madenler Piyasası',
    birim: 'milyar USD',
    kayit_sayisi: sonuclar.length,
    seri: sonuclar,
    haftalik_ozet: haftalikOzet,
    aylik_ozet: aylikOzet
  };

  const jsonIcerik = JSON.stringify(cıktıVerisi, null, 2);

  // JSON Kaydet
  const jsonYolu = resolve(dataDir, 'tcmb-net-pozisyon-degisimi.json');
  writeFileSync(jsonYolu, jsonIcerik);
  const srcDataYolu = resolve(__dirname, '../src/data/tcmb-net-pozisyon-degisimi.json');
  writeFileSync(srcDataYolu, jsonIcerik);
  console.log(`JSON yazıldı (${sonuclar.length} iş günü, ${haftalikOzet.length} hafta, ${aylikOzet.length} ay)`);

  // SVG Kaydet
  const svgYolu = resolve(grafDir, 'tcmb-net-pozisyon-degisimi.svg');
  const svg = svgUret(sonuclar);
  writeFileSync(svgYolu, svg);
  console.log(`SVG çizildi: ${svgYolu}`);

  console.log('\n--- Son 5 Aylık Net Pozisyon Değişimi Özeti ---');
  console.table(aylikOzet.slice(-5).map(x => ({
    Dönem: x.etiket,
    'İş Günü': x.is_gunu_sayisi,
    'Net Akım ($Mlr)': `${x.toplam_net_degisim_milyar_usd > 0 ? '+' : ''}${x.toplam_net_degisim_milyar_usd} Mr $`,
    'Alım / Satış Günü': `${x.alis_gunleri} alım / ${x.satis_gunleri} satış`,
    'Kapanış Rezervi': `${x.kapanis_net_rezerv} Mr $`
  })));
}

main().catch(err => {
  console.error('Hata oluştu:', err);
  process.exit(1);
});
