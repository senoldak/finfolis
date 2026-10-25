// Haber botu için ortak yardımcılar: indirme, Gemini, slug, dosya yazma.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { geminiCagir } from './istemci.mjs';
import { kapakCiz } from '../kapak/kapak.mjs';

export const USER_AGENT = 'finfolis-haber-botu (+https://finfolis.com)';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bir kez yeniden deneyen, 2xx dışında hata fırlatan indirme.
async function indir(url, { timeout = 20000, headers = {} } = {}) {
  let sonHata;
  for (let deneme = 1; deneme <= 2; deneme++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, ...headers },
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      return await res.text();
    } catch (e) {
      sonHata = e;
      if (deneme < 2) await sleep(500);
    }
  }
  throw sonHata;
}

export const hentMetin = (url, { timeout = 20000, headers } = {}) => indir(url, { timeout, headers });

export async function hentJson(url) {
  return JSON.parse(await indir(url, { headers: { Accept: 'application/json' } }));
}

// Ücretsiz katmanın dakikalık sınırını aşmamak için istekler arasında en az bu kadar beklenir.
// Çıkış tavanı (ücretsiz plan denetimi A2, 21 Ekim): tavansız çağrıda model bazen 170–270 KB bozuk JSON üretip
// 125–145 sn ve 1 günlük istek yaktı. En uzun meşru yanıt (kontrol masası) ~8,5K token; 16K hem onu sığdırır
// hem kaçak yanıtı beşte birine keser. Tavana çarpan yanıt bir kez yeniden denenir; yine çarparsa "bozuk" sayılır ve aynı aday yeniden denenmez.
const GEMINI_MAKS_CIKIS = Number(process.env.GEMINI_MAKS_CIKIS || 16384);

// Katman 4 (Gemini kota planı): ücretsiz katmanda Flash günde 20 çağrı, Gemma 26B 14.400 (dakikada 16 bin token).
// Denemede (2026-10-17) Gemma denetim kararlarında Flash Lite kadar isabetliydi, puanlamada çok daha sıkıydı;
// bu yüzden yalnız evet/hayır denetimlerinde yedektir.
export const DENETIM_YEDEK_MODEL = 'gemma-4-26b-a4b-it';

// Gemini'ye istek atar, JSON şemasına uygun yanıt döner; anahtar yoksa null. Model zinciri, yeniden deneme, bütçe ve
// gölge ortak çekirdekte (istemci.mjs, yönlendirici Faz 1); burada yalnız bu sitenin imzası ve ayarı.
// denetim: evet/hayır denetim çağrısı; zincirin son halkası Gemma.
export function gemini({ sistem, istem, sema, dusunme = 'low', denetim = false, _model = null, _amac = null }) {
  return geminiCagir({ sistem, istem, sema, dusunme, denetim, _model, _amac }, { sicaklik: 0.3, maksCikis: GEMINI_MAKS_CIKIS, ayarAlani: 'konfig' });
}

// Türkçe harfleri ASCII'ye çeviren slug.
export function slugla(baslik) {
  return String(baslik)
    .replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
    .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

// Gövdedeki HTML etiketleri ve yorumları atılır, içlerindeki metin kalır. Markdown ham HTML'i olduğu gibi sayfaya
// basar; model çıktısı kaynak metinden etiket taşırsa yayımlanan sayfaya bağlantı ya da işaretleme eklenmesin.
// Yalnız etiket biçimi ("<ad", "</ad" + boşluk, "/" ya da ">") silinir: "3 < 5" ve <https://…> otomatik bağlantıları kalır.
// http(s)/mailto dışında şema taşıyan bağlantılar (javascript:, data: …) düşer: otomatik bağlantı tümüyle, Markdown
// bağlantısında metni kalır. Markdown adresteki "&#58;" gibi karakter referanslarını çözdüğü için "&" de şema sayılır.
const guvenliAdres = (url) => /^(?:https?:\/\/|mailto:)/i.test(url) || !/^[^/?#]*[:&]/.test(url);
export const htmlSok = (metin) =>
  String(metin)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>/gi, '')
    .replace(/\[([^\]]*)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))*)>?[^)]*\)/g, (m, txt, url) => (guvenliAdres(url) ? m : txt))
    .replace(/<([a-z][a-z0-9+.-]*:[^\s<>]*)>/gi, (m, url) => (guvenliAdres(url) ? m : ''));

// Başlığın ilk sözcüğü büyük harfle başlar (Türkçe kurallarla: i -> İ, ı -> I). İlk sözcük bilinen bir kısaltmaysa
// ("abd'de", "İmf'den") tümü büyütülür: "ABD'de", "IMF'den". Model bazen başlığı küçük harfle bırakıyordu.
const KISALTMALAR = new Set(['abd', 'ab', 'imf', 'ecb', 'tcmb', 'bist', 'etf', 'gsyh', 'tüfe', 'üfe', 'opec', 'nato', 'bddk', 'spk', 'kdv', 'ötv', 'btc', 'eth', 'sec']);
export function baslikBuyut(baslik) {
  const b = String(baslik ?? '').trim();
  const ilk = b.match(/^\p{L}+/u)?.[0];
  // "eBay", "iPhone" gibi içinde büyük harf olan adlar olduğu gibi kalır.
  if (!ilk || /\p{Lu}/u.test(ilk.slice(1))) return b;
  const kucuk = ilk.toLocaleLowerCase('tr');
  const bas = KISALTMALAR.has(kucuk) ? kucuk.toLocaleUpperCase('en-US') : ilk[0].toLocaleUpperCase('tr') + ilk.slice(1);
  return bas + b.slice(ilk.length);
}

// YAML'da güvenli çift tırnaklı metin (JSON dizgesi geçerli YAML'dır).
const y = (s) => JSON.stringify(String(s));

// Haberi src/content/haberler/<slug>/index.md olarak yazar, slug'ı döner.
export async function yaziYaz(rot, yazi) {
  const taban = path.join(rot, 'src/content/haberler');
  const baslik = baslikBuyut(yazi.baslik);
  const temel = slugla(yazi.baslik) || 'haber';
  let slug = temel;
  for (let i = 2; ; i++) {
    try {
      await access(path.join(taban, slug));
      slug = `${temel}-${i}`;
    } catch {
      break;
    }
  }
  const fm = [
    '---',
    `title: ${y(baslik)}`,
    `description: ${y(yazi.spot)}`,
    `date: ${yazi.tarih.toISOString()}`,
    `category: ${y(yazi.kategori)}`,
    `tur: ${y(yazi.tur ?? 'haber')}`,
    // İçerik türü (veri | arastirma | resmi): okura yazının neye dayandığını söyler (bkz. icerik-turu.mjs).
    ...(yazi.icerikTuru ? [`icerikTuru: ${y(yazi.icerikTuru)}`] : []),
    // Bot yazısı işareti: sitede yapay zekâ üretim notu gösterilir (elle girilen yazılarda author alanı olur).
    'uretim: "bot"',
  ];
  const kaynaklar = yazi.kaynaklar ?? [];
  if (kaynaklar.length) {
    fm.push('kaynaklar:');
    for (const k of kaynaklar) fm.push(`  - ad: ${y(k.ad)}`, `    url: ${y(k.url)}`);
  } else {
    fm.push('kaynaklar: []');
  }
  // Resmi olmayan kaynakların şifreli kaydı (bkz. gizli.mjs); sitede gösterilmez.
  if (yazi.kaynakIzi) fm.push(`kaynakIzi: ${y(yazi.kaynakIzi)}`);
  if (yazi.rakamlar?.length) {
    fm.push('rakamlar:');
    for (const r of yazi.rakamlar) fm.push(`  - etiket: ${y(r.etiket)}`, `    deger: ${y(r.deger)}`);
  }
  if (yazi.sirada?.tarih && yazi.sirada?.olay) fm.push('sirada:', `  tarih: ${y(yazi.sirada.tarih)}`, `  olay: ${y(yazi.sirada.olay)}`);
  // Tablo ve grafiğin her satırı yayın kurulunda kaynak metinde doğrulanır (tabloKaynaktaMi, grafikKaynaktaMi).
  // Kaynak gizliyse (kaynaklar boş) sayfa kaynak bağlantısı yerine yalnız tarihi gösterir.
  if (yazi.tablo) fm.push(`tablo: ${JSON.stringify(yazi.tablo)}`);
  if (yazi.grafik) fm.push(`grafik: ${JSON.stringify(yazi.grafik)}`);
  if (yazi.why_matters) fm.push(`why_matters: ${y(yazi.why_matters)}`);
  if (yazi.key_points?.length) {
    fm.push('key_points:');
    for (const p of yazi.key_points) fm.push(`  - ${y(p)}`);
  }
  // Kapak, klasör açılmadan önce çizilir: çizim hata verirse boş klasör kalmaz.
  const png = yazi.kapak ? await kapakPng(yazi.kapak) : null;
  await mkdir(path.join(taban, slug), { recursive: true });
  if (png) {
    await writeFile(path.join(taban, slug, 'kapak.png'), png);
    fm.push('cover: kapak.png');
    if (yazi.kapakAlt) fm.push(`coverAlt: ${y(yazi.kapakAlt)}`);
    // Başlığı tekrar eden metin kartı: sitede gösterilmez, og:image ve Telegram'da kullanılır.
    if (yazi.kapakSitede === false) fm.push('coverSitede: false');
  }
  fm.push('---');
  await writeFile(path.join(taban, slug, 'index.md'), `${fm.join('\n')}\n\n${htmlSok(yazi.govde).trim()}\n`, 'utf8');
  return slug;
}

// Kaynaklar kapağın tarifini verir (kapak.mjs türleri: { svg, katmanlar } döndüren fonksiyon);
// hazır PNG veren fonksiyon da kabul edilir.
async function kapakPng(kapak) {
  const sonuc = await kapak();
  return Buffer.isBuffer(sonuc) ? sonuc : kapakCiz(async () => sonuc);
}
