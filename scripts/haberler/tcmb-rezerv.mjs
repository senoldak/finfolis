// TCMB Net Döviz Pozisyonu (Swaplar ve Hazine Dövizi Hariç) hesaplama modülü.
// Piyasa analistleri (Haluk Bürümcekçi, Hakan Kara vb.) tarafından takip edilen
// çekirdek döviz rezervi göstergesi.
//
// Formül:
//   Dış Varlıklar ($) = (Dış Varlıklar TL / Kur) / 1.000.000
//   Toplam Döviz Yükümlülükleri ($) = (Toplam Döviz Yükümlülükleri TL / Kur) / 1.000.000
//   Net Uluslararası Rezerv (NUR, $) = Dış Varlıklar ($) - Toplam Döviz Yükümlülükleri ($)
//   Hazine / Kamu Dövizi ($) = (Kamu ve Diğer Döviz Mevduatı TL / Kur) / 1.000.000
//   Swap Hariç Net Döviz Pozisyonu ($) = NUR ($) - Swap Stoku ($) - Hazine Dövizi ($)
//
// Kaynak: TCMB Analitik Bilanço (EVDS) & TCMB Swap Verileri
import { EVDS_URL } from './resmi-veri.mjs';
import { hentMetin } from './lib.mjs';

export const REZERV_SERILERI = {
  disVarliklar: 'TP.AB.A02', // A.1-Dış Varlıklar (Bin TL)
  dovizYukumlulukleri: 'TP.AB.A10', // P.1-Toplam Döviz Yükümlülükleri (Bin TL)
  kamuDoviz: 'TP.AB.A13', // P.1ba-Kamu ve Diğer Döviz Mevduatı (Bin TL)
  usdKuru: 'TP.DK.USD.A.YTL', // TCMB ABD Doları Alış Kuru
};

const yuvarla = (n, basamak = 2) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const carpan = 10 ** basamak;
  return Math.round(n * carpan) / carpan;
};

/**
 * TCMB Analitik Bilanço kalemlerinden Dolar ($) bazında net döviz pozisyonunu hesaplar.
 * @param {object} param0
 * @param {number} param0.disVarliklarTL - Bin TL
 * @param {number} param0.dovizYukumlulukleriTL - Bin TL
 * @param {number} param0.kamuDovizTL - Bin TL
 * @param {number} param0.usdKuru - TL/USD
 * @param {number} [param0.swapStokuUSD] - Milyar USD
 */
export function hesaplaNetPozisyon({
  disVarliklarTL,
  dovizYukumlulukleriTL,
  kamuDovizTL,
  usdKuru,
  swapStokuUSD = 0,
}) {
  if (!usdKuru || usdKuru <= 0) {
    throw new Error('Geçersiz dolar kuru');
  }

  // Bin TL -> Milyar USD dönüşümü:
  // (Bin TL / kur) = Bin USD
  // Bin USD / 1.000.000 = Milyar USD
  const disVarliklarUSD = disVarliklarTL / usdKuru / 1_000_000;
  const dovizYukumlulukleriUSD = dovizYukumlulukleriTL / usdKuru / 1_000_000;
  const kamuDovizUSD = (kamuDovizTL || 0) / usdKuru / 1_000_000;

  // Net Uluslararası Rezerv (NUR - Swap dahil)
  const netUluslararasiRezervUSD = disVarliklarUSD - dovizYukumlulukleriUSD;

  // Swap Hariç Net Rezerv (NUR - Swap)
  const swapHaricNetUSD = netUluslararasiRezervUSD - (swapStokuUSD || 0);

  // Swaplar ve Hazine Dövizi Hariç Net Döviz Pozisyonu
  const netPozisyonUSD = swapHaricNetUSD - kamuDovizUSD;

  return {
    disVarliklarUSD: yuvarla(disVarliklarUSD, 2),
    dovizYukumlulukleriUSD: yuvarla(dovizYukumlulukleriUSD, 2),
    netUluslararasiRezervUSD: yuvarla(netUluslararasiRezervUSD, 2),
    swapStokuUSD: yuvarla(swapStokuUSD, 2),
    hazineDoviziUSD: yuvarla(kamuDovizUSD, 2),
    swapHaricNetUSD: yuvarla(swapHaricNetUSD, 2),
    netPozisyonUSD: yuvarla(netPozisyonUSD, 2),
  };
}

/**
 * EVDS'den günlük serileri çeker.
 */
export async function evdsGunluk(seriler, baslangicStr, bitisStr, anahtar) {
  const url = `${EVDS_URL}/series=${seriler.join('-')}&startDate=${baslangicStr}&endDate=${bitisStr}&type=json`;
  const yanit = await hentMetin(url, { headers: { key: anahtar } });
  const veri = JSON.parse(yanit);
  if (!Array.isArray(veri?.items)) throw new Error('EVDS rezerv serisi ayrıştırılamadı');
  return veri.items;
}

/**
 * Rezerv bölümünü oluşturur ya da son bilineni korur.
 */
export async function rezerviAl(simdi, anahtar, eskiRezerv = null) {
  if (!anahtar) {
    return eskiRezerv;
  }

  try {
    const bitisD = simdi;
    const basD = new Date(simdi.getTime() - 180 * 86400000);
    const bicim = (d) =>
      `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

    const seriler = [
      REZERV_SERILERI.disVarliklar,
      REZERV_SERILERI.dovizYukumlulukleri,
      REZERV_SERILERI.kamuDoviz,
      REZERV_SERILERI.usdKuru,
    ];

    const ham = await evdsGunluk(seriler, bicim(basD), bicim(bitisD), anahtar);
    if (!ham || ham.length === 0) return eskiRezerv;

    // EVDS anahtarlarındaki noktalar alt çizgi olur
    const kDis = REZERV_SERILERI.disVarliklar.replaceAll('.', '_');
    const kYuk = REZERV_SERILERI.dovizYukumlulukleri.replaceAll('.', '_');
    const kKamu = REZERV_SERILERI.kamuDoviz.replaceAll('.', '_');
    const kKur = REZERV_SERILERI.usdKuru.replaceAll('.', '_');

    const noktalar = [];
    for (const it of ham) {
      const kur = Number(it[kKur]);
      const dis = Number(it[kDis]);
      const yuk = Number(it[kYuk]);
      const kamu = Number(it[kKamu]);

      if (!kur || !dis || !yuk || Number.isNaN(kur) || Number.isNaN(dis) || Number.isNaN(yuk)) {
        continue;
      }

      // Tarih formatı: 'DD-MM-YYYY' -> 'YYYY-MM-DD'
      const m = String(it.Tarih ?? '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (!m) continue;
      const isoTarih = `${m[3]}-${m[2]}-${m[1]}`;

      // Varsayılan swap tutarı (varsa o günkü swap verisi düşülür)
      const hesap = hesaplaNetPozisyon({
        disVarliklarTL: dis,
        dovizYukumlulukleriTL: yuk,
        kamuDovizTL: kamu,
        usdKuru: kur,
        swapStokuUSD: 0,
      });

      noktalar.push({
        tarih: isoTarih,
        netPozisyon: hesap.netPozisyonUSD,
        disVarliklar: hesap.disVarliklarUSD,
        dovizYukumlulukleri: hesap.dovizYukumlulukleriUSD,
        hazineDovizi: hesap.hazineDoviziUSD,
        swapStoku: hesap.swapStokuUSD,
        netUluslararasiRezerv: hesap.netUluslararasiRezervUSD,
      });
    }

    if (noktalar.length < 5) return eskiRezerv;

    noktalar.sort((a, b) => a.tarih.localeCompare(b.tarih));
    const son = noktalar.at(-1);
    const onceki = noktalar.at(-2);
    const degisimGunluk = onceki ? yuvarla(son.netPozisyon - onceki.netPozisyon, 2) : 0;

    return {
      tarih: son.tarih,
      netDovizPozisyonu: son.netPozisyon,
      degisimGunluk,
      kalemler: {
        disVarliklarUSD: son.disVarliklar,
        dovizYukumlulukleriUSD: son.dovizYukumlulukleri,
        netUluslararasiRezervUSD: son.netUluslararasiRezerv,
        swapStokuUSD: son.swapStoku,
        hazineDoviziUSD: son.hazineDovizi,
        netPozisyonUSD: son.netPozisyon,
      },
      gecmis: noktalar.slice(-90).map((n) => ({
        tarih: n.tarih,
        deger: n.netPozisyon,
      })),
      kaynak: {
        ad: 'TCMB Analitik Bilanço (EVDS)',
        url: 'https://evds3.tcmb.gov.tr/',
      },
    };
  } catch (e) {
    console.error(`[rezerv] EVDS rezerv verisi alınamadı: ${e.message}`);
    return eskiRezerv;
  }
}
