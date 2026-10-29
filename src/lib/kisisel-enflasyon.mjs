// Kişisel enflasyon: okurun harcama dağılımıyla, TÜİK ana grup endekslerinden hesaplanan yıllık fiyat değişimi.
//
// Yöntem (sabit ağırlıklı Laspeyres): kişisel yıllık = Σ w(g) × I(g,t) / I(g,t−12) − 1; w kişisel harcama payları, toplamı 1.
// Katkı(g) = 100 × w(g) × (I(g,t)/I(g,t−12) − 1), toplamı kişisel yıllık değişime eşittir.
// TÜİK'in manşet TÜFE'si zincirleme Laspeyres'tir (ağırlıklar her yıl yenilenir, Aralık'a bağlanır); burada ağırlık
// 12 aylık pencere boyunca sabittir. Bu fark, aynı ağırlıklarla bile sonucun manşetten küçük sapmasına yol açar.

export const GRUP_SAYISI = 13;

// Kolay mod: yalnız grubun içeriği tek bir ürün/hizmet türüyse ve cevap "hiç yok" ise o grubu sıfırlar.
// Kalan gruplar TÜİK ağırlıklarının oranında yeniden ölçeklenir. Konut (kira payı) ve ulaştırma (araç payı)
// grup içinde ayrı yayımlanmadığı için bu sorularla değiştirilmez.
export const KOLAY_KURALLAR = [
  { anahtar: 'alkolTutun', grup: '02', soru: 'Alkol ya da tütün ürünü kullanıyor musunuz?' },
  { anahtar: 'egitim', grup: '10', soru: 'Hanede okul, üniversite ya da kurs masrafı olan biri var mı?' },
  { anahtar: 'lokanta', grup: '11', soru: 'Dışarıda yemek yer ya da otelde konaklar mısınız?' },
];

const sayiMi = (v) => typeof v === 'number' && Number.isFinite(v);

// Ham girdiyi (yüzde ya da TL, 13 değer) toplamı 1 olan paylara çevirir. Geçersiz değer hata verir.
export function normallestir(degerler) {
  if (!Array.isArray(degerler) || degerler.length !== GRUP_SAYISI) throw new Error('13 grup değeri gerekli');
  if (degerler.some((v) => !sayiMi(v) || v < 0)) throw new Error('Değerler sayı ve sıfırdan küçük olmayan olmalı');
  const toplam = degerler.reduce((a, b) => a + b, 0);
  if (!(toplam > 0)) throw new Error('Toplam sıfırdan büyük olmalı');
  return degerler.map((v) => v / toplam);
}

const grupOrani = (endeksler, t, i) => endeksler[t].g[i] / endeksler[t - 12].g[i];

// endeksler: eskiden yeniye [{ yil, ay, genel, g: [13] }]; t: endeksler içindeki konum (≥ 12). w: toplamı 1 olan paylar.
export function kisiselYillik(endeksler, w, t = endeksler.length - 1) {
  if (!(t >= 12 && t < endeksler.length)) throw new Error('12 ay öncesi endeks yok');
  let p = 0;
  for (let i = 0; i < GRUP_SAYISI; i++) p += w[i] * grupOrani(endeksler, t, i);
  return (p - 1) * 100;
}

// Son `adet` ay için kişisel ve manşet yıllık değişim (eskiden yeniye).
export function kisiselSeri(endeksler, w, adet = 12) {
  const out = [];
  for (let t = endeksler.length - adet; t < endeksler.length; t++) {
    out.push({
      yil: endeksler[t].yil,
      ay: endeksler[t].ay,
      kisisel: kisiselYillik(endeksler, w, t),
      manset: (endeksler[t].genel / endeksler[t - 12].genel - 1) * 100,
    });
  }
  return out;
}

// Son aydaki grup grup pay (%), grubun kendi yıllık değişimi (%) ve kişisel katkı (yüzde puan).
export function grupKatkilari(endeksler, w) {
  const t = endeksler.length - 1;
  return w.map((wg, i) => {
    const degisim = (grupOrani(endeksler, t, i) - 1) * 100;
    return { pay: wg * 100, degisim, katki: wg * degisim };
  });
}

// Aylık TL tutarlardan yüzde paylar: tutar / toplam × 100.
export const tutarlardanPay = (tutarlar) => normallestir(tutarlar).map((v) => v * 100);

// Kolay mod başlangıcı: TÜİK ağırlıklarından, "hayır" denen sorulardaki grubu sıfırlar; sonuç yüzde, toplamı 100.
// cevaplar: { alkolTutun: bool, egitim: bool, lokanta: bool } (true = var). Verilmeyen soru "var" sayılır.
export function kolayBaslangic(tuikAgirlik, gruplar, cevaplar = {}) {
  const w = tuikAgirlik.map((v) => v);
  for (const k of KOLAY_KURALLAR) {
    if (cevaplar[k.anahtar] === false) {
      const i = gruplar.findIndex((g) => g.kod === k.grup);
      if (i >= 0) w[i] = 0;
    }
  }
  return normallestir(w).map((v) => v * 100);
}

// Adres çubuğu: ?m=y|t&w=a,b,… (13 değer). Geçersizse null.
export function adresCoz(arama) {
  const p = new URLSearchParams(arama);
  const ham = p.get('w');
  if (!ham) return null;
  const parcalar = ham.split(',');
  if (parcalar.length !== GRUP_SAYISI) return null;
  const degerler = parcalar.map((s) => (s.trim() === '' ? 0 : Number(s)));
  if (degerler.some((v) => !sayiMi(v) || v < 0 || v > 1e12)) return null;
  if (!(degerler.reduce((a, b) => a + b, 0) > 0)) return null;
  return { mod: p.get('m') === 't' ? 't' : 'y', degerler };
}

const kisalt = (v) => String(Math.round(v * 100) / 100);
export function adresYaz(mod, degerler) {
  return `?m=${mod === 't' ? 't' : 'y'}&w=${degerler.map((v) => (sayiMi(v) ? kisalt(v) : '0')).join(',')}`;
}
