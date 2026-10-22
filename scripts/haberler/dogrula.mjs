// Yapay zekâsız doğrulama: haberdeki her rakam ve alıntı kaynak metinde bulunmalı.
// Şüphede "eksik" işaretlenir; yanlış alarm güvenlidir, kaçan uydurma rakam değildir.

const AYLAR = 'ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık';
const SAYI_RE = /[-−–]?\d[\d.,]*\d|[-−–]?\d/g;

// Tarih ifadelerini (12.10.2026, 12 Ekim 2026) rakam denetiminden çıkarır.
function tarihleriAt(metin) {
  return metin
    .replace(/(?<![\d.,])\d{1,2}[./]\d{1,2}[./]\d{2,4}(?![\d,])/g, ' ')
    .replace(new RegExp(String.raw`(?<![\d.,])\d{1,2}\s+(?:${AYLAR})(?:\s+\d{4})?`, 'gi'), ' ');
}

const noktaUcRakam = (s) => /^\d{1,3}(\.\d{3})+$/.test(s);

// Haber (Türkçe) biçimi: tek yorum. Dönüş: { deger, hane } veya null.
function turkceCoz(tok) {
  const s = tok.replace(/^[-−–]/, '');
  const neg = s !== tok;
  let deger, hane = 0;
  if (s.includes(',')) {
    const [tam, kesir] = [s.slice(0, s.lastIndexOf(',')), s.slice(s.lastIndexOf(',') + 1)];
    deger = Number(tam.replace(/\./g, '') + '.' + kesir);
    hane = kesir.length;
  } else if (noktaUcRakam(s)) {
    deger = Number(s.replace(/\./g, ''));
  } else {
    deger = Number(s);
    hane = s.includes('.') ? s.split('.').pop().length : 0;
  }
  if (!Number.isFinite(deger)) return null;
  return { deger: neg ? -deger : deger, hane };
}

// Kaynak (Türkçe veya İngilizce) biçimi: olası tüm yorumlar.
// onceki/sonraki: belirtecin hemen çevresindeki karakterler (JSON listesi ayrımı için).
function kaynakAdaylari(tok, onceki = '', sonraki = '') {
  const s = tok.replace(/^[-−–]/, '');
  const adaylar = new Set();
  const ekle = (x) => Number.isFinite(x) && adaylar.add(x);
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    ekle(Number(s.replace(/,/g, ''))); // İngilizce binlik: 1,234.5
  } else if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    ekle(Number(s.replace(/\./g, '').replace(',', '.'))); // Türkçe: 1.234,5
  } else if (s.includes(',')) {
    // Liste olabilir ([1,5], [49.1,49.2]): her parçayı ayrı say
    for (const parca of s.split(',')) for (const a of kaynakAdaylari(parca)) adaylar.add(a);
    // Düz "49,17": listede değilse Türkçe ondalık da olabilir
    if (/^\d+,\d+$/.test(s) && !/[\[\](]/.test(onceki) && !/[\]\)]/.test(sonraki)) {
      ekle(Number(s.replace(',', '.')));
    }
  } else if (/^\d+\.\d+$/.test(s)) {
    ekle(Number(s));
    if (/^\d{1,3}\.\d{3}$/.test(s)) ekle(Number(s.replace('.', ''))); // 49.173 -> 49173 da olabilir
  } else if (/^\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    ekle(Number(s.replace(/\./g, '')));
  } else {
    ekle(Number(s));
  }
  return [...adaylar];
}

export function sayilariBul(metin) {
  const out = [];
  for (const [tok] of String(metin).matchAll(SAYI_RE)) {
    const c = turkceCoz(tok);
    if (c) out.push(c.deger);
  }
  return out;
}

export function alintilariBul(metin) {
  const out = [];
  for (const m of String(metin).matchAll(/"([^"]+)"|“([^”]+)”|‘([^’]+)’|«([^»]+)»|„([^“”]+)[“”]/g)) out.push((m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]).trim());
  return out.filter(Boolean);
}

const norm = (s) => s.toLocaleLowerCase('tr').replace(/[“”„"]/g, '"').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

// tolerans artık kullanılmaz: eşik haberin kendi yuvarlama adımıdır (imza uyumu için duruyor)
export function dogrula(metin, kaynakMetinleri, _secenekler = {}) {
  const eksik = [];
  const kaynaklar = kaynakMetinleri.map(String);

  // Kaynak sayı havuzu (mutlak değer; yön kelimeyle de anlatılabilir)
  const havuz = [];
  for (const k of kaynaklar) {
    for (const m of k.matchAll(SAYI_RE)) {
      const onceki = k[m.index - 1] ?? '';
      const sonraki = k[m.index + m[0].length] ?? '';
      for (const a of kaynakAdaylari(m[0], onceki, sonraki)) havuz.push(Math.abs(a));
    }
  }

  // Alıntılar: kaynakta aynen geçmeli
  const alintilar = alintilariBul(metin);
  const kaynakNorm = kaynaklar.map(norm);
  for (const a of alintilar) {
    if (!kaynakNorm.some((k) => k.includes(norm(a)))) eksik.push(`"${a}"`);
  }

  // Sayılar
  const temiz = tarihleriAt(String(metin));
  for (const m of temiz.matchAll(SAYI_RE)) {
    const tok = m[0];
    const c = turkceCoz(tok);
    if (!c) continue;
    const ham = tok.replace(/^[-−–]/, '');
    if (/^\d{4}$/.test(ham) && c.deger >= 1900 && c.deger <= 2100) {
      // Yıl yalnızca "yıl..." veya ay adı yanındaysa muaf; "ons altın 2050 dolar" muaf değil
      const once = temiz.slice(0, m.index);
      const sonra = temiz.slice(m.index + tok.length);
      if (/^\s*yıl/i.test(sonra) || new RegExp(String.raw`(?:${AYLAR})\s+$`, 'i').test(once)) continue;
    }
    const hedef = Math.abs(c.deger);
    // Tolerans haberin kendi yuvarlama adımıyla sınırlı: son hanenin yarısı
    const adim = 0.5 * 10 ** -c.hane + 1e-9;
    const bulundu = havuz.some((v) => Math.abs(v - hedef) <= adim);
    if (!bulundu) eksik.push(ham);
  }
  return { tamam: eksik.length === 0, eksik };
}
