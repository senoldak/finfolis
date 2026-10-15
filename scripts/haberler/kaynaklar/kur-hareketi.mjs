// Kur hareketi: piyasa-verisi.mjs çıktısındaki günlük değişim, JPY/BRL/EUR/USD için TL karşısında
// yüzde 1,5 ve üzerindeyse aday olur. Yeni veri çekmez; yalnızca verilen gerçek değerleri kullanır.
import { hentJson } from '../lib.mjs';
import { rakamKapagi } from '../../kapak/kapak.mjs';
import { trSayi } from './ortak.mjs';

const ESIK = 1.5; // günlük yüzde değişim
const KURLAR = ['dolar', 'euro', 'yen', 'brl'];

const FRANKFURTER = 'https://api.frankfurter.dev/v1';
const FRANKFURTER_KAYNAK = { ad: 'Avrupa Merkez Bankası referans kuru', url: 'https://www.frankfurter.dev/' };
const gunStr = (d) => d.toISOString().slice(0, 10);

// USD çaprazları: USD bazlı son iki iş günü yuvarlanmamış alınır. EUR/USD, USD->EUR kurunun tersidir.
const CAPRAZLAR = [
  { id: 'usdjpy', ad: 'USD/JPY', sembol: 'JPY', ters: false },
  { id: 'usdbrl', ad: 'USD/BRL', sembol: 'BRL', ters: false },
  { id: 'eurusd', ad: 'EUR/USD', sembol: 'EUR', ters: true },
];

async function caprazAdaylari(simdi) {
  const bitis = gunStr(simdi);
  const baslangic = gunStr(new Date(simdi.getTime() - 10 * 86400000));
  const veri = await hentJson(`${FRANKFURTER}/${baslangic}..${bitis}?base=USD&symbols=JPY,BRL,EUR`);
  const gunler = Object.keys(veri.rates ?? {}).sort();
  if (gunler.length < 2) return [];
  const [onceki, son] = gunler.slice(-2);
  const adaylar = [];
  for (const c of CAPRAZLAR) {
    const r1 = veri.rates[son]?.[c.sembol];
    const r0 = veri.rates[onceki]?.[c.sembol];
    if (!(r1 > 0) || !(r0 > 0)) continue;
    const [d1, d0] = c.ters ? [1 / r1, 1 / r0] : [r1, r0];
    const degisim = ((d1 - d0) / d0) * 100;
    if (Math.abs(degisim) < ESIK) continue;
    const artti = degisim > 0;
    const yuzde = Math.abs(degisim).toFixed(1);
    const kaynakMetni = [
      `${c.ad}: ${d1.toFixed(4)} (${son}), previous business day ${d0.toFixed(4)} (${onceki}).`,
      c.ters ? `Source rates USD to ${c.sembol}: ${r1} (${son}), ${r0} (${onceki}).` : '',
      `Daily change: ${artti ? '+' : '-'}${yuzde}%.`,
      `Source: ${FRANKFURTER_KAYNAK.ad}.`,
    ]
      .filter(Boolean)
      .join(' ');
    adaylar.push({
      id: `kur:${c.id}:${son}`,
      baslik: `${c.ad} günde yüzde ${trSayi(yuzde)} ${artti ? 'yükseldi' : 'düştü'}`,
      tarih: new Date(`${son}T00:00:00+03:00`),
      onem: 4,
      kategori: 'doviz',
      bolge: 'kuresel',
      ucretli: false,
      kaynakMetni,
      kaynaklar: [FRANKFURTER_KAYNAK],
      kapak: rakamKapagi({
        kategori: 'doviz',
        ust: c.ad,
        rakam: `${artti ? '+' : '−'}%${trSayi(yuzde)}`,
        alt: `Günlük değişim · güncel kur ${trSayi(d1.toFixed(4))}`,
        kaynak: FRANKFURTER_KAYNAK.ad,
      }),
      kapakAlt: `${c.ad} günlük değişim ${artti ? '+' : '−'}%${trSayi(yuzde)}`,
    });
  }
  return adaylar;
}

export default {
  ad: 'kur-hareketi',
  async hent(ctx = {}) {
    const adaylar = [];
    for (const g of ctx.piyasa?.gostergeler ?? []) {
      if (!KURLAR.includes(g.id) || !Number.isFinite(g.degisim) || !Number.isFinite(g.deger) || !g.zaman) continue;
      if (Math.abs(g.degisim) < ESIK) continue;
      const tarih = new Date(g.zaman);
      if (Number.isNaN(tarih.getTime())) continue;
      const artti = g.degisim > 0;
      const yuzde = Math.abs(g.degisim).toFixed(1);
      const gun = g.zaman.slice(0, 10);
      const kaynakMetni = [
        `${g.ad}: ${g.deger} (${gun}).`,
        `Daily change: ${artti ? '+' : '-'}${yuzde}%.`,
        g.onceki != null ? `${g.oncekiEtiket ?? 'Previous'}: ${g.onceki}.` : '',
        `Source: ${g.kaynak?.ad ?? ''}.`,
      ]
        .filter(Boolean)
        .join(' ');
      adaylar.push({
        id: `kur:${g.id}:${gun}`,
        baslik: `${g.ad} günde yüzde ${trSayi(yuzde)} ${artti ? 'yükseldi' : 'düştü'}`,
        tarih,
        onem: 4,
        kategori: 'doviz',
        bolge: 'kuresel',
        ucretli: false,
        kaynakMetni,
        kaynaklar: g.kaynak ? [{ ad: g.kaynak.ad, url: g.kaynak.url }] : [],
        kapak: rakamKapagi({
          kategori: 'doviz',
          ust: g.ad,
          rakam: `${artti ? '+' : '−'}%${trSayi(yuzde)}`,
          alt: `Günlük değişim · güncel kur ${trSayi(g.deger)}`,
          kaynak: g.kaynak?.ad ?? '',
        }),
        kapakAlt: `${g.ad} günlük değişim ${artti ? '+' : '−'}%${trSayi(yuzde)}`,
      });
    }
    // Çapraz kurlar ayrı kaynaktan; alınamazsa TL çiftleri yine de döner.
    try {
      adaylar.push(...(await caprazAdaylari(ctx.simdi ?? new Date())));
    } catch (e) {
      console.error(`[kur-hareketi] USD çaprazları alınamadı: ${e.message}`);
    }
    return adaylar;
  },
};
