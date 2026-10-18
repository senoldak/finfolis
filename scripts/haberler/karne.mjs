// Piyasa karneleri: Gemini'siz, doğrudan veriden şablonla yazılan düzenli özet yazıları.
//  - Haftalık karne: hafta sonu (İstanbul saatiyle cumartesi/pazar) biten haftanın getirileri, dünya geneli.
//  - Aylık karne: ayın ilk haftası, biten ayın getirileri.
//  - Enflasyon karnesi: TÜİK aylık TÜFE açıklandıktan sonra, TL bazında yatırım araçlarının aylık ve yıllık
//    getirisi enflasyonla yan yana. Yalnızca geçmiş veridir; öneri değildir.
//  - Haftanın hisseleri: pazar günü, biten haftada BIST'in ve ABD'nin büyük şirketlerinin getirileri (iki yazı).
//  - Aylık sektör karnesi: ayın ilk haftası, ABD S&P 500 sektörlerinin (sektör ETF'leri) biten ay getirisi.
//  - Yılbaşından bu yana karne: çeyrek bitince (ocak, nisan, temmuz, ekimin 8-14'ü) yıl başından çeyrek sonuna;
//    ocakta biten yılın karnesi.
// Her biri bir kez yazılır: durum.karne'de dönem anahtarı tutulur. Telegram'da yalnız @finfolis kanalına gider.
import { seriOkuyucu, YAHOO_KAYNAK } from './yahoo-seri.mjs';
import { karneKapagi } from '../kapak/kapak.mjs';

const TZ = 'Europe/Istanbul';
const GUN = 864e5;
const TR_AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_DE = ["Ocak'ta", "Şubat'ta", "Mart'ta", "Nisan'da", "Mayıs'ta", "Haziran'da", "Temmuz'da", "Ağustos'ta", "Eylül'de", "Ekim'de", "Kasım'da", "Aralık'ta"];
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const zaman = (t) => Date.parse(`${t}T00:00:00Z`);
const tr = (n, d = 1) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
const yuzde = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}%${tr(Math.abs(v))}`;

// Dünya geneli karne: her borsa kendi para biriminde. Türkiye tek satır (BIST 100, dolar bazında da).
export const KARNE = [
  { ad: 'S&P 500', sembol: '^GSPC', grup: 'Borsalar' },
  { ad: 'Nasdaq', sembol: '^IXIC', grup: 'Borsalar' },
  { ad: 'Euro Stoxx 50', sembol: '^STOXX50E', grup: 'Borsalar' },
  { ad: 'DAX', sembol: '^GDAXI', grup: 'Borsalar' },
  { ad: 'FTSE 100', sembol: '^FTSE', grup: 'Borsalar' },
  { ad: 'Nikkei 225', sembol: '^N225', grup: 'Borsalar' },
  { ad: 'Hang Seng', sembol: '^HSI', grup: 'Borsalar' },
  { ad: 'BIST 100 ($)', turet: 'bistusd', grup: 'Borsalar' },
  { ad: 'Altın', sembol: 'GC=F', grup: 'Emtia', onEk: '$' },
  { ad: 'Gümüş', sembol: 'SI=F', grup: 'Emtia', onEk: '$' },
  { ad: 'Brent petrol', sembol: 'BZ=F', grup: 'Emtia', onEk: '$' },
  { ad: 'Bakır', sembol: 'HG=F', grup: 'Emtia', onEk: '$', ondalik: 3 },
  { ad: 'Bitcoin', sembol: 'BTC-USD', grup: 'Kripto', onEk: '$' },
  { ad: 'Ethereum', sembol: 'ETH-USD', grup: 'Kripto', onEk: '$' },
  { ad: 'EUR/USD', sembol: 'EURUSD=X', grup: 'Döviz', ondalik: 4 },
  { ad: 'Dolar endeksi', sembol: 'DX-Y.NYB', grup: 'Döviz' },
];

// Haftanın hisseleri: BIST'in en büyük şirketleri (TL) ve ABD'nin en büyük şirketleri (dolar).
export const BIST_HISSELER = [
  ['THY', 'THYAO'], ['Aselsan', 'ASELS'], ['Garanti BBVA', 'GARAN'], ['Akbank', 'AKBNK'], ['İş Bankası', 'ISCTR'],
  ['Yapı Kredi', 'YKBNK'], ['Koç Holding', 'KCHOL'], ['Sabancı Holding', 'SAHOL'], ['Tüpraş', 'TUPRS'], ['BİM', 'BIMAS'],
  ['Ereğli', 'EREGL'], ['Ford Otosan', 'FROTO'], ['Turkcell', 'TCELL'], ['Pegasus', 'PGSUS'], ['Şişecam', 'SISE'],
  ['Türk Telekom', 'TTKOM'],
].map(([ad, kod]) => ({ ad: `${ad} (${kod})`, sembol: `${kod}.IS`, sonEk: ' TL' }));
export const ABD_HISSELER = [
  ['Nvidia', 'NVDA'], ['Apple', 'AAPL'], ['Microsoft', 'MSFT'], ['Alphabet', 'GOOGL'], ['Amazon', 'AMZN'], ['Meta', 'META'],
  ['Broadcom', 'AVGO'], ['Tesla', 'TSLA'], ['Berkshire Hathaway', 'BRK-B'], ['JPMorgan', 'JPM'], ['Eli Lilly', 'LLY'],
  ['Visa', 'V'], ['Walmart', 'WMT'], ['Exxon Mobil', 'XOM'], ['Netflix', 'NFLX'], ['AMD', 'AMD'],
].map(([ad, kod]) => ({ ad, sembol: kod, onEk: '$' }));
// ABD S&P 500 sektörleri: her biri sektörün SPDR ETF'iyle ölçülür.
export const SEKTORLER = [
  ['Teknoloji', 'XLK'], ['Finans', 'XLF'], ['Enerji', 'XLE'], ['Sağlık', 'XLV'], ['Tüketici (zorunlu olmayan)', 'XLY'],
  ['Tüketici (zorunlu)', 'XLP'], ['Sanayi', 'XLI'], ['Hammadde', 'XLB'], ['Kamu hizmetleri', 'XLU'], ['Gayrimenkul', 'XLRE'],
  ['İletişim hizmetleri', 'XLC'],
].map(([ad, kod]) => ({ ad, kod, sembol: kod, onEk: '$' }));

// Enflasyon karnesi: TL bazında, Türkiye'deki okurun elindeki araçlar.
export const ENFLASYON_ARACLARI = [
  // cumle: cümle içinde kullanılan ad
  { ad: 'Dolar', cumle: 'dolar', sembol: 'USDTRY=X', sonEk: ' TL', ondalik: 4 },
  { ad: 'Euro', cumle: 'euro', sembol: 'EURTRY=X', sonEk: ' TL', ondalik: 4 },
  { ad: 'Gram altın', cumle: 'gram altın', turet: 'gramaltin', sonEk: ' TL' },
  { ad: 'BIST 100', cumle: 'BIST 100', sembol: 'XU100.IS', sonEk: ' puan' },
  { ad: 'Bitcoin (TL)', cumle: 'TL bazında Bitcoin', turet: 'btctl', sonEk: ' TL', ondalik: 0 },
];

// Seride verilen tarihte ya da en fazla 6 gün öncesinde kapanış (tatil, hafta sonu). Yoksa null.
export function kapanisOncesi(seri, tarih) {
  for (let i = seri.length - 1; i >= 0; i--) {
    if (seri[i].tarih <= tarih) return zaman(tarih) - zaman(seri[i].tarih) <= 6 * GUN ? seri[i] : null;
  }
  return null;
}

export function getiri(seri, bas, bit) {
  const a = kapanisOncesi(seri, bas);
  const b = kapanisOncesi(seri, bit);
  if (!a || !b || a.tarih === b.tarih) return null;
  return { yuzde: (b.deger / a.deger - 1) * 100, son: b, ilk: a };
}

function istanbul(simdi) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(simdi)
      .map((x) => [x.type, x.value]),
  );
  return { gun: `${p.year}-${p.month}-${p.day}`, haftaGunu: p.weekday };
}

// Pazar ise biten hafta (haftanın hisseleri cumartesiki piyasa karnesinden bir gün sonra yazılır). Değilse null.
export function bitenHaftaPazar(simdi) {
  return istanbul(simdi).haftaGunu === 'Sun' ? bitenHafta(simdi) : null;
}

// Çeyreği izleyen ayın 8-14'ü ise yılbaşından çeyrek sonuna dönem (ocakta biten yılın tamamı). Değilse null.
export function bitenCeyrek(simdi) {
  const { gun } = istanbul(simdi);
  const [yil, ay, g] = [Number(gun.slice(0, 4)), Number(gun.slice(5, 7)), Number(gun.slice(8, 10))];
  if (![1, 4, 7, 10].includes(ay) || g < 8 || g > 14) return null;
  const bit = Date.UTC(yil, ay - 1, 0); // önceki ayın son günü = çeyrek sonu
  const d = new Date(bit);
  const dYil = d.getUTCFullYear();
  return { anahtar: iso(bit).slice(0, 7), bas: `${dYil - 1}-12-31`, bit: iso(bit), ay: d.getUTCMonth() + 1, yil: dYil };
}

// Cumartesi ya da pazar ise biten hafta: { anahtar: cuma tarihi, bas: önceki cuma, bit: cuma }. Değilse null.
export function bitenHafta(simdi) {
  const { gun, haftaGunu } = istanbul(simdi);
  const geri = { Sat: 1, Sun: 2 }[haftaGunu];
  if (!geri) return null;
  const cuma = zaman(gun) - geri * GUN;
  return { anahtar: iso(cuma), bas: iso(cuma - 7 * GUN), bit: iso(cuma) };
}

// Ayın ilk 7 günü ise biten ay: { anahtar: 'YYYY-MM', bas: önceki ayın son günü, bit: ayın son günü }. Değilse null.
export function bitenAy(simdi) {
  const { gun } = istanbul(simdi);
  if (Number(gun.slice(8, 10)) > 7) return null;
  return ayAraligi(Number(gun.slice(0, 4)), Number(gun.slice(5, 7)) - 1);
}

// ay 1-12 (0 = önceki yılın aralığı); bit = ayın son günü, bas = bir önceki ayın son günü.
export function ayAraligi(yil, ay) {
  const bit = Date.UTC(yil, ay, 0); // ay (1-12) için: bu ayın son günü
  const bas = Date.UTC(yil, ay - 1, 0);
  const d = new Date(bit);
  return { anahtar: iso(bit).slice(0, 7), bas: iso(bas), bit: iso(bit), ay: d.getUTCMonth() + 1, yil: d.getUTCFullYear() };
}

function tarihAraligi(bas, bit) {
  const [a, b] = [new Date(zaman(bas) + 3 * GUN), new Date(zaman(bit))]; // önceki cuma + 3 = pazartesi
  const ay = (d) => TR_AY[d.getUTCMonth()];
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${b.getUTCDate()} ${ay(b)} ${b.getUTCFullYear()}`;
  return `${a.getUTCDate()} ${ay(a)} – ${b.getUTCDate()} ${ay(b)} ${b.getUTCFullYear()}`;
}

const degerYaz = (e, v) => `${e.onEk ?? ''}${tr(v, e.ondalik ?? 2)}${e.sonEk ?? ''}`;

// Getiri listesinden karne yazısı (haftalık ya da aylık).
export function karneYazisi({ tur, donem, satirlar, simdi }) {
  const sirali = [...satirlar].sort((a, b) => b.yuzde - a.yuzde);
  const [enIyi, enKotu] = [sirali[0], sirali.at(-1)];
  const haftalik = tur === 'hafta';
  const ad = haftalik ? tarihAraligi(donem.bas, donem.bit) : `${TR_AY[donem.ay - 1]} ${donem.yil}`;
  const zamanSozu = haftalik ? 'Geçen hafta' : `${AY_DE[donem.ay - 1]}`;
  const spot =
    enKotu.yuzde < 0
      ? `${zamanSozu} en çok ${enIyi.ad} yükseldi (${yuzde(enIyi.yuzde)}), en çok ${enKotu.ad} geriledi (${yuzde(enKotu.yuzde)}).`
      : `${zamanSozu} izlediğimiz araçların hepsi yükseldi; en çok ${enIyi.ad} (${yuzde(enIyi.yuzde)}), en az ${enKotu.ad} (${yuzde(enKotu.yuzde)}).`;
  const gruplar = [...new Set(KARNE.map((k) => k.grup))];
  const bolumler = gruplar
    .map((g) => {
      const l = sirali.filter((s) => s.grup === g);
      if (!l.length) return '';
      return `## ${g}\n\n${l.map((s) => `- **${s.ad}:** ${yuzde(s.yuzde)} · ${degerYaz(s, s.son.deger)}`).join('\n')}`;
    })
    .filter(Boolean);
  bolumler.push(
    `Değişimler dönem başındaki ve sonundaki günlük kapanışlar arasındadır (${donem.bas} → ${donem.bit}). Her borsa kendi para biriminde ölçülür; BIST 100 karşılaştırılabilir olsun diye dolar bazında verilmiştir. Geçmiş performans gelecekteki sonuçların göstergesi değildir.`,
  );
  return {
    baslik: haftalik ? `Haftalık piyasa karnesi · ${ad}` : `Aylık piyasa karnesi · ${ad}`,
    spot,
    govde: bolumler.join('\n\n'),
    kategori: 'piyasalar',
    tarih: simdi,
    tur: 'haber',
    kaynaklar: [YAHOO_KAYNAK],
    rakamlar: [
      { etiket: `En çok yükselen · ${enIyi.ad}`, deger: yuzde(enIyi.yuzde) },
      { etiket: `En çok düşen · ${enKotu.ad}`, deger: yuzde(enKotu.yuzde) },
    ],
    kapak: karneKapagi({
      kategori: 'piyasalar',
      baslik: haftalik ? 'Haftalık piyasa karnesi' : `${TR_AY[donem.ay - 1]} ayı piyasa karnesi`,
      tarih: ad,
      satirlar: sirali.map((s) => ({ etiket: s.ad, deger: s.yuzde })),
    }),
    kapakAlt: `${haftalik ? 'Haftalık' : 'Aylık'} getiriler: en çok ${enIyi.ad} ${yuzde(enIyi.yuzde)}, en az ${enKotu.ad} ${yuzde(enKotu.yuzde)}`,
  };
}

// Basit liste karnesi (hisseler, sektörler, yılbaşından bu yana): getiriye göre sıralı tek liste, spotta en iyi/en kötü.
export function listeKarnesi({ baslik, kapakBaslik, etiket, zamanSozu, satirlar, donem, simdi, kategori = 'borsa', not }) {
  const sirali = [...satirlar].sort((a, b) => b.yuzde - a.yuzde);
  const [enIyi, enKotu] = [sirali[0], sirali.at(-1)];
  const yukselen = sirali.filter((s) => s.yuzde > 0).length;
  const spot =
    enKotu.yuzde < 0 && enIyi.yuzde > 0
      ? `${zamanSozu} ${sirali.length} kalemden ${yukselen} tanesi yükseldi; en çok ${enIyi.ad} (${yuzde(enIyi.yuzde)}) kazandırdı, en çok ${enKotu.ad} (${yuzde(enKotu.yuzde)}) kaybettirdi.`
      : enKotu.yuzde >= 0
        ? `${zamanSozu} ${sirali.length} kalemin hepsi yükseldi; en çok ${enIyi.ad} (${yuzde(enIyi.yuzde)}), en az ${enKotu.ad} (${yuzde(enKotu.yuzde)}).`
        : `${zamanSozu} ${sirali.length} kalemin hepsi geriledi; en az ${enIyi.ad} (${yuzde(enIyi.yuzde)}), en çok ${enKotu.ad} (${yuzde(enKotu.yuzde)}).`;
  const govde = [
    sirali.map((s) => `- **${s.ad}:** ${yuzde(s.yuzde)} · ${degerYaz(s, s.son.deger)}`).join('\n'),
    `Değişimler dönem başındaki ve sonundaki günlük kapanışlar arasındadır (${donem.bas} → ${donem.bit}).${not ? ` ${not}` : ''} Geçmiş performans gelecekteki sonuçların göstergesi değildir; bu liste yatırım tavsiyesi değildir.`,
  ].join('\n\n');
  return {
    baslik,
    spot,
    govde,
    kategori,
    tarih: simdi,
    tur: 'haber',
    kaynaklar: [YAHOO_KAYNAK],
    rakamlar: [
      { etiket: `En çok yükselen · ${enIyi.ad}`, deger: yuzde(enIyi.yuzde) },
      { etiket: `En çok düşen · ${enKotu.ad}`, deger: yuzde(enKotu.yuzde) },
    ],
    kapak: karneKapagi({ kategori, baslik: kapakBaslik, tarih: etiket, satirlar: sirali.map((s) => ({ etiket: s.ad, deger: s.yuzde })) }),
    kapakAlt: `${kapakBaslik}: en çok ${enIyi.ad} ${yuzde(enIyi.yuzde)}, en az ${enKotu.ad} ${yuzde(enKotu.yuzde)}`,
  };
}

const reel = (r, p) => ((1 + r / 100) / (1 + p / 100) - 1) * 100;

// Enflasyon karnesi yazısı. satirlar: [{ ad, aylik, yillik, son }], tufe: { ay, yil, aylik, yillik }.
export function enflasyonYazisi({ tufe, satirlar, simdi, kaynak }) {
  const ayAdi = TR_AY[tufe.ay - 1];
  const aylikYenen = satirlar.filter((s) => s.aylik > tufe.aylik);
  const yillikYenen = satirlar.filter((s) => s.yillik > tufe.yillik);
  const liste = (l) => l.map((s) => s.cumle ?? s.ad).join(', ');
  const baslik =
    yillikYenen.length === 0
      ? `Son bir yılda yatırım araçlarının hiçbiri enflasyonun üzerinde kalmadı`
      : `${AY_DE[tufe.ay - 1]} hangi yatırım araçları enflasyonun üzerinde kaldı?`;
  const spot = `TÜİK verisine göre tüketici fiyatları ${ayAdi.toLocaleLowerCase('tr-TR')} ayında yüzde ${tr(tufe.aylik, 2)}, son bir yılda yüzde ${tr(tufe.yillik, 2)} arttı. ${
    yillikYenen.length ? `Son bir yılda enflasyonun üzerinde getiri: ${liste(yillikYenen)}.` : 'İzlenen araçların hiçbiri son bir yılda enflasyonun üzerinde getiri sağlamadı.'
  }`;
  const sirali = [...satirlar].sort((a, b) => b.yillik - a.yillik);
  const govde = [
    `${ayAdi} ${tufe.yil} için açıklanan enflasyon verisi, TL bazında yaygın yatırım araçlarının aynı dönemdeki değişimiyle aşağıda karşılaştırılıyor. Reel getiri, fiyat değişiminin enflasyondan arındırılmış hâlidir: sıfırın üzerindeyse araç, alım gücünü korumuş demektir.`,
    `## Aylık\n\nTÜFE ${ayAdi.toLocaleLowerCase('tr-TR')} ayında yüzde ${tr(tufe.aylik, 2)} arttı. ${
      aylikYenen.length ? `Bu ay enflasyonun üzerinde kalanlar: ${liste(aylikYenen)}.` : 'Bu ay izlenen araçların hiçbiri aylık enflasyonun üzerinde kalmadı.'
    }`,
    `## Son bir yıl\n\n${sirali.map((s) => `- **${s.ad}:** ${yuzde(s.yillik)} (reel ${yuzde(reel(s.yillik, tufe.yillik))})`).join('\n')}`,
    'Değişimler ay sonu kapanışları arasındadır. Gram altın, ons altın fiyatı ile dolar kurundan hesaplanmıştır. Mevduat faizi bu karşılaştırmaya dahil değildir. Geçmiş getiri gelecekteki sonuçların göstergesi değildir.',
  ].join('\n\n');
  return {
    baslik,
    spot,
    govde,
    kategori: 'kisisel-finans',
    tarih: simdi,
    tur: 'haber',
    kaynaklar: [kaynak, YAHOO_KAYNAK].filter(Boolean),
    tablo: {
      baslik: `${ayAdi} ${tufe.yil}: getiri ve enflasyon (yüzde)`,
      sutunlar: ['Araç', 'Aylık', 'Yıllık', 'Yıllık reel'],
      satirlar: [
        ...sirali.map((s) => [s.ad, yuzde(s.aylik), yuzde(s.yillik), yuzde(reel(s.yillik, tufe.yillik))]),
        ['TÜFE', yuzde(tufe.aylik), yuzde(tufe.yillik), '—'],
      ],
    },
    rakamlar: [
      { etiket: 'Aylık enflasyon', deger: `%${tr(tufe.aylik, 2)}` },
      { etiket: 'Yıllık enflasyon', deger: `%${tr(tufe.yillik, 2)}` },
    ],
    kapak: karneKapagi({
      kategori: 'kisisel-finans',
      baslik: `Son bir yılda yatırım araçları ve enflasyon`,
      tarih: `${ayAdi} ${tufe.yil}`,
      satirlar: sirali.map((s) => ({ etiket: s.ad, deger: s.yillik })),
      cizgi: { deger: tufe.yillik, etiket: `Yıllık enflasyon %${tr(tufe.yillik)}` },
    }),
    kapakAlt: `Yıllık getiriler ve yüzde ${tr(tufe.yillik)} yıllık enflasyon`,
  };
}

async function getiriListesi(liste, okuyucu, bas, bit) {
  const out = [];
  await Promise.all(
    liste.map(async (e) => {
      try {
        const g = getiri(await okuyucu.seri(e), bas, bit);
        if (g) out.push({ ...e, ...g });
      } catch (err) {
        console.error(`[karne] ${e.sembol ?? e.turet}: ${err.message}`);
      }
    }),
  );
  return out;
}

// Zamanı gelen karneleri üretir (yaziYaz'a verilecek yazılar). durum.karne'yi günceller; hata vermez, atlar.
export async function karneler({ durum, simdi = new Date(), piyasa, okuyucu, log = console.log } = {}) {
  durum.karne ??= {};
  const yazilar = [];
  const oku = () => (okuyucu ??= seriOkuyucu(simdi));

  const hafta = bitenHafta(simdi);
  if (hafta && durum.karne.hafta !== hafta.anahtar) {
    const satirlar = await getiriListesi(KARNE, oku(), hafta.bas, hafta.bit);
    // Verinin büyük kısmı yoksa (Yahoo kesintisi) yazılmaz, sonraki çalıştırmada yeniden denenir.
    if (satirlar.length >= KARNE.length - 3) {
      yazilar.push(karneYazisi({ tur: 'hafta', donem: hafta, satirlar, simdi }));
      durum.karne.hafta = hafta.anahtar;
    } else log(`  ! haftalık karne: yalnızca ${satirlar.length} araç alındı, ertelendi`);
  }

  const ay = bitenAy(simdi);
  if (ay && durum.karne.ay !== ay.anahtar) {
    const satirlar = await getiriListesi(KARNE, oku(), ay.bas, ay.bit);
    if (satirlar.length >= KARNE.length - 3) {
      yazilar.push(karneYazisi({ tur: 'ay', donem: ay, satirlar, simdi }));
      durum.karne.ay = ay.anahtar;
    } else log(`  ! aylık karne: yalnızca ${satirlar.length} araç alındı, ertelendi`);
  }

  // Haftanın hisseleri (pazar): BIST ve ABD ayrı yazı; ikisi aynı dönem anahtarıyla bir kez.
  const pazar = bitenHaftaPazar(simdi);
  if (pazar && durum.karne.hisseHafta !== pazar.anahtar) {
    const ad = tarihAraligi(pazar.bas, pazar.bit);
    const [bist, abd] = await Promise.all([getiriListesi(BIST_HISSELER, oku(), pazar.bas, pazar.bit), getiriListesi(ABD_HISSELER, oku(), pazar.bas, pazar.bit)]);
    if (bist.length >= BIST_HISSELER.length - 3 && abd.length >= ABD_HISSELER.length - 3) {
      yazilar.push(
        listeKarnesi({ baslik: `Borsa İstanbul'da haftanın hisseleri · ${ad}`, kapakBaslik: "BIST'te büyük şirketlerin haftası", etiket: ad, zamanSozu: "Geçen hafta BIST'in büyük şirketlerinden", satirlar: bist, donem: pazar, simdi, not: 'Fiyatlar TL cinsindendir.' }),
        listeKarnesi({ baslik: `ABD'nin en büyük şirketlerinde haftanın karnesi · ${ad}`, kapakBaslik: "ABD'de dev şirketlerin haftası", etiket: ad, zamanSozu: "Geçen hafta ABD'nin en büyük şirketlerinden", satirlar: abd, donem: pazar, simdi, not: 'Fiyatlar dolar cinsindendir.' }),
      );
      durum.karne.hisseHafta = pazar.anahtar;
    } else log(`  ! hisse karneleri: BIST ${bist.length}, ABD ${abd.length} hisse alındı, ertelendi`);
  }

  // Aylık sektör karnesi (ABD), aylık piyasa karnesiyle aynı pencerede.
  if (ay && durum.karne.sektorAy !== ay.anahtar) {
    const satirlar = await getiriListesi(SEKTORLER, oku(), ay.bas, ay.bit);
    if (satirlar.length >= SEKTORLER.length - 2) {
      const adAy = `${TR_AY[ay.ay - 1]} ${ay.yil}`;
      yazilar.push(
        listeKarnesi({ baslik: `ABD borsasında sektörlerin aylık karnesi · ${adAy}`, kapakBaslik: "ABD'de sektörlerin ayı", etiket: adAy, zamanSozu: `${AY_DE[ay.ay - 1]} S&P 500'ün`, satirlar, donem: ay, simdi, not: `Her sektör, S&P 500 sektör ETF'iyle ölçülmüştür (${satirlar.map((s) => s.kod).join(', ')}).` }),
      );
      durum.karne.sektorAy = ay.anahtar;
    } else log(`  ! sektör karnesi: yalnızca ${satirlar.length} sektör alındı, ertelendi`);
  }

  // Yılbaşından bu yana (çeyrek sonu) ya da biten yılın karnesi.
  const ceyrek = bitenCeyrek(simdi);
  if (ceyrek && durum.karne.ceyrek !== ceyrek.anahtar) {
    const satirlar = await getiriListesi(KARNE, oku(), ceyrek.bas, ceyrek.bit);
    if (satirlar.length >= KARNE.length - 3) {
      const yillik = ceyrek.ay === 12;
      const etiket = yillik ? String(ceyrek.yil) : `Ocak–${TR_AY[ceyrek.ay - 1]} ${ceyrek.yil}`;
      yazilar.push(
        listeKarnesi({
          baslik: yillik ? `${ceyrek.yil} yılının piyasa karnesi` : `Yılbaşından bu yana piyasa karnesi · ${etiket}`,
          kapakBaslik: yillik ? `${ceyrek.yil} yılında piyasalar` : 'Yılbaşından bu yana piyasalar',
          etiket,
          zamanSozu: yillik ? `${ceyrek.yil} yılında izlediğimiz` : `Yılbaşından ${TR_AY[ceyrek.ay - 1].toLocaleLowerCase('tr-TR')} sonuna izlediğimiz`,
          satirlar,
          donem: ceyrek,
          simdi,
          kategori: 'piyasalar',
          not: 'Her borsa kendi para biriminde ölçülür; BIST 100 dolar bazındadır.',
        }),
      );
      durum.karne.ceyrek = ceyrek.anahtar;
    } else log(`  ! yılbaşından bu yana karne: yalnızca ${satirlar.length} araç alındı, ertelendi`);
  }

  // Enflasyon: piyasa verisindeki son TÜFE ayı yeni ise ve en fazla 45 gün önce bittiyse.
  const tufe = piyasa?.gostergeler?.find((g) => g.id === 'enflasyon');
  if (tufe && Number.isFinite(tufe.aylik) && Number.isFinite(tufe.deger) && tufe.zaman) {
    const [yil, ayNo] = tufe.zaman.slice(0, 7).split('-').map(Number);
    const donem = ayAraligi(yil, ayNo);
    const yilOnce = ayAraligi(yil - 1, ayNo);
    const taze = simdi.getTime() - zaman(donem.bit) <= 45 * GUN;
    if (taze && durum.karne.enflasyon !== donem.anahtar) {
      const aylik = await getiriListesi(ENFLASYON_ARACLARI, oku(), donem.bas, donem.bit);
      const yillik = await getiriListesi(ENFLASYON_ARACLARI, oku(), yilOnce.bit, donem.bit);
      const satirlar = aylik
        .map((a) => ({ ...a, aylik: a.yuzde, yillik: yillik.find((y) => y.ad === a.ad)?.yuzde }))
        .filter((s) => Number.isFinite(s.yillik));
      if (satirlar.length >= ENFLASYON_ARACLARI.length - 1) {
        yazilar.push(
          enflasyonYazisi({ tufe: { ay: ayNo, yil, aylik: tufe.aylik, yillik: tufe.deger }, satirlar, simdi, kaynak: tufe.kaynak }),
        );
        durum.karne.enflasyon = donem.anahtar;
      } else log(`  ! enflasyon karnesi: yalnızca ${satirlar.length} araç alındı, ertelendi`);
    }
  }
  return yazilar;
}
