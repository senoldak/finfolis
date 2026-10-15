// Haber görselleri yalnızca haber yeniyken önemli (anasayfa ve Telegram gönderisi).
// GORSEL_GUN günden eski haberler derlemede kapaksız çıkar; dist'teki dosya sayısı şişmesin diye.
// Kaynak resimler src/content'te kalır.
export const GORSEL_GUN = 14;

export const gorselVar = (tarih, simdi = new Date()) =>
  simdi.getTime() - new Date(tarih).getTime() <= GORSEL_GUN * 86_400_000;
