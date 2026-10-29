// TCMB Başkan konuşma/sunumları, Enflasyon Raporu ve Finansal İstikrar Raporu "Genel Değerlendirme" metinlerini ayrıştırır.
// Saf işlevler: ağa, dosyaya ya da pdftotext'e dokunmaz (indirme ve PDF çevirme scripts/veri/tcmb-metinler.mjs'te).
import { duzMetin, varlikCoz, trTarih } from './ppk-metin.mjs';

export const KONUSMA_TABAN = 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Baskanin+Konusmalari';
export const RAPOR_TABAN = 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar';
export const TCMB_KOK = 'https://www.tcmb.gov.tr';

// "13/08/2026" → "2026-08-13"
function gunAy(s) {
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function ozellikler(etiket) {
  const o = {};
  for (const m of etiket.matchAll(/([a-z-]+)="([^"]*)"/gi)) if (!(m[1] in o)) o[m[1]] = varlikCoz(m[2]);
  return o;
}

export function mutlakUrl(href) {
  return href.startsWith('http') ? href : TCMB_KOK + href;
}

// "Başkan Fatih Karahan'ın ..." → "Fatih Karahan"; bulunamazsa null.
export function konusmaci(baslik) {
  const m = duzMetin(baslik).match(/^Başkan\s+(.+?)\s*['’‘]\s*(?:ın|in|un|ün|nın|nin|nun|nün)(?=\s|$)/);
  return m ? m[1].trim() : null;
}

// Yıllık "Başkanın Konuşmaları" listesi → [{ id, altTur, tarih, baslik, dil, htmlUrl, pdfUrl, erBilgilendirme }]
export function konusmaListesi(html, yil) {
  const out = new Map();
  for (const parca of String(html).split('class="block-collection-box"').slice(1)) {
    const tarih = gunAy(parca.match(/collection-tag">\s*([^<]*)</)?.[1] ?? '');
    let htmlHref = null;
    let pdfHref = null;
    let baslik = null;
    for (const a of parca.matchAll(/<a\b[^>]*>/g)) {
      const o = ozellikler(a[0]);
      if (!o.href) continue;
      if (/\/Baskanin\+Konusmalari\/\d{4}\/[^/?"]+$/.test(o.href)) htmlHref ??= o.href;
      else if (/\.pdf(\?|$)/i.test(o.href)) pdfHref ??= o.href;
      else continue;
      baslik ??= o.title ? duzMetin(o.title) : null;
    }
    const ad = (htmlHref ?? pdfHref)?.split('?')[0].split('/').pop().replace(/\.pdf$/i, '');
    if (!ad || !tarih) continue;
    const km = ad.match(/^(Konusma|Sunum)(.+)$/i);
    if (!km) continue;
    if (Number(tarih.slice(0, 4)) !== yil) continue;
    const altTur = km[1].toLowerCase() === 'sunum' ? 'sunum' : 'konusma';
    const id = `${altTur}_${km[2]}`;
    baslik ??= ad;
    out.set(id, {
      id,
      altTur,
      tarih,
      baslik,
      dil: /\(İngilizce\)/i.test(baslik) ? 'en' : 'tr',
      erBilgilendirme: /Enflasyon Raporu[^]*Bilgilendirme Toplantısı/i.test(baslik),
      htmlUrl: htmlHref ? mutlakUrl(htmlHref) : null,
      pdfUrl: pdfHref ? mutlakUrl(pdfHref) : null,
    });
  }
  return [...out.values()];
}

// Duyuru sayfasının ana içeriğinden (tcmb-content ... <div><a target) paragrafları sırayla alır.
export function konusmaAyristir(html) {
  const bas = html.indexOf('class="tcmb-content');
  if (bas < 0) throw new Error('Konuşma içeriği bulunamadı');
  let son = html.indexOf('<div><a target', bas);
  if (son < 0) son = html.length;
  const paragraflar = [];
  for (const m of html.slice(bas, son).matchAll(/<(p|h2|h3|h4|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const metin = duzMetin(m[2]);
    if (metin) paragraflar.push(metin);
  }
  if (paragraflar.length < 3) throw new Error('Konuşma beklenen biçimde değil');
  return paragraflar;
}

// Rapor sayfası → { baslik, bolumler: [{ ad, pdfUrl }] }. Bölüm başlığı (h2) ile hemen ardından gelen PDF bağlantısı eşlenir.
export function raporSayfasi(html) {
  const baslik = duzMetin(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').replace(/^TCMB\s*-\s*/, '');
  const i = html.indexOf('id="tcmbMainContent"');
  if (i < 0) throw new Error('Rapor içeriği bulunamadı');
  const bolumler = [];
  let ad = null;
  for (const m of html.slice(i).matchAll(/<h2 class="type-h2">([\s\S]*?)<\/h2>|<a\b[^>]*class="[^"]*pdf[^"]*"[^>]*>/g)) {
    if (m[1] !== undefined) {
      ad = duzMetin(m[1]);
      continue;
    }
    const href = ozellikler(m[0]).href;
    if (ad && href) {
      bolumler.push({ ad, pdfUrl: mutlakUrl(href) });
      ad = null;
    }
  }
  return { baslik, bolumler };
}

export const genelDegerlendirmeBolumu = (bolumler) => bolumler.find((b) => /Genel De[ğg]erlendirme/i.test(b.ad)) ?? null;

// "Enflasyon Raporu 2026 - III (13 Ağustos 2026)" → { donem: '2026-III', tarih: '2026-08-13' }
export function erBaslik(baslik) {
  const m = baslik.match(/Enflasyon Raporu\s+(\d{4})\s*-\s*([IV]+)/);
  return { donem: m ? `${m[1]}-${m[2]}` : null, tarih: trTarih(baslik) };
}

const AY_NO = { ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6, temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12 };

// "Finansal İstikrar Raporu - Kasım 2025, Sayı 41" → { sayi: 41, tarih: '2025-11-01' } (yalnız ay bilinir; gün 01 yazılır).
export function firBaslik(baslik) {
  const m = baslik.match(/-\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4}),\s*Sayı\s*(\d+)/);
  const ay = m && AY_NO[m[1].toLocaleLowerCase('tr')];
  return m && ay ? { sayi: Number(m[3]), tarih: `${m[2]}-${String(ay).padStart(2, '0')}-01` } : { sayi: null, tarih: null };
}

// pdftotext çıktısını satırlara böler (CRLF ve sayfa sonu karakterleri atılır).
const satirlar = (metin) => String(metin).replace(/\f/g, '\n').split(/\r?\n/).map((s) => s.replace(/\s+/g, ' ').trim());

const SAYFA_UST = /^(Enflasyon Raporu|Finansal İstikrar Raporu)\b.*\|.*$|^.*\|\s*Genel Değerlendirme\s*\d*$/;
const GRAFIK_ARTIGI = /^(Grafik|Tablo|Şekil|Kutu)\s+[\dIVX]+[.\d]*[:.\s]|^(Kaynak|Not)\s*:|^\(?\*{1,2}\)?\s/;

// ER/FİR genel değerlendirme PDF'i → paragraflar. Sayfa üstbilgisi, ana başlık, grafik/tablo artıkları atılır;
// numaralı alt başlıkta ("1.1 Para Politikası Kararları", "A. ...") kesilir: yalnız genel değerlendirmenin özet gövdesi alınır.
export function raporParagraflari(pdfMetni) {
  const out = [];
  let ilk = true;
  for (const s of satirlar(pdfMetni)) {
    if (!s || SAYFA_UST.test(s)) continue;
    if (ilk) {
      ilk = false;
      if (/^(\d+\.|[IVX]+\.)\s*Genel Değerlendirme$/i.test(s)) continue; // ana başlık
    }
    if (/^\d+\.\d+(\.\d+)?\s+\S/.test(s) && s.length < 120) break; // alt başlık: gövde bitti
    if (GRAFIK_ARTIGI.test(s)) continue;
    if (/^[\d\s.,%\-–+]+$/.test(s)) continue; // yalnız sayı (sayfa no, eksen)
    out.push(s);
  }
  // Sayfa sonunda bölünen paragraf: önceki satır cümleyi bitirmediyse ve sonraki küçük harfle başlıyorsa birleştirilir.
  const birlesik = [];
  for (const s of out) {
    const onceki = birlesik.at(-1);
    if (onceki && !/[.!?…:;)”"’']$/.test(onceki) && /^\p{Ll}/u.test(s)) birlesik[birlesik.length - 1] = `${onceki} ${s}`;
    else birlesik.push(s);
  }
  return birlesik;
}

// Sunum (slayt) PDF'i → { paragraflar, slaytSayisi }. Her slaytın ilk satırı (başlık/ana ileti) ve en az 3 sözcüklü metin satırları alınır;
// yalnız sayı, "Kaynak:/Not:" ve eksen artıkları atılır. Grafik içi etiketlerin bir kısmı sızabilir.
export function sunumParagraflari(pdfMetni) {
  const slaytlar = String(pdfMetni).split('\f').map((s) => satirlar(s).filter(Boolean)).filter((s) => s.length);
  const out = [];
  for (const slayt of slaytlar) {
    slayt.forEach((s, i) => {
      if (/^[\d\s.,%\-–+*()]+$/.test(s)) return;
      if (/^(Kaynak|Not)\s*:/i.test(s)) return;
      const sozcuk = s.split(' ').filter((w) => /\p{L}{2,}/u.test(w)).length;
      const sayisal = s.split(' ').filter((w) => /^[\d.,%\-–+]+$/.test(w)).length / s.split(' ').length;
      if (i === 0 ? sozcuk >= 1 && !/^\d+$/.test(s) : sozcuk >= 3 && sayisal < 0.25) out.push(s);
    });
  }
  return { paragraflar: out, slaytSayisi: slaytlar.length };
}

// ER ya da FİR ana sayfasından rapor listesi: [{ tur, id, baslik, url, ... }]. Bağlantı ve başlık sayfada olduğu gibi alınır.
export function raporListesi(html, tur) {
  const out = new Map();
  const desen = tur === 'er' ? /\/Enflasyon\+Raporu\/\d{4}\/[^/?"]+\/?$/ : /\/Finansal\+Istikrar\+Raporu\/\d{4}\/[^/?"]+\/?$/;
  for (const a of String(html).matchAll(/<a\b[^>]*>/g)) {
    const o = ozellikler(a[0]);
    if (!o.href || !o.title || !desen.test(o.href)) continue;
    const baslik = duzMetin(o.title);
    const url = mutlakUrl(o.href.replace(/\/$/, ''));
    if (tur === 'er') {
      const { donem, tarih } = erBaslik(baslik);
      if (donem && tarih) out.set(`er_${donem}`, { id: `er_${donem}`, tur: 'rapor_er', donem, tarih, baslik, url });
    } else {
      const { sayi, tarih } = firBaslik(baslik);
      if (sayi && tarih) out.set(`fir_${sayi}`, { id: `fir_${sayi}`, tur: 'rapor_fir', sayi, tarih, tarihKesinligi: 'ay', baslik, url });
    }
  }
  return [...out.values()];
}

// Yalnız metin içeren (sunum olmayan) konuşma PDF'i → paragraflar (sayfa numarası ve boş satırlar atılır).
export function pdfKonusmaParagraflari(pdfMetni) {
  return satirlar(pdfMetni).filter((s) => s && !/^\d{1,3}$/.test(s));
}

const TR_KELIME =new Set(['ve', 'bir', 'için', 'ile', 'olarak', 'daha', 'bu', 'de', 'da', 'ise', 'olan', 'enflasyon', 'politika', 'faiz', 'yüzde', 'sürmektedir', 'gelişmeler', 'ekonomik', 'olması']);
const EN_KELIME = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'for', 'that', 'with', 'inflation', 'policy', 'on', 'are', 'as', 'by', 'from', 'this', 'monetary']);

// Metin Türkçe mi? (sunumlarda dil etiketi her zaman başlıkta yok)
export function turkceMi(metin) {
  let tr = 0;
  let en = 0;
  for (const w of String(metin).toLocaleLowerCase('tr').match(/\p{L}+/gu) ?? []) {
    if (TR_KELIME.has(w)) tr++;
    else if (EN_KELIME.has(w)) en++;
  }
  const trHarf = (String(metin).match(/[çğıöşüÇĞİÖŞÜ]/g) ?? []).length;
  return tr + trHarf / 20 >= en;
}
