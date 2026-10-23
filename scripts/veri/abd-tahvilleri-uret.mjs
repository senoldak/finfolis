// Türkiye'nin ABD Hazine Tahvili Portföyü (TIC verisi) çekici ve analiz üretici.
// Kaynak: U.S. Department of the Treasury / Federal Reserve Bank of St. Louis (FRED)
//  - FORLTTREASPOS12807: Uzun Vadeli ABD Tahvilleri (Milyon USD)
//  - FORSTTREASPOS12807: Kısa Vadeli ABD Bonoları (T-Bills) (Milyon USD)
//
// Kullanım: node scripts/veri/abd-tahvilleri-uret.mjs [--yaz]
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin } from '../haberler/lib.mjs';
import { abdTahvilAnalizi } from '../../src/lib/abd-tahvilleri.mjs';

const UZUN_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=FORLTTREASPOS12807';
const KISA_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=FORSTTREASPOS12807';
const HEDEF_DOSYA = fileURLToPath(new URL('../../src/data/abd-tahvilleri.json', import.meta.url));

export async function abdTahvilleriVerisiUret() {
  const [uzunCsv, kisaCsv] = await Promise.all([
    hentMetin(UZUN_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    hentMetin(KISA_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
  ]);

  const analiz = abdTahvilAnalizi(uzunCsv, kisaCsv);
  return analiz;
}

async function main() {
  const yaz = process.argv.includes('--yaz');
  console.log('Türkiye ABD tahvil portföy verileri FRED / TIC üzerinden çekiliyor...');

  const veri = await abdTahvilleriVerisiUret();
  console.log(`Son Tarih: ${veri.sonNokta.tarih}`);
  console.log(`Toplam Portföy: $${veri.sonNokta.toplamUSD.toLocaleString('tr-TR')} Milyon`);
  console.log(` - Kısa Vadeli (T-Bill): $${veri.sonNokta.kisaUSD.toLocaleString('tr-TR')} Milyon (%${veri.sonNokta.kisaOran})`);
  console.log(` - Uzun Vadeli (Tahvil): $${veri.sonNokta.uzunUSD.toLocaleString('tr-TR')} Milyon (%${veri.sonNokta.uzunOran})`);
  console.log(`Aylık Değişim: ${veri.aylikDegisimUSD >= 0 ? '+' : ''}$${veri.aylikDegisimUSD.toLocaleString('tr-TR')} Milyon (%${veri.aylikDegisimYuzde})`);
  console.log(`Tarihsel Zirve: ${veri.tarihselZirve.tarih} ($${veri.tarihselZirve.toplamUSD.toLocaleString('tr-TR')} Milyon)`);
  console.log(`Tarihsel Dip: ${veri.tarihselDip.tarih} ($${veri.tarihselDip.toplamUSD.toLocaleString('tr-TR')} Milyon)`);
  console.log(`Toplam Veri Noktası: ${veri.noktalar.length}`);

  if (yaz) {
    await writeFile(HEDEF_DOSYA, JSON.stringify(veri, null, 2), 'utf-8');
    console.log(`Veri kaydedildi: ${HEDEF_DOSYA}`);
  } else {
    console.log('Veriyi kaydetmek için --yaz parametresini ekleyin.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((hata) => {
    console.error('Hata:', hata);
    process.exit(1);
  });
}
