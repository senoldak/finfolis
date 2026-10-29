// TCMB karnesi, 1. bölüm: Enflasyon Raporları'nın yıl sonu tahminlerini, tahmin aralıklarını ve ara hedeflerini
// "3. Orta Vadeli Öngörüler" bölümünden çıkarır, src/data/tcmb-er-tahminleri.json dosyasına yazar. Yalnız tcmb.gov.tr, yapay zekâ yok.
// Artımlıdır: dosyada olan ve aynı ayrıştırma sürümüyle çıkarılmış rapor yeniden indirilmez; başarısız olanlar her çalıştırmada yeniden denenir.
// Kaynak düşerse (rapor listesi alınamazsa) var olan dosya değiştirilmez. PDF metni için sistemdeki `pdftotext` çağrılır.
//
// Kullanım: node scripts/veri/tcmb-karnesi.mjs [--yaz]
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep, USER_AGENT } from '../haberler/lib.mjs';
import { RAPOR_TABAN, raporListesi, raporSayfasi } from '../../src/lib/tcmb-metin.mjs';
import { AYRISTIRMA_SURUMU, erTahminleriCikar } from '../../src/lib/tcmb-karnesi.mjs';

const calistir = promisify(execFile);
const HEDEF = fileURLToPath(new URL('../../src/data/tcmb-er-tahminleri.json', import.meta.url));
const ILK_TARIH = '2023-01-01'; // 2023'ten bugüne
const BEKLEME_MS = 1000;
const KAYNAK = { ad: 'TCMB Enflasyon Raporu, 3. Orta Vadeli Öngörüler', url: `${RAPOR_TABAN}/Enflasyon+Raporu` };

async function mevcutOku() {
  try {
    const j = JSON.parse(await readFile(HEDEF, 'utf-8'));
    if (Array.isArray(j.raporlar)) return j;
  } catch {}
  return { surum: AYRISTIRMA_SURUMU, alinma: null, kaynak: KAYNAK, raporlar: [], basarisiz: [] };
}

async function pdfMetne(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`PDF değil: ${url}`);
  const dizin = await mkdtemp(path.join(tmpdir(), 'tcmb-er-'));
  try {
    const dosya = path.join(dizin, 'bolum.pdf');
    await writeFile(dosya, buf);
    const { stdout } = await calistir('pdftotext', ['-enc', 'UTF-8', dosya, '-'], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
    return stdout;
  } finally {
    await rm(dizin, { recursive: true, force: true });
  }
}

export async function erTahminleriUret({ simdi = new Date(), indir = hentMetin, pdfAl = pdfMetne, bekle = sleep, log = console.log } = {}) {
  const veri = await mevcutOku();
  const surumTamam = veri.surum === AYRISTIRMA_SURUMU;
  const mevcut = new Map(surumTamam ? veri.raporlar.map((r) => [r.id, r]) : []);

  let liste;
  try {
    liste = raporListesi(await indir(`${RAPOR_TABAN}/Enflasyon+Raporu`), 'er').filter((r) => r.tarih >= ILK_TARIH);
    if (!liste.length) throw new Error('rapor bulunamadı');
  } catch (e) {
    throw new Error(`Enflasyon Raporu listesi alınamadı: ${e.message}; var olan dosya korunuyor`);
  }
  await bekle(BEKLEME_MS);

  const raporlar = [];
  const basarisiz = [];
  let yeni = 0;
  for (const r of liste) {
    if (mevcut.has(r.id)) {
      raporlar.push(mevcut.get(r.id));
      continue;
    }
    try {
      const sayfa = raporSayfasi(await indir(r.url));
      await bekle(BEKLEME_MS);
      const bolum = sayfa.bolumler.find((b) => /Orta Vadeli [ÖO]ng[öo]r[üu]ler/i.test(b.ad));
      if (!bolum) throw new Error('"Orta Vadeli Öngörüler" bölümü bulunamadı');
      const metin = await pdfAl(bolum.pdfUrl);
      await bekle(BEKLEME_MS);
      const tahminler = erTahminleriCikar(metin);
      if (!tahminler.length) throw new Error('tahmin çıkarılamadı');
      raporlar.push({ id: r.id, donem: r.donem, tarih: r.tarih, baslik: r.baslik, url: r.url, bolumUrl: bolum.pdfUrl, tahminler });
      yeni++;
      log(`+ ${r.donem} ${r.tarih}: ${tahminler.map((t) => `${t.yil}=${t.nokta ?? '–'}${t.alt != null ? ` [${t.alt}–${t.ust}]` : ''}${t.araHedef != null ? ` ara ${t.araHedef}` : ''}`).join('; ')}`);
    } catch (e) {
      basarisiz.push({ id: r.id, donem: r.donem, tarih: r.tarih, url: r.url, neden: e.message });
      log(`! ${r.id} alınamadı: ${e.message}`);
      await bekle(BEKLEME_MS);
    }
  }
  raporlar.sort((a, b) => a.tarih.localeCompare(b.tarih));
  if (!raporlar.length) throw new Error('Hiçbir rapordan tahmin çıkarılamadı; var olan dosya korunuyor');
  return {
    sonuc: { surum: AYRISTIRMA_SURUMU, alinma: yeni || !veri.alinma ? simdi.toISOString() : veri.alinma, kaynak: KAYNAK, raporlar, basarisiz },
    yeniSayi: yeni,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const yaz = process.argv.includes('--yaz');
  try {
    const { sonuc, yeniSayi } = await erTahminleriUret();
    console.log(`${sonuc.raporlar.length} rapor, ${yeniSayi} yeni, ${sonuc.basarisiz.length} başarısız.`);
    if (yaz) {
      await writeFile(HEDEF, JSON.stringify(sonuc, null, 1) + '\n', 'utf-8');
      console.log(`Yazıldı: ${HEDEF}`);
    } else console.log('Kuru çalıştırma (yazmak için --yaz).');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
