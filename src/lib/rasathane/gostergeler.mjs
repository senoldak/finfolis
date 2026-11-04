// Ortak gösterge tanımları: tüm Rasathane sayfalarında aynı. Bot bu anahtarların seri dosyalarını yazar
// (bkz. para/rasathane/emtia/rasathane_emtia/site_aktar.py: günlük ve haftalık ortak set).
// pane: 0 fiyat paneli, 1 ayrı alt panel (RSI).

export const GOSTERGE = {
  gunluk: [
    { k: 'ema144', ad: 'EMA 144', renk: '#c2502b' },
    { k: 'ema233', ad: 'EMA 233', renk: '#2d4fd6' },
    { k: 'ema377', ad: 'EMA 377', renk: '#1f7a4d' },
    { k: 'rsi14', ad: 'RSI (14)', renk: '#2d4fd6', pane: 1 },
  ],
  hafta: [
    { k: 'ema144', ad: 'EMA 144 hafta', renk: '#c2502b' },
    { k: 'ema233', ad: 'EMA 233 hafta', renk: '#2d4fd6' },
    { k: 'rsi14', ad: 'RSI (14)', renk: '#2d4fd6', pane: 1 },
  ],
};

// Kijun-sen: günlük ve haftalık iki bağımsız gösterge; kullanıcı hangisini açacağına kendisi karar verir.
export const KIJUN = [
  { k: 'kijun_gunluk', dosya: 'gunluk', ad: 'Kijun-sen günlük (26)', renk: '#151515' },
  { k: 'kijun_hafta', dosya: 'hafta', ad: 'Kijun-sen haftalık (26)', renk: '#c2502b' },
];
