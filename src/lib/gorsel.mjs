// Haber görselleri ve dist dosya bütçesi.
//
// Cloudflare Workers static assets bir sürümde en çok 20.000 dosya kabul eder (yayinla.yml 15.000'de uyarır).
// Her yazının kalıcı maliyeti 2 dosyadır: sayfanın index.html'i ve 1200px JPEG kapak. Aynı JPEG hem og:image /
// JSON-LD görseli hem sayfadaki resimdir (aynı dönüşüm seçenekleri → Astro tek dosya üretir), RSS de onu kullanır.
// Eski haberin kapağı da derlenir: paylaşılan ve aramada çıkan her yazının 1200px'lik görseli olsun diye.
// Liste kartlarındaki küçük resim (264px WebP, kart başına +1 dosya) yalnızca KART_GORSEL_GUN gün gösterilir;
// eski yazılar listelerde görselsiz satır olur, kalıcı dosya sayısı yazı başına 2'de kalır.
// Kabaca: günde ~60 yazı → ~120 kalıcı dosya/gün + ~14 günlük kart resmi (~800). Dosya sayısı 15.000'e
// yaklaştığında (yayinla.yml uyarır) eski yazıları arşivlemek ya da ücretli plana geçmek gerekir.
export const KART_GORSEL_GUN = 14;

export const kartGorseliVar = (tarih, simdi = new Date()) =>
  simdi.getTime() - new Date(tarih).getTime() <= KART_GORSEL_GUN * 86_400_000;

// og:image, JSON-LD, RSS ve sayfadaki resim için ortak dönüşüm: tek dosya kalsın diye her yerde aynı olmalı.
export const KAPAK_DONUSUM = /** @type {const} */ ({ width: 1200, format: 'jpeg' });

// Liste kartı küçük resmi: kart 132px (mobilde 96px) genişliğinde, 4:3; 2x ekran için 264×198 tek dosya.
export const KART_DONUSUM = /** @type {const} */ ({ width: 264, height: 198, fit: 'cover', format: 'webp' });
