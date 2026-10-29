// Tahmin sayfasının modelleri ve örneklem dışı sınaması. Her model genişleyen pencereyle sınanır: t ayının tahmini
// yalnız t'den önceki gözlemlerle kurulan modelden gelir. Tabanlar karar notundaki gibidir. Yayın kapısı: modelin
// örneklem dışı RMSE'si (PPK'da Brier puanı) her tabanınkinden düşük değilse model rakam vermez.
//
// Sınama, verinin bugünkü (düzeltilmiş) hâliyle yapılır; o gün yayımlanan ilk rakamlarla değil. Bu yüzden karne gerçek
// zamanlı başarıyı biraz iyi gösterebilir; canlı karne arşivden (tahmin-arsivi.json) ayrıca tutulur.
import { ekk, tCarpani, rmse, ortalama, yuzdelik, siraliProbit, normalDF } from './istatistik.mjs';

export const SURUMLER = {
  tufe: 'tufe-v1',
  cari: 'cari-v1',
  sanayi: 'sanayi-v1',
  ppk: 'ppk-v1',
  yol: 'yol-v1',
  taylor: 'taylor-v1',
};

export const ak = (s) => s.yil * 12 + (s.ay - 1);
export const akdenAy = (t) => ({ yil: Math.floor(t / 12), ay: (t % 12) + 1 });
const ayKuklalari = (t) => Array.from({ length: 11 }, (_, i) => ((t % 12) === i + 1 ? 1 : 0));
const yuvarla = (n, b = 2) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** b) / 10 ** b);
const harita = (satirlar, f) => new Map(satirlar.filter((s) => f(s) != null).map((s) => [ak(s), f(s)]));

// --- Genel EKK sınaması ---------------------------------------------------------------------------------------------
// gozlemler: [{ t, y, x: [...] , bazlar: { ad: deger } }] t'ye göre sıralı. y'si null olan son gözlem "şimdi" tahminidir.
// enAz: modelin kurulması için gereken en az gözlem.
// Aralık: ampirik (varsayılan) ise t ayının aralığı, t'den önce yapılmış örneklem dışı tahminlerin mutlak hatalarının
// %80 ve %95 yüzdeliklerinden kurulur (en az enAzHata hata birikene kadar EKK öngörü aralığı kullanılır).
export function ekkSinama(gozlemler, { basla, enAz = 36, aralik = 'ampirik', enAzHata = 24 }) {
  const sonuclar = [];
  const hatalar = [];
  let simdi = null;
  for (let i = 0; i < gozlemler.length; i++) {
    const g = gozlemler[i];
    if (g.t < basla && g.y != null) continue;
    const egitim = gozlemler.slice(0, i).filter((o) => o.y != null);
    if (egitim.length < enAz) continue;
    const m = ekk(egitim.map((o) => o.x), egitim.map((o) => o.y));
    if (!m) continue;
    const nokta = m.tahmin(g.x);
    const sh = m.ongoruSh(g.x);
    const ampirik = aralik === 'ampirik' && hatalar.length >= enAzHata;
    const a80 = ampirik ? yuzdelik(hatalar, 0.8) : tCarpani(0.8, m.serbestlik) * sh;
    const a95 = ampirik ? yuzdelik(hatalar, 0.95) : tCarpani(0.95, m.serbestlik) * sh;
    const kayit = { t: g.t, tahmin: nokta, a80: [nokta - a80, nokta + a80], a95: [nokta - a95, nokta + a95], bazlar: g.bazlar };
    if (g.y == null) simdi = kayit;
    else {
      sonuclar.push({ ...kayit, gercek: g.y });
      if (g.t >= basla) hatalar.push(Math.abs(g.y - nokta));
    }
  }
  return { sonuclar, simdi };
}

// Karne: model ve tabanların ortak örneklemdeki RMSE'si, aralık kapsama oranları, kapı kararı.
export function karne(sonuclar, bazAdlari, { sonAy = 24 } = {}) {
  const ortak = sonuclar.filter((s) => bazAdlari.every((b) => s.bazlar[b] != null));
  const ozet = (dizi) => {
    if (dizi.length === 0) return null;
    const model = rmse(dizi.map((s) => s.gercek - s.tahmin));
    const bazlar = Object.fromEntries(bazAdlari.map((b) => [b, rmse(dizi.map((s) => s.gercek - s.bazlar[b]))]));
    return {
      n: dizi.length,
      ilk: dizi[0].t,
      son: dizi.at(-1).t,
      model,
      bazlar,
      kapsama80: ortalama(dizi.map((s) => (s.gercek >= s.a80[0] && s.gercek <= s.a80[1] ? 1 : 0))),
      kapsama95: ortalama(dizi.map((s) => (s.gercek >= s.a95[0] && s.gercek <= s.a95[1] ? 1 : 0))),
    };
  };
  const tum = ozet(ortak);
  const son = ozet(ortak.slice(-sonAy));
  const enIyiBaz = tum ? bazAdlari.reduce((a, b) => (tum.bazlar[b] < tum.bazlar[a] ? b : a)) : null;
  // Diebold-Mariano: kare hata farkının ortalaması sıfırdan büyük mü (tek yanlı). Bir adım ileri tahminde fark serisi
  // ilişkisiz varsayılır.
  const dm = Object.fromEntries(
    bazAdlari.map((b) => [b, dieboldMariano(ortak.map((s) => (s.gercek - s.bazlar[b]) ** 2 - (s.gercek - s.tahmin) ** 2))]),
  );
  const gecti = kapiKarari(tum, son, bazAdlari, dm);
  return { tum, son, enIyiBaz, dm, gecti };
}

// Yayın kapısı (gevşetilmez): model her tabanı hem bütün örneklem dışı dönemde hem son 24 ayda geçmeli ve bütün
// dönemdeki üstünlüğü Diebold-Mariano testinde %10 düzeyinde anlamlı olmalı.
export const KAPI_P = 0.1;
function kapiKarari(tum, son, bazAdlari, dm) {
  if (!tum || !son) return false;
  return bazAdlari.every((b) => tum.model < tum.bazlar[b] && son.model < son.bazlar[b] && dm[b].p < KAPI_P);
}

export function dieboldMariano(fark) {
  const n = fark.length;
  if (n < 3) return { n, istatistik: null, p: 1 };
  const m = ortalama(fark);
  const v = fark.reduce((t, d) => t + (d - m) ** 2, 0) / (n - 1);
  const z = v > 0 ? m / Math.sqrt(v / n) : 0;
  return { n, istatistik: z, p: 1 - normalDF(z) };
}

// --- 1. Aylık TÜFE anlık tahmini ------------------------------------------------------------------------------------
// TÜİK aylık = a + b·İTO aylık + c·aylık ortalama dolar kurunun değişimi + ay kuklaları. Tahmin ayın 1'inde, İTO
// açıklanınca yapılır; o ayın kuru ve PKA cari ay beklentisi o gün bilinir.
export function tufeGozlemleri({ tufe, ito, girdi }, buAy) {
  const y = harita(tufe, (s) => s.aylik);
  const it = harita(ito, (s) => s.aylik);
  const usd = harita(girdi, (s) => s.usd);
  const pka = harita(girdi, (s) => s.pkaCari);
  const out = [];
  const ilk = Math.min(...y.keys());
  for (let t = ilk; t < buAy; t++) {
    const kur = usd.get(t) != null && usd.get(t - 1) != null ? 100 * (usd.get(t) / usd.get(t - 1) - 1) : null;
    if (it.get(t) == null || kur == null) continue;
    // Gerçekleşmesi henüz yoksa yalnız tablodaki son aydan hemen sonraki ay "şimdi" tahminidir.
    if (y.get(t) == null && y.get(t - 1) == null) continue;
    out.push({
      t,
      y: y.get(t) ?? null,
      x: [1, it.get(t), kur, ...ayKuklalari(t)],
      bazlar: { pka: pka.get(t) ?? null, ito: it.get(t), gecenYil: y.get(t - 12) ?? null },
    });
  }
  return out;
}

// --- 2. Cari denge anlık tahmini ------------------------------------------------------------------------------------
// Cari denge (milyon $) = a + b·dış ticaret dengesi + ay kuklaları (turizm mevsimi). Dış ticaret o ayın sonunda,
// cari denge bir ay sonra açıklanır.
export function cariGozlemleri({ cari, disTicaret }, buAy) {
  const y = harita(cari, (s) => s.cari);
  const dt = harita(disTicaret, (s) => (s.ihracat != null && s.ithalat != null ? (s.ihracat - s.ithalat) / 1000 : null));
  const out = [];
  for (const t of [...dt.keys()].sort((a, b) => a - b)) {
    if (t >= buAy) continue;
    if (y.get(t) == null && y.get(t - 1) == null) continue;
    out.push({
      t,
      y: y.get(t) ?? null,
      x: [1, dt.get(t), ...ayKuklalari(t)],
      bazlar: { gecenYil: y.get(t - 12) ?? null, disTicaret: dt.get(t) },
    });
  }
  return out;
}

// --- 3. Sanayi üretimi anlık tahmini --------------------------------------------------------------------------------
// Yıllık değişim (takvim etkisinden arındırılmış) = a + b·geçen ayın yıllık değişimi + c·kapasite kullanımındaki yıllık
// fark (puan, arındırılmamış) + d·ara malı ithalatının yıllık değişimi (dolar). Tabanlar: AR(1) ve geçen ay.
export function sanayiGozlemleri({ sanayi, kapasite, disTicaret }, buAy) {
  const y = harita(sanayi, (s) => s.yillik);
  const kko = harita(kapasite, (s) => s.ham);
  const ara = harita(disTicaret, (s) => s.ara);
  const out = [];
  for (const t of [...ara.keys()].sort((a, b) => a - b)) {
    if (t >= buAy) continue;
    const kf = kko.get(t) != null && kko.get(t - 12) != null ? kko.get(t) - kko.get(t - 12) : null;
    const ay = ara.get(t - 12) != null ? 100 * (ara.get(t) / ara.get(t - 12) - 1) : null;
    const once = y.get(t - 1);
    if (kf == null || ay == null || once == null) continue;
    out.push({ t, y: y.get(t) ?? null, x: [1, once, kf, ay], xAr: [1, once], bazlar: { gecenAy: once } });
  }
  return out;
}

// AR(1) tabanı da genişleyen pencereyle kurulur; sonuç gözlemlerin bazlar.ar1 alanına yazılır.
export function ar1Ekle(gozlemler, enAz = 36) {
  return gozlemler.map((g, i) => {
    const egitim = gozlemler.slice(0, i).filter((o) => o.y != null);
    if (egitim.length < enAz) return g;
    const m = ekk(egitim.map((o) => o.xAr), egitim.map((o) => o.y));
    return { ...g, bazlar: { ...g.bazlar, ar1: m ? m.tahmin(g.xAr) : null } };
  });
}

// --- 4. PPK karar yönü olasılığı ------------------------------------------------------------------------------------
// Sıralı probit, üç sınıf (0 indirim, 1 sabit, 2 artırım). Girdiler: bir önceki karar metninin ileriye dönük tonu,
// son kararın yönü, toplantı öncesi reel faiz (politika faizi eksi bir önceki ayın PKA 12 ay sonrası enflasyon beklentisi).
// Adım büyüklüğü tahmin edilmez.
export const PPK_SINIFLAR = ['indirim', 'sabit', 'artirim'];

export function ppkKararlari({ belgeler, puanlar, faizGecmisi, beklenti }) {
  const kararlar = belgeler.filter((b) => b.tur === 'karar').sort((a, b) => a.tarih.localeCompare(b.tarih));
  const oranOnce = (tarih) => faizGecmisi.filter((f) => f.tarih <= tarih).at(-1)?.oran ?? null;
  const gun = (t, n) => new Date(Date.parse(`${t}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  const pka12 = harita(beklenti, (s) => s.ay12);
  return kararlar.map((k) => {
    const once = oranOnce(k.tarih);
    // Faiz tablosunda karar ertesi günden geçerli olur; bir hafta içindeki değişiklik o kararın sonucudur.
    const sonra = faizGecmisi.filter((f) => f.tarih > k.tarih && f.tarih <= gun(k.tarih, 7)).at(-1)?.oran ?? once;
    const yon = once == null ? null : sonra > once ? 2 : sonra < once ? 0 : 1;
    const t = ak({ yil: Number(k.tarih.slice(0, 4)), ay: Number(k.tarih.slice(5, 7)) });
    return { id: k.id, tarih: k.tarih, url: k.url, once, sonra, yon, ton: puanlar[k.id]?.ileriYon ?? null, pka12: pka12.get(t - 1) ?? null };
  });
}

export function ppkGozlemleri(kararlar) {
  const out = [];
  for (let i = 1; i < kararlar.length; i++) {
    const k = kararlar[i];
    const o = kararlar[i - 1];
    if (o.ton == null || o.yon == null || k.pka12 == null || k.once == null) continue;
    out.push({ id: k.id, tarih: k.tarih, y: k.yon, x: [o.ton, o.yon - 1, k.once - k.pka12], son: o.yon });
  }
  return out;
}

// Taban: son kararın yönüne göre geçiş sıklıkları (eğitim örnekleminden, her hücreye 1 eklenerek).
export function markovOlasilik(egitim, son) {
  const say = [1, 1, 1];
  for (const g of egitim) if (g.son === son) say[g.y]++;
  const top = say[0] + say[1] + say[2];
  return say.map((v) => v / top);
}

export const brier = (p, y) => p.reduce((t, v, i) => t + (v - (i === y ? 1 : 0)) ** 2, 0);

export function ppkSinama(gozlemler, sonraki, { enAz = 12, lambda = 1 } = {}) {
  const sonuclar = [];
  for (let i = enAz; i < gozlemler.length; i++) {
    const egitim = gozlemler.slice(0, i);
    const m = siraliProbit(egitim.map((g) => g.x), egitim.map((g) => g.y), { lambda });
    const g = gozlemler[i];
    sonuclar.push({ id: g.id, tarih: g.tarih, gercek: g.y, model: m.olasilik(g.x), baz: markovOlasilik(egitim, g.son), son: g.son });
  }
  let simdi = null;
  if (sonraki && gozlemler.length >= enAz) {
    const m = siraliProbit(gozlemler.map((g) => g.x), gozlemler.map((g) => g.y), { lambda });
    simdi = { ...sonraki, model: m.olasilik(sonraki.x), baz: markovOlasilik(gozlemler, sonraki.son) };
  }
  const n = sonuclar.length;
  const bModel = n ? ortalama(sonuclar.map((s) => brier(s.model, s.gercek))) : null;
  const bBaz = n ? ortalama(sonuclar.map((s) => brier(s.baz, s.gercek))) : null;
  const tekrar = n ? ortalama(sonuclar.map((s) => (s.son === s.gercek ? 1 : 0))) : null;
  const isabet = n ? ortalama(sonuclar.map((s) => (s.model.indexOf(Math.max(...s.model)) === s.gercek ? 1 : 0))) : null;
  // Kalibrasyon: her tahmin edilen olasılık (3 sınıfın hepsi) kovalara ayrılır, kovanın ortalama olasılığı ile
  // gerçekleşme sıklığı karşılaştırılır.
  const kovalar = [
    [0, 0.2],
    [0.2, 0.4],
    [0.4, 0.6],
    [0.6, 0.8],
    [0.8, 1.0001],
  ].map(([a, b]) => {
    const ic = sonuclar.flatMap((s) => s.model.map((p, j) => ({ p, olay: s.gercek === j ? 1 : 0 }))).filter((o) => o.p >= a && o.p < b);
    return { aralik: [a, Math.min(b, 1)], n: ic.length, ortP: ic.length ? ortalama(ic.map((o) => o.p)) : null, siklik: ic.length ? ortalama(ic.map((o) => o.olay)) : null };
  });
  const dm = dieboldMariano(sonuclar.map((s) => brier(s.baz, s.gercek) - brier(s.model, s.gercek)));
  // PPK kapısı: Brier puanı tabandan düşük ve fark anlamlı (gözlem az olduğu için ayrı son 24 karar penceresi yok).
  const gecti = n > 0 && bModel < bBaz && dm.p < KAPI_P;
  return { sonuclar, simdi, karne: { n, brierModel: bModel, brierBaz: bBaz, dm, tekrarIsabet: tekrar, modelIsabet: isabet, kalibrasyon: kovalar, gecti } };
}

// --- 5. Yıllık enflasyon yolu ---------------------------------------------------------------------------------------
// Tahmin değil, baz etkisi aritmetiği: önümüzdeki ayların aylık enflasyonu varsayılınca yıllık enflasyonun yolu.
export function yillikYol(aylikGecmis, varsayimlar) {
  // aylikGecmis: son en az 11 ayın aylık yüzde değişimi (eskiden yeniye); varsayimlar: gelecek ayların aylık yüzdeleri.
  const dizi = [...aylikGecmis];
  return varsayimlar.map((v) => {
    dizi.push(v);
    const son12 = dizi.slice(-12);
    return 100 * (son12.reduce((c, a) => c * (1 + a / 100), 1) - 1);
  });
}

// PKA 12 ay sonrası beklentisinin geçmiş hatası: t ayındaki beklenti ile t+12 ayında gerçekleşen yıllık TÜFE farkı.
// Aralık, t ayında bilinen hataların mutlak değer yüzdeliklerinden kurulur (sapma düzeltmesi yapılmaz; merkez PKA).
export function pkaYolKarnesi({ tufe, girdi }, { enAz = 24 } = {}) {
  const y = harita(tufe, (s) => s.yillik);
  const p = harita(girdi, (s) => s.pka12);
  const hatalar = [...p.keys()]
    .sort((a, b) => a - b)
    .filter((t) => y.get(t + 12) != null)
    .map((t) => ({ t, gercekT: t + 12, hata: y.get(t + 12) - p.get(t) }));
  const sonuclar = [];
  for (const t of [...p.keys()].sort((a, b) => a - b)) {
    const bilinen = hatalar.filter((h) => h.gercekT <= t).map((h) => Math.abs(h.hata));
    if (bilinen.length < enAz) continue;
    const q80 = yuzdelik(bilinen, 0.8);
    const q95 = yuzdelik(bilinen, 0.95);
    sonuclar.push({ t, beklenti: p.get(t), a80: [p.get(t) - q80, p.get(t) + q80], a95: [p.get(t) - q95, p.get(t) + q95], gercek: y.get(t + 12) ?? null });
  }
  const olcu = sonuclar.filter((s) => s.gercek != null);
  return {
    sonuclar,
    hataSayisi: hatalar.length,
    ortalamaHata: hatalar.length ? ortalama(hatalar.map((h) => h.hata)) : null,
    rmse: hatalar.length ? rmse(hatalar.map((h) => h.hata)) : null,
    kapsama80: olcu.length ? ortalama(olcu.map((s) => (s.gercek >= s.a80[0] && s.gercek <= s.a80[1] ? 1 : 0))) : null,
    kapsama95: olcu.length ? ortalama(olcu.map((s) => (s.gercek >= s.a95[0] && s.gercek <= s.a95[1] ? 1 : 0))) : null,
    olcuSayisi: olcu.length,
  };
}

// --- 6. Taylor kuralı bandı -----------------------------------------------------------------------------------------
// i = r* + π + a·(π − π*). Çıktı açığı terimi yoktur (Türkiye için aylık resmi çıktı açığı serisi yok). Varyantlar:
// r* ∈ {1, 2, 3}, a ∈ {0,5; 1}, π ∈ {yıllık TÜFE, PKA 12 ay sonrası beklentisi}; π* = %5 (TCMB'nin enflasyon hedefi).
export const TAYLOR = { rYildiz: [1, 2, 3], a: [0.5, 1], hedef: 5, baslangic: ak({ yil: 2018, ay: 6 }) };

export function taylorVaryantlari(pi, beklenti) {
  const out = [];
  for (const [kaynak, p] of [
    ['tufe', pi],
    ['beklenti', beklenti],
  ]) {
    if (p == null) continue;
    for (const r of TAYLOR.rYildiz) for (const a of TAYLOR.a) out.push({ kaynak, r, a, faiz: r + p + a * (p - TAYLOR.hedef) });
  }
  return out;
}

export function taylorSerisi({ tufe, beklenti, faizGecmisi }) {
  const pi = harita(tufe, (s) => s.yillik);
  const bk = harita(beklenti, (s) => s.ay12);
  const ayFaizi = (t) => {
    const { yil, ay } = akdenAy(t + 1);
    const sinir = `${yil}-${String(ay).padStart(2, '0')}-01`;
    return faizGecmisi.filter((f) => f.tarih < sinir).at(-1)?.oran ?? null;
  };
  const out = [];
  for (const t of [...pi.keys()].sort((a, b) => a - b)) {
    if (t < TAYLOR.baslangic) continue;
    const v = taylorVaryantlari(pi.get(t), bk.get(t) ?? null);
    const f = v.map((x) => x.faiz);
    out.push({ t, alt: Math.min(...f), ust: Math.max(...f), faiz: ayFaizi(t), varyantlar: v });
  }
  return out;
}

export const yuvarlaNesne = (o, b = 2) =>
  JSON.parse(JSON.stringify(o, (_, v) => (typeof v === 'number' && !Number.isInteger(v) ? yuvarla(v, b) : v)));
