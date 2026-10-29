// Hangi yazılar arama motorlarına açık? Haber sayfasının robots etiketi, site haritası (astro.config.mjs) ve
// Google News haritası aynı kuralı kullanır. IndexNow adresleri dist/news-sitemap.xml'den aldığı için buradan
// kapanan yazı oraya da gitmez. Düz JavaScript: Astro sayfaları ve astro.config.mjs birlikte kullanır.
//
// 29.10.2026 (sahibinin kararı): Google finfolis yazılarını neredeyse hiç taramıyordu (8 günde 10 ziyaret;
// en yeni 40 yazının 0'ı dizinde, çoğu "keşfedilmiş, taranmamış"). Yabancı haber akışlarından çevrilen düz
// haberler sitede, ana sayfada, kategorilerde ve Telegram'da kalır, ama Google'a kapatılır (googlebot: noindex,
// follow) ve site haritalarına girmez. ChatGPT, Perplexity, Bing gibi aramalar bu haberleri görmeye devam eder. Google siteyi resmî kaynaklı ve veri haberleri, araştırma
// yazıları, yazı işleri zinciri, bültenler ve /veri/ sayfaları üzerinden tartsın.
// Geri almak için aramayaAcik'i yalnız indekslenir(govde) döndürecek hale getir.
import { indekslenir } from './uzunluk.mjs';

const ACIK_URETIM = new Set(['yazi-isleri', 'editor']);

/**
 * Haber akışından çevrilmiş düz haber mi? Bülten, içerik türü (veri/araştırma/resmî) taşıyan yazı,
 * yazarlı yazı ve yazı işleri/editör yazısı değildir.
 * @param {{ tur?: string, icerikTuru?: string, author?: string, uretim?: string }} [veri]
 */
export function akisCevirisi({ tur, icerikTuru, author, uretim } = {}) {
  if ((String(tur ?? '').trim() || 'haber') === 'bulten') return false;
  if (String(icerikTuru ?? '').trim()) return false;
  if (String(author ?? '').trim()) return false;
  return !ACIK_URETIM.has(String(uretim ?? '').trim());
}

/**
 * Arama motorlarına açık mı? Kısa yazı (src/lib/uzunluk.mjs) ve akış çevirisi kapalıdır.
 * @param {{ govde?: string, tur?: string, icerikTuru?: string, author?: string, uretim?: string }} [p]
 */
export const aramayaAcik = ({ govde, ...veri } = {}) => indekslenir(govde) && !akisCevirisi(veri);
