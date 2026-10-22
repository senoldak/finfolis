// Google News site haritası: son 48 saatte yayımlanan yazılar (Google'ın sınırı).
// Site her bot commit'inden sonra yeniden derlendiği için derleme anındaki 48 saat yeterli.
import { SITE } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';
import { SITE_URL } from '../lib/seo';
import { indekslenir } from '../lib/uzunluk.mjs';

const PENCERE_MS = 48 * 60 * 60 * 1000;

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const simdi = Date.now();
  // Kısa (noindex) yazılar haritaya girmez; kural src/lib/uzunluk.mjs'te, haber sayfasıyla ortak.
  const news = (await getNews())
    .filter((h) => simdi - h.data.date.valueOf() <= PENCERE_MS && indekslenir(h.body))
    .slice(0, 1000);
  const urls = news
    .map(
      (h) => `  <url>
    <loc>${SITE_URL}${newsUrl(h)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xml(SITE.name)}</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${h.data.date.toISOString()}</news:publication_date>
      <news:title>${xml(h.data.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
