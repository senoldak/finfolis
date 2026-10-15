// Arama motorları için ortak yardımcılar: kimlik (@id) adresleri, kısaltma, site geneli JSON-LD.
import { SITE } from './site';

export const SITE_URL = 'https://finfolis.com';
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LOGO_URL = `${SITE_URL}/favicon-512.png`;

// Metni sözcük sınırında keser; sığmazsa sonuna "…" ekler.
export function kisalt(metin: string, sinir: number) {
  const t = metin.replace(/\s+/g, ' ').trim();
  if (t.length <= sinir) return t;
  const kesik = t.slice(0, sinir - 1);
  const bosluk = kesik.lastIndexOf(' ');
  return `${(bosluk > sinir * 0.6 ? kesik.slice(0, bosluk) : kesik).replace(/[\s,.;:–-]+$/, '')}…`;
}

const sameAs = Object.values(SITE.social).filter(Boolean);

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
      correctionsPolicy: `${SITE_URL}/yayin-ilkeleri/#duzeltmeler`,
      knowsAbout: ['Finans', 'Borsa', 'Ekonomi', 'Kripto'],
      email: 'iletisim@finfolis.com',
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
