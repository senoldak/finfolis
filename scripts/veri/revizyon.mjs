// Veri revizyonu izleme: çalışma ağacındaki src/data/resmi.json'u bir git sürümüyle (varsayılan HEAD) karşılaştırır,
// aynı dönemin değişen rakamlarını src/data/revizyonlar.json'a yazar (--yaz).
//   node scripts/veri/revizyon.mjs [--yaz] [--once <commit>]
// Bot turunda resmi-veri.mjs'ten sonra, commit'ten önce çalışır (HEAD önceki turun rakamlarını taşır).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { revizyonlariBul, birlestir, alanAdi, donemMetni, degerMetni } from '../../src/lib/revizyon.mjs';

const KOK = fileURLToPath(new URL('../../', import.meta.url));
const RESMI = `${KOK}src/data/resmi.json`;
const CIKTI = `${KOK}src/data/revizyonlar.json`;

export function surumOku(commit) {
  const metin = execFileSync('git', ['show', `${commit}:src/data/resmi.json`], { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(metin);
}

export function calistir({ yaz = false, once = 'HEAD', simdi = new Date(), eskiResmi, yeniResmi, cikti = CIKTI, log = console.log } = {}) {
  const yeni = yeniResmi ?? JSON.parse(readFileSync(RESMI, 'utf8'));
  const eski = eskiResmi ?? surumOku(once);
  const { revizyonlar, toplu } = revizyonlariBul(eski, yeni, { tespit: simdi.toISOString() });
  const mevcut = existsSync(cikti) ? JSON.parse(readFileSync(cikti, 'utf8')).revizyonlar ?? [] : [];
  const { liste, eklenen } = birlestir(mevcut, revizyonlar);
  for (const r of revizyonlar) {
    log(`  ${r.bolum}.${r.alan} ${donemMetni(r.donem)}: ${degerMetni(r.bolum, r.alan, r.eski)} -> ${degerMetni(r.bolum, r.alan, r.yeni)} (${alanAdi(r.bolum, r.alan)})`);
  }
  for (const t of toplu) log(`  toplu (kayda girmedi): ${t.bolum}.${t.alan}, ${t.adet} dönem değişti; seri yeniden hesaplanmış olabilir`);
  log(`${revizyonlar.length} revizyon bulundu, ${eklenen.length} yeni kayıt${yaz ? '' : ' (yazılmadı; --yaz ile yazılır)'}.`);
  // Dosya yoksa boş haliyle de oluşur: sayfa ve haber kaynağı hep okuyabilsin.
  if (yaz && (eklenen.length || !existsSync(cikti))) writeFileSync(cikti, `${JSON.stringify({ revizyonlar: liste }, null, 2)}\n`);
  return { revizyonlar, toplu, eklenen };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--once');
  try {
    calistir({ yaz: a.includes('--yaz'), once: i >= 0 ? a[i + 1] : 'HEAD' });
  } catch (e) {
    console.error(`[revizyon] ${e.message}`);
    process.exitCode = 1;
  }
}
