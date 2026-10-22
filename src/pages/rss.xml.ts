import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getImage } from 'astro:assets';
import { SITE, YAZAR, categoryName } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';
import { KAPAK_DONUSUM } from '../lib/gorsel.mjs';

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export async function GET(context: APIContext) {
  const news = await getNews({ indeksli: true });
  const items = await Promise.all(
    news.slice(0, 50).map(async (h) => {
      // Kapak: haber sayfasının og:image dosyasıyla aynı (1200px JPEG); yeni dosya üretmez.
      const img = h.data.cover ? await getImage({ src: h.data.cover, ...KAPAK_DONUSUM }) : undefined;
      const media = img
        ? `<media:content url="${xml(new URL(img.src, context.site).href)}" medium="image" type="image/jpeg" width="${img.attributes.width}" height="${img.attributes.height}" />`
        : undefined;
      return {
        title: h.data.title,
        description: h.data.description,
        pubDate: h.data.date,
        link: newsUrl(h),
        categories: [categoryName(h.data.category)],
        customData: `<dc:creator>${xml(YAZAR.ad)}</dc:creator>${media ?? ''}`,
      };
    }),
  );
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/', atom: 'http://www.w3.org/2005/Atom', media: 'http://search.yahoo.com/mrss/' },
    items,
    customData: `<language>tr</language><atom:link href="${new URL('/rss.xml', context.site).href}" rel="self" type="application/rss+xml" />`,
  });
}
