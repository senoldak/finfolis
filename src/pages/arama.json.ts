// Site içi arama dizini: her yazının başlığı, spotu, kategorisi, adresi ve tarihi (bkz. src/lib/arama-cekirdek.mjs).
// Derlemede üretilir; arama sayfası (/arama/) tarayıcıda bunu yükler.
import { getNews, newsUrl } from '../lib/news';
import { categoryName } from '../lib/site';

export async function GET() {
  const kayitlar = (await getNews()).map((h) => ({
    t: h.data.title,
    d: h.data.description,
    k: categoryName(h.data.category),
    u: newsUrl(h),
    z: h.data.date.toISOString(),
  }));
  return new Response(JSON.stringify(kayitlar), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
