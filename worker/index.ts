// Cloudflare Worker girişi. Mantık worker/bulten.mjs ve worker/lib.mjs içinde (testler oradan çalışır).
import { istek, haftalikCalistir } from './bulten.mjs';

export interface Env {
  DB: any; // D1 (binding: DB)
  ASSETS: { fetch(istek: Request | string): Promise<Response> };
  BULTEN_GONDEREN: string;
  RESEND_API_KEY?: string; // Worker secret; repoya yazılmaz
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return istek(request, env);
  },
  // Pazartesi 06:00 UTC (wrangler.jsonc: crons).
  async scheduled(event: { scheduledTime: number }, env: Env): Promise<void> {
    const sonuc = await haftalikCalistir(env, { now: () => event.scheduledTime, fetch: (u: any, i?: any) => fetch(u, i) });
    console.log(`bulten: haftalik ${JSON.stringify(sonuc)}`);
  },
};
