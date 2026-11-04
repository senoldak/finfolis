// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aramayaAcik } from './src/lib/arama-gorunurluk.mjs';
import { indekslenir } from './src/lib/uzunluk.mjs';
import { ARSIV_ESIGI } from './src/lib/arsiv.mjs';
import { istanbulGunu } from './src/lib/seffaflik.mjs';
import { onyuzMaddesiYayinda } from './src/lib/yayinda.mjs';
import { satteri } from '@astrojs/markdown-satteri';
import sozlukBagla from './src/lib/sozluk-bagla.mjs';
import { satteriGraf } from './src/lib/graf/yazi-grafik.mjs';
import { grafEtkilesimDenetle } from './src/lib/graf/etkilesim-denetim.mjs';

// Grafik kartı olan her sayfa etkileşim betiğini yüklemeli; eksikse grafik sessizce statik kalır, o yüzden derleme durur.
// ZamanGrafik gibi eski finfolis grafik bileşenleri bu denetime girmez (yalnız g-kort kartları).
const grafEtkilesim = () => ({
  name: 'graf-etkilesim',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const { sayfa, grafik, hatalar } = await grafEtkilesimDenetle(fileURLToPath(dir));
      if (hatalar.length) throw new Error(`Etkileşimsiz grafik (${hatalar.length}):\n${hatalar.slice(0, 20).join('\n')}`);
      logger.info(`${sayfa} sayfada ${grafik} grafik: hepsi etkileşimli.`);
    },
  },
});

// Site haritasındaki <lastmod> için yazı tarihleri: haber adresi → tarih, kategori → en yeni tarih.
// Ön bilgi doğrudan dosyadan okunur (yapılandırma, içerik koleksiyonuna erişemez). Taslaklar ve tarihi gelmemiş
// (planlanmış) yazılar atlanır; kural news.ts ile ortak (src/lib/yayinda.mjs).
function tarihler() {
  const kok = './src/content/haberler';
  const haber = new Map();
  const kategori = new Map();
  const kisa = new Set();
  const bulten = new Set();
  const ozel = new Set();
  // Arşiv günü → o gün yayımlanan haber (bülten hariç) sayısı ve en yeni tarih.
  const gun = new Map();
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
    if (alan('draft') === 'true' || !onyuzMaddesiYayinda(md)) continue;
    const d = new Date(alan('date') ?? '');
    if (Number.isNaN(d.valueOf())) continue;
    // Arama motorlarına kapalı yazı (kısa, akış çevirisi, bülten, kalıp piyasa yazısı) haritaya girmez; kural haber sayfasıyla ortak
    // (src/lib/arama-gorunurluk.mjs).
    // Haberin lastmod'u: elle güncellendiyse (updated) o tarih, yoksa yayın tarihi.
    const g = new Date(alan('updated') ?? '');
    // Kaynak adları: ön bilgide "- ad:" satırı yalnız kaynaklar listesinde var.
    const kaynaklar = [...on.matchAll(/^\s+- ad:\s*"?([^"\r\n]*)"?/gm)].map((m) => ({ ad: m[1].trim() }));
    const acik = aramayaAcik({ govde: md, tur: alan('tur'), icerikTuru: alan('icerikTuru'), author: alan('author'), uretim: alan('uretim'), kaynaklar });
    if (acik) haber.set(ad, Number.isNaN(g.valueOf()) || g < d ? d : g);
    else kisa.add(ad);
    // Site haritası parçası (bkz. chunks): bülten, yazı işleri/imzalı yazı, diğer haber.
    if (alan('tur') === 'bulten') bulten.add(ad);
    else if (alan('author') || ['yazi-isleri', 'editor'].includes(alan('uretim') ?? '')) ozel.add(ad);
    // Kategori sayfası yalnız kısa olmayan yazıları listeler (getNews indeksli); yalnız kısa yazısı olan
    // kategori sayfa tarafında boş ve noindex'tir, haritaya da girmemeli.
    const k = alan('category');
    const govde = md.slice(md.indexOf(on) + on.length).replace(/^\r?\n---/, '');
    if (k && alan('tur') !== 'bulten' && indekslenir(govde) && (!kategori.get(k) || kategori.get(k) < d)) kategori.set(k, d);
    if (!enYeni || enYeni < d) enYeni = d;
    if (alan('tur') !== 'bulten') {
      const g = gun.get(istanbulGunu(d)) ?? { sayi: 0, son: d };
      gun.set(istanbulGunu(d), { sayi: g.sayi + 1, son: g.son < d ? d : g.son });
    }
  }
  return { haber, kategori, enYeni, kisa, gun, bulten, ozel };
}

const T = tarihler();

// Haber adresinin kimliği (/haber/<id>/ → id) ya da undefined.
const haberId = (url) => {
  const h = new URL(url).pathname.match(/^\/haber\/([^/]+)\/$/);
  return h ? decodeURIComponent(h[1]) : undefined;
};

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
    ['/veri/konut-fiyat-endeksi/', t(r.konut)],
    ['/veri/issizlik-orani/', t(r.issizlik)],
    ['/veri/net-doviz-pozisyonu/', t(r.rezerv)],
  ]);
  const hepsi = [...harita.values()].filter(Boolean);
  harita.set('/veri/', hepsi.length ? new Date(Math.max(...hepsi.map(Number))) : undefined);
  return harita;
}

const V = veriTarihleri();

// https://astro.build/config
export default defineConfig({
  // Astro 7 varsayılanı "jsx": satır sonundaki boşluğu etiket kenarında siler (ör. "</a>" + yeni satır + "kelime" bitişik çıkar). true: tek boşluğa indirir.
  compressHTML: true,
  // Rasathane ana sayfası yok: giriş doğrudan emtia ekranına.
  redirects: {
    '/rasathane': '/rasathane/emtia/',
    '/rasathane/viop': '/rasathane/viop/vadeli/',
    '/rasathane/varant': '/rasathane/viop/varant/',
  },
  site: 'https://finfolis.com',
  integrations: [
    sitemap({
      // 404, yönetim paneli, arama sayfası ve henüz yazısı olmayan (noindex) kategori sayfaları haritaya girmez.
      // Kategorinin 2. ve sonraki sayfaları (/kategori/<x>/2/) olağan sayfa olarak girer.
      filter: (page) => {
        const yol = new URL(page).pathname;
        // Arama sayfası noindex'tir (sonuçlar tarayıcıda üretilir).
        if (/\/(404|arama)(\/|$)/.test(yol)) return false;
        // Hafta sayfaları gün sayfalarının toplamıdır (noindex).
        if (yol.startsWith('/arsiv/hafta/')) return false;
        // JSON çıktıları (ör. arama verisi) sayfa değildir.
        if (yol.endsWith('.json')) return false;
        if (V.has(yol) && !V.get(yol)) return false;
        const h = yol.match(/^\/haber\/([^/]+)\/$/);
        if (h && T.kisa.has(decodeURIComponent(h[1]))) return false;
        // Arşivde az haberli gün (noindex) haritaya girmez; kural src/pages/arsiv/[gun].astro ile ortak.
        const a = yol.match(/^\/arsiv\/(\d{4}-\d{2}-\d{2})\/$/);
        if (a && (T.gun.get(a[1])?.sayi ?? 0) < ARSIV_ESIGI) return false;
        const k = yol.match(/^\/kategori\/([^/]+)\/$/);
        return !k || T.kategori.has(k[1]);
      },
      serialize(item) {
        const yol = new URL(item.url).pathname;
        const h = yol.match(/^\/haber\/([^/]+)\/$/);
        const k = yol.match(/^\/kategori\/([^/]+)\/$/);
        const a = yol.match(/^\/arsiv\/(\d{4}-\d{2}-\d{2})\/$/);
        const d = a
          ? T.gun.get(a[1])?.son
          : h
          ? T.haber.get(decodeURIComponent(h[1]))
          : k
            ? T.kategori.get(k[1])
            : yol === '/'
              ? T.enYeni
              : V.get(yol);
        if (d) item.lastmod = d.toISOString();
        return item;
      },
      // Site haritası türe göre bölünür (sitemap-<tür>-0.xml; geri kalan sitemap-pages-0.xml). Search Console'da her
      // harita ayrı gönderilir; "Sayfa dizine ekleme" raporu böylece her türün dizin oranını ayrı gösterir.
      // Eklenti parçaları birbirinden ayırmaz, koşullar örtüşmemeli.
      chunks: {
        bulten: (item) => (T.bulten.has(haberId(item.url)) ? item : undefined),
        ozel: (item) => (T.ozel.has(haberId(item.url)) ? item : undefined),
        haber: (item) => {
          const id = haberId(item.url);
          return id && !T.bulten.has(id) && !T.ozel.has(id) ? item : undefined;
        },
        veri: (item) => (/^\/(veri|hesapla)\//.test(new URL(item.url).pathname) ? item : undefined),
        sozluk: (item) => (new URL(item.url).pathname.startsWith('/sozluk/') ? item : undefined),
      },
    }),
    grafEtkilesim(),
  ],
  // Haber gövdesinde ilk geçen finans terimleri /sozluk/ sayfalarına bağlanır (src/lib/sozluk-bagla.mjs); yanında graf-N.json
  // olan graf-N.svg resimleri etkileşimli karta döner (src/lib/graf/yazi-grafik.mjs).
  markdown: { processor: satteri({ hastPlugins: [sozlukBagla, satteriGraf()] }) },
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { concurrency: 1, inlineStylesheets: 'never' },
  // Aynı nedenle betikler de satır içine gömülmez (küçük betikler varsayılan olarak gömülür ve CSP'ye takılır).
  vite: {
    build: { assetsInlineLimit: 0 },
    plugins: [{
      name: 'windows-dist-astro-fix',
      async writeBundle() {
        const fs = await import('node:fs');
        fs.mkdirSync(new URL('./dist/_astro/', import.meta.url), { recursive: true });
      }
    }]
  },
});
