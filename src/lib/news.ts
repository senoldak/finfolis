import { getCollection, type CollectionEntry } from 'astro:content';
import { indekslenir } from './uzunluk.mjs';
import { yayinda } from './yayinda.mjs';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar ve tarihi gelmemiş (planlanmış) yazılar canlı sitede görünmez, yerel geliştirmede görünür (kural src/lib/yayinda.mjs'te).
// tur verilirse yalnızca o türdeki yazılar döner (haber | bulten); verilmezse hepsi.
// indeksli: kısa (noindex) yazılar düşer. Ana sayfa, kategori, konu, menü ve akışlar bunu kullanır;
// kısa yazılar yalnızca arşiv, arama ve şeffaflık sayfalarından erişilir (kural src/lib/uzunluk.mjs'te).
export async function getNews({ tur, indeksli = false }: { tur?: 'haber' | 'bulten'; indeksli?: boolean } = {}): Promise<Haber[]> {
  const all = await getCollection(
    'haberler',
    ({ data, body }) => (import.meta.env.DEV || yayinda(data)) && (!tur || data.tur === tur) && (!indeksli || indekslenir(body)),
  );
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function newsUrl(haber: Haber) {
  return `/haber/${haber.id}/`;
}
