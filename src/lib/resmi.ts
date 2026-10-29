// Veri sayfaları ve hesaplayıcılar için resmi veriler: src/data/resmi.json (scripts/haberler/resmi-veri.mjs yazar).
// Yalnızca TCMB/TÜİK'in yayımladığı değerler gösterilir; bir bölüm hiç alınamadıysa o sayfa "veri yok" der.
import data from '../data/resmi.json';
import { SITE } from './site';

export interface Kur {
  kod: string;
  ad: string;
  birim: number;
  dovizAlis: number;
  dovizSatis: number;
  efektifAlis: number | null;
  efektifSatis: number | null;
}

export interface KurBolumu {
  tarih: string;
  bultenNo: string;
  kaynak: { ad: string; url: string };
  liste: Kur[];
  gecmis: ({ tarih: string } & Record<string, { alis: number; satis: number } | null | string>)[];
  alinma: string;
}

export interface FaizBolumu {
  oran: number;
  gecerlilik: string;
  sonKarar: { tarih: string; oran: number; url: string } | null;
  kaynak: { ad: string; url: string };
  gecmis: { tarih: string; oran: number }[];
  alinma: string;
}

export interface TufeSatiri {
  yil: number;
  ay: number;
  yillik: number;
  aylik: number;
}

export interface EnflasyonBolumu {
  kaynak: { ad: string; url: string };
  satirlar: TufeSatiri[];
  alinma: string;
}

export interface KonutSatiri {
  yil: number;
  ay: number;
  bolgeler: Record<string, { endeks: number; yillik: number }>;
}

// Konut fiyat endeksi (TCMB, EVDS): endeks düzeyi ve TCMB'nin hesapladığı yıllık değişim.
export interface KonutBolumu {
  kaynak: { ad: string; url: string };
  bolgeler: { kod: string; ad: string }[];
  satirlar: KonutSatiri[];
  alinma: string;
}

// İşsizlik oranı (TÜİK, mevsimsellikten arındırılmış; EVDS'den).
export interface IssizlikBolumu {
  kaynak: { ad: string; url: string };
  satirlar: { yil: number; ay: number; oran: number }[];
  alinma: string;
}

// TCMB Net Döviz Pozisyonu (Swaplar ve Hazine Dövizi Hariç)
export interface RezervKalemleri {
  disVarliklarUSD: number;
  dovizYukumlulukleriUSD: number;
  netUluslararasiRezervUSD: number;
  swapStokuUSD: number;
  hazineDoviziUSD: number;
  netPozisyonUSD: number;
}

export interface RezervNoktasi {
  tarih: string;
  deger: number;
}

export interface RezervBolumu {
  tarih: string;
  netDovizPozisyonu: number;
  degisimGunluk: number;
  kalemler: RezervKalemleri;
  gecmis: RezervNoktasi[];
  kaynak: { ad: string; url: string };
  alinma: string;
}

// Piyasa faizleri (TCMB haftalık akım verileri: kredi ve mevduat faizleri)
export interface PiyasaFaizleriSatiri {
  tarih: string;
  ihtiyac: number;
  mevduat: number;
  politika: number;
  tasit: number;
  konut: number;
  tahvil5Y?: number | null;
}

export interface PiyasaFaizleriBolumu {
  kaynak: { ad: string; url: string };
  satirlar: PiyasaFaizleriSatiri[];
  alinma: string;
}

export interface MevduatSatiri {
  tarih: string;
  toplam: number;
  yurtIci: number;
  bireysel: number;
  tuzel: number;
  altin: number;
}

export interface MevduatBolumu {
  kaynak: { ad: string; url: string };
  satirlar: MevduatSatiri[];
  alinma: string;
}

// Enflasyon beklentisi (TCMB Piyasa Katılımcıları Anketi; EVDS): anket ayında verilen 12 ve 24 ay sonrası yıllık TÜFE
// beklentisi (%). Sitenin tahmini değil, anket sonucudur.
export interface BeklentiBolumu {
  kaynak: { ad: string; url: string };
  satirlar: { yil: number; ay: number; ay12: number; ay24: number }[];
  alinma: string;
}

// Ek EVDS bölümleri (scripts/haberler/evds-ek.mjs). Yıllık değişimler EVDS formülüyle gelir.
type Kaynak = { ad: string; url: string };
type SeriAdi = { alan: string; ad: string };

// Yeni Kiracı Kira Endeksi (TCMB, 2023=100) ve aynı bölgenin konut fiyat endeksi yıllık değişimi.
export interface KiraBolumu {
  kaynak: Kaynak;
  bolgeler: { kod: string; ad: string }[];
  satirlar: { yil: number; ay: number; bolgeler: Record<string, { endeks: number; yillik: number; konutYillik: number }> }[];
  bolgeTablosu: { yil: number; ay: number; bolgeler: { kod: string; ad: string; yillik: number }[] };
  alinma: string;
}

// Banka ve kredi kartı harcama tutarı (TCMB, haftalık, bin TL) ve bir önceki yılın aynı haftasına göre değişim.
export interface KartBolumu {
  kaynak: Kaynak;
  birim: string;
  sektorler: { kod: string; ad: string }[];
  satirlar: { tarih: string; sektorler: Record<string, { tutar: number; yillik: number | null }> }[];
  alinma: string;
}

// Aylık, birkaç alanlı seri bölümü (tüketici güveni, reel efektif kur, kapasite kullanımı).
export interface AylikSeriBolumu<A extends string> {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  satirlar: ({ yil: number; ay: number } & Record<A, number>)[];
  alinma: string;
}

// Üç aylık, birkaç alanlı seri bölümü (büyüme).
export interface CeyrekSeriBolumu<A extends string> {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  satirlar: ({ yil: number; ceyrek: number } & Record<A, number>)[];
  alinma: string;
}

// TCMB rezervleri (haftalık, milyon ABD doları).
export interface BrutRezervBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: { tarih: string; toplam: number; altin: number; doviz: number }[];
  alinma: string;
}

// Haftalık dolar ve euro satış kuru (TCMB, haftanın son değeri).
export interface KurHaftalikBolumu {
  kaynak: Kaynak;
  satirlar: { tarih: string; usd: number; eur: number }[];
  alinma: string;
}

// Kredi ve mevduat faizleri (TCMB, haftalık akım, yıllık %), 2018'den.
export interface MakasBolumu {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  satirlar: { tarih: string; ihtiyac: number; tasit: number; konut: number; mevduat: number }[];
  alinma: string;
}

// Değerlemesi yapılan konutların ortanca m² satış fiyatı ve m² kirası (TCMB, üç aylık, TL/m²).
export interface BirimFiyatBolumu {
  kaynak: Kaynak;
  birim: string;
  satirlar: { yil: number; ceyrek: number; iller: Record<string, { fiyat: number; kira: number }> }[];
  ilTablosu: { yil: number; ceyrek: number; iller: { ad: string; fiyat: number; kira: number }[] };
  alinma: string;
}

// Mevsim etkisinden arındırılmış TÜFE'nin aylık yüzde değişimi (TÜİK, EVDS).
export interface TufeArindirilmisBolumu {
  kaynak: Kaynak;
  satirlar: { yil: number; ay: number; aylik: number }[];
  alinma: string;
}

// Haftalık, birkaç alanlı seri bölümü (yabancıların menkul kıymet portföyü).
export interface HaftalikSeriBolumu<A extends string> {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: ({ tarih: string } & Record<A, number>)[];
  alinma: string;
}

// Birimli aylık seri bölümü (ödemeler dengesi, dış ticaret, bütçe, kredi).
export interface BirimliAylikBolumu<A extends string> extends AylikSeriBolumu<A> {
  birim: string;
}

// Kısa vadeli dış borç ve rezerv (aylık) ile brüt/net dış borç stoku (üç aylık), milyon ABD doları.
export interface DisBorcBolumu extends BirimliAylikBolumu<'kalanVade' | 'orijinalVade' | 'rezerv'> {
  ceyrekSeriler: SeriAdi[];
  ceyrekler: { yil: number; ceyrek: number; brut: number; net: number }[];
}

// Konut ve iş yeri satışları (TÜİK, aylık, adet) ve son ayın il tablosu. İl yıllık değişimi ve ipotekli satışı
// yayımlanmamışsa null.
export interface KonutSatisBolumu
  extends BirimliAylikBolumu<'toplam' | 'toplamYillik' | 'arindirilmis' | 'ilkEl' | 'ikinciEl' | 'ipotekli' | 'isyeri'> {
  ilTablosu: {
    yil: number;
    ay: number;
    iller: { ad: string; toplam: number; yillik: number | null; ipotekli: number | null }[];
  };
}

// Üretici fiyatları (TÜİK, aylık): yurt içi ÜFE (düzey, aylık ve yıllık değişim, TÜFE yıllık değişimi, sektörler), hizmet ÜFE,
// tarım ürünleri ÜFE ve tarımsal girdi fiyat endeksi. Diziler farklı aylarda başlar ve biter (tarımsal girdi bir ay
// geç yayımlanır), bu yüzden ayrı tutulur.
export interface UfeBolumu
  extends AylikSeriBolumu<
    'endeks' | 'aylik' | 'yillik' | 'tufeYillik' | 'madencilik' | 'imalat' | 'enerji' | 'su' | 'gida' | 'petrol' | 'metal'
  > {
  hizmetSeriler: SeriAdi[];
  tarimSeriler: SeriAdi[];
  tarimGirdiSeriler: SeriAdi[];
  hizmet: ({ yil: number; ay: number } & Record<'aylik' | 'yillik', number>)[];
  tarim: ({ yil: number; ay: number } & Record<'aylik' | 'yillik', number>)[];
  tarimGirdi: ({ yil: number; ay: number } & Record<'aylik' | 'yillik', number>)[];
}

// İnşaat izinleri (TÜİK, aylık akım): yapı ruhsatı ve iskân için daire, yüzölçümü (m²), yapı sayısı ve on bina türünün
// yüzölçümü. Alan adları belge önekiyle: ruhsatDaire, iskanApartman gibi.
export type InsaatBelge = 'ruhsat' | 'iskan';
export type InsaatTuru = 'Apartman' | 'Mustakil' | 'Toplu' | 'Otel' | 'Ofis' | 'Ticaret' | 'Ulastirma' | 'Sanayi' | 'Kamu' | 'Diger';
export type InsaatIzinBolumu = AylikSeriBolumu<`${InsaatBelge}${'Daire' | 'Alan' | 'Yapi' | InsaatTuru}`>;

// Kesimlerin 12 ay sonrası enflasyon beklentisi (anket ortalaması, %), hanehalkı anketinin yanıt payları (%) ve Piyasa
// Katılımcıları Anketi'nde son ayın olasılık dağılımı (aralık başına ortalama olasılık, %; son aralığın üstü açık).
export type HaneGrubu = 'Gida' | 'Enerji' | 'Lokanta' | 'Kira' | 'Dayanikli' | 'Egitim' | 'Diger';
export interface BeklentiDagilimi {
  gozlem: number;
  kutular: { alt: number; ust: number | null; pay: number }[];
}
export interface KesimBeklentiBolumu extends AylikSeriBolumu<'piyasa' | 'reel' | 'hanehalki'> {
  haneSeriler: SeriAdi[];
  hane: ({ yil: number; ay: number } & Record<'altinda' | 'ayni' | 'uzerinde' | `${'gecmis' | 'gelecek'}${HaneGrubu}`, number>)[];
  dagilim: { yil: number; ay: number; ay12: BeklentiDagilimi; ay24: BeklentiDagilimi };
}

// Para piyasası (TCMB): faizler %, fonlama tutarları milyon TL. Satırlar haftalık ortalama (cuma tarihli), son ayrıca son
// iş günü. Bir haftalık repo kotasyonu Eylül 2018'den önce null.
export interface ParaPiyasasiSatiri {
  tarih: string;
  borcVerme: number;
  borcAlma: number;
  repo: number | null;
  bankalararasi: number;
  aofm: number;
  fonlama: number;
  sterilizasyon: number;
  net: number;
}
export interface ParaPiyasasiBolumu {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  satirlar: ParaPiyasasiSatiri[];
  son: ParaPiyasasiSatiri;
  alinma: string;
}

// TCMB analitik bilançosu (bin TL): satırlar haftanın son iş günü, son ayrıca son iş günü.
export type TcmbBilancoSatiri = { tarih: string } & Record<'aktif' | 'disVarlik' | 'icVarlik' | 'hazine' | 'bankaKredi' | 'degerleme' | 'dovizYuk' | 'mbParasi' | 'rezervPara' | 'emisyon' | 'zorunlu' | 'serbest' | 'api' | 'kamuMevduat', number>;
export interface TcmbBilancoBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: TcmbBilancoSatiri[];
  son: TcmbBilancoSatiri;
  alinma: string;
}

// Faiz ayrıntısı (TCMB akım faizleri, %, haftalık) ve finansman şirketlerinin stok faizi (%, aylık).
export interface FaizAyrintiBolumu {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  finansmanSeriler: SeriAdi[];
  satirlar: ({ tarih: string } & Record<'tl1a' | 'tl3a' | 'tl6a' | 'tl1y' | 'tlUzun' | 'tlToplam' | 'tlTasarruf' | 'tlTicari' | 'usd' | 'eur' | 'tuketici' | 'tuketiciKmh' | 'ihtiyacKmh' | 'ticari' | 'ticariKmhHaric' | 'ticariUsd' | 'ticariEur', number>)[];
  finansman: ({ yil: number; ay: number } & Record<'ticari' | 'tuketici', number>)[];
  alinma: string;
}

// Bankaların döviz işlem hacmi (milyon ABD doları): satırlar haftalık günlük ortalama, son ayrıca son iş günü.
export type DovizHacmiSatiri = { tarih: string } & Record<'spot' | 'swap' | 'vadeli' | 'yurtDisiSwap' | 'musteriSpot' | 'efektif', number>;
export interface DovizHacmiBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: DovizHacmiSatiri[];
  son: DovizHacmiSatiri;
  alinma: string;
}

// Elektrik (TEİAŞ, MWh): satırlar haftalık günlük ortalama, gunluk son 400 gün; yenilenebilir/yenilenemez Şubat 2026'dan.
export interface ElektrikBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: ({ tarih: string } & Record<'tuketim' | 'uretim' | 'ithalat' | 'ihracat', number>)[];
  gunluk: ({ tarih: string; yenilenebilir: number | null; yenilenemez: number | null } & Record<'tuketim' | 'uretim' | 'ithalat' | 'ihracat', number>)[];
  alinma: string;
}

// Ödeme sistemleri (TCMB): aylık adet ve TL tutar; FAST Aralık 2020'den, öncesi null. fastAmac son tam ayın amaç dağılımı.
export interface OdemeBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: ({ yil: number; ay: number; fastAdet: number | null; fastTutar: number | null } & Record<'eftAdet' | 'eftTutar' | 'buyukAdet' | 'buyukTutar', number>)[];
  fastAmac: { yil: number; ay: number; amaclar: { ad: string; adet: number; tutar: number }[] };
  alinma: string;
}

// Turizm: yabancı ziyaretçi (kişi, aylık, 2009'dan) ve turizm geliri/gideri (bin ABD doları, aylık, null olabilir).
export interface TurizmBolumu extends AylikSeriBolumu<'toplam' | 'toplamYillik' | 'avrupa' | 'asya' | 'amerika' | 'afrika' | 'okyanusya' | 'almanya' | 'rusya' | 'ingiltere' | 'iran'> {
  gelirSeriler: SeriAdi[];
  gelir: { yil: number; ay: number; gelir: number | null; gider: number | null }[];
  ulkeTablosu: { yil: number; ay: number; ulkeler: { ad: string; sayi: number; yillik: number | null }[] };
}

// Uluslararası yatırım pozisyonu (TCMB, çeyrek sonu, milyon $).
export interface UypBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  ceyrekler: ({ yil: number; ceyrek: number } & Record<'net' | 'varlik' | 'yukumluluk' | 'vDogrudan' | 'vPortfoy' | 'vTurev' | 'vDiger' | 'rezerv' | 'yDogrudan' | 'yPortfoy' | 'yHisse' | 'yBorcSenedi' | 'yTurev' | 'yDiger', number>)[];
  alinma: string;
}

// Reel kesim güveni (mevsimsellikten arındırılmış, 2007'den) ve finansal hizmetler güveni (2012'den), endeks.
export interface ReelGuvenBolumu extends AylikSeriBolumu<'endeks' | 'ham' | 'siparis' | 'stok' | 'uretim' | 'istihdam' | 'siparisSon3' | 'ihracat' | 'yatirim' | 'gidisat'> {
  finansSeriler: SeriAdi[];
  finans: ({ yil: number; ay: number } & Record<'endeks' | 'isDurumu' | 'talepSon3' | 'talepGelecek3', number>)[];
}

// Ticari gayrimenkul (üç aylık endeks ve yıllık %) ile yeni ve yeni olmayan konut fiyat endeksleri (aylık).
export interface TicariGayrimenkulBolumu {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  konutSeriler: SeriAdi[];
  ceyrekler: ({ yil: number; ceyrek: number } & Record<`${'tg' | 'dukkan' | 'ofis'}${'' | 'Yillik' | 'Ist' | 'Ank' | 'Izm'}`, number>)[];
  konut: ({ yil: number; ay: number } & Record<'yeni' | 'yeniYillik' | 'eski' | 'eskiYillik', number>)[];
  alinma: string;
}

// Banka Kredileri Eğilim Anketi (üç aylık, net yüzde; artı gevşeme ya da artış).
export interface KrediEgilimBolumu {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  ceyrekler: ({ yil: number; ceyrek: number } & Record<'isStandart' | 'kobiStandart' | 'buyukStandart' | 'isTalep' | 'isStandartBeklenti' | 'isTalepBeklenti' | 'konutStandart' | 'tasitStandart' | 'digerStandart' | 'konutTalep' | 'tasitTalep' | 'digerTalep', number>)[];
  alinma: string;
}

// Otomotiv üretimi (OSD, adet, aylık); çekici iki ayda null.
export interface OtomotivBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: ({ yil: number; ay: number } & Record<'binek' | 'kamyonet' | 'kamyon' | 'cekici' | 'otobus' | 'midibus' | 'minibus' | 'traktor', number | null>)[];
  alinma: string;
}

// Dış ticaret endeksleri (TÜİK, aylık) ve ISIC Rev.4'e göre ihracatta son 12 ay / önceki 12 ay (bin $).
export interface DisTicaretAyrintiBolumu {
  kaynak: Kaynak;
  seriler: SeriAdi[];
  endeksler: ({ yil: number; ay: number } & Record<'ihrBirim' | 'ithBirim' | 'ihrMiktar' | 'ithMiktar', number>)[];
  sektorTablosu: { bas: { yil: number; ay: number }; bit: { yil: number; ay: number }; birim: string; sektorler: { ad: string; tur: 'toplam' | 'bolum' | 'imalat'; son12: number; once12: number }[] };
  alinma: string;
}

// Para arzı (TCMB, haftalık cuma stoku, bin TL); yıllık değişim %.
export interface ParaArziBolumu {
  kaynak: Kaynak;
  birim: string;
  seriler: SeriAdi[];
  satirlar: ({ tarih: string } & Record<'m1' | 'm2' | 'm3' | 'm1Yillik' | 'm2Yillik' | 'm3Yillik' | 'dolasim' | 'vadesizTl' | 'vadesizYp' | 'vadeliTl' | 'vadeliYp' | 'repo' | 'ppf' | 'menkul', number>)[];
  alinma: string;
}

export const RESMI = data as unknown as {
  kur?: KurBolumu;
  faiz?: FaizBolumu;
  enflasyon?: EnflasyonBolumu;
  konut?: KonutBolumu;
  issizlik?: IssizlikBolumu;
  rezerv?: RezervBolumu;
  piyasaFaizleri?: PiyasaFaizleriBolumu;
  mevduat?: MevduatBolumu;
  beklenti?: BeklentiBolumu;
  kira?: KiraBolumu;
  kart?: KartBolumu;
  guven?: AylikSeriBolumu<'endeks' | 'haneGecmis' | 'haneBeklenti' | 'ekonomiBeklenti'>;
  rek?: AylikSeriBolumu<'genel' | 'gelismekte' | 'gelismis'>;
  brutRezerv?: BrutRezervBolumu;
  kapasite?: AylikSeriBolumu<'arindirilmis' | 'ham' | 'tuketim' | 'ara' | 'yatirim'>;
  kurHaftalik?: KurHaftalikBolumu;
  makas?: MakasBolumu;
  birimFiyat?: BirimFiyatBolumu;
  tufeArindirilmis?: TufeArindirilmisBolumu;
  portfoyHaftalik?: HaftalikSeriBolumu<'hisse' | 'dibs' | 'ost' | 'toplam' | 'hisseStok' | 'dibsStok'>;
  portfoyAylik?: BirimliAylikBolumu<'hisse' | 'dibs'>;
  cari?: BirimliAylikBolumu<'cari' | 'altinHaric' | 'enerjiHaric' | 'cekirdek' | 'altin' | 'enerji' | 'seyahat'>;
  disBorc?: DisBorcBolumu;
  disTicaret?: BirimliAylikBolumu<'ihracat' | 'ithalat' | 'yatirim' | 'ara' | 'tuketim'>;
  sanayi?: AylikSeriBolumu<'endeks' | 'aylik' | 'yillik' | 'imalat'>;
  butce?: BirimliAylikBolumu<'gelir' | 'harcama' | 'faiz' | 'faizDisi' | 'denge'>;
  kredi?: BirimliAylikBolumu<
    | 'toplam'
    | 'haneMevduat'
    | 'haneKalkinma'
    | 'haneKatilim'
    | 'sirketMevduat'
    | 'sirketKalkinma'
    | 'sirketKatilim'
    | 'toplamYillik'
  >;
  buyume?: CeyrekSeriBolumu<
    | 'yillik'
    | 'ceyreklik'
    | 'endeks'
    | 'hanehalki'
    | 'devlet'
    | 'yatirim'
    | 'ihracat'
    | 'ithalat'
    | 'tarim'
    | 'sanayi'
    | 'insaat'
    | 'hizmetler'
    | 'bilgi'
    | 'finans'
    | 'gayrimenkul'
    | 'mesleki'
    | 'kamu'
    | 'diger'
  >;
  konutSatis?: KonutSatisBolumu;
  ufe?: UfeBolumu;
  insaatIzin?: InsaatIzinBolumu;
  kesimBeklenti?: KesimBeklentiBolumu;
  paraPiyasasi?: ParaPiyasasiBolumu;
  paraArzi?: ParaArziBolumu;
  kkm?: AylikSeriBolumu<'dd' | 'ddGercek' | 'ddTuzel' | 'tl'>;
  tcmbBilanco?: TcmbBilancoBolumu;
  faizAyrinti?: FaizAyrintiBolumu;
  dovizHacmi?: DovizHacmiBolumu;
  elektrik?: ElektrikBolumu;
  odeme?: OdemeBolumu;
  turizm?: TurizmBolumu;
  uyp?: UypBolumu;
  reelGuven?: ReelGuvenBolumu;
  ticariGayrimenkul?: TicariGayrimenkulBolumu;
  krediEgilim?: KrediEgilimBolumu;
  otomotiv?: OtomotivBolumu;
  disTicaretAyrinti?: DisTicaretAyrintiBolumu;
  banknot?: AylikSeriBolumu<`${'k200' | 'k100' | 'k50' | 'k20' | 'k10' | 'k5' | 'diger' | 'toplam'}${'Adet' | 'Tutar'}`>;
  cek?: AylikSeriBolumu<'ibrazAdet' | 'ibrazTutar' | 'karsiliksizAdet' | 'karsiliksizTutar'>;
};

// Haftalık veri için ZamanGrafik zaman anahtarı: 1970'ten beri gün (UTC).
export const gunAnahtari = (tarih: string) => Date.UTC(Number(tarih.slice(0, 4)), Number(tarih.slice(5, 7)) - 1, Number(tarih.slice(8, 10))) / 86400000;

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export const ayAdi = (s: { yil: number; ay: number }) => `${AYLAR[s.ay - 1]} ${s.yil}`;

// 'YYYY-MM-DD' -> '15 Ekim 2026' (takvim günü; saat dilimi kaydırması olmasın diye öğlen alınır).
export function gunYaz(g: string) {
  return new Date(`${g}T12:00:00Z`).toLocaleDateString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
}

export function zamanYaz(iso: string) {
  return new Date(iso).toLocaleString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  });
}

export const sayiYaz = (n: number, ondalik = 4) =>
  n.toLocaleString(SITE.locale, { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik });

// Yüzde, eksi işareti yüzde işaretinin önünde (−%9,9, %12,5).
export const yuzdeYaz = (n: number, ondalik = 1) => `${n < 0 ? '−' : ''}%${sayiYaz(Math.abs(n), ondalik)}`;

// Faiz oranı ve puan farkı: gereksiz sıfır yazılmaz (%37, %39,5, %47,25).
export const oranYaz = (n: number) => n.toLocaleString(SITE.locale, { maximumFractionDigits: 2 });

// Kur sayfaları: adres -> TCMB kodu. Geçmiş tablosu yalnızca bu kurlar için tutulur (resmi-veri.mjs GECMIS_KURLAR).
export const KUR_SAYFALARI = [
  { slug: 'dolar-kuru', kod: 'USD', ad: 'Dolar', tamAd: 'ABD doları', ilgi: 'Doların' },
  { slug: 'euro-kuru', kod: 'EUR', ad: 'Euro', tamAd: 'Euro', ilgi: 'Euronun' },
  { slug: 'sterlin-kuru', kod: 'GBP', ad: 'Sterlin', tamAd: 'İngiliz sterlini', ilgi: 'Sterlinin' },
] as const;

// Veri, tarihinden bu kadar gün sonra "eski olabilir" notu alır (kaynağa ulaşılamıyorsa okur bilsin).
export function eskiMi(tarih: string, gun: number, simdi = new Date()) {
  return simdi.getTime() - new Date(`${tarih}T12:00:00Z`).getTime() > gun * 86400000;
}

// TÜFE aylık değişimlerini zincirler: bas ayının fiyatlarıyla 1 TL, bit ayının fiyatlarıyla kaç TL eder?
// Anahtar = yıl × 12 + (ay − 1). Aylık oranlar iki ondalıkla yayımlandığı için TÜİK endeksinden küçük yuvarlama farkı olabilir.
// public/hesapla.js aynı hesabı tarayıcıda yapar.
export const ayAnahtari = (s: { yil: number; ay: number }) => s.yil * 12 + s.ay - 1;
export function tufeCarpani(satirlar: TufeSatiri[], bas: number, bit: number) {
  return satirlar.reduce((c, s) => {
    const k = ayAnahtari(s);
    return k > bas && k <= bit ? c * (1 + s.aylik / 100) : c;
  }, 1);
}

// Milyon USD değerini Milyar USD ($266,1 Mr) olarak yazar
export const milyarUsd = (milyon: number, ondalik = 1) =>
  `$${(milyon / 1000).toLocaleString(SITE.locale, { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik })} Mr`;

// Değişim farkını (+$850 Mn veya -$1,2 Mr) yazar
export const farkUsd = (farkMilyon: number) => {
  const isaret = farkMilyon > 0 ? '+' : '';
  if (Math.abs(farkMilyon) >= 1000) {
    return `${isaret}${(farkMilyon / 1000).toLocaleString(SITE.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mr`;
  }
  return `${isaret}${Math.round(farkMilyon).toLocaleString(SITE.locale)} Mn`;
};