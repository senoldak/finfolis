// Taze meyve ve sebze: İzmir hal fiyatlarından TÜİK alt sınıflarının aylık değişimi tahmini (/veri/tahmin/).
// Başvuru uygulaması mecmua/_fiyat-endeksi (aylik_tahmin.py, dogrulama.py, endeks.py); sonuçlar onunla aynı çıkar.
//
//  - Ürün: (grup, MalId, Birim). Yalnız MEYVE ve SEBZE; İTHAL dışarıda. Aylık fiyat = ayın ilk GUN_SINIRI günündeki
//      bülten fiyatlarının geometrik ortalaması.
//  - Hal değişimi = iki ardışık ayda da fiyatı olan ürünlerin log oranlarının ortalaması; |log oran| > ln 3 atılır,
//      en az 5 ürün gerekir.
//  - Hedef: TÜİK TÜFE alt sınıfları (EVDS, 2025=100): meyve 01162-01165, sebze 01171-01175 log değişimlerinin ağırlıksız
//      ortalaması; toplam = (meyve + 2·sebze) / 3. TÜİK'in kendi taze meyve-sebze göstergesi değildir.
//  - Model: hedef = a + b · hal değişimi, bütün geçmişe EKK (genişleyen pencere).
//  - Aralık: son 36 ayın örneklem dışı hatalarının yüzdelikleri, sonlu örneklem düzeltmeli (konformal). Hatalar ilk 12
//      aydan sonra birikmeye başlar; karne 2021 Ocak'tan.
//  - Tabanlar: mevsimsel naif (geçmişte aynı takvim ayının ortalaması) ve geçen ayın aylık değişimi (oncekiAy).
// Hesap log uzayında yapılır, sayfaya yüzde değişim olarak çıkar. Meyve tabanı geçemediği için yayımlanmaz.
import { ortalama } from './istatistik.mjs';

export const GUN_SINIRI = 20;
export const PENCERE = 36;
export const ISINMA = 12;
export const ILK_KARNE = '2021-01';
export const EN_AZ_URUN = 5;
export const EN_AZ_BULTEN = 5;
export const MEYVE = ['01162', '01163', '01164', '01165'];
export const SEBZE = ['01171', '01172', '01173', '01174', '01175'];
export const GRUPLAR = ['toplam', 'sebze'];
const LN3 = Math.log(3);
const HAL_GRUP = { MEYVE: 'meyve', SEBZE: 'sebze' };

const ayNo = (ay) => Number(ay.slice(0, 4)) * 12 + Number(ay.slice(5, 7)) - 1;
export const yuzdeye = (log) => 100 * (Math.exp(log) - 1);

// Bir günün bülteni → { 'sebze|175|KG': fiyat }.
export function bultenFiyatlari(bulten) {
  const out = {};
  for (const s of bulten?.HalFiyatListesi ?? []) {
    const grup = HAL_GRUP[String(s.MalTipAdi ?? '').trim()];
    const fiyat = Number(s.OrtalamaUcret);
    if (!grup || !(fiyat > 0)) continue;
    out[`${grup}|${s.MalId}|${String(s.Birim ?? '').trim().toUpperCase()}`] = fiyat;
  }
  return out;
}

// Aylık özete bir gün ekler: urunler[k] = [geometrik ortalama, gün sayısı]. Aynı gün iki kez eklenmez; ayın
// GUN_SINIRI'nden sonraki günleri ve boş bültenler katılmaz. Yeni özet döner (girdi değişmez); değişmediyse aynısı.
export function gunEkle(aylar, tarih, fiyatlar) {
  const ay = tarih.slice(0, 7);
  if (Number(tarih.slice(8, 10)) > GUN_SINIRI || Object.keys(fiyatlar).length === 0) return aylar;
  const eski = aylar[ay] ?? { gunler: [], urunler: {} };
  if (eski.gunler.includes(tarih)) return aylar;
  const urunler = { ...eski.urunler };
  for (const [k, p] of Object.entries(fiyatlar)) {
    const [g, n] = urunler[k] ?? [1, 0];
    urunler[k] = [Number(Math.exp((n * Math.log(g) + Math.log(p)) / (n + 1)).toPrecision(10)), n + 1];
  }
  return { ...aylar, [ay]: { gunler: [...eski.gunler, tarih].sort(), urunler } };
}

// Ardışık iki ayın ortak ürünlerinden hal değişimi (log): { ay: { toplam, meyve, sebze } } ve ürün sayıları.
export function halDegisimleri(aylar) {
  const sirali = Object.keys(aylar).sort();
  const out = {};
  for (let i = 1; i < sirali.length; i++) {
    const [once, sonra] = [sirali[i - 1], sirali[i]];
    if (ayNo(sonra) - ayNo(once) !== 1) continue;
    const a = aylar[once].urunler;
    const b = aylar[sonra].urunler;
    const r = { urun: {} };
    for (const grup of ['toplam', 'meyve', 'sebze']) {
      const oranlar = Object.keys(a)
        .filter((k) => k in b && (grup === 'toplam' || k.startsWith(`${grup}|`)))
        .map((k) => Math.log(b[k][0] / a[k][0]))
        .filter((x) => Math.abs(x) <= LN3);
      if (oranlar.length >= EN_AZ_URUN) {
        r[grup] = ortalama(oranlar);
        r.urun[grup] = oranlar.length;
      }
    }
    out[sonra] = r;
  }
  return out;
}

// TÜİK alt sınıf düzeyleri ([{ yil, ay, '01162': düzey, ... }]) → { ay: { meyve, sebze, toplam } } log değişim.
export function tuikDegisimleri(satirlar) {
  const sirali = [...satirlar].sort((x, y) => x.yil * 12 + x.ay - (y.yil * 12 + y.ay));
  const out = {};
  for (let i = 1; i < sirali.length; i++) {
    const [o, s] = [sirali[i - 1], sirali[i]];
    if (s.yil * 12 + s.ay - (o.yil * 12 + o.ay) !== 1) continue;
    const ort = (kodlar) => {
      const v = kodlar.filter((k) => s[k] > 0 && o[k] > 0).map((k) => Math.log(s[k] / o[k]));
      return v.length ? ortalama(v) : null;
    };
    const meyve = ort(MEYVE);
    const sebze = ort(SEBZE);
    if (meyve == null || sebze == null) continue;
    out[`${s.yil}-${String(s.ay).padStart(2, '0')}`] = { meyve, sebze, toplam: (meyve + 2 * sebze) / 3 };
  }
  return out;
}

export function ols(x, y) {
  const mx = ortalama(x);
  const my = ortalama(y);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < x.length; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
  }
  const b = sxy / sxx;
  return [my - b * mx, b];
}

// Sonlu örneklem düzeltmeli yüzdelik (konformal): sıralı dizinin ceil((n+1)q). elemanı, sınır dışındaysa en uç.
export function konformalYuzdelik(sirali, q) {
  const n = sirali.length;
  return sirali[Math.min(n - 1, Math.max(0, Math.ceil((n + 1) * q) - 1))];
}

// Örneklem dışı sınama ve güncel tahmin. Değerler yüzde değişim; karne() ile aynı biçim: { t, tahmin, a80, a95,
// gercek, bazlar }. simdiAy: tahmini verilecek ay (TÜİK'i henüz yok, hal değişimi var) ya da null.
export function halSinama(grup, tuik, hal, simdiAy = null) {
  const aylar = Object.keys(tuik)
    .filter((a) => hal[a]?.[grup] != null)
    .sort();
  const hatalar = [];
  const sonuclar = [];
  const aralik = (nokta, havuz) => {
    if (havuz.length === 0) return { a80: null, a95: null };
    const s = [...havuz].sort((x, y) => x - y);
    const uc = (q) => yuzdeye(nokta + konformalYuzdelik(s, q));
    return { a80: [uc(0.1), uc(0.9)], a95: [uc(0.025), uc(0.975)] };
  };
  for (let i = ISINMA; i < aylar.length; i++) {
    const ay = aylar[i];
    const gecmis = aylar.slice(0, i);
    const [a, b] = ols(gecmis.map((g) => hal[g][grup]), gecmis.map((g) => tuik[g][grup]));
    const nokta = a + b * hal[ay][grup];
    const gercek = tuik[ay][grup];
    if (ay >= ILK_KARNE) {
      const ayni = gecmis.filter((g) => g.slice(5) === ay.slice(5)).map((g) => tuik[g][grup]);
      sonuclar.push({
        t: ay,
        tahmin: yuzdeye(nokta),
        ...aralik(nokta, hatalar.slice(-PENCERE)),
        gercek: yuzdeye(gercek),
        hal: yuzdeye(hal[ay][grup]),
        bazlar: { mevsim: yuzdeye(ayni.length ? ortalama(ayni) : 0), oncekiAy: yuzdeye(tuik[gecmis.at(-1)][grup]) },
      });
    }
    hatalar.push(gercek - nokta);
  }
  let simdi = null;
  if (simdiAy && hal[simdiAy]?.[grup] != null && !(simdiAy in tuik)) {
    const gecmis = aylar.filter((g) => g < simdiAy);
    const [a, b] = ols(gecmis.map((g) => hal[g][grup]), gecmis.map((g) => tuik[g][grup]));
    const nokta = a + b * hal[simdiAy][grup];
    simdi = { t: simdiAy, tahmin: yuzdeye(nokta), ...aralik(nokta, hatalar.slice(-PENCERE)), hal: yuzdeye(hal[simdiAy][grup]), egitimAy: gecmis.length };
  }
  return { sonuclar, simdi };
}

// Tahmini verilecek ay: TÜİK'i henüz açıklanmamış en eski hal ayı, ancak ilk GUN_SINIRI günü kapanmışsa (karnedeki
// yöntemle aynı veri) ve en az EN_AZ_BULTEN bülten günü varsa. bugun: İstanbul takvim günü 'YYYY-MM-DD'.
export function simdiAyi(aylar, tuik, hal, bugun) {
  const aday = Object.keys(hal)
    .filter((a) => !(a in tuik))
    .sort()[0];
  if (!aday) return null;
  const kapandi = bugun.slice(0, 7) > aday || Number(bugun.slice(8, 10)) > GUN_SINIRI;
  return kapandi && (aylar[aday]?.gunler.length ?? 0) >= EN_AZ_BULTEN ? aday : null;
}

export const SURUM = { toplam: 'hal-toplam-v1', sebze: 'hal-sebze-v1' };
export const BAZLAR = ['mevsim', 'oncekiAy'];

// tahmin.mjs için: iki grubun karnesi, kapı kararı (karne()'nin kapısı) ve kapıdan geçen grubun güncel tahmini.
// halFiyat: src/data/hal-fiyat.json. bugun: İstanbul takvim günü.
export function halModeli(halFiyat, bugun, karne) {
  const tuik = tuikDegisimleri(halFiyat.tuik);
  const hal = halDegisimleri(halFiyat.aylar);
  const simdiAy = simdiAyi(halFiyat.aylar, tuik, hal, bugun);
  const gruplar = {};
  for (const grup of GRUPLAR) {
    const s = halSinama(grup, tuik, hal, simdiAy);
    const k = karne(s.sonuclar, BAZLAR);
    gruplar[grup] = {
      surum: SURUM[grup],
      gecti: k.gecti,
      karne: k,
      seri: k.gecti ? s.sonuclar.slice(-24).map(({ t, tahmin, a80, a95, gercek, bazlar }) => ({ ay: t, tahmin, a80, a95, gercek, bazlar })) : [],
      simdi: k.gecti && s.simdi ? { ay: s.simdi.t, tahmin: s.simdi.tahmin, a80: s.simdi.a80, a95: s.simdi.a95, hal: s.simdi.hal } : null,
    };
  }
  const sonAy = Object.keys(halFiyat.aylar).sort().at(-1);
  const bilgiAy = simdiAy ?? sonAy;
  return {
    bazlar: BAZLAR,
    gecti: GRUPLAR.some((g) => gruplar[g].gecti),
    gruplar,
    // Yanında yazılacak bilgiler: kapsam, ürün sayısı, derleme günleri.
    bilgi: {
      ay: bilgiAy,
      bultenGunu: halFiyat.aylar[bilgiAy]?.gunler.length ?? 0,
      ilkGun: halFiyat.aylar[bilgiAy]?.gunler[0] ?? null,
      sonGun: halFiyat.aylar[bilgiAy]?.gunler.at(-1) ?? null,
      urun: hal[bilgiAy]?.urun ?? null,
      gunSiniri: GUN_SINIRI,
      pencere: PENCERE,
      sonTuik: Object.keys(tuik).sort().at(-1) ?? null,
      kaynak: halFiyat.kaynak,
    },
  };
}
