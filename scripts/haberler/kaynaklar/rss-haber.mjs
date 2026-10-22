// Genel RSS/Atom haber kaynağı: yurtdışı finans haber beslemeleri için tek fabrika.
// Açık kaynaklarda makale sayfası çekilir; ücretli kaynaklarda (ucretli: true) makale sayfasına ASLA
// istek atılmaz, yalnızca başlık + RSS özeti kullanılır.
import { hentMetin } from '../lib.mjs';
import { rssOgeleri, atomGirdileri, htmlMetni, metinTemizle } from './ortak.mjs';
import { pencere } from './merkez-bankalari.mjs';
import { adresiSil, kaynakKodu, ozet } from '../gizli.mjs';

const GUN_MS = 86400000;
const ESZAMANLI = 4; // eşzamanlı makale isteği sınırı
const AZAMI_GUN = 7; // bundan eski kayıtlar aday olmaz
// İleri tarihli kayıt (etkinlik takvimi, planlı duyuru) henüz olmamış bir şeydir, aday olmaz. Saat dilimi yanlış yazılmış
// beslemeler için bu kadar pay bırakılır.
const GELECEK_PAYI_MS = 3600e3;

const duzMetin = (s) => metinTemizle(String(s ?? '').replace(/<[^>]*>/g, ' '));

// RSS ya da Atom beslemesini ortak biçime çevirir: { baslik, url, tarih, ozet }. Bozuk XML boş liste verir.
function ogeler(xml, tarihsiz = false) {
  try {
    if (/<entry\b/i.test(xml) && !/<item\b/i.test(xml)) {
      return atomGirdileri(xml).map((g) => ({ baslik: g.baslik, url: g.url, tarih: g.tarih, ozet: g.ozet }));
    }
    return rssOgeleri(xml, { tarihsiz }).map((o) => ({ baslik: o.baslik, url: o.url, tarih: o.tarih, ozet: duzMetin(o.aciklama) }));
  } catch {
    return [];
  }
}

// Resmi olmayan beslemenin adı ve adresi kimliklere, loglara ve durum dosyasına girmez: kısa kod ve anahtarlı
// özet kullanılır. Gerçek ad ve bağlantı yalnızca gizliKaynaklar'da taşınır, haberde şifreli kaynakIzi olur.
// tarihsiz: besleme kayıt tarihi taşımıyor; kaydın tarihi ilk görüldüğü turdur. Görülen kayıt durum dosyasına girer,
// ilk turda yalnız en yeni FORSTE_GANG kayıt alınır (hent-haberler.mjs); böylece eski kayıtlar yeni sanılmaz.
export function rssHaberKaynagi({ ad: gercekAd, rss, bolge, ucretli, kategori, onem = 40, resmi = false, tarihsiz = false }) {
  const ad = resmi ? gercekAd : kaynakKodu(gercekAd);
  const kimlik = (url) => (resmi ? `${ad}:${url}` : `${ad}:${ozet(url)}`);
  const alan = (url) => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  };
  return {
    ad,
    async hent(ctx = {}) {
      const simdi = ctx.simdi ?? new Date();
      const goruldu = ctx.goruldu ?? (() => false);
      let xml;
      try {
        xml = await hentMetin(rss);
      } catch (e) {
        throw resmi ? e : new Error(adresiSil(e.message));
      }
      let taze = ogeler(xml, tarihsiz).map((o) => (o.tarih ? o : { ...o, tarih: simdi })).filter(
        (o) => !Number.isNaN(o.tarih?.getTime()) && simdi - o.tarih <= AZAMI_GUN * GUN_MS && o.tarih - simdi <= GELECEK_PAYI_MS && !goruldu(kimlik(o.url)),
      );
      // ctx.limit: makale sayfaları çekilmeden önce en yeni N kayda indirilir; kesilenler ctx.kesilen'e bildirilir.
      if (Number.isFinite(ctx.limit)) {
        taze.sort((a, b) => b.tarih - a.tarih);
        for (const o of taze.slice(ctx.limit)) ctx.kesilen?.(kimlik(o.url));
        taze = taze.slice(0, ctx.limit);
      }
      const adaylar = new Array(taze.length);
      let sira = 0;
      // En fazla ESZAMANLI makale aynı anda çekilir; sonuç sırası beslemeyle aynı kalır.
      const isci = async () => {
        while (sira < taze.length) {
          const i = sira++;
          const o = taze[i];
          let kaynakMetni = `${o.baslik}
${o.ozet}`;
          if (!ucretli) {
            try {
              const tam = htmlMetni(await hentMetin(o.url));
              if (tam) kaynakMetni = pencere(tam);
            } catch {
              // makale alınamazsa başlık + özetle devam
            }
          }
          adaylar[i] = {
            id: kimlik(o.url),
            baslik: o.baslik,
            tarih: o.tarih,
            onem,
            kategori,
            bolge,
            ucretli,
            ozet: o.ozet,
            kaynakMetni,
            alan: alan(o.url),
            // Haber sitesinin adı ve bağlantısı kaynak listesine girmez (bkz. beslemeler.mjs, resmi).
            kaynaklar: resmi ? [{ ad, url: o.url }] : [],
            gizliKaynaklar: resmi ? [] : [{ ad: gercekAd, url: o.url }],
          };
        }
      };
      await Promise.all(Array.from({ length: Math.min(ESZAMANLI, taze.length) }, isci));
      return adaylar;
    },
  };
}
