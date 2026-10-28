// Fed FOMC sayfalarını ayrıştırır: toplantı takvimi, basın açıklaması (statement), tutanak (minutes),
// İngilizce cümle bölme, faiz aralığı kararı. Saf işlevler: ağa ya da dosyaya dokunmaz
// (indirme scripts/veri/fomc-metinler.mjs'te). Kaynak yalnız federalreserve.gov.
import { duzMetin } from './ppk-metin.mjs';

export const FED_TABAN = 'https://www.federalreserve.gov';
export const FED_TAKVIM = `${FED_TABAN}/monetarypolicy/fomccalendars.htm`;

const AYLAR = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

// "September 16, 2026" → "2026-09-16"; ayrıştırılamazsa null.
export function enTarih(metin) {
  const m = String(metin).match(/([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const ay = AYLAR[m[1].toLowerCase()];
  if (!ay) return null;
  return `${m[3]}-${String(ay).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

// "20260916" → "2026-09-16"
const sekiz = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

// Fed sayfalarında geçen harfli varlıklar (ppk-metin'deki tablo yalnız noktalama içerir).
const HARF_VARLIK = { oslash: 'ø', Oslash: 'Ø', eacute: 'é', egrave: 'è', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', ccedil: 'ç', aring: 'å', Eacute: 'É', Aacute: 'Á' };
// Fed kesirlerde bölünmez tire (U+2011) kullanır ("4‑1/4"); sıradan tireye çevrilir, böylece oranlar ve cümle bölme tutarlı çalışır.
const metinDuz = (html) =>
  duzMetin(String(html).replace(/&([A-Za-z]+);/g, (m, ad) => HARF_VARLIK[ad] ?? m)).replace(/[‐‑]/g, '-');

// Takvim sayfasından toplantıları çıkarır: [{ toplantiTarihi, aciklama, tutanak: { url, yayim } | null }].
// Bağlantılar sayfadan okunur, tahmin edilmez. Toplantı tarihi, açıklama ve tutanak dosya adındaki son gün.
export function takvimdenToplantilar(html) {
  const parcalar = String(html).split(/<div class="[^"]*\bfomc-meeting"/).slice(1);
  const out = new Map();
  for (const p of parcalar) {
    const a = p.match(/href="(\/newsevents\/pressreleases\/monetary(\d{8})a\.htm)"/);
    const t = p.match(/href="(\/monetarypolicy\/fomcminutes(\d{8})\.htm)"/);
    if (!a && !t) continue;
    const gun = sekiz((a ?? t)[2]);
    const m = out.get(gun) ?? { toplantiTarihi: gun, aciklama: null, tutanak: null };
    if (a) m.aciklama = { url: FED_TABAN + a[1] };
    if (t) {
      const yayim = p.match(/Released\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
      m.tutanak = { url: FED_TABAN + t[1], yayim: yayim ? enTarih(yayim[1]) : null };
    }
    out.set(gun, m);
  }
  return [...out.values()].sort((x, y) => x.toplantiTarihi.localeCompare(y.toplantiTarihi));
}

// Cümle bölme. Bölünmeyenler: kısaltmalar (U.S., Jr., e.g., Mr. …), baş harfler (Michael S. Barr),
// rakamla süren metin ("percent. 2 …"), küçük harfle süren metin; kesir ve ondalıklarda nokta/tire zaten boşluksuzdur.
const KISALTMA = new Set(['u.s', 'u.k', 'jr', 'sr', 'e.g', 'i.e', 'mr', 'ms', 'mrs', 'dr', 'st', 'vs', 'no', 'nos', 'inc', 'co', 'corp', 'ltd', 'a.m', 'p.m', 'etc', 'cf', 'approx', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec']);
// "U.S." cümleyi de bitirebilir; bunlardan biri geliyorsa bölünür ("U.S. Treasury" bölünmez).
const BASLANGIC = new Set(['the', 'this', 'these', 'that', 'it', 'in', 'however', 'at', 'as', 'on', 'overall', 'participants', 'most', 'some', 'several', 'many', 'but', 'while', 'although', 'with', 'looking', 'turning']);
const UST = /^["“‘'(\[]*[A-Z]/;

export function cumleBol(paragraf) {
  const metin = String(paragraf).replace(/\s+/g, ' ').trim();
  if (!metin) return [];
  const out = [];
  let bas = 0;
  const re = /[.!?…]+["”’')\]]*\s+/g;
  let m;
  while ((m = re.exec(metin))) {
    const sonraki = metin.slice(re.lastIndex);
    if (!sonraki || !UST.test(sonraki)) continue;
    const onceki = metin.slice(bas, m.index + 1); // noktanın kendisi dahil
    const belirteç = onceki.match(/([\p{L}][\p{L}.]*)\.$/u)?.[1];
    if (belirteç) {
      const k = belirteç.toLowerCase();
      const sonrakiKelime = sonraki.replace(/^[^A-Za-z]+/, '').match(/^[A-Za-z]+/)?.[0]?.toLowerCase();
      if (/^[A-Z]$/.test(belirteç)) continue; // baş harf: "Michael S. Barr"
      if (KISALTMA.has(k)) {
        if (k === 'u.s' && sonrakiKelime && BASLANGIC.has(sonrakiKelime)) {
          /* cümle sonu say */
        } else continue;
      }
    }
    out.push(metin.slice(bas, m.index + m[0].trimEnd().length).trim());
    bas = re.lastIndex;
  }
  const kalan = metin.slice(bas).trim();
  if (kalan) out.push(kalan);
  return out;
}

// "3-3/4" → 3.75, "1/4" → 0.25, "4" → 4, "5.5" → 5.5
export function oranSayisi(s) {
  const t = String(s).trim();
  let m = t.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  return NaN;
}

const SAYI = String.raw`(\d+-\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;
const ARALIK = new RegExp(
  String.raw`(lower|raise|maintain)\w*\s+the\s+target\s+range\s+for\s+the\s+federal\s+funds\s+rate\s+(?:by\s+[^.]*?percentage\s+points?\s+)?(?:at|to)\s+` + SAYI + String.raw`\s+to\s+` + SAYI + String.raw`\s+percent`,
  'i',
);

// Açıklama metninden hedef faiz aralığı: { alt, ust, yon: 'indirim'|'artis'|'sabit' } ya da null.
export function fedKarari(cumleler) {
  const metin = (Array.isArray(cumleler) ? cumleler : [cumleler]).join(' ');
  const m = ARALIK.exec(metin);
  if (!m) return null;
  const alt = oranSayisi(m[2]);
  const ust = oranSayisi(m[3]);
  if (Number.isNaN(alt) || Number.isNaN(ust)) return null;
  const fiil = m[1].toLowerCase();
  return { alt, ust, yon: fiil === 'lower' ? 'indirim' : fiil === 'raise' ? 'artis' : 'sabit' };
}

// Oy cümlesinden: { lehte, karsi } (varsa "9 – 3 vote" sayımı) ve muhalefet var mı.
export function oyOzeti(oyCumlesi) {
  const s = String(oyCumlesi ?? '');
  const t = s.match(/(\d+)\s*[–-]\s*(\d+)\s+vote/i);
  const lehte = t ? Number(t[1]) : null;
  const karsi = t ? Number(t[2]) : null;
  const muhalefet = /Voting against/i.test(s) || (karsi !== null && karsi > 0);
  return { lehte, karsi, muhalefet };
}

// Basın açıklaması sayfası → { tarih, baslik, paragraflar, oyCumlesi? }.
// Gövde: başlıktaki paylaşım menüsünden sonraki paragraflar. Atılanlar: "For media inquiries", "Implementation Note".
// Ayrı tutulanlar (fark hesabına girmez): "Voting for/against …" paragrafları ve "… approved the following statement … by a 9 – 3 vote:" cümlesi.
export function aciklamaAyristir(html) {
  const h = String(html);
  const bas = h.indexOf('id="article"');
  if (bas < 0) throw new Error('Açıklama içeriği bulunamadı');
  let son = h.indexOf('id="lastUpdate"', bas);
  if (son < 0) son = h.length;
  const alan = h.slice(bas, son);
  const tarih = enTarih(alan.match(/class="article__time">([^<]*)</)?.[1] ?? '');
  const baslik = metinDuz(alan.match(/<h3 class="title">([\s\S]*?)<\/h3>/)?.[1] ?? '');
  const govdeBas = alan.search(/hidden-sm"><\/div>/);
  const govde = govdeBas >= 0 ? alan.slice(govdeBas) : alan.slice(alan.lastIndexOf('</ul>'));
  const paragraflar = [];
  const oy = [];
  let giris = null;
  for (const m of govde.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = metinDuz(m[1].replace(/<sup>[\s\S]*?<\/sup>/gi, ''));
    if (!t) continue;
    if (/^For media inquiries/i.test(t) || /^Implementation Note/i.test(t)) continue;
    if (/^Voting (for|against)\b/i.test(t)) {
      oy.push(t);
      continue;
    }
    if (/approved the following statement for release by a .*vote:?$/i.test(t)) {
      giris = t.replace(/:$/, '.');
      continue;
    }
    paragraflar.push(t);
  }
  if (!tarih || !baslik || paragraflar.length < 2) throw new Error('Açıklama beklenen biçimde değil');
  const oyCumlesi = oy.length ? oy.join(' ') : giris;
  return { tarih, baslik, paragraflar, ...(oyCumlesi ? { oyCumlesi } : {}) };
}

// Tutanak sayfası → { aralik, baslik, paragraflar, bolumler }. bolumler, paragraflarla aynı uzunlukta;
// her paragrafın ait olduğu ara başlık (açılış paragrafında ""). Gövde "Notation Vote"/"Attendance" başlıklarından önce biter;
// katılımcı listesi, imza ve dipnotlar alınmaz. Dipnot numaraları (<sup>) atılır.
export function tutanakAyristir(html) {
  const h = String(html);
  const bas = h.indexOf('id="article"');
  if (bas < 0) throw new Error('Tutanak içeriği bulunamadı');
  let son = h.indexOf('id="lastUpdate"', bas);
  if (son < 0) son = h.length;
  let alan = h.slice(bas, son).replace(/<sup>[\s\S]*?<\/sup>/gi, '').replace(/<a\s+name="[^"]*"\s*><\/a>/gi, '');
  const hr = alan.search(/<hr\b/i);
  if (hr >= 0) alan = alan.slice(0, hr);
  const baslik = metinDuz(alan.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '');
  const paragraflar = [];
  const bolumler = [];
  let aralik = null;
  let bolum = '';
  let atla = false; // eski biçimde katılımcı listesi başta gelir: sonraki başlığa kadar atılır
  const ekle = (t) => {
    if (!t || atla) return;
    paragraflar.push(t);
    bolumler.push(bolum);
  };
  const TARIH = /^[A-Z][a-z]+ \d{1,2}\s*[–-]|^[A-Z][a-z]+ \d{1,2},? \d{4}/;
  for (const m of alan.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const ic = m[2];
    const baslikli = ic.match(/^\s*<strong>([\s\S]*?)<\/strong>\s*<br\s*\/?>\s*([\s\S]*)$/i);
    const yalniz = ic.match(/^\s*<strong>([\s\S]*?)<\/strong>\s*$/i);
    const bs = baslikli ?? yalniz;
    if (bs) {
      const ad = metinDuz(bs[1]);
      if (!aralik && TARIH.test(ad)) {
        aralik = ad;
        if (baslikli) ekle(metinDuz(bs[2]));
        continue;
      }
      if (/^Notation Vote$/i.test(ad)) break;
      atla = /^Attendance$/i.test(ad);
      if (!atla && ad) bolum = ad;
      if (baslikli) ekle(metinDuz(bs[2]));
      continue;
    }
    const t = metinDuz(ic);
    if (/^_+$/.test(t)) break;
    ekle(t);
  }
  if (!baslik || !aralik || paragraflar.length < 10) throw new Error('Tutanak beklenen biçimde değil');
  return { aralik, baslik, paragraflar, bolumler };
}
