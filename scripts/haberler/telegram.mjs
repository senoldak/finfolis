// Yeni yazıları Telegram kanalına kapak resmiyle gönderir (kifobu'daki haber-telegram-gonder.ts'in karşılığı).
// Kullanım: node scripts/haberler/telegram.mjs (haber botu iş akışı çağırır; bkz. .github/workflows/haberler.yml)
// Ortam değişkenleri: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (ör. @finfolis; eski ad TELEGRAM_KANAL da kabul edilir).
// Eksikse sessizce atlanır. Yalnız indekslenebilir (noindex olmayan) yazılar gider; her yazı bir kez.
// Bir yazı ancak sitede yayına girdikten sonra gönderilir (bağlantı 200 dönmeli), kanala kırık link gitmez.
import path from 'node:path';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { indekslenir } from '../../src/lib/uzunluk.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const DURUM = path.join(HER, 'telegram-gonderilen.json');
const SITE = 'https://finfolis.com';
const AZAMI = 12; // bir çalıştırmada kanala en fazla bu kadar yazı (botun vardiya başına sınırı kadar)
const BEKLE_MS = 20_000;
const AZAMI_BEKLEME = 8 * 60_000;

// Telegram'dan siteye giden bağlantılara UTM eklenir (kampanya: haber ya da bulten).
export function telegramLink(slug, tur) {
  const u = new URL(`${SITE}/haber/${slug}/`);
  u.searchParams.set('utm_source', 'telegram');
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', tur === 'bulten' ? 'bulten' : 'haber');
  return u.href;
}

// Telegram açıklaması (fotoğraf altı en fazla 1024 karakter).
export function aciklamaYaz({ baslik, spot, slug, tur, maddeler }) {
  const link = telegramLink(slug, tur);
  const bas = `🧮 ${baslik}\n\n`;
  const son = `\n\n🔗 ${link}`;
  const yer = 1024 - bas.length - son.length;
  let metin = spot ?? '';
  if (tur === 'bulten' && maddeler?.length) {
    metin = maddeler.slice(0, 3).map((m) => `• ${m}`).join('\n');
  }
  const ozet = metin.length > yer ? `${metin.slice(0, yer - 1).trimEnd()}…` : metin;
  return `${bas}${ozet}${son}`;
}

// Bülten gövdesinden bölge bölümlerinin (Göstergeler hariç) ilk 3 madde satırı, Markdown'ı düz metne çevrilmiş.
export function bultenMaddeleri(govde, adet = 3) {
  const maddeler = [];
  let bolum = '';
  for (const satir of govde.split(/\r?\n/)) {
    const b = satir.match(/^##\s+(.+?)\s*$/);
    if (b) { bolum = b[1]; continue; }
    if (bolum === 'Göstergeler' || !satir.startsWith('- ')) continue;
    // Telegram düz metin gönderilir: "(Ayrıntı)" bağlantıları atılır, diğer bağlantılar ve **kalın**/__kalın__ işaretleri temizlenir.
    maddeler.push(satir.slice(2).replace(/\s*\(\[[^\]]+\]\([^)]*\)\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/(\*\*|__)(.+?)\1/g, '$2').trim());
    if (maddeler.length >= adet) break;
  }
  return maddeler;
}

// İçerik klasöründeki yazılar, yeniden eskiye.
export async function yazilariOku(rot = ROT) {
  const taban = path.join(rot, 'src/content/haberler');
  const liste = [];
  for (const d of await readdir(taban, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const md = await readFile(path.join(taban, d.name, 'index.md'), 'utf8').catch(() => null);
    const fm = md?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const v = parse(fm[1]);
    if (v.draft) continue;
    const kapak = v.cover ? path.join(taban, d.name, v.cover) : null;
    // Noindex kuralı sitedeki haber sayfasıyla aynı (src/lib/uzunluk.mjs): kısa yazı kanala da gitmez.
    liste.push({ slug: d.name, baslik: v.title, spot: v.description, tarih: new Date(v.date), kapak, tur: v.tur,
      indekslenebilir: indekslenir(md),
      maddeler: v.tur === 'bulten' ? bultenMaddeleri(md.slice(fm[0].length)) : undefined });
  }
  return liste.sort((a, b) => b.tarih - a.tarih);
}

// Gönderilecekler: indekslenebilir, hiç gönderilmemiş en yeni AZAMI yazı, eskiden yeniye (kanalda sıra doğru görünsün).
export function sec(yazilar, gonderilen, azami = AZAMI) {
  return yazilar.filter((y) => y.indekslenebilir && !gonderilen[y.slug]).slice(0, azami).reverse();
}

async function yayindaMi(slug) {
  const bitis = Date.now() + AZAMI_BEKLEME;
  while (Date.now() < bitis) {
    const r = await fetch(`${SITE}/haber/${slug}/`, { method: 'HEAD' }).catch(() => null);
    if (r?.ok) return true;
    await new Promise((c) => setTimeout(c, BEKLE_MS));
  }
  return false;
}

async function gonder(token, kanal, y) {
  const aciklama = aciklamaYaz(y);
  const kapakVar = y.kapak && (await access(y.kapak).then(() => true, () => false));
  let res;
  if (kapakVar) {
    const form = new FormData();
    form.append('chat_id', kanal);
    form.append('caption', aciklama);
    form.append('photo', new Blob([await readFile(y.kapak)], { type: 'image/png' }), `${y.slug}.png`);
    res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  } else {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: kanal, text: aciklama }),
    });
  }
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.description ?? `HTTP ${res.status}`);
}

async function calistir() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const kanal = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_KANAL;
  if (!token || !kanal) {
    console.log('Telegram: anahtar yok, atlandı.');
    return;
  }
  const gonderilen = JSON.parse(await readFile(DURUM, 'utf8').catch(() => '{}'));
  const liste = sec(await yazilariOku(), gonderilen);
  if (!liste.length) return console.log('[telegram] Gönderilecek yeni yazı yok.');
  for (const y of liste) {
    if (!(await yayindaMi(y.slug))) {
      console.log(`[telegram] ${y.slug} henüz yayında değil, sonraki çalıştırmaya kaldı.`);
      continue;
    }
    try {
      await gonder(token, kanal, y);
      gonderilen[y.slug] = new Date().toISOString();
      // Her başarılı gönderimde kaydet: iş zaman aşımına uğrarsa aynı yazı ikinci kez gitmesin.
      await writeFile(DURUM, `${JSON.stringify(gonderilen, null, 2)}\n`);
      console.log(`[telegram] + ${y.slug}`);
    } catch (e) {
      console.error(`[telegram] ! ${y.slug}: ${e.message}`);
    }
  }
}

// Doğrudan çalıştırılınca gönder; testler içe aktarınca çalışmasın.
if (path.basename(process.argv[1] ?? '') === 'telegram.mjs') {
  await calistir();
}
