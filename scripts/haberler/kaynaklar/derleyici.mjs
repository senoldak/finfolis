// Derleyici katmanı: kendisi haber yazmayan, her gün elle seçilmiş dış bağlantılar yayımlayan bağlantı bloglarının
// yazılarındaki bağlantıları aday habere çevirir. Derleyicinin kendisi kaynak değildir; aday, bağlantı verilen sayfadır.
// Derleyicilerin adı ve adresi resmi değildir: gizli-kaynaklar.sifreli dosyasının "derleyiciler" listesinde durur.
//
// Eleme: platform bağlantıları (video, podcast, sosyal medya), listede ücretli işaretli alanlar, sayfası okunamayan,
// yayın tarihi bulunamayan, 3 günden eski, "isAccessibleForFree: false" diyen ya da gövdesi kısa (ödeme duvarı) sayfa.
// Elenen bağlantı ctx.ele ile görüldü sayılır, sonraki turda yeniden istenmez. Günlük aday tavanı Gemini kotasını korur.
import { hentMetin } from '../lib.mjs';
import { htmlMetni, metinTemizle, varlikCoz } from './ortak.mjs';
import { pencere } from './merkez-bankalari.mjs';
import { adresiSil, kaynakKodu, ozet } from '../gizli.mjs';

const GUN_MS = 86400000;
const AZAMI_GUN = 3; // bağlantı verilen sayfa bundan eskiyse aday olmaz
const GELECEK_PAYI_MS = 3600e3;
const YAZI_GUN = 2; // derleyicinin yalnız son 2 günlük yazıları taranır
const ESZAMANLI = 4;
const AZAMI_ISTEK = 25; // tur başına en fazla sayfa isteği
const EN_AZ_KELIME = 250; // gövdesi bundan kısa sayfa ödeme duvarı ya da kısa not sayılır
const EN_AZ_BAG_METNI = 15;

// Haber kaynağı olmayan platformlar: video, podcast, sosyal medya, mağaza.
const PLATFORM = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|spotify\.com|podcasts\.apple\.com|apple\.co|twitter\.com|x\.com|bsky\.app|threads\.net|linkedin\.com|facebook\.com|instagram\.com|tiktok\.com|reddit\.com|amazon\.com)$/i;
// İzleme ve paylaşım parametreleri: aynı yazının farklı adresleri tek kimliğe insin.
const IZ_PARAM = /^(utm_.*|st|reflink|smid|ref|src|source|mc_cid|mc_eid|fbclid|gclid|unlocked_article_code|sref|cmpid|giftcopy|gift)$/i;

const alanAdi = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};
const alanEslesir = (alan, liste) => liste.some((a) => alan === a || alan.endsWith(`.${a}`));

export function adresNormal(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (IZ_PARAM.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return null;
  }
}

// Yazı HTML'indeki dış bağlantılar: [{ url, metin, grup }]; grup, bağlantıdan önceki son ara başlıktır.
// Derleyicinin kendi alanı, platformlar ve ücretli alanlar atılır. grupFiltresi verilirse yalnız ara başlığı ona
// uyan bölümlerin bağlantıları alınır.
export function yaziBaglantilari(html, { kendiAlan, ucretliAlanlar = [], grupFiltresi } = {}) {
  const out = [];
  let grup = '';
  for (const m of String(html).matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>|<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (m[1] !== undefined) {
      grup = metinTemizle(m[1].replace(/<[^>]*>/g, ' '));
      continue;
    }
    if (grupFiltresi && !grupFiltresi.test(grup)) continue;
    const url = adresNormal(varlikCoz(m[2]));
    if (!url || !/^https?:\/\//.test(url)) continue;
    const alan = alanAdi(url);
    if (!alan || (kendiAlan && alanEslesir(alan, [kendiAlan])) || PLATFORM.test(alan) || alanEslesir(alan, ucretliAlanlar)) continue;
    if (new URL(url).pathname.replace(/\/+$/, '') === '') continue; // ana sayfa bağlantısı haber değildir
    // Bağlantı metninin sonundaki "(alan.com)" etiketi atılır.
    const metin = metinTemizle(m[3].replace(/<span\b[^>]*class="[^"]*source[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ').replace(/<[^>]*>/g, ' '));
    if (metin.length < EN_AZ_BAG_METNI || out.some((b) => b.url === url)) continue;
    out.push({ url, metin, grup });
  }
  return out;
}

// Besleme kayıtları: { baslik, url, tarih, html } (html: content:encoded, yoksa description).
export function derleyiciYazilari(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const al = (ad) => m[1].match(new RegExp(`<${ad}(?:\\s[^>]*)?>([\\s\\S]*?)</${ad}>`, 'i'))?.[1] ?? '';
    const cdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    const url = metinTemizle(cdata(al('link')));
    const tarih = new Date(metinTemizle(cdata(al('pubDate'))));
    if (!/^https?:\/\//.test(url) || Number.isNaN(tarih.getTime())) continue;
    let html = cdata(al('content:encoded'));
    if (!html) html = varlikCoz(cdata(al('description')));
    out.push({ baslik: metinTemizle(cdata(al('title'))), url, tarih, html });
  }
  return out;
}

const meta = (html, ad) => {
  const r1 = new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)="${ad}"[^>]*\\bcontent="([^"]+)"`, 'i');
  const r2 = new RegExp(`<meta\\b[^>]*\\bcontent="([^"]+)"[^>]*(?:property|name|itemprop)="${ad}"`, 'i');
  return varlikCoz(html.match(r1)?.[1] ?? html.match(r2)?.[1] ?? '').trim();
};

// Sayfanın yayın tarihi: meta etiketleri, JSON-LD datePublished, ilk <time datetime>. Bulunamazsa null.
export function sayfaTarihi(html) {
  const s = String(html);
  const adaylar = [
    meta(s, 'article:published_time'),
    meta(s, 'og:published_time'),
    meta(s, 'datePublished'),
    meta(s, 'date'),
    meta(s, 'parsely-pub-date'),
    meta(s, 'sailthru.date'),
    s.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1],
    s.match(/<time\b[^>]*\bdatetime="([^"]+)"/i)?.[1],
  ];
  for (const a of adaylar) {
    if (!a) continue;
    const t = new Date(a);
    if (!Number.isNaN(t.getTime())) return t;
  }
  return null;
}

// og:title, yoksa <title>; sondaki " | Site adı" / " - Site adı" eki atılır (site adı yazara gitmesin).
export function sayfaBasligi(html) {
  const b = metinTemizle(meta(String(html), 'og:title') || String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  return b.replace(/\s+[|–—-]\s+[^|–—]{2,40}$/, '').trim() || b;
}

export const siteAdi = (html, url) => meta(String(html), 'og:site_name') || alanAdi(url);

// Sayfanın asıl metni: <article>, yoksa <main>, yoksa bütün sayfa.
export function sayfaGovdesi(html) {
  const s = String(html);
  const parca = s.match(/<article\b[\s\S]*<\/article>/i)?.[0] ?? s.match(/<main\b[\s\S]*<\/main>/i)?.[0] ?? s;
  return htmlMetni(parca);
}

export const ucretliSayfa = (html) => /"isAccessibleForFree"\s*:\s*"?false"?/i.test(String(html));

const kelimeSayisi = (s) => String(s).split(/\s+/).filter(Boolean).length;

// Elenme nedeni ya da null (sayfa aday olabilir).
export function sayfaElemesi(html, simdi) {
  if (ucretliSayfa(html)) return 'ücretli';
  const tarih = sayfaTarihi(html);
  if (!tarih) return 'tarihsiz';
  if (simdi - tarih > AZAMI_GUN * GUN_MS) return 'eski';
  if (tarih - simdi > GELECEK_PAYI_MS) return 'ileri tarihli';
  if (kelimeSayisi(sayfaGovdesi(html)) < EN_AZ_KELIME) return 'kısa';
  return null;
}

// Son 24 saatte bu derleyiciden aday olmuş (elenmemiş) kayıt sayısı (botun gorulen kaydından).
export function sonGunAdaySayisi(gorulen = {}, onek, simdi = new Date()) {
  const sinir = simdi - GUN_MS;
  return Object.entries(gorulen).filter(([id, g]) => id.startsWith(`${onek}:`) && !g?.elendi && Date.parse(g?.zaman) >= sinir).length;
}

// yaziFiltresi: yalnız başlığı bu düzenli ifadeye uyan yazılar taranır (ör. yalnız günlük ve araştırma derlemeleri;
// uzun okuma ya da kişisel finans derlemeleri konu dışı bağlantılarla doluyor). grupFiltresi: yazı içinde yalnız ara
// başlığı buna uyan bölümler (piyasa, ekonomi, şirketler…). Liste şifreli olduğu için ikisi de metin olarak gelir.
export function derleyiciKaynagi({ ad: gercekAd, rss, bolge = 'kuresel', kategori = 'piyasalar', onem = 40, gunlukTavan = 6, ucretliAlanlar = [], yaziFiltresi, grupFiltresi }) {
  const ad = kaynakKodu(gercekAd);
  const filtre = yaziFiltresi ? new RegExp(yaziFiltresi, 'i') : null;
  const grupF = grupFiltresi ? new RegExp(grupFiltresi, 'i') : null;
  const kimlik = (url) => `${ad}:${ozet(url)}`;
  const kendiAlan = alanAdi(rss);
  return {
    ad,
    async hent(ctx = {}) {
      const simdi = ctx.simdi ?? new Date();
      const goruldu = ctx.goruldu ?? (() => false);
      const ele = ctx.ele ?? (() => {});
      const kalan = Math.min(ctx.limit ?? Infinity, gunlukTavan - sonGunAdaySayisi(ctx.gorulen, ad, simdi));
      if (kalan <= 0) return [];
      let xml;
      try {
        xml = await hentMetin(rss);
      } catch (e) {
        throw new Error(adresiSil(e.message));
      }
      // En yeni yazıdan başlanır; yazı içindeki sıra korunur.
      const yazilar = derleyiciYazilari(xml)
        .filter((y) => simdi - y.tarih <= YAZI_GUN * GUN_MS && (!filtre || filtre.test(y.baslik)))
        .sort((a, b) => b.tarih - a.tarih);
      const kuyruk = [];
      for (const y of yazilar) {
        for (const b of yaziBaglantilari(y.html, { kendiAlan, ucretliAlanlar, grupFiltresi: grupF })) {
          if (!goruldu(kimlik(b.url)) && !kuyruk.some((k) => k.url === b.url)) kuyruk.push({ ...b, yazi: y.url });
        }
      }
      const adaylar = [];
      let sira = 0;
      const isci = async () => {
        while (sira < Math.min(kuyruk.length, AZAMI_ISTEK) && adaylar.length < kalan) {
          const b = kuyruk[sira++];
          let html;
          try {
            html = await hentMetin(b.url);
          } catch {
            ele(kimlik(b.url));
            continue;
          }
          if (sayfaElemesi(html, simdi) || adaylar.length >= kalan) {
            if (adaylar.length < kalan) ele(kimlik(b.url));
            continue;
          }
          adaylar.push({
            id: kimlik(b.url),
            baslik: sayfaBasligi(html) || b.metin,
            tarih: sayfaTarihi(html),
            onem,
            kategori,
            bolge,
            ucretli: false,
            ozet: b.metin,
            kaynakMetni: pencere(sayfaGovdesi(html)),
            alan: alanAdi(b.url),
            kaynaklar: [],
            // Bağlantı verilen sitenin adı metinde geçmemeli (yayin-kurulu.mjs, adayMedyaKontrol).
            gizliKaynaklar: [
              { ad: siteAdi(html, b.url), url: b.url },
              { ad: gercekAd, url: b.yazi },
            ],
          });
        }
      };
      await Promise.all(Array.from({ length: Math.min(ESZAMANLI, kuyruk.length) }, isci));
      return adaylar;
    },
  };
}
