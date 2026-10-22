// Kaynak: mecmua/site-ortak/planli/scripts/planlagt.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Planlı yazılar: tarihi son 3 günde gelmiş ama canlı sitede henüz olmayan (404) yazı var mı?
// Varsa GITHUB_OUTPUT'a "yayin=1" yazar; bot iş akışı bunu görünce yayinla.yml'yi başlatır, derlemede yazı görünür.
// Tarih kuralı tek yerde: src/lib/yayinda.mjs (news.ts ve site haritası ile ortak).
// Kullanım: node scripts/planlagt.mjs   (site adresi scripts/site-ortak.json'dan; SITE ortam değişkeni onu geçersiz kılar)
import { readdir, readFile, appendFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onyuzMaddesiYayinda, onyuzMaddesiTarihi } from '../src/lib/yayinda.mjs';

const GUN_MS = 86400e3;
const DIZIN = fileURLToPath(new URL('../src/content/haberler/', import.meta.url));

/** Yayında olan ve tarihi (simdi − pencereGun gün, simdi] aralığına düşen yazıların kimlikleri (tekrarsız). */
export function vadesiGelenler({ yazilar, simdi = Date.now(), pencereGun = 3 }) {
  const sonuc = [];
  for (const { kimlik, metin } of yazilar) {
    if (!onyuzMaddesiYayinda(metin, simdi)) continue;
    if (!(onyuzMaddesiTarihi(metin) > simdi - pencereGun * GUN_MS)) continue;
    if (!sonuc.includes(kimlik)) sonuc.push(kimlik);
  }
  return sonuc;
}

/** Adreslerinden biri 404 dönen yazıların kimlikleri. Yalnız 404 eksik sayılır; ağ hatası iş akışını düşürür. */
export async function eksikOlanlar({ kimlikler, adres, getir }) {
  const eksik = [];
  for (const kimlik of kimlikler) {
    for (const url of adres(kimlik)) {
      if ((await getir(url)).status === 404) {
        eksik.push(kimlik);
        break;
      }
    }
  }
  return eksik;
}

/** Haber sayfasının adresi: /haber/<kimlik>/; kimlik astro.config.mjs'teki gibi küçük harfe çevrilir. */
export const haberAdresi = (site, kimlik) => `${site}/haber/${kimlik.toLowerCase()}/`;

// Kimlik Astro'nun glob yükleyicisi ve astro.config.mjs ile aynı: klasör/dosya adı, sondaki "index" atılır.
export async function yazilariOku(dizin = DIZIN) {
  const yazilar = [];
  for (const dosya of await readdir(dizin, { recursive: true, encoding: 'utf8' })) {
    if (!dosya.endsWith('.md')) continue;
    const parca = dosya.replace(/\\/g, '/').replace(/\.md$/, '').split('/');
    if (parca[parca.length - 1] === 'index') parca.pop();
    yazilar.push({ kimlik: parca.join('/'), metin: await readFile(path.join(dizin, dosya), 'utf8') });
  }
  return yazilar;
}

/** Denetlenecek site: SITE ortam değişkeni, yoksa scripts/site-ortak.json'daki site. İkisi de yoksa hata (yanlış siteye bakılmaz). */
export function siteAdresi(ortam, ayar) {
  const site = ortam.SITE || ayar?.site;
  if (!site) throw new Error('Site adresi yok: scripts/site-ortak.json okunamadı ve SITE ortam değişkeni boş.');
  return site.replace(/\/+$/, '');
}

function ayarOku() {
  try {
    return JSON.parse(readFileSync(new URL('./site-ortak.json', import.meta.url), 'utf8'));
  } catch {
    return null;
  }
}

async function ana() {
  const site = siteAdresi(process.env, ayarOku());
  const kimlikler = vadesiGelenler({ yazilar: await yazilariOku(), simdi: Date.now() });
  const eksik = await eksikOlanlar({
    kimlikler,
    adres: (kimlik) => [haberAdresi(site, kimlik)],
    getir: (url) => fetch(url, { method: 'HEAD', headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15000) }),
  });
  console.log(
    eksik.length
      ? `Vadesi gelip yayında olmayan planlı yazı: ${eksik.join(', ')}`
      : `Bekleyen planlı yazı yok (son 3 günde vadesi gelen: ${kimlikler.length}).`,
  );
  if (eksik.length && process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'yayin=1\n');
}

// Testler modülü içe aktarır; ana iş yalnız doğrudan çalıştırılınca yapılır.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await ana();
