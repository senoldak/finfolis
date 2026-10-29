// ECB metin tonu puanlayıcı. src/data/ecb-metinler.json'daki (scripts/veri/ecb-metinler.mjs) karar, basın toplantısı
// ve hesap metinlerinden henüz puanlanmamış olanları Gemini'ye okutur, sonucu src/data/ecb-ton.json'a ekler. Döngü
// scripts/veri/ton-calistir.mjs'te, istem src/lib/ecb-ton.mjs'te.
//
// Kullanım: node scripts/veri/ecb-ton.mjs [--yaz] [--en-cok 4]
import { fileURLToPath } from 'node:url';
import { SISTEM, ISTEM_SURUMU, istemKur, tonMetni } from '../../src/lib/ecb-ton.mjs';
import { tonCalistir } from './ton-calistir.mjs';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  tonCalistir({
    ad: 'ECB',
    metinDosyasi: fileURLToPath(new URL('../../src/data/ecb-metinler.json', import.meta.url)),
    tonDosyasi: fileURLToPath(new URL('../../src/data/ecb-ton.json', import.meta.url)),
    turler: ['karar', 'aciklama', 'hesap'],
    sistem: SISTEM,
    istemKur,
    istemSurumu: ISTEM_SURUMU,
    amac: 'ecb-ton/puanla',
    metin: tonMetni,
  }).catch((hata) => {
    console.error('Hata:', hata.message ?? hata);
    process.exit(1);
  });
}
