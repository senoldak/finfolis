// Telegram Günün Özeti, 20:45 işi (mecmua-saat başlatır, .github/workflows/gunun-ozeti.yml): o günün (İstanbul)
// yayımlanmış haberlerinden Gemini ile tek paragraf yazar, kodla denetler (rakam/özel ad kaynakta mı, dil kapısı),
// geçmezse ilk üç başlıktan yedek paragraf kurar. src/data/gunun-ozeti/<tarih>.json ve Günün Özeti kapağını
// (public/gunun-ozeti/<tarih>.png) yazar; arşiv gün sayfası (/arsiv/<tarih>/) ikisini de gösterir. Telegram'a
// mecmua-saat kuyruğu gönderir.
// Kullanım: node scripts/haberler/gunun-ozeti-is.mjs            (yazar; GITHUB_OUTPUT'a yazildi=1|0, bildir=1|0)
//           node scripts/haberler/gunun-ozeti-is.mjs --bildir   (gün sayfasını kuyruğa bildirir)
import path from 'node:path';
import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { onyuzMaddesiYayinda } from '../../src/lib/yayinda.mjs';
import { gemini } from './lib.mjs';
import { dilSorunlariTr, kesinSorunlar } from './dil-tr.mjs';
import { acilDurdurma } from './standart-kapi.mjs';
import { kapakCiz, ozetKapagi } from '../kapak/kapak.mjs';
import {
  OZET_SEMASI, istanbulGunu, kapakSirasi, ozetBildir, ozetIstemi, paragrafDenetle, paragrafKisalt, trTarih, yedekParagraf,
} from './gunun-ozeti.mjs';

const SITE = 'finfolis';
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sayfaUrl = (tarih) => `https://finfolis.com/arsiv/${tarih}/`;
const varMi = (p) => access(p).then(() => true, () => false);
const gercekKapak = (g) => kapakCiz(ozetKapagi(g));

function onBilgi(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const d = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const i = satir.indexOf(':');
    if (i < 1 || /^\s/.test(satir)) continue;
    let v = satir.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    d[satir.slice(0, i).trim()] = v;
  }
  return d;
}

/** O günün (İstanbul) yayımlanmış haberleri (arşiv gün sayfasıyla aynı küme); bültenler hariç; yayın sırasıyla. */
export async function gunHaberleri({ simdi, kok = KOK }) {
  const gun = istanbulGunu(simdi);
  const dizin = path.join(kok, 'src/content/haberler');
  const liste = [];
  for (const k of await readdir(dizin, { withFileTypes: true })) {
    if (!k.isDirectory()) continue;
    const dosya = path.join(dizin, k.name, 'index.md');
    if (!(await varMi(dosya))) continue;
    const metin = await readFile(dosya, 'utf8');
    if (!onyuzMaddesiYayinda(metin, simdi.getTime())) continue;
    const d = onBilgi(metin);
    if (!d || d.tur === 'bulten') continue;
    const tarih = new Date(d.date);
    if (Number.isNaN(tarih.valueOf()) || tarih > simdi || istanbulGunu(tarih) !== gun) continue;
    liste.push({ id: k.name, baslik: d.title, ozet: d.description ?? '', tarih });
  }
  return liste.sort((a, b) => a.tarih - b.tarih);
}

/** Paragrafı ve kapağı yazar; haber yoksa ya da o günün dosyası zaten varsa null. */
export async function ozetYaz({ simdi = new Date(), kok = KOK, geminiFn = gemini, kapakFn = gercekKapak, log = console.log } = {}) {
  const tarih = istanbulGunu(simdi);
  const dosya = path.join(kok, 'src/data/gunun-ozeti', `${tarih}.json`);
  if (await varMi(dosya)) {
    log(`${tarih} özeti zaten var, yazılmadı.`);
    return null;
  }
  const haberler = await gunHaberleri({ simdi, kok });
  if (!haberler.length) {
    log(`${tarih}: yayımlanmış haber yok, özet yazılmadı.`);
    return null;
  }
  let sonuc = null;
  try {
    const { sistem, istem } = ozetIstemi({ site: SITE, haberler });
    const y = await geminiFn({ sistem, istem, sema: OZET_SEMASI });
    if (y?.paragraf) {
      const paragraf = paragrafKisalt(String(y.paragraf).replace(/\s+/g, ' ').trim());
      const denetim = paragrafDenetle({ paragraf, kimlikler: y.kimlikler, haberler });
      const dil = kesinSorunlar(dilSorunlariTr(paragraf));
      if (denetim.gecerli && !dil.length) sonuc = { paragraf, kimlikler: y.kimlikler, yazan: 'gemini' };
      else log(`Paragraf denetimden geçmedi, yedek kullanılıyor: ${[...denetim.sorunlar, ...dil.map((s) => s.kod)].join(', ')}`);
    } else log('Gemini paragraf vermedi, yedek kullanılıyor.');
  } catch (e) {
    log(`Gemini hatası, yedek kullanılıyor: ${e.message}`);
  }
  sonuc ??= { ...yedekParagraf(haberler), yazan: 'yedek' };

  // Kapak: paragrafta anlatılan haberler önce; tarih sağ altta ("13 Kasım 2026", kapakta büyük harfle).
  const png = await kapakFn({
    tarih: trTarih(tarih),
    basliklar: kapakSirasi(haberler, sonuc.kimlikler).map((h) => h.baslik),
    toplam: haberler.length,
  });
  const kapakDosyasi = path.join(kok, 'public/gunun-ozeti', `${tarih}.png`);
  await mkdir(path.dirname(kapakDosyasi), { recursive: true });
  await writeFile(kapakDosyasi, png);

  await mkdir(path.dirname(dosya), { recursive: true });
  const kayit = { tarih, paragraf: sonuc.paragraf, kimlikler: sonuc.kimlikler, yazan: sonuc.yazan, olusturma: simdi.toISOString() };
  await writeFile(dosya, `${JSON.stringify(kayit, null, 2)}\n`, 'utf8');
  log(`Yazıldı: ${path.relative(kok, dosya)} ve kapak (${haberler.length} haber, ${sonuc.yazan})`);
  return { tarih, yazan: sonuc.yazan };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env;
  if (process.argv.includes('--bildir')) {
    const simdi = new Date();
    const ok = await ozetBildir({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site: SITE, sayfaUrl: sayfaUrl(istanbulGunu(simdi)), simdi });
    console.log(ok ? 'Gün sayfası kuyruğa bildirildi.' : 'Bildirim yapılamadı (MOTOR_URL/MOTOR_ANAHTARI ya da ağ).');
    if (!ok) process.exitCode = 1;
  } else {
    const dur = await acilDurdurma({ env });
    const r = dur.durdu ? null : await ozetYaz();
    const bildir = !dur.durdu && (await varMi(path.join(KOK, 'src/data/gunun-ozeti', `${istanbulGunu(new Date())}.json`)));
    if (env.GITHUB_OUTPUT) await writeFile(env.GITHUB_OUTPUT, `yazildi=${r ? 1 : 0}\nbildir=${bildir ? 1 : 0}\n`, { flag: 'a' });
  }
}
