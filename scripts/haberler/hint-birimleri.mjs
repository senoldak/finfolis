// Hint sayı birimleri (lakh = 100 bin, crore = 10 milyon, lakh crore = 1 trilyon) Türkçe metne çevrilmeden geçmişti
// ("82,8 crore ₹"; 26 Kasım 2026'da 101 haber). Bu modül sayıyı birimiyle birlikte Türkçe büyüklüğe çevirir:
// "82,8 crore" -> "828 milyon", "9.197 crore" -> "91,97 milyar", "1,47 lakh" -> "147 bin", "2,5 lakh crore" ->
// "2,5 trilyon". Hesap ondalık kaydırmayla yapılır, yuvarlama yoktur. Para birimi sözcüğü (rupi, ₹) ve ekleri aynen
// kalır. Haberi yazan bot için de kullanılabilir (yazar çıktısını süzmek), eski haberler için `node ... --yaz`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CARPAN = { lakh: 5, lak: 5, crore: 7, 'lakh crore': 12, 'lak crore': 12 };
const BIRIMLER = [
  [12, 'trilyon'],
  [9, 'milyar'],
  [6, 'milyon'],
  [3, 'bin'],
];

/** "1.234,56" (Türkçe) ya da "5.84.624" (Hint gruplaması) -> { tam: '123456', ondalik: 2 } */
function sayiCoz(s) {
  const [tamKisim, kesir = ''] = s.split(',');
  const tam = tamKisim.replace(/\./g, '');
  if (!/^\d+$/.test(tam) || !/^\d*$/.test(kesir)) return null;
  return { rakamlar: (tam + kesir).replace(/^0+(?=\d)/, ''), ondalik: kesir.length };
}

/** Rakam dizisi ve 10'un kuvveti -> Türkçe biçimli sayı ("8288", -1 -> "828,8"; binlik ayraç nokta). */
function bicimle(rakamlar, us) {
  let tam, kesir;
  if (us >= 0) {
    tam = rakamlar + '0'.repeat(us);
    kesir = '';
  } else {
    const r = rakamlar.padStart(-us + 1, '0');
    tam = r.slice(0, r.length + us);
    kesir = r.slice(r.length + us).replace(/0+$/, '');
  }
  tam = tam.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return kesir ? `${tam},${kesir}` : tam;
}

/** Sayı + Hint birimi -> "828 milyon" gibi. Çevrilemezse null. */
export function hintSayisi(sayi, birim) {
  const c = sayiCoz(sayi);
  const k = CARPAN[birim.toLowerCase().replace(/\s+/g, ' ')];
  if (!c || k === undefined) return null;
  // Değer = rakamlar × 10^(k − ondalik). Büyüklük basamağı: rakam sayısı + üs − 1.
  const us = k - c.ondalik;
  const basamak = c.rakamlar.length + us - 1;
  const [b, ad] = BIRIMLER.find(([b]) => basamak >= b) ?? [0, ''];
  const metin = bicimle(c.rakamlar, us - b);
  return ad ? `${metin} ${ad}` : metin;
}

// Sayı: Türkçe ya da Hint gruplaması, ardından birim. "crore" büyük/küçük harf; "lak" yazım hatası da yakalanır.
const DESEN = /(?<![\d.,])(\d{1,3}(?:\.\d{2,3})+(?:,\d+)?|\d+(?:,\d+)?)\s+(lakh?\s+crore|crore|lakh?)\b/gi;

/** Metindeki "sayı + Hint birimi" kalıplarını çevirir. -> { metin, sayi } */
export function hintBirimleriniCevir(metin) {
  let sayi = 0;
  const yeni = String(metin).replace(DESEN, (m, n, birim) => {
    const t = hintSayisi(n, birim);
    if (!t) return m;
    sayi++;
    return t;
  });
  return { metin: yeni, sayi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/content/haberler');
  const YAZ = process.argv.includes('--yaz');
  let dosya = 0, toplam = 0;
  for (const d of readdirSync(KOK)) {
    const yol = path.join(KOK, d, 'index.md');
    let eski;
    try {
      eski = readFileSync(yol, 'utf8');
    } catch {
      continue;
    }
    const { metin, sayi } = hintBirimleriniCevir(eski);
    if (!sayi) continue;
    dosya++;
    toplam += sayi;
    if (YAZ) writeFileSync(yol, metin, 'utf8');
  }
  console.log(`haber: ${dosya} | çevrilen: ${toplam}${YAZ ? '' : ' (kuru çalışma)'}`);
}
