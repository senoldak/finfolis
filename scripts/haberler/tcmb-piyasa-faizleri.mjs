// TCMB Haftalık Akım Faiz Oranları modülü.
// Bankalarca açılan kredilere (ihtiyaç, taşıt, konut) ve TL mevduatlara uygulanan
// haftalık ağırlıklı ortalama faiz oranlarını EVDS'den alır.
//
// Formül & Dönüşüm:
//   TCMB verileri yıllık basit faiz (%) olarak yayımlar.
//   Piyasada kredi taksitleri ve borçlanma maliyeti "aylık basit faiz" ile karşılaştırıldığından:
//   Aylık Basit Faiz (%) = Yıllık Oran (%) / 12
//
// Seriler:
//   - TP.KTF10: İhtiyaç Kredisi Faizi (TL, Akım)
//   - TP.KTF11: Taşıt Kredisi Faizi (TL, Akım)
//   - TP.KTF12: Konut Kredisi Faizi (TL, Akım)
//   - TP.TRY.MT02: 3 Aya Kadar Vadeli TL Mevduat Faizi (Akım)
import { EVDS_URL } from './resmi-veri.mjs';
import { hentMetin } from './lib.mjs';

export const PIYASA_FAIZI_SERILERI = {
  ihtiyac: 'TP.KTF10',
  tasit: 'TP.KTF11',
  konut: 'TP.KTF12',
  mevduat: 'TP.TRY.MT02',
};

export const yuvarla = (n, basamak = 2) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const carpan = 10 ** basamak;
  return Math.round(n * carpan) / carpan;
};

export const aylikBasit = (yillikOran) => {
  if (typeof yillikOran !== 'number' || !Number.isFinite(yillikOran)) return null;
  return yuvarla(yillikOran / 12, 2);
};

export const parseEvdsTarih = (str) => {
  const m1 = String(str ?? '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = String(str ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
};

/**
 * Verilen tarihte yürürlükte olan TCMB politika faizini bulur.
 */
export function politikaFaiziBul(tarih, repoGecmisi = []) {
  if (!Array.isArray(repoGecmisi) || repoGecmisi.length === 0) return 37.5;
  const uygun = [...repoGecmisi]
    .filter((x) => x && x.tarih && x.tarih <= tarih && Number.isFinite(x.oran))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));
  return uygun.length > 0 ? uygun.at(-1).oran : 37.5;
}

/**
 * EVDS'den haftalık akım kredi ve mevduat faizlerini çeker.
 */
export async function piyasaFaizleriniAl(simdi, anahtar, repoGecmisi = [], eski = null) {
  const g = (d) =>
    `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
  const bas = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth() - 12, 1));
  const seriKodlari = Object.values(PIYASA_FAIZI_SERILERI);
  const url = `${EVDS_URL}/series=${seriKodlari.join('-')}&startDate=${g(bas)}&endDate=${g(simdi)}&type=json`;

  const veri = JSON.parse(await hentMetin(url, { headers: { key: anahtar } }));
  if (!Array.isArray(veri?.items)) throw new Error('EVDS piyasa faizleri yanıtı ayrıştırılamadı');

  const satirlar = veri.items
    .map((it) => {
      const tarih = parseEvdsTarih(it.Tarih);
      if (!tarih) return null;

      const satir = { tarih };
      for (const [ad, kod] of Object.entries(PIYASA_FAIZI_SERILERI)) {
        const alan = kod.replaceAll('.', '_');
        const val = it[alan];
        const n = val == null || val === '' ? NaN : Number(val);
        if (!Number.isFinite(n) || n <= 0) return null; // eksik veri varsa o hafta geçersiz
        satir[ad] = yuvarla(n, 2);
      }

      satir.politika = yuvarla(politikaFaiziBul(tarih, repoGecmisi), 2);

      // Eski veride 5Y tahvil varsa veya varsayılan getiri eğrisi:
      const eskiSatir = eski?.satirlar?.find((s) => s.tarih === tarih);
      satir.tahvil5Y = eskiSatir?.tahvil5Y ?? yuvarla(satir.mevduat * 0.9, 2);

      return satir;
    })
    .filter(Boolean)
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  if (satirlar.length < 8) {
    if (eski?.satirlar?.length >= 8) return eski;
    throw new Error('Piyasa faizleri haftalık serisi yetersiz');
  }

  return {
    kaynak: {
      ad: 'TCMB, Bankalarca Açılan Kredilere ve Mevduatlara Uygulanan Ağırlıklı Ortalama Faiz Oranları (EVDS)',
      url: 'https://evds3.tcmb.gov.tr/',
    },
    satirlar: satirlar.slice(-52),
  };
}
