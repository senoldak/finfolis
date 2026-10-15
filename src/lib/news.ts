import { getCollection, type CollectionEntry } from 'astro:content';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar canlı sitede görünmez, yerel geliştirmede görünür.
// tur verilirse yalnızca o türdeki yazılar döner (haber | bulten); verilmezse hepsi.
export async function getNews({ tur }: { tur?: 'haber' | 'bulten' } = {}): Promise<Haber[]> {
  const all = await getCollection(
    'haberler',
    ({ data }) => (import.meta.env.DEV || !data.draft) && (!tur || data.tur === tur),
  );
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function newsUrl(haber: Haber) {
  return `/haber/${haber.id}/`;
}
