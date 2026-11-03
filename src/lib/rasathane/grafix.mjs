// graFİX sayfalarının yardımcıları: gösterge seçimi ve geçmiş yeterliliği. Saf fonksiyonlar, test edilebilir.

export const YETERLI_NOKTA = 252;

// Hisse grafiğinde seçilebilen göstergeler. Anahtarlar açık depodaki seri sütunlarıyla aynıdır.
// pane: 'rsi' ise grafiğin altındaki ayrı RSI panelinde çizilir.
export const GRAFIX_GOSTERGE = [
  { k: 'ema144', ad: 'EMA 144', renk: '#c2502b' },
  { k: 'ema233', ad: 'EMA 233', renk: '#2d4fd6' },
  { k: 'ema377', ad: 'EMA 377', renk: '#1f7a4d' },
  { k: 'sma200', ad: 'SMA 200', renk: '#8a5a00' },
  { k: 'kijun_g', ad: 'Kijun-sen günlük (26)', renk: '#151515' },
  { k: 'kijun_h', ad: 'Kijun-sen haftalık (26)', renk: '#7a3fb0' },
  { k: 'rsi14', ad: 'RSI (14)', renk: '#2d4fd6', pane: 'rsi' },
];

// Kapanış her zaman çizilir; diğer sütunlar yalnız seçilmişse ve seride varsa.
export function gostergeSecimi(sutunlar, secili = []) {
  const mevcut = new Set(Object.keys(sutunlar ?? {}));
  const sonuc = mevcut.has('kapanis') ? ['kapanis'] : [];
  for (const k of secili) if (k !== 'kapanis' && mevcut.has(k)) sonuc.push(k);
  return sonuc;
}

// Yeterli geçmiş: en az 252 işlem günü. Kısa geçmişte grafik çizilmez, sayfa bunu söyler.
export function yeterliGecmis(seri) {
  return Array.isArray(seri?.tarihler) && seri.tarihler.length >= YETERLI_NOKTA;
}
