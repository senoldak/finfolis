// Kapak türlerinin demo çıktısı: node scripts/kapak/ornekler.mjs [çıktı-klasörü]
// Varsayılan çıktı klasörü .kapak-ornekleri/ (gitignore'da). src/content'e ASLA yazmaz;
// buradaki rakamlar yalnızca görsel denemedir, haber verisi değildir.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kapakCiz, kaynakKapagi, rakamKapagi, gostergeKapagi, bultenKapagi, haberKapagi } from './kapak.mjs';

const cikti = resolve(process.argv[2] ?? '.kapak-ornekleri');
await mkdir(cikti, { recursive: true });

const ornekler = {
  'haber-demo': haberKapagi({
    kategori: 'ekonomi',
    bolge: 'asya',
    baslik: 'Singapurlu yatırımcıların yerel borsadaki risk iştahı düşük',
    spot: 'Singapur Borsası Başkanı Koh Boon Hwee, yerel yatırımcıların yurt dışında risk almayı tercih ettiğini ve yerel hisselerde benzer talep oluşmadığını belirtti.',
    ornek: true,
  }),
  'haber-rakam-demo': haberKapagi({
    kategori: 'ekonomi',
    bolge: 'küresel',
    baslik: 'Yapay zeka yatırımları küresel büyümeyi destekliyor',
    spot: 'IMF, yapay zeka yatırımlarının etkisiyle 2026 yılı küresel büyüme tahminini yüzde 3,1 olarak güncelledi.',
    rakam: { etiket: '2026 Büyüme Tahmini', deger: '%3,1' },
    ornek: true,
  }),
  'kaynak-demo': kaynakKapagi({
    kategori: 'piyasalar',
    konu: 'finfolis yayında',
    alt: 'Piyasaları herkes için anlaşılır kılan analiz platformu',
  }),
  'gosterge-demo': gostergeKapagi({
    kategori: 'borsa',
    baslik: 'Demo gösterge',
    simge: 'fabrika',
    birim: 1000,
    birimEtiket: '1.000 puan',
    satirlar: [
      { etiket: 'A', deger: 7000 },
      { etiket: 'B', deger: 9000 },
    ],
    ornek: true,
  }),
  'bulten-demo': bultenKapagi({
    saat: '14:00',
    tarih: '11 Ekim',
    basliklar: ['Demo başlık bir: örnek olay metni burada yer alır', 'Demo başlık iki', 'Demo başlık üç'],
  }),
  'rakam-demo': rakamKapagi({
    kategori: 'piyasalar',
    ust: 'TCMB Politika Faizi',
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
