// TCMB Başkan konuşma/sunumları, Enflasyon Raporu ve Finansal İstikrar Raporu "Genel Değerlendirme" metinlerini toplar,
// src/data/tcmb-metinler.json dosyasına yazar. Yalnız tcmb.gov.tr. Yapay zekâ yok.
// Artımlıdır: dosyada var olan (ya da atlanan) belge yeniden indirilmez. Kaynak düşerse var olan dosya bozulmaz.
// PDF metni için sistemdeki `pdftotext` (xpdf/poppler) çağrılır; npm bağımlılığı yoktur.
//
// Kullanım: node scripts/veri/tcmb-metinler.mjs [--yaz]
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep, USER_AGENT } from '../haberler/lib.mjs';
import { cumleBol } from '../../src/lib/ppk-metin.mjs';
import {
  KONUSMA_TABAN, RAPOR_TABAN, konusmaListesi, konusmaAyristir, konusmaci, raporListesi, raporSayfasi,
  genelDegerlendirmeBolumu, raporParagraflari, sunumParagraflari, pdfKonusmaParagraflari, turkceMi,
} from '../../src/lib/tcmb-metin.mjs';

const calistir = promisify(execFile);
const HEDEF = fileURLToPath(new URL('../../src/data/tcmb-metinler.json', import.meta.url));
const ILK_YIL = 2023;
const ILK_TARIH = '2023-06-01'; // Haziran 2023'ten önceki belgeler kapsam dışı
const BEKLEME_MS = 1000;
const KAYNAK = { ad: 'TCMB Başkanın Konuşmaları, Enflasyon Raporu, Finansal İstikrar Raporu', url: 'https://www.tcmb.gov.tr' };

async function mevcutOku() {
  try {
    const j = JSON.parse(await readFile(HEDEF, 'utf-8'));
    if (Array.isArray(j.belgeler)) return j;
  } catch {}
  return { alinma: null, kaynak: KAYNAK, atlanan: [], belgeler: [] };
}

async function pdfIndir(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`PDF değil: ${url}`);
  return buf;
}

// PDF → düz metin (sayfalar \f ile ayrılır). pdftotext yoksa hata fırlatır (belge atlanmış sayılmaz, bir sonraki çalıştırmada denenir).
async function pdfMetne(buf) {
  const dizin = await mkdtemp(path.join(tmpdir(), 'tcmb-pdf-'));
  try {
    const dosya = path.join(dizin, 'belge.pdf');
    await writeFile(dosya, buf);
    const { stdout } = await calistir('pdftotext', ['-enc', 'UTF-8', dosya, '-'], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
    return stdout;
  } finally {
    await rm(dizin, { recursive: true, force: true });
  }
}

const cumleler = (paragraflar) => paragraflar.flatMap(cumleBol);

export async function tcmbMetinleriUret({ simdi = new Date(), indir = hentMetin, pdfAl = pdfIndir, pdfCevir = pdfMetne, bekle = sleep, log = console.log } = {}) {
  const veri = await mevcutOku();
  const var_ = new Set(veri.belgeler.map((b) => b.id));
  const atlananlar = new Map((veri.atlanan ?? []).map((a) => [a.id, a.neden]));
  const yeni = [];
  let listeBasari = 0;
  let hata = 0;
  const atla = (id, neden) => {
    atlananlar.set(id, neden);
    log(`- ${id} atlandı: ${neden}`);
  };
  const gorulmus = (id) => var_.has(id) || atlananlar.has(id);

  // 1) Başkan konuşma ve sunumları
  for (let yil = ILK_YIL; yil <= simdi.getUTCFullYear(); yil++) {
    let liste;
    try {
      liste = konusmaListesi(await indir(`${KONUSMA_TABAN}/${yil}`), yil);
      listeBasari++;
    } catch (e) {
      hata++;
      log(`Konuşma listesi alınamadı (${yil}): ${e.message}`);
      await bekle(BEKLEME_MS);
      continue;
    }
    await bekle(BEKLEME_MS);
    for (const k of liste) {
      if (k.tarih < ILK_TARIH || gorulmus(k.id)) continue;
      if (k.dil === 'en') {
        atla(k.id, 'ingilizce');
        continue;
      }
      try {
        let paragraflar = null;
        let bicim = 'html';
        let slaytSayisi;
        if (k.htmlUrl) {
          try {
            paragraflar = konusmaAyristir(await indir(k.htmlUrl));
          } catch (e) {
            if (!k.pdfUrl) throw e;
            log(`HTML ayrıştırılamadı (${k.id}): ${e.message}; PDF denenecek`);
          }
          await bekle(BEKLEME_MS);
        }
        if (!paragraflar) {
          bicim = 'pdf';
          const metin = await pdfCevir(await pdfAl(k.pdfUrl));
          if (k.altTur === 'sunum') ({ paragraflar, slaytSayisi } = sunumParagraflari(metin));
          else paragraflar = pdfKonusmaParagraflari(metin);
          await bekle(BEKLEME_MS);
          if (paragraflar.join(' ').length < 200) {
            atla(k.id, 'pdf_metin_cikarilamadi');
            continue;
          }
        }
        if (!turkceMi(paragraflar.join(' '))) {
          atla(k.id, 'ingilizce_metin');
          continue;
        }
        const kisi = konusmaci(k.baslik);
        const belge = {
          id: k.id,
          tur: 'konusma',
          altTur: k.altTur,
          ...(k.erBilgilendirme ? { erBilgilendirme: true } : {}),
          tarih: k.tarih,
          baslik: k.baslik,
          ...(kisi ? { konusmaci: kisi } : {}),
          url: bicim === 'html' ? k.htmlUrl : k.pdfUrl,
          kaynakBicim: bicim,
          ...(slaytSayisi ? { slaytSayisi } : {}),
          paragraflar,
          cumleler: cumleler(paragraflar),
        };
        yeni.push(belge);
        log(`+ ${k.id} ${k.tarih} (${bicim}) ${k.baslik.slice(0, 70)}`);
      } catch (e) {
        hata++;
        log(`Belge alınamadı (${k.id}): ${e.message}`);
        await bekle(BEKLEME_MS);
      }
    }
  }

  // 2) Enflasyon Raporu ve Finansal İstikrar Raporu: yalnız "Genel Değerlendirme" bölümü
  for (const [tur, yol] of [['er', 'Enflasyon+Raporu'], ['fir', 'Finansal+Istikrar+Raporu']]) {
    let liste;
    try {
      liste = raporListesi(await indir(`${RAPOR_TABAN}/${yol}`), tur);
      if (!liste.length) throw new Error('rapor bulunamadı');
      listeBasari++;
    } catch (e) {
      hata++;
      log(`Rapor listesi alınamadı (${tur}): ${e.message}`);
      await bekle(BEKLEME_MS);
      continue;
    }
    await bekle(BEKLEME_MS);
    for (const r of liste) {
      if (r.tarih < ILK_TARIH || gorulmus(r.id)) continue;
      try {
        const sayfa = raporSayfasi(await indir(r.url));
        await bekle(BEKLEME_MS);
        const bolum = genelDegerlendirmeBolumu(sayfa.bolumler);
        if (!bolum) throw new Error('Genel Değerlendirme bölümü bulunamadı');
        const paragraflar = raporParagraflari(await pdfCevir(await pdfAl(bolum.pdfUrl)));
        await bekle(BEKLEME_MS);
        if (paragraflar.length < 3) throw new Error(`metin çıkarılamadı (${paragraflar.length} paragraf)`);
        const belge = {
          id: r.id,
          tur: r.tur,
          ...(r.donem ? { donem: r.donem } : {}),
          ...(r.sayi ? { sayi: r.sayi } : {}),
          tarih: r.tarih,
          ...(r.tarihKesinligi ? { tarihKesinligi: r.tarihKesinligi } : {}),
          baslik: r.baslik,
          bolum: bolum.ad,
          url: r.url,
          pdfUrl: bolum.pdfUrl,
          kaynakBicim: 'pdf',
          paragraflar,
          cumleler: cumleler(paragraflar),
        };
        yeni.push(belge);
        log(`+ ${r.id} ${r.tarih} ${r.baslik}`);
      } catch (e) {
        hata++;
        log(`Rapor alınamadı (${r.id}): ${e.message}`);
        await bekle(BEKLEME_MS);
      }
    }
  }

  if (listeBasari === 0) throw new Error('Hiçbir liste alınamadı; var olan dosya korunuyor');
  const belgeler = [...veri.belgeler, ...yeni].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.id.localeCompare(b.id, 'en', { numeric: true }));
  const atlanan = [...atlananlar].map(([id, neden]) => ({ id, neden })).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  return {
    sonuc: { alinma: yeni.length || !veri.alinma ? simdi.toISOString() : veri.alinma, kaynak: KAYNAK, atlanan, belgeler },
    yeniSayi: yeni.length,
    hata,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yaz = process.argv.includes('--yaz');
  const { sonuc, yeniSayi, hata } = await tcmbMetinleriUret();
  for (const tur of ['konusma', 'rapor_er', 'rapor_fir']) {
    const l = sonuc.belgeler.filter((b) => b.tur === tur);
    console.log(`${tur}: ${l.length} (${l[0]?.tarih}..${l.at(-1)?.tarih})`);
  }
  console.log(`atlanan ${sonuc.atlanan.length}; yeni ${yeniSayi}, hata ${hata}`);
  for (const b of sonuc.belgeler) {
    const n = b.paragraflar.join('\n').length;
    if (n > 40000) console.log(`UYARI: ${b.id} ${n} karakter (40.000 üstü)`);
  }
  if (yaz) {
    const yeniMetin = JSON.stringify(sonuc, null, 1) + '\n';
    const eskiMetin = await readFile(HEDEF, 'utf-8').catch(() => null);
    // Yalnız içerik değiştiyse yazılır (alinma zaman damgası tek başına dosyayı değiştirmesin).
    const govde = (m) => m && m.replace(/"alinma": "[^"]*"/, '');
    if (govde(yeniMetin) !== govde(eskiMetin)) {
      await writeFile(HEDEF, yeniMetin, 'utf-8');
      console.log('Yazıldı: src/data/tcmb-metinler.json');
    } else console.log('Yeni belge yok; dosya değişmedi.');
  }
  if (hata > 0) process.exitCode = 1;
}
