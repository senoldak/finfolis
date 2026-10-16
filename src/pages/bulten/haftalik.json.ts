import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { indekslenir } from '../../lib/uzunluk.mjs';
import { isoHafta } from '../../../worker/lib.mjs';

// Haftalık bülten için son 7 günün indekslenebilir haberleri. Worker (worker/bulten.mjs) bu dosyayı pazartesi okur.
// Derlemede üretilir; haber bulunmuyorsa boş liste döner ve bülten gönderilmez.
export async function GET({ site }: APIContext) {
  const simdi = new Date();
  const alt = simdi.getTime() - 7 * 24 * 60 * 60 * 1000;
  const yazilar = await getCollection('haberler', ({ data }) => !data.draft && data.tur === 'haber');
  const haberler = yazilar
    .filter((y) => y.data.date.getTime() >= alt && y.data.date.getTime() <= simdi.getTime() && indekslenir(y.body ?? ''))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .slice(0, 10)
    .map((y) => ({
      baslik: y.data.title,
      ozet: y.data.description,
      url: new URL(`/haber/${y.id}/`, site).href,
      tarih: y.data.date.toISOString(),
    }));

  const kalici = [
    { baslik: 'Veriler', url: new URL('/veri/', site).href },
    { baslik: 'Hesaplayıcılar', url: new URL('/hesapla/', site).href },
    { baslik: 'Sözlük', url: new URL('/sozluk/', site).href },
  ];

  const veri = { hafta: isoHafta(simdi), uretildi: simdi.toISOString(), haberler, kalici };
  return new Response(JSON.stringify(veri, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
