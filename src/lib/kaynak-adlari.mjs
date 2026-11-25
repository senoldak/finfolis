// Haberin kaynakları adıyla ve bağlantısıyla (hukuki değerlendirme 2 Kasım 2026; koşullar mecmua
// docs/kaynak-adi-hukuki-degerlendirme-2026-11-02.md). Adlar repoya açık yazılmaz: derlemede haberin şifreli kaynak
// izinden (kaynakIzi) ve şifreli kaynak listesinden çözülür (scripts/haberler/gizli.mjs; anahtar KAYNAK_ANAHTARI, yalnız
// yayın derlemesinde). Anahtar yoksa liste boştur ve sayfa eski adsız kaynak satırını gösterir.
//
// Koşullar kodda:
//  - Yalnız gerçekten kaynak olan haber: birden çok kaynaklı haberde her kaynak, adresindeki sözcüklerden biri haberin
//    başlığındaki ya da özetindeki bir sözcükle eşleşirse gösterilir. Tek kaynaklı haberde kaynak, haberin yazıldığı
//    tek yayındır. Bülten (karma kaynaklı) adsız satırı korur.
//  - Adresler çoğu zaman İngilizce, başlık Türkçe (26 Kasım 2026 incelemesi: 101 haberde gerçek kaynak bu yüzden
//    düşüyordu). Başlık/özet tutmazsa adresin sözcükleri haber gövdesindeki özel adlarla (büyük harfle yazılan
//    sözcükler) karşılaştırılır: en az iki ortak ad ya da sitede nadir geçen (haberlerin en çok %1'inde) bir ortak ad
//    gerekir. "Fed", "Trump" gibi sık adlar tek başına yetmez.
//  - Sakıncalı yayın ya da kaldırma isteği: şifreli listede yayına `goster: false` konur; adı da bağlantısı da çıkmaz.
//    KHK taraması 2 Kasım 2026'da yapıldı (Wikipedia'daki 2016'da kapatılan yayınlar listesiyle), eşleşme yoktu.
//  - Görünen ad: listede `gorunen`, yoksa beslemenin adı bölüm eki ("… Business", "… Markets") atılarak.
// Bu modül hiçbir şey loglamaz (Actions logları herkese açık).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { coz, gizliKaynaklar } from '../../scripts/haberler/gizli.mjs';

const kat = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
// Adreslerde ve başlıkta sık geçen, konu ayırt etmeyen sözcükler.
const BOS = new Set(
  ('the and for with from that this into over after amid says said will its are was has have not new news article articles ' +
    'business markets market economy world live update updates story stories html www com icin olarak ile bir yeni daha cok').split(' '),
);
export const sozcukler = (s) => new Set(kat(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !BOS.has(w) && !/^\d+$/.test(w)));

/** Metindeki özel adlar: büyük harfle başlayan, en az üç harfli sözcükler (kesme işaretinden sonraki ek atılır). */
export const ozelAdlar = (metin) =>
  new Set([...String(metin ?? '').matchAll(/(?<![\p{L}\p{N}])(\p{Lu}[\p{L}\p{N}]{2,})/gu)].map((m) => kat(m[1])).filter((w) => !BOS.has(w)));

const adresSozcukleri = (url) => {
  try {
    return sozcukler(decodeURIComponent(new URL(url).pathname));
  } catch {
    return new Set();
  }
};

/** Başlık/özet tutmadığında gövde denetimi: adresle gövdedeki özel adlar en az iki adda ya da bir nadir adda buluşur. */
export function govdeTutar(url, govdeAdlari, nadirMi = () => false) {
  if (!govdeAdlari?.size) return false;
  const ortak = [...adresSozcukleri(url)].filter((w) => govdeAdlari.has(w));
  return ortak.length >= 2 || ortak.some(nadirMi);
}

/** Kaynak adresi haberin konusuyla eşleşiyor mu: adres yolundaki sözcüklerden biri başlıkta ya da özette geçer. */
export function konuTutar(url, { title, description }) {
  let yol = '';
  try {
    yol = decodeURIComponent(new URL(url).pathname);
  } catch {
    return false;
  }
  const konu = sozcukler(`${title ?? ''} ${description ?? ''}`);
  return [...sozcukler(yol)].some((w) => konu.has(w));
}

const BOLUM = /\s+(Business|Economy|Ekonomi|Markets|Piyasalar)$/i;
const guvenliAdres = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch {
    return null;
  }
};

/**
 * Saf seçim (sınanır): izdeki { ad, url } listesi → gösterilecek { ad, url }. liste: şifreli listedeki yayınlar
 * ({ ad, gorunen?, goster? }). Listede olmayan ya da goster:false yayın gösterilmez; aynı yayın iki kez yazılmaz.
 */
export function kaynakSec(iz, liste, haber, { govdeAdlari, nadirMi } = {}) {
  const tanim = new Map((liste ?? []).map((k) => [k.ad, k]));
  const adaylar = (iz ?? []).filter((x) => x?.ad && guvenliAdres(x.url));
  const coklu = adaylar.length > 1;
  const ut = [];
  for (const x of adaylar) {
    const k = tanim.get(x.ad);
    if (!k || k.goster === false) continue;
    if (coklu && !konuTutar(x.url, haber) && !govdeTutar(x.url, govdeAdlari, nadirMi)) continue;
    const ad = k.gorunen ?? k.ad.replace(BOLUM, '');
    if (ut.some((y) => y.ad === ad)) continue;
    ut.push({ ad, url: guvenliAdres(x.url) });
  }
  return ut;
}

let liste;
// Derlemede bu modül başka bir klasöre paketlenir: şifreli listenin yolu proje kökünden verilir.
const kaynakListesi = () => {
  if (liste) return liste;
  const g = gizliKaynaklar({ dosya: path.join(process.cwd(), 'scripts/haberler/kaynaklar/gizli-kaynaklar.sifreli'), uyar: () => {} });
  liste = [...g.beslemeler, ...g.ipucu, ...(g.derleyiciler ?? [])];
  return liste;
};

// Özel adların sitedeki belge sıklığı (derlemede bir kez, haber klasöründen okunur).
let siklik;
const NADIR_ORAN = 0.01;
const ozelAdSikligi = () => {
  if (siklik) return siklik;
  const kok = path.join(process.cwd(), 'src/content/haberler');
  const sayac = new Map();
  let n = 0;
  for (const d of readdirSync(kok)) {
    let t;
    try {
      t = readFileSync(path.join(kok, d, 'index.md'), 'utf8');
    } catch {
      continue;
    }
    n++;
    for (const w of ozelAdlar(t)) sayac.set(w, (sayac.get(w) ?? 0) + 1);
  }
  siklik = { sayac, n };
  return siklik;
};
const nadirMi = (w) => {
  const { sayac, n } = ozelAdSikligi();
  return (sayac.get(w) ?? 0) <= n * NADIR_ORAN;
};
// Gövdedeki bağlantı adresleri sayılmaz, yalnız metin.
const govdeMetni = (s) => String(s ?? '').replace(/\]\([^)]*\)/g, ']');

/** Haberin gösterilecek kaynakları; bülten, anahtar yoksa, iz yoksa ya da çözülemezse boş. govde: haberin metni. */
export function haberKaynaklari(haber) {
  if (!haber?.kaynakIzi || haber.tur === 'bulten') return [];
  let iz;
  try {
    iz = coz(haber.kaynakIzi);
  } catch {
    return [];
  }
  try {
    const govdeAdlari = haber.govde ? ozelAdlar(`${haber.title ?? ''} ${govdeMetni(haber.govde)}`) : undefined;
    return kaynakSec(iz, kaynakListesi(), haber, { govdeAdlari, nadirMi });
  } catch {
    return [];
  }
}
