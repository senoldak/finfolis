// PPK metin tonu puanlayıcı. src/data/ppk-metinler.json'daki (scripts/veri/ppk-metinler.mjs) karar ve özet metinlerinden
// henüz puanlanmamış olanları Gemini'ye okutur, sonucu src/data/ppk-ton.json'a ekler. Döngü scripts/veri/ton-calistir.mjs'te,
// istem ve doğrulama src/lib/ppk-ton.mjs'te.
//
// Kullanım: node scripts/veri/ppk-ton.mjs [--yaz] [--en-cok 4]
import { fileURLToPath } from 'node:url';
import { SISTEM, ISTEM_SURUMU, istemKur } from '../../src/lib/ppk-ton.mjs';
import { tonCalistir } from './ton-calistir.mjs';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  tonCalistir({
    ad: 'PPK',
    metinDosyasi: fileURLToPath(new URL('../../src/data/ppk-metinler.json', import.meta.url)),
    tonDosyasi: fileURLToPath(new URL('../../src/data/ppk-ton.json', import.meta.url)),
    turler: ['karar', 'ozet'],
    sistem: SISTEM,
    istemKur,
    istemSurumu: ISTEM_SURUMU,
    amac: 'ppk-ton/puanla',
  }).catch((hata) => {
    console.error('Hata:', hata.message ?? hata);
    process.exit(1);
  });
}
