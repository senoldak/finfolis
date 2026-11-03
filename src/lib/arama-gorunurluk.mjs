// Hangi yazılar arama motorlarına açık? Haber sayfasının robots etiketi, site haritası (astro.config.mjs) ve
// Google News haritası aynı kuralı kullanır. IndexNow adresleri dist/news-sitemap.xml'den aldığı için buradan
// kapanan yazı oraya da gitmez. Düz JavaScript: Astro sayfaları ve astro.config.mjs birlikte kullanır.
//
// 29.10.2026 (sahibinin kararı): Google finfolis yazılarını neredeyse hiç taramıyordu (8 günde 10 ziyaret;
// en yeni 40 yazının 0'ı dizinde, çoğu "keşfedilmiş, taranmamış"). Yabancı haber akışlarından çevrilen düz
// haberler sitede, ana sayfada, kategorilerde ve Telegram'da kalır, ama Google'a kapatılır (googlebot: noindex,
// follow) ve site haritalarına girmez. ChatGPT, Perplexity, Bing gibi aramalar bu haberleri görmeye devam eder. Google siteyi resmî kaynaklı ve veri haberleri, araştırma
// yazıları, yazı işleri zinciri, bültenler ve /veri/ sayfaları üzerinden tartsın.
//
// 3.11.2026 (sahibinin kararı): durum değişmedi (Ekim'in 110 yazısının 0'ı dizinde). Aynı biçimde piyasa
// bültenleri (günde üç, çoğu zaten kapalı akış haberlerine bağlantı listesi) ve yalnız kapanış verisinden
// kalıpla üretilen piyasa yazıları ("son 4 yılın en düşüğü", karneler; aylık tekrar oranının çoğu) da Google'a
// kapatıldı. Google'a yazı işleri zinciri, resmî kaynaklı ve araştırma yazıları ile /veri/ sayfaları kalır.
// Geri almak için googleaKapali'yi yalnız akisCevirisi(veri) döndürecek hale getir; tamamen geri almak için
// aramayaAcik'i yalnız indekslenir(govde) döndürecek hale getir.
import { indekslenir } from './uzunluk.mjs';

const ACIK_URETIM = new Set(['yazi-isleri', 'editor']);
// Kapanış verisinden üretilen piyasa yazılarının tek kaynağı (scripts/haberler/icerik-turu.mjs, karne.mjs).
const PIYASA_KAYNAGI = 'Piyasa kapanış verisi';

const bultenMi = (tur) => (String(tur ?? '').trim() || 'haber') === 'bulten';

/**
 * Haber akışından çevrilmiş düz haber mi? Bülten, içerik türü (veri/araştırma/resmî) taşıyan yazı,
 * yazarlı yazı ve yazı işleri/editör yazısı değildir.
 * @param {{ tur?: string, icerikTuru?: string, author?: string, uretim?: string }} [veri]
 */
export function akisCevirisi({ tur, icerikTuru, author, uretim } = {}) {
  if (bultenMi(tur)) return false;
  if (String(icerikTuru ?? '').trim()) return false;
  if (String(author ?? '').trim()) return false;
  return !ACIK_URETIM.has(String(uretim ?? '').trim());
}

/**
 * Yalnız kapanış verisinden kalıpla üretilmiş piyasa yazısı mı? Yazarlı ve yazı işleri yazısı değildir.
 * @param {{ icerikTuru?: string, author?: string, uretim?: string, kaynaklar?: { ad?: string }[] }} [veri]
 */
export function piyasaKalibi({ icerikTuru, author, uretim, kaynaklar = [] } = {}) {
  if (String(icerikTuru ?? '').trim() !== 'veri') return false;
  if (String(author ?? '').trim() || ACIK_URETIM.has(String(uretim ?? '').trim())) return false;
  return kaynaklar.length === 1 && String(kaynaklar[0]?.ad ?? '').trim() === PIYASA_KAYNAGI;
}

/**
 * Yalnız Google'a kapalı mı (googlebot: noindex, follow)? Akış çevirisi, bülten ve kalıp piyasa yazısı.
 * @param {{ tur?: string, icerikTuru?: string, author?: string, uretim?: string, kaynaklar?: { ad?: string }[] }} [veri]
 */
export const googleaKapali = (veri = {}) => akisCevirisi(veri) || bultenMi(veri.tur) || piyasaKalibi(veri);

/**
 * Arama motorlarına açık mı? Kısa yazı (src/lib/uzunluk.mjs) ve Google'a kapalı yazı haritalara girmez.
 * @param {{ govde?: string, tur?: string, icerikTuru?: string, author?: string, uretim?: string, kaynaklar?: { ad?: string }[] }} [p]
 */
export const aramayaAcik = ({ govde, ...veri } = {}) => indekslenir(govde) && !googleaKapali(veri);
