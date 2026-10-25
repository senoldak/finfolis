// Haber sayfasının sonundaki yapay zekâ notu ve "Hata bildir" bağlantısı (standartlar).
// Bot haberi (haber, bülten, derleme, karne) tek satırlık bot notunu alır. Sahibin adıyla çıkan yazı (analiz,
// açıklayıcı, referans ya da yazar Şenol Dak) "Bu yazı nasıl hazırlandı" satırlarını alır; uretim yazi-isleri olsa da.
// Zincir notu yalnız sahibin olmayan yazi-isleri yazıları için kalır.
import { aciklayiciMi, analizMi } from './yazi-turu.mjs';

export const HATA_ADRESI = 'contact@finfolis.com';
export const SAHIP_ADI = 'Şenol Dak';
export const ZINCIR_URETIMI = 'yazi-isleri';
export const BOT_NOTU = 'Bu haber yapay zekâ ile otomatik yazıldı ve otomatik denetimden geçti.';
// Kısa özet (yazar sayfası, rapor); haber sayfasında NASIL_SATIRLAR gösterilir.
export const SAHIP_NOTU =
  'Yazıyı yazar kendisi yazdı; yapay zekâ araçları yalnız imla ve dil düzeltmesinde kullanıldı. Bütün rakamlar resmî kaynaklardan alındı ve yazar ile program tarafından kontrol edildi.';
export const ZINCIR_NOTU =
  'Bu yazı yapay zekâ araçlarıyla yazıldı. Rakamlar ve alıntılar resmî kaynaklarla karşılaştırıldı; yazı yayından önce editör tarafından okunup onaylandı.';
export const BAGLANTI_METNI = 'Hata bildir →';
export const NASIL_BASLIK = 'Bu yazı nasıl hazırlandı';
export const NASIL_SATIRLAR = [
  {
    etiket: 'Yazar',
    metin: `Yazıyı finfolis yayıncısı ve editörü ${SAHIP_ADI} yazdı. Konu, veri ve bakış açısı seçimi ile bütün hesaplamalar yazara aittir.`,
  },
  {
    etiket: 'Dil ve yapay zekâ',
    metin:
      'Yapay zekâ araçları yalnız imla ve dil düzeltmesinde kullanıldı; içerik, bakış açısı ya da rakamlar için kullanılmadı ve hiçbir zaman kaynak olarak kullanılmaz.',
  },
  {
    etiket: 'Rakamlar ve kaynaklar',
    metin:
      'Bütün rakamlar resmî kaynaklardan alındı; kaynaklar “Kaynaklar” bölümünde listelenir. Rakamlar yayından önce hem yazar hem program tarafından kaynaklarla karşılaştırıldı.',
  },
];
export const YONTEM_SATIRI = { etiket: 'Yöntem', metin: 'Hesaplamalar “Nasıl hesapladık” bölümünde açıklanır.' };
export const ILKE_SATIRI = { etiket: 'İlkeler', metin: 'Yazı, yayın ilkelerimize göre hazırlandı.' };
export const YZ_SAYFASI = { metin: 'Yapay zekâyı nasıl kullanıyoruz →', adres: '/yapay-zeka-kullanimi/' };

// Yazar Şenol Dak olan ya da yazı türü analiz/açıklayıcı/referans olan yazı sahibin yazısıdır.
export function sahipYazisiMi(veri) {
  return (
    veri?.author === SAHIP_ADI || analizMi(veri) || aciklayiciMi(veri) || (veri?.uretim === 'editor' && Boolean(veri?.author))
  );
}

// Yazı işleri zincirinin yazısı: uretim yazi-isleri ve sahibin yazısı değil.
export function zincirYazisiMi(veri) {
  return veri?.uretim === ZINCIR_URETIMI && !sahipYazisiMi(veri);
}

export function hataBildirAdresi(baslik, adres) {
  return `mailto:${HATA_ADRESI}?subject=${encodeURIComponent(`Hata bildirimi: ${baslik}`)}&body=${encodeURIComponent(adres)}`;
}

// Sahibin yazısında satirlar = "Bu yazı nasıl hazırlandı" satırları (analizde yöntem satırı da); ötekilerde null.
export function yapayZekaNotu(veri, baslik, adres) {
  const sahip = sahipYazisiMi(veri);
  return {
    metin: sahip ? SAHIP_NOTU : zincirYazisiMi(veri) ? ZINCIR_NOTU : BOT_NOTU,
    baglantiMetni: BAGLANTI_METNI,
    baglanti: hataBildirAdresi(baslik, adres),
    satirlar: sahip ? [...NASIL_SATIRLAR, ...(analizMi(veri) ? [YONTEM_SATIRI] : []), ILKE_SATIRI] : null,
  };
}
