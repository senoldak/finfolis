// finfolis'teki imzalı yazıların yayın tarihleri: [{ site, date }]. Diğer üç site yazar sayfasındaki gün ızgarası için
// bunu derlemede çeker (scripts/yazar-aktivite.mjs). Yalnız tarih ve site; başlık ya da adres yok.
// İmzalı yazı = yazar sayfasındaki filtre (kisiYazariMi); getNews taslak ve tarihi gelmemiş yazıları canlıda zaten dışarıda bırakır.
import { getNews } from '../lib/news';
import { kisiYazariMi } from '../lib/yazar.mjs';

export async function GET() {
  const poster = (await getNews({ indeksli: true }))
    .filter((h) => kisiYazariMi(h.data))
    .map((h) => ({ site: 'finfolis', date: h.data.date.toISOString() }));
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
