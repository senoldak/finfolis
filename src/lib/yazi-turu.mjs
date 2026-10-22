// Yazı türü: düz haber, açıklayıcı yazı, referans yazısı ya da analiz (yazı işleri zinciri; /analiz/ bölümü). Şema
// (src/content.config.ts) bu diziyi kullanır; değerler tek yerde durur.
// Görünümde analizin karşılığı var (etiket, /analiz/ sayfası); öteki türlerin henüz yok.
export const YAZI_TURLERI = Object.freeze(['haber', 'aciklayici', 'referans', 'analiz']);
export const VARSAYILAN_YAZI_TURU = 'haber';

export function aciklayiciMi(veri) {
  const tur = veri?.yaziTuru;
  return tur === 'aciklayici' || tur === 'referans';
}

// Analiz yazısı: aciklayiciMi'den ayrıdır (analiz açıklayıcı sayılmaz).
export function analizMi(veri) {
  return veri?.yaziTuru === 'analiz';
}
