import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES } from './lib/site';
import { VARSAYILAN_YAZI_TURU, YAZI_TURLERI } from './lib/yazi-turu.mjs';

// Düzeltme notları 1 Kasım 2026'dan önce gösterilmez (yapım aşaması; sahibinin kararı, 22 Ekim 2026).
// Zincir de bu tarihten önce not yazmaz (mecmua yazi-isleri/guncelleme/icerik.mjs DUZELTME_ACILIS).
const DUZELTME_ACILIS = Date.parse('2026-11-01T00:00:00+03:00');
const duzeltmeKapisi = (v: string | undefined) => (Date.now() < DUZELTME_ACILIS ? undefined : v);
const slugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

const haberler = defineCollection({
  loader: glob({ base: './src/content/haberler', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      // Yayından sonra metin elle düzeltildiyse son güncelleme; yoksa değiştirilme tarihi yayın tarihidir.
      updated: z.coerce.date().optional(),
      // Yayından sonra yapılan düzeltmenin notu ("<tarih saat>: <ne düzeltildi>"); boşsa makalede hiçbir şey görünmez.
      // Not `updated`'ı değiştirmez; sahibi elle günceller.
      duzeltme: z.string().min(10).optional().transform(duzeltmeKapisi),
      // Yazı türü (bkz. src/lib/yazi-turu): haber, açıklayıcı ya da referans; yoksa haber. `tur` alanından ayrıdır.
      yaziTuru: z.enum(YAZI_TURLERI).default(VARSAYILAN_YAZI_TURU),
      category: z.enum(slugs),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      // false: kapak başlığı/spotu tekrar eden metin kartı; sitede gösterilmez, yalnızca og:image ve Telegram için.
      coverSitede: z.boolean().default(true),
      // Elle girilen yazılarda yazar alanı vardır; haber botu yazar yazmaz (uretim: bot). Yazarsız yazı bot yazısı sayılır.
      author: z.string().optional(),
      // 'yazi-isleri': yazı işleri zincirinin yazısı (yerleştirme yazar); sayfa sonunda zincir notunu alır (src/lib/yapay-zeka-notu.mjs).
      uretim: z.enum(['bot', 'editor', 'yazi-isleri']).optional(),
      featured: z.boolean().default(false),
      breaking: z.boolean().default(false),
      draft: z.boolean().default(false),
      tur: z.enum(['haber', 'bulten']).default('haber'),
      // Yazının neye dayandığı (bkz. scripts/haberler/icerik-turu.mjs); yoksa düz haber.
      icerikTuru: z.enum(['veri', 'arastirma', 'resmi']).optional(),
      rakamlar: z.array(z.object({ etiket: z.string(), deger: z.string() })).max(4).default([]),
      sirada: z.object({ tarih: z.string(), olay: z.string() }).optional(),
      tablo: z
        .object({
          baslik: z.string(),
          sutunlar: z.array(z.string()).min(2).max(4),
          satirlar: z.array(z.array(z.string())).min(1).max(8),
        })
        .optional(),
      grafik: z
        .object({
          baslik: z.string(),
          simge: z.enum(['lira', 'banka', 'sepet']),
          birimEtiket: z.string(),
          birim: z.number().positive(),
          satirlar: z.array(z.object({ etiket: z.string(), metin: z.string(), deger: z.number().nonnegative() })).min(2).max(6),
        })
        .optional(),
      kaynaklar: z.array(z.object({ ad: z.string(), url: z.string().url() })).default([]),
      // Resmi olmayan kaynakların şifreli kaydı; sitede gösterilmez (bkz. scripts/haberler/gizli.mjs).
      kaynakIzi: z.string().optional(),
      why_matters: z.string().optional(),
      key_points: z.array(z.string()).optional(),
    }),
});

export const collections = { haberler };
