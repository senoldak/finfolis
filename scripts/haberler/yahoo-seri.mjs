// Yahoo Finance günlük kapanış serileri: eşik olayları ve piyasa karneleri ortak kullanır.
// Bir çalıştırmada aynı sembol bir kez indirilir (altın hem kendi olayı, hem altın/gümüş oranı, hem karne için).
// Türetilmiş seriler (BIST 100 dolar bazında, altın/gümüş oranı, gram altın) iki serinin tarih eşlemesiyle hesaplanır.
import { hentJson } from './lib.mjs';

const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';
export const YAHOO_KAYNAK = { ad: 'Yahoo Finance', url: 'https://finance.yahoo.com/' };
const yuvarla = (n, o) => Math.round(n * 10 ** o) / 10 ** o;
const zaman = (iso) => Date.parse(`${iso}T00:00:00Z`);

// Yahoo yanıtından kapanmış günlerin serisi: [{ tarih, deger }]. Bugünkü çubuk, piyasa kapanmadıysa atılır;
// gün içi fiyatla "rekor kapanış" yazılmaz. Kripto gibi 7/24 işlem görenlerde bitiş gece yarısıdır, bugün hep atılır.
export function kapanislar(veri, simdi) {
  const s = veri?.chart?.result?.[0];
  const kapanis = s?.indicators?.quote?.[0]?.close;
  if (!s?.timestamp || !kapanis) throw new Error('Yahoo yanıtı geçersiz');
  const tz = s.meta?.exchangeTimezoneName || 'UTC';
  const gun = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: tz });
  const seri = [];
  for (const [i, t] of s.timestamp.entries()) {
    const deger = kapanis[i];
    if (!(deger > 0)) continue;
    const tarih = gun(t * 1000);
    // Aynı güne düşen iki çubuk olursa (Yahoo bazen anlık çubuğu ayrıca ekler) sonuncusu kalır.
    if (seri.at(-1)?.tarih === tarih) seri.pop();
    seri.push({ tarih, deger: yuvarla(deger, 4) });
  }
  const bitis = s.meta?.currentTradingPeriod?.regular?.end;
  const bugun = gun(simdi.getTime());
  if (seri.at(-1)?.tarih === bugun && (!bitis || simdi.getTime() < bitis * 1000)) seri.pop();
  return seri;
}

// İki seriyi tarih üzerinden birleştirir: a'nın her günü için b'nin o gün ya da en fazla 5 gün önceki son değeri.
// f(aDeger, bDeger) yeni değeri verir. b'si bulunmayan günler atlanır.
export function seriBirlestir(a, b, f) {
  const out = [];
  let j = 0;
  for (const p of a) {
    while (j + 1 < b.length && b[j + 1].tarih <= p.tarih) j++;
    const q = b[j];
    if (!q || q.tarih > p.tarih || zaman(p.tarih) - zaman(q.tarih) > 5 * 864e5) continue;
    out.push({ tarih: p.tarih, deger: yuvarla(f(p.deger, q.deger), 6) });
  }
  return out;
}

// Türetilmiş seri tarifleri: { pay, payda } (pay/payda), { pay, carpan } (pay × carpan); carpan sembol de olabilir.
export const TURETILMIS = {
  bistusd: { pay: 'XU100.IS', payda: 'USDTRY=X' },
  altingumus: { pay: 'GC=F', payda: 'SI=F' },
  btcaltin: { pay: 'BTC-USD', payda: 'GC=F' },
  // Gram altın (TL) = ons altın (USD) × USD/TRY ÷ 31,1035 (bir onstaki gram).
  gramaltin: { pay: 'GC=F', carpan: 'USDTRY=X', bolen: 31.1035 },
  btctl: { pay: 'BTC-USD', carpan: 'USDTRY=X' },
};

// Bir çalıştırmalık okuyucu: sembol başına tek istek (önbellek), türetilmiş seriler, aylık tepe.
export function seriOkuyucu(simdi = new Date(), { hent = hentJson } = {}) {
  const onbellek = new Map();
  const gunluk = (sembol) => {
    if (!onbellek.has(sembol)) {
      onbellek.set(
        sembol,
        hent(`${YAHOO}/${encodeURIComponent(sembol)}?range=30y&interval=1d`).then((v) => kapanislar(v, simdi)),
      );
    }
    return onbellek.get(sembol);
  };
  return {
    gunluk,
    // e.sembol ya da e.turet (TURETILMIS anahtarı) olan bir tanımın serisi.
    async seri(e) {
      if (!e.turet) return gunluk(e.sembol);
      const t = TURETILMIS[e.turet];
      if (!t) throw new Error(`Bilinmeyen türetilmiş seri: ${e.turet}`);
      const [a, b] = await Promise.all([gunluk(t.pay), gunluk(t.payda ?? t.carpan)]);
      return t.payda ? seriBirlestir(a, b, (x, y) => x / y) : seriBirlestir(a, b, (x, y) => (x * y) / (t.bolen ?? 1));
    },
    // Günlük pencerenin başladığı tarihten önceki en yüksek aylık tepe (gün içi). Rekor iddiasını 30 yıldan eskiye
    // karşı denetlemek için: aylık veri günlük veriden eskiye gider (Nikkei 1989, Dow 1929 gibi).
    async aylikTepe(sembol, once) {
      const anahtar = `aylik:${sembol}`;
      if (!onbellek.has(anahtar)) onbellek.set(anahtar, hent(`${YAHOO}/${encodeURIComponent(sembol)}?range=max&interval=1mo`));
      const v = await onbellek.get(anahtar);
      const s = v?.chart?.result?.[0];
      const tepe = s?.indicators?.quote?.[0]?.high;
      if (!s?.timestamp || !tepe) throw new Error('Yahoo aylık yanıtı geçersiz');
      let en = 0;
      for (const [i, t] of s.timestamp.entries()) {
        if (new Date(t * 1000).toISOString().slice(0, 10) < once && tepe[i] > en) en = tepe[i];
      }
      return en;
    },
  };
}
