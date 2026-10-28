// TCMB PPK duyuru sayfalarını ayrıştırır: yıllık duyuru listesi, karar/özet metni, cümle bölme, faiz kararı.
// Saf işlevler: ağa ya da dosyaya dokunmaz (indirme scripts/veri/ppk-metinler.mjs'te).

export const TCMB_TABAN = 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin';

const AYLAR = { ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6, temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12 };

const VARLIKLAR = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };

export function varlikCoz(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, ad) => VARLIKLAR[ad.toLowerCase()] ?? m);
}

// Etiketleri atar, boşlukları (nbsp dahil) tek boşluğa indirir.
export function duzMetin(html) {
  return varlikCoz(String(html).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''))
    .replace(/[\s ​]+/g, ' ')
    .trim();
}

// "22 Ekim 2026" → "2026-10-22"; ayrıştırılamazsa null.
export function trTarih(metin) {
  const m = duzMetin(metin).match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (!m) return null;
  const ay = AYLAR[m[2].toLocaleLowerCase('tr')];
  if (!ay) return null;
  return `${m[3]}-${String(ay).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function tur(baslik) {
  const b = duzMetin(baslik);
  if (/^Faiz Oranlarına İlişkin Basın Duyurusu\s*\(/.test(b)) return 'karar';
  if (/^Para Politikası Kurulu Toplantı Özeti\s*\(/.test(b)) return 'ozet';
  return null;
}

// Yıllık duyuru listesinden PPK karar ve özet duyurularını süzer; başlıkla doğrulanır.
export function listedenBelgeler(html, yil) {
  const bulunan = new Map();
  const re = /<a\b[^>]*href="[^"]*\/Basin\/(\d{4})\/DUY(\d{4})-(\d+)"[^>]*title="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const [, klasor, yilNo, no, baslik] = m;
    if (Number(klasor) !== yil || Number(yilNo) !== yil) continue;
    const t = tur(baslik);
    if (!t) continue;
    const kod = `${yil}-${no}`;
    bulunan.set(kod, { kod, tur: t, baslik: duzMetin(baslik).replace(/\s*\(\d{4}-\d+\)\s*$/, ''), url: `${TCMB_TABAN}/${yil}/DUY${yil}-${no}` });
  }
  return [...bulunan.values()];
}

// Duyuru sayfasının ana içeriğinden etiketli blokları sırayla alır.
function bloklar(html) {
  const bas = html.indexOf('class="tcmb-content');
  if (bas < 0) return [];
  let son = html.indexOf('<div><a target', bas);
  if (son < 0) son = html.length;
  const parca = html.slice(bas, son);
  const out = [];
  const re = /<(p|h2|h3|h4|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(parca))) {
    const metin = duzMetin(m[2]);
    if (metin) out.push({ etiket: m[1].toLowerCase(), metin });
  }
  return out;
}

// Sayfayı { sayi, tarih, baslik, toplantiTarihi, uyeler, bolumler, paragraflar } olarak çıkarır.
// paragraflar: yalnız metnin gövdesi (sayı, tarih, başlık, üye listesi, "1." numaraları yok).
// bolumler: paragrafla aynı uzunlukta, her paragrafın ait olduğu ara başlık (karar metninde "").
export function belgeAyristir(html) {
  const b = bloklar(html);
  if (!b.length) throw new Error('Duyuru içeriği bulunamadı');
  const s = { sayi: null, tarih: null, baslik: null, toplantiTarihi: null, uyeler: null, bolumler: [], paragraflar: [] };
  let bolum = '';
  let uyeBekle = false;
  for (const { etiket, metin } of b) {
    if (etiket === 'h2' && !s.baslik) { s.baslik = metin; continue; }
    if (etiket === 'h3') {
      if (/^Toplantıya Katılan Kurul Üyeleri/i.test(metin)) { uyeBekle = true; continue; }
      bolum = metin;
      continue;
    }
    if (!s.sayi && /^Sayı:\s*\d{4}-\d+/.test(metin)) { s.sayi = metin.replace(/^Sayı:\s*/, ''); continue; }
    if (!s.tarih && !s.paragraflar.length && /^\d{1,2}\s+\S+\s+\d{4}$/.test(metin)) { s.tarih = trTarih(metin); continue; }
    if (/^Toplantı Tarihi:/i.test(metin)) { s.toplantiTarihi = trTarih(metin); continue; }
    if (uyeBekle) { s.uyeler = metin; uyeBekle = false; continue; }
    const govde = metin.replace(/^\d{1,2}\.\s+/, '');
    if (!govde || govde === 'Kamuoyunun bilgisine sunulur.') continue;
    s.paragraflar.push(govde);
    s.bolumler.push(bolum);
  }
  if (!s.baslik || !s.tarih || s.paragraflar.length < 2) throw new Error('Duyuru beklenen biçimde değil');
  return s;
}

// Türkçe cümle bölme. Bölünmeyenler: kısaltmalar (Dr., No., yy. …), sayı içi noktalar, küçük harfle süren metin.
const BOLME_YOK = new Set(['dr', 'prof', 'doç', 'no', 'sn', 'sh', 'yy', 'st', 'bkz', 'örn', 'mah', 'cad', 'tel', 'yak', 'vd']);
const BUYUK = /[A-ZÇĞİÖŞÜ0-9“"‘'(\[]/;

export function cumleBol(paragraf) {
  const metin = String(paragraf).replace(/\s+/g, ' ').trim();
  if (!metin) return [];
  const out = [];
  let bas = 0;
  const re = /[.!?…]+[”"’')\]]*\s+/g;
  let m;
  while ((m = re.exec(metin))) {
    const sonraki = metin.slice(re.lastIndex);
    if (!sonraki || !BUYUK.test(sonraki[0])) continue;
    const onceki = metin.slice(bas, m.index);
    const kelime = onceki.match(/([\p{L}]+)$/u)?.[1]?.toLocaleLowerCase('tr');
    // Tek harf (baş harf) ya da bilinen kısaltma: bölme. "vb." ve "vs." büyük harf öncesi cümle sonudur.
    if (kelime && (BOLME_YOK.has(kelime) || (kelime.length === 1 && /[A-ZÇĞİÖŞÜ]$/.test(onceki)))) continue;
    out.push(metin.slice(bas, m.index + m[0].trimEnd().length).trim());
    bas = re.lastIndex;
  }
  const kalan = metin.slice(bas).trim();
  if (kalan) out.push(kalan);
  return out;
}

const sayi = (s) => Number(String(s).replace(',', '.'));

const REPO = String.raw`bir hafta vadeli repo ihale faiz oran[ıi]\S*[^.]*?yüzde\s+(\d+(?:,\d+)?)`;
const DEGISIM = new RegExp(REPO + String.raw`[’']?(?:den|dan|ten|tan)\s+yüzde\s+(\d+(?:,\d+)?)`, 'i');
const SABIT = new RegExp(REPO, 'i');

// Karar metninden politika faizi kararı: { onceki, yeni, karar: 'indirim'|'artis'|'sabit' } ya da null.
export function faizKarari(cumleler) {
  const metin = (Array.isArray(cumleler) ? cumleler : [cumleler]).join(' ');
  const d = DEGISIM.exec(metin);
  if (d) {
    const onceki = sayi(d[1]);
    const yeni = sayi(d[2]);
    return { onceki, yeni, karar: yeni < onceki ? 'indirim' : yeni > onceki ? 'artis' : 'sabit' };
  }
  const sb = SABIT.exec(metin);
  if (sb && /sabit/i.test(metin.slice(sb.index, sb.index + 300))) {
    const o = sayi(sb[1]);
    return { onceki: o, yeni: o, karar: 'sabit' };
  }
  return null;
}
