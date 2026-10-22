export interface EntityMapping {
  name: string;
  type: 'Organization' | 'FinancialProduct' | 'Place' | 'Thing';
  sameAs: string;
  keywords: string[];
}

export const FINANCIAL_ENTITIES: EntityMapping[] = [
  {
    name: 'Türkiye Cumhuriyet Merkez Bankası',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q580829',
    keywords: ['TCMB', 'Merkez Bankası', 'PPK', 'politika faizi'],
  },
  {
    name: 'Borsa İstanbul',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q1407995',
    keywords: ['Borsa İstanbul', 'BIST', 'BIST 100', 'BIST 30'],
  },
  {
    name: 'Sermaye Piyasası Kurulu',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q5035620',
    keywords: ['SPK', 'Sermaye Piyasası Kurulu'],
  },
  {
    name: 'Federal Reserve',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q53536',
    keywords: ['Fed', 'Federal Reserve', 'FOMC', 'Powell'],
  },
  {
    name: 'Bitcoin',
    type: 'FinancialProduct',
    sameAs: 'https://www.wikidata.org/wiki/Q131723',
    keywords: ['Bitcoin', 'BTC'],
  },
  {
    name: 'Ethereum',
    type: 'FinancialProduct',
    sameAs: 'https://www.wikidata.org/wiki/Q16783523',
    keywords: ['Ethereum', 'ETH'],
  },
];

export function matchEntities(text: string) {
  const about: Array<{ '@type': string; name: string; sameAs: string }> = [];
  const lower = text.toLowerCase();

  for (const ent of FINANCIAL_ENTITIES) {
    if (ent.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      about.push({
        '@type': ent.type,
        name: ent.name,
        sameAs: ent.sameAs,
      });
    }
  }

  return about.slice(0, 4);
}

export function findEntities(text: string) {
  const matched = matchEntities(text);
  return {
    about: matched.slice(0, 2),
    mentions: matched.slice(2),
  };
}
