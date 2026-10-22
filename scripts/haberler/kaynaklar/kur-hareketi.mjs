// Kur hareketi: piyasa-verisi.mjs çıktısındaki günlük değişim TL karşısında eşiği aşarsa (dolar yüzde 1, euro 1,2,
// yen ve real 1,5) ve USD çaprazları yüzde 1,2'yi aşarsa aday olur. Haberdeki rakamlar yalnızca verilen gerçek değerlerdir.
// Kapak, kurun son altı aylık günlük kapanış grafiğidir (geçmiş piyasa kapanış verisi, son nokta haberdeki değer);
// geçmiş alınamazsa büyük rakam kartı.
import { hentJson } from '../lib.mjs';
import { rakamKapagi, grafikKapagi } from '../../kapak/kapak.mjs';
import { trSayi } from './ortak.mjs';

// Günlük yüzde değişim eşikleri. Dolar/TL kontrollü seyrettiği için yüzde 1 bile nadirdir.
const ESIK = { dolar: 1, euro: 1.2, yen: 1.5, brl: 1.5 };
const ESIK_CAPRAZ = 1.2;
const KURLAR = Object.keys(ESIK);
// Grafik geçmişi için semboller; carpan: piyasa verisindeki birim (100 yen) ile sembolün birimi arasındaki oran.
const GECMIS = {
  dolar: { sembol: 'USDTRY=X' },
  euro: { sembol: 'EURTRY=X' },
  yen: { sembol: 'JPYTRY=X', carpan: 100 },
  brl: { sembol: 'BRLTRY=X' },
  usdjpy: { sembol: 'JPY=X', ondalik: 2 },
  usdbrl: { sembol: 'BRL=X' },
  eurusd: { sembol: 'EURUSD=X' },
};
const GUN_MS = 86400000;
const zaman = (t) => Date.parse(`${t}T00:00:00Z`);

const FRANKFURTER = 'https://api.frankfurter.dev/v1';
const FRANKFURTER_KAYNAK = { ad: 'Avrupa Merkez Bankası referans kuru', url: 'https://www.frankfurter.dev/' };
const gunStr = (d) => d.toISOString().slice(0, 10);

const baslikYap = (ad, degisim) => `${ad} günde yüzde ${trSayi(Math.abs(degisim).toFixed(1))} ${degisim > 0 ? 'yükseldi' : 'düştü'}`;
const isaretli = (degisim) => `${degisim > 0 ? '+' : '−'}%${trSayi(Math.abs(degisim).toFixed(1))}`;

// Kur grafiği kapağı: haberin gününden önceki altı ayın kapanışları ve son nokta olarak haberdeki değer.
// Okuyucu yoksa ya da geçmiş eksik/bayatsa null (çağıran rakam kartına düşer).
export async function kurGrafigi({ id, ad, gun, deger, degisim, okuyucu, ondalik = 4 }) {
  const g = GECMIS[id];
  if (!g || !okuyucu) return null;
  try {
    const ham = await okuyucu.gunluk(g.sembol);
    const bas = zaman(gun) - 182 * GUN_MS;
    const seri = ham
      .filter((p) => p.tarih < gun && zaman(p.tarih) >= bas)
      .map((p) => ({ tarih: p.tarih, deger: p.deger * (g.carpan ?? 1) }));
    if (seri.length < 60 || zaman(gun) - zaman(seri.at(-1).tarih) > 6 * GUN_MS) return null;
    seri.push({ tarih: gun, deger });
    const vurgu = `Günlük ${isaretli(degisim)}`;
    return {
      veriHaberi: true,
      kapak: grafikKapagi({
        kategori: 'doviz',
        baslik: baslikYap(ad, degisim),
        seri,
        vurgu,
        olay: { bas: seri.at(-2).tarih, yon: degisim > 0 ? 'yukselis' : 'dusus' },
        ondalik: g.ondalik ?? ondalik,
      }),
      kapakAlt: `${ad} son altı ay günlük kapanış grafiği: ${vurgu.toLocaleLowerCase('tr-TR')}, güncel kur ${trSayi(deger)}`,
    };
  } catch (e) {
    console.error(`[kur-hareketi] ${g.sembol} geçmişi alınamadı: ${e.message}`);
    return null;
  }
}

function rakamKarti(ad, degisim, deger, kaynak) {
  return {
    kapak: rakamKapagi({ kategori: 'doviz', ust: ad, rakam: isaretli(degisim), alt: `Günlük değişim · güncel kur ${trSayi(deger)}`, kaynak }),
    kapakAlt: `${ad} günlük değişim ${isaretli(degisim)}`,
  };
}

// USD çaprazları: USD bazlı son iki iş günü yuvarlanmamış alınır. EUR/USD, USD->EUR kurunun tersidir.
const CAPRAZLAR = [
  { id: 'usdjpy', ad: 'USD/JPY', sembol: 'JPY', ters: false },
  { id: 'usdbrl', ad: 'USD/BRL', sembol: 'BRL', ters: false },
  { id: 'eurusd', ad: 'EUR/USD', sembol: 'EUR', ters: true },
];

async function caprazAdaylari(simdi, okuyucu) {
  const bitis = gunStr(simdi);
  const baslangic = gunStr(new Date(simdi.getTime() - 10 * GUN_MS));
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
    if (Math.abs(degisim) < ESIK_CAPRAZ) continue;
    const artti = degisim > 0;
    const yuzde = Math.abs(degisim).toFixed(1);
    const deger = Number(d1.toFixed(4));
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
      baslik: baslikYap(c.ad, degisim),
      tarih: new Date(`${son}T00:00:00+03:00`),
      onem: 80,
      kategori: 'doviz',
      bolge: 'kuresel',
      ucretli: false,
      kaynakMetni,
      kaynaklar: [FRANKFURTER_KAYNAK],
      ...((await kurGrafigi({ id: c.id, ad: c.ad, gun: son, deger, degisim, okuyucu })) ?? rakamKarti(c.ad, degisim, deger, FRANKFURTER_KAYNAK.ad)),
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
      if (Math.abs(g.degisim) < ESIK[g.id]) continue;
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
        baslik: baslikYap(g.ad, g.degisim),
        tarih,
        onem: 80,
        kategori: 'doviz',
        bolge: 'kuresel',
        ucretli: false,
        kaynakMetni,
        kaynaklar: g.kaynak ? [{ ad: g.kaynak.ad, url: g.kaynak.url }] : [],
        ...((await kurGrafigi({ id: g.id, ad: g.ad, gun, deger: g.deger, degisim: g.degisim, okuyucu: ctx.okuyucu })) ??
          rakamKarti(g.ad, g.degisim, g.deger, g.kaynak?.ad ?? '')),
      });
    }
    // Çapraz kurlar ayrı kaynaktan; alınamazsa TL çiftleri yine de döner.
    try {
      adaylar.push(...(await caprazAdaylari(ctx.simdi ?? new Date(), ctx.okuyucu)));
    } catch (e) {
      console.error(`[kur-hareketi] USD çaprazları alınamadı: ${e.message}`);
    }
    return adaylar;
  },
};
