// Worker: yalnız POST /api/yararli ("Bu haber işine yaradı mı?") burada işlenir; öbür her istek statik dosyalara gider.
// Yalnız gün, yazı ve yanıt başına adsız sayı tutulur. IP, başlık ya da çerez saklanmaz.
import { yanitDenetle, istanbulGunu } from './dogrula.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/yararli') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (Number(request.headers.get('content-length') || 0) > 1024) return new Response(null, { status: 400 });
    const y = yanitDenetle(await request.text(), request.headers.get('content-type'));
    if (!y.ok) return new Response(null, { status: 400 });
    // Yalnız yayımlanmış yazı sayılır: rastgele slug'larla D1'e ve hesabın yazma kotasına sınırsız satır eklenmesin.
    const sayfa = await env.ASSETS.fetch(new Request(new URL(`/haber/${y.slug}/`, url)));
    if (sayfa.status !== 200) return new Response(null, { status: 404 });
    await env.DB.prepare(
      'INSERT INTO yanit (gun, slug, yanit, adet) VALUES (?1, ?2, ?3, 1) ON CONFLICT(gun, slug, yanit) DO UPDATE SET adet = adet + 1',
    )
      .bind(istanbulGunu(), y.slug, y.yanit)
      .run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  },
};
