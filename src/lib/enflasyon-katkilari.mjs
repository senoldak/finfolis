// TÜFE ana harcama gruplarının yıllık ve aylık enflasyona katkısı (yüzde puan).
//
// Yöntem: TÜİK TÜFE, zincirleme Laspeyres endeksidir. Her yılın ağırlıkları o yılın Aralık ayına bağlanır:
//   I(t) = I(Aralık, y-1) × Σ w(g, y) × [ I(g, t) / I(g, Aralık y-1) ],   w toplamı 1 (TÜİK ana grup ağırlıkları).
// Bu bir toplam olduğundan her grubun payı doğrudan ayrılabilir. Yıl sınırını aşan yıllık değişim iki parçaya bölünür:
//   yıllık katkı(g) = 100 × [ w(g,y)·I(Aralık y-1)·(r(g,t) − 1)  +  (B(g, Aralık y-1) − B(g, t-12)) ] / I(t-12)
//   r(g,t) = I(g,t) / I(g, Aralık y-1);  B(g,s) = I(Aralık y-2)·w(g,y-1)·I(g,s)/I(g, Aralık y-2)  (s, y-1 yılında).
// Parçaların toplamı (I(t) − I(t-12)) / I(t-12) olduğundan katkılar toplamı manşet yıllık değişime eşittir; fark yalnızca
// EVDS'nin yayımladığı endeks değerlerinin yuvarlanmasından gelir. Aylık katkı aynı mantıkla:
//   aylık katkı(g) = 100 × w(g,y)·I(Aralık y-1)·(r(g,t) − r(g,t-1)) / I(t-1)   (Ocak'ta r(g,t-1) = 1).
// Bu ayrıştırma TÜİK'in zincirleme Laspeyres tanımının cebirsel sonucudur; TÜİK'in kendi yayımladığı bir "katkı"
// tablosunu kullanmaz. Doğruluk, 2024-2026 aylarında endeksin ağırlıklarla yeniden kurulabildiği (fark < 0,01 puan)
// denetimle gösterilmiştir.

export const GRUPLAR = [
  { kod: '01', ad: 'Gıda ve alkolsüz içecekler' },
  { kod: '02', ad: 'Alkollü içecekler ve tütün' },
  { kod: '03', ad: 'Giyim ve ayakkabı' },
  { kod: '04', ad: 'Konut, su, elektrik, gaz ve diğer yakıtlar' },
  { kod: '05', ad: 'Mobilya, ev eşyası ve ev bakımı' },
  { kod: '06', ad: 'Sağlık' },
  { kod: '07', ad: 'Ulaştırma' },
  { kod: '08', ad: 'Bilgi ve iletişim' },
  { kod: '09', ad: 'Eğlence, spor ve kültür' },
  { kod: '10', ad: 'Eğitim hizmetleri' },
  { kod: '11', ad: 'Lokantalar ve konaklama' },
  { kod: '12', ad: 'Sigorta ve finansal hizmetler' },
  { kod: '13', ad: 'Kişisel bakım ve çeşitli mal ve hizmetler' },
];

const yuvarla = (n, k = 3) => Math.round(n * 10 ** k) / 10 ** k;
const ak = (yil, ay) => yil * 12 + ay - 1;

// endeks: [{ yil, ay, genel, g: [grup endeksleri, GRUPLAR sırasıyla] }]; agirlik: { [yil]: [yüzde ağırlıklar] }.
export function katkilariHesapla(endeks, agirlik, yil, ay) {
  const harita = new Map(endeks.map((e) => [ak(e.yil, e.ay), e]));
  const al = (y, a) => {
    const e = harita.get(ak(y, a));
    if (!e || e.genel == null || !Array.isArray(e.g) || e.g.length !== GRUPLAR.length || e.g.some((v) => !Number.isFinite(v))) {
      throw new Error(`Endeks eksik: ${y}-${a}`);
    }
    return e;
  };
  const agirlikAl = (y) => {
    const w = agirlik[y];
    if (!Array.isArray(w) || w.length !== GRUPLAR.length || w.some((v) => !Number.isFinite(v))) throw new Error(`Ağırlık eksik: ${y}`);
    const toplam = w.reduce((a, b) => a + b, 0);
    if (Math.abs(toplam - 100) > 0.01) throw new Error(`Ağırlıklar ${y} için 100 etmiyor: ${toplam}`);
    return w;
  };

  const t = al(yil, ay);
  const aralik = al(yil - 1, 12);
  const w = agirlikAl(yil);
  const r = (e) => e.g.map((v, i) => v / aralik.g[i]);
  const rt = r(t);

  // Yıllık
  const t12 = al(yil - 1, ay);
  let yillik;
  if (ay === 12) {
    yillik = w.map((wg, i) => (wg / 100) * aralik.genel * (rt[i] - 1) / t12.genel * 100);
  } else {
    const aralik2 = al(yil - 2, 12);
    const w1 = agirlikAl(yil - 1);
    const B = (e) => e.g.map((v, i) => aralik2.genel * (w1[i] / 100) * (v / aralik2.g[i]));
    const Bd = B(aralik);
    const B12 = B(t12);
    yillik = w.map((wg, i) => (((wg / 100) * aralik.genel * (rt[i] - 1) + (Bd[i] - B12[i])) / t12.genel) * 100);
  }

  // Aylık
  const oncekiAy = ay === 1 ? { y: yil - 1, a: 12 } : { y: yil, a: ay - 1 };
  const onceki = al(oncekiAy.y, oncekiAy.a);
  const ro = ay === 1 ? aralik.g.map(() => 1) : r(onceki);
  const aylik = w.map((wg, i) => (((wg / 100) * aralik.genel * (rt[i] - ro[i])) / onceki.genel) * 100);

  const topla = (d) => d.reduce((a, b) => a + b, 0);
  const manset = { yillik: (t.genel / t12.genel - 1) * 100, aylik: (t.genel / onceki.genel - 1) * 100 };
  return {
    yil,
    ay,
    manset: { yillik: yuvarla(manset.yillik, 2), aylik: yuvarla(manset.aylik, 2) },
    yillikKatki: yillik.map((v) => yuvarla(v)),
    aylikKatki: aylik.map((v) => yuvarla(v)),
    yillikToplam: yuvarla(topla(yillik)),
    aylikToplam: yuvarla(topla(aylik)),
    // Katkılar toplamı ile manşet değişim farkı (puan): EVDS endeks değerlerinin yuvarlanmasından gelir.
    yillikFark: yuvarla(topla(yillik) - manset.yillik),
    aylikFark: yuvarla(topla(aylik) - manset.aylik),
    grupYillik: t.g.map((v, i) => yuvarla((v / t12.g[i] - 1) * 100, 2)),
    grupAylik: t.g.map((v, i) => yuvarla((v / onceki.g[i] - 1) * 100, 2)),
  };
}

// Son `adet` ayın katkıları, eskiden yeniye. sonYil/sonAy: elde tam veri olan son ay.
export function katkiSerisi(endeks, agirlik, sonYil, sonAy, adet = 24) {
  const out = [];
  let k = ak(sonYil, sonAy) - (adet - 1);
  for (let i = 0; i < adet; i++, k++) out.push(katkilariHesapla(endeks, agirlik, Math.floor(k / 12), (k % 12) + 1));
  return out;
}

// Tam veri olan en son ay: genel ve 13 grubun hepsi dolu, o yılın ağırlığı var.
export function sonTamAy(endeks, agirlik) {
  const tam = endeks
    .filter((e) => e.genel != null && Array.isArray(e.g) && e.g.length === GRUPLAR.length && e.g.every((v) => Number.isFinite(v)) && agirlik[e.yil])
    .sort((a, b) => ak(a.yil, a.ay) - ak(b.yil, b.ay));
  const s = tam.at(-1);
  return s ? { yil: s.yil, ay: s.ay } : null;
}

// Sayfaların (ör. kişisel enflasyon hesaplayıcı) kullanacağı grup endeks düzeyleri: son `adet` ay, eskiden yeniye.
// Her satır: { yil, ay, genel, g: [13 grup endeksi] } (TÜİK, 2025=100). Eksik ay varsa hata verir.
export function sonEndeksler(endeks, sonYil, sonAy, adet = 25) {
  const harita = new Map(endeks.map((e) => [ak(e.yil, e.ay), e]));
  const out = [];
  let k = ak(sonYil, sonAy) - (adet - 1);
  for (let i = 0; i < adet; i++, k++) {
    const e = harita.get(k);
    if (!e || !Number.isFinite(e.genel) || !Array.isArray(e.g) || e.g.length !== GRUPLAR.length || e.g.some((v) => !Number.isFinite(v))) {
      throw new Error(`Endeks eksik: ${Math.floor(k / 12)}-${(k % 12) + 1}`);
    }
    out.push({ yil: e.yil, ay: e.ay, genel: e.genel, g: e.g.map((v) => yuvarla(v, 4)) });
  }
  return out;
}
