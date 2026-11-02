// Haberin kaynakları adıyla ve bağlantısıyla (hukuki değerlendirme 2 Kasım 2026; koşullar mecmua
// docs/kaynak-adi-hukuki-degerlendirme-2026-11-02.md). Adlar repoya açık yazılmaz: derlemede haberin şifreli kaynak
// izinden (kaynakIzi) ve şifreli kaynak listesinden çözülür (scripts/haberler/gizli.mjs; anahtar KAYNAK_ANAHTARI, yalnız
// yayın derlemesinde). Anahtar yoksa liste boştur ve sayfa eski adsız kaynak satırını gösterir.
//
// Koşullar kodda:
//  - Yalnız gerçekten kaynak olan haber: birden çok kaynaklı haberde her kaynak, adresindeki sözcüklerden biri haberin
//    başlığındaki ya da özetindeki bir sözcükle eşleşirse gösterilir. Tek kaynaklı haberde kaynak, haberin yazıldığı
//    tek yayındır. Bülten (karma kaynaklı) adsız satırı korur.
//  - Sakıncalı yayın ya da kaldırma isteği: şifreli listede yayına `goster: false` konur; adı da bağlantısı da çıkmaz.
//    KHK taraması 2 Kasım 2026'da yapıldı (Wikipedia'daki 2016'da kapatılan yayınlar listesiyle), eşleşme yoktu.
//  - Görünen ad: listede `gorunen`, yoksa beslemenin adı bölüm eki ("… Business", "… Markets") atılarak.
// Bu modül hiçbir şey loglamaz (Actions logları herkese açık).
import path from 'node:path';
import { coz, gizliKaynaklar } from '../../scripts/haberler/gizli.mjs';

const kat = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
// Adreslerde ve başlıkta sık geçen, konu ayırt etmeyen sözcükler.
const BOS = new Set(
  ('the and for with from that this into over after amid says said will its are was has have not new news article articles ' +
    'business markets market economy world live update updates story stories html www com icin olarak ile bir yeni daha cok').split(' '),
);
export const sozcukler = (s) => new Set(kat(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !BOS.has(w) && !/^\d+$/.test(w)));

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
export function kaynakSec(iz, liste, haber) {
  const tanim = new Map((liste ?? []).map((k) => [k.ad, k]));
  const adaylar = (iz ?? []).filter((x) => x?.ad && guvenliAdres(x.url));
  const coklu = adaylar.length > 1;
  const ut = [];
  for (const x of adaylar) {
    const k = tanim.get(x.ad);
    if (!k || k.goster === false) continue;
    if (coklu && !konuTutar(x.url, haber)) continue;
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

/** Haberin gösterilecek kaynakları; bülten, anahtar yoksa, iz yoksa ya da çözülemezse boş. */
export function haberKaynaklari(haber) {
  if (!haber?.kaynakIzi || haber.tur === 'bulten') return [];
  let iz;
  try {
    iz = coz(haber.kaynakIzi);
  } catch {
    return [];
  }
  try {
    return kaynakSec(iz, kaynakListesi(), haber);
  } catch {
    return [];
  }
}
