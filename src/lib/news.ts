import { getCollection, type CollectionEntry } from 'astro:content';
import { indekslenir } from './uzunluk.mjs';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar canlı sitede görünmez, yerel geliştirmede görünür.
// tur verilirse yalnızca o türdeki yazılar döner (haber | bulten); verilmezse hepsi.
// indeksli: kısa (noindex) yazılar düşer. Ana sayfa, kategori, konu, menü ve akışlar bunu kullanır;
// kısa yazılar yalnızca arşiv, arama ve şeffaflık sayfalarından erişilir (kural src/lib/uzunluk.mjs'te).
export async function getNews({ tur, indeksli = false }: { tur?: 'haber' | 'bulten'; indeksli?: boolean } = {}): Promise<Haber[]> {
  const all = await getCollection(
    'haberler',
    ({ data, body }) => (import.meta.env.DEV || !data.draft) && (!tur || data.tur === tur) && (!indeksli || indekslenir(body)),
  );
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function newsUrl(haber: Haber) {
  return `/haber/${haber.id}/`;
}
