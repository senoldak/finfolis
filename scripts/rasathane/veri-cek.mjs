// Derlemeden önce Rasathane'nin site verisini (rasathane reposu, site-veri/) public/rasathane/veri/ altına çeker.
// Hata olursa derleme düşmez: _durum.json "alinamadi" yazılır, süreç 0 ile biter.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const GECERLI_YOL = /^[a-z0-9-]+\/(seri\/)?[A-Za-z0-9=._^-]+\.json$/;

export async function calistirGit(args) {
  await execFileAsync('git', args, { timeout: 120_000, windowsHide: true });
}

function dosyalariTopla(kok, ara = '') {
  const cikti = [];
  for (const girdi of readdirSync(path.join(kok, ara), { withFileTypes: true })) {
    const goreli = ara ? `${ara}/${girdi.name}` : girdi.name;
    if (girdi.isSymbolicLink()) continue;
    if (girdi.isDirectory()) cikti.push(...dosyalariTopla(kok, goreli));
    else if (girdi.isFile()) cikti.push(goreli);
  }
  return cikti;
}

function durumYaz(hedef, nesne) {
  mkdirSync(hedef, { recursive: true });
  writeFileSync(path.join(hedef, '_durum.json'), JSON.stringify(nesne));
}

function kopyala(kaynakKok, hedef) {
  const gecerli = dosyalariTopla(kaynakKok).filter((yol) => !yol.includes('..') && GECERLI_YOL.test(yol));
  rmSync(hedef, { recursive: true, force: true });
  mkdirSync(hedef, { recursive: true });
  for (const yol of gecerli) {
    const hedefYol = path.join(hedef, ...yol.split('/'));
    mkdirSync(path.dirname(hedefYol), { recursive: true });
    cpSync(path.join(kaynakKok, ...yol.split('/')), hedefYol);
  }
  durumYaz(hedef, { durum: 'tamam', cekildi: new Date().toISOString() });
  return gecerli.length;
}

export async function veriCek({
  hedef,
  depo = 'https://github.com/senoldak/rasathane.git',
  gecici = '.rasathane-veri',
  komut = calistirGit,
  deneme = 3,
  yerel = process.env.RASATHANE_VERI_DIZINI,
}) {
  try {
    if (yerel) {
      if (!existsSync(yerel) || !lstatSync(yerel).isDirectory()) throw new Error(`yerel klasör yok: ${yerel}`);
      return { durum: 'tamam', dosya: kopyala(yerel, hedef) };
    }
    let sonHata;
    for (let i = 1; i <= deneme; i++) {
      try {
        rmSync(gecici, { recursive: true, force: true });
        await komut(['clone', '--depth', '1', '--filter=blob:none', '--sparse', depo, gecici]);
        await komut(['-C', gecici, 'sparse-checkout', 'set', 'site-veri']);
        const kaynak = path.join(gecici, 'site-veri');
        if (!existsSync(kaynak)) throw new Error('site-veri klasörü yok');
        return { durum: 'tamam', dosya: kopyala(kaynak, hedef) };
      } catch (hata) {
        sonHata = hata;
        console.warn(`[rasathane] veri çekme ${i}/${deneme} düştü: ${hata?.message ?? hata}`);
      }
    }
    throw sonHata ?? new Error('veri çekilemedi');
  } catch (hata) {
    console.warn(`[rasathane] veri alınamadı, derleme sürüyor: ${hata?.message ?? hata}`);
    try {
      // Eski iyi veri silinmez: sayfalar "son iyi veri" ile kalır, durum yalnız işaretlenir.
      durumYaz(hedef, { durum: 'alinamadi' });
    } catch (yazmaHata) {
      console.warn(`[rasathane] _durum.json yazılamadı: ${yazmaHata?.message ?? yazmaHata}`);
    }
    return { durum: 'alinamadi', dosya: 0 };
  } finally {
    if (!yerel) {
      try {
        rmSync(gecici, { recursive: true, force: true });
      } catch {}
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const yerelFallback = process.env.RASATHANE_VERI_DIZINI || (existsSync(path.resolve('../../para/rasathane/site-veri')) ? path.resolve('../../para/rasathane/site-veri') : undefined);
  const sonuc = await veriCek({ hedef: 'public/rasathane/veri', yerel: yerelFallback });
  console.log(`[rasathane] veri: ${sonuc.durum}, ${sonuc.dosya} dosya`);
  process.exit(0);
}
