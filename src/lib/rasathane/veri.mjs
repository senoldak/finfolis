import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOLUMLER } from './bolumler.mjs';

export { BOLUMLER };

const ESKI_GUN = 4;
const ZORUNLU = ['bolum', 'sayfa', 'baslik', 'guncellendi', 'kaynaklar', 'sutunlar', 'satirlar'];

export function veriDurumu(kok) {
  try {
    const d = JSON.parse(readFileSync(join(kok, '_durum.json'), 'utf8'));
    return d?.durum === 'tamam' ? 'tamam' : 'alinamadi';
  } catch {
    return 'alinamadi';
  }
}

function sayfaOku(yol) {
  try {
    const veri = JSON.parse(readFileSync(yol, 'utf8'));
    if (veri?.sema !== 1) throw new Error('sema 1 degil');
    const eksik = ZORUNLU.find((k) => veri[k] === undefined || veri[k] === null);
    if (eksik) throw new Error(`${eksik} eksik`);
    if (Number.isNaN(new Date(veri.guncellendi).getTime())) throw new Error('guncellendi gecersiz');
    return veri;
  } catch (e) {
    console.warn(`rasathane: ${yol} atlandi (${e.message})`);
    return null;
  }
}

export function sayfalariOku(kok, simdi = new Date()) {
  if (!existsSync(kok)) return [];
  const sonuc = [];
  for (const b of readdirSync(kok, { withFileTypes: true })) {
    if (!b.isDirectory()) continue;
    for (const f of readdirSync(join(kok, b.name), { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith('.json')) continue;
      const veri = sayfaOku(join(kok, b.name, f.name));
      if (!veri) continue;
      const yas = simdi.getTime() - new Date(veri.guncellendi).getTime();
      sonuc.push({ bolum: b.name, sayfa: f.name.slice(0, -5), veri, eski: yas > ESKI_GUN * 86400000 });
    }
  }
  return sonuc;
}
