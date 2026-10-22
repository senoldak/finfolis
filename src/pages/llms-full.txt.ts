import type { APIRoute } from 'astro';
import { getNews, newsUrl } from '../lib/news';
import { YAZAR } from '../lib/yazar.mjs';

export const prerender = true;

export const GET: APIRoute = async () => {
  const news = await getNews({ indeksli: true });
  const sonHaberler = news.slice(0, 40);

  let metin = `# Finfolis - Tam İçerik ve Haber Akışı\n\n`;
  metin += `Son güncelleme: ${new Date().toISOString()}\n\n`;

  for (const h of sonHaberler) {
    metin += `## ${h.data.title}\n`;
    metin += `- URL: https://finfolis.com${newsUrl(h)}\n`;
    metin += `- Tarih: ${h.data.date.toISOString()}\n`;
    metin += `- Yazar: ${YAZAR.ad}
`;
    metin += `- Kategori: ${h.data.category}\n`;
    if (h.data.description) metin += `- Özet: ${h.data.description}\n`;
    metin += `\n`;
  }

  return new Response(metin, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
