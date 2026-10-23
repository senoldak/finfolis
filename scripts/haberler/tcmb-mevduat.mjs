// TCMB Haftalık Yabancı Para (YP) Mevduat ve Kıymetli Maden Verileri modülü.
// Bankacılık sektöründeki toplam döviz tevdiat hesapları (DTH) ve altın mevduatlarını
// EVDS3 API üzerinden çeker.
//
// Veri Grubu: bie_hpbitablo4 (Bankacılık Sektörü Yabancı Para Mevduatı - Yurt İçi Şubeler)
// Birim: Milyon ABD Doları (USD)
import { EVDS_URL } from './resmi-veri.mjs';
import { hentMetin } from './lib.mjs';

export const MEVDUAT_SERILERI = {
  toplam: 'TP.HPBITABLO4.1',
  yurtIci: 'TP.HPBITABLO4.2',
  bireysel: 'TP.HPBITABLO4.3',
  tuzel: 'TP.HPBITABLO4.8',
  bireyselAltin: 'TP.HPBITABLO4.7',
  tuzelAltin: 'TP.HPBITABLO4.12',
};

const yuvarla = (n, basamak = 2) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const carpan = 10 ** basamak;
  return Math.round(n * carpan) / carpan;
};

export const parseEvdsTarih = (str) => {
  const m1 = String(str ?? '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = String(str ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
};

const sayi = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

/**
 * EVDS yanıtındaki ham satırları ayrıştırıp düzenli nesnelere dönüştürür.
 * @param {Array<object>} items
 * @returns {Array<{tarih: string, toplam: number, yurtIci: number, bireysel: number, tuzel: number, altin: number}>}
 */
export function mevduatAyrıştır(items) {
  if (!Array.isArray(items)) return [];

  const satirlar = [];

  for (const it of items) {
    const tarih = parseEvdsTarih(it.Tarih);
    if (!tarih) continue;

    const toplam = sayi(it.TP_HPBITABLO4_1);
    const yurtIci = sayi(it.TP_HPBITABLO4_2);
    const bireysel = sayi(it.TP_HPBITABLO4_3);
    const tuzel = sayi(it.TP_HPBITABLO4_8);

    // Temel seriler olmadan satır geçerli sayılamaz
    if (toplam == null || toplam <= 0) continue;

    const bAltin = sayi(it.TP_HPBITABLO4_7) || 0;
    const tAltin = sayi(it.TP_HPBITABLO4_12) || 0;
    const altin = yuvarla(bAltin + tAltin, 2);

    satirlar.push({
      tarih,
      toplam: yuvarla(toplam, 2),
      yurtIci: yuvarla(yurtIci, 2) ?? yuvarla(toplam, 2),
      bireysel: yuvarla(bireysel, 2) ?? 0,
      tuzel: yuvarla(tuzel, 2) ?? 0,
      altin: altin ?? 0,
    });
  }

  // Tarihe göre artan sıra
  return satirlar.sort((a, b) => a.tarih.localeCompare(b.tarih));
}

/**
 * EVDS3 üzerinden son 56 haftalık döviz mevduatı verilerini çeker.
 * @param {Date} simdi
 * @param {string} anahtar
 * @param {object} [eskiMevduat]
 */
export async function mevduatiAl(simdi, anahtar, eskiMevduat) {
  if (!anahtar) throw new Error('EVDS API anahtarı yok');

  const g = (d) =>
    `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

  // Son 56 hafta (~392 gün)
  const baslangic = new Date(simdi.getTime() - 56 * 7 * 24 * 60 * 60 * 1000);

  const seriler = Object.values(MEVDUAT_SERILERI);
  const url = `${EVDS_URL}/series=${seriler.join('-')}&startDate=${g(baslangic)}&endDate=${g(simdi)}&type=json`;

  const metin = await hentMetin(url, { headers: { key: anahtar } });
  const veri = JSON.parse(metin);

  if (!Array.isArray(veri?.items) || veri.items.length === 0) {
    if (eskiMevduat?.satirlar?.length) {
      console.warn('[mevduat] EVDS yanıtı boş, eski veri korunuyor.');
      return eskiMevduat;
    }
    throw new Error('EVDS mevduat verisi boş geldi');
  }

  const satirlar = mevduatAyrıştır(veri.items);
  if (satirlar.length < 10) {
    if (eskiMevduat?.satirlar?.length) return eskiMevduat;
    throw new Error(`Yetersiz mevduat serisi uzunluğu: ${satirlar.length}`);
  }

  return {
    kaynak: {
      ad: 'TCMB Haftalık Para ve Banka İstatistikleri (EVDS)',
      url: 'https://evds3.tcmb.gov.tr/',
    },
    satirlar: satirlar.slice(-52), // En fazla son 52 hafta
  };
}
