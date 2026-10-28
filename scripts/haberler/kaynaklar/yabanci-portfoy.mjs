// Yabancıların portföy akımı: TCMB her perşembe, yurt dışı yerleşiklerin menkul kıymet portföyünü önceki cuma
// itibarıyla yayımlar. resmi-veri.mjs bu seriyi src/data/resmi.json'a (portfoyHaftalik) yazar; bu kaynak dosyadaki son
// haftayı haftada bir aday yapar. Rakamlar yalnızca TCMB'nin değerleri ve onların toplamıdır (yılbaşından beri).
// Az rakamlı bir veri notu olduğundan yazı çoğu zaman kısa kalır: tek başına yayımlanmaz, havuzda dilim derlemesini
// bekler (havuz.mjs). Kapak yok; derleme kendi kapağını çizer.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { trSayi } from './ortak.mjs';

const DOSYA = fileURLToPath(new URL('../../../src/data/resmi.json', import.meta.url));
const KAYNAK = { ad: 'TCMB, menkul kıymet istatistikleri (EVDS)', url: 'https://evds3.tcmb.gov.tr/' };
const GUN_MS = 86400000;
// Cuma verisi altı gün sonra (perşembe 14:30 İstanbul) yayımlanır; bundan sonraki iki gün içinde aday olur.
const YAYIN_GUN = 6;
const TAZE_GUN = 2;

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const gunAdi = (t) => `${Number(t.slice(8, 10))} ${AYLAR[Number(t.slice(5, 7)) - 1]}`;
const milyon = (n) => `${n < 0 ? '-' : '+'}${trSayi(Math.abs(n).toFixed(1))} million USD`;

export function portfoyAdayi(bolum, simdi = new Date()) {
  const s = bolum?.satirlar ?? [];
  const son = s.at(-1);
  if (!son) return null;
  const yayin = new Date(`${son.tarih}T14:30:00+03:00`).getTime() + YAYIN_GUN * GUN_MS;
  if (simdi.getTime() < yayin || simdi.getTime() > yayin + TAZE_GUN * GUN_MS) return null;
  const yil = son.tarih.slice(0, 4);
  const yilSatirlari = s.filter((x) => x.tarih.startsWith(yil));
  const toplam = (alan) => yilSatirlari.reduce((t, x) => t + x[alan], 0);
  const kaynakMetni = [
    `Central Bank of the Republic of Türkiye (CBRT), weekly securities statistics, non-residents' portfolio, week ending ${son.tarih}.`,
    `Net change excluding price and exchange rate effects: equities ${milyon(son.hisse)}, government domestic debt securities ${milyon(son.dibs)}, private sector debt securities ${milyon(son.ost)}, total ${milyon(son.toplam)}.`,
    `Positive means net purchase, negative means net sale.`,
    `Since the start of ${yil} (${yilSatirlari.length} weeks, sum of weekly figures): equities ${milyon(toplam('hisse'))}, government domestic debt securities ${milyon(toplam('dibs'))}.`,
    `Stock held by non-residents at market value: equities ${trSayi((son.hisseStok / 1000).toFixed(1))} billion USD, government domestic debt securities ${trSayi((son.dibsStok / 1000).toFixed(1))} billion USD.`,
    `Source: ${KAYNAK.ad}.`,
  ].join(' ');
  const yon = son.hisse >= 0 ? 'aldı' : 'sattı';
  return {
    id: `portfoy:${son.tarih}`,
    baslik: `Yabancılar ${gunAdi(son.tarih)} haftasında ${trSayi(Math.abs(son.hisse).toFixed(1))} milyon dolarlık net hisse ${yon}`,
    tarih: new Date(yayin),
    onem: 65,
    kategori: 'ekonomi',
    bolge: 'turkiye',
    ucretli: false,
    kaynakMetni,
    kaynaklar: [KAYNAK],
  };
}

export default {
  ad: 'yabanci-portfoy',
  async hent(ctx = {}) {
    try {
      const resmi = JSON.parse(await readFile(ctx.resmiDosyasi ?? DOSYA, 'utf8'));
      const a = portfoyAdayi(resmi.portfoyHaftalik, ctx.simdi ?? new Date());
      return a ? [a] : [];
    } catch (e) {
      console.error(`[yabanci-portfoy] resmi veri okunamadı: ${e.message}`);
      return [];
    }
  },
};
