// Emsal ülkeler tablosu: saf hesap mantığı (ağ yok). OECD SDMX CSV satırlarından her ülke için her göstergenin en yeni
// gözlemini seçer; 12 aydan eski gözlemi dışarıda bırakır. Çekme işini scripts/veri/emsal-ulkeler.mjs yapar.
import { csvAyristir, reelFaiz } from './dunya-faizleri.mjs';

export { csvAyristir };

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// 'YYYY-MM' ya da 'YYYY-Qn' dönemini, dönemin son ayının sıra numarasına çevirir (yıl × 12 + ay − 1).
export function donemAySirasi(p) {
  const y = Number(p.slice(0, 4));
  if (p[5] === 'Q') return y * 12 + Number(p[6]) * 3 - 1;
  return y * 12 + Number(p.slice(5, 7)) - 1;
}

// Dönem etiketi: '2026-08' -> 'Ağu 2026', '2026-Q2' -> '2. çeyrek 2026'; 'YYYY-MM-DD' günü de aya indirir.
export function donemEtiket(p) {
  if (!p) return '';
  if (p[5] === 'Q') return `${p[6]}. çeyrek ${p.slice(0, 4)}`;
  return `${AY_KISA[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
}

// Gözlem 12 aydan eskiyse (dönemin son ayı, bugünün ayından 12 ay ve daha fazla geride) eski sayılır.
export function eskiMi(p, bugun, ay = 12) {
  const bugunSirasi = Number(bugun.slice(0, 4)) * 12 + Number(bugun.slice(5, 7)) - 1;
  return donemAySirasi(p) < bugunSirasi - ay;
}

// Sıralama anahtarı: önce dönemin sonu, eşitlikte aylık gözlem çeyreklik gözlemden önce gelir.
const siraAnahtari = (p) => donemAySirasi(p) * 2 + (p[5] === 'Q' ? 0 : 1);

// Bir ülkenin (kod adaylarıyla) satırları arasından, `olcut` ile eşleşen en yeni gözlem.
// olcut(satir) -> öncelik sayısı (küçük önce) ya da null (alınmaz). Eski gözlem (bugun'e göre) atlanır.
export function enYeni(satirlar, kodlar, olcut, bugun) {
  let en = null;
  for (const r of satirlar) {
    if (!kodlar.includes(r.REF_AREA) || r.OBS_VALUE === '' || r.OBS_VALUE === 'NaN') continue;
    const deger = Number(r.OBS_VALUE);
    if (!Number.isFinite(deger)) continue;
    const oncelik = olcut(r);
    if (oncelik == null) continue;
    if (bugun && eskiMi(r.TIME_PERIOD, bugun)) continue;
    const a = siraAnahtari(r.TIME_PERIOD);
    if (!en || a > en.a || (a === en.a && oncelik < en.oncelik)) en = { a, oncelik, donem: r.TIME_PERIOD, deger };
  }
  return en ? { donem: en.donem, deger: Math.round(en.deger * 100) / 100 } : null;
}

// Başlıkta gösterilecek dönem: en çok ülkenin son dönemi (eşitlikte en yeni).
export function baslikDonemi(donemler) {
  const sayac = new Map();
  for (const d of donemler) if (d) sayac.set(d, (sayac.get(d) ?? 0) + 1);
  let en = null;
  for (const [d, n] of sayac) if (!en || n > en.n || (n === en.n && siraAnahtari(d) > siraAnahtari(en.d))) en = { d, n };
  return en?.d ?? null;
}

// Gösterge ölçütleri (OECD SDMX sütunlarına göre).
export const OLCUTLER = {
  // KEI: GSYH büyümesi, çeyreklik ve yıllık, mevsim ve takvim etkisinden arındırılmış; yüzde değişim
  gsyhCeyrek: (r) => (r.MEASURE === 'B1GQ_Q' && r.FREQ === 'Q' && r.UNIT_MEASURE === 'GR' && r.TRANSFORMATION === 'G1' ? (r.ADJUSTMENT === 'Y' ? 0 : 1) : null),
  gsyhYillik: (r) => (r.MEASURE === 'B1GQ_Q' && r.FREQ === 'Q' && r.UNIT_MEASURE === 'GR' && r.TRANSFORMATION === 'GY' ? (r.ADJUSTMENT === 'Y' ? 0 : 1) : null),
  // KEI: işsizlik oranı, işgücüne yüzde; aylık varsa aylık, yoksa çeyreklik
  issizlik: (r) => (r.MEASURE === 'UNEMP' && r.UNIT_MEASURE === 'PT_LF' ? (r.ADJUSTMENT === 'Y' ? 0 : 1) : null),
  // KEI: uzun vadeli (10 yıllık) devlet tahvili getirisi, yıllık yüzde
  tahvil: (r) => (r.MEASURE === 'IRLT' && r.UNIT_MEASURE === 'PA' && r.FREQ === 'M' ? 0 : null),
  // Fiyatlar: tüm kalemler, yıllık değişim. Ulusal TÜFE (N) yoksa uyumlaştırılmış TÜFE (HICP).
  tufe: (r) => (r.MEASURE === 'CPI' && r.EXPENDITURE === '_T' && r.TRANSFORMATION === 'GY' && r.FREQ === 'M' ? (r.METHODOLOGY === 'N' ? 0 : 1) : null),
  // Fiyatlar: gıda ve enerji hariç (çekirdek), yıllık değişim.
  cekirdek: (r) => (r.MEASURE === 'CPI' && r.EXPENDITURE === '_TXCP01_NRG' && r.TRANSFORMATION === 'GY' && r.FREQ === 'M' ? (r.METHODOLOGY === 'N' ? 0 : 1) : null),
};

// Tek ülkenin satırı. kaynak: { kei: [csv satırları], fiyat: [csv satırları] }, faiz: BIS satırı (dunya-faizleri.faizSatiri).
export function emsalSatiri({ ulke, kei, fiyat, faiz, bugun }) {
  const kodlar = ulke.oecd;
  const bul = (satirlar, anahtar) => enYeni(satirlar, kodlar, OLCUTLER[anahtar], bugun);
  const tufe = bul(fiyat, 'tufe');
  const faizDeger = faiz ? { deger: faiz.faiz, tarih: faiz.tarih, aralik: faiz.aralik ?? null } : null;
  const faizGecerli = faizDeger && !eskiMi(faizDeger.tarih, bugun) ? faizDeger : null;
  return {
    kod: ulke.kod,
    ad: ulke.ad,
    grup: ulke.grup,
    gsyhCeyrek: bul(kei, 'gsyhCeyrek'),
    gsyhYillik: bul(kei, 'gsyhYillik'),
    tufe,
    cekirdek: bul(fiyat, 'cekirdek'),
    issizlik: bul(kei, 'issizlik'),
    faiz: faizGecerli,
    tahvil: bul(kei, 'tahvil'),
    // Reel faiz: BIS politika faizi − aynı satırdaki OECD yıllık TÜFE.
    reel: faizGecerli && tufe ? { deger: reelFaiz(faizGecerli.deger, tufe.deger), tufeDonem: tufe.donem } : null,
  };
}

// Başlık dönemleri: her gösterge için çoğunluğun dönemi. Faiz için BIS gözlem ayı kullanılır.
export function baslikDonemleri(satirlar) {
  const al = (f) => satirlar.map(f);
  return {
    gsyhCeyrek: baslikDonemi(al((s) => s.gsyhCeyrek?.donem)),
    gsyhYillik: baslikDonemi(al((s) => s.gsyhYillik?.donem)),
    tufe: baslikDonemi(al((s) => s.tufe?.donem)),
    cekirdek: baslikDonemi(al((s) => s.cekirdek?.donem)),
    issizlik: baslikDonemi(al((s) => s.issizlik?.donem)),
    faiz: baslikDonemi(al((s) => s.faiz?.tarih?.slice(0, 7))),
    tahvil: baslikDonemi(al((s) => s.tahvil?.donem)),
    reel: baslikDonemi(al((s) => s.reel?.tufeDonem)),
  };
}
