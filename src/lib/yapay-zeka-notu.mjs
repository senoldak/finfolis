// Haber sayfasının sonundaki tek yapay zekâ notu ve "Hata bildir" bağlantısı (standartlar).
// Bot haberi (haber, bülten, derleme, karne) ile sahibin adıyla çıkan yazı farklı not alır.
import { aciklayiciMi } from './yazi-turu.mjs';

export const HATA_ADRESI = 'contact@finfolis.com';
export const SAHIP_ADI = 'Şenol Dak';
export const BOT_NOTU = 'Bu haber yapay zekâ ile otomatik yazıldı ve otomatik denetimden geçti.';
export const SAHIP_NOTU = 'Yazım ve dil düzeltmesinde yapay zekâ araçları kullanıldı. Bütün rakamlar resmî kaynaklardan alındı ve kontrol edildi.';
export const BAGLANTI_METNI = 'Hata bildir →';

// Yazar Şenol Dak olan ya da yazı türü açıklayıcı/referans olan yazı sahibin yazısıdır; öteki hepsi bot yazısıdır.
export function sahipYazisiMi(veri) {
  return veri?.author === SAHIP_ADI || aciklayiciMi(veri) || (veri?.uretim === 'editor' && Boolean(veri?.author));
}

export function hataBildirAdresi(baslik, adres) {
  return `mailto:${HATA_ADRESI}?subject=${encodeURIComponent(`Hata bildirimi: ${baslik}`)}&body=${encodeURIComponent(adres)}`;
}

export function yapayZekaNotu(veri, baslik, adres) {
  return {
    metin: sahipYazisiMi(veri) ? SAHIP_NOTU : BOT_NOTU,
    baglantiMetni: BAGLANTI_METNI,
    baglanti: hataBildirAdresi(baslik, adres),
  };
}
