import { aciklayiciMi } from './yazi-turu.mjs';

// Künye (sahibinin onayladığı metin; dört sitede aynı kişi, aynı dört yayın). İlk paragraf kısa kalır: meta açıklaması ve JSON-LD onu kullanır.
const KUNYE = [
  'Şenol Dak gazeteci ve yayıncıdır. kifobu, finfolis, jenDume ve tidsrøst haber sitelerini kurdu ve dördünün de yayın yönetmenidir. Gazetecilik çalışmaları 2022’de kifobu’nun ilk bülteniyle başladı.',
  'Girişimcilik ve kitle fonlaması, finans piyasaları ve ekonomi, yapay zekâ, bilim ve teknoloji ile Norveç ve dünyadan güncel konular üzerine yazıyor. Çalışmaları haberlerden, analizlerden ve bir gelişmenin arka planını ve sonuçlarını anlatan açıklayıcı yazılardan oluşuyor. Kaynağa dayalı araştırmaya, veri analizine ve karmaşık konuları anlaşılır kılmaya önem veriyor.',
  'Gazeteciliğin yanında Türkçe ve yapay zekâ öğretmenliği yapıyor, yazılım sektöründe üretken yapay zekâ sistemleri üzerinde çalışıyor. Bu teknik birikimi veri araştırmasında ve dijital gazetecilikte de kullanıyor.',
  'Üretken yapay zekânın gazetecilikte nasıl kullanılabileceği ve teknolojinin haber araştırmasını, üretimini ve yayıncılığı nasıl değiştirdiği özellikle ilgisini çekiyor. Dört sitede de yapay zekâyla çalışan bir haber üretimi kurdu; hangi haberlerin otomatik yayımlanacağına ve yayından önce hangi denetimlerden geçeceğine kendisi karar veriyor.',
];

// Analiz, açıklayıcı/referans ve köşe yazılarının görünen yazarı. Rutin haber ve bültenlerde site adı kullanılır.
export const YAZAR = {
  ad: 'Şenol Dak',
  unvan: 'Gazeteci',
  rol: 'Gazeteci · öğretmen · üretken yapay zekâ sistemleri · veri analizi ve araştırma',
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
