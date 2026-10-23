// BİST 30 ve BİST 100 endekslerini TÜİK TÜFE enflasyonundan arındırarak reel endeks serisini hesaplar.
// Sonuçları src/data/reel-bist.json'a yazar.
//
// Kaynaklar:
//  - BİST 30 ve BİST 100 aylık kapanışları: Yahoo Finance (XU030.IS, XU100.IS)
//  - TÜİK TÜFE aylık ve yıllık değişim oranları: src/data/resmi.json (TCMB Tüketici Fiyatları tablosundan)
//
// Hesaplama Yöntemi:
//  - Baz Dönem: Eylül 2014 (2014-09) = 100
//  - Kümülatif Enflasyon Çarpanı: Baz aydan itibaren her ayın aylık TÜFE değişimi zincirlenir (1 + aylik/100)
//  - Reel Endeks = (BistKapanis_t / BistKapanis_baz) / (TufeCarpani_t / TufeCarpani_baz) * 100
//
// Kullanım: node scripts/haberler/reel-bist-veri.mjs [--yaz]

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentJson } from './lib.mjs';

const DOSYA = fileURLToPath(new URL('../../src/data/reel-bist.json', import.meta.url));
const RESMI_DOSYA = fileURLToPath(new URL('../../src/data/resmi.json', import.meta.url));
const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export const BAZ_YIL = 2014;
export const BAZ_AY = 9;
export const BAZ_ANAHTAR = `${BAZ_YIL}-${String(BAZ_AY).padStart(2, '0')}`;

const yuvarla = (n, o = 1) => Math.round(n * 10 ** o) / 10 ** o;

/**
 * Yahoo Finance grafik yanıtından ay-kapanış eşlemesi üretir.
 * @param {object} veri
 * @returns {Record<string, number>} { 'YYYY-MM': closePrice }
 */
export function yahooAylikKapanislar(veri) {
  const sonuc = veri?.chart?.result?.[0];
  const timestamps = sonuc?.timestamp;
  const quotes = sonuc?.indicators?.quote?.[0]?.close;

  if (!timestamps || !quotes || timestamps.length === 0) {
    throw new Error('Yahoo grafik verisi eksik veya geçersiz');
  }

  const map = {};
  for (let i = 0; i < timestamps.length; i++) {
    const quote = quotes[i];
    if (quote == null || quote <= 0) continue;
    const d = new Date(timestamps[i] * 1000);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    map[ym] = quote;
  }
  return map;
}

/**
 * TÜFE satırları ve BİST kapanışlarından reel endeks serisi ve istatistikleri üretir.
 * @param {Array<{yil: number, ay: number, aylik: number, yillik: number}>} tufeSatirlari
 * @param {Record<string, number>} bistKapanislar
 * @param {string} bazYm
 */
export function reelSeriHesapla(tufeSatirlari, bistKapanislar, bazYm = BAZ_ANAHTAR) {
  const [bYil, bAy] = bazYm.split('-').map(Number);
  const basIdx = tufeSatirlari.findIndex((s) => s.yil === bYil && s.ay === bAy);
  if (basIdx === -1) {
    throw new Error(`Baz dönem TÜFE serisinde bulunamadı: ${bazYm}`);
  }

  const bazBist = bistKapanislar[bazYm];
  if (!bazBist || bazBist <= 0) {
    throw new Error(`Baz dönem BİST kapanışı bulunamadı: ${bazYm}`);
  }

  let tufeCarpani = 1.0;
  const noktalar = [];

  for (let i = basIdx; i < tufeSatirlari.length; i++) {
    const s = tufeSatirlari[i];
    if (i > basIdx) {
      tufeCarpani *= 1 + s.aylik / 100;
    }
    const ym = `${s.yil}-${String(s.ay).padStart(2, '0')}`;
    const bistKapanis = bistKapanislar[ym];

    if (bistKapanis && bistKapanis > 0) {
      const reelEndeks = (bistKapanis / bazBist / tufeCarpani) * 100;
      noktalar.push({
        tarih: ym,
        yil: s.yil,
        ay: s.ay,
        bistKapanis: yuvarla(bistKapanis, 2),
        tufeCarpani: yuvarla(tufeCarpani, 2),
        tufeYillik: s.yillik,
        tufeAylik: s.aylik,
        reelEndeks: yuvarla(reelEndeks, 1),
      });
    }
  }

  if (noktalar.length < 12) {
    throw new Error('Hesaplanan reel seri çok kısa (en az 12 ay gerekli)');
  }

  // Zirve ve dip değerleri
  let zirve = noktalar[0];
  let dip = noktalar[0];
  for (const p of noktalar) {
    if (p.reelEndeks > zirve.reelEndeks) zirve = p;
    if (p.reelEndeks < dip.reelEndeks) dip = p;
  }

  const son = noktalar.at(-1);
  const birYilOnce = noktalar.find((p) => p.yil === son.yil - 1 && p.ay === son.ay);
  const besYilOnce = noktalar.find((p) => p.yil === son.yil - 5 && p.ay === son.ay);

  const getiriYuzde = (yeni, eski) => (eski ? yuvarla(((yeni - eski) / eski) * 100, 1) : null);

  const istatistik = {
    bazTarih: bazYm,
    bazBist: yuvarla(bazBist, 2),
    sonNokta: son,
    zirve: { tarih: zirve.tarih, reelEndeks: zirve.reelEndeks, bistKapanis: zirve.bistKapanis },
    dip: { tarih: dip.tarih, reelEndeks: dip.reelEndeks, bistKapanis: dip.bistKapanis },
    reelDegisimToplam: yuvarla(son.reelEndeks - 100, 1),
    reelDegisim1Yil: birYilOnce ? getiriYuzde(son.reelEndeks, birYilOnce.reelEndeks) : null,
    reelDegisim5Yil: besYilOnce ? getiriYuzde(son.reelEndeks, besYilOnce.reelEndeks) : null,
    nominalDegisimToplam: getiriYuzde(son.bistKapanis, bazBist),
  };

  return { istatistik, noktalar };
}

/**
 * Ana çalıştırıcı
 */
export async function calistir({ yaz = false } = {}) {
  const resmiHam = await readFile(RESMI_DOSYA, 'utf8');
  const resmi = JSON.parse(resmiHam);
  const tufeSatirlari = resmi?.enflasyon?.satirlar;
  if (!tufeSatirlari || tufeSatirlari.length === 0) {
    throw new Error('src/data/resmi.json içinde enflasyon satırları bulunamadı');
  }

  const url = `${YAHOO_URL}/XU030.IS?range=15y&interval=1mo`;
  const yahooVeri = await hentJson(url);
  const bistKapanislar = yahooAylikKapanislar(yahooVeri);

  const { istatistik, noktalar } = reelSeriHesapla(tufeSatirlari, bistKapanislar, BAZ_ANAHTAR);

  const cikti = {
    guncelleme: new Date().toISOString(),
    endeks: 'BİST 30 (XU030)',
    bazTarih: BAZ_ANAHTAR,
    kaynaklar: [
      { ad: 'Borsa İstanbul / Yahoo Finance (XU030.IS)', url: 'https://finance.yahoo.com/quote/XU030.IS' },
      { ad: 'TÜİK / TCMB Tüketici Fiyatları', url: 'https://www.tcmb.gov.tr' },
    ],
    donemler: [
      { id: 'denge', no: 1, ad: 'Dengeli Aralık', ozet: 'Enflasyonla paralel dalgalanma', aralik: '2014 – 2018', bant: '85 – 120', sinirlar: ['2014-09', '2018-08'] },
      { id: 'dip', no: 2, ad: 'Reel Değer Kaybı', ozet: 'Tarihsel ucuzluk ve erime', aralik: '2018 – 2022', bant: '63 – 90', sinirlar: ['2018-09', '2022-07'] },
      { id: 'ralli', no: 3, ad: 'Enflasyon Rallisi', ozet: 'Negatif reel faizden kaçış', aralik: '2022 – 2024', bant: '100 – 155', sinirlar: ['2022-08', '2024-05'] },
      { id: 'normal', no: 4, ad: 'Konsolidasyon', ozet: 'Sıkılaşma ve ortalamaya dönüş', aralik: '2024 – 2026', bant: '85 – 115', sinirlar: ['2024-06', '2026-12'] },
    ],
    istatistik,
    noktalar,
  };

  if (yaz) {
    await writeFile(DOSYA, JSON.stringify(cikti, null, 2) + '\n', 'utf8');
    console.log(`Reel BİST verisi başarıyla yazıldı: ${DOSYA} (${noktalar.length} ay)`);
  }

  return cikti;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const yaz = process.argv.includes('--yaz');
  calistir({ yaz }).catch((err) => {
    console.error('Hata:', err);
    process.exit(1);
  });
}
