// Resmi serilerden türetilen göstergeler (finfolis hesaplaması). Girdiler TCMB/TÜİK rakamlarıdır; burada yalnız
// sayfalardaki yöntem notunda yazan dönüşümler yapılır. Oranlar yüzde olarak girer ve çıkar (12,5 = %12,5).

// n dönemlik değişimi yıllığa çevirir: dönem başına oran r ise (1 + r)^yilda − 1.
export const yilliklandir = (oran, yilda) => ((1 + oran / 100) ** yilda - 1) * 100;

// Haftalık kurda `hafta` haftalık değişimin yıllıklandırılmış hızı. Satır: { tarih, [alan]: kur }. Yılda 52 hafta sayılır.
// İlk `hafta` satırın karşılaştıracak değeri olmadığı için çıktı o kadar kısadır.
export function kurHizi(satirlar, alan, hafta) {
  const out = [];
  for (let i = hafta; i < satirlar.length; i++) {
    const once = satirlar[i - hafta][alan];
    const simdi = satirlar[i][alan];
    out.push({ tarih: satirlar[i].tarih, hiz: yilliklandir((simdi / once - 1) * 100, 52 / hafta) });
  }
  return out;
}

// Enflasyon hızı: mevsim etkisinden arındırılmış aylık TÜFE değişiminin yıllıklandırılmışı ve son üç ayın birlikte
// yıllıklandırılmışı. tufe: [{ yil, ay, yillik, aylik }] (ham, TÜİK); arindirilmis: [{ yil, ay, aylik }]. Arındırılmış
// değeri olmayan ayda (ya da önceki iki ayı eksikse üç aylıkta) hız null'dur.
export function enflasyonHizi(tufe, arindirilmis) {
  const ma = new Map(arindirilmis.map((s) => [s.yil * 12 + s.ay, s.aylik]));
  return tufe.map((s) => {
    const k = s.yil * 12 + s.ay;
    const uc = [k - 2, k - 1, k].map((x) => ma.get(x));
    const ucAylik = uc.every((x) => x != null) ? (uc.reduce((c, x) => c * (1 + x / 100), 1) - 1) * 100 : null;
    const maAylik = ma.get(k) ?? null;
    return {
      yil: s.yil,
      ay: s.ay,
      yillik: s.yillik,
      aylik: s.aylik,
      maAylik,
      aylikHiz: maAylik == null ? null : yilliklandir(maAylik, 12),
      ucAylikHiz: ucAylik == null ? null : yilliklandir(ucAylik, 4),
    };
  });
}

// Reel faiz (Fisher): (1 + faiz) / (1 + enflasyon) − 1.
export const reelFaiz = (faiz, enflasyon) => ((1 + faiz / 100) / (1 + enflasyon / 100) - 1) * 100;

// Politika faizi geçmişi (değişiklik tarihleri) içinde, verilen ayın son günü geçerli oran; o güne kadar karar yoksa null.
export function ayinFaizi(gecmis, yil, ay) {
  const sonGun = new Date(Date.UTC(yil, ay, 0)).toISOString().slice(0, 10);
  let oran = null;
  for (const g of gecmis) if (g.tarih <= sonGun) oran = g.oran;
  return oran;
}

// Kira çarpanı: m² satış fiyatının yıllık m² kirasına oranı (aylık kira × 12). Kaç yıllık kiranın fiyata eşit olduğu.
export const kiraCarpani = (fiyat, aylikKira) => fiyat / (aylikKira * 12);

// Son n dönemin toplamı (12 aylık birikimli cari denge, 52 haftalık portföy akımı gibi). İlk n − 1 satırda null.
export function kayanToplam(satirlar, alan, n) {
  let t = 0;
  return satirlar.map((s, i) => {
    t += s[alan];
    if (i >= n) t -= satirlar[i - n][alan];
    return i >= n - 1 ? t : null;
  });
}

// Baştan birikimli toplam: her satırda o satıra kadar olan değerlerin toplamı.
export function kumulatif(satirlar, alan) {
  let t = 0;
  return satirlar.map((s) => (t += s[alan]));
}

// Nominal yıllık değişimi aynı ayın yıllık TÜFE'siyle reele çevirir (Fisher ile aynı dönüşüm).
export const reelDegisim = reelFaiz;
