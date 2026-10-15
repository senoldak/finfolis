// Haber botu için ortak yardımcılar: indirme, Gemini, slug, dosya yazma.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { kullanimEkle } from './kullanim.mjs';
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

export const hentMetin = (url, { timeout = 20000 } = {}) => indir(url, { timeout });

export async function hentJson(url) {
  return JSON.parse(await indir(url, { headers: { Accept: 'application/json' } }));
}

// Ücretsiz katmanın dakikalık sınırını aşmamak için istekler arasında en az bu kadar beklenir.
const GEMINI_ARALIK_MS = Number(process.env.GEMINI_ARALIK_MS || 4500);
let sonGeminiCagri = 0;

// Gemini'ye istek atar, JSON şemasına uygun yanıt döner. Anahtar yoksa null.
export async function gemini({ sistem, istem, sema, dusunme: seviye = 'low' }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const bekle = sonGeminiCagri + GEMINI_ARALIK_MS - Date.now();
  if (bekle > 0) await sleep(bekle);
  sonGeminiCagri = Date.now();
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Düşünme seviyesi düşük tutulur; desteklemeyen modelde kapatılır.
  let dusunme = { thinkingLevel: seviye };
  for (let deneme = 1; deneme <= 3; deneme++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        ...(sistem && { systemInstruction: { parts: [{ text: sistem }] } }),
        contents: [{ role: 'user', parts: [{ text: istem }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: sema,
          ...(dusunme && { thinkingConfig: dusunme }),
        },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (res.status === 400 && dusunme && /thinking/i.test(await res.clone().text())) {
      dusunme = dusunme.thinkingLevel === 'low' ? null : { thinkingLevel: 'low' };
      deneme--;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      console.warn(`  Gemini ${res.status}, ${deneme}. deneme; bekleniyor...`);
      await sleep(20_000 * deneme);
      continue;
    }
    if (!res.ok) {
      const raw = await res.text();
      let msg = raw.slice(0, 300);
      try {
        msg = JSON.parse(raw).error?.message ?? msg;
      } catch {}
      const hata = new Error(`Gemini ${res.status}: ${msg}`);
      // Anahtar/model hatası: haberin suçu değil, haber atlanmamalı.
      hata.konfig = [400, 401, 403, 404].includes(res.status);
      throw hata;
    }
    const data = await res.json();
    kullanimEkle(data.usageMetadata);
    const metin = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return JSON.parse(metin);
  }
  throw new Error('Gemini: çok fazla deneme');
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

// YAML'da güvenli çift tırnaklı metin (JSON dizgesi geçerli YAML'dır).
const y = (s) => JSON.stringify(String(s));

// Haberi src/content/haberler/<slug>/index.md olarak yazar, slug'ı döner.
export async function yaziYaz(rot, yazi) {
  const taban = path.join(rot, 'src/content/haberler');
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
    `title: ${y(yazi.baslik)}`,
    `description: ${y(yazi.spot)}`,
    `date: ${yazi.tarih.toISOString()}`,
    `category: ${y(yazi.kategori)}`,
    `tur: ${y(yazi.tur ?? 'haber')}`,
    // Bot yazısı işareti: sitede yapay zekâ üretim notu gösterilir (panelden girilen yazılarda author alanı olur).
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
  // Tablo yalnızca kaynağı olan haberde yazılır: sayfa kaynak ve tarih satırını bu kaynaklardan alır.
  if (yazi.tablo && kaynaklar.length) fm.push(`tablo: ${JSON.stringify(yazi.tablo)}`);
  if (yazi.grafik && kaynaklar.length) fm.push(`grafik: ${JSON.stringify(yazi.grafik)}`);
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
  await writeFile(path.join(taban, slug, 'index.md'), `${fm.join('\n')}\n\n${String(yazi.govde).trim()}\n`, 'utf8');
  return slug;
}

// Kaynaklar kapağın tarifini verir (kapak.mjs türleri: { svg, katmanlar } döndüren fonksiyon);
// hazır PNG veren fonksiyon da kabul edilir.
async function kapakPng(kapak) {
  const sonuc = await kapak();
  return Buffer.isBuffer(sonuc) ? sonuc : kapakCiz(async () => sonuc);
}
