// Tahmin arşivi: yalnız ekleme yapılır. Aynı model sürümü ve hedef dönem için ilk kayıt kalır; sonraki çalıştırmalar
// onu değiştiremez. Model değişince sürüm adı değişir, eski sürümün kayıtları ve karnesi yerinde durur.
export const ARSIV_ACIKLAMA =
  'finfolis tahmin arşivi. Yalnız ekleme yapılır; kayıt değiştirilmez ve silinmez. Her kayıt yayımlandığı gün ve model sürümüyle tutulur. Model tahminidir, yatırım tavsiyesi değildir.';

export function arsiveEkle(arsiv, yeniKayitlar) {
  const var_ = new Set(arsiv.kayitlar.map((k) => `${k.surum}|${k.hedef}`));
  const eklenecek = yeniKayitlar.filter((k) => !var_.has(`${k.surum}|${k.hedef}`));
  if (eklenecek.length === 0 && arsiv.aciklama === ARSIV_ACIKLAMA) return arsiv;
  return { aciklama: ARSIV_ACIKLAMA, kayitlar: [...arsiv.kayitlar, ...eklenecek] };
}

// Canlı karne: gerçekleşmesi gelen arşiv kayıtları. gercekBul(kayit) → sayı ya da null.
export function canliKarne(kayitlar, gercekBul) {
  const olculen = kayitlar
    .map((k) => ({ ...k, gercek: gercekBul(k) }))
    .filter((k) => k.gercek != null && k.tahmin != null);
  if (olculen.length === 0) return { n: 0, kayitlar: [] };
  const hata = olculen.map((k) => k.gercek - k.tahmin);
  return {
    n: olculen.length,
    rmse: Math.sqrt(hata.reduce((t, e) => t + e * e, 0) / hata.length),
    kapsama80: olculen.filter((k) => k.gercek >= k.a80[0] && k.gercek <= k.a80[1]).length / olculen.length,
    kapsama95: olculen.filter((k) => k.gercek >= k.a95[0] && k.gercek <= k.a95[1]).length / olculen.length,
    kayitlar: olculen,
  };
}
