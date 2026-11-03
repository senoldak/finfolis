// Sayfa özeti: tablo satırlarından başlık kartları ve puan dağılımı. Yalnız bilinen sütunlara bakar.
export const YUKSEK_PUAN = 60;
const PUAN_BANTLARI = [
  { etiket: '20–39', alt: 20, ust: 39 },
  { etiket: '40–59', alt: 40, ust: 59 },
  { etiket: '60–79', alt: 60, ust: 79, vurgu: true },
  { etiket: '80–100', alt: 80, ust: 100, vurgu: true },
];

const sayiMi = (v) => typeof v === 'number' && Number.isFinite(v);

export function ozetKartlari(veri) {
  const satirlar = veri.satirlar ?? [];
  const sutun = (k) => (veri.sutunlar ?? []).find((s) => s.anahtar === k);
  const kartlar = [{ etiket: 'Satır', deger: satirlar.length }];

  if (sutun('islem')) {
    // Her işlem türü kendi satır sayısı ve tutar toplamıyla: alım ve satış tutarları karışmaz.
    const gruplar = new Map();
    for (const r of satirlar) {
      if (r.islem == null) continue;
      const g = gruplar.get(r.islem) ?? { deger: 0, tutar: 0 };
      g.deger += 1;
      if (sayiMi(r.tutar)) g.tutar += r.tutar;
      gruplar.set(r.islem, g);
    }
    for (const [etiket, g] of gruplar) {
      kartlar.push({ etiket, deger: g.deger, alt: sutun('tutar') ? { tutar: g.tutar } : undefined });
    }
  }

  let puanBantlari = null;
  if (sutun('puan')) {
    const puanlar = satirlar.map((r) => r.puan).filter(sayiMi);
    if (puanlar.length) {
      const yuksek = puanlar.filter((p) => p >= YUKSEK_PUAN).length;
      kartlar.push({ etiket: `Puanı ${YUKSEK_PUAN} ve üstü`, deger: yuksek, vurgu: true });
      puanBantlari = PUAN_BANTLARI.map((b) => ({
        ...b,
        deger: puanlar.filter((p) => p >= b.alt && p <= b.ust).length,
      }));
    }
  }
  return { kartlar, puanBantlari };
}
