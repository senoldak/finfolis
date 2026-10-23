// Türkiye'nin elindeki ABD Hazine Tahvilleri (TIC / FRED verisi) analiz modülü.
// Orijinal kaynak: U.S. Department of the Treasury - Treasury International Capital (TIC)
// FRED Serileri:
//  - Uzun Vadeli: FORLTTREASPOS12807 (Foreign Portfolio Holdings of U.S. Long-Term Treasury Securities: Turkey)
//  - Kısa Vadeli: FORSTTREASPOS12807 (Foreign Portfolio Holdings of U.S. Short-Term Treasury Securities: Turkey)
//  - Toplam: FORTREASPOS12807

/**
 * FRED CSV formatındaki metni Map<Tarih, MilyonUSD> yapısına çevirir.
 * @param {string} csvMetin
 * @returns {Map<string, number>}
 */
export function fredCsvAyristir(csvMetin) {
  const sonuc = new Map();
  if (!csvMetin) return sonuc;

  for (const satir of csvMetin.split('\n')) {
    const trimmed = satir.trim();
    if (!trimmed || trimmed.startsWith('observation_date') || trimmed.startsWith('DATE')) continue;
    const [tarih, degerStr] = trimmed.split(',');
    if (!tarih || !degerStr || degerStr === '.') continue;
    const deger = Number(degerStr);
    if (Number.isFinite(deger)) {
      sonuc.set(tarih, deger);
    }
  }
  return sonuc;
}

/**
 * Uzun ve kısa vadeli FRED verilerini birleştirerek tam tarihsel analizi çıkarır.
 * @param {string} uzunCsv
 * @param {string} kisaCsv
 */
export function abdTahvilAnalizi(uzunCsv, kisaCsv) {
  const uzunMap = fredCsvAyristir(uzunCsv);
  const kisaMap = fredCsvAyristir(kisaCsv);

  const tumTarihler = Array.from(new Set([...uzunMap.keys(), ...kisaMap.keys()])).sort();
  if (tumTarihler.length === 0) {
    throw new Error('Tahvil serisi boş');
  }

  // 2011'den itibaren (kısa vadeli verilerin düzenli tutulduğu dönem) alalım
  const baslangicTarih = '2011-01-01';
  const filtrelenmisTarihler = tumTarihler.filter((t) => t >= baslangicTarih);

  const noktalar = [];
  let zirve = { tarih: '', toplamUSD: -Infinity };
  let dip = { tarih: '', toplamUSD: Infinity };

  for (const tarih of filtrelenmisTarihler) {
    const uzun = uzunMap.get(tarih) ?? 0;
    const kisa = kisaMap.get(tarih) ?? 0;
    const toplam = uzun + kisa;

    if (toplam <= 0) continue;

    const kisaOran = toplam > 0 ? Number(((kisa / toplam) * 100).toFixed(1)) : 0;
    const uzunOran = toplam > 0 ? Number(((uzun / toplam) * 100).toFixed(1)) : 0;

    const nokta = {
      tarih,
      uzunUSD: Math.round(uzun),
      kisaUSD: Math.round(kisa),
      toplamUSD: Math.round(toplam),
      kisaOran,
      uzunOran,
    };
    noktalar.push(nokta);

    if (toplam > zirve.toplamUSD) {
      zirve = { tarih, toplamUSD: Math.round(toplam) };
    }
    if (toplam < dip.toplamUSD) {
      dip = { tarih, toplamUSD: Math.round(toplam) };
    }
  }

  if (noktalar.length === 0) {
    throw new Error('Filtreleme sonrası nokta kalmadı');
  }

  const sonNokta = noktalar.at(-1);
  const oncekiNokta = noktalar.length > 1 ? noktalar.at(-2) : null;
  const aylikDegisimUSD = oncekiNokta ? sonNokta.toplamUSD - oncekiNokta.toplamUSD : 0;
  const aylikDegisimYuzde =
    oncekiNokta && oncekiNokta.toplamUSD > 0
      ? Number((((sonNokta.toplamUSD - oncekiNokta.toplamUSD) / oncekiNokta.toplamUSD) * 100).toFixed(1))
      : 0;

  const zirvedenFarkYuzde =
    zirve.toplamUSD > 0
      ? Number((((sonNokta.toplamUSD - zirve.toplamUSD) / zirve.toplamUSD) * 100).toFixed(1))
      : 0;

  return {
    guncelleme: new Date().toISOString(),
    sonNokta,
    oncekiNokta,
    aylikDegisimUSD,
    aylikDegisimYuzde,
    tarihselZirve: zirve,
    tarihselDip: dip,
    zirvedenFarkYuzde,
    noktalar,
  };
}
