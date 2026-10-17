// Kapak türlerinin demo çıktısı: node scripts/kapak/ornekler.mjs [çıktı-klasörü]
// Varsayılan çıktı klasörü .kapak-ornekleri/ (gitignore'da). src/content'e ASLA yazmaz;
// buradaki rakamlar yalnızca görsel denemedir, haber verisi değildir.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kapakCiz, kaynakKapagi, rakamKapagi, bultenKapagi, haberKapagi } from './kapak.mjs';

const cikti = resolve(process.argv[2] ?? '.kapak-ornekleri');
await mkdir(cikti, { recursive: true });

const ornekler = {
  'haber-ekonomi': haberKapagi({
    kategori: 'ekonomi',
    baslik: 'İran savaşı her ABD hanesine yaklaşık 2.000 dolara mal oldu',
    ornek: true,
  }),
  'haber-doviz-ochre': haberKapagi({
    kategori: 'doviz',
    baslik: 'Altın ons fiyatı rekor tazeledi, dolar endeksi geriledi',
    ornek: true,
  }),
  'haber-kripto-uzun': haberKapagi({
    kategori: 'kripto',
    baslik: 'Anthropic gelir artışındaki yavaşlama halka arz değerlemesini tartışmaya açıyor',
    ornek: true,
  }),
  'kaynak-borsa': kaynakKapagi({
    kategori: 'borsa',
    konu: 'TRex Bio, Inc.',
    alt: 'Halka arz nihai izahnamesi',
    ornek: true,
  }),
  'bulten-piyasalar': bultenKapagi({
    saat: '14:00',
    tarih: '11 Ekim',
    basliklar: ['Tokenleştirme ve Sermaye', 'İran Savaşı ve Bütçe', 'Ortadoğu ve Petrol Piyasası'],
  }),
  'rakam-piyasalar': rakamKapagi({
    kategori: 'piyasalar',
    ust: 'TCMB politika faizi',
    rakam: '%50,0',
    alt: 'Para Politikası Kurulu faiz oranını sabit tuttu.',
    ornek: true,
  }),
};

for (const [ad, tur] of Object.entries(ornekler)) {
  const png = await kapakCiz(tur);
  await writeFile(resolve(cikti, `${ad}.png`), png);
  console.log(`${ad}.png`, `${Math.round(png.length / 1024)} KB`);
}
