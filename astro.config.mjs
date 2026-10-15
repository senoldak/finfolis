// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// Site haritasındaki <lastmod> için yazı tarihleri: haber adresi → tarih, kategori → en yeni tarih.
// Ön bilgi doğrudan dosyadan okunur (yapılandırma, içerik koleksiyonuna erişemez). Taslaklar atlanır.
function tarihler() {
  const kok = './src/content/haberler';
  const haber = new Map();
  const kategori = new Map();
  let enYeni;
  for (const ad of readdirSync(kok)) {
    let md;
    try {
      md = readFileSync(`${kok}/${ad}/index.md`, 'utf8');
    } catch {
      continue;
    }
    const on = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const alan = (k) => on.match(new RegExp(`^${k}:\\s*"?([^"\\r\\n]*)"?`, 'm'))?.[1]?.trim();
    if (alan('draft') === 'true') continue;
    const d = new Date(alan('date') ?? '');
    if (Number.isNaN(d.valueOf())) continue;
    haber.set(ad, d);
    const k = alan('category');
    if (k && alan('tur') !== 'bulten' && (!kategori.get(k) || kategori.get(k) < d)) kategori.set(k, d);
    if (!enYeni || enYeni < d) enYeni = d;
  }
  return { haber, kategori, enYeni };
}

const T = tarihler();

// https://astro.build/config
export default defineConfig({
  site: 'https://finfolis.com',
  integrations: [
    sitemap({
      // 404, yönetim paneli ve henüz yazısı olmayan (noindex) kategori sayfaları haritaya girmez.
      filter: (page) => {
        const yol = new URL(page).pathname;
        if (/\/(404|admin)(\/|$)/.test(yol)) return false;
        const k = yol.match(/^\/kategori\/([^/]+)\/$/);
        return !k || T.kategori.has(k[1]);
      },
      serialize(item) {
        const yol = new URL(item.url).pathname;
        const h = yol.match(/^\/haber\/([^/]+)\/$/);
        const k = yol.match(/^\/kategori\/([^/]+)\/$/);
        const d = h ? T.haber.get(decodeURIComponent(h[1])) : k ? T.kategori.get(k[1]) : yol === '/' ? T.enYeni : undefined;
        if (d) item.lastmod = d.toISOString();
        return item;
      },
    }),
  ],
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
});
