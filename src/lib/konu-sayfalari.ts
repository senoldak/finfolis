// Konu sayfalarının veri katmanı: hangi konunun sayfası var, hangi yazı hangi konuya bağlı.
// Kural ve sözlük src/lib/konular.mjs'te; burada yalnızca içerik koleksiyonuna bağlanır.
import { getNews, type Haber } from './news';
import { konuDizini, konulariBul, type Konu } from './konular.mjs';

export interface KonuSayfasi {
  konu: Konu;
  haberler: Haber[];
}

let onbellek: Promise<KonuSayfasi[]> | undefined;

// Sayfası olan konular (en az KONU_ESIGI haber), her biri yeni tarihten eskiye haberleriyle. Bültenler sayılmaz.
export function konuSayfalari(): Promise<KonuSayfasi[]> {
  onbellek ??= (async () => {
    const news = await getNews({ tur: 'haber', indeksli: true });
    const idIle = new Map(news.map((h) => [h.id, h]));
    const dizin = konuDizini(news.map((h) => ({ id: h.id, baslik: h.data.title, spot: h.data.description, govde: h.body ?? '' })));
    return dizin.map(({ konu, idler }) => ({ konu, haberler: idler.map((id) => idIle.get(id)!).filter(Boolean) }));
  })();
  return onbellek;
}

// Bir yazının bağlı olduğu ve sayfası bulunan konular (haber sayfasındaki konu bağlantıları için).
export async function yazininKonulari(haber: Haber): Promise<Konu[]> {
  if (haber.data.tur === 'bulten') return [];
  const varolan = new Map((await konuSayfalari()).map((s) => [s.konu.slug, s.konu]));
  return konulariBul({ baslik: haber.data.title, spot: haber.data.description, govde: haber.body ?? '' })
    .map((s) => varolan.get(s))
    .filter((k): k is Konu => Boolean(k));
}

export const konuUrl = (slug: string) => `/konu/${slug}/`;
