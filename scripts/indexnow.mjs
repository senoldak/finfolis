// IndexNow: yayından sonra yeni yazıların adreslerini Bing, Yandex, Seznam, Naver'a bildirir.
// dist/news-sitemap.xml'deki (son 48 saat) adresler + anasayfa gönderilir.
// İş akışını asla düşürmez: her hata yakalanır, yalnızca günlüğe yazılır.
import { readFileSync } from 'node:fs';

const HOST = 'finfolis.com';
const KEY = 'ed23c46e5e2403c8aa5e70f3fe24589b';

try {
  let xml = '';
  try {
    xml = readFileSync('dist/news-sitemap.xml', 'utf8');
  } catch (e) {
    console.log(`IndexNow: news-sitemap.xml okunamadı (${e.message}); yalnızca anasayfa gönderilecek.`);
  }
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const urlList = [...new Set([`https://${HOST}/`, ...urls])].slice(0, 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(30_000),
  });
  console.log(`IndexNow: ${urlList.length} adres gönderildi, yanıt ${res.status} ${res.statusText}`);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(summary, `IndexNow: ${urlList.length} adres, yanıt ${res.status}\n`);
  }
} catch (e) {
  console.log(`IndexNow: gönderilemedi (${e?.message ?? e})`);
}
