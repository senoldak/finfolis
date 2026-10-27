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
