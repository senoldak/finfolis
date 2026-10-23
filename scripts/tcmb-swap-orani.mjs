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

async function evdsCek(seri, baslangic = '01-05-2021', bitis = '01-10-2026') {
  const url = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=${seri}&startDate=${baslangic}&endDate=${bitis}&type=json`;
  const res = await fetch(url, { headers: { key: apiKey } });
  if (!res.ok) {
    throw new Error(`EVDS API hatası (${seri}): ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.items || [];
}

function ayAdi(ayNo) {
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return aylar[parseInt(ayNo, 10) - 1] || ayNo;
}

function formatTarihTr(tarihStr) {
  // '2024-4' -> 'Nisan 24'
  const [yil, ay] = tarihStr.split('-');
  return `${ayAdi(ay)} ${yil.slice(2)}`;
}

// SVG Çizici (Finfolis Tasarım Diline Uygun: pişmiş toprak #c2502b, minimalist grid, tipografi)
function svgUret(veriler) {
  const W = 900;
  const H = 480;
  const padL = 60;
  const padR = 40;
  const padT = 70;
  const padB = 70;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const minY = 0;
  const maxY = 80;

  const yToPx = (val) => padT + innerH - ((val - minY) / (maxY - minY)) * innerH;
  const xToPx = (idx) => padL + (idx / (veriler.length - 1)) * innerW;

  // Izgara çizgileri (0, 10, 20, 30, 40, 50, 60, 70, 80)
  let gridLines = '';
  for (let yVal = 0; yVal <= 80; yVal += 10) {
    const py = yToPx(yVal);
    gridLines += `<line x1="${padL}" y1="${py}" x2="${W - padR}" y2="${py}" stroke="#e5e5e5" stroke-width="1" />
<text x="${padL - 12}" y="${py + 4}" fill="#666666" font-size="12" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="end">${yVal}%</text>`;
  }

  // Çizgi Noktaları
  const points = veriler.map((d, i) => `${xToPx(i).toFixed(1)},${yToPx(d.swap_payi_toplam_yuzde).toFixed(1)}`).join(' ');

  // X ekseni etiketleri (belli aralıklarla: yaklaşık 6-7 ayda bir)
  let xLabels = '';
  const adim = Math.max(1, Math.floor(veriler.length / 9));
  veriler.forEach((d, i) => {
    if (i % adim === 0 || i === veriler.length - 1) {
      const px = xToPx(i);
      xLabels += `<text x="${px}" y="${H - padB + 24}" fill="#666666" font-size="12" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="middle" transform="rotate(-25 ${px} ${H - padB + 24})">${formatTarihTr(d.tarih)}</text>`;
    }
  });

  // Vurgu Noktaları (Örn: Nisan 24 zirvesi ve en son nokta)
  const nisan24Idx = veriler.findIndex(d => d.tarih === '2024-4' || d.tarih === '2024-04');
  const sonIdx = veriler.length - 1;

  let annotations = '';
  if (nisan24Idx !== -1) {
    const pt = veriler[nisan24Idx];
    const px = xToPx(nisan24Idx);
    const py = yToPx(pt.swap_payi_toplam_yuzde);
    annotations += `
      <circle cx="${px}" cy="${py}" r="5" fill="#c2502b" stroke="#ffffff" stroke-width="2" />
      <text x="${px + 8}" y="${py - 10}" fill="#c2502b" font-weight="700" font-size="14" font-family="'Bricolage Grotesque', system-ui, sans-serif">${pt.swap_payi_toplam_yuzde}%</text>
    `;
  }

  if (sonIdx !== -1) {
    const pt = veriler[sonIdx];
    const px = xToPx(sonIdx);
    const py = yToPx(pt.swap_payi_toplam_yuzde);
    annotations += `
      <circle cx="${px}" cy="${py}" r="5" fill="#1b1b1b" stroke="#ffffff" stroke-width="2" />
      <text x="${px - 10}" y="${py - 10}" fill="#1b1b1b" font-weight="700" font-size="14" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="end">${pt.swap_payi_toplam_yuzde}%</text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <rect width="${W}" height="${H}" fill="#f4f3ee" />
  
  <!-- Başlık -->
  <text x="${W / 2}" y="34" fill="#18181b" font-size="20" font-weight="700" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="middle">
    TCMB Resmi Rezervlerinin Ne Kadarı Swap Kaynaklı? (%)
  </text>
  <text x="${W / 2}" y="54" fill="#71717a" font-size="12" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="middle">
    Kaynak: TCMB Uluslararası Rezervler ve Döviz Likiditesi (IMF SDDS Şablonu) &amp; EVDS · finfolis
  </text>

  <!-- Izgara -->
  ${gridLines}

  <!-- Çizgi -->
  <polyline fill="none" stroke="#c2502b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />

  <!-- Vurgu Noktaları -->
  ${annotations}

  <!-- X Eksen Etiketleri -->
  ${xLabels}
</svg>`;
}

async function main() {
  console.log('--- TCMB Rezerv ve Swap Verisi Çekiliyor ---');
  const baslangic = '01-05-2021';
  const bitis = '01-10-2026';

  // Seriler:
  // TP.REZVARPD.K1: 1.1 Resmi Rezerv Varliklari (Milyon USD)
  // TP.REZVARPD.K2: 1.1.1 Doviz Varliklari (Milyon USD)
  // TP.REZVARPD.K10: 1.1.4 Altin (Milyon USD)
  // TP.DOVVARNC.K15: 2.2.1 Acik Pozisyonlar (-) / Net Swap Yukumlulukleri (Milyon USD)
  const [toplamRes, dovizRes, altinRes, swapNet] = await Promise.all([
    evdsCek('TP.REZVARPD.K1', baslangic, bitis),
    evdsCek('TP.REZVARPD.K2', baslangic, bitis),
    evdsCek('TP.REZVARPD.K10', baslangic, bitis),
    evdsCek('TP.DOVVARNC.K15', baslangic, bitis)
  ]);

  console.log(`Veri alındı: Rezerv=${toplamRes.length}, Swap=${swapNet.length}`);

  const sonuclar = [];
  for (const d of toplamRes) {
    const sw = swapNet.find(x => x.Tarih === d.Tarih);
    const dv = dovizRes.find(x => x.Tarih === d.Tarih);
    const al = altinRes.find(x => x.Tarih === d.Tarih);
    if (!sw) continue;

    const toplamVal = parseFloat(d.TP_REZVARPD_K1 || 0);
    const dovizVal = parseFloat(dv?.TP_REZVARPD_K2 || 0);
    const altinVal = parseFloat(al?.TP_REZVARPD_K10 || 0);
    const swapVal = Math.abs(parseFloat(sw.TP_DOVVARNC_K15 || 0));

    const swapPayiToplam = toplamVal > 0 ? Number(((swapVal / toplamVal) * 100).toFixed(1)) : 0;
    const swapPayiDoviz = dovizVal > 0 ? Number(((swapVal / dovizVal) * 100).toFixed(1)) : 0;

    sonuclar.push({
      tarih: d.Tarih,
      etiket: formatTarihTr(d.Tarih),
      toplam_rezerv_milyar_usd: Number((toplamVal / 1000).toFixed(2)),
      doviz_rezervi_milyar_usd: Number((dovizVal / 1000).toFixed(2)),
      altin_rezervi_milyar_usd: Number((altinVal / 1000).toFixed(2)),
      swap_stoku_milyar_usd: Number((swapVal / 1000).toFixed(2)),
      swap_payi_toplam_yuzde: swapPayiToplam,
      swap_payi_doviz_yuzde: swapPayiDoviz
    });
  }

  // Çıktı Klasörleri
  const dataDir = resolve(__dirname, '../public/data');
  const grafDir = resolve(__dirname, '../public/grafikler');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(grafDir, { recursive: true });

  // JSON Kaydet
  const jsonYolu = resolve(dataDir, 'tcmb-swap-orani.json');
  writeFileSync(jsonYolu, JSON.stringify({
    guncellenme: new Date().toISOString(),
    kaynak: 'TCMB EVDS - Uluslararası Rezervler ve Döviz Likiditesi Tablosu',
    kayit_sayisi: sonuclar.length,
    seri: sonuclar
  }, null, 2));
  console.log(`JSON yazıldı: ${jsonYolu}`);

  // SVG Kaydet
  const svgYolu = resolve(grafDir, 'tcmb-swap-orani.svg');
  const svg = svgUret(sonuclar);
  writeFileSync(svgYolu, svg);
  console.log(`SVG çizildi: ${svgYolu}`);

  // Özet Tablo Göster
  console.log('\n--- Son 6 Ay ve Kilit Dönemler ---');
  const secilmisler = [
    sonuclar.find(x => x.tarih === '2021-5' || x.tarih === '2021-05'),
    sonuclar.find(x => x.tarih === '2024-4' || x.tarih === '2024-04'),
    sonuclar.find(x => x.tarih === '2024-11'),
    ...sonuclar.slice(-5)
  ].filter(Boolean);

  console.table(secilmisler.map(x => ({
    Dönem: x.etiket,
    'Toplam Rezerv ($Milyar)': x.toplam_rezerv_milyar_usd,
    'Swap Stoku ($Milyar)': x.swap_stoku_milyar_usd,
    'Swap Payı (%)': `${x.swap_payi_toplam_yuzde}%`
  })));
}

main().catch(err => {
  console.error('Hata oluştu:', err);
  process.exit(1);
});
