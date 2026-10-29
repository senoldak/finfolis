// Ek veri sayfaları için TCMB EVDS serileri (doğrulandı 27.10.2026). resmi-veri.mjs çağırır, sonuç src/data/resmi.json'a
// yazılır. Değerler EVDS'nin verdiği gibidir; yıllık değişim EVDS'nin kendi formülüyle (formulas=3) alınır, burada
// hesaplanmaz. Bir bölüm alınamazsa resmi-veri.mjs son bilinen değeri korur.
//
//  - kira: Yeni Kiracı Kira Endeksi (TCMB, 2023=100) ve aynı bölgelerin konut fiyat endeksi yıllık değişimi; ayrıca
//      20 bölgenin son ay yıllık kira değişimi tablosu.
//  - kart: banka ve kredi kartı harcama tutarı (TCMB, haftalık, bin TL), seçili sektörler.
//  - guven: tüketici güven endeksi ve alt endeksleri (TÜİK verisi, EVDS'den).
//  - rek: TÜFE bazlı reel efektif döviz kuru (TCMB, 2025=100).
//  - brutRezerv: TCMB rezervleri, altın ve döviz (haftalık, milyon ABD doları).
//  - kapasite: imalat sanayi kapasite kullanım oranı (TCMB, %).
//  - kurHaftalik: dolar ve euro satış kuru, haftanın son değeri (TCMB gösterge kuru); kur değişim hızı sayfası hesaplar.
//  - makas: ihtiyaç, taşıt, konut kredisi ve 3 aya kadar TL mevduat faizi (TCMB, haftalık akım, %), 2018'den.
//  - birimFiyat: değerlemesi yapılan konutların ortanca m² satış fiyatı ve m² kirası (TCMB, üç aylık, TL/m²), il il.
//  - tufeArindirilmis: mevsim etkisinden arındırılmış TÜFE'nin aylık yüzde değişimi (TÜİK verisi, 2025=100, EVDS).
import { hentMetin } from './lib.mjs';

const EVDS = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
const EVDS_SAYFA = 'https://evds3.tcmb.gov.tr/';

export const KIRA_BOLGELERI = [
  { kod: 'TR', ad: 'Türkiye' },
  { kod: 'TR10', ad: 'İstanbul' },
  { kod: 'TR51', ad: 'Ankara' },
  { kod: 'TR31', ad: 'İzmir' },
];
// İBBS bölgeleri, TCMB'nin seri adlarındaki illerle.
export const KIRA_TUM_BOLGELER = [
  { kod: 'TR10', ad: 'İstanbul' },
  { kod: 'TR21', ad: 'Edirne, Kırklareli, Tekirdağ' },
  { kod: 'TR22', ad: 'Balıkesir, Çanakkale' },
  { kod: 'TR31', ad: 'İzmir' },
  { kod: 'TR32', ad: 'Aydın, Denizli, Muğla' },
  { kod: 'TR33', ad: 'Afyonkarahisar, Kütahya, Manisa, Uşak' },
  { kod: 'TR41', ad: 'Bursa, Eskişehir, Bilecik' },
  { kod: 'TR42', ad: 'Bolu, Kocaeli, Sakarya, Yalova, Düzce' },
  { kod: 'TR51', ad: 'Ankara' },
  { kod: 'TR52', ad: 'Konya, Karaman' },
  { kod: 'TR61', ad: 'Antalya, Burdur, Isparta' },
  { kod: 'TR62', ad: 'Adana, Mersin' },
  { kod: 'TR63', ad: 'Hatay, Kahramanmaraş, Osmaniye' },
  { kod: 'TR7', ad: 'Nevşehir, Niğde, Kırıkkale, Kırşehir, Aksaray, Kayseri, Sivas, Yozgat' },
  { kod: 'TR8', ad: 'Zonguldak, Karabük, Bartın, Kastamonu, Çankırı, Sinop, Samsun, Tokat, Çorum, Amasya' },
  { kod: 'TR9', ad: 'Trabzon, Ordu, Giresun, Rize, Artvin, Gümüşhane' },
  { kod: 'TRA', ad: 'Erzurum, Erzincan, Bayburt, Ağrı, Kars, Iğdır, Ardahan' },
  { kod: 'TRB', ad: 'Malatya, Elazığ, Bingöl, Tunceli, Van, Muş, Bitlis, Hakkari' },
  { kod: 'TRC', ad: 'Gaziantep, Adıyaman, Kilis, Şanlıurfa, Diyarbakır, Mardin, Batman, Şırnak, Siirt' },
];
export const KART_SEKTORLERI = [
  { kod: 'KT1', ad: 'Toplam' },
  { kod: 'KT16', ad: 'Market ve alışveriş merkezleri' },
  { kod: 'KT5', ad: 'Çeşitli gıda' },
  { kod: 'KT24', ad: 'Yemek' },
  { kod: 'KT4', ad: 'Benzin ve yakıt istasyonları' },
  { kod: 'KT9', ad: 'Giyim ve aksesuar' },
  { kod: 'KT8', ad: 'Elektrik-elektronik eşya, bilgisayar' },
  { kod: 'KT19', ad: 'Sağlık, sağlık ürünleri, kozmetik' },
  { kod: 'KT12', ad: 'Konaklama' },
  { kod: 'KT10', ad: 'Havayolları' },
  { kod: 'KT50', ad: 'İnternet üzerinden alışveriş' },
];
export const GUVEN_SERILERI = [
  { kod: 'TP.TG2.Y01', alan: 'endeks', ad: 'Tüketici güven endeksi' },
  { kod: 'TP.TG2.Y02', alan: 'haneGecmis', ad: 'Hanenin maddi durumu, son 12 ay' },
  { kod: 'TP.TG2.Y03', alan: 'haneBeklenti', ad: 'Hanenin maddi durumu, gelecek 12 ay beklentisi' },
  { kod: 'TP.TG2.Y05', alan: 'ekonomiBeklenti', ad: 'Genel ekonomik durum, gelecek 12 ay beklentisi' },
];
export const REK_SERILERI = [
  { kod: 'TP.RK.T1.Y', alan: 'genel', ad: 'TÜFE bazlı reel efektif kur' },
  { kod: 'TP.RK.T2.Y', alan: 'gelismekte', ad: 'Gelişmekte olan ülkelere göre' },
  { kod: 'TP.RK.T3.Y', alan: 'gelismis', ad: 'Gelişmiş ülkelere göre' },
];
export const REZERV_SERILERI = [
  { kod: 'TP.AB.TOPLAM', alan: 'toplam', ad: 'Toplam' },
  { kod: 'TP.AB.C1', alan: 'altin', ad: 'Altın' },
  { kod: 'TP.AB.C2', alan: 'doviz', ad: 'Döviz' },
];
export const KAPASITE_SERILERI = [
  { kod: 'TP.KKO.MA', alan: 'arindirilmis', ad: 'Mevsimsellikten arındırılmış' },
  { kod: 'TP.KKO2.IS.TOP', alan: 'ham', ad: 'Arındırılmamış' },
  { kod: 'TP.KKO2.IS.CONS', alan: 'tuketim', ad: 'Tüketim malları' },
  { kod: 'TP.KKO2.IS.INTM', alan: 'ara', ad: 'Ara malları' },
  { kod: 'TP.KKO2.IS.INVE', alan: 'yatirim', ad: 'Yatırım malları' },
];

const gun = (d) => `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
const alanAdi = (seri, formul) => seri.replaceAll('.', '_') + (formul ? `-${formul}` : '');

// EVDS seri isteği. Satır: aylıkta { yil, ay }, çeyrekte { yil, ceyrek }, haftalıkta { tarih: 'YYYY-MM-DD' }; değerler
// alanAdi(seri, formül) ile, boşsa null. Eskiden yeniye sıralı. ek: EVDS'ye eklenecek parametreler (&frequency=3 gibi).
export async function evdsCek(seriler, formuller, bas, bit, anahtar, ek = '') {
  const url = `${EVDS}/series=${seriler.join('-')}&startDate=${gun(bas)}&endDate=${gun(bit)}&type=json&formulas=${formuller.join('-')}${ek}`;
  const veri = JSON.parse(await hentMetin(url, { headers: { key: anahtar } }));
  if (!Array.isArray(veri?.items)) throw new Error('EVDS yanıtı ayrıştırılamadı');
  const out = [];
  for (const it of veri.items) {
    const ay = String(it.Tarih ?? '').match(/^(\d{4})-(\d{1,2})$/);
    const hafta = String(it.Tarih ?? '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const ceyrek = String(it.Tarih ?? '').match(/^(\d{4})-Q([1-4])$/);
    const satir = ay
      ? { yil: Number(ay[1]), ay: Number(ay[2]) }
      : ceyrek
        ? { yil: Number(ceyrek[1]), ceyrek: Number(ceyrek[2]) }
        : hafta
          ? { tarih: `${hafta[3]}-${hafta[2]}-${hafta[1]}` }
          : null;
    if (!satir) continue;
    seriler.forEach((sr, i) => {
      const a = alanAdi(sr, formuller[i]);
      const n = it[a] == null || it[a] === '' ? NaN : Number(it[a]);
      satir[a] = Number.isFinite(n) ? n : null;
    });
    out.push(satir);
  }
  const anahtarOf = (s) => (s.tarih ? s.tarih : String(s.yil * 12 + (s.ay ?? s.ceyrek * 3)).padStart(8, '0'));
  return out.sort((a, b) => anahtarOf(a).localeCompare(anahtarOf(b)));
}

const ayAnahtari = (s) => s.yil * 12 + s.ay;

// Değeri henüz yayımlanmamış son satırlar atılır; aylık seride ortada boşluk varsa bölüm güncellenmez.
function dolular(satirlar, dolu, ad) {
  const s = satirlar.filter(dolu);
  for (let i = 1; i < s.length; i++) {
    if (s[i].yil != null && ayAnahtari(s[i]) !== ayAnahtari(s[i - 1]) + 1) throw new Error(`${ad} serisinde boşluk`);
  }
  return s;
}

export async function kiraAl(simdi, anahtar) {
  const ykke = KIRA_BOLGELERI.map((b) => `TP.YKKE.${b.kod}`);
  const kfe = KIRA_BOLGELERI.map((b) => `TP.KFE.${b.kod}`);
  const ham = await evdsCek(
    [...ykke, ...ykke, ...kfe],
    [...ykke.map(() => 0), ...ykke.map(() => 3), ...kfe.map(() => 3)],
    new Date(Date.UTC(2019, 0, 1)),
    simdi,
    anahtar,
  );
  const satirlar = dolular(
    ham.map((h) => ({
      yil: h.yil,
      ay: h.ay,
      bolgeler: Object.fromEntries(
        KIRA_BOLGELERI.map((b) => [
          b.kod,
          { endeks: h[alanAdi(`TP.YKKE.${b.kod}`, 0)], yillik: h[alanAdi(`TP.YKKE.${b.kod}`, 3)], konutYillik: h[alanAdi(`TP.KFE.${b.kod}`, 3)] },
        ]),
      ),
    })),
    (s) => Object.values(s.bolgeler).every((v) => v.endeks != null && v.yillik != null && v.konutYillik != null),
    'Kira endeksi',
  );
  if (satirlar.length < 24) throw new Error('Kira endeksi yetersiz');
  const son = satirlar.at(-1);
  // Bölge tablosu: tablodaki son ayın yıllık değişimi, yalnız o ay için.
  const tum = KIRA_TUM_BOLGELER.map((b) => `TP.YKKE.${b.kod}`);
  const ay = await evdsCek(tum, tum.map(() => 3), new Date(Date.UTC(son.yil, son.ay - 1, 1)), new Date(Date.UTC(son.yil, son.ay - 1, 1)), anahtar);
  const tablo = ay.find((h) => h.yil === son.yil && h.ay === son.ay);
  const bolgeTablosu = tablo
    ? KIRA_TUM_BOLGELER.map((b) => ({ ...b, yillik: tablo[alanAdi(`TP.YKKE.${b.kod}`, 3)] })).filter((b) => b.yillik != null)
    : [];
  if (bolgeTablosu.length !== KIRA_TUM_BOLGELER.length) throw new Error('Kira bölge tablosu eksik');
  return {
    kaynak: { ad: 'TCMB, Yeni Kiracı Kira Endeksi ve Konut Fiyat Endeksi (EVDS)', url: EVDS_SAYFA },
    bolgeler: KIRA_BOLGELERI,
    satirlar,
    bolgeTablosu: { yil: son.yil, ay: son.ay, bolgeler: bolgeTablosu },
  };
}

export async function kartAl(simdi, anahtar) {
  const seriler = KART_SEKTORLERI.map((s) => `TP.KKHARTUT.${s.kod}`);
  const bas = new Date(Date.UTC(simdi.getUTCFullYear() - 3, simdi.getUTCMonth(), simdi.getUTCDate()));
  const ham = await evdsCek([...seriler, ...seriler], [...seriler.map(() => 0), ...seriler.map(() => 3)], bas, simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.tarih && h[alanAdi(seriler[0], 0)] != null)
    .map((h) => ({
      tarih: h.tarih,
      sektorler: Object.fromEntries(
        KART_SEKTORLERI.map((s, i) => [s.kod, { tutar: h[alanAdi(seriler[i], 0)], yillik: h[alanAdi(seriler[i], 3)] }]),
      ),
    }));
  if (satirlar.length < 100) throw new Error('Kart harcama serisi yetersiz');
  return {
    kaynak: { ad: 'TCMB, banka kartı ve kredi kartı harcama tutarı (EVDS)', url: EVDS_SAYFA },
    birim: 'bin TL',
    sektorler: KART_SEKTORLERI,
    satirlar,
  };
}

// Aylık, kodu ve alanı tanımlı seri listesi için ortak çekme: [{ yil, ay, <alan>: değer }]; formul EVDS formülü (0 düzey).
async function aylikSeriler(tanim, bas, simdi, anahtar, ad, enAz, formul = 0) {
  const ham = await evdsCek(tanim.map((t) => t.kod), tanim.map(() => formul), bas, simdi, anahtar);
  const satirlar = dolular(
    ham.map((h) => ({ yil: h.yil, ay: h.ay, ...Object.fromEntries(tanim.map((t) => [t.alan, h[alanAdi(t.kod, formul)]])) })),
    (s) => tanim.every((t) => s[t.alan] != null),
    ad,
  );
  if (satirlar.length < enAz) throw new Error(`${ad} yetersiz`);
  return satirlar;
}

const tanimlar = (liste) => liste.map(({ alan, ad }) => ({ alan, ad }));

export async function guvenAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TÜİK verisi, tüketici eğilim anketi (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(GUVEN_SERILERI),
    satirlar: await aylikSeriler(GUVEN_SERILERI, new Date(Date.UTC(2012, 0, 1)), simdi, anahtar, 'Tüketici güveni', 60),
  };
}

export async function rekAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, reel efektif döviz kuru endeksleri (EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(REK_SERILERI),
    satirlar: await aylikSeriler(REK_SERILERI, new Date(Date.UTC(2003, 0, 1)), simdi, anahtar, 'Reel efektif kur', 120),
  };
}

export async function kapasiteAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, imalat sanayi kapasite kullanım oranı (EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(KAPASITE_SERILERI),
    satirlar: await aylikSeriler(KAPASITE_SERILERI, new Date(Date.UTC(2007, 0, 1)), simdi, anahtar, 'Kapasite kullanımı', 120),
  };
}

export async function brutRezervAl(simdi, anahtar) {
  const bas = new Date(Date.UTC(simdi.getUTCFullYear() - 5, simdi.getUTCMonth(), simdi.getUTCDate()));
  const ham = await evdsCek(REZERV_SERILERI.map((t) => t.kod), REZERV_SERILERI.map(() => 0), bas, simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.tarih && REZERV_SERILERI.every((t) => h[alanAdi(t.kod, 0)] != null))
    .map((h) => ({ tarih: h.tarih, ...Object.fromEntries(REZERV_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) }));
  if (satirlar.length < 200) throw new Error('Rezerv serisi yetersiz');
  return {
    kaynak: { ad: 'TCMB, Merkez Bankası rezervleri (EVDS, haftalık)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(REZERV_SERILERI),
    satirlar,
  };
}

// Haftalık dolar ve euro satış kuru: EVDS haftalık sıklıkta haftanın son değeri. Bitmemiş haftanın satırı (cuma bugünden
// sonraysa) atılır; o haftanın değeri henüz son değil.
export async function kurHaftalikAl(simdi, anahtar) {
  const bas = new Date(Date.UTC(simdi.getUTCFullYear() - 4, simdi.getUTCMonth(), simdi.getUTCDate()));
  const ham = await evdsCek(['TP.DK.USD.S.YTL', 'TP.DK.EUR.S.YTL'], [0, 0], bas, simdi, anahtar, '&frequency=3&aggregationTypes=last-last');
  const bugun = simdi.toISOString().slice(0, 10);
  const satirlar = ham
    .filter((h) => h.tarih && h.tarih <= bugun && h.TP_DK_USD_S_YTL != null && h.TP_DK_EUR_S_YTL != null)
    .map((h) => ({ tarih: h.tarih, usd: h.TP_DK_USD_S_YTL, eur: h.TP_DK_EUR_S_YTL }));
  if (satirlar.length < 150) throw new Error('Haftalık kur serisi yetersiz');
  return { kaynak: { ad: 'TCMB gösterge niteliğindeki döviz satış kurları (EVDS, haftalık)', url: EVDS_SAYFA }, satirlar };
}

export const MAKAS_SERILERI = [
  { kod: 'TP.KTF10', alan: 'ihtiyac', ad: 'İhtiyaç kredisi' },
  { kod: 'TP.KTF11', alan: 'tasit', ad: 'Taşıt kredisi' },
  { kod: 'TP.KTF12', alan: 'konut', ad: 'Konut kredisi' },
  { kod: 'TP.TRY.MT02', alan: 'mevduat', ad: '3 aya kadar vadeli TL mevduat' },
];

export async function makasAl(simdi, anahtar) {
  const ham = await evdsCek(MAKAS_SERILERI.map((t) => t.kod), MAKAS_SERILERI.map(() => 0), new Date(Date.UTC(2018, 0, 1)), simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.tarih && MAKAS_SERILERI.every((t) => h[alanAdi(t.kod, 0)] != null))
    .map((h) => ({ tarih: h.tarih, ...Object.fromEntries(MAKAS_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) }));
  if (satirlar.length < 300) throw new Error('Faiz makası serisi yetersiz');
  return {
    kaynak: { ad: 'TCMB, kredilere ve mevduatlara uygulanan ağırlıklı ortalama faizler (EVDS, akım)', url: EVDS_SAYFA },
    seriler: tanimlar(MAKAS_SERILERI),
    satirlar,
  };
}

// İl listesi EVDS'den: iki grubun seri adları ("Adana Konut Birim Fiyatları" / "Adana Konut Birim Kiraları") il adıyla
// eşleştirilir; ikisinde de olmayan il atlanır.
async function birimSerileri(anahtar) {
  const liste = async (grup, ek) => {
    const j = JSON.parse(await hentMetin(`${EVDS}/serieList/type=json&code=${grup}`, { headers: { key: anahtar } }));
    return new Map(j.map((x) => [String(x.SERIE_NAME).replace(ek, '').trim(), x.SERIE_CODE]));
  };
  const fiyat = await liste('bie_birimfiyat', /Konut Birim Fiyatları$/);
  const kira = await liste('bie_bk', /Konut Birim Kiraları$/);
  return [...fiyat].filter(([ad]) => kira.has(ad)).map(([ad, kod]) => ({ ad, fiyatKod: kod, kiraKod: kira.get(ad) }));
}

export const BIRIM_GRAFIK_ILLERI = ['Türkiye', 'İstanbul', 'Ankara', 'İzmir'];

export async function birimFiyatAl(simdi, anahtar) {
  const iller = await birimSerileri(anahtar);
  if (iller.length < 70) throw new Error('Birim fiyat il listesi eksik');
  const grafik = BIRIM_GRAFIK_ILLERI.map((ad) => iller.find((i) => i.ad === ad));
  if (grafik.some((i) => !i)) throw new Error('Birim fiyat grafik illeri bulunamadı');
  const seri = (liste) => liste.flatMap((i) => [i.fiyatKod, i.kiraKod]);
  const ham = await evdsCek(seri(grafik), seri(grafik).map(() => 0), new Date(Date.UTC(2018, 0, 1)), simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.ceyrek && grafik.every((i) => h[alanAdi(i.fiyatKod, 0)] != null && h[alanAdi(i.kiraKod, 0)] != null))
    .map((h) => ({
      yil: h.yil,
      ceyrek: h.ceyrek,
      iller: Object.fromEntries(grafik.map((i) => [i.ad, { fiyat: h[alanAdi(i.fiyatKod, 0)], kira: h[alanAdi(i.kiraKod, 0)] }])),
    }));
  if (satirlar.length < 20) throw new Error('Birim fiyat serisi yetersiz');
  const son = satirlar.at(-1);
  const ceyrekBas = new Date(Date.UTC(son.yil, (son.ceyrek - 1) * 3, 1));
  const tum = await evdsCek(seri(iller), seri(iller).map(() => 0), ceyrekBas, ceyrekBas, anahtar);
  const t = tum.find((h) => h.yil === son.yil && h.ceyrek === son.ceyrek) ?? {};
  const ilTablosu = iller
    .map((i) => ({ ad: i.ad, fiyat: t[alanAdi(i.fiyatKod, 0)] ?? null, kira: t[alanAdi(i.kiraKod, 0)] ?? null }))
    .filter((i) => i.fiyat != null && i.kira != null);
  if (ilTablosu.length < 60) throw new Error('Birim fiyat il tablosu eksik');
  return {
    kaynak: { ad: 'TCMB, değerlemesi yapılan konutların birim fiyatları ve birim kiraları (EVDS)', url: EVDS_SAYFA },
    birim: 'TL/m²',
    satirlar,
    ilTablosu: { yil: son.yil, ceyrek: son.ceyrek, iller: ilTablosu },
  };
}

// Mevsim etkisinden arındırılmış TÜFE (TÜİK, 2025=100): EVDS'nin hesapladığı aylık yüzde değişim (formulas=1).
export async function tufeArindirilmisAl(simdi, anahtar) {
  const seri = 'TP.TUKFIYARND.OKTG01';
  const satirlar = await aylikSeriler(
    [{ kod: seri, alan: 'aylik' }],
    new Date(Date.UTC(2005, 1, 1)),
    simdi,
    anahtar,
    'Arındırılmış TÜFE',
    120,
    1,
  );
  return { kaynak: { ad: 'TÜİK verisi, mevsim etkisinden arındırılmış TÜFE (TCMB EVDS)', url: EVDS_SAYFA }, satirlar };
}

// --- Dış denge, borç, kredi, sanayi ve bütçe bölümleri (doğrulandı 28.10.2026) ---
//  - portfoyHaftalik: yurt dışı yerleşiklerin menkul kıymet portföyü (TCMB, haftalık, milyon $): fiyat ve kur
//      etkisinden arındırılmış net değişim (hisse, DİBS, özel sektör borçlanma senedi, genel toplam), hisse ve DİBS stoku.
//  - portfoyAylik: ödemeler dengesi, yurt dışı yerleşiklerin hisse senedi ve genel hükümet yurt içi borç senedi
//      net alımı (TCMB, aylık, milyon $), 2006'dan.
//  - cari: cari işlemler dengesi; altın, enerji ve ikisi hariç denge; net altın ve enerji; seyahat geliri (milyon $).
//  - disBorc: kalan vadeye göre ve orijinal vadeye göre kısa vadeli dış borç, resmi rezerv varlıklar (aylık, milyon $);
//      brüt ve net dış borç stoku (üç aylık, milyon $).
//  - disTicaret: genel ticaret sistemine göre ihracat ve ithalat, ithalatın yatırım/ara/tüketim malı kırılımı (TÜİK, bin $).
//  - sanayi: sanayi üretim endeksi (TÜİK, 2021=100): mevsim ve takvim etkisinden arındırılmış endeks ve aylık değişim,
//      takvim etkisinden arındırılmış yıllık değişim, imalat endeksi.
//  - buyume: gayrisafi yurt içi hasıla büyümesi (TÜİK, üç aylık, zincirlenmiş hacim; doğrulandı 29.10.2026): yıllık büyüme,
//      arındırılmış çeyreklik büyüme ve hacim endeksi, harcama kalemleri ve sektörler için yıllık değişim.
//  - konutSatis: konut ve iş yeri satışları (TÜİK, aylık, adet; doğrulandı 29.10.2026): toplam, mevsim ve takvim etkisinden
//      arındırılmış, ilk el, ikinci el, ipotekli satış ve yıllık değişim; son ayın il tablosu (il serileri EVDS seri
//      listesinden alınır, kod yazılmaz).
//  - ufe: yurt içi, hizmet ve tarım ürünleri üretici fiyat endeksleri ile tarımsal girdi fiyat endeksi (TÜİK, aylık;
//      doğrulandı 29.10.2026): dört ayrı satır dizisi, çünkü serilerin ilk ve son ayları farklıdır (tarımsal girdi bir ay
//      geç yayımlanır); yurt içi ÜFE ile karşılaştırmak için TÜFE yıllık değişimi de alınır.
//  - insaatIzin: yapı ruhsatı ve yapı kullanma izin belgesi (iskân) istatistikleri (TÜİK, aylık, çeyrek çeyrek
//      yayımlanır; doğrulandı 29.10.2026): daire, yüzölçümü (m²) ve yapı sayısı; bina türlerine göre yüzölçümü.
//  - kesimBeklenti: piyasa katılımcıları, reel kesim ve hanehalkının 12 ay sonrası yıllık enflasyon beklentisi (TCMB
//      anketleri, aylık, 2015'ten; doğrulandı 29.10.2026); hanehalkı anketinin yön ve harcama grubu soruları (2026'dan);
//      Piyasa Katılımcıları Anketi'nde 12 ve 24 ay sonrası beklentinin olasılık dağılımı (son ay; aralıklar EVDS seri
//      listesinden). Kur, konut fiyatı ve yatırım tercihi soruları bilerek alınmaz.
//  - paraPiyasasi: TCMB gecelik borç alma ve borç verme kotasyonları (faiz koridoru), bir haftalık repo kotasyonu, TCMB
//      bankalararası piyasasında gecelik ağırlıklı ortalama faiz, ağırlıklı ortalama fonlama maliyeti (AOFM), toplam
//      fonlama, sterilizasyon ve net fonlama (TCMB, iş günü; haftalık ortalama 2011'den, son iş günü ayrıca; doğrulandı
//      29.10.2026). BIST TLREF ve BIST repo serileri Borsa İstanbul verisidir, bilerek alınmaz.
//  - paraArzi: M1, M2, M3 ve bileşenleri (TCMB, haftalık, cuma, bin TL; 2011'den; doğrulandı 29.10.2026); yıllık değişim
//      EVDS'nin formülüyle (bir yıl önceki aynı haftaya göre).
//  - kkm: kur korumalı mevduat stoku (TCMB, aylık, Aralık 2021'den; doğrulandı 29.10.2026): döviz dönüşümlü KKM (milyar
//      ABD doları; gerçek ve tüzel kişiler) ve TL KKM (milyar TL). Birimler farklıdır, toplanmaz.
//  - tcmbBilanco: TCMB analitik bilançosunun ana kalemleri (TCMB, iş günü, bin TL; haftanın son iş günü 2013'ten, son iş
//      günü ayrıca; doğrulandı 29.10.2026). Döviz tarafının ayrıntısı net döviz pozisyonu sayfasındadır.
//  - faizAyrinti: bankaların akım faizleri, piyasa-faizleri sayfasının ayrıntısı (TCMB, haftalık, Temmuz 2012'den;
//      doğrulandı 29.10.2026): TL mevduat vadeye göre, tasarruf ve ticari TL mevduat, dolar ve euro mevduat; tüketici ve
//      ticari kredi (TL, KMH dahil/hariç, dolar, euro); finansman şirketlerinin stok faizi (aylık, 2013 sonundan).
//  - dovizHacmi: bankaların TL karşılığı döviz işlem hacimleri (TCMB, iş günü, milyon ABD doları; haftalık günlük ortalama
//      2010'dan, son iş günü ayrıca; doğrulandı 29.10.2026). TL uzlaşmalı vadeli döviz satım serileri (bie_tluzvdov)
//      alınmaz: toplam pozisyon yayımlanan iki bileşenin toplamı değil, farkın kaynağı açıklanmıyor.
//  - elektrik: günlük elektrik tüketimi, üretimi, ithalatı ve ihracatı (TEİAŞ verisi, EVDS; MWh; doğrulandı 29.10.2026):
//      2016'dan haftalık günlük ortalama ve son 400 günün günlük değerleri; yenilenebilir ve yenilenemez üretim Şubat
//      2026'dan.
//  - cek: takas odalarına ibraz edilen ve karşılıksız çıkan çekler (Takasbank verisi, aylık, adet ve bin TL), 2008'den
//      (doğrulandı 29.10.2026). bie_tsenetler protestolu senet değil, "tahsile alınan ticari senetler"dir; stok/akım
//      tanımı belirsiz olduğu için alınmaz.
//  - banknot: tedavüldeki banknotların kupür dağılımı, adet ve tutar (TCMB, aylık, 2009'dan; doğrulandı 29.10.2026).
//  - odeme: TCMB ödeme sistemleri (doğrulandı 29.10.2026): FAST, perakende ödeme sistemi (bireysel EFT) ve EFT-EMKT'nin
//      aylık ödeme adedi ve tutarı (TL; günlük verinin EVDS aylık toplamı, tamamlanmamış ay atılır); FAST ödemelerinin son
//      tam ayda amaçlara göre dağılımı. "Kaynağına göre dağılım (%)" serileri kesir döndüğü ve tanımı belirsiz olduğu için
//      alınmaz.
//  - turizm: milliyetlere göre yabancı ziyaretçi sayısı (Kültür ve Turizm Bakanlığı, aylık, 2008'den; kıtalar ve başlıca
//      ülkeler, son ayın ülke tablosu EVDS seri listesinden) ile turizm geliri ve gideri (bin ABD doları, aylık, 2012'den;
//      ziyaretçiden farklı ayda biter, ayrı dizi). Doğrulandı 29.10.2026.
//  - uyp: uluslararası yatırım pozisyonu (TCMB, üç aylık, milyon ABD doları, 2006'dan; doğrulandı 29.10.2026): net
//      pozisyon, varlıklar ve yükümlülükler ile doğrudan yatırım, portföy, türev, diğer yatırım ve rezerv kırılımı.
//  - reelGuven: reel kesim güven endeksi ve alt endeksleri, mevsimsellikten arındırılmış (TCMB, aylık, 2007'den) ile
//      finansal hizmetler güven endeksi ve alt endeksleri (TCMB, aylık, Mayıs 2012'den; ayrı dizi). Doğrulandı 29.10.2026.
//  - ticariGayrimenkul: ticari gayrimenkul, dükkân ve ofis fiyat endeksleri (TCMB, üç aylık, 2015'ten; Türkiye, İstanbul,
//      Ankara, İzmir) ile yeni ve yeni olmayan konut fiyat endeksleri (TCMB, aylık, 2010'dan; ayrı dizi). Doğrulandı 29.10.2026.
//  - krediEgilim: Banka Kredileri Eğilim Anketi (TCMB, üç aylık, 2005 sonundan): işletme ve bireysel kredilerde kredi
//      standartları ve kredi talebi, net yüzde. TCMB metaverisine göre (doğrulandı 29.10.2026) net oran standartlarda
//      gevşeten eksi sıkılaştıran bankaların payı, talepte artış eksi azalış bildirenlerin payıdır: artı gevşeme/artış.
//  - otomotiv: araç türlerine göre motorlu taşıt üretimi (Otomotiv Sanayii Derneği verisi, EVDS, aylık adet, 2005'ten;
//      doğrulandı 29.10.2026). Sanayi üretimi sayfasında gösterilir.
//  - disTicaretAyrinti: dış ticaret sayfasının ayrıntısı (TÜİK verisi, EVDS; doğrulandı 29.10.2026): ihracat ve ithalat
//      birim değer ve miktar endeksleri (aylık, 2013'ten) ile ISIC Rev.4'e göre ihracatın son 24 ayı (bin ABD doları;
//      sektör listesi EVDS seri listesinden).
//  - borcCevirme: bankalar ve diğer sektörlerin dış borç çevirme oranları, tahvil hariç ve dahil (TCMB, aylık, %, Haziran
//      2006'dan; doğrulandı 29.10.2026). Dış borç sayfasında gösterilir.
//  - butceAyrinti: merkezi yönetim bütçesinde başlıca vergi gelirleri ve ana gider kalemleri (HMB, aylık, bin TL, 2014'ten;
//      doğrulandı 29.10.2026). Bütçe dengesi sayfasında gösterilir.
//  - bis: BIS göstergeleri (EVDS, üç aylık; doğrulandı 29.10.2026): finans dışı özel sektöre kredinin GSYH'ye oranı, borç
//      servis oranı ve merkez bankası varlıklarının GSYH'ye oranı; ülkelerin son değeri (seri listesinden) ve Türkiye'nin
//      2000'den seyri (kredi açığı dahil). Emsal ülkeler sayfasında gösterilir.
//  - butce: genel bütçe gelir, harcama, faiz harcaması, faiz dışı denge ve denge (HMB, aylık, bin TL).
//  - kredi: bankacılık sektörü yurt içi kredi hacmi (TCMB, aylık, bin TL) ve yıllık değişimi; hanehalkı ve şirket
//      kredileri banka türlerine göre (toplamı sayfada alınır).

export const PORTFOY_HAFTALIK_SERILERI = [
  { kod: 'TP.MKNETHAR.M7', alan: 'hisse', ad: 'Hisse senedi' },
  { kod: 'TP.MKNETHAR.M8', alan: 'dibs', ad: 'Devlet iç borçlanma senedi (DİBS)' },
  { kod: 'TP.MKNETHAR.M12', alan: 'ost', ad: 'Özel sektör borçlanma senedi' },
  { kod: 'TP.MKNETHAR.M20', alan: 'toplam', ad: 'Genel toplam' },
  { kod: 'TP.MKNETHAR.M1', alan: 'hisseStok', ad: 'Hisse senedi stoku' },
  { kod: 'TP.MKNETHAR.M2', alan: 'dibsStok', ad: 'DİBS stoku' },
];
export const PORTFOY_AYLIK_SERILERI = [
  { kod: 'TP.ODEAYRSUNUM6.Q120', alan: 'hisse', ad: 'Hisse senedi' },
  { kod: 'TP.ODEAYRSUNUM6.Q129', alan: 'dibs', ad: 'Genel hükümet borç senedi, yurt içi' },
];
export const CARI_SERILERI = [
  { kod: 'TP.ODANA6.Q01', alan: 'cari', ad: 'Cari işlemler dengesi' },
  { kod: 'TP.HARICCARIACIK.K8', alan: 'altinHaric', ad: 'Altın hariç' },
  { kod: 'TP.HARICCARIACIK.K9', alan: 'enerjiHaric', ad: 'Enerji hariç' },
  { kod: 'TP.HARICCARIACIK.K10', alan: 'cekirdek', ad: 'Altın ve enerji hariç' },
  { kod: 'TP.HARICCARIACIK.K4', alan: 'altin', ad: 'Parasal olmayan altın, net' },
  { kod: 'TP.HARICCARIACIK.K7', alan: 'enerji', ad: 'Enerji, net' },
  { kod: 'TP.ODEAYRSUNUM6.Q42', alan: 'seyahat', ad: 'Seyahat geliri' },
];
export const DIS_BORC_SERILERI = [
  { kod: 'TP.KALANVADE.K20', alan: 'kalanVade', ad: 'Kısa vadeli dış borç, kalan vadeye göre' },
  { kod: 'TP.KVDB19', alan: 'orijinalVade', ad: 'Kısa vadeli dış borç stoku' },
  { kod: 'TP.AB.B4', alan: 'rezerv', ad: 'Resmi rezerv varlıklar' },
];
export const DIS_BORC_CEYREK_SERILERI = [
  { kod: 'TP.BRUTDBORCLU.G1', alan: 'brut', ad: 'Brüt dış borç stoku' },
  { kod: 'TP.NETDISBORC.G1', alan: 'net', ad: 'Net dış borç stoku' },
];
export const DIS_TICARET_SERILERI = [
  { kod: 'TP.IHRACATBEC.9999', alan: 'ihracat', ad: 'İhracat' },
  { kod: 'TP.ITHALATBEC.9999', alan: 'ithalat', ad: 'İthalat' },
  { kod: 'TP.ITHALATBEC.1', alan: 'yatirim', ad: 'Yatırım (sermaye) malları' },
  { kod: 'TP.ITHALATBEC.2', alan: 'ara', ad: 'Ara mallar (hammadde)' },
  { kod: 'TP.ITHALATBEC.3', alan: 'tuketim', ad: 'Tüketim malları' },
];
export const BUTCE_SERILERI = [
  { kod: 'TP.KB.GEN01', alan: 'gelir', ad: 'Genel bütçe gelirleri' },
  { kod: 'TP.KB.GEN12', alan: 'harcama', ad: 'Genel bütçe harcamaları' },
  { kod: 'TP.KB.GEN17', alan: 'faiz', ad: 'Faiz harcamaları' },
  { kod: 'TP.KB.GEN34', alan: 'faizDisi', ad: 'Faiz dışı denge' },
  { kod: 'TP.KB.GEN35', alan: 'denge', ad: 'Bütçe dengesi' },
];
// Mevduat, kalkınma-yatırım ve katılım bankaları: hanehalkı ve mali olmayan şirketler.
export const KREDI_SERILERI = [
  { kod: 'TP.KREHACBS.A1', alan: 'toplam', ad: 'Toplam yurt içi kredi' },
  { kod: 'TP.KREHACBS.A9', alan: 'haneMevduat', ad: 'Hanehalkı, mevduat bankaları' },
  { kod: 'TP.KREHACBS.A18', alan: 'haneKalkinma', ad: 'Hanehalkı, kalkınma ve yatırım bankaları' },
  { kod: 'TP.KREHACBS.A27', alan: 'haneKatilim', ad: 'Hanehalkı, katılım bankaları' },
  { kod: 'TP.KREHACBS.A8', alan: 'sirketMevduat', ad: 'Şirketler, mevduat bankaları' },
  { kod: 'TP.KREHACBS.A17', alan: 'sirketKalkinma', ad: 'Şirketler, kalkınma ve yatırım bankaları' },
  { kod: 'TP.KREHACBS.A26', alan: 'sirketKatilim', ad: 'Şirketler, katılım bankaları' },
];

// Haftalık seri listesi için ortak çekme: [{ tarih, <alan>: değer }], bütün alanları dolu satırlar.
async function haftalikSeriler(tanim, bas, simdi, anahtar, ad, enAz) {
  const ham = await evdsCek(tanim.map((t) => t.kod), tanim.map(() => 0), bas, simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.tarih && tanim.every((t) => h[alanAdi(t.kod, 0)] != null))
    .map((h) => ({ tarih: h.tarih, ...Object.fromEntries(tanim.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) }));
  if (satirlar.length < enAz) throw new Error(`${ad} yetersiz`);
  return satirlar;
}

// Aynı seriden birden çok formül (düzey, aylık, yıllık) isteyen aylık bölümler: tanım { kod, formul, alan }.
async function aylikFormullu(tanim, bas, simdi, anahtar, ad, enAz) {
  const ham = await evdsCek(tanim.map((t) => t.kod), tanim.map((t) => t.formul), bas, simdi, anahtar);
  const satirlar = dolular(
    ham.map((h) => ({ yil: h.yil, ay: h.ay, ...Object.fromEntries(tanim.map((t) => [t.alan, h[alanAdi(t.kod, t.formul)]])) })),
    (s) => tanim.every((t) => s[t.alan] != null),
    ad,
  );
  if (satirlar.length < enAz) throw new Error(`${ad} yetersiz`);
  return satirlar;
}

// Üç aylık seride aylık gibi: tanım { kod, formul, alan }; bütün alanları dolu çeyrekler alınır, ortada boşluk varsa bölüm
// güncellenmez. Boşluk denetimi yalnız tutulan satırlara bakar (baştaki boş yıllık değişimler önce elenir).
const ceyrekAnahtari = (s) => s.yil * 4 + s.ceyrek;

async function ceyrekFormullu(tanim, bas, simdi, anahtar, ad, enAz) {
  const ham = await evdsCek(tanim.map((t) => t.kod), tanim.map((t) => t.formul), bas, simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.ceyrek && tanim.every((t) => h[alanAdi(t.kod, t.formul)] != null))
    .map((h) => ({ yil: h.yil, ceyrek: h.ceyrek, ...Object.fromEntries(tanim.map((t) => [t.alan, h[alanAdi(t.kod, t.formul)]])) }));
  for (let i = 1; i < satirlar.length; i++) {
    if (ceyrekAnahtari(satirlar[i]) !== ceyrekAnahtari(satirlar[i - 1]) + 1) throw new Error(`${ad} serisinde boşluk`);
  }
  if (satirlar.length < enAz) throw new Error(`${ad} yetersiz`);
  return satirlar;
}

export async function portfoyHaftalikAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, yurt dışı yerleşiklerin menkul kıymet portföyü (EVDS, haftalık)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(PORTFOY_HAFTALIK_SERILERI),
    satirlar: await haftalikSeriler(PORTFOY_HAFTALIK_SERILERI, new Date(Date.UTC(2020, 8, 1)), simdi, anahtar, 'Haftalık portföy', 200),
  };
}

export async function portfoyAylikAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, ödemeler dengesi ayrıntılı sunum, portföy yatırımları (EVDS)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(PORTFOY_AYLIK_SERILERI),
    satirlar: await aylikSeriler(PORTFOY_AYLIK_SERILERI, new Date(Date.UTC(2006, 0, 1)), simdi, anahtar, 'Aylık portföy', 120),
  };
}

export async function cariAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, ödemeler dengesi istatistikleri (EVDS)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(CARI_SERILERI),
    satirlar: await aylikSeriler(CARI_SERILERI, new Date(Date.UTC(1996, 0, 1)), simdi, anahtar, 'Cari denge', 240),
  };
}

export async function disBorcAl(simdi, anahtar) {
  const satirlar = await aylikSeriler(DIS_BORC_SERILERI, new Date(Date.UTC(2011, 6, 1)), simdi, anahtar, 'Kısa vadeli dış borç', 120);
  const kodlar = DIS_BORC_CEYREK_SERILERI.map((t) => t.kod);
  const ham = await evdsCek(kodlar, kodlar.map(() => 0), new Date(Date.UTC(2005, 9, 1)), simdi, anahtar);
  const ceyrekler = ham
    .filter((h) => h.ceyrek && DIS_BORC_CEYREK_SERILERI.every((t) => h[alanAdi(t.kod, 0)] != null))
    .map((h) => ({ yil: h.yil, ceyrek: h.ceyrek, ...Object.fromEntries(DIS_BORC_CEYREK_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) }));
  if (ceyrekler.length < 40) throw new Error('Dış borç stoku yetersiz');
  return {
    kaynak: { ad: 'TCMB, kısa vadeli dış borç, uluslararası rezervler ve dış borç istatistikleri (EVDS)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(DIS_BORC_SERILERI),
    ceyrekSeriler: tanimlar(DIS_BORC_CEYREK_SERILERI),
    satirlar,
    ceyrekler,
  };
}

export async function disTicaretAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TÜİK verisi, genel ticaret sistemine göre dış ticaret, BEC sınıflaması (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'bin ABD doları',
    seriler: tanimlar(DIS_TICARET_SERILERI),
    satirlar: await aylikSeriler(DIS_TICARET_SERILERI, new Date(Date.UTC(2013, 0, 1)), simdi, anahtar, 'Dış ticaret', 120),
  };
}

export const SANAYI_SERILERI = [
  { kod: 'TP.TSANAYMT2021.BCD', formul: 0, alan: 'endeks', ad: 'Toplam sanayi, mevsim ve takvim etkisinden arındırılmış' },
  { kod: 'TP.TSANAYMT2021.BCD', formul: 1, alan: 'aylik', ad: 'Aylık değişim, arındırılmış' },
  { kod: 'TP.TSANAYTKVM2021.BCD', formul: 3, alan: 'yillik', ad: 'Yıllık değişim, takvim etkisinden arındırılmış' },
  { kod: 'TP.TSANAYMT2021.C', formul: 0, alan: 'imalat', ad: 'İmalat, mevsim ve takvim etkisinden arındırılmış' },
];

export async function sanayiAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TÜİK verisi, sanayi üretim endeksi, 2021=100 (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(SANAYI_SERILERI),
    satirlar: await aylikFormullu(SANAYI_SERILERI, new Date(Date.UTC(2010, 0, 1)), simdi, anahtar, 'Sanayi üretimi', 120),
  };
}

// Gayrisafi yurt içi hasıla (TÜİK, üç aylık): formül 3 yıllık, 1 bir önceki döneme göre yüzde değişim, 0 düzey.
// Yıllık büyüme ve harcama/üretim kalemleri arındırılmamış zincirlenmiş hacimden; çeyreklik büyüme ve endeks mevsim ve
// takvim etkisinden arındırılmış seriden. Zincirlenmiş hacimler toplanmaz, katkı hesaplanmaz.
export const BUYUME_SERILERI = [
  { kod: 'TP.GSYIH20.CY.B1GQ', formul: 3, alan: 'yillik', ad: 'GSYH yıllık büyüme' },
  { kod: 'TP.GSYIH30.HY.B1GQ', formul: 1, alan: 'ceyreklik', ad: 'GSYH çeyreklik büyüme, arındırılmış' },
  { kod: 'TP.GSYIH30.HY.B1GQ', formul: 0, alan: 'endeks', ad: 'GSYH hacim endeksi (2009=100), arındırılmış' },
  { kod: 'TP.GSYIH20.CY.P311', formul: 3, alan: 'hanehalki', ad: 'Hanehalkı tüketimi' },
  { kod: 'TP.GSYIH20.CY.P32', formul: 3, alan: 'devlet', ad: 'Devletin nihai tüketimi' },
  { kod: 'TP.GSYIH20.CY.P51G', formul: 3, alan: 'yatirim', ad: 'Gayrisafi sabit sermaye oluşumu (yatırım)' },
  { kod: 'TP.GSYIH20.CY.P6', formul: 3, alan: 'ihracat', ad: 'Mal ve hizmet ihracatı' },
  { kod: 'TP.GSYIH20.CY.P7', formul: 3, alan: 'ithalat', ad: 'Mal ve hizmet ithalatı' },
  { kod: 'TP.GSYIH40.IFC.A', formul: 3, alan: 'tarim', ad: 'Tarım, ormancılık ve balıkçılık' },
  { kod: 'TP.GSYIH40.IFC.BTE', formul: 3, alan: 'sanayi', ad: 'Sanayi' },
  { kod: 'TP.GSYIH40.IFC.F', formul: 3, alan: 'insaat', ad: 'İnşaat' },
  { kod: 'TP.GSYIH40.IFC.GTI', formul: 3, alan: 'hizmetler', ad: 'Ticaret, ulaştırma, konaklama (hizmetler)' },
  { kod: 'TP.GSYIH40.IFC.J', formul: 3, alan: 'bilgi', ad: 'Bilgi ve iletişim' },
  { kod: 'TP.GSYIH40.IFC.K', formul: 3, alan: 'finans', ad: 'Finans ve sigorta' },
  { kod: 'TP.GSYIH40.IFC.L', formul: 3, alan: 'gayrimenkul', ad: 'Gayrimenkul faaliyetleri' },
  { kod: 'TP.GSYIH40.IFC.MN', formul: 3, alan: 'mesleki', ad: 'Mesleki, idari ve destek hizmetleri' },
  { kod: 'TP.GSYIH40.IFC.OTQ', formul: 3, alan: 'kamu', ad: 'Kamu yönetimi, eğitim, sağlık' },
  { kod: 'TP.GSYIH40.IFC.RTU', formul: 3, alan: 'diger', ad: 'Diğer hizmetler' },
];

// Yıllık değişim bir yıllık geçmiş ister: istek 1998'den başlar, 1999 öncesi boş satırlar elenir.
export async function buyumeAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TÜİK verisi, dönemsel gayrisafi yurt içi hasıla, zincirlenmiş hacim (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(BUYUME_SERILERI),
    satirlar: await ceyrekFormullu(BUYUME_SERILERI, new Date(Date.UTC(1998, 0, 1)), simdi, anahtar, 'Büyüme', 80),
  };
}

// Konut ve iş yeri satışları (TÜİK, aylık, adet): formül 0 düzey, 3 bir yıl öncesinin aynı ayına göre yüzde değişim.
// Yıllık değişim ilk 12 ayda boştur; o satırlar elenir (satırlar 2014-01'den başlar).
export const KONUT_SATIS_SERILERI = [
  { kod: 'TP.AKONUTSAT1.KTRTOPLAM', formul: 0, alan: 'toplam', ad: 'Toplam konut satışı' },
  { kod: 'TP.AKONUTSAT1.KTRTOPLAM', formul: 3, alan: 'toplamYillik', ad: 'Toplam konut satışı, yıllık değişim' },
  { kod: 'TP.AKONUTSAT1.KMA', formul: 0, alan: 'arindirilmis', ad: 'Toplam konut satışı, mevsim ve takvim etkilerinden arındırılmış' },
  { kod: 'TP.AKONUTSAT3.KTRTOPLAM', formul: 0, alan: 'ilkEl', ad: 'İlk el satış' },
  { kod: 'TP.AKONUTSAT4.KTRTOPLAM', formul: 0, alan: 'ikinciEl', ad: 'İkinci el satış' },
  { kod: 'TP.AKONUTSAT2.KTRTOPLAM', formul: 0, alan: 'ipotekli', ad: 'İpotekli satış' },
  { kod: 'TP.AKONUTSAT1.TRTOPLAM', formul: 0, alan: 'isyeri', ad: 'Toplam iş yeri satışı' },
];

// İl listesi EVDS'den: bie_akonutsat1 "Adana_Konut_Toplam Satışlar", bie_akonutsat2 "Adana_Konut_İpotekli Satışlar".
// Çıpalı desenler mevsim ve takvim etkisinden arındırılmış serileri ("-Mevsim ve Takvim…" eki) ve "_İş Yeri_" serilerini
// dışarıda bırakır; Türkiye satırı il değildir. İkisinde de olmayan il atlanır.
async function konutIlSerileri(anahtar) {
  const liste = async (grup, desen) => {
    const j = JSON.parse(await hentMetin(`${EVDS}/serieList/type=json&code=${grup}`, { headers: { key: anahtar } }));
    const harita = new Map();
    for (const x of j) {
      const e = String(x.SERIE_NAME).trim().match(desen);
      if (e && e[1] !== 'Türkiye') harita.set(e[1], x.SERIE_CODE);
    }
    return harita;
  };
  const toplam = await liste('bie_akonutsat1', /^(.+)_Konut_Toplam Satışlar$/);
  const ipotekli = await liste('bie_akonutsat2', /^(.+)_Konut_İpotekli Satışlar$/);
  return [...toplam].filter(([ad]) => ipotekli.has(ad)).map(([ad, kod]) => ({ ad, toplamKod: kod, ipotekKod: ipotekli.get(ad) }));
}

const KONUT_IL_PARCA = 60;

// Türkiye serileri 2013-01'den; il tablosu yalnız son ay için: il başına toplam (düzey), toplam (yıllık değişim) ve ipotekli
// (düzey), yani 243 seri, istek başına en çok 60 seri. Tek aylık sonuçlar alan adıyla birleştirilir.
export async function konutSatisAl(simdi, anahtar) {
  const satirlar = await aylikFormullu(KONUT_SATIS_SERILERI, new Date(Date.UTC(2013, 0, 1)), simdi, anahtar, 'Konut satışları', 120);
  const iller = await konutIlSerileri(anahtar);
  if (iller.length < 81) throw new Error('Konut satış il listesi eksik');
  const son = satirlar.at(-1);
  const ay = new Date(Date.UTC(son.yil, son.ay - 1, 1));
  const istenen = [
    ...iller.map((i) => ({ kod: i.toplamKod, formul: 0 })),
    ...iller.map((i) => ({ kod: i.toplamKod, formul: 3 })),
    ...iller.map((i) => ({ kod: i.ipotekKod, formul: 0 })),
  ];
  const deger = {};
  for (let b = 0; b < istenen.length; b += KONUT_IL_PARCA) {
    const parca = istenen.slice(b, b + KONUT_IL_PARCA);
    const ham = await evdsCek(parca.map((s) => s.kod), parca.map((s) => s.formul), ay, ay, anahtar);
    const h = ham.find((r) => r.yil === son.yil && r.ay === son.ay) ?? {};
    for (const s of parca) {
      const a = alanAdi(s.kod, s.formul);
      deger[a] = h[a] ?? null;
    }
  }
  const ilTablosu = iller
    .map((i) => ({
      ad: i.ad,
      toplam: deger[alanAdi(i.toplamKod, 0)] ?? null,
      yillik: deger[alanAdi(i.toplamKod, 3)] ?? null,
      ipotekli: deger[alanAdi(i.ipotekKod, 0)] ?? null,
    }))
    .filter((i) => i.toplam != null);
  if (ilTablosu.length < 75) throw new Error('Konut satış il tablosu eksik');
  return {
    kaynak: { ad: 'TÜİK verisi, konut ve iş yeri satış istatistikleri (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'adet',
    seriler: tanimlar(KONUT_SATIS_SERILERI),
    satirlar,
    ilTablosu: { yil: son.yil, ay: son.ay, iller: ilTablosu },
  };
}

// Üretici fiyatları (TÜİK, aylık): formül 0 düzey, 1 bir önceki aya göre, 3 bir yıl öncesinin aynı ayına göre yüzde değişim.
// Seriler farklı aylarda başlar ve biter; tek satır dizisine zorlanmaz, her dizi kendi alanlarının dolu olduğu aylardan başlar.
export const UFE_SERILERI = [
  { kod: 'TP.TUFE1YI.T1', formul: 0, alan: 'endeks', ad: 'Yurt içi üretici fiyat endeksi (2003=100)' },
  { kod: 'TP.TUFE1YI.T1', formul: 1, alan: 'aylik', ad: 'Yİ-ÜFE, aylık değişim' },
  { kod: 'TP.TUFE1YI.T1', formul: 3, alan: 'yillik', ad: 'Yİ-ÜFE, yıllık değişim' },
  { kod: 'TP.TUKFIY2025.GENEL', formul: 3, alan: 'tufeYillik', ad: 'TÜFE, yıllık değişim' },
  { kod: 'TP.TUFE1YI.T2', formul: 3, alan: 'madencilik', ad: 'Madencilik ve taşocakçılığı' },
  { kod: 'TP.TUFE1YI.T15', formul: 3, alan: 'imalat', ad: 'İmalat' },
  { kod: 'TP.TUFE1YI.T118', formul: 3, alan: 'enerji', ad: 'Elektrik, gaz, buhar ve iklimlendirme' },
  { kod: 'TP.TUFE1YI.T123', formul: 3, alan: 'su', ad: 'Su temini, kanalizasyon, atık yönetimi' },
  { kod: 'TP.TUFE1YI.T16', formul: 3, alan: 'gida', ad: 'Gıda ürünleri (imalat)' },
  { kod: 'TP.TUFE1YI.T49', formul: 3, alan: 'petrol', ad: 'Kok ve rafine petrol ürünleri' },
  { kod: 'TP.TUFE1YI.T73', formul: 3, alan: 'metal', ad: 'Ana metaller' },
];
export const UFE_HIZMET_SERILERI = [
  { kod: 'TP.HUFE.GK378119440', formul: 1, alan: 'aylik', ad: 'Hizmet ÜFE, aylık değişim' },
  { kod: 'TP.HUFE.GK378119440', formul: 3, alan: 'yillik', ad: 'Hizmet ÜFE, yıllık değişim' },
];
export const UFE_TARIM_SERILERI = [
  { kod: 'TP.TARIMUFE01', formul: 3, alan: 'yillik', ad: 'Tarım ürünleri ÜFE, yıllık değişim' },
  { kod: 'TP.TARIMUFE01', formul: 1, alan: 'aylik', ad: 'Tarım ürünleri ÜFE, aylık değişim' },
];
export const UFE_TARIM_GIRDI_SERILERI = [
  { kod: 'TP.TARIMGFE.GK378650484', formul: 3, alan: 'yillik', ad: 'Tarımsal girdi fiyat endeksi, yıllık değişim' },
  { kod: 'TP.TARIMGFE.GK378650484', formul: 1, alan: 'aylik', ad: 'Tarımsal girdi fiyat endeksi, aylık değişim' },
];

// Hizmet ÜFE, TÜİK'in ticaret, finans ve sigorta hariç hizmet toplamıdır (H-N). Yıllık değişim bir yıllık geçmiş ister;
// baştaki boş satırlar elenir. Dört dizi ayrı istenir ve ayrı tutulur: tarımsal girdi bir ay geç yayımlanır.
export async function ufeAl(simdi, anahtar) {
  const satirlar = await aylikFormullu(UFE_SERILERI, new Date(Date.UTC(2005, 0, 1)), simdi, anahtar, 'Yurt içi ÜFE', 120);
  const hizmet = await aylikFormullu(UFE_HIZMET_SERILERI, new Date(Date.UTC(2017, 0, 1)), simdi, anahtar, 'Hizmet ÜFE', 60);
  const tarim = await aylikFormullu(UFE_TARIM_SERILERI, new Date(Date.UTC(2020, 0, 1)), simdi, anahtar, 'Tarım ürünleri ÜFE', 48);
  const tarimGirdi = await aylikFormullu(
    UFE_TARIM_GIRDI_SERILERI,
    new Date(Date.UTC(2015, 0, 1)),
    simdi,
    anahtar,
    'Tarımsal girdi fiyat endeksi',
    60,
  );
  return {
    kaynak: {
      ad: 'TÜİK verisi, yurt içi, hizmet ve tarım ürünleri üretici fiyat endeksleri ile tarımsal girdi fiyat endeksi (TCMB EVDS)',
      url: EVDS_SAYFA,
    },
    seriler: tanimlar(UFE_SERILERI),
    hizmetSeriler: tanimlar(UFE_HIZMET_SERILERI),
    tarimSeriler: tanimlar(UFE_TARIM_SERILERI),
    tarimGirdiSeriler: tanimlar(UFE_TARIM_GIRDI_SERILERI),
    satirlar,
    hizmet,
    tarim,
    tarimGirdi,
  };
}

// Yapı ruhsatı (RH2) ve iskân (KL2), TÜİK, aylık akım: A yapı sayısı, B yüzölçümü (m²), D daire sayısı; formül 0 düzey.
// On bina türünün yüzölçümü toplamı Türkiye toplamına eşittir (doğrulandı 29.10.2026). Değer (C) serileri boştur, alınmaz.
export const INSAAT_BINA_TURLERI = [
  { kod: 'APT', alan: 'Apartman', ad: 'İki ve daha fazla daireli konut binaları' },
  { kod: 'EV', alan: 'Mustakil', ad: 'Tek daireli konut binaları' },
  { kod: 'HALK', alan: 'Toplu', ad: 'Topluluklara ait ikamet binaları (yurt, misafirhane vb.)' },
  { kod: 'OTEL', alan: 'Otel', ad: 'Otel ve benzeri binalar' },
  { kod: 'OFIS', alan: 'Ofis', ad: 'Ofis (iş yeri) binaları' },
  { kod: 'TOPTAN', alan: 'Ticaret', ad: 'Toptan ve perakende ticaret binaları' },
  { kod: 'TRAFIK', alan: 'Ulastirma', ad: 'Ulaştırma ve iletişim binaları' },
  { kod: 'SANAYI', alan: 'Sanayi', ad: 'Sanayi binaları ve depolar' },
  { kod: 'KAMU', alan: 'Kamu', ad: 'Eğitim, sağlık, kültür ve eğlence binaları' },
  { kod: 'DIGER', alan: 'Diger', ad: 'Diğer binalar' },
];
const INSAAT_BELGELER = [
  { grup: 'RH2', on: 'ruhsat', ad: 'Yapı ruhsatı' },
  { grup: 'KL2', on: 'iskan', ad: 'İskân' },
];
export const INSAAT_IZIN_SERILERI = INSAAT_BELGELER.flatMap(({ grup, on, ad }) => [
  { kod: `TP.IN.${grup}.TOPLAM.TOP.D`, formul: 0, alan: `${on}Daire`, ad: `${ad}, daire sayısı` },
  { kod: `TP.IN.${grup}.TOPLAM.TOP.B`, formul: 0, alan: `${on}Alan`, ad: `${ad}, yüzölçümü (m²)` },
  { kod: `TP.IN.${grup}.TOPLAM.TOP.A`, formul: 0, alan: `${on}Yapi`, ad: `${ad}, yapı sayısı` },
  ...INSAAT_BINA_TURLERI.map((t) => ({
    kod: `TP.IN.${grup}.${t.kod}.TOP.B`,
    formul: 0,
    alan: `${on}${t.alan}`,
    ad: `${ad}, ${t.ad.charAt(0).toLocaleLowerCase('tr')}${t.ad.slice(1)} (m²)`,
  })),
]);

// Aylık akımlar çok oynaktır (aralıkta yıl sonu sıçraması); 12 aylık toplamlar sayfada alınır, burada hesaplanmaz.
export async function insaatIzinAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TÜİK verisi, yapı izin istatistikleri: yapı ruhsatı ve yapı kullanma izin belgesi (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(INSAAT_IZIN_SERILERI),
    satirlar: await aylikFormullu(INSAAT_IZIN_SERILERI, new Date(Date.UTC(2010, 0, 1)), simdi, anahtar, 'İnşaat izinleri', 120),
  };
}

// Kesimlerin 12 ay sonrası yıllık enflasyon beklentisi (%, anket ortalaması). Hanehalkı serisi 2026'dan önce başka bir
// anketten gelir; EVDS tek seri olarak verir.
export const KESIM_BEKLENTI_SERILERI = [
  { kod: 'TP.ENFBEK.PKA12ENF', formul: 0, alan: 'piyasa', ad: 'Piyasa katılımcıları, 12 ay sonrası yıllık enflasyon beklentisi' },
  { kod: 'TP.ENFBEK.IYA12ENF', formul: 0, alan: 'reel', ad: 'Reel kesim, 12 ay sonrası yıllık enflasyon beklentisi' },
  { kod: 'TP.ENFBEK.HBA12ENF', formul: 0, alan: 'hanehalki', ad: 'Hanehalkı, 12 ay sonrası yıllık enflasyon beklentisi' },
];
// Hanehalkı Beklenti Anketi (TCMB, 2026'dan): yanıt payları, %. 15 ve 16. sorularda iki grup seçilir; EVDS payları seçimler
// üzerinden verir, toplamları 100'dür (doğrulandı 29.10.2026). HAN14A (ortalama beklenti) HBA12ENF ile, HAN13A/C HBA1ENF/
// HBA3ENF ile aynıdır; ikinci kez alınmaz.
const HANE_GRUPLARI = [
  { harf: 'A', alan: 'Gida', ad: 'gıda' },
  { harf: 'B', alan: 'Enerji', ad: 'yakıt ve enerji' },
  { harf: 'C', alan: 'Lokanta', ad: 'otel, lokanta vb. hizmetler' },
  { harf: 'D', alan: 'Kira', ad: 'kiralar' },
  { harf: 'E', alan: 'Dayanikli', ad: 'beyaz eşya, otomobil vb. dayanıklı mallar' },
  { harf: 'F', alan: 'Egitim', ad: 'eğitim' },
  { harf: 'G', alan: 'Diger', ad: 'diğer' },
];
export const HANE_BEKLENTI_SERILERI = [
  { kod: 'TP.HANEBEK.HAN13A', formul: 0, alan: 'altinda', ad: 'Enflasyonun 12 ay sonra bugünkünün altında olmasını bekleyenler' },
  { kod: 'TP.HANEBEK.HAN13B', formul: 0, alan: 'ayni', ad: 'Enflasyonun 12 ay sonra bugünküyle aynı olmasını bekleyenler' },
  { kod: 'TP.HANEBEK.HAN13C', formul: 0, alan: 'uzerinde', ad: 'Enflasyonun 12 ay sonra bugünkünün üzerinde olmasını bekleyenler' },
  ...HANE_GRUPLARI.map((g) => ({
    kod: `TP.HANEBEK.HAN15${g.harf}`,
    formul: 0,
    alan: `gecmis${g.alan}`,
    ad: `Son bir yılda fiyatı en çok artan gruplar arasında ${g.ad} sayanlar`,
  })),
  ...HANE_GRUPLARI.map((g) => ({
    kod: `TP.HANEBEK.HAN16${g.harf}`,
    formul: 0,
    alan: `gelecek${g.alan}`,
    ad: `Gelecek 12 ayda fiyatı en çok artacak gruplar arasında ${g.ad} sayanlar`,
  })),
];

// Olasılık dağılımı aralıkları EVDS seri listesinden: "(18.00-18.99) 12 Ay Sonrası…", "(0.00-2.99) …", "(>=40.00) …",
// "(Gözlem Sayısı) …". Alt ve üst sınır yüzde; son aralığın üstü açıktır (null).
async function dagilimSerileri(anahtar) {
  const yanit = await fetch(`${EVDS}/serieList/type=json&code=bie_bekodtufeyeni`, { headers: { key: anahtar } });
  if (!yanit.ok) throw new Error(`EVDS seri listesi ${yanit.status}`);
  const liste = await yanit.json();
  const vade = { 12: { gozlem: null, kutular: [] }, 24: { gozlem: null, kutular: [] } };
  for (const s of liste) {
    const m = String(s.SERIE_NAME).match(/^\((.+?)\) (12|24) Ay Sonrası/);
    if (!m) continue;
    const v = vade[m[2]];
    if (m[1] === 'Gözlem Sayısı') v.gozlem = s.SERIE_CODE;
    else if (/^>=\d/.test(m[1])) v.kutular.push({ kod: s.SERIE_CODE, alt: Number(m[1].slice(2)), ust: null });
    else {
      const a = m[1].match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
      if (a) v.kutular.push({ kod: s.SERIE_CODE, alt: Number(a[1]), ust: Number(a[2]) });
    }
  }
  for (const [ay, v] of Object.entries(vade)) {
    if (!v.gozlem || v.kutular.length < 20) throw new Error(`Beklenti dağılımı ${ay} ay seri listesi eksik`);
    v.kutular.sort((a, b) => a.alt - b.alt);
  }
  return vade;
}

// Dağılım yalnız son yayımlanmış ay için: son üç ay istenir, gözlem sayısı dolu son ay alınır. Paylar EVDS'nin verdiği
// gibidir (katılımcıların olasılıklarının ortalaması, %); sıfır paylı uç aralıklar sayfada gösterilmez.
async function dagilimAl(simdi, anahtar) {
  const vade = await dagilimSerileri(anahtar);
  const kodlar = Object.values(vade).flatMap((v) => [v.gozlem, ...v.kutular.map((k) => k.kod)]);
  const bas = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth() - 3, 1));
  const ham = await evdsCek(kodlar, kodlar.map(() => 0), bas, simdi, anahtar);
  const son = ham.filter((h) => h.ay && h[alanAdi(vade[12].gozlem, 0)] != null && h[alanAdi(vade[24].gozlem, 0)] != null).at(-1);
  if (!son) throw new Error('Beklenti dağılımı boş');
  const vadeYaz = (v) => ({
    gozlem: son[alanAdi(v.gozlem, 0)],
    kutular: v.kutular.map((k) => ({ alt: k.alt, ust: k.ust, pay: son[alanAdi(k.kod, 0)] ?? 0 })),
  });
  return { yil: son.yil, ay: son.ay, ay12: vadeYaz(vade[12]), ay24: vadeYaz(vade[24]) };
}

export async function kesimBeklentiAl(simdi, anahtar) {
  return {
    kaynak: {
      ad: 'TCMB Piyasa Katılımcıları Anketi, İktisadi Yönelim Anketi ve Hanehalkı Beklenti Anketi (TCMB EVDS)',
      url: EVDS_SAYFA,
    },
    seriler: tanimlar(KESIM_BEKLENTI_SERILERI),
    haneSeriler: tanimlar(HANE_BEKLENTI_SERILERI),
    satirlar: await aylikFormullu(KESIM_BEKLENTI_SERILERI, new Date(Date.UTC(2015, 0, 1)), simdi, anahtar, 'Kesim beklentileri', 100),
    hane: await aylikFormullu(HANE_BEKLENTI_SERILERI, new Date(Date.UTC(2026, 0, 1)), simdi, anahtar, 'Hanehalkı beklenti anketi', 6),
    dagilim: await dagilimAl(simdi, anahtar),
  };
}

// Faizler %, fonlama tutarları milyon TL. Bir haftalık repo kotasyonu Eylül 2018'den önce yoktur (bosOlabilir); öteki
// alanlar dolu olmayan satır atılır. Net fonlama = fonlama − sterilizasyon (TCMB'nin verdiği seri); eksi değer TCMB'nin
// piyasaya verdiğinden fazlasını çektiğini gösterir.
export const PARA_PIYASASI_SERILERI = [
  { kod: 'TP.PY.P02.ON', alan: 'borcVerme', ad: 'TCMB gecelik borç verme faizi (koridorun üst sınırı)' },
  { kod: 'TP.PY.P01.ON', alan: 'borcAlma', ad: 'TCMB gecelik borç alma faizi (koridorun alt sınırı)' },
  { kod: 'TP.PY.P02.1H', alan: 'repo', ad: 'TCMB bir haftalık repo faizi (politika faizi)', bosOlabilir: true },
  { kod: 'TP.PY.P06.ON', alan: 'bankalararasi', ad: 'TCMB bankalararası piyasası, gecelik ağırlıklı ortalama faiz' },
  { kod: 'TP.APIFON4', alan: 'aofm', ad: 'TCMB ağırlıklı ortalama fonlama maliyeti (AOFM)' },
  { kod: 'TP.APIFON1.TOP', alan: 'fonlama', ad: 'TCMB toplam fonlama' },
  { kod: 'TP.APIFON2.TOP', alan: 'sterilizasyon', ad: 'TCMB toplam sterilizasyon' },
  { kod: 'TP.APIFON3', alan: 'net', ad: 'TCMB net fonlama' },
];

const paraSatiri = (h) => ({
  tarih: h.tarih,
  ...Object.fromEntries(PARA_PIYASASI_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)] ?? null])),
});
const paraDolu = (s) => PARA_PIYASASI_SERILERI.every((t) => t.bosOlabilir || s[t.alan] != null);

// Haftalık: EVDS'nin haftalık ortalaması (cuma tarihli); bitmemiş haftanın satırı atılır. Son: son 15 günün dolu son iş günü.
export async function paraPiyasasiAl(simdi, anahtar) {
  const kodlar = PARA_PIYASASI_SERILERI.map((t) => t.kod);
  const sifirlar = kodlar.map(() => 0);
  const bugun = simdi.toISOString().slice(0, 10);
  const haftalik = (
    await evdsCek(kodlar, sifirlar, new Date(Date.UTC(2011, 0, 1)), simdi, anahtar, `&frequency=3&aggregationTypes=${kodlar.map(() => 'avg').join('-')}`)
  )
    .filter((h) => h.tarih && h.tarih <= bugun)
    .map(paraSatiri)
    .filter(paraDolu);
  if (haftalik.length < 500) throw new Error('Para piyasası haftalık serisi yetersiz');
  const gunluk = (await evdsCek(kodlar, sifirlar, new Date(simdi.getTime() - 15 * 864e5), simdi, anahtar))
    .filter((h) => h.tarih)
    .map(paraSatiri)
    .filter((s) => paraDolu(s) && s.repo != null);
  const son = gunluk.at(-1);
  if (!son) throw new Error('Para piyasası günlük değer yok');
  return {
    kaynak: { ad: 'TCMB piyasa verileri: bankalararası para piyasası, net fonlama ve fonlama maliyeti (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(PARA_PIYASASI_SERILERI),
    satirlar: haftalik,
    son,
  };
}

// Para arzı (TCMB haftalık para ve banka istatistikleri, bin TL): M1 = dolaşımdaki para + vadesiz mevduat (TL ve YP);
// M2 = M1 + vadeli mevduat (TL ve YP); M3 = M2 + repo, para piyasası fonları ve ihraç edilen menkul kıymetler.
export const PARA_ARZI_SERILERI = [
  { kod: 'TP.HPBITABLO1.2', formul: 0, alan: 'm1', ad: 'M1' },
  { kod: 'TP.HPBITABLO1.11', formul: 0, alan: 'm2', ad: 'M2' },
  { kod: 'TP.HPBITABLO1.18', formul: 0, alan: 'm3', ad: 'M3' },
  { kod: 'TP.HPBITABLO1.2', formul: 3, alan: 'm1Yillik', ad: 'M1, yıllık değişim' },
  { kod: 'TP.HPBITABLO1.11', formul: 3, alan: 'm2Yillik', ad: 'M2, yıllık değişim' },
  { kod: 'TP.HPBITABLO1.18', formul: 3, alan: 'm3Yillik', ad: 'M3, yıllık değişim' },
  { kod: 'TP.HPBITABLO1.3', formul: 0, alan: 'dolasim', ad: 'Dolaşımdaki para' },
  { kod: 'TP.HPBITABLO1.4', formul: 0, alan: 'vadesizTl', ad: 'Vadesiz mevduat (TL)' },
  { kod: 'TP.HPBITABLO1.8', formul: 0, alan: 'vadesizYp', ad: 'Vadesiz mevduat (YP)' },
  { kod: 'TP.HPBITABLO1.12', formul: 0, alan: 'vadeliTl', ad: 'Vadeli mevduat (TL)' },
  { kod: 'TP.HPBITABLO1.15', formul: 0, alan: 'vadeliYp', ad: 'Vadeli mevduat (YP)' },
  { kod: 'TP.HPBITABLO1.19', formul: 0, alan: 'repo', ad: 'Repo' },
  { kod: 'TP.HPBITABLO1.20', formul: 0, alan: 'ppf', ad: 'Para piyasası fonları' },
  { kod: 'TP.HPBITABLO1.21', formul: 0, alan: 'menkul', ad: 'İhraç edilen menkul kıymetler' },
];

// Yıllık değişim bir yıllık geçmiş ister: istek 2010'dan, bütün alanları dolu haftalar alınır (menkul kıymetler 2010 sonundan,
// yıllık değişim 2011'den dolar). Bitmemiş haftanın satırı yoktur (seri cuma stokudur, yayımlanınca gelir).
export async function paraArziAl(simdi, anahtar) {
  const ham = await evdsCek(PARA_ARZI_SERILERI.map((t) => t.kod), PARA_ARZI_SERILERI.map((t) => t.formul), new Date(Date.UTC(2010, 0, 1)), simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.tarih)
    .map((h) => ({ tarih: h.tarih, ...Object.fromEntries(PARA_ARZI_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, t.formul)]])) }))
    .filter((s) => PARA_ARZI_SERILERI.every((t) => s[t.alan] != null));
  if (satirlar.length < 500) throw new Error('Para arzı serisi yetersiz');
  return {
    kaynak: { ad: 'TCMB haftalık para ve banka istatistikleri, para arzı (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'bin TL',
    seriler: tanimlar(PARA_ARZI_SERILERI),
    satirlar,
  };
}

export const KKM_SERILERI = [
  { kod: 'TP.KKM.K1', formul: 0, alan: 'dd', ad: 'Döviz dönüşümlü KKM, toplam (milyar ABD doları)' },
  { kod: 'TP.KKM.K2', formul: 0, alan: 'ddGercek', ad: 'Döviz dönüşümlü KKM, gerçek kişiler (milyar ABD doları)' },
  { kod: 'TP.KKM.K3', formul: 0, alan: 'ddTuzel', ad: 'Döviz dönüşümlü KKM, tüzel kişiler (milyar ABD doları)' },
  { kod: 'TP.KKM.K4', formul: 0, alan: 'tl', ad: 'TL KKM, toplam (milyar TL)' },
];

export async function kkmAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB kur korumalı mevduat istatistikleri (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(KKM_SERILERI),
    satirlar: await aylikFormullu(KKM_SERILERI, new Date(Date.UTC(2021, 11, 1)), simdi, anahtar, 'Kur korumalı mevduat', 50),
  };
}

// Analitik bilanço (bin TL). Aktif = dış varlıklar + iç varlıklar + değerleme hesabı; pasif = döviz yükümlülükleri + merkez
// bankası parası. Rezerv para = emisyon + bankalar mevduatı (zorunlu karşılık + serbest) + fon hesapları + banka dışı kesim.
export const TCMB_BILANCO_SERILERI = [
  { kod: 'TP.AB.A01', alan: 'aktif', ad: 'Aktif toplamı' },
  { kod: 'TP.AB.A02', alan: 'disVarlik', ad: 'Dış varlıklar' },
  { kod: 'TP.AB.A03', alan: 'icVarlik', ad: 'İç varlıklar' },
  { kod: 'TP.AB.A05', alan: 'hazine', ad: 'Hazine borçları' },
  { kod: 'TP.AB.A06', alan: 'bankaKredi', ad: 'Bankacılık sektörüne açılan nakit krediler' },
  { kod: 'TP.AB.A08', alan: 'degerleme', ad: 'Değerleme hesabı' },
  { kod: 'TP.AB.A10', alan: 'dovizYuk', ad: 'Toplam döviz yükümlülükleri' },
  { kod: 'TP.AB.A15', alan: 'mbParasi', ad: 'Merkez bankası parası' },
  { kod: 'TP.AB.A16', alan: 'rezervPara', ad: 'Rezerv para' },
  { kod: 'TP.AB.A17', alan: 'emisyon', ad: 'Emisyon (dolaşımdaki banknot)' },
  { kod: 'TP.AB.A19', alan: 'zorunlu', ad: 'Zorunlu karşılıklar' },
  { kod: 'TP.AB.A20', alan: 'serbest', ad: 'Bankaların serbest mevduatı' },
  { kod: 'TP.AB.A24', alan: 'api', ad: 'Açık piyasa işlemleri' },
  { kod: 'TP.AB.A25', alan: 'kamuMevduat', ad: 'Kamu mevduatı' },
];

const bilancoSatiri = (h) => ({ tarih: h.tarih, ...Object.fromEntries(TCMB_BILANCO_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) });
const bilancoDolu = (s) => TCMB_BILANCO_SERILERI.every((t) => s[t.alan] != null);

// Haftalık: haftanın son iş gününün değeri (stok), bitmemiş haftanın satırı atılır. Son: son 15 günün dolu son iş günü.
export async function tcmbBilancoAl(simdi, anahtar) {
  const kodlar = TCMB_BILANCO_SERILERI.map((t) => t.kod);
  const sifirlar = kodlar.map(() => 0);
  const bugun = simdi.toISOString().slice(0, 10);
  const satirlar = (
    await evdsCek(kodlar, sifirlar, new Date(Date.UTC(2013, 0, 1)), simdi, anahtar, `&frequency=3&aggregationTypes=${kodlar.map(() => 'last').join('-')}`)
  )
    .filter((h) => h.tarih && h.tarih <= bugun)
    .map(bilancoSatiri)
    .filter(bilancoDolu);
  if (satirlar.length < 500) throw new Error('TCMB bilançosu haftalık serisi yetersiz');
  const son = (await evdsCek(kodlar, sifirlar, new Date(simdi.getTime() - 15 * 864e5), simdi, anahtar))
    .filter((h) => h.tarih)
    .map(bilancoSatiri)
    .filter(bilancoDolu)
    .at(-1);
  if (!son) throw new Error('TCMB bilançosu günlük değer yok');
  return {
    kaynak: { ad: 'TCMB analitik bilançosu (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'bin TL',
    seriler: tanimlar(TCMB_BILANCO_SERILERI),
    satirlar,
    son,
  };
}

// Akım faizler (%, yıllık, haftalık ağırlıklı ortalama). Tasarruf/ticari ayrımı ve KMH dahil/hariç seriler Temmuz 2012'de
// başlar; satırlar oradan.
export const FAIZ_AYRINTI_SERILERI = [
  { kod: 'TP.TRY.MT01', alan: 'tl1a', ad: 'TL mevduat, 1 aya kadar' },
  { kod: 'TP.TRY.MT02', alan: 'tl3a', ad: 'TL mevduat, 3 aya kadar' },
  { kod: 'TP.TRY.MT03', alan: 'tl6a', ad: 'TL mevduat, 6 aya kadar' },
  { kod: 'TP.TRY.MT04', alan: 'tl1y', ad: 'TL mevduat, 1 yıla kadar' },
  { kod: 'TP.TRY.MT05', alan: 'tlUzun', ad: 'TL mevduat, 1 yıl ve daha uzun' },
  { kod: 'TP.TRY.MT06', alan: 'tlToplam', ad: 'TL mevduat, toplam' },
  { kod: 'TP.TRYTAS.MT06', alan: 'tlTasarruf', ad: 'TL tasarruf mevduatı, toplam' },
  { kod: 'TP.TRYTIC.MT06', alan: 'tlTicari', ad: 'TL ticari mevduat, toplam' },
  { kod: 'TP.USD.MT06', alan: 'usd', ad: 'ABD doları mevduat, toplam' },
  { kod: 'TP.EUR.MT06', alan: 'eur', ad: 'Euro mevduat, toplam' },
  { kod: 'TP.KTFTUK', alan: 'tuketici', ad: 'Tüketici kredisi (ihtiyaç, taşıt, konut)' },
  { kod: 'TP.KTFTUK01', alan: 'tuketiciKmh', ad: 'Tüketici kredisi, KMH dahil' },
  { kod: 'TP.KTF101', alan: 'ihtiyacKmh', ad: 'İhtiyaç kredisi, KMH dahil' },
  { kod: 'TP.KTF17', alan: 'ticari', ad: 'Ticari kredi (TL)' },
  { kod: 'TP.KTF18', alan: 'ticariKmhHaric', ad: 'Ticari kredi (TL), tüzel kişi KMH ve kurumsal kredi kartları hariç' },
  { kod: 'TP.KTF17.USD', alan: 'ticariUsd', ad: 'Ticari kredi (ABD doları)' },
  { kod: 'TP.KTF17.EUR', alan: 'ticariEur', ad: 'Ticari kredi (euro)' },
];
// Finansman şirketlerinin stok faizi (%, aylık, Aralık 2013'ten).
export const FINANSMAN_FAIZ_SERILERI = [
  { kod: 'TP.FKF.TRY.1', formul: 0, alan: 'ticari', ad: 'Finansman şirketleri, ticari kredi (TL, stok)' },
  { kod: 'TP.FKF.TRY.15', formul: 0, alan: 'tuketici', ad: 'Finansman şirketleri, tüketici kredisi (TL, stok)' },
];

export async function faizAyrintiAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB faiz istatistikleri: bankaların akım mevduat ve kredi faizleri, finansman şirketleri stok faizleri (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(FAIZ_AYRINTI_SERILERI),
    finansmanSeriler: tanimlar(FINANSMAN_FAIZ_SERILERI),
    satirlar: await haftalikSeriler(FAIZ_AYRINTI_SERILERI, new Date(Date.UTC(2012, 6, 1)), simdi, anahtar, 'Faiz ayrıntısı', 600),
    finansman: await aylikFormullu(FINANSMAN_FAIZ_SERILERI, new Date(Date.UTC(2013, 11, 1)), simdi, anahtar, 'Finansman şirketi faizleri', 100),
  };
}

// Bankaların döviz işlem hacmi (milyon ABD doları, günlük akım). Toplamlar bütün taraflar içindir; yurt dışı swap yurt dışı
// banka, kuruluş ve müşterilerle yapılan swap, yurt içi müşteri spot bankaların yurt içi müşterilerle spot işlemleridir.
export const DOVIZ_HACMI_SERILERI = [
  { kod: 'TP.TLDOV05.SPT', alan: 'spot', ad: 'Toplam spot işlem hacmi' },
  { kod: 'TP.TLDOV05.SWP', alan: 'swap', ad: 'Toplam swap işlem hacmi' },
  { kod: 'TP.TLDOV05.FWD', alan: 'vadeli', ad: 'Toplam vadeli işlem hacmi' },
  { kod: 'TP.TLDOV04.SWP', alan: 'yurtDisiSwap', ad: 'Yurt dışı banka, kuruluş ve müşterilerle swap' },
  { kod: 'TP.TLDOV02.SPT', alan: 'musteriSpot', ad: 'Yurt içi müşterilerle spot' },
  { kod: 'TP.TLDOV06.EFK', alan: 'efektif', ad: 'Efektif (banknot) işlem hacmi' },
];

const hacimSatiri = (h) => ({ tarih: h.tarih, ...Object.fromEntries(DOVIZ_HACMI_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) });
const hacimDolu = (s) => DOVIZ_HACMI_SERILERI.every((t) => s[t.alan] != null);

// Haftalık: EVDS'nin haftalık ortalaması (iş günü başına hacim); yayımlanan son iş gününden sonra biten hafta yarımdır, atılır.
export async function dovizHacmiAl(simdi, anahtar) {
  const kodlar = DOVIZ_HACMI_SERILERI.map((t) => t.kod);
  const sifirlar = kodlar.map(() => 0);
  const son = (await evdsCek(kodlar, sifirlar, new Date(simdi.getTime() - 20 * 864e5), simdi, anahtar))
    .filter((h) => h.tarih)
    .map(hacimSatiri)
    .filter(hacimDolu)
    .at(-1);
  if (!son) throw new Error('Döviz hacmi günlük değer yok');
  const satirlar = (
    await evdsCek(kodlar, sifirlar, new Date(Date.UTC(2010, 0, 1)), simdi, anahtar, `&frequency=3&aggregationTypes=${kodlar.map(() => 'avg').join('-')}`)
  )
    .filter((h) => h.tarih && h.tarih <= son.tarih)
    .map(hacimSatiri)
    .filter(hacimDolu);
  if (satirlar.length < 600) throw new Error('Döviz hacmi haftalık serisi yetersiz');
  return {
    kaynak: { ad: 'TCMB, bankaların Türk lirası karşılığı döviz işlem hacimleri (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(DOVIZ_HACMI_SERILERI),
    satirlar,
    son,
  };
}

// Elektrik (TEİAŞ, günlük, MWh). Tüketim = üretim + ithalat − ihracat (depolama küçük kalemdir). Yenilenebilir ve
// yenilenemez üretim Şubat 2026'dan önce boştur; günlük satırlarda null kalır.
export const ELEKTRIK_SERILERI = [
  { kod: 'TP.ELEKTUKETIM.TKT1', alan: 'tuketim', ad: 'Elektrik tüketimi' },
  { kod: 'TP.ELEKTUKETIM.URT', alan: 'uretim', ad: 'Elektrik üretimi' },
  { kod: 'TP.ELEKTUKETIM.ITH', alan: 'ithalat', ad: 'Elektrik ithalatı' },
  { kod: 'TP.ELEKTUKETIM.IHR', alan: 'ihracat', ad: 'Elektrik ihracatı' },
];
export const ELEKTRIK_KAYNAK_SERILERI = [
  { kod: 'TP.ELEKTUKETIM.URTYB', alan: 'yenilenebilir', ad: 'Yenilenebilir üretim' },
  { kod: 'TP.ELEKTUKETIM.URTYMZ', alan: 'yenilenemez', ad: 'Yenilenemez üretim' },
];

// Haftalık: EVDS'nin haftalık ortalaması (cuma tarihli, günlük MWh); yayımlanan son günden sonra biten yarım hafta atılır.
// Günlük: son 400 gün (bir yıl önceki aynı günlerle karşılaştırma sayfada yapılır).
export async function elektrikAl(simdi, anahtar) {
  const ana = ELEKTRIK_SERILERI.map((t) => t.kod);
  const hepsi = [...ELEKTRIK_SERILERI, ...ELEKTRIK_KAYNAK_SERILERI];
  const gunluk = (await evdsCek(hepsi.map((t) => t.kod), hepsi.map(() => 0), new Date(simdi.getTime() - 400 * 864e5), simdi, anahtar))
    .filter((h) => h.tarih)
    .map((h) => ({ tarih: h.tarih, ...Object.fromEntries(hepsi.map((t) => [t.alan, h[alanAdi(t.kod, 0)] ?? null])) }))
    .filter((s) => ELEKTRIK_SERILERI.every((t) => s[t.alan] != null));
  if (gunluk.length < 360) throw new Error('Elektrik günlük serisi yetersiz');
  const sonGun = gunluk.at(-1).tarih;
  const satirlar = (
    await evdsCek(ana, ana.map(() => 0), new Date(Date.UTC(2016, 0, 1)), simdi, anahtar, `&frequency=3&aggregationTypes=${ana.map(() => 'avg').join('-')}`)
  )
    .filter((h) => h.tarih && h.tarih <= sonGun)
    .map((h) => ({ tarih: h.tarih, ...Object.fromEntries(ELEKTRIK_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)]])) }))
    .filter((s) => ELEKTRIK_SERILERI.every((t) => s[t.alan] != null));
  if (satirlar.length < 500) throw new Error('Elektrik haftalık serisi yetersiz');
  return {
    kaynak: { ad: 'TEİAŞ verisi, günlük elektrik üretim ve tüketimi (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'MWh',
    seriler: tanimlar(hepsi),
    satirlar,
    gunluk,
  };
}

// Takas odalarındaki çekler (aylık akım): tutarlar bin TL.
export const CEK_SERILERI = [
  { kod: 'TP.BTO1', formul: 0, alan: 'ibrazAdet', ad: 'İbraz edilen çek adedi' },
  { kod: 'TP.BTO2', formul: 0, alan: 'ibrazTutar', ad: 'İbraz edilen çek tutarı (bin TL)' },
  { kod: 'TP.BTO3', formul: 0, alan: 'karsiliksizAdet', ad: 'Karşılıksız çek adedi' },
  { kod: 'TP.BTO4', formul: 0, alan: 'karsiliksizTutar', ad: 'Karşılıksız çek tutarı (bin TL)' },
];

export async function cekAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'Takasbank verisi, takas odalarına ibraz edilen ve karşılıksız çekler (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(CEK_SERILERI),
    satirlar: await aylikFormullu(CEK_SERILERI, new Date(Date.UTC(2008, 0, 1)), simdi, anahtar, 'Karşılıksız çek', 150),
  };
}

// Tedavüldeki banknotlar (ay sonu): adet ve TL tutar; "diğer" EVDS'de "Diğer*" olarak verilen kalemdir. Kupürlerin toplamı
// toplama eşittir (doğrulandı 29.10.2026).
export const BANKNOT_KUPURLERI = [
  { kod: 'T200', alan: 'k200', ad: '200 TL' },
  { kod: 'T100', alan: 'k100', ad: '100 TL' },
  { kod: 'T50', alan: 'k50', ad: '50 TL' },
  { kod: 'T20', alan: 'k20', ad: '20 TL' },
  { kod: 'T10', alan: 'k10', ad: '10 TL' },
  { kod: 'T5', alan: 'k5', ad: '5 TL' },
  { kod: 'TDG', alan: 'diger', ad: 'Diğer' },
  { kod: 'TTU', alan: 'toplam', ad: 'Toplam' },
];
export const BANKNOT_SERILERI = [
  ...BANKNOT_KUPURLERI.map((k) => ({ kod: `TP.TEDAVULADT.${k.kod}`, formul: 0, alan: `${k.alan}Adet`, ad: `${k.ad}, adet` })),
  ...BANKNOT_KUPURLERI.map((k) => ({ kod: `TP.TEDAVULTUT.${k.kod}`, formul: 0, alan: `${k.alan}Tutar`, ad: `${k.ad}, tutar (TL)` })),
];

export async function banknotAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, tedavüldeki banknotların kupür dağılımı (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(BANKNOT_SERILERI),
    satirlar: await aylikFormullu(BANKNOT_SERILERI, new Date(Date.UTC(2009, 0, 1)), simdi, anahtar, 'Banknotlar', 150),
  };
}

// Ödeme sistemleri: aylık toplam adet ve tutar (TL). FAST Aralık 2020'de başladı; öncesinde boştur (null kalır).
export const ODEME_SERILERI = [
  { kod: 'TP.OSGMFAST.CTO', alan: 'fastAdet', ad: 'FAST, ödeme adedi', bosOlabilir: true },
  { kod: 'TP.OSGMFAST.ATO', alan: 'fastTutar', ad: 'FAST, ödeme tutarı (TL)', bosOlabilir: true },
  { kod: 'TP.OSGMPOS.ADET.A01', alan: 'eftAdet', ad: 'Perakende ödeme sistemi (bireysel EFT), ödeme adedi' },
  { kod: 'TP.OSGMPOS.TUTAR.T01', alan: 'eftTutar', ad: 'Perakende ödeme sistemi (bireysel EFT), ödeme tutarı (TL)' },
  { kod: 'TP.EFTEMKT2.ADET.A01', alan: 'buyukAdet', ad: 'EFT-EMKT, ödeme adedi' },
  { kod: 'TP.EFTEMKT2.TUTAR.A01', alan: 'buyukTutar', ad: 'EFT-EMKT, ödeme tutarı (TL)' },
];
// FAST anlık ödemelerinin amaçları (Nisan 2026'dan 22 amaç; öncesinde ilk 11).
export const FAST_AMACLARI = [
  ['OKK', 'Konut kirası'], ['OIK', 'İş yeri kirası'], ['ODK', 'Diğer kira'], ['OET', 'E-ticaret'], ['OC', 'Çalışan ödemesi (maaş vb.)'],
  ['OT', 'Ticari ödeme'], ['OB', 'Bireysel ödeme'], ['OY', 'Yatırım'], ['OF', 'Finansal işlemler'], ['OE', 'Eğitim'], ['OA', 'Aidat'],
  ['12', 'Gayrimenkul alımı'], ['13', 'Motorlu taşıt alımı'], ['14', 'Borç verme / borç ödeme'], ['15', 'Hediye, bağış, yardım'],
  ['16', 'Vergi, resim, harç'], ['17', 'Tazminat, sigorta'], ['18', 'Avukatlık, danışmanlık, müşavirlik'], ['19', 'Sağlık'],
  ['20', 'Kripto, dijital varlık'], ['21', 'Şans oyunları, bahis'], ['22', 'Eğlence, sosyal medya'],
].map(([k, ad]) => ({ adet: /^\d/.test(k) ? `TP.OSGMFAST.C${k}` : `TP.OSGMFAST.CA${k}`, tutar: /^\d/.test(k) ? `TP.OSGMFAST.A${k}` : `TP.OSGMFAST.AA${k}`, ad }));

const ayinSonGunu = (yil, ay) => new Date(Date.UTC(yil, ay, 0)).toISOString().slice(0, 10);

export async function odemeAl(simdi, anahtar) {
  const kodlar = ODEME_SERILERI.map((t) => t.kod);
  const toplam = `&frequency=5&aggregationTypes=${kodlar.map(() => 'sum').join('-')}`;
  // Yayımlanan son gün: tamamlanmamış ay bununla bulunur.
  const sonGun = (await evdsCek(['TP.OSGMPOS.ADET.A01'], [0], new Date(simdi.getTime() - 15 * 864e5), simdi, anahtar))
    .filter((h) => h.tarih && h.TP_OSGMPOS_ADET_A01 != null)
    .at(-1)?.tarih;
  if (!sonGun) throw new Error('Ödeme sistemleri günlük değer yok');
  const tam = (s) => ayinSonGunu(s.yil, s.ay) <= sonGun;
  const satirlar = (await evdsCek(kodlar, kodlar.map(() => 0), new Date(Date.UTC(2014, 0, 1)), simdi, anahtar, toplam))
    .filter((h) => h.ay && tam(h))
    .map((h) => ({ yil: h.yil, ay: h.ay, ...Object.fromEntries(ODEME_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)] ?? null])) }))
    .filter((s) => ODEME_SERILERI.every((t) => t.bosOlabilir || s[t.alan] != null));
  if (satirlar.length < 120) throw new Error('Ödeme sistemleri serisi yetersiz');
  const son = satirlar.at(-1);
  const amacKodlari = FAST_AMACLARI.flatMap((a) => [a.adet, a.tutar]);
  const ayBasi = new Date(Date.UTC(son.yil, son.ay - 1, 1));
  const amacHam = (
    await evdsCek(amacKodlari, amacKodlari.map(() => 0), ayBasi, ayBasi, anahtar, `&frequency=5&aggregationTypes=${amacKodlari.map(() => 'sum').join('-')}`)
  ).find((h) => h.yil === son.yil && h.ay === son.ay);
  if (!amacHam) throw new Error('FAST amaç dağılımı yok');
  const amaclar = FAST_AMACLARI.map((a) => ({ ad: a.ad, adet: amacHam[alanAdi(a.adet, 0)] ?? null, tutar: amacHam[alanAdi(a.tutar, 0)] ?? null })).filter(
    (a) => a.adet != null && a.tutar != null,
  );
  return {
    kaynak: { ad: 'TCMB ödeme sistemleri istatistikleri: FAST, perakende ödeme sistemi ve EFT-EMKT (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'TL',
    seriler: tanimlar(ODEME_SERILERI),
    satirlar,
    fastAmac: { yil: son.yil, ay: son.ay, amaclar },
  };
}

// Yabancı ziyaretçi (kişi, aylık). EVDS 2008'den önce yalnız aralık aylarında yıllık toplam verir; aylık yıllık değişim bu
// yüzden 2009'dan anlamlıdır, satırlar Ocak 2009'dan başlar.
export const ZIYARETCI_SERILERI = [
  { kod: 'TP.ODEMGZS.GTOPLAM', formul: 0, alan: 'toplam', ad: 'Yabancı ziyaretçi, toplam' },
  { kod: 'TP.ODEMGZS.GTOPLAM', formul: 3, alan: 'toplamYillik', ad: 'Yabancı ziyaretçi, toplam, yıllık değişim' },
  { kod: 'TP.ODEMGZS.AVRUPATOP', formul: 0, alan: 'avrupa', ad: 'Avrupa' },
  { kod: 'TP.ODEMGZS.ASYATOP', formul: 0, alan: 'asya', ad: 'Asya' },
  { kod: 'TP.ODEMGZS.AMERIKATOP', formul: 0, alan: 'amerika', ad: 'Amerika' },
  { kod: 'TP.ODEMGZS.AFRIKATOP', formul: 0, alan: 'afrika', ad: 'Afrika' },
  { kod: 'TP.ODEMGZS.OKYANUSYATOP', formul: 0, alan: 'okyanusya', ad: 'Okyanusya' },
  { kod: 'TP.ODEMGZS.ALMANYA', formul: 0, alan: 'almanya', ad: 'Almanya' },
  { kod: 'TP.ODEMGZS.RUSYA', formul: 0, alan: 'rusya', ad: 'Rusya' },
  { kod: 'TP.ODEMGZS.INGILTERE', formul: 0, alan: 'ingiltere', ad: 'İngiltere' },
  { kod: 'TP.ODEMGZS.IRAN', formul: 0, alan: 'iran', ad: 'İran' },
];
export const TURIZM_GELIR_SERILERI = [
  { kod: 'TP.TURIZMGELGIT.GK178635', formul: 0, alan: 'gelir', ad: 'Turizm geliri (bin ABD doları)' },
  { kod: 'TP.TURIZMGELGIT.GK178887', formul: 0, alan: 'gider', ad: 'Turizm gideri (bin ABD doları)' },
];

// Ülke listesi EVDS'den (bie_odemgzs): kıta toplamları (…TOP), genel toplam ve "Diğer …" kalemleri ülke değildir.
async function ziyaretciUlkeleri(anahtar) {
  const yanit = await fetch(`${EVDS}/serieList/type=json&code=bie_odemgzs`, { headers: { key: anahtar } });
  if (!yanit.ok) throw new Error(`EVDS seri listesi ${yanit.status}`);
  const ulkeler = (await yanit.json())
    .filter((s) => !/TOP$|GTOPLAM$/.test(s.SERIE_CODE) && !/^Diğer/.test(String(s.SERIE_NAME)))
    .map((s) => ({ kod: s.SERIE_CODE, ad: String(s.SERIE_NAME).trim() }));
  if (ulkeler.length < 50) throw new Error('Ziyaretçi ülke listesi eksik');
  return ulkeler;
}

// Ülke tablosu yalnız son ay için: ülke başına sayı (düzey) ve yıllık değişim, istek başına en çok 60 seri.
export async function turizmAl(simdi, anahtar) {
  const satirlar = (await aylikFormullu(ZIYARETCI_SERILERI, new Date(Date.UTC(2007, 0, 1)), simdi, anahtar, 'Yabancı ziyaretçi', 150)).filter(
    (s) => s.yil >= 2009,
  );
  // Turizm gideri Nisan–Haziran 2020'de yayımlanmadı: o aylar null kalır (aylikFormullu boşlukta bölümü düşürürdü); eksik
  // ay satırı da null ile doldurulur, grafik boşluğu çizgiyle kapatmaz.
  const gelirHam = await evdsCek(TURIZM_GELIR_SERILERI.map((t) => t.kod), [0, 0], new Date(Date.UTC(2012, 0, 1)), simdi, anahtar);
  const gelirHarita = new Map(gelirHam.filter((h) => h.ay).map((h) => [h.yil * 12 + h.ay, h]));
  const gelirSatir = [];
  for (let k = 2012 * 12 + 1; k <= simdi.getUTCFullYear() * 12 + simdi.getUTCMonth() + 1; k++) {
    const h = gelirHarita.get(k);
    const yil = Math.floor((k - 1) / 12);
    gelirSatir.push({ yil, ay: k - yil * 12, gelir: h?.[alanAdi(TURIZM_GELIR_SERILERI[0].kod, 0)] ?? null, gider: h?.[alanAdi(TURIZM_GELIR_SERILERI[1].kod, 0)] ?? null });
  }
  const gelirSon = gelirSatir.findLastIndex((s) => s.gelir != null && s.gider != null);
  const gelir = gelirSatir.slice(gelirSatir.findIndex((s) => s.gelir != null), gelirSon + 1);
  if (gelir.length < 100) throw new Error('Turizm geliri yetersiz');
  const son = satirlar.at(-1);
  const ay = new Date(Date.UTC(son.yil, son.ay - 1, 1));
  const ulkeler = await ziyaretciUlkeleri(anahtar);
  const istek = ulkeler.flatMap((u) => [
    { kod: u.kod, formul: 0 },
    { kod: u.kod, formul: 3 },
  ]);
  const deger = {};
  for (let i = 0; i < istek.length; i += KONUT_IL_PARCA) {
    const parca = istek.slice(i, i + KONUT_IL_PARCA);
    const ham = await evdsCek(parca.map((p) => p.kod), parca.map((p) => p.formul), ay, ay, anahtar);
    Object.assign(deger, ham.find((h) => h.yil === son.yil && h.ay === son.ay) ?? {});
  }
  const ulkeTablosu = ulkeler
    .map((u) => ({ ad: u.ad, sayi: deger[alanAdi(u.kod, 0)] ?? null, yillik: deger[alanAdi(u.kod, 3)] ?? null }))
    .filter((u) => u.sayi != null && u.sayi > 0);
  if (ulkeTablosu.length < 40) throw new Error('Ziyaretçi ülke tablosu eksik');
  return {
    kaynak: { ad: 'Kültür ve Turizm Bakanlığı verisi, milliyetlere göre ziyaretçi sayısı; turizm gelir ve giderleri (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(ZIYARETCI_SERILERI),
    gelirSeriler: tanimlar(TURIZM_GELIR_SERILERI),
    satirlar,
    gelir,
    ulkeTablosu: { yil: son.yil, ay: son.ay, ulkeler: ulkeTablosu },
  };
}

// Uluslararası yatırım pozisyonu (çeyrek sonu stok, milyon $). Varlıklar = doğrudan + portföy + türev + diğer + rezerv;
// yükümlülükler = doğrudan + portföy + türev + diğer; net = varlıklar − yükümlülükler (doğrulandı 29.10.2026). Türevler
// 2005 sonundan; satırlar 2006'dan.
export const UYP_SERILERI = [
  ['K1', 'net', 'Uluslararası yatırım pozisyonu, net'],
  ['K2', 'varlik', 'Varlıklar'],
  ['K40', 'yukumluluk', 'Yükümlülükler'],
  ['K3', 'vDogrudan', 'Varlıklar, doğrudan yatırımlar'],
  ['K6', 'vPortfoy', 'Varlıklar, portföy yatırımları'],
  ['K88', 'vTurev', 'Varlıklar, finansal türevler'],
  ['K15', 'vDiger', 'Varlıklar, diğer yatırımlar'],
  ['K32', 'rezerv', 'Rezerv varlıklar'],
  ['K41', 'yDogrudan', 'Yükümlülükler, doğrudan yatırımlar'],
  ['K44', 'yPortfoy', 'Yükümlülükler, portföy yatırımları'],
  ['K86', 'yHisse', 'Yükümlülükler, hisse senetleri ve yatırım fonu payları'],
  ['K48', 'yBorcSenedi', 'Yükümlülükler, borç senetleri'],
  ['K89', 'yTurev', 'Yükümlülükler, finansal türevler'],
  ['K58', 'yDiger', 'Yükümlülükler, diğer yatırımlar (krediler, mevduatlar)'],
].map(([k, alan, ad]) => ({ kod: `TP.UYPUCAY.${k}`, formul: 0, alan, ad }));

export async function uypAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, uluslararası yatırım pozisyonu (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'milyon ABD doları',
    seriler: tanimlar(UYP_SERILERI),
    ceyrekler: await ceyrekFormullu(UYP_SERILERI, new Date(Date.UTC(2006, 0, 1)), simdi, anahtar, 'Uluslararası yatırım pozisyonu', 70),
  };
}

// Reel kesim güven endeksi (İktisadi Yönelim Anketi): -MA serileri mevsimsellikten arındırılmıştır; ham endeks ayrıca.
export const REEL_GUVEN_SERILERI = [
  ['TP.GY1.N2.MA', 'endeks', 'Reel kesim güven endeksi (mevsimsellikten arındırılmış)'],
  ['TP.GY1.N2', 'ham', 'Reel kesim güven endeksi (arındırılmamış)'],
  ['TP.GY2.N2.MA', 'siparis', 'Toplam sipariş, mevcut durum'],
  ['TP.GY3.N2.MA', 'stok', 'Mamul mal stoku, mevcut durum'],
  ['TP.GY4.N2.MA', 'uretim', 'Üretim hacmi, gelecek üç ay'],
  ['TP.GY5.N2.MA', 'istihdam', 'Toplam istihdam, gelecek üç ay'],
  ['TP.GY6.N2.MA', 'siparisSon3', 'Toplam sipariş, son üç ay'],
  ['TP.GY7.N2.MA', 'ihracat', 'İhracat siparişi, gelecek üç ay'],
  ['TP.GY8.N2.MA', 'yatirim', 'Sabit sermaye yatırım harcaması'],
  ['TP.GY9.N2.MA', 'gidisat', 'Genel gidişat'],
].map(([kod, alan, ad]) => ({ kod, formul: 0, alan, ad }));
export const FINANS_GUVEN_SERILERI = [
  ['TP.FHGE.S01', 'endeks', 'Finansal hizmetler güven endeksi'],
  ['TP.FHGE.S02', 'isDurumu', 'İş durumu, son üç ay'],
  ['TP.FHGE.S03', 'talepSon3', 'Hizmetlere talep, son üç ay'],
  ['TP.FHGE.S04', 'talepGelecek3', 'Hizmetlere talep, gelecek üç ay'],
].map(([kod, alan, ad]) => ({ kod, formul: 0, alan, ad }));

export async function reelGuvenAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, İktisadi Yönelim Anketi ve reel kesim güven endeksi; Finansal Hizmetler Anketi (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(REEL_GUVEN_SERILERI),
    finansSeriler: tanimlar(FINANS_GUVEN_SERILERI),
    satirlar: await aylikFormullu(REEL_GUVEN_SERILERI, new Date(Date.UTC(2007, 0, 1)), simdi, anahtar, 'Reel kesim güveni', 200),
    finans: await aylikFormullu(FINANS_GUVEN_SERILERI, new Date(Date.UTC(2012, 4, 1)), simdi, anahtar, 'Finansal hizmetler güveni', 150),
  };
}

// Ticari gayrimenkul (üç aylık endeks): Türkiye düzey ve yıllık değişim; İstanbul, Ankara, İzmir yıllık değişim.
const TG_ENDEKSLERI = [
  { kod: 'TGFE', on: 'tg', ad: 'Ticari gayrimenkul fiyat endeksi' },
  { kod: 'DFE', on: 'dukkan', ad: 'Dükkân fiyat endeksi' },
  { kod: 'OFE', on: 'ofis', ad: 'Ofis fiyat endeksi' },
];
const TG_ILLERI = [
  { kod: 'IST', son: 'Ist', ad: 'İstanbul' },
  { kod: 'ANK', son: 'Ank', ad: 'Ankara' },
  { kod: 'IZM', son: 'Izm', ad: 'İzmir' },
];
export const TICARI_GAYRIMENKUL_SERILERI = TG_ENDEKSLERI.flatMap((e) => [
  { kod: `TP.${e.kod}.TR`, formul: 0, alan: e.on, ad: `${e.ad}, Türkiye` },
  { kod: `TP.${e.kod}.TR`, formul: 3, alan: `${e.on}Yillik`, ad: `${e.ad}, Türkiye, yıllık değişim` },
  ...TG_ILLERI.map((i) => ({ kod: `TP.${e.kod}.${i.kod}`, formul: 3, alan: `${e.on}${i.son}`, ad: `${e.ad}, ${i.ad}, yıllık değişim` })),
]);
export const KONUT_YENI_SERILERI = [
  { kod: 'TP.YKFE.TR', formul: 0, alan: 'yeni', ad: 'Yeni konutlar fiyat endeksi' },
  { kod: 'TP.YKFE.TR', formul: 3, alan: 'yeniYillik', ad: 'Yeni konutlar fiyat endeksi, yıllık değişim' },
  { kod: 'TP.YOKFEND.TR', formul: 0, alan: 'eski', ad: 'Yeni olmayan konutlar fiyat endeksi' },
  { kod: 'TP.YOKFEND.TR', formul: 3, alan: 'eskiYillik', ad: 'Yeni olmayan konutlar fiyat endeksi, yıllık değişim' },
];

export async function ticariGayrimenkulAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, ticari gayrimenkul, dükkân ve ofis fiyat endeksleri; yeni ve yeni olmayan konut fiyat endeksleri (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(TICARI_GAYRIMENKUL_SERILERI),
    konutSeriler: tanimlar(KONUT_YENI_SERILERI),
    ceyrekler: await ceyrekFormullu(TICARI_GAYRIMENKUL_SERILERI, new Date(Date.UTC(2015, 0, 1)), simdi, anahtar, 'Ticari gayrimenkul', 30),
    konut: await aylikFormullu(KONUT_YENI_SERILERI, new Date(Date.UTC(2010, 0, 1)), simdi, anahtar, 'Yeni ve eski konut', 150),
  };
}

// Banka Kredileri Eğilim Anketi (net yüzde): standartlarda artı gevşeme, talepte artı artış.
export const KREDI_EGILIM_SERILERI = [
  ['S001', 'isStandart', 'İşletme kredileri, kredi standartları, geçen üç ay'],
  ['S002', 'kobiStandart', 'KOBİ kredileri, kredi standartları, geçen üç ay'],
  ['S003', 'buyukStandart', 'Büyük işletme kredileri, kredi standartları, geçen üç ay'],
  ['S024', 'isTalep', 'İşletme kredileri, kredi talebi, geçen üç ay'],
  ['S042', 'isStandartBeklenti', 'İşletme kredileri, kredi standartları, gelecek üç ay beklentisi'],
  ['S049', 'isTalepBeklenti', 'İşletme kredileri, kredi talebi, gelecek üç ay beklentisi'],
  ['S056', 'konutStandart', 'Konut kredileri, kredi standartları, geçen üç ay'],
  ['S057', 'tasitStandart', 'Taşıt kredileri, kredi standartları, geçen üç ay'],
  ['S058', 'digerStandart', 'Diğer bireysel krediler, kredi standartları, geçen üç ay'],
  ['S092', 'konutTalep', 'Konut kredileri, kredi talebi, geçen üç ay'],
  ['S093', 'tasitTalep', 'Taşıt kredileri, kredi talebi, geçen üç ay'],
  ['S094', 'digerTalep', 'Diğer bireysel krediler, kredi talebi, geçen üç ay'],
].map(([k, alan, ad]) => ({ kod: `TP.BKEA.${k}`, formul: 0, alan, ad }));

export async function krediEgilimAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, Banka Kredileri Eğilim Anketi (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(KREDI_EGILIM_SERILERI),
    ceyrekler: await ceyrekFormullu(KREDI_EGILIM_SERILERI, new Date(Date.UTC(2005, 9, 1)), simdi, anahtar, 'Kredi eğilim anketi', 60),
  };
}

// Motorlu taşıt üretimi (adet, aylık). Toplam EVDS'de yoktur; sayfada traktör hariç yedi tür toplanır.
export const OTOMOTIV_SERILERI = [
  ['S08', 'binek', 'Binek otomobil'],
  ['S11', 'kamyonet', 'Kamyonet'],
  ['S10', 'kamyon', 'Kamyon'],
  ['S09', 'cekici', 'Çekici'],
  ['S14', 'otobus', 'Otobüs'],
  ['S12', 'midibus', 'Midibüs'],
  ['S13', 'minibus', 'Minibüs'],
  ['S31', 'traktor', 'Traktör'],
].map(([k, alan, ad]) => ({ kod: `TP.UR.${k}`, formul: 0, alan, ad }));

// Çekici Nisan 2005 ve Mayıs 2021'de yayımlanmadı: o aylar null kalır (aylikFormullu boşlukta bölümü düşürürdü). Binek
// otomobili dolu her ay alınır.
export async function otomotivAl(simdi, anahtar) {
  const ham = await evdsCek(OTOMOTIV_SERILERI.map((t) => t.kod), OTOMOTIV_SERILERI.map(() => 0), new Date(Date.UTC(2005, 0, 1)), simdi, anahtar);
  const satirlar = ham
    .filter((h) => h.ay && h[alanAdi('TP.UR.S08', 0)] != null)
    .map((h) => ({ yil: h.yil, ay: h.ay, ...Object.fromEntries(OTOMOTIV_SERILERI.map((t) => [t.alan, h[alanAdi(t.kod, 0)] ?? null])) }));
  for (let i = 1; i < satirlar.length; i++) {
    if (satirlar[i].yil * 12 + satirlar[i].ay !== satirlar[i - 1].yil * 12 + satirlar[i - 1].ay + 1) throw new Error('Otomotiv üretimi serisinde boşluk');
  }
  if (satirlar.length < 200) throw new Error('Otomotiv üretimi yetersiz');
  return {
    kaynak: { ad: 'Otomotiv Sanayii Derneği verisi, motorlu taşıt üretimi (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'adet',
    seriler: tanimlar(OTOMOTIV_SERILERI),
    satirlar,
  };
}

// Dış ticaret endeksleri (TÜİK): birim değer (fiyat) ve miktar; dış ticaret haddi sayfada birim değerlerin oranıdır.
export const DIS_TICARET_ENDEKS_SERILERI = [
  { kod: 'TP.DT.IH.FIY.D01.2010', formul: 0, alan: 'ihrBirim', ad: 'İhracat birim değer endeksi' },
  { kod: 'TP.DT.IT.FIY.D01.2010', formul: 0, alan: 'ithBirim', ad: 'İthalat birim değer endeksi' },
  { kod: 'TP.DT.IH.MIK.D01.2010', formul: 0, alan: 'ihrMiktar', ad: 'İhracat miktar endeksi' },
  { kod: 'TP.DT.IT.MIK.D01.2010', formul: 0, alan: 'ithMiktar', ad: 'İthalat miktar endeksi' },
];

// ISIC Rev.4 ihracat sektörleri EVDS seri listesinden: toplam (TT), ana bölümler (tek harf) ve imalatın iki haneli alt
// sektörleri (10–33); yayımlanmayan (başlangıcı boş) seriler atlanır. Adlardaki "3.1." gibi numaralar kaldırılır.
async function ihracatSektorleri(anahtar) {
  const yanit = await fetch(`${EVDS}/serieList/type=json&code=bie_ihrisicrev4`, { headers: { key: anahtar } });
  if (!yanit.ok) throw new Error(`EVDS seri listesi ${yanit.status}`);
  return (await yanit.json())
    .filter((s) => s.START_DATE && /^TP\.IHRISICREV4\.(TT|[A-Z]|1\d|2\d|3[0-3])$/.test(s.SERIE_CODE))
    .map((s) => {
      const kod = s.SERIE_CODE.split('.').at(-1);
      return { kod: s.SERIE_CODE, tur: kod === 'TT' ? 'toplam' : /^[A-Z]$/.test(kod) ? 'bolum' : 'imalat', ad: String(s.SERIE_NAME).replace(/^[\d.]+\s*/, '').trim() };
    });
}

// Sektör tablosu: son 24 ay istenir, son 12 ay ve önceki 12 ay toplamı (bin $) sayfaya gider; 24 ayı tam olmayan sektör
// atlanır.
export async function disTicaretAyrintiAl(simdi, anahtar) {
  const endeksler = await aylikFormullu(DIS_TICARET_ENDEKS_SERILERI, new Date(Date.UTC(2013, 0, 1)), simdi, anahtar, 'Dış ticaret endeksleri', 120);
  const sektorler = await ihracatSektorleri(anahtar);
  if (sektorler.length < 25) throw new Error('İhracat sektör listesi eksik');
  const bas = new Date(Date.UTC(simdi.getUTCFullYear() - 3, simdi.getUTCMonth(), 1));
  const ham = [];
  for (let i = 0; i < sektorler.length; i += KONUT_IL_PARCA) {
    const parca = sektorler.slice(i, i + KONUT_IL_PARCA);
    ham.push(...(await evdsCek(parca.map((p) => p.kod), parca.map(() => 0), bas, simdi, anahtar)));
  }
  const toplamAlan = alanAdi('TP.IHRISICREV4.TT', 0);
  const aylar = [...new Map(ham.filter((h) => h.ay && h[toplamAlan] != null).map((h) => [h.yil * 12 + h.ay, h])).keys()].sort((a, b) => a - b);
  if (aylar.length < 24) throw new Error('İhracat sektör serisi yetersiz');
  const son24 = aylar.slice(-24);
  const deger = (kod, k) => {
    const alan = alanAdi(kod, 0);
    return ham.find((h) => h.yil * 12 + h.ay === k && h[alan] != null)?.[alan] ?? null;
  };
  const tablo = sektorler
    .map((s) => {
      const d = son24.map((k) => deger(s.kod, k));
      return d.every((x) => x != null)
        ? { ad: s.ad, tur: s.tur, son12: d.slice(12).reduce((a, x) => a + x, 0), once12: d.slice(0, 12).reduce((a, x) => a + x, 0) }
        : null;
    })
    .filter(Boolean);
  const ay = (k) => ({ yil: Math.floor((k - 1) / 12), ay: k - Math.floor((k - 1) / 12) * 12 });
  return {
    kaynak: { ad: 'TÜİK verisi, dış ticaret birim değer ve miktar endeksleri; ISIC Rev.4’e göre ihracat (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(DIS_TICARET_ENDEKS_SERILERI),
    endeksler,
    sektorTablosu: { bas: ay(son24[12]), bit: ay(son24.at(-1)), birim: 'bin ABD doları', sektorler: tablo },
  };
}

// Dış borç çevirme oranı (%): 100'ün üstü, kullanılan yeni dış borcun geri ödenenden fazla olduğunu gösterir.
export const BORC_CEVIRME_SERILERI = [
  { kod: 'TP.ODEROLL.K1', formul: 0, alan: 'banka', ad: 'Bankalar, kısa ve uzun vade (tahvil hariç)' },
  { kod: 'TP.ODEROLL.K2', formul: 0, alan: 'diger', ad: 'Diğer sektörler, kısa ve uzun vade (tahvil hariç)' },
  { kod: 'TP.ODEROLL.K3', formul: 0, alan: 'bankaTahvil', ad: 'Bankalar, kısa ve uzun vade (tahvil dahil)' },
  { kod: 'TP.ODEROLL.K4', formul: 0, alan: 'digerTahvil', ad: 'Diğer sektörler, kısa ve uzun vade (tahvil dahil)' },
];

export async function borcCevirmeAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'TCMB, ödemeler dengesi istatistikleri, dış borç çevirme oranları (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(BORC_CEVIRME_SERILERI),
    satirlar: await aylikFormullu(BORC_CEVIRME_SERILERI, new Date(Date.UTC(2006, 5, 1)), simdi, anahtar, 'Dış borç çevirme oranı', 200),
  };
}

// Merkezi yönetim bütçesi (HMB, bin TL, aylık akım): vergiler ve giderler. Genel bütçe serilerinden (butce) kapsamı
// biraz geniştir; faiz gideri iki seride ayrı ayrı yayımlanır.
export const BUTCE_AYRINTI_SERILERI = [
  ['GEL003', 'vergi', 'Vergi gelirleri'],
  ['GEL005', 'gelirVergisi', 'Gelir vergisi'],
  ['GEL010', 'kurumlar', 'Kurumlar vergisi'],
  ['GEL018', 'kdvDahil', 'Dahilde alınan KDV'],
  ['GEL033', 'kdvIthal', 'İthalde alınan KDV'],
  ['GEL021', 'otv', 'Özel tüketim vergisi'],
  ['GEL028', 'bsmv', 'Banka ve sigorta muameleleri vergisi'],
  ['GEL035', 'damga', 'Damga vergisi'],
  ['GEL036', 'harc', 'Harçlar'],
  ['GID001', 'gider', 'Merkezi yönetim bütçe giderleri'],
  ['GID003', 'personel', 'Personel giderleri'],
  ['GID008', 'sgk', 'Sosyal güvenlik kurumlarına devlet primi'],
  ['GID014', 'malHizmet', 'Mal ve hizmet alım giderleri'],
  ['GID026', 'cariTransfer', 'Cari transferler'],
  ['GID110', 'sermaye', 'Sermaye giderleri'],
  ['GID152', 'faiz', 'Faiz giderleri'],
].map(([k, alan, ad]) => ({ kod: `TP.KB.${k}`, formul: 0, alan, ad }));

export async function butceAyrintiAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'Hazine ve Maliye Bakanlığı, merkezi yönetim bütçe gelirleri ve giderleri (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'bin TL',
    seriler: tanimlar(BUTCE_AYRINTI_SERILERI),
    satirlar: await aylikFormullu(BUTCE_AYRINTI_SERILERI, new Date(Date.UTC(2014, 0, 1)), simdi, anahtar, 'Bütçe ayrıntısı', 120),
  };
}

// BIS (EVDS'den): üç grup, ülke adı seri adından. Kredi/GSYH grubunda yalnız "…1" (güncel oran) serileri alınır.
const BIS_GRUPLARI = [
  { kod: 'bie_biskredigsyih', alan: 'kredi', ulke: (ad) => ad.split(' _ ')[0], uygun: (k) => /1$/.test(k) },
  { kod: 'bie_bisborcoran', alan: 'dsr', ulke: (ad) => ad.replace(/\s*\(.*$/, ''), uygun: () => true },
  { kod: 'bie_bistopvgdp', alan: 'mb', ulke: (ad) => ad.replace(/\s*\(.*$/, ''), uygun: () => true },
];
export const BIS_TURKIYE_SERILERI = [
  { kod: 'TP.BISKREDIGSYIH.QTR1', formul: 0, alan: 'kredi', ad: 'Finans dışı özel sektöre kredi / GSYH (%)' },
  { kod: 'TP.BISKREDIGSYIH.QTR3', formul: 0, alan: 'krediAcigi', ad: 'Kredi/GSYH açığı, BIS (yüzde puanı)' },
  { kod: 'TP.BISBORCORAN.QTR', formul: 0, alan: 'dsr', ad: 'Borç servis oranı, finans dışı özel sektör (%)' },
  { kod: 'TP.BISTOPVGDP.TUR', formul: 0, alan: 'mb', ad: 'Merkez bankası toplam varlıkları / GSYH (%)' },
];

// Ülke tablosu: son üç yılın çeyrekleri istenir, her serinin dolu son değeri ve çeyreği alınır; en az iki göstergesi olan
// ülke tabloya girer.
export async function bisAl(simdi, anahtar) {
  const bas = new Date(Date.UTC(simdi.getUTCFullYear() - 3, 0, 1));
  const ulkeler = new Map();
  for (const g of BIS_GRUPLARI) {
    const yanit = await fetch(`${EVDS}/serieList/type=json&code=${g.kod}`, { headers: { key: anahtar } });
    if (!yanit.ok) throw new Error(`EVDS seri listesi ${yanit.status}`);
    const seriler = (await yanit.json()).filter((s) => s.START_DATE && g.uygun(s.SERIE_CODE)).map((s) => ({ kod: s.SERIE_CODE, ulke: g.ulke(String(s.SERIE_NAME)).trim() }));
    for (let i = 0; i < seriler.length; i += KONUT_IL_PARCA) {
      const parca = seriler.slice(i, i + KONUT_IL_PARCA);
      const ham = (await evdsCek(parca.map((p) => p.kod), parca.map(() => 0), bas, simdi, anahtar)).filter((h) => h.ceyrek);
      for (const p of parca) {
        const alan = alanAdi(p.kod, 0);
        const son = ham.filter((h) => h[alan] != null).at(-1);
        if (!son) continue;
        const u = ulkeler.get(p.ulke) ?? { ad: p.ulke };
        u[g.alan] = { deger: son[alan], yil: son.yil, ceyrek: son.ceyrek };
        ulkeler.set(p.ulke, u);
      }
    }
  }
  const tablo = [...ulkeler.values()].filter((u) => ['kredi', 'dsr', 'mb'].filter((a) => u[a]).length >= 2);
  if (tablo.length < 20 || !tablo.some((u) => u.ad === 'Türkiye')) throw new Error('BIS ülke tablosu eksik');
  return {
    kaynak: { ad: 'Uluslararası Ödemeler Bankası (BIS) verisi, kredi/GSYH, borç servis oranı ve merkez bankası varlıkları (TCMB EVDS)', url: EVDS_SAYFA },
    seriler: tanimlar(BIS_TURKIYE_SERILERI),
    ceyrekler: await ceyrekFormullu(BIS_TURKIYE_SERILERI, new Date(Date.UTC(2000, 0, 1)), simdi, anahtar, 'BIS Türkiye', 60),
    ulkeler: tablo,
  };
}

export async function butceAl(simdi, anahtar) {
  return {
    kaynak: { ad: 'Hazine ve Maliye Bakanlığı verisi, genel bütçe (TCMB EVDS)', url: EVDS_SAYFA },
    birim: 'bin TL',
    seriler: tanimlar(BUTCE_SERILERI),
    satirlar: await aylikSeriler(BUTCE_SERILERI, new Date(Date.UTC(2006, 0, 1)), simdi, anahtar, 'Bütçe', 120),
  };
}

export async function krediAl(simdi, anahtar) {
  const tanim = [
    ...KREDI_SERILERI.map((t) => ({ ...t, formul: 0 })),
    { kod: 'TP.KREHACBS.A1', formul: 3, alan: 'toplamYillik', ad: 'Toplam yurt içi kredi, yıllık değişim' },
  ];
  return {
    kaynak: { ad: 'TCMB, para ve banka istatistikleri, bankacılık sektörü kredi hacmi (EVDS)', url: EVDS_SAYFA },
    birim: 'bin TL',
    seriler: tanimlar(tanim),
    satirlar: await aylikFormullu(tanim, new Date(Date.UTC(2008, 9, 1)), simdi, anahtar, 'Kredi hacmi', 120),
  };
}
