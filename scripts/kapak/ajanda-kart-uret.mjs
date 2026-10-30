#!/usr/bin/env node
// Finfolis — Günün Öne Çıkan Verileri (Ekonomik Ajanda) Sosyal Medya Kartı Üreteci
// Kullanım:
//   node scripts/kapak/ajanda-kart-uret.mjs [--tarih YYYY-AA-GG] [--cikis dosya.png] [--ornek]
// Kimlik v2 (BRAND.md) ve ürün ilkeleri (PRODUCT.md): sakin, öğretici ve sıcak.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kapakCiz, ajandaKapagi } from './kapak.mjs';

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AJANDA_DOSYASI = resolve(KOK, 'src/data/ajanda.json');

/**
 * Komut satırı argümanlarını ayrıştırır.
 */
function argumanlariCoz(argv) {
  const secenekler = {
    tarih: null,
    cikis: null,
    ornek: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--tarih' && argv[i + 1]) {
      secenekler.tarih = argv[++i];
    } else if (arg === '--cikis' && argv[i + 1]) {
      secenekler.cikis = argv[++i];
    } else if (arg === '--ornek') {
      secenekler.ornek = true;
    } else if (arg.startsWith('--tarih=')) {
      secenekler.tarih = arg.slice(8);
    } else if (arg.startsWith('--cikis=')) {
      secenekler.cikis = arg.slice(8);
    }
  }

  return secenekler;
}

/**
 * Belirtilen tarih veya en son ajanda için yüksek çözünürlüklü sosyal medya kartı (PNG) üretir.
 * @param {{ tarih?: string|null, cikis?: string|null, ornek?: boolean, veri?: any }} secenekler
 * @returns {Promise<{ buffer: Buffer, yol: string|null, tarih: string }>}
 */
export async function ajandaKartiUret({ tarih = null, cikis = null, ornek = false, veri = null } = {}) {
  let ajandaVerisi = veri;
  if (!ajandaVerisi) {
    const raw = await readFile(AJANDA_DOSYASI, 'utf-8');
    ajandaVerisi = JSON.parse(raw);
  }

  const ajandalar = ajandaVerisi.ajandalar ?? [];
  if (ajandalar.length === 0) {
    throw new Error('Ajanda verisi bulunamadı');
  }

  const secilen = tarih ? ajandalar.find((a) => a.tarih === tarih) ?? ajandalar[0] : ajandalar[0];

  const baslikMetni = `${secilen.baslik} · ${secilen.tarih}`;
  const kartIslevi = ajandaKapagi({
    tarih: baslikMetni,
    altBaslik: secilen.altBaslik ?? 'Piyasalarda takip edilecek kritik makro veriler',
    maddeler: secilen.gostergeler ?? [],
    ornek,
  });

  const buffer = await kapakCiz(kartIslevi);

  let hedefYol = cikis;
  if (!hedefYol) {
    const cikisKlasor = resolve(KOK, '.kapak-ornekleri');
    await mkdir(cikisKlasor, { recursive: true });
    hedefYol = resolve(cikisKlasor, `ajanda-${secilen.tarih}.png`);
  }

  if (hedefYol) {
    await mkdir(dirname(resolve(hedefYol)), { recursive: true });
    await writeFile(resolve(hedefYol), buffer);
  }

  return { buffer, yol: hedefYol, tarih: secilen.tarih };
}

// Doğrudan çalıştırıldığında (CLI)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const secenekler = argumanlariCoz(process.argv);
    const sonuc = await ajandaKartiUret(secenekler);
    const kb = (sonuc.buffer.length / 1024).toFixed(1);
    console.log(`✓ Ajanda kartı üretildi: ${sonuc.yol} (${kb} KB, Tarih: ${sonuc.tarih})`);
  } catch (err) {
    console.error('::error::Ajanda kartı üretilirken hata oluştu:', err);
    process.exit(1);
  }
}
