// Kaynak beslemesinin sabit kategorisi, haberin konusu başka olduğunda düzeltilir.
// 18 Kasım 2026: kripto beslemelerinden gelen çip, Fed, petrol ve şirket haberleri "Kripto" bölümüne düşüyordu;
// döviz beslemesinden gelen perakende satış haberi "Döviz & Altın"daydı. Yalnız kripto ve doviz denetlenir;
// bülten, karne ve eşik olayları gibi kategorisini kendisi bilen üretimler bu iki sözlükle zaten eşleşir.

const KRIPTO = [
  'kripto', 'bitcoin', 'btc', 'ethereum', 'ether', 'blokzincir', 'blok zincir', 'blockchain', 'stablecoin', 'stabil coin',
  'token', 'altcoin', 'coin', 'binance', 'tether', 'usdt', 'usdc', 'solana', 'xrp', 'ripple', 'dijital varlık',
  'sanal para', 'nft', 'defi', 'web3', 'madenci', 'kraken', 'metaplanet', 'microstrategy', 'dogecoin', 'cardano',
];

const DOVIZ = [
  'döviz', 'kur', 'parite', 'dolar/tl', 'euro/tl', 'avro/tl', 'sterlin', 'yen', 'yuan', 'frank', 'ruble', 'real',
  'altın', 'gümüş', 'ons', 'platin', 'paladyum', 'rezerv', 'swap', 'değer kazan', 'değer kaybet',
];

const BORSA = [
  'hisse', 'borsa', 'endeks', 'bilanço', 'kâr', 'zarar', 'halka arz', 'piyasa değeri',
  'üst yönetici', 'ceo', 'yönetim kurulu', 'şirket', 'satın al', 'birleşme', 'temettü', 'nasdaq', 'nyse', 's&p',
];

const kucuk = (s) => String(s ?? '').toLocaleLowerCase('tr-TR');

// Kelime başında eşleşme: "token" tokenleştirme'yi yakalar, "kur" kurul'u da yakalar ama tek başına yetmez (sayı eşiği).
function sayi(metin, sozluk) {
  let n = 0;
  for (const k of sozluk) {
    const re = new RegExp(`(^|[^\\p{L}])${k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`, 'gu');
    n += (metin.match(re) ?? []).length;
  }
  return n;
}

/**
 * @param {string} kategori beslemenin verdiği kategori
 * @param {{ baslik?: string, govde?: string, ozet?: string }} yazi
 * @returns {string} düzeltilmiş kategori (değişmediyse aynısı)
 */
export function kategoriDuzelt(kategori, yazi) {
  if (kategori !== 'kripto' && kategori !== 'doviz') return kategori;
  const baslik = kucuk(yazi?.baslik);
  const metin = `${baslik} ${baslik} ${kucuk(yazi?.ozet)} ${kucuk(yazi?.govde)}`;
  const sozluk = kategori === 'kripto' ? KRIPTO : DOVIZ;
  // Başlık iki kez sayılır; başlıkta ya da metinde en az iki geçiş konuyu doğrular.
  if (sayi(metin, sozluk) >= 2) return kategori;
  return sayi(metin, BORSA) >= 2 ? 'borsa' : 'ekonomi';
}
