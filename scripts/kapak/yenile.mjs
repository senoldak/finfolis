import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kapakCiz, haberKapagi, bultenKapagi, rakamKapagi } from './kapak.mjs';

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

export async function yenile(klasorler = null) {
  const entries = await readdir(HABERLER_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && (!klasorler || klasorler.includes(e.name)));

  let basarili = 0;
  for (const dir of dirs) {
    const mdPath = path.join(HABERLER_DIR, dir.name, 'index.md');
    let md;
    try {
      md = await readFile(mdPath, 'utf8');
    } catch {
      continue;
    }

    const fm = frontmatterParse(md);
    if (!fm || !fm.title || !fm.cover) continue;

    const kategori = fm.category || 'ekonomi';
    const baslik = fm.title;
    const spot = fm.description;
    const rakamlar = Array.isArray(fm.rakamlar) ? fm.rakamlar : [];
    const r = rakamlar[0];
    const rakam = r && r.deger ? { etiket: r.etiket || 'GÖSTERGE', deger: String(r.deger).replace(/^yüzde\s+/i, '%').trim() } : undefined;

    // Bülten haberi ise
    let kapakFn;
    if (fm.tur === 'bulten' || baslik.includes('bülteni')) {
      const saatM = baslik.match(/(\d{1,2}:\d{2})/);
      const saat = saatM ? saatM[1] : 'Piyasa';
      kapakFn = bultenKapagi({
        saat,
        tarih: new Date(fm.date || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
        basliklar: [spot],
      });
    } else {
      kapakFn = haberKapagi({
        kategori,
        baslik,
        spot,
        rakam,
      });
    }

    try {
      const png = await kapakCiz(kapakFn);
      const outPath = path.join(HABERLER_DIR, dir.name, 'kapak.png');
      await writeFile(outPath, png);
      basarili++;
    } catch (err) {
      console.error(`Hata: ${dir.name}: ${err.message}`);
    }
  }

  console.log(`${basarili} haber kapağı başarıyla yeniden çizildi.`);
}

// Komut satırından çalıştırılırsa
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argDirs = process.argv.slice(2);
  yenile(argDirs.length ? argDirs : null).catch(console.error);
}
