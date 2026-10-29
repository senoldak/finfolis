// "Enflasyonun kaynakları" verisini üretir ve src/data/enflasyon-katkilari.json dosyasına kaydeder.
// Kaynak (yalnız resmi): TCMB EVDS. Endeksler TP.TUKFIY2025.<kod> (TÜİK TÜFE, 2025=100; GENEL ve 01-13 ana grupları),
// ağırlıklar TP.TUKFIYAGRLK.<kod> (TÜİK ana grup ağırlıkları, yıllık). Hesap: src/lib/enflasyon-katkilari.mjs.
// Kaynak düşerse ya da katkılar toplamı manşetten 0,1 puandan fazla sapıyorsa eski dosya ezilmez.
//
// Kullanım: node scripts/veri/enflasyon-katkilari.mjs [--yaz]
// Anahtar: EVDS_API_KEY ortam değişkeni (yoksa ~/.evds-mcp.json). Anahtar hiçbir yere yazılmaz.
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { hentMetin } from '../haberler/lib.mjs';
import { GRUPLAR, katkiSerisi, sonEndeksler, sonTamAy } from '../../src/lib/enflasyon-katkilari.mjs';

const EVDS = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
const HEDEF = fileURLToPath(new URL('../../src/data/enflasyon-katkilari.json', import.meta.url));
const ADET = 24;
export const SAPMA_SINIRI = 0.1;

async function anahtarAl() {
  const env = process.env.EVDS_API_KEY?.replace(/^﻿/, '').trim();
  if (env) return env;
  try {
    return JSON.parse(await readFile(`${homedir()}/.evds-mcp.json`, 'utf-8')).api_key;
  } catch {
    return null;
  }
}

const kodlar = ['GENEL', ...GRUPLAR.map((g) => g.kod)];
const sayi = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

async function evds(yol, anahtar) {
  const veri = JSON.parse(await hentMetin(`${EVDS}/${yol}`, { headers: { key: anahtar } }));
  if (!Array.isArray(veri?.items)) throw new Error('EVDS yanıtı ayrıştırılamadı');
  return veri.items;
}

export async function katkiVerisiUret(simdi = new Date(), anahtar) {
  if (!anahtar) throw new Error('EVDS anahtarı yok');
  const bas = new Date(Date.UTC(simdi.getUTCFullYear() - 4, 0, 1));
  const g = (d) => `01-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

  const agirlikSatir = await evds(
    `series=${kodlar.map((k) => `TP.TUKFIYAGRLK.${k}`).join('-')}&startDate=01-01-${bas.getUTCFullYear()}&endDate=${g(simdi)}&type=json`,
    anahtar,
  );
  const agirlik = {};
  for (const s of agirlikSatir) agirlik[Number(s.Tarih)] = GRUPLAR.map((gr) => sayi(s[`TP_TUKFIYAGRLK_${gr.kod}`]));

  const endeksSatir = await evds(
    `series=${kodlar.map((k) => `TP.TUKFIY2025.${k}`).join('-')}&startDate=${g(bas)}&endDate=${g(simdi)}&type=json`,
    anahtar,
  );
  const endeks = endeksSatir
    .map((s) => {
      const m = String(s.Tarih ?? '').match(/^(\d{4})-(\d{1,2})$/);
      if (!m) return null;
      return {
        yil: Number(m[1]),
        ay: Number(m[2]),
        genel: sayi(s.TP_TUKFIY2025_GENEL),
        g: GRUPLAR.map((gr) => sayi(s[`TP_TUKFIY2025_${gr.kod}`])),
      };
    })
    .filter(Boolean);

  const son = sonTamAy(endeks, agirlik);
  if (!son) throw new Error('Tam veri olan ay bulunamadı');
  const seri = katkiSerisi(endeks, agirlik, son.yil, son.ay, ADET);
  const enBuyuk = Math.max(...seri.map((s) => Math.abs(s.yillikFark)));
  if (enBuyuk > SAPMA_SINIRI) throw new Error(`Katkı toplamı manşetten ${enBuyuk} puan saptı (sınır ${SAPMA_SINIRI})`);

  const sonSatir = seri.at(-1);
  return {
    guncelleme: simdi.toISOString(),
    kaynak: {
      ad: 'TÜİK verisi, TCMB EVDS: Tüketici Fiyat Endeksi (2025=100) ve ana grup ağırlıkları',
      url: 'https://evds3.tcmb.gov.tr/',
    },
    sonAy: { yil: son.yil, ay: son.ay },
    agirlikYili: son.yil,
    gruplar: GRUPLAR.map((gr, i) => ({
      kod: gr.kod,
      ad: gr.ad,
      agirlik: Math.round(agirlik[son.yil][i] * 100) / 100,
      oncekiAgirlik: agirlik[son.yil - 1]?.[i] != null ? Math.round(agirlik[son.yil - 1][i] * 100) / 100 : null,
      yillik: sonSatir.grupYillik[i],
      aylik: sonSatir.grupAylik[i],
    })),
    satirlar: seri,
    // Grup endeks düzeyleri (TÜİK, 2025=100), son 25 ay: kişisel enflasyon hesaplayıcısı için.
    endeksler: sonEndeksler(endeks, son.yil, son.ay, 25),
  };
}

async function main() {
  const yaz = process.argv.includes('--yaz');
  const veri = await katkiVerisiUret(new Date(), await anahtarAl());
  const s = veri.satirlar.at(-1);
  console.log(`Son ay: ${veri.sonAy.yil}-${veri.sonAy.ay}  manşet yıllık %${s.manset.yillik}, aylık %${s.manset.aylik}`);
  console.log(`Katkı toplamı yıllık ${s.yillikToplam} (fark ${s.yillikFark}), aylık ${s.aylikToplam} (fark ${s.aylikFark})`);
  veri.gruplar.forEach((gr, i) => console.log(`  ${gr.kod} ${gr.ad}: ağırlık ${gr.agirlik}, yıllık katkı ${s.yillikKatki[i]}, aylık katkı ${s.aylikKatki[i]}`));
  if (yaz) {
    await writeFile(HEDEF, JSON.stringify(veri, null, 2) + '\n', 'utf-8');
    console.log(`Kaydedildi: ${HEDEF}`);
  } else console.log('Dosyaya yazmak için --yaz verin.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('Hata:', e.message);
    process.exit(1);
  });
}
