import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kapakCiz, haberKapagi, bultenKapagi } from './kapak.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const HABERLER_DIR = path.resolve(HER, '../../src/content/haberler');

function frontmatterParse(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split('\n');
  const data = {};
  let currentKey = null;
  let currentList = null;
  let currentObj = null;

  for (let line of lines) {
    line = line.trimEnd();
    if (!line) continue;

    // List item with indent
    if (line.startsWith('  - ')) {
      const rest = line.slice(4).trim();
      const [k, ...v] = rest.split(':');
      currentObj = { [k.trim()]: v.join(':').trim().replace(/^["']|["']$/g, '') };
      if (currentList) currentList.push(currentObj);
      continue;
    }
    if (line.startsWith('    ') && currentObj) {
      const rest = line.trim();
      const [k, ...v] = rest.split(':');
      currentObj[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !line.startsWith(' ')) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (val === '') {
        currentList = [];
        data[key] = currentList;
      } else {
        data[key] = val;
        currentList = null;
      }
      currentKey = key;
    }
  }
  return data;
}

// Kapağın hangi türden çizildiği frontmatter'dan kesin bilinemez; yalnız kesin tanınanlar yeniden çizilir:
//  - bülten: tur: bulten (başlıklar gövdedeki ilk 3 madde etiketidir)
//  - haber: coverAlt "Bölge · başlık" ya da "etiket rakam" biçimindedir (hent-haberler.mjs haberKapagi'ni böyle yazar)
// Rakam, kaynak, gösterge, grafik ve karne kapakları verisini frontmatter'da taşımaz; olduğu gibi bırakılır.
const BOLGE_AD = ['Küresel', 'ABD', 'Avrupa', 'Asya', 'Türkiye'];
const norm = (x) => String(x ?? '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
const rakamMetni = (r) => (r && r.deger ? String(r.deger).replace(/^yüzde\s+/i, '%').trim() : null);

export function kapakTuru(fm, govde = '') {
  if (fm.tur === 'bulten') return 'bulten';
  const alt = norm(fm.coverAlt);
  const bas = norm(fm.title);
  if (!alt) return null;
  if (BOLGE_AD.some((b) => alt === `${norm(b)} · ${bas}`)) return 'haber';
  const r = Array.isArray(fm.rakamlar) ? fm.rakamlar[0] : null;
  if (r && rakamMetni(r) && alt === norm(`${r.etiket} ${rakamMetni(r)}`)) return 'haber';
  return null;
}

export function bultenBasliklari(govde) {
  return [...govde.matchAll(/^- \*\*(.+?):\*\*/gm)].map((m) => m[1]).slice(0, 3);
}

// klasorler: yalnız bu haber klasörleri; cikti: verilirse kapak.png yerine <cikti>/<klasor>.png yazılır (içerik değişmez).
export async function yenile(klasorler = null, { cikti = null } = {}) {
  const entries = await readdir(HABERLER_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && (!klasorler || klasorler.includes(e.name)));
  if (cikti) await mkdir(cikti, { recursive: true });

  let basarili = 0;
  let atlanan = 0;
  for (const dir of dirs) {
    let md;
    try {
      md = await readFile(path.join(HABERLER_DIR, dir.name, 'index.md'), 'utf8');
    } catch {
      continue;
    }
    const fm = frontmatterParse(md);
    if (!fm || !fm.title || !fm.cover) continue;
    const govde = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
    const tur = kapakTuru(fm);
    let kapakFn;
    if (tur === 'bulten') {
      const saatM = fm.title.match(/(\d{1,2}:\d{2})/);
      const gunM = fm.title.match(/·\s*(\d{1,2}\s+\p{L}+)/u);
      kapakFn = bultenKapagi({
        saat: saatM ? saatM[1] : undefined,
        tarih: gunM ? gunM[1] : new Date(fm.date || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
        basliklar: bultenBasliklari(govde),
      });
    } else if (tur === 'haber') {
      kapakFn = haberKapagi({ kategori: fm.category || 'ekonomi', baslik: fm.title });
    } else {
      atlanan++;
      continue;
    }
    try {
      const png = await kapakCiz(kapakFn);
      await writeFile(cikti ? path.join(cikti, `${dir.name}.png`) : path.join(HABERLER_DIR, dir.name, 'kapak.png'), png);
      basarili++;
    } catch (err) {
      console.error(`Hata: ${dir.name}: ${err.message}`);
    }
  }
  console.log(`${basarili} kapak yeniden çizildi${cikti ? ` (${cikti})` : ''}, ${atlanan} kapak türü tanınmadığı için olduğu gibi bırakıldı.`);
}

// Komut satırı: node scripts/kapak/yenile.mjs [--cikti=klasor] [haber-klasoru ...]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const c = args.find((x) => x.startsWith('--cikti='));
  const dirs = args.filter((x) => !x.startsWith('--'));
  yenile(dirs.length ? dirs : null, { cikti: c ? path.resolve(c.slice(8)) : null }).catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
