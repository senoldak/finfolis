// Eşik olayları: dünya borsaları, pariteler, emtia, kripto, seçili hisse ve ETF'ler için uzun dönem günlük
// kapanışlardan haber değeri taşıyan eşikleri bulur: tüm zamanların rekoru, çok yıllık zirve/dip, son bir yılın
// zirvesinden belirli bir yüzde düşüş ve dibinden yükseliş, üst üste yükseliş/düşüş serisi, olağandışı sert gün.
// Kapak, olayı gösteren çizgi grafiğidir.
//
// Veri: Yahoo Finance (yahoo-seri.mjs), 30 yıllık günlük kapanış. Yalnızca kapanmış günler değerlendirilir.
// "Tüm zamanların rekoru" yalnızca tarihi tam bilinen seride yazılır ve 30 yıldan eski aylık tepelerle denetlenir;
// pariteler, tahvil faizi, VIX ve oranlarda "son N yılın en yüksek seviyesi" denir (verinin başladığı tarihten beri).
//
// Dolar/TL bilerek yok: lira sürekli değer kaybettiği için kur neredeyse her gün "rekor" kırar; haber değeri
// taşımaz. BIST 100'ün anlamlı rekoru dolar bazında aranır. Türkiye olayları ayrıca günlük tavanla sınırlıdır.
import { grafikKapagi } from '../../kapak/kapak.mjs';
import { trSayi } from './ortak.mjs';
import { seriOkuyucu, YAHOO_KAYNAK, TURETILMIS } from '../yahoo-seri.mjs';

export { kapanislar } from '../yahoo-seri.mjs';

const GUN = 864e5;
const YIL = 365.25 * GUN;

// dusus/yukselis: son bir yılın zirvesinden düşüş ve dibinden yükseliş eşikleri (yüzde, artan sıra).
// olagan: en az bu kadar yüzde günlük hareket "olağandışı gün" adayıdır; seriEn: en az bu kadar gün üst üste.
// sira: günlük tavan dolunca önce düşük sıralılar yazılır (1 ana endeks/varlık, 2 diğer, 3 tek hisse).
// borsa: "düzeltme / ayı piyasası" kavramı yalnızca piyasa geneli (endeks, endeks ETF'i) için açıklanır.
// rekor: false ise "tüm zamanlar" denmez (tarihi 30 yıldan eskiye giden ya da türetilmiş seriler).
// turler: yalnızca bu olay türleri aranır. tr: Türkiye olayı (ayrı tavan).
// sicramaSiniri: tek günde bundan büyük hareket bölünme/bedelsiz düzeltmesi yapılmamış veri sayılır, olay aranmaz.
const ENDEKS = { kategori: 'borsa', birim: 'puan', dusus: [10, 20], yukselis: 20, olagan: 2.5, seriEn: 7, borsa: true, sira: 1 };
const PARITE = { kategori: 'doviz', birim: '', dusus: [10, 20], yukselis: 20, olagan: 1.2, seriEn: 7, ondalik: 4, rekor: false, sira: 2 };
const EMTIA = { kategori: 'piyasalar', bolge: 'kuresel', birim: 'dolar', onEk: '$', dusus: [20, 30], yukselis: 30, olagan: 4, seriEn: 8, sira: 2 };
const KRIPTO = { kategori: 'kripto', bolge: 'kuresel', birim: 'dolar', onEk: '$', dusus: [20, 40], yukselis: 40, olagan: 8, seriEn: 8, sira: 2 };
const ETF = { kategori: 'borsa', birim: 'dolar', onEk: '$', dusus: [10, 20], yukselis: 20, olagan: 3, seriEn: 8, borsa: true, sira: 2, sicramaSiniri: 40 };
const HISSE = { kategori: 'borsa', dusus: [20, 30], yukselis: 30, olagan: 7, seriEn: 9, sira: 3, sicramaSiniri: 40 };
const BIST_HISSE = { ...HISSE, bolge: 'kuresel', birim: 'TL', sonEk: ' TL', tr: true };
const ABD_HISSE = { ...HISSE, bolge: 'abd', birim: 'dolar', onEk: '$' };
const ORAN = { kategori: 'piyasalar', bolge: 'kuresel', birim: '', ondalik: 2, rekor: false, turler: ['yuksek', 'dusuk'], sira: 2 };

export const ENSTRUMANLAR = [
  // ABD
  { ...ENDEKS, id: 'sp500', ad: 'S&P 500', sembol: '^GSPC', bolge: 'abd' },
  { ...ENDEKS, id: 'nasdaq', ad: 'Nasdaq Bileşik', sembol: '^IXIC', bolge: 'abd' },
  { ...ENDEKS, id: 'dow', ad: 'Dow Jones', sembol: '^DJI', bolge: 'abd', sira: 2 },
  // Avrupa
  { ...ENDEKS, id: 'stoxx50', ad: 'Euro Stoxx 50', sembol: '^STOXX50E', bolge: 'avrupa' },
  { ...ENDEKS, id: 'dax', ad: 'Almanya DAX', sembol: '^GDAXI', bolge: 'avrupa', sira: 2 },
  { ...ENDEKS, id: 'ftse', ad: 'İngiltere FTSE 100', sembol: '^FTSE', bolge: 'avrupa', sira: 2 },
  // Asya
  { ...ENDEKS, id: 'nikkei', ad: 'Japonya Nikkei 225', sembol: '^N225', bolge: 'asya' },
  { ...ENDEKS, id: 'hangseng', ad: 'Hong Kong Hang Seng', sembol: '^HSI', bolge: 'asya', sira: 2 },
  { ...ENDEKS, id: 'sanghay', ad: 'Şanghay Bileşik', sembol: '000001.SS', bolge: 'asya', sira: 2 },
  { ...ENDEKS, id: 'nifty', ad: 'Hindistan Nifty 50', sembol: '^NSEI', bolge: 'asya', sira: 2 },
  { ...ENDEKS, id: 'kospi', ad: 'Güney Kore KOSPI', sembol: '^KS11', bolge: 'asya', sira: 2 },
  // Türkiye
  { ...ENDEKS, id: 'bist100', ad: 'BIST 100', sembol: 'XU100.IS', bolge: 'kuresel', tr: true },
  { ...ENDEKS, id: 'bistusd', ad: 'Dolar bazında BIST 100', turet: 'bistusd', bolge: 'kuresel', birim: 'dolar', onEk: '$', ondalik: 2, rekor: false, tr: true },
  // Oynaklık ve tahvil: yalnızca çok yıllık seviyeler ve olağandışı gün (yüzde düşüşü anlamsız).
  { id: 'vix', ad: 'VIX oynaklık endeksi', sembol: '^VIX', kategori: 'piyasalar', bolge: 'abd', birim: 'puan', olagan: 30, rekor: false, turler: ['yuksek', 'olagandisi'], sira: 1 },
  { id: 'abd10y', ad: 'ABD 10 yıllık tahvil faizi', sembol: '^TNX', kategori: 'ekonomi', bolge: 'abd', birim: 'percent', onEk: '%', ondalik: 2, rekor: false, turler: ['yuksek', 'dusuk', 'seri'], seriEn: 8, sira: 1 },
  // Pariteler: rekor nadirdir; haber değeri çok yıllık zirve/dipte. Yüzde 10 bir paritede büyük harekettir.
  { ...PARITE, id: 'eurusd', ad: 'EUR/USD paritesi', sembol: 'EURUSD=X', bolge: 'avrupa', sira: 1 },
  { ...PARITE, id: 'usdjpy', ad: 'USD/JPY paritesi', sembol: 'JPY=X', bolge: 'asya', ondalik: 2, sira: 1 },
  { ...PARITE, id: 'gbpusd', ad: 'GBP/USD paritesi', sembol: 'GBPUSD=X', bolge: 'avrupa' },
  { ...PARITE, id: 'usdcny', ad: 'USD/CNY (Çin yuanı)', sembol: 'CNY=X', bolge: 'asya' },
  { ...PARITE, id: 'dxy', ad: 'Dolar endeksi (DXY)', sembol: 'DX-Y.NYB', bolge: 'abd', ondalik: 2, sira: 1 },
  // Emtia
  { ...EMTIA, id: 'altin', ad: 'Ons altın', sembol: 'GC=F', kategori: 'doviz', dusus: [10, 20], yukselis: 20, olagan: 3, sira: 1 },
  { ...EMTIA, id: 'gumus', ad: 'Ons gümüş', sembol: 'SI=F', kategori: 'doviz' },
  { ...EMTIA, id: 'brent', ad: 'Brent petrol', sembol: 'BZ=F', birim: 'dolar (varil)', sira: 1 },
  { ...EMTIA, id: 'wti', ad: 'WTI ham petrol', sembol: 'CL=F', birim: 'dolar (varil)' },
  { ...EMTIA, id: 'dogalgaz', ad: 'ABD doğal gazı', sembol: 'NG=F', birim: 'dolar (MMBtu)', olagan: 8, seriEn: 9, ondalik: 3 },
  { ...EMTIA, id: 'bakir', ad: 'Bakır', sembol: 'HG=F', birim: 'dolar (libre)', ondalik: 3 },
  // Oranlar
  { ...ORAN, id: 'altingumus', ad: 'Altın/gümüş oranı', turet: 'altingumus' },
  { ...ORAN, id: 'btcaltin', ad: 'Bitcoin/altın oranı', turet: 'btcaltin', kategori: 'kripto' },
  // Kripto
  { ...KRIPTO, id: 'bitcoin', ad: 'Bitcoin', sembol: 'BTC-USD' },
  { ...KRIPTO, id: 'ethereum', ad: 'Ethereum', sembol: 'ETH-USD', olagan: 10 },
  // ETF'ler: SPY/QQQ yok, S&P 500 ve Nasdaq'la aynı haberi tekrarlar.
  { ...ETF, id: 'iwm', ad: "ABD küçük şirketler ETF'i (IWM)", sembol: 'IWM', bolge: 'abd' },
  { ...ETF, id: 'eem', ad: "Gelişmekte olan piyasalar ETF'i (EEM)", sembol: 'EEM', bolge: 'kuresel' },
  { ...ETF, id: 'tur', ad: "Türkiye ETF'i (TUR)", sembol: 'TUR', bolge: 'kuresel', tr: true },
  // Hisseler
  { ...ABD_HISSE, id: 'aapl', ad: 'Apple hissesi', sembol: 'AAPL' },
  { ...ABD_HISSE, id: 'msft', ad: 'Microsoft hissesi', sembol: 'MSFT' },
  { ...ABD_HISSE, id: 'nvda', ad: 'Nvidia hissesi', sembol: 'NVDA' },
  { ...ABD_HISSE, id: 'amzn', ad: 'Amazon hissesi', sembol: 'AMZN' },
  { ...ABD_HISSE, id: 'googl', ad: 'Alphabet hissesi', sembol: 'GOOGL' },
  { ...ABD_HISSE, id: 'meta', ad: 'Meta hissesi', sembol: 'META' },
  { ...ABD_HISSE, id: 'tsla', ad: 'Tesla hissesi', sembol: 'TSLA' },
  { ...BIST_HISSE, id: 'thyao', ad: 'Türk Hava Yolları (THYAO)', sembol: 'THYAO.IS' },
  { ...BIST_HISSE, id: 'asels', ad: 'Aselsan (ASELS)', sembol: 'ASELS.IS' },
  { ...BIST_HISSE, id: 'garan', ad: 'Garanti BBVA (GARAN)', sembol: 'GARAN.IS' },
  { ...BIST_HISSE, id: 'akbnk', ad: 'Akbank (AKBNK)', sembol: 'AKBNK.IS' },
  { ...BIST_HISSE, id: 'kchol', ad: 'Koç Holding (KCHOL)', sembol: 'KCHOL.IS' },
  { ...BIST_HISSE, id: 'tuprs', ad: 'Tüpraş (TUPRS)', sembol: 'TUPRS.IS' },
  { ...BIST_HISSE, id: 'bimas', ad: 'BİM (BIMAS)', sembol: 'BIMAS.IS' },
];

// Son 24 saatte en fazla bu kadar eşik olayı aday olur; her biri yazar ve yayın kurulunda birkaç Gemini çağrısı demek.
// Telegram'da bunlar yalnız @finfolis kanalına gider; fundov grubuna yalnız piyasa bülteni gider (mecmua-saat).
export const GUNLUK_AZAMI = 8;
export const TR_AZAMI = 2; // bunların en fazla bu kadarı Türkiye olayı
const ES_ZAMANLI = 4; // Yahoo'ya aynı anda en fazla bu kadar istek

export const EN_AZ_YIL = 2; // "X yılın en yüksek/düşük seviyesi" için en kısa süre
export const TAZE_GUN = 5; // eşik en fazla bu kadar işlem günü önce aşıldıysa haberdir
export const REKOR_GECMIS_YIL = 5; // "tüm zamanlar" için serinin en az bu kadar geriye gitmesi gerekir

const TR_AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trTarih = (iso) => `${Number(iso.slice(8, 10))} ${TR_AY[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
// Türkçe sayı eki: "yüzde 10'un", "yüzde 20'nin" ...
const EK = { 10: "'un", 20: "'nin", 30: "'un", 40: "'ın", 50: "'nin" };
const zaman = (iso) => Date.parse(`${iso}T00:00:00Z`);
const yuvarla = (n, o) => Math.round(n * 10 ** o) / 10 ** o;
const ONCELIK = ['rekor', 'olagandisi', 'dusus', 'yukselis', 'seri', 'yuksek', 'dusuk'];
const izinli = (e, tur) => !e.turler || e.turler.includes(tur);
// "son 1 yılın" yerine "son bir yılın"
const sure = (yil) => (yil <= 1 ? 'bir' : String(yil));

// Son kapanış için en önemli olay (en fazla bir). Saf fonksiyon: ağ yok, test edilebilir.
export function olaylariBul(seri, e) {
  const out = [];
  if (seri.length < 260) return out;
  const n = seri.length - 1;
  const son = seri[n];
  const onceki = seri.slice(0, n);
  const ilk = seri[0];
  const kapsam = (zaman(son.tarih) - zaman(ilk.tarih)) / YIL;

  // Son iki yılda tek günlük aşırı sıçrama: bölünme/bedelsiz düzeltilmemiş olabilir, sahte "çöküş" yazılmaz.
  if (e.sicramaSiniri) {
    const sinir = zaman(son.tarih) - 2 * YIL;
    for (let i = 1; i <= n; i++) {
      if (zaman(seri[i].tarih) < sinir) continue;
      if (Math.abs(seri[i].deger / seri[i - 1].deger - 1) * 100 > e.sicramaSiniri) return out;
    }
  }

  // 1) Rekor ya da çok yıllık zirve / dip
  let enYuksek = onceki[0];
  for (const p of onceki) if (p.deger > enYuksek.deger) enYuksek = p;
  if (son.deger > enYuksek.deger && e.rekor !== false && kapsam >= REKOR_GECMIS_YIL) {
    if (izinli(e, 'rekor')) out.push({ tur: 'rekor', referans: enYuksek });
  } else {
    // Son kapanıştan yüksek/düşük en son kapanış: o günden beri en yüksek/düşük seviye.
    // Seride hiç yoksa: verinin başladığı tarihten beri (rekor yazılamayan serilerde "son N yılın en yükseği").
    for (const [tur, kosul, uc] of [
      ['yuksek', (p) => p.deger >= son.deger, (a, b) => (b.deger > a.deger ? b : a)],
      ['dusuk', (p) => p.deger <= son.deger, (a, b) => (b.deger < a.deger ? b : a)],
    ]) {
      if (!izinli(e, tur)) continue;
      let j = n - 1;
      while (j >= 0 && !kosul(seri[j])) j--;
      if (j >= 0) {
        const yil = (zaman(son.tarih) - zaman(seri[j].tarih)) / YIL;
        if (yil >= EN_AZ_YIL) out.push({ tur, referans: seri[j], yil: Math.floor(yil) });
      } else if (kapsam >= EN_AZ_YIL && n > 0) {
        out.push({ tur, referans: onceki.reduce(uc), yil: Math.floor(kapsam), veriBasi: ilk.tarih });
      }
    }
  }

  // 2) Olağandışı gün: en az e.olagan yüzde ve aynı yönde bu kadar sert günün en az bir yıldır görülmediği gün.
  if (e.olagan && izinli(e, 'olagandisi')) {
    const degisim = (i) => (seri[i].deger / seri[i - 1].deger - 1) * 100;
    const bugun = degisim(n);
    if (Math.abs(bugun) >= e.olagan) {
      let j = n - 1;
      while (j >= 1 && !(Math.sign(degisim(j)) === Math.sign(bugun) && Math.abs(degisim(j)) >= Math.abs(bugun))) j--;
      const bitis = j >= 1 ? seri[j].tarih : ilk.tarih;
      const yil = (zaman(son.tarih) - zaman(bitis)) / YIL;
      if (yil >= 1) {
        out.push({ tur: 'olagandisi', yuzde: bugun, yil: Math.floor(yil), referans: seri[n - 1], onceGun: j >= 1 ? { tarih: seri[j].tarih, yuzde: degisim(j) } : null });
      }
    }
  }

  // 3) Üst üste yükseliş/düşüş serisi: en az e.seriEn gün ve aynı yönde bu uzunlukta seri en az bir yıldır yok.
  if (e.seriEn && izinli(e, 'seri')) {
    const yon = (i) => Math.sign(seri[i].deger - seri[i - 1].deger);
    const y = yon(n);
    let bas = n;
    while (bas > 1 && yon(bas - 1) === y) bas--;
    const uzunluk = n - bas + 1;
    if (y !== 0 && uzunluk >= e.seriEn) {
      // Öncekiler: bas-1'den geriye aynı yönde en az bu uzunlukta bir seri ara.
      let i = bas - 1;
      let onceki = null;
      while (i >= 1) {
        if (yon(i) !== y) {
          i--;
          continue;
        }
        let k = i;
        while (k > 1 && yon(k - 1) === y) k--;
        if (i - k + 1 >= uzunluk) {
          onceki = { tarih: seri[i].tarih, uzunluk: i - k + 1 };
          break;
        }
        i = k - 1;
      }
      const yil = (zaman(son.tarih) - zaman(onceki ? onceki.tarih : ilk.tarih)) / YIL;
      if (yil >= 1) out.push({ tur: 'seri', yon: y > 0 ? 'yukari' : 'asagi', uzunluk, baslangic: seri[bas - 1], yil: Math.floor(yil), onceki, referans: seri[bas - 1] });
    }
  }

  // 4) Son bir yılın zirvesinden düşüş ve dibinden yükseliş: eşik son TAZE_GUN içinde aşıldıysa.
  if (e.dusus || e.yukselis) {
    const yilBasi = zaman(son.tarih) - YIL;
    const k = seri.findIndex((p) => zaman(p.tarih) >= yilBasi);
    const yilSerisi = seri.slice(k);
    const zirveI = yilSerisi.reduce((m, p, i) => (p.deger > yilSerisi[m].deger ? i : m), 0);
    const dipI = yilSerisi.reduce((m, p, i) => (p.deger < yilSerisi[m].deger ? i : m), 0);
    const zirve = yilSerisi[zirveI];
    const dip = yilSerisi[dipI];
    const tazeMi = (i) => i >= yilSerisi.length - 1 - TAZE_GUN;

    const dusus = ((son.deger - zirve.deger) / zirve.deger) * 100;
    // Zirveden bu yana aşılmış en derin eşik; ilk aşıldığı gün taze olmalı ve fiyat hâlâ eşiğin altında olmalı.
    // Daha derin eşik aşılıp fiyat toparlanınca sığ eşik ikinci kez haber olmaz.
    for (const esik of [...(e.dusus ?? [])].reverse()) {
      if (!izinli(e, 'dusus')) break;
      const ilkAsim = yilSerisi.findIndex((p, i) => i > zirveI && p.deger <= zirve.deger * (1 - esik / 100));
      if (ilkAsim < 0) continue;
      if (tazeMi(ilkAsim) && dusus <= -esik) out.push({ tur: 'dusus', esik, referans: zirve, asim: yilSerisi[ilkAsim], yuzde: dusus });
      break;
    }
    const yukselis = ((son.deger - dip.deger) / dip.deger) * 100;
    if (e.yukselis && izinli(e, 'yukselis') && yukselis >= e.yukselis) {
      const ilkAsim = yilSerisi.findIndex((p, i) => i > dipI && p.deger >= dip.deger * (1 + e.yukselis / 100));
      if (tazeMi(ilkAsim)) out.push({ tur: 'yukselis', esik: e.yukselis, referans: dip, asim: yilSerisi[ilkAsim], yuzde: yukselis });
    }
  }
  // Bir enstrüman için günde tek haber: aynı hareketin iki yüzü (rekor ve dipten yükseliş) ayrı yazı olmaz.
  out.sort((a, b) => ONCELIK.indexOf(a.tur) - ONCELIK.indexOf(b.tur));
  return out.slice(0, 1);
}

const fark = (a, b) => yuvarla(((a - b) / b) * 100, 1);

// Rekoru 30 yıllık günlük pencereden eski aylık tepeye karşı denetler; geçemezse "son N yılın en yükseği"ne iner.
export function rekorDenetle(o, seri, eskiTepe) {
  if (o?.tur !== 'rekor' || !(eskiTepe >= seri.at(-1).deger)) return o;
  const yil = Math.floor((zaman(seri.at(-1).tarih) - zaman(seri[0].tarih)) / YIL);
  return { tur: 'yuksek', referans: o.referans, yil, veriBasi: seri[0].tarih };
}

// Olayı haber adayına çevirir: deterministik başlık, kaynak metni (her rakam burada), grafik kapağı.
export function adayYap(o, e, seri) {
  const son = seri.at(-1);
  const r = o.referans;
  const od = e.ondalik ?? 2;
  const d = (v) => `${e.onEk ?? ''}${v.toLocaleString('tr-TR', { minimumFractionDigits: od, maximumFractionDigits: od })}${e.sonEk ?? ''}`;
  const nokta = (v) => yuvarla(v, od).toFixed(od); // kaynak metinde makine biçimi: 4178.60
  const kaynakAdi = e.turet ? `derived from ${[TURETILMIS[e.turet].pay, TURETILMIS[e.turet].payda ?? TURETILMIS[e.turet].carpan].join(' and ')}` : e.sembol;
  const yilOnce = seri.find((p) => zaman(p.tarih) >= zaman(son.tarih) - YIL);
  const satirlar = [
    `${e.ad} (${kaynakAdi}) daily close: ${nokta(son.deger)}${e.birim ? ` ${e.birim}` : ''} on ${son.tarih}.`,
    `Close one year earlier: ${nokta(yilOnce.deger)} (${yilOnce.tarih}); change over the year: ${fark(son.deger, yilOnce.deger)}%.`,
  ];
  let baslik, kisa, vurgu, cizgiler, baslangic;
  // Kapakta veri renginde vurgulanacak günler: varsayılan son gün (bir önceki kapanıştan bugüne).
  let olay = { bas: seri.at(-2).tarih, yon: 'yukselis' };
  let kimlik = son.tarih.slice(0, 7); // rekor ve çok yıllık seviyeler ayda bir haber (ralli süresince her gün değil)
  if (o.tur === 'rekor') {
    baslik = `${e.ad} tüm zamanların en yüksek kapanışını gördü`;
    kisa = 'rekor';
    vurgu = 'Tüm zamanların en yüksek kapanışı';
    satirlar.push(
      `This is the highest daily close on record (an all-time high, record close); the daily data series starts on ${seri[0].tarih} and older monthly highs are lower.`,
      `Previous record close: ${nokta(r.deger)} on ${r.tarih}; the new close is ${fark(son.deger, r.deger)}% above it.`,
    );
    cizgiler = [{ deger: r.deger, etiket: `Önceki rekor ${d(r.deger)} · ${trTarih(r.tarih)}` }];
    baslangic = zaman(son.tarih) - 5 * YIL;
  } else if (o.tur === 'yuksek' || o.tur === 'dusuk') {
    const yuksek = o.tur === 'yuksek';
    const yon = yuksek ? 'highest' : 'lowest';
    baslik = `${e.ad} son ${sure(o.yil)} yılın en ${yuksek ? 'yüksek' : 'düşük'} seviyesinde`;
    kisa = yuksek ? 'cok-yillik-zirve' : 'cok-yillik-dip';
    vurgu = `${o.yil} yılın en ${yuksek ? 'yükseği' : 'düşüğü'}`;
    if (o.veriBasi) {
      satirlar.push(
        `This is the ${yon} close since the daily data series begins on ${o.veriBasi}, about ${o.yil} years. The ${yon} earlier close in that period was ${nokta(r.deger)} on ${r.tarih}.`,
      );
      cizgiler = [{ deger: r.deger, etiket: `Önceki ${yuksek ? 'zirve' : 'dip'} ${d(r.deger)} · ${trTarih(r.tarih)}` }];
    } else {
      satirlar.push(`This is the ${yon} close since ${r.tarih}, when it closed at ${nokta(r.deger)}: the ${yon} level in about ${o.yil} years.`);
      cizgiler = [{ deger: r.deger, etiket: `${trTarih(r.tarih)}: ${d(r.deger)}` }];
    }
    baslangic = Math.min(zaman(r.tarih) - YIL, zaman(son.tarih) - 3 * YIL);
    if (!yuksek) olay.yon = 'dusus';
  } else if (o.tur === 'olagandisi') {
    const artis = o.yuzde > 0;
    baslik = `${e.ad} son ${sure(o.yil)} yılın en sert günlük ${artis ? 'yükselişini' : 'düşüşünü'} yaşadı`;
    kisa = 'olagandisi';
    vurgu = `Günlük ${artis ? '+' : '−'}%${trSayi(Math.abs(o.yuzde), 1)}`;
    satirlar.push(
      `Daily change on ${son.tarih}: ${yuvarla(o.yuzde, 1)}% (previous close ${nokta(r.deger)} on ${r.tarih}).`,
      o.onceGun
        ? `The last daily ${artis ? 'rise' : 'fall'} at least this large was on ${o.onceGun.tarih} (${yuvarla(o.onceGun.yuzde, 1)}%), about ${o.yil} years ago.`
        : `No daily ${artis ? 'rise' : 'fall'} this large since the data series begins on ${seri[0].tarih}.`,
    );
    cizgiler = [{ deger: r.deger, etiket: `Önceki kapanış ${d(r.deger)}` }];
    olay.yon = artis ? 'yukselis' : 'dusus';
    baslangic = zaman(son.tarih) - 0.5 * YIL;
    kimlik = son.tarih;
  } else if (o.tur === 'seri') {
    const yukari = o.yon === 'yukari';
    const toplam = fark(son.deger, o.baslangic.deger);
    baslik = `${e.ad} üst üste ${o.uzunluk} işlem günüdür ${yukari ? 'yükseliyor' : 'düşüyor'}`;
    kisa = `seri-${o.yon}`;
    vurgu = `${o.uzunluk} gün üst üste ${yukari ? 'yükseliş' : 'düşüş'}`;
    satirlar.push(
      `${e.ad} closed ${yukari ? 'higher' : 'lower'} for ${o.uzunluk} consecutive trading days, from ${nokta(o.baslangic.deger)} on ${o.baslangic.tarih} to ${nokta(son.deger)}; total change ${toplam}%.`,
      o.onceki
        ? `The last ${yukari ? 'winning' : 'losing'} streak at least this long ended on ${o.onceki.tarih} (${o.onceki.uzunluk} days), about ${o.yil} years ago.`
        : `This is the longest such streak since the data series begins on ${seri[0].tarih}.`,
    );
    cizgiler = [{ deger: o.baslangic.deger, etiket: `Seri başı ${d(o.baslangic.deger)} · ${trTarih(o.baslangic.tarih)}` }];
    baslangic = zaman(son.tarih) - 0.5 * YIL;
    kimlik = o.baslangic.tarih; // seri başına bir haber
    olay = { bas: o.baslangic.tarih, yon: yukari ? 'yukselis' : 'dusus' };
  } else if (o.tur === 'dusus') {
    baslik = `${e.ad} son bir yılın zirvesinden yüzde ${o.esik}${EK[o.esik] ?? ''} üzerinde geriledi`;
    kisa = `dusus-${o.esik}`;
    vurgu = `Zirveden −%${trSayi(Math.abs(o.yuzde), 1)}`;
    satirlar.push(
      `Highest close of the past 12 months (peak): ${nokta(r.deger)} on ${r.tarih}.`,
      `The latest close is ${Math.abs(fark(son.deger, r.deger))}% below that peak. The ${o.esik}% decline threshold was first crossed on ${o.asim.tarih} (close ${nokta(o.asim.deger)}).`,
    );
    if (e.borsa) {
      satirlar.push(
        'Market convention: a decline of 10% or more from a recent peak is commonly called a "correction" (düzeltme), and a decline of 20% or more a "bear market" (ayı piyasası).',
      );
    }
    cizgiler = [{ deger: r.deger, etiket: `Zirve ${d(r.deger)} · ${trTarih(r.tarih)}` }];
    baslangic = zaman(son.tarih) - 1.25 * YIL;
    kimlik = r.tarih; // zirve başına bir haber
    olay = { bas: r.tarih, yon: 'dusus' };
  } else {
    baslik = `${e.ad} son bir yılın dibinden yüzde ${o.esik}${EK[o.esik] ?? ''} üzerinde yükseldi`;
    kisa = `yukselis-${o.esik}`;
    vurgu = `Dipten +%${trSayi(o.yuzde, 1)}`;
    satirlar.push(
      `Lowest close of the past 12 months (trough): ${nokta(r.deger)} on ${r.tarih}.`,
      `The latest close is ${fark(son.deger, r.deger)}% above that trough. The ${o.esik}% rise threshold was first crossed on ${o.asim.tarih} (close ${nokta(o.asim.deger)}).`,
    );
    if (e.borsa) satirlar.push('Market convention: a rise of 20% or more from a recent low is commonly called a "bull market" (boğa piyasası).');
    cizgiler = [{ deger: r.deger, etiket: `Dip ${d(r.deger)} · ${trTarih(r.tarih)}` }];
    baslangic = zaman(son.tarih) - 1.25 * YIL;
    kimlik = r.tarih; // dip başına bir haber
    olay = { bas: r.tarih, yon: 'yukselis' };
  }
  if (e.turet === 'bistusd') satirlar.push('BIST 100 in US dollars = BIST 100 index level divided by the USD/TRY exchange rate.');
  satirlar.push(`Prices are daily closing values. Source: ${YAHOO_KAYNAK.ad}.`);

  return {
    id: `esik:${e.id}:${kisa}:${kimlik}`,
    baslik,
    tarih: new Date(`${son.tarih}T00:00:00+03:00`),
    onem: 80,
    kategori: e.kategori,
    bolge: e.bolge,
    ucretli: false,
    kaynakMetni: satirlar.join(' '),
    kaynaklar: [YAHOO_KAYNAK],
    kapak: grafikKapagi({
      kategori: e.kategori,
      baslik,
      seri: seri.filter((p) => zaman(p.tarih) >= baslangic),
      cizgiler,
      vurgu,
      olay,
      onEk: e.onEk ?? '',
      sonEk: e.sonEk ?? '',
      ondalik: od,
    }),
    kapakAlt: `${e.ad} günlük kapanış grafiği: ${vurgu.toLocaleLowerCase('tr-TR')}, son kapanış ${d(son.deger)}`,
  };
}

// Son 24 saatte görülmüş eşik olayları (botun gorulen kaydından): toplam ve Türkiye olayı sayısı.
const TR_IDLER = new Set(ENSTRUMANLAR.filter((e) => e.tr).map((e) => e.id));
export function sonGunSayisi(gorulen = {}, simdi = new Date()) {
  const sinir = simdi.getTime() - GUN;
  const ids = Object.entries(gorulen)
    .filter(([id, g]) => id.startsWith('esik:') && Date.parse(g?.zaman) >= sinir)
    .map(([id]) => id.split(':')[1]);
  return { toplam: ids.length, tr: ids.filter((id) => TR_IDLER.has(id)).length };
}

// Öncelik sırasıyla tavan uygular: toplam hak ve Türkiye hakkı.
export function tavanUygula(adaylar, { toplam, tr }) {
  const out = [];
  let trKalan = tr;
  for (const a of [...adaylar].sort((x, y) => x._sira - y._sira || x._tur - y._tur || x.id.localeCompare(y.id))) {
    if (out.length >= toplam) break;
    if (a._tr) {
      if (trKalan <= 0) continue;
      trKalan--;
    }
    out.push(a);
  }
  return out.map(({ _sira, _tur, _tr, ...a }) => a);
}

export default {
  ad: 'esik-olaylari',
  async hent(ctx = {}) {
    const simdi = ctx.simdi ?? new Date();
    const goruldu = ctx.goruldu ?? (() => false);
    const okuyucu = ctx.okuyucu ?? seriOkuyucu(simdi);
    const adaylar = [];
    const sira = [...ENSTRUMANLAR];
    const isci = async () => {
      for (let e = sira.shift(); e; e = sira.shift()) {
        try {
          const seri = await okuyucu.seri(e);
          for (let o of olaylariBul(seri, e)) {
            // Aylık tepe alınamazsa rekor iddiası yazılmaz: "son N yılın en yükseği"ne iner.
            if (o.tur === 'rekor') o = rekorDenetle(o, seri, await okuyucu.aylikTepe(e.sembol, seri[0].tarih).catch(() => Infinity));
            adaylar.push({ ...adayYap(o, e, seri), _sira: e.sira ?? 2, _tur: ONCELIK.indexOf(o.tur), _tr: Boolean(e.tr) });
          }
        } catch (err) {
          // Tek enstrümanın hatası diğerlerini durdurmaz.
          console.error(`[esik-olaylari] ${e.sembol ?? e.turet}: ${err.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: ES_ZAMANLI }, isci));
    // Günlük tavan: daha önce görülenler sayılmaz; kalan hak önce ana varlıklara, sonra olay türü önceliğine.
    const sayac = sonGunSayisi(ctx.gorulen, simdi);
    const hak = { toplam: Math.max(0, GUNLUK_AZAMI - sayac.toplam), tr: Math.max(0, TR_AZAMI - sayac.tr) };
    return tavanUygula(
      adaylar.filter((a) => !goruldu(a.id)),
      hak,
    );
  },
};
