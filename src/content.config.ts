import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES } from './lib/site';

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
      category: z.enum(slugs),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      // false: kapak başlığı/spotu tekrar eden metin kartı; sitede gösterilmez, yalnızca og:image ve Telegram için.
      coverSitede: z.boolean().default(true),
      // Panelden girilen yazılarda yazar alanı vardır; haber botu yazar yazmaz (uretim: bot). Yazarsız yazı bot yazısı sayılır.
      author: z.string().optional(),
      uretim: z.enum(['bot', 'editor']).optional(),
      featured: z.boolean().default(false),
      breaking: z.boolean().default(false),
      draft: z.boolean().default(false),
      tur: z.enum(['haber', 'bulten']).default('haber'),
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
