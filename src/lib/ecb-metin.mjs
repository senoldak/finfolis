// ECB sayfalarını ayrıştırır: yıllık liste parçaları, para politikası kararları basın açıklaması (karar),
// basın toplantısı giriş metni (aciklama), toplantı hesabı (hesap), mevduat faizi kararı.
// Saf işlevler: ağa ya da dosyaya dokunmaz (indirme scripts/veri/ecb-metinler.mjs'te). Kaynak yalnız ecb.europa.eu.
import { duzMetin } from './ppk-metin.mjs';
import { cumleBol } from './fomc-metin.mjs';

export { cumleBol };

export const ECB_TABAN = 'https://www.ecb.europa.eu';
// Kararların yıllık listeleri bu sayfanın "data-snippets" özniteliğinde sayılır.
export const ECB_KARAR_LISTE = `${ECB_TABAN}/press/govcdec/mopo/html/index.en.html`;
export const ECB_HESAP_LISTE = `${ECB_TABAN}/press/accounts/html/index.en.html`;
export const ECB_ACIKLAMA_LISTE = `${ECB_TABAN}/press/press_conference/monetary-policy-statement/html/index.en.html`;

const AYLAR = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const HARF_VARLIK = { oslash: 'ø', Oslash: 'Ø', eacute: 'é', egrave: 'è', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', ccedil: 'ç', aring: 'å', Eacute: 'É', euro: '€' };
const metinDuz = (html) => duzMetin(String(html).replace(/&([A-Za-z]+);/g, (m, ad) => HARF_VARLIK[ad] ?? m)).replace(/[‐‑]/g, '-');

const ikili = (n) => String(n).padStart(2, '0');

// "10 September 2026" → "2026-09-10"; ayrıştırılamazsa null.
export function enTarih(metin) {
  const m = String(metin).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const ay = AYLAR[m[2].toLowerCase()];
  return ay ? `${m[3]}-${ikili(ay)}-${ikili(m[1])}` : null;
}

// Hesap başlığı: "Meeting of 9-10 September 2026", "Meeting of 29 April-1 May 2026", "Meeting of 17-18 December 2025".
// Toplantının son günü döner ("2026-09-10"); ayrıştırılamazsa null.
export function hesapToplantiTarihi(baslik) {
  const m = String(baslik).match(/Meeting of (.+?)\s*$/i);
  if (!m) return null;
  const s = m[1];
  const yil = s.match(/(\d{4})\s*$/)?.[1];
  if (!yil) return null;
  const parcalar = [...s.replace(/\s*\d{4}\s*$/, '').matchAll(/(\d{1,2})(?:\s+([A-Za-z]+))?/g)];
  const son = parcalar.at(-1);
  if (!son) return null;
  const ay = AYLAR[(son[2] ?? s.match(/([A-Za-z]+)\s+\d{4}\s*$/)?.[1] ?? '').toLowerCase()];
  return ay ? `${yil}-${ikili(ay)}-${ikili(son[1])}` : null;
}

// Liste sayfasındaki "data-snippets" öznitelikten yıllık parça adresleri: [{ yil, url }], yeniden eskiye.
export function yilParcalari(sayfaHtml, sayfaUrl) {
  const m = String(sayfaHtml).match(/data-snippets='([^']*)'/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => ({ yil: Number(g.match(/\/(\d{4})\//)?.[1]), url: new URL(g, sayfaUrl).href }))
    .filter((p) => p.yil);
}

// Yıllık liste parçası → [{ tarih, baslik, url }] (sorgu dizisiz, tekilleştirilmiş). Bağlantılar sayfadan okunur.
export function listeAyristir(html) {
  const out = new Map();
  const re = /<dt isoDate="(\d{4}-\d{2}-\d{2})">[\s\S]*?<\/dt>\s*<dd>\s*<div class="title"><a href="([^"]+)"[^>]*>([^<]*)<\/a>/g;
  for (const m of String(html).matchAll(re)) {
    const url = new URL(m[2].replace(/\?.*$/, ''), ECB_TABAN).href;
    if (!out.has(url)) out.set(url, { tarih: m[1], baslik: metinDuz(m[3]), url });
  }
  return [...out.values()];
}

// Adresten belge türü: ecb.mpYYMMDD = karar, ecb.isYYMMDD = basın toplantısı giriş metni, ecb.mgYYMMDD = toplantı hesabı.
export function belgeTuru(url) {
  const m = String(url).match(/\/ecb\.(mp|is|mg)(\d{6})~[a-f0-9]+\.en\.html$/);
  if (!m) return null;
  return { mp: 'karar', is: 'aciklama', mg: 'hesap' }[m[1]];
}

// Adresteki YYMMDD → "20YY-MM-DD" (karar ve açıklama için toplantı günü).
export function adresTarihi(url) {
  const m = String(url).match(/\/ecb\.(?:mp|is|mg)(\d{2})(\d{2})(\d{2})~/);
  return m ? `20${m[1]}-${m[2]}-${m[3]}` : null;
}

// Sayfanın <main> gövdesi: ilk <h1>'den sonrası, "related-topics" ya da adres kutusundan öncesi.
function govdeAlani(html) {
  const h = String(html);
  const bas = h.indexOf('<main');
  if (bas < 0) throw new Error('ECB sayfa içeriği bulunamadı');
  let alan = h.slice(bas);
  const son = [alan.search(/<div class="related-topics"/), alan.search(/<div class="address-box/), alan.indexOf('</main>')].filter((i) => i >= 0);
  if (son.length) alan = alan.slice(0, Math.min(...son));
  const h1 = alan.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1) throw new Error('ECB sayfasında başlık yok');
  return { baslik: metinDuz(h1[1]), govde: alan.slice(h1.index + h1[0].length) };
}

const TARIH_SATIRI = /^\d{1,2} [A-Z][a-z]+ \d{4}$/;
const BASLIK_RE = /<(h[2-4]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;

// Ortak gövde taraması: [{ tur: 'baslik'|'p', seviye?, metin, ham }]
function ogeler(govde) {
  const out = [];
  for (const m of govde.matchAll(BASLIK_RE)) {
    const etiket = m[1].toLowerCase();
    const ham = m[2];
    const metin = metinDuz(ham.replace(/<sup>[\s\S]*?<\/sup>/gi, ''));
    if (!metin) continue;
    if (etiket[0] === 'h') out.push({ tur: 'baslik', seviye: Number(etiket[1]), metin, ham });
    else out.push({ tur: 'p', metin, ham });
  }
  return out;
}

const publicationTarihi = (html) => enTarih(String(html).match(/class="ecb-publicationDate">([^<]*)</)?.[1] ?? '');

// Karar basın açıklaması ("Monetary policy decisions") → { tarih, baslik, paragraflar, bolumler }.
// Atılanlar: "***" ayracı, basın toplantısı saatini bildiren cümle. Ara başlıklar bolumler'e gider (paragraflarla aynı uzunlukta).
export function kararAyristir(html) {
  const { baslik, govde } = govdeAlani(html);
  const tarih = publicationTarihi(html);
  const paragraflar = [];
  const bolumler = [];
  let bolum = '';
  for (const o of ogeler(govde)) {
    if (o.tur === 'baslik') {
      bolum = o.metin;
      continue;
    }
    if (/^[*\s]+$/.test(o.metin)) continue;
    if (/^The President of the ECB will comment/i.test(o.metin)) continue;
    if (TARIH_SATIRI.test(o.metin)) continue;
    paragraflar.push(o.metin);
    bolumler.push(bolum);
  }
  if (!/Monetary policy decisions/i.test(baslik) || !tarih || paragraflar.length < 3) throw new Error('Karar açıklaması beklenen biçimde değil');
  return { tarih, baslik, paragraflar, bolumler };
}

// Basın toplantısı giriş metni ("Monetary policy statement") → { tarih, baslik, paragraflar, bolumler }.
// Yalnız giriş konuşması alınır; soru-cevap ("* * *" ayracından sonrası) alınmaz.
// Atılanlar: konuşmacı başlığı, yer-tarih satırı, karşılama cümleleri, "kararlar basın açıklamasında" bağlantı cümlesi, soru daveti.
export function aciklamaAyristir(html) {
  const { govde } = govdeAlani(html);
  let tarih = null;
  const paragraflar = [];
  const bolumler = [];
  let bolum = '';
  for (const o of ogeler(govde)) {
    if (o.tur === 'baslik') {
      if (/President of the ECB|Vice-President/i.test(o.metin)) continue;
      bolum = o.metin;
      continue;
    }
    if (/id="qa"/.test(o.ham) || /^\*\s*\*\s*\*/.test(o.metin)) break;
    const yer = o.metin.match(/^[^,.]{2,40},\s*(\d{1,2} [A-Z][a-z]+ \d{4})$/);
    if (yer) {
      tarih = enTarih(yer[1]);
      continue;
    }
    if (/^Good (afternoon|morning|evening)\b/i.test(o.metin)) continue;
    if (/^The decisions taken today are set out in a press release/i.test(o.metin)) continue;
    if (/^We are now ready to take your questions/i.test(o.metin)) break;
    paragraflar.push(o.metin);
    bolumler.push(bolum);
  }
  if (!tarih || paragraflar.length < 5) throw new Error('Basın toplantısı metni beklenen biçimde değil');
  return { tarih, baslik: 'Monetary policy statement', paragraflar, bolumler };
}

// Toplantı hesabı → { tarih (yayın), aralik, baslik, paragraflar, bolumler }.
// bolumler: paragrafın ait olduğu en alttaki başlık ("Monetary policy considerations and policy options" gibi);
// numaralı üst başlıkların ("1. Review of …") numarası atılır. Gövde ilk dördüncü düzey başlıkta biter: sonrası belge bağlantıları ile katılımcı listesidir, alınmaz. "Account of the monetary policy meeting …" altbaşlığı bölüm sayılmaz.
export function hesapAyristir(html) {
  const { baslik, govde } = govdeAlani(html);
  let tarih = null;
  let aralik = null;
  const paragraflar = [];
  const bolumler = [];
  let bolum = '';
  for (const o of ogeler(govde)) {
    if (o.tur === 'baslik') {
      if (o.seviye === 4) break; // gövde biter; sonrası belge bağlantıları ve katılımcı listesi
      if (/^Account of the monetary policy meeting/i.test(o.metin)) {
        aralik = o.metin.match(/(\d{1,2}(?:\s+[A-Za-z]+)?\s*-\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*$/)?.[1] ?? null;
        bolum = '';
        continue;
      }
      bolum = o.metin.replace(/^\d+\.\s*/, '');
      continue;
    }
    if (TARIH_SATIRI.test(o.metin)) {
      tarih ??= enTarih(o.metin);
      continue;
    }
    paragraflar.push(o.metin);
    bolumler.push(bolum);
  }
  if (!/^Meeting of/i.test(baslik) || !tarih || paragraflar.length < 10) throw new Error('Toplantı hesabı beklenen biçimde değil');
  return { tarih, aralik, baslik, paragraflar, bolumler };
}

// "3.00" ya da "2.50%" → sayı
const oran = (s) => Number(String(s).replace('%', ''));
const FIIL = { increased: 'artis', raised: 'artis', decreased: 'indirim', lowered: 'indirim', unchanged: 'sabit' };
const SAYILAR = String.raw`([\d.]+)%`;

// Karar metninden üç politika faizi: { mevduat, mro, mlf, yon: 'indirim'|'artis'|'sabit' } ya da null.
// mevduat = mevduat kolaylığı faizi (deposit facility rate), mro = ana yeniden finansman işlemleri, mlf = marjinal borç verme kolaylığı.
// İki kalıp: üçü tek cümlede ("… will be increased to 3.00%, 3.25% and 2.50% respectively") ya da
// mevduat ayrı, diğer ikisi ayrı cümlede (Eylül 2024). Sıra, cümledeki kolaylık adlarının sırasından okunur.
export function ecbKarari(cumleler) {
  const metin = (Array.isArray(cumleler) ? cumleler : [cumleler]).join(' ').replace(/\s+/g, ' ');
  const FIILLER = '(?:be (increased|decreased|raised|lowered)(?: to)?|remain (unchanged)(?: at)?)';
  const uc = new RegExp(String.raw`interest rates? on the ([^.%]*?) will ${FIILLER}\s+${SAYILAR},\s*${SAYILAR}\s+and\s+${SAYILAR}`, 'i').exec(metin);
  if (uc) {
    const ad = uc[1].toLowerCase();
    const sira = [
      ['mevduat', ad.indexOf('deposit')],
      ['mro', ad.indexOf('main refinancing')],
      ['mlf', ad.indexOf('marginal lending')],
    ];
    if (sira.some(([, i]) => i < 0)) return null;
    sira.sort((a, b) => a[1] - b[1]);
    const sayilar = [uc[4], uc[5], uc[6]].map(oran);
    if (sayilar.some(Number.isNaN)) return null;
    const out = {};
    sira.forEach(([ad2], i) => (out[ad2] = sayilar[i]));
    return { mevduat: out.mevduat, mro: out.mro, mlf: out.mlf, yon: FIIL[(uc[2] ?? uc[3]).toLowerCase()] };
  }
  const m1 = new RegExp(String.raw`deposit facility rate will be (increased|decreased|raised|lowered) to ${SAYILAR}`, 'i').exec(metin);
  const m2 = new RegExp(String.raw`main refinancing operations and the marginal lending facility will be (?:increased|decreased|raised|lowered) to ${SAYILAR} and ${SAYILAR}`, 'i').exec(metin);
  if (m1 && m2) return { mevduat: oran(m1[2]), mro: oran(m2[1]), mlf: oran(m2[2]), yon: FIIL[m1[1].toLowerCase()] };
  return null;
}
