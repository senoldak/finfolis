import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// TCMB Mülkiyetindeki Net Altın Rezervi (Tahmini Portföy Büyüklüğü: ~20.75 Milyon Ons / ~645 Ton)
// Not: Bankaların ROM ve zorunlu karşılık altınları hariç, TCMB'nin kendi net bilançosundaki pozisyon.
export const TCMB_NET_ALTIN_ONS = 20.75e6;
export const BAZ_TARIH = '2025-03-20';

export async function altinFiyatlariniGetir() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2y';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  if (!res.ok) {
    throw new Error(`Altın fiyatı çekilemedi: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
    throw new Error('Geçersiz altın verisi formatı');
  }

  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;

  const gunluk = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const close = closes[i];
    if (close === null || close === undefined || isNaN(close)) continue;
    const tarihStr = new Date(ts * 1000).toISOString().slice(0, 10);
    gunluk.push({
      tarih: tarihStr,
      fiyat: Number(close.toFixed(2))
    });
  }
  return gunluk;
}

export function hesaplaAltinPL(fiyatSerisi, bazTarihStr = BAZ_TARIH, rezervOns = TCMB_NET_ALTIN_ONS) {
  // Baz tarihe en yakın günü bul
  const bazHedef = new Date(bazTarihStr).getTime();
  let bazNoktasi = null;
  let minFark = Infinity;

  for (const item of fiyatSerisi) {
    const t = new Date(item.tarih).getTime();
    const fark = Math.abs(t - bazHedef);
    if (fark < minFark) {
      minFark = fark;
      bazNoktasi = item;
    }
  }

  if (!bazNoktasi) {
    throw new Error(`Baz tarih (${bazTarihStr}) için fiyat verisi bulunamadı.`);
  }

  const p0 = bazNoktasi.fiyat;
  const sonuclar = [];

  for (const item of fiyatSerisi) {
    if (new Date(item.tarih).getTime() < new Date(bazNoktasi.tarih).getTime()) {
      continue;
    }

    const pt = item.fiyat;
    const onsFarki = pt - p0;
    // Milyar Dolar cinsinden kâr/zarar (P/L)
    const plMilyarUsd = Number(((onsFarki * rezervOns) / 1e9).toFixed(2));

    sonuclar.push({
      tarih: item.tarih,
      ons_fiyat_usd: pt,
      baz_fiyat_usd: p0,
      ons_fark_usd: Number(onsFarki.toFixed(2)),
      kazanc_milyar_usd: plMilyarUsd
    });
  }

  return {
    baz_tarih: bazNoktasi.tarih,
    baz_fiyat_usd: p0,
    rezerv_ons: rezervOns,
    seri: sonuclar
  };
}

export function svgUret(plSonuclari) {
  const { seri, baz_tarih, baz_fiyat_usd } = plSonuclari;
  const W = 900;
  const H = 480;
  const padL = 70;
  const padR = 50;
  const padT = 75;
  const padB = 65;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const minY = 0;
  const maxY = 50; // Grafikte 0 - 50 milyar $ skalası

  const yToPx = (val) => padT + innerH - ((val - minY) / (maxY - minY)) * innerH;
  const xToPx = (idx) => padL + (idx / (seri.length - 1)) * innerW;

  // Izgara çizgileri (0, 10, 20, 30, 40, 50 milyar $)
  let gridLines = '';
  for (let yVal = 0; yVal <= 50; yVal += 10) {
    const py = yToPx(yVal);
    gridLines += `<line x1="${padL}" y1="${py}" x2="${W - padR}" y2="${py}" stroke="#cfccc2" stroke-width="1" stroke-dasharray="${yVal === 0 ? 'none' : '3,3'}" />
<text x="${padL - 14}" y="${py + 4}" fill="#5d5b55" font-size="12" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="end" font-weight="600">${yVal}</text>`;
  }

  // Çizgi Noktaları
  const points = seri.map((d, i) => `${xToPx(i).toFixed(1)},${yToPx(d.kazanc_milyar_usd).toFixed(1)}`).join(' ');

  // X ekseni etiketleri (tarih aralıkları: ~3 ayda bir)
  let xLabels = '';
  const etiketAraligi = Math.max(1, Math.floor(seri.length / 6));
  seri.forEach((d, i) => {
    if (i % etiketAraligi === 0 || i === seri.length - 1) {
      const px = xToPx(i);
      const [yil, ay, gun] = d.tarih.split('-');
      const etiket = `${gun}.${ay}.${yil.slice(2)}`;
      xLabels += `<text x="${px}" y="${H - padB + 24}" fill="#5d5b55" font-size="11" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="middle">${etiket}</text>`;
    }
  });

  // Kilit Noktaları Bul (Grafikteki vurgular: 6, 47 zirve, 25 dip, 29 ve son değer)
  const zirveItem = seri.reduce((max, cur) => cur.kazanc_milyar_usd > max.kazanc_milyar_usd ? cur : max, seri[0]);
  const zirveIdx = seri.indexOf(zirveItem);

  // Zirve sonrası dip (Haziran 2026 civarı ~25)
  const sonrasi = seri.slice(zirveIdx);
  const dipItem = sonrasi.reduce((min, cur) => cur.kazanc_milyar_usd < min.kazanc_milyar_usd ? cur : min, sonrasi[0]);
  const dipIdx = seri.indexOf(dipItem);

  // Eylül 2025 civarı (~6)
  const eylul25Idx = seri.findIndex(d => d.tarih.startsWith('2025-09-20') || d.tarih.startsWith('2025-09-19'));
  // Eylül 2026 civarı (~29)
  const eylul26Idx = seri.findIndex(d => d.tarih.startsWith('2026-09-20') || d.tarih.startsWith('2026-09-21') || d.tarih.startsWith('2026-09-22'));
  const sonIdx = seri.length - 1;

  const vurgular = [
    { idx: eylul25Idx, etiket: '6', dy: -12, dx: 14 },
    { idx: zirveIdx, etiket: `${Math.round(zirveItem.kazanc_milyar_usd)}`, dy: -12, dx: 12 },
    { idx: dipIdx, etiket: `${Math.round(dipItem.kazanc_milyar_usd)}`, dy: 18, dx: 0 },
    { idx: eylul26Idx, etiket: `${Math.round(seri[eylul26Idx]?.kazanc_milyar_usd || 29)}`, dy: -12, dx: 14 },
    { idx: sonIdx, etiket: `${Math.round(seri[sonIdx].kazanc_milyar_usd)}`, dy: 6, dx: 18, isSon: true }
  ].filter(v => v.idx !== -1 && v.idx !== undefined);

  let annotations = '';
  for (const v of vurgular) {
    const d = seri[v.idx];
    const px = xToPx(v.idx);
    const py = yToPx(d.kazanc_milyar_usd);
    const renk = v.isSon ? '#c2502b' : '#1b1b1b';
    annotations += `
      <circle cx="${px}" cy="${py}" r="4.5" fill="${renk}" stroke="#f4f3ee" stroke-width="2" />
      <text x="${px + v.dx}" y="${py + v.dy}" fill="${renk}" font-weight="700" font-size="13" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="${v.dx < 0 ? 'end' : (v.dx === 0 ? 'middle' : 'start')}">${v.etiket}</text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <!-- Zemin: finfolis Paper -->
  <rect width="${W}" height="${H}" fill="#f4f3ee" />

  <!-- Başlık ve Üst Bilgi -->
  <text x="${padL}" y="36" fill="#1b1b1b" font-size="18" font-weight="700" font-family="'Bricolage Grotesque', system-ui, sans-serif">
    TCMB ALTIN KAZANCI (P/L) · Tahmini Değerleme Farkı
  </text>
  <text x="${padL}" y="56" fill="#5d5b55" font-size="12" font-family="'Bricolage Grotesque', system-ui, sans-serif">
    20 Mart 2025 bazlı kümülatif gerçekleşmemiş kâr/zarar (Milyar ABD Doları) · Kaynak: TCMB, LBMA &amp; finfolis
  </text>

  <!-- Y Ekseni Birimi -->
  <text x="${padL - 14}" y="${padT - 14}" fill="#5d5b55" font-size="11" font-weight="600" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="end">milyar $</text>

  <!-- Izgara Çizgileri -->
  ${gridLines}

  <!-- P/L Eğrisi ve Alanı (finfolis yükseliş rengi #3f7350) -->
  <defs>
    <linearGradient id="altin-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3f7350" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#3f7350" stop-opacity="0.02" />
    </linearGradient>
  </defs>
  <polyline fill="none" stroke="#3f7350" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />

  <!-- Vurgu Noktaları -->
  ${annotations}

  <!-- X Eksen Etiketleri -->
  ${xLabels}

  <!-- Dipnot Bilgisi -->
  <text x="${W - padR}" y="${H - 16}" fill="#71717a" font-size="10" font-family="'Bricolage Grotesque', system-ui, sans-serif" text-anchor="end">
    * Hesaplama: TCMB'nin ~20.75M ons net altın rezervinin ons başı fiyat farkıyla değerlemesidir.
  </text>
</svg>`;
}

async function main() {
  console.log('--- TCMB Altın P/L Hesaplanıyor ---');
  const fiyatlar = await altinFiyatlariniGetir();
  console.log(`Piyasa altın fiyatı verisi alındı: ${fiyatlar.length} gün`);

  const plSonuc = hesaplaAltinPL(fiyatlar, BAZ_TARIH, TCMB_NET_ALTIN_ONS);
  console.log(`P/L serisi üretildi: ${plSonuc.seri.length} gün (Baz Fiyat: $${plSonuc.baz_fiyat_usd})`);

  // Çıktı Klasörleri
  const dataDir = resolve(__dirname, '../public/data');
  const srcDataDir = resolve(__dirname, '../src/data');
  const grafDir = resolve(__dirname, '../public/grafikler');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(srcDataDir, { recursive: true });
  mkdirSync(grafDir, { recursive: true });

  const veriIcerik = JSON.stringify({
    guncellenme: new Date().toISOString(),
    baz_tarih: plSonuc.baz_tarih,
    baz_fiyat_usd: plSonuc.baz_fiyat_usd,
    rezerv_ons: plSonuc.rezerv_ons,
    rezerv_ton_esdegeri: Math.round(plSonuc.rezerv_ons * 0.0311035),
    kaynak: 'TCMB Bilanço Rezervleri & Spot Ons Altın (XAU/USD)',
    kayit_sayisi: plSonuc.seri.length,
    seri: plSonuc.seri
  }, null, 2);

  // JSON Kaydet (Hem public/data hem de src/data)
  const jsonYolu = resolve(dataDir, 'tcmb-altin-kazanci.json');
  const srcJsonYolu = resolve(srcDataDir, 'tcmb-altin-kazanci.json');
  writeFileSync(jsonYolu, veriIcerik);
  writeFileSync(srcJsonYolu, veriIcerik);
  console.log(`JSON yazıldı: ${jsonYolu} & ${srcJsonYolu}`);

  // SVG Kaydet
  const svgYolu = resolve(grafDir, 'tcmb-altin-pl.svg');
  const svg = svgUret(plSonuc);
  writeFileSync(svgYolu, svg);
  console.log(`SVG çizildi: ${svgYolu}`);

  // Özet Tablo
  const son = plSonuc.seri[plSonuc.seri.length - 1];
  const zirve = plSonuc.seri.reduce((m, c) => c.kazanc_milyar_usd > m.kazanc_milyar_usd ? c : m, plSonuc.seri[0]);
  console.log('\n--- Önemli Kilometre Taşları ---');
  console.table([
    { Olay: 'Başlangıç (20.03.2025)', Tarih: plSonuc.baz_tarih, 'Ons Fiyatı ($)': `$${plSonuc.baz_fiyat_usd}`, 'P/L ($ Milyar)': '$0 Milyar' },
    { Olay: 'Tarihi Zirve', Tarih: zirve.tarih, 'Ons Fiyatı ($)': `$${zirve.ons_fiyat_usd}`, 'P/L ($ Milyar)': `+$${zirve.kazanc_milyar_usd} Milyar` },
    { Olay: 'En Son Durum', Tarih: son.tarih, 'Ons Fiyatı ($)': `$${son.ons_fiyat_usd}`, 'P/L ($ Milyar)': `+$${son.kazanc_milyar_usd} Milyar` }
  ]);
}

// Doğrudan çalıştırıldığında
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Hata:', err);
    process.exit(1);
  });
}
