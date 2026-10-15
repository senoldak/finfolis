// Kaynak modüllerinin ortak yardımcıları: küçük RSS/Atom ayrıştırıcıları ve HTML -> düz metin.
// Bağımlılık yok; regex ile yeterince sağlam olacak kadar basit tutuldu.

const VARLIKLAR = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };

export function varlikCoz(s) {
  return String(s).replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (tam, d, h, ad) => {
    if (d) return String.fromCodePoint(Number(d));
    if (h) return String.fromCodePoint(parseInt(h, 16));
    return VARLIKLAR[ad.toLowerCase()] ?? tam;
  });
}

// CDATA'yı açar, varlıkları çözer, boşlukları sadeleştirir.
export function metinTemizle(s) {
  return varlikCoz(String(s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
    .replace(/\s+/g, ' ')
    .trim();
}

function etiketIcerik(blok, ad) {
  const m = blok.match(new RegExp(`<${ad}(?:\\s[^>]*)?>([\\s\\S]*?)</${ad}>`, 'i'));
  return m ? metinTemizle(m[1]) : '';
}

// RSS 2.0 <item> listesi: { baslik, url, tarih: Date, aciklama, kategori }. Bozuk kayıt atlanır.
export function rssOgeleri(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    try {
      const baslik = etiketIcerik(m[1], 'title');
      const url = etiketIcerik(m[1], 'link') || etiketIcerik(m[1], 'guid');
      // RSS 2.0 pubDate; RSS 1.0/RDF dc:date ve Atom updated yedek olarak kabul edilir.
      const tarih = new Date(etiketIcerik(m[1], 'pubDate') || etiketIcerik(m[1], 'dc:date') || etiketIcerik(m[1], 'updated'));
      if (!baslik || !/^https?:\/\//.test(url) || Number.isNaN(tarih.getTime())) continue;
      out.push({ baslik, url, tarih, aciklama: etiketIcerik(m[1], 'description'), kategori: etiketIcerik(m[1], 'category') });
    } catch {
      // tek kayıt bozuksa atlanır
    }
  }
  return out;
}

// Atom <entry> listesi: { baslik, url, tarih: Date, ozet, kimlik, tur }. Bozuk kayıt atlanır.
export function atomGirdileri(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
    try {
      const baslik = etiketIcerik(m[1], 'title');
      const url = varlikCoz(m[1].match(/<link\b[^>]*\bhref="([^"]+)"/i)?.[1] ?? '');
      const tarih = new Date(etiketIcerik(m[1], 'updated'));
      const kimlik = etiketIcerik(m[1], 'id');
      const tur = m[1].match(/<category\b[^>]*\bterm="([^"]+)"/i)?.[1] ?? '';
      if (!baslik || !url || !kimlik || Number.isNaN(tarih.getTime())) continue;
      out.push({ baslik, url, tarih, ozet: metinTemizle(varlikCoz(etiketIcerik(m[1], 'summary')).replace(/<[^>]*>/g, ' ')), kimlik, tur });
    } catch {
      // tek kayıt bozuksa atlanır
    }
  }
  return out;
}

// HTML sayfasını düz metne çevirir (script/style atılır).
export function htmlMetni(html) {
  return metinTemizle(
    String(html)
      .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>/g, ' '),
  );
}

// Türkçe ondalık biçimi: 3.5 -> "3,5"
export const trSayi = (n, hane) => (hane == null ? String(n) : Number(n).toFixed(hane)).replace('.', ',');
