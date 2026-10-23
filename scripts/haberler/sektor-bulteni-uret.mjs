// BIST Sektör Karnesi Bülten / Haber Taslağı Üreticisi:
// src/data/sektorler.json dosyasındaki aylık verileri okur;
// en çok kazandıran, en çok kaybettiren sektörleri ve piyasa dinamiklerini özetleyen
// tam bir analiz makalesi üretir.
//
// Kullanım:
//   node scripts/haberler/sektor-bulteni-uret.mjs [--yaz]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const VERI_DOSYA = fileURLToPath(new URL('../../src/data/sektorler.json', import.meta.url));
const HABERLER_DIZIN = fileURLToPath(new URL('../../src/content/haberler', import.meta.url));

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function bultenMetniUret(veri, simdi = new Date()) {
  const ayAdi = AYLAR[simdi.getMonth()];
  const yil = simdi.getFullYear();
  const sektorler = veri.sektorler;

  const siraliAylik = [...sektorler].sort((a, b) => b.aylik - a.aylik);
  const kazananlar = siraliAylik.slice(0, 3);
  const kaybedenler = [...siraliAylik].reverse().slice(0, 3);

  const xu100 = sektorler.find((s) => s.kod === 'XU100');
  const xbank = sektorler.find((s) => s.kod === 'XBANK');
  const xusin = sektorler.find((s) => s.kod === 'XUSIN');

  const slug = `bistte-${ayAdi.toLowerCase()}-${yil}-sektor-karnesi-kazananlar-ve-kaybedenler`;
  const baslik = `BIST'te ${ayAdi} ${yil} Sektör Karnesi: Hangi Sektör Ne Kazandırdı?`;
  const aciklama = `Borsa İstanbul'da ${ayAdi} ayında en çok kazandıran sektörler, en sert düşüş yaşayan alt endeksler ve toplam piyasa değeri dağılımı.`;

  const kazananlarMetin = kazananlar
    .map((s, i) => `${i + 1}. **${s.ad} (${s.kod})**: Aylık **+%${Math.abs(s.aylik)}** getiri sağladı. ${s.aciklama ? s.aciklama + '.' : ''}`)
    .join('\n');

  const kaybedenlerMetin = kaybedenler
    .map((s, i) => `${i + 1}. **${s.ad} (${s.kod})**: Aylık **-%${Math.abs(s.aylik)}** geriledi. ${s.aciklama ? s.aciklama + '.' : ''}`)
    .join('\n');

  const govde = `---
title: "${baslik}"
description: "${aciklama}"
date: ${simdi.toISOString()}
category: "borsa"
tur: "analiz"
kaynaklar:
  - ad: "Borsa İstanbul & Piyasa Kapanış Verileri"
    url: "https://finfolis.com/veri/sektorler/"
---

Borsa İstanbul'da ${ayAdi} ${yil} dönemi sektörler arasında belirgin bir ayrışmayla tamamlandı. Gösterge endeks **BIST 100 (${xu100 ? `%${xu100.aylik}` : ''})** genel seyrini sürdürürken, alt sektörlerde getiri makası açıldı.

### Ayın En Çok Kazandıran Sektörleri

${kazananlarMetin}

### Ayın En Çok Gerileyen Sektörleri

${kaybedenlerMetin}

### Lokomotif Sektörlerde Durum

Bankacılık ve sanayi cephesinde:
- **BIST Banka (XBANK)**: Aylık %${xbank?.aylik ?? '0.0'} değişim kaydetti.
- **BIST Sınai (XUSIN)**: Aylık %${xusin?.aylik ?? '0.0'} seviyesinde gerçekleşti.

Tüm sektörlerin canlı değerlerini, geçmiş performanslarını ve toplam piyasa değerlerini detaylı olarak incelemek için [BIST Sektör Karnesi](https://finfolis.com/veri/sektorler/) sayfamızı ziyaret edebilirsiniz.
`;

  return { slug, baslik, aciklama, govde };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ham = await readFile(VERI_DOSYA, 'utf8');
  const veri = JSON.parse(ham);

  const bulten = bultenMetniUret(veri);
  console.log(`Bülten hazırlandı: ${bulten.baslik}`);

  if (process.argv.includes('--yaz')) {
    const hedefDizin = `${HABERLER_DIZIN}/${bulten.slug}`;
    await mkdir(hedefDizin, { recursive: true });
    await writeFile(`${hedefDizin}/index.md`, bulten.govde, 'utf8');
    console.log(`Yazıldı: ${hedefDizin}/index.md`);
  } else {
    console.log('\n--- Taslak Önizleme ---');
    console.log(bulten.govde);
    console.log('\nKaydetmek için: node scripts/haberler/sektor-bulteni-uret.mjs --yaz');
  }
}
