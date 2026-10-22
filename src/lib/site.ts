import { YAZAR } from './yazar.mjs';

export { YAZAR };

export const SITE = {
  name: 'finfolis',
  description: 'Piyasalar, borsa, döviz, kripto ve ekonomi haberleri.',
  locale: 'tr-TR',
  // Gerçek hesap adresleri girilince alt bilgide görünür; boş olanlar gizlenir.
  social: {
    x: '',
    facebook: '',
    // Haber botunun yazıları gönderdiği kanal (gönderimi mecmua-saat'in D1 kuyruğu yapar).
    telegram: 'https://t.me/finfolis',
    // Şirket sayfası (urn:li:organization:106661771).
    linkedin: 'https://www.linkedin.com/company/106661771/',
  },
};

import { CATEGORIES } from './kategoriler.js';

export { CATEGORIES };

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function category(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[0];
}

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

export function formatDate(date: Date, withTime = false) {
  return date.toLocaleString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Europe/Istanbul',
  });
}
