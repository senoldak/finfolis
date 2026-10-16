// Cloudflare Worker girişi. Mantık worker/bulten.mjs ve worker/lib.mjs içinde (testler oradan çalışır).
import { istek, haftalikCalistir } from './bulten.mjs';

export interface Env {
  DB: any; // D1 (binding: DB)
  ASSETS: { fetch(istek: Request | string): Promise<Response> };
  BULTEN_GONDEREN: string;
  RESEND_API_KEY?: string; // Worker secret; repoya yazılmaz
  GOREV_ANAHTARI?: string; // Worker secret; mecmua-saat ile ortak
}

// Günlük bülten görevi mecmua-saat Worker'ından service binding ile tetiklenir (POST /api/bulten/gorev).
// Cloudflare ücretsiz planında hesap başına 5 cron sınırı olduğu için sitelerin kendi cron'u yok.
// İstek GOREV_ANAHTARI Worker secret'ı ile doğrulanır; anahtar yoksa uç nokta kapalıdır.
async function gorevYetkili(istek: Request, anahtar?: string): Promise<boolean> {
  if (!anahtar || istek.method !== 'POST') return false;
  if (new URL(istek.url).pathname.replace(/\/+$/, '') !== '/api/bulten/gorev') return false;
  const gelen = new TextEncoder().encode(istek.headers.get('Authorization') ?? '');
  const beklenen = new TextEncoder().encode('Bearer ' + anahtar);
  if (gelen.byteLength !== beklenen.byteLength) return false;
  return (crypto.subtle as any).timingSafeEqual(gelen, beklenen);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (await gorevYetkili(request, env.GOREV_ANAHTARI)) {
      const sonuc = await haftalikCalistir(env);
      console.log('bulten: gunluk gorev ' + JSON.stringify(sonuc));
      return new Response(JSON.stringify(sonuc), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    return istek(request, env);
  },
  // Pazartesi 06:00 UTC (wrangler.jsonc: crons).
  async scheduled(event: { scheduledTime: number }, env: Env): Promise<void> {
    const sonuc = await haftalikCalistir(env, { now: () => event.scheduledTime, fetch: (u: any, i?: any) => fetch(u, i) });
    console.log(`bulten: haftalik ${JSON.stringify(sonuc)}`);
  },
};
