// Arama motorları için ortak yardımcılar: kimlik (@id) adresleri, kısaltma, site geneli JSON-LD.
import { SITE } from './site';

export const SITE_URL = 'https://finfolis.com';
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LOGO_URL = `${SITE_URL}/favicon-512.png`;
// NewsArticle publisher.logo: yatay 600×60 PNG (scripts/marka/marka-uret.mjs üretir).
export const PUBLISHER_LOGO = { '@type': 'ImageObject', url: `${SITE_URL}/finfolis-logo.png`, width: 600, height: 60 };

// Metni sözcük sınırında keser; sığmazsa sonuna "…" ekler.
export function kisalt(metin: string, sinir: number) {
  const t = metin.replace(/\s+/g, ' ').trim();
  if (t.length <= sinir) return t;
  const kesik = t.slice(0, sinir - 1);
  const bosluk = kesik.lastIndexOf(' ');
  return `${(bosluk > sinir * 0.6 ? kesik.slice(0, bosluk) : kesik).replace(/[\s,.;:–-]+$/, '')}…`;
}

// Yalnızca gerçekten var olan hesaplar (src/lib/site.ts'te boş olmayanlar).
export const sameAs = Object.values(SITE.social).filter(Boolean);

export const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsMediaOrganization',
      '@id': ORG_ID,
      name: SITE.name,
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512 },
      inLanguage: 'tr',
      publishingPrinciples: `${SITE_URL}/yayin-ilkeleri/`,
      masthead: `${SITE_URL}/yasal/`,
      correctionsPolicy: `${SITE_URL}/duzeltme-politikasi/`,
      knowsAbout: ['Finans', 'Borsa', 'Ekonomi', 'Kripto'],
      email: 'contact@finfolis.com',
      ...(sameAs.length ? { sameAs } : {}),
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: SITE.name,
      url: `${SITE_URL}/`,
      inLanguage: 'tr',
      publisher: { '@id': ORG_ID },
    },
  ],
};

// Veri, sözlük ve hesaplayıcı sayfalarının ortak şeması: sayfa + içerik yolu (+ isteğe bağlı ek düğümler).
// yol, görünür Breadcrumb bileşeniyle aynı dizidir; son öğe sayfanın kendisidir.
export function sayfaSemasi({
  yol,
  ad,
  aciklama,
  tur = 'WebPage',
  ekler = [],
  sayfaEk = {},
}: {
  yol: { ad: string; href?: string }[];
  ad: string;
  aciklama: string;
  tur?: string;
  ekler?: Record<string, unknown>[];
  sayfaEk?: Record<string, unknown>;
}) {
  const son = yol.at(-1)?.href ?? '/';
  const url = `${SITE_URL}${son}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': tur,
        '@id': url,
        url,
        name: ad,
        description: aciklama,
        inLanguage: 'tr',
        isPartOf: { '@id': WEBSITE_ID },
        ...sayfaEk,
      },
      ...ekler,
      {
        '@type': 'BreadcrumbList',
        itemListElement: yol.map((o, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: o.ad,
          item: `${SITE_URL}${o.href ?? son}`,
        })),
      },
    ],
  };
}
