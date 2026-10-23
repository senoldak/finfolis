// Analiz ve köşe yazılarının görünen yazarı. Rutin haber ve bültenlerde site adı kullanılır.
export const YAZAR = {
  ad: 'Şenol Dak',
  unvan: 'Yayın yönetmeni ve editör',
  slug: 'senol-dak',
  yol: '/yazar/senol-dak/',
  aciklama: "Şenol Dak, finfolis'in yayın yönetmeni ve editörüdür. Sitedeki analiz ve köşe yazıları bu imza altında yayımlanır.",
};

// Analiz ya da köşe yazısı/sahip yazısı mı? Yalnız bu yazılarda Şenol Dak imzası kullanılır;
// diğer tüm haber ve bültenlerde yayıncı tüzel kişilik (site adı) görünür.
export function kisiYazariMi(veri) {
  if (!veri) return false;
  return (
    veri.yaziTuru === 'analiz' ||
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
