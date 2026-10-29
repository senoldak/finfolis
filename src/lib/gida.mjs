// Gıda Fiyatları Göstergesi (/veri/gida-fiyatlari/): İzmir hal bülteninden taze meyve ve sebze toptan fiyat endeksi.
// Veri src/data/hal-fiyat.json (Tahmin sayfasının hal kalemiyle aynı dosya, bot zincirinde güncellenir); ağ isteği yok.
//
//  - Aylık fiyat: ürünün ayın ilk GUN_SINIRI günündeki bülten fiyatlarının geometrik ortalaması.
//  - Aylık değişim: iki ardışık ayda da fiyatı olan ürünlerin log oranlarının ortalaması (Jevons, ağırlıksız); |log oran|
//      > ln 3 atılır, en az 5 ürün gerekir (hal.mjs halDegisimleri, Tahmin sayfasıyla aynı hesap).
//  - Yıllık değişim: ayın ürünleri bir yıl önceki aynı ayın aynı ürünleriyle doğrudan karşılaştırılır (log oranların
//      ortalaması, en az 5 ürün; |log oran| > ln 10 atılır). Aylık değişimler zincirlenmez: mevsimlik ürünler girip
//      çıktıkça zincir kayar (2019-2026'da meyvede yıllık farkı ~15 puan), doğrudan karşılaştırma bunu yapmaz.
// Ağırlık yoktur; TÜİK'in tüketici fiyatları endeksi ya da onun bir alt kalemi değildir.
import { EN_AZ_URUN, GUN_SINIRI, halDegisimleri, yuzdeye } from './tahmin/hal.mjs';

export const GRUPLAR = ['toplam', 'sebze', 'meyve'];
const ayNo = (ay) => Number(ay.slice(0, 4)) * 12 + Number(ay.slice(5, 7)) - 1;
const medyan = (x) => {
  const s = [...x].sort((a, b) => a - b);
  const n = s.length;
  return n === 0 ? null : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

const LN10 = Math.log(10);
const logOrtalama = (a, b, grup, sinir) => {
  const x = Object.keys(a)
    .filter((k) => k in b && (grup === 'toplam' || k.startsWith(`${grup}|`)))
    .map((k) => Math.log(a[k][0] / b[k][0]))
    .filter((v) => Math.abs(v) <= sinir);
  return x.length >= EN_AZ_URUN ? { deger: x.reduce((p, c) => p + c, 0) / x.length, n: x.length } : null;
};

// [{ ay, t, gun, aylik: {toplam, sebze, meyve}, yillik: {...}, urun: { aylik: {...}, yillik: {...} } }], değerler yüzde.
export function degisimSerisi(aylar) {
  const deg = halDegisimleri(aylar);
  return Object.keys(aylar)
    .sort()
    .map((ay) => {
      const once = aylar[oncekiAy(ay, 12)]?.urunler;
      const r = { ay, t: ayNo(ay), gun: aylar[ay].gunler.length, aylik: {}, yillik: {}, urun: { aylik: deg[ay]?.urun ?? {}, yillik: {} } };
      for (const g of GRUPLAR) {
        r.aylik[g] = deg[ay]?.[g] != null ? yuzdeye(deg[ay][g]) : null;
        const y = once ? logOrtalama(aylar[ay].urunler, once, g, LN10) : null;
        r.yillik[g] = y ? yuzdeye(y.deger) : null;
        if (y) r.urun.yillik[g] = y.n;
      }
      return r;
    });
}

// Gösterilecek son ay: ilk GUN_SINIRI günü kapanmış ve en az enAzGun bülteni olan en yeni ay. bugun: 'YYYY-MM-DD'.
export function sonKapaliAy(aylar, bugun, enAzGun = 5) {
  return (
    Object.keys(aylar)
      .sort()
      .reverse()
      .find((ay) => (bugun.slice(0, 7) > ay || Number(bugun.slice(8, 10)) > GUN_SINIRI) && aylar[ay].gunler.length >= enAzGun) ??
    null
  );
}

// Ürün tablosu: ayda fiyatı olan her ürün için birim fiyat (TL), geçen aya ve bir yıl öncesine göre değişim (yüzde).
// adlar: { 'sebze|175': 'DOMATES' }. Aynı ürünün birden çok birimi (KG, ADET, BAĞ) ayrı satırdır.
export function urunTablosu(aylar, adlar, ay) {
  const u = aylar[ay]?.urunler ?? {};
  const onceAy = aylar[oncekiAy(ay, 1)]?.urunler ?? {};
  const yilOnce = aylar[oncekiAy(ay, 12)]?.urunler ?? {};
  return Object.entries(u)
    .map(([k, [fiyat, gun]]) => {
      const [grup, id, birim] = k.split('|');
      const d = (x) => (x?.[0] > 0 ? 100 * (fiyat / x[0] - 1) : null);
      return { anahtar: k, grup, ad: adlar[`${grup}|${id}`] ?? `Ürün ${id}`, birim, fiyat, gun, aylik: d(onceAy[k]), yillik: d(yilOnce[k]) };
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr') || a.birim.localeCompare(b.birim, 'tr'));
}

// Ürün değişimlerinin dağılımı (ürün tablosundan, aylık): artan, azalan, değişmeyen ürün sayısı ve medyan.
export function dagilim(tablo, alan = 'aylik') {
  const x = tablo.map((r) => r[alan]).filter((v) => v != null);
  return {
    n: x.length,
    artan: x.filter((v) => v > 0.05).length,
    azalan: x.filter((v) => v < -0.05).length,
    medyan: medyan(x),
  };
}

export function oncekiAy(ay, k) {
  const n = ayNo(ay) - k;
  return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
}
