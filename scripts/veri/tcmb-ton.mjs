// TCMB ek metin tonu: Başkan konuşmaları ve sunumları, Enflasyon ve Finansal İstikrar Raporlarının genel
// değerlendirmeleri (src/data/tcmb-metinler.json, scripts/veri/tcmb-metinler.mjs) PPK metinleriyle aynı ölçekte okunur
// ve src/data/ppk-ton.json'a yazılır; /veri/ppk-tonu/ döngüleri bunları tür dengeli ortalamaya katar.
// Döngü scripts/veri/ton-calistir.mjs'te, istem src/lib/ppk-ton.mjs'te (SISTEM_EK).
//
// Kullanım: node scripts/veri/tcmb-ton.mjs [--yaz] [--en-cok 4]
import { fileURLToPath } from 'node:url';
import { SISTEM_EK, ISTEM_SURUMU_EK, istemKur } from '../../src/lib/ppk-ton.mjs';
import { tonCalistir } from './ton-calistir.mjs';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  tonCalistir({
    ad: 'TCMB ek',
    metinDosyasi: fileURLToPath(new URL('../../src/data/tcmb-metinler.json', import.meta.url)),
    tonDosyasi: fileURLToPath(new URL('../../src/data/ppk-ton.json', import.meta.url)),
    turler: ['konusma', 'rapor_er', 'rapor_fir'],
    sistem: SISTEM_EK,
    istemKur,
    istemSurumu: ISTEM_SURUMU_EK,
    amac: 'tcmb-ton/puanla',
  }).catch((hata) => {
    console.error('Hata:', hata.message ?? hata);
    process.exit(1);
  });
}
