import { aciklayiciMi } from './yazi-turu.mjs';

// Künye (sahibinin onayladığı metin; dört sitede aynı kişi, aynı dört yayın).
const KUNYE = [
  'Türkçe ve yapay zekâ öğretmeniyim; yazılım sektöründe üretken yapay zekâ sistemleri üzerinde çalışıyorum. 10 Ağustos 2022’de kifobu’nun ilk bültenini yayımladım ve o günden beri gazetecilik yapıyorum.',
  'kifobu, finfolis, JEN DUME ve tidsrøst aracılığıyla girişimlerden ve kitle fonlamasından finans piyasalarına, yapay zekâdan bilime, Norveç’ten dünya gündemine uzanan konuları ele alıyorum. Farklı alanlarda çalışsam da merakım aynı: Bilginin ötesine geçmek, bağlantıları görmek ve olup bitenin neden önemli olduğunu anlamak.',
];

// Analiz, açıklayıcı/referans ve köşe yazılarının görünen yazarı. Rutin haber ve bültenlerde site adı kullanılır.
export const YAZAR = {
  ad: 'Şenol Dak',
  unvan: 'Yayıncı ve editör',
  slug: 'senol-dak',
  yol: '/yazar/senol-dak/',
  aciklama: KUNYE[0],
  kunye: KUNYE,
};

// Analiz, açıklayıcı/referans (Forklart karşılığı) ya da köşe yazısı/sahip yazısı mı? Yalnız bu yazılarda Şenol Dak imzası kullanılır;
// diğer tüm haber ve bültenlerde yayıncı tüzel kişilik (site adı) görünür.
export function kisiYazariMi(veri) {
  if (!veri) return false;
  return (
    veri.yaziTuru === 'analiz' ||
    aciklayiciMi(veri) ||
    veri.yaziTuru === 'kose' ||
    veri.yaziTuru === 'kose-yazisi' ||
    veri.tur === 'kose-yazisi' ||
    veri.tur === 'analiz' ||
    (veri.author === YAZAR.ad && veri.uretim !== 'bot') ||
    (veri.uretim === 'editor' && Boolean(veri.author))
  );
}

// Yazarın kimlik adresi (JSON-LD @id) ve sayfa adresi.
export function yazarUrl(siteUrl) {
  return `${siteUrl}${YAZAR.yol}`;
}

// Haber sayfasındaki NewsArticle.author düğümü (yayıncı Organization olarak ayrı kalır).
export function yazarSemasi(siteUrl, orgId) {
  const url = yazarUrl(siteUrl);
  return { '@type': 'Person', '@id': `${url}#person`, name: YAZAR.ad, jobTitle: YAZAR.unvan, url, worksFor: { '@id': orgId } };
}
