// BİST 100 / TÜFE reel gösterge verisini üretir ve src/data/bist-tufe.json dosyasına kaydeder.
// Kaynaklar:
//  - BIST 100 (XU100.IS): Yahoo Finance günlük grafik serisi (son 3 yıl)
//  - TÜFE: src/data/resmi.json içindeki TÜİK resmi aylık değişim serisi
//
// Kullanım: node scripts/veri/bist-tufe.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentJson } from '../haberler/lib.mjs';
import { kapanislar } from '../haberler/yahoo-seri.mjs';
import { bistTufeAnalizi } from '../../src/lib/bist-tufe.mjs';

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?range=3y&interval=1d';
const RESMI_DOSYA = fileURLToPath(new URL('../../src/data/resmi.json', import.meta.url));
const HEDEF_DOSYA = fileURLToPath(new URL('../../src/data/bist-tufe.json', import.meta.url));

export async function bistTufeVerisiUret(simdi = new Date()) {
  const [resmiMetin, yahooYanit] = await Promise.all([
    readFile(RESMI_DOSYA, 'utf-8').then(JSON.parse),
    hentJson(YAHOO_URL),
  ]);

  const tufeSatirlari = resmiMetin?.enflasyon?.satirlar;
  if (!tufeSatirlari || tufeSatirlari.length === 0) {
    throw new Error('Resmi TÜFE satırları bulunamadı');
  }

  const xuKapanislari = kapanislar(yahooYanit, simdi);
  if (!xuKapanislari || xuKapanislari.length < 50) {
    throw new Error('Yahoo Finance BIST 100 serisi yetersiz');
  }

  const analiz = bistTufeAnalizi(xuKapanislari, tufeSatirlari, { gunSayisi: 504 });
  return analiz;
}

async function main() {
  const yaz = process.argv.includes('--yaz');
  console.log('BİST 100 / TÜFE analizi hesaplanıyor...');
  const veri = await bistTufeVerisiUret();

  console.log(`Güncelleme: ${veri.guncelleme}`);
  console.log(`Son BİST 100: ${veri.sonBist}`);
  console.log(`Reel Değer: ${veri.guncelDeger}`);
  console.log(`2Y Ortalama: ${veri.ortalama}`);
  console.log(`Z-Skoru: ${veri.zSkoru}`);
  console.log(`Durum: ${veri.durum}`);
  console.log(`Toplam Nokta: ${veri.noktalar.length}`);

  if (yaz) {
    await writeFile(HEDEF_DOSYA, JSON.stringify(veri, null, 2), 'utf-8');
    console.log(`✓ Veri kaydedildi: ${HEDEF_DOSYA}`);
  } else {
    console.log('Dosyaya yazmak için --yaz parametresi ile çalıştırın.');
  }
}

const buDosya = fileURLToPath(import.meta.url);
if (process.argv[1] === buDosya) {
  main().catch((err) => {
    console.error('Hata:', err);
    process.exit(1);
  });
}
