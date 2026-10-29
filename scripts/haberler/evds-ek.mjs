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
