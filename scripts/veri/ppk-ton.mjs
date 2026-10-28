// PPK metin tonu puanlayıcı. src/data/ppk-metinler.json'daki (scripts/veri/ppk-metinler.mjs) karar ve özet metinlerinden
// henüz puanlanmamış olanları Gemini'ye okutur, sonucu src/data/ppk-ton.json'a ekler. Puanlanmış metin bir daha
// okunmaz (istem sürümü değişmedikçe). Gemini kotasını korumak için bir turda en çok --en-cok (varsayılan 4) metin,
// en yeniden eskiye; geçmiş birkaç turda tamamlanır. Mantık src/lib/ppk-ton.mjs'te.
//
// Kullanım: node scripts/veri/ppk-ton.mjs [--yaz] [--en-cok 4]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gemini } from '../haberler/lib.mjs';
import { SISTEM, SEMA, ISTEM_SURUMU, istemKur, yanitDogrula, belgeListesi } from '../../src/lib/ppk-ton.mjs';

const METIN_DOSYASI = fileURLToPath(new URL('../../src/data/ppk-metinler.json', import.meta.url));
const TON_DOSYASI = fileURLToPath(new URL('../../src/data/ppk-ton.json', import.meta.url));

const oku = async (yol, yedek) => {
  try {
    return JSON.parse(await readFile(yol, 'utf8'));
  } catch {
    return yedek;
  }
};

async function main() {
  const yaz = process.argv.includes('--yaz');
  const i = process.argv.indexOf('--en-cok');
  const enCok = i > 0 ? Number(process.argv[i + 1]) : 4;
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY yok; puanlama atlandı.');
    return;
  }
  const metinler = belgeListesi(await oku(METIN_DOSYASI, null));
  if (!metinler.belgeler.length) {
    console.log('ppk-metinler.json yok ya da boş; puanlama atlandı.');
    return;
  }
  const ton = await oku(TON_DOSYASI, { istemSurumu: ISTEM_SURUMU, puanlar: {} });
  const bekleyen = metinler.belgeler
    .filter((b) => (b.tur === 'karar' || b.tur === 'ozet') && ton.puanlar[b.id]?.istemSurumu !== ISTEM_SURUMU)
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, enCok);
  console.log(`Bekleyen ${bekleyen.length} metin (bu tur en çok ${enCok}).`);
  let yeni = 0;
  for (const b of bekleyen) {
    let sonuc = null;
    // Alıntısı metinde birebir bulunmayan yanıt reddedilir; bir kez daha denenir.
    for (let deneme = 0; deneme < 2 && !sonuc; deneme++) {
      const yanit = await gemini({ sistem: SISTEM, istem: istemKur(b), sema: SEMA, dusunme: 'low', _amac: 'ppk-ton/puanla' });
      sonuc = yanitDogrula(yanit, b);
    }
    if (!sonuc) {
      console.log(`  ${b.id}: geçerli okuma yok, sonraki tura kaldı.`);
      continue;
    }
    ton.puanlar[b.id] = { ...sonuc, istemSurumu: ISTEM_SURUMU, okundu: new Date().toISOString() };
    yeni++;
    console.log(`  ${b.id} (${b.tarih}): ileri yön ${sonuc.ileriYon}, duruş ${sonuc.durus}`);
  }
  if (!yeni) return;
  ton.istemSurumu = ISTEM_SURUMU;
  ton.guncelleme = new Date().toISOString();
  if (yaz) {
    await writeFile(TON_DOSYASI, JSON.stringify(ton, null, 2) + '\n', 'utf8');
    console.log(`${yeni} yeni okuma yazıldı: ${TON_DOSYASI}`);
  } else console.log('Kaydetmek için --yaz.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((hata) => {
    console.error('Hata:', hata.message ?? hata);
    process.exit(1);
  });
}
