// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { indekslenir } from './src/lib/uzunluk.mjs';
import { satteri } from '@astrojs/markdown-satteri';
import sozlukBagla from './src/lib/sozluk-bagla.mjs';

// Site haritasındaki <lastmod> için yazı tarihleri: haber adresi → tarih, kategori → en yeni tarih.
// Ön bilgi doğrudan dosyadan okunur (yapılandırma, içerik koleksiyonuna erişemez). Taslaklar atlanır.
function tarihler() {
  const kok = './src/content/haberler';
  const haber = new Map();
  const kategori = new Map();
  const kisa = new Set();
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
    // Kısa yazı (noindex) haritaya girmez; kural haber sayfasıyla ortak (src/lib/uzunluk.mjs).
    // Haberin lastmod'u: elle güncellendiyse (updated) o tarih, yoksa yayın tarihi.
    const g = new Date(alan('updated') ?? '');
    if (indekslenir(md)) haber.set(ad, Number.isNaN(g.valueOf()) || g < d ? d : g);
    else kisa.add(ad);
    const k = alan('category');
    if (k && alan('tur') !== 'bulten' && (!kategori.get(k) || kategori.get(k) < d)) kategori.set(k, d);
    if (!enYeni || enYeni < d) enYeni = d;
  }
  return { haber, kategori, enYeni, kisa };
}

const T = tarihler();

// Veri sayfalarının (/veri/…) lastmod'u: resmi verinin siteye alındığı zaman (src/data/resmi.json).
// Bölümü hiç alınamamış sayfa noindex olur ve haritaya girmez.
function veriTarihleri() {
  let r = {};
  try {
    r = JSON.parse(readFileSync('./src/data/resmi.json', 'utf8'));
  } catch {}
  const t = (b) => (b?.alinma ? new Date(b.alinma) : undefined);
  const harita = new Map([
    ['/veri/dolar-kuru/', t(r.kur)],
    ['/veri/euro-kuru/', t(r.kur)],
    ['/veri/sterlin-kuru/', t(r.kur)],
    ['/veri/doviz-kurlari/', t(r.kur)],
    ['/veri/politika-faizi/', t(r.faiz)],
    ['/veri/enflasyon/', t(r.enflasyon)],
  ]);
  const hepsi = [...harita.values()].filter(Boolean);
  harita.set('/veri/', hepsi.length ? new Date(Math.max(...hepsi.map(Number))) : undefined);
  return harita;
}

const V = veriTarihleri();

// https://astro.build/config
export default defineConfig({
  site: 'https://finfolis.com',
  integrations: [
    sitemap({
      // 404, yönetim paneli ve henüz yazısı olmayan (noindex) kategori sayfaları haritaya girmez.
      // Kategorinin 2. ve sonraki sayfaları (/kategori/<x>/2/) olağan sayfa olarak girer.
      filter: (page) => {
        const yol = new URL(page).pathname;
        if (/\/(404|admin)(\/|$)/.test(yol)) return false;
        // Haftalık bülten verisi (JSON) bir sayfa değildir.
        if (yol.endsWith('.json')) return false;
        if (V.has(yol) && !V.get(yol)) return false;
        const h = yol.match(/^\/haber\/([^/]+)\/$/);
        if (h && T.kisa.has(decodeURIComponent(h[1]))) return false;
        const k = yol.match(/^\/kategori\/([^/]+)\/$/);
        return !k || T.kategori.has(k[1]);
      },
      serialize(item) {
        const yol = new URL(item.url).pathname;
        const h = yol.match(/^\/haber\/([^/]+)\/$/);
        const k = yol.match(/^\/kategori\/([^/]+)\/$/);
        const d = h
          ? T.haber.get(decodeURIComponent(h[1]))
          : k
            ? T.kategori.get(k[1])
            : yol === '/'
              ? T.enYeni
              : V.get(yol);
        if (d) item.lastmod = d.toISOString();
        return item;
      },
    }),
  ],
  // Haber gövdesinde ilk geçen finans terimleri /sozluk/ sayfalarına bağlanır (src/lib/sozluk-bagla.mjs).
  markdown: { processor: satteri({ hastPlugins: [sozlukBagla] }) },
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
  // Aynı nedenle betikler de satır içine gömülmez (küçük betikler varsayılan olarak gömülür ve CSP'ye takılır).
  vite: { build: { assetsInlineLimit: 0 } },
});
