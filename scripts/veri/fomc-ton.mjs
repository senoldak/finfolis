// FOMC metin tonu puanlayıcı. src/data/fomc-metinler.json'daki (scripts/veri/fomc-metinler.mjs) açıklama ve tutanak
// metinlerinden henüz puanlanmamış olanları Gemini'ye okutur, sonucu src/data/fomc-ton.json'a ekler. Döngü
// scripts/veri/ton-calistir.mjs'te, istem src/lib/fomc-ton.mjs'te.
//
// Kullanım: node scripts/veri/fomc-ton.mjs [--yaz] [--en-cok 4]
import { fileURLToPath } from 'node:url';
import { SISTEM, ISTEM_SURUMU, istemKur, tonMetni } from '../../src/lib/fomc-ton.mjs';
import { tonCalistir } from './ton-calistir.mjs';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  tonCalistir({
    ad: 'FOMC',
    metinDosyasi: fileURLToPath(new URL('../../src/data/fomc-metinler.json', import.meta.url)),
    tonDosyasi: fileURLToPath(new URL('../../src/data/fomc-ton.json', import.meta.url)),
    turler: ['karar', 'tutanak'],
    sistem: SISTEM,
    istemKur,
    istemSurumu: ISTEM_SURUMU,
    amac: 'fomc-ton/puanla',
    metin: tonMetni,
  }).catch((hata) => {
    console.error('Hata:', hata.message ?? hata);
    process.exit(1);
  });
}
