// Kaynak: mecmua/site-ortak/baslik/baslik-duzeni.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// "Her Kelimesi Büyük" başlığı cümle düzenine çevirir (18.11.2026: ~50 haberde model İngilizce başlık alışkanlığıyla
// yazıyordu). Özel ad tahmin edilmez, metinden okunur: bir kelime gövdede cümle ortasında büyük harfle geçiyorsa
// özel addır ve büyük kalır; geçmiyorsa küçülür. Kısaltmalar (ABD, CEO), iç büyük harfli adlar (iPhone, xAI) ve
// sayıyla başlayanlar olduğu gibi kalır. Başlık zaten cümle düzenindeyse dokunulmaz.

const KUCUK = new Set(['ve', 'ile', 'ya', 'da', 'de', 'mi', 'mı', 'mu', 'mü', 'veya', 'ki']);
const harf = /\p{L}/u;
// Bültenlerin ara başlıklarında sık büyük yazıldığı için özel ad sanılan sıradan kelimeler.
const SIRADAN = new Set(['küresel', 'yapay', 'şirket', 'faiz', 'halka', 'üst', 'yöneticisi', 'üyesi', 'piyasalar']);
const AYLAR = new Set(['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık']);

const buyukMu = (w) => harf.test(w[0] ?? '') && w[0] === w[0].toLocaleUpperCase('tr-TR') && w[0] !== w[0].toLocaleLowerCase('tr-TR');
const kok = (w) => w.split(/['’]/)[0];

/** Başlığın büyük harfle başlayan kelime oranı (ilk kelime hariç, bağlaçlar sayılmaz). enAz: en az içerik kelimesi. */
export function baslikDuzeniMi(baslik, enAz = 5) {
  const k = String(baslik).split(/\s+/).filter((w) => harf.test(w[0] ?? '') && !KUCUK.has(w.toLocaleLowerCase('tr-TR')));
  if (k.length < enAz) return false;
  return k.slice(1).filter(buyukMu).length / (k.length - 1) >= 0.7;
}

// Metindeki özel adlar: cümle ortasında büyük harfle geçen kökler; cümle başında büyük geçip metinde hiç küçük
// geçmeyenler de ("Kanada verileri..." gibi) özel sayılır.
function ozelKokler(metin) {
  const set = new Set();
  const basta = new Set();
  const kucukler = new Set();
  const temiz = (t) => kok(t.replace(/^[("“«]+/, '')).replace(/[),.;:!?"”»]+$/, '');
  const cumleler = String(metin).replace(/[#*_>`]/g, ' ').split(/(?<=[.!?:])\s+|\n+/);
  for (const c of cumleler) {
    const w = c.trim().split(/\s+/);
    for (let i = 0; i < w.length; i++) {
      const t = temiz(w[i]);
      if (!t) continue;
      if (buyukMu(t)) (i === 0 ? basta : set).add(t);
      else kucukler.add(t.toLocaleLowerCase('tr-TR'));
    }
  }
  for (const t of basta) if (!kucukler.has(t.toLocaleLowerCase('tr-TR'))) set.add(t);
  return set;
}

/**
 * @param {string} baslik
 * @param {string} metin gövde + özet (özel adları tanımak için)
 * @param {{ enAz?: number, araBaslik?: boolean }} [secenek] enAz: en az içerik kelimesi (başlıkta 5, ara başlıkta 3).
 *   araBaslik: kesmeyle çekimlenmiş kelime (Kore'de) her zaman özel sayılır. Temkinli kural (26 Kasım 2026): şüphede
 *   büyük kalır. Gövdede yalnız cümle başında geçen sıradan kelime ("Makroekonomik") büyük kalabilir; tersine, yalnız
 *   cümle ortasındakileri özel saymak "Euro", "Ukrayna" gibi gerçek adları küçültüyordu (220 başlıklık denemede).
 * @returns {string}
 */
export function cumleDuzeni(baslik, metin = '', { enAz = 5, araBaslik = false } = {}) {
  if (!baslikDuzeniMi(baslik, enAz)) return baslik;
  const ozel = ozelKokler(metin);
  let bolumBasi = true;
  let oncekiSayi = false;
  return String(baslik)
    .split(/(\s+)/)
    .map((p) => {
      if (/^\s+$/.test(p) || p === '') return p;
      const ilk = bolumBasi;
      const sayidanSonra = oncekiSayi;
      oncekiSayi = /^\d+[.,]?$/.test(p);
      // Belirli tarihte ay adı büyük kalır (TDK): "20 Ekim".
      if (sayidanSonra && AYLAR.has(p.replace(/[,.;:]+$/, '').toLocaleLowerCase('tr-TR'))) {
        bolumBasi = false;
        return p;
      }
      // "·", "—", ":" sonrası yeni bölüm: bülten başlığının tarih kısmı ve alt başlık büyük başlar.
      bolumBasi = /[·—–:]$/.test(p) || p === '·' || p === '—' || p === '–';
      if (ilk || !buyukMu(p)) return p;
      const sade = p.replace(/[),.;:!?"”»]+$/, '');
      if (sade.length > 1 && sade === sade.toLocaleUpperCase('tr-TR')) return p; // ABD, CEO, TÜFE
      if (/\p{Lu}/u.test(sade.slice(1).split(/['’]/)[0])) return p; // iPhone değil ama McDonald, OpenAI gibi
      if (ozel.has(kok(sade)) && !SIRADAN.has(kok(sade).toLocaleLowerCase('tr-TR'))) return p;
      if (araBaslik && /['’]\p{L}/u.test(sade)) return p; // Singapur'un, Kore'de: kesmeyle çekim özel ad işaretidir
      return p.charAt(0).toLocaleLowerCase('tr-TR') + p.slice(1);
    })
    .join('');
}

/**
 * Gövdedeki ##–#### ara başlıkları cümle düzenine çevirir (26 Kasım 2026: finfolis haberlerinde "### Operasyonun Boyutları
 * ve Uluslararası İş Birliği" gibi İngilizce alışkanlıklı başlıklar). En az 3 içerik kelimeli "Her Kelimesi Büyük" başlık
 * değişir; kısa ya da zaten cümle düzenindeki başlığa dokunulmaz. Özel adlar başlık satırları çıkarılmış gövdeden okunur
 * (başlığın kendi büyük harfleri özel ad sanılmasın).
 */
export function araBasliklariDuzenle(govde, ekMetin = '') {
  const g = String(govde ?? '');
  if (!/^#{2,4}[ \t]/m.test(g)) return govde;
  const metin = `${g.replace(/^#{1,6}[ \t].*$/gm, '')}\n${ekMetin}`;
  return g.replace(/^(#{2,4}[ \t]+)(.+?)([ \t]*)$/gm, (_, isaret, b, son) => isaret + cumleDuzeni(b, metin, { enAz: 3, araBaslik: true }) + son);
}
