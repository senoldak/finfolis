// Sitedeki bütün yazıların görünen yazarı. Ön bilgideki author alanı ne olursa olsun bu sabit kullanılır.
export const YAZAR = {
  ad: 'Şenol Dak',
  unvan: 'Yayın yönetmeni ve editör',
  slug: 'senol-dak',
  yol: '/yazar/senol-dak/',
  aciklama: "Şenol Dak, finfolis'in yayın yönetmeni ve editörüdür. Sitedeki yazılar bu ad altında yayımlanır; haberlerin yazımında yapay zekâ kullanılır ve her yazının sonunda bu açıkça belirtilir.",
};

// Yazarın kimlik adresi (JSON-LD @id) ve sayfa adresi.
export function yazarUrl(siteUrl) {
  return `${siteUrl}${YAZAR.yol}`;
}

// Haber sayfasındaki NewsArticle.author düğümü (yayıncı Organization olarak ayrı kalır).
export function yazarSemasi(siteUrl, orgId) {
  const url = yazarUrl(siteUrl);
  return { '@type': 'Person', '@id': `${url}#person`, name: YAZAR.ad, jobTitle: YAZAR.unvan, url, worksFor: { '@id': orgId } };
}
