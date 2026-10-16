// Bülten uç noktaları ve haftalık gönderim. Veritabanı (D1), ASSETS ve fetch dışarıdan verilir (testler sahte verir).
import {
  SITE_URL,
  DIL,
  ONAY_ARA_MS,
  BEKLEME_MS,
  ALICI_PARTI,
  epostaTemizle,
  belirtecGecerli,
  isoHafta,
  haftalikSecim,
  bultenIcerik,
  kacis,
} from './lib.mjs';

const varsayilanBagim = { now: () => Date.now(), fetch: (...a) => fetch(...a) };

function yanit(durum, govde, ek = {}) {
  return new Response(govde ?? null, { status: durum, headers: { 'Cache-Control': 'no-store', ...ek } });
}

function yonlendir(yol) {
  return yanit(303, null, { Location: `${SITE_URL}${yol}` });
}

// Abone formunun sonuç sayfaları (public/bulten.js ?durum= değerini okur).
const kontrol = () => yonlendir('/bulten/?durum=kontrol');

async function resendGonder(env, bagim, yol, govde, ek = {}) {
  return bagim.fetch(`https://api.resend.com${yol}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...ek },
    body: JSON.stringify(govde),
  });
}

function onayEpostasi(env, eposta, belirtec) {
  const onayUrl = `${SITE_URL}/api/bulten/onay?t=${belirtec}`;
  return {
    from: env.BULTEN_GONDEREN,
    to: [eposta],
    subject: 'finfolis bülteni: aboneliğinizi onaylayın',
    text: [
      'finfolis haftalık bültenine abone olmak için aşağıdaki bağlantıya tıklayın:',
      '',
      onayUrl,
      '',
      'Bağlantı 7 gün geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın; adresiniz listeye eklenmez.',
    ].join('\n'),
    html: `<p>finfolis haftalık bültenine abone olmak için bağlantıya tıklayın:</p><p><a href="${kacis(onayUrl)}">Aboneliğimi onayla</a></p><p>Bağlantı 7 gün geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın; adresiniz listeye eklenmez.</p>`,
  };
}

// POST /api/bulten/abone
export async function abone(request, env, bagim = varsayilanBagim) {
  if (!env.RESEND_API_KEY) return yonlendir('/bulten/?durum=kapali');
  let form;
  try {
    form = await request.formData();
  } catch {
    return kontrol();
  }
  // Tuzak alanı doluysa bot demektir: hiçbir şey yapılmaz, kullanıcıya normal yanıt verilir.
  if (String(form.get('web') ?? '') !== '') return kontrol();

  const eposta = epostaTemizle(form.get('eposta'));
  if (!eposta) return yonlendir('/bulten/?durum=eposta-hatali');

  try {
    const simdi = bagim.now();
    const satir = await env.DB.prepare('SELECT durum, belirtec, olusturma FROM abone WHERE eposta = ?')
      .bind(eposta)
      .first();
    // Zaten onaylı ya da yakın zamanda onay e-postası gitmiş: bir şey gönderilmez.
    if (satir?.durum === 'onayli') return kontrol();
    if (satir && simdi - Date.parse(satir.olusturma) < ONAY_ARA_MS) return kontrol();

    const belirtec = crypto.randomUUID();
    const olusturma = new Date(simdi).toISOString();
    // Yeni kayıt ya da yalnız 'bekliyor' olan kaydın belirtecini ve zamanını yenile.
    await env.DB.prepare(
      `INSERT INTO abone (eposta, dil, durum, belirtec, olusturma) VALUES (?, ?, 'bekliyor', ?, ?)
       ON CONFLICT(eposta) DO UPDATE SET belirtec = excluded.belirtec, olusturma = excluded.olusturma
       WHERE abone.durum = 'bekliyor'`,
    )
      .bind(eposta, DIL, belirtec, olusturma)
      .run();

    const r = await resendGonder(env, bagim, '/emails', onayEpostasi(env, eposta, belirtec));
    if (!r.ok) console.error(`bulten: onay e-postası gönderilemedi (HTTP ${r.status})`);
  } catch (e) {
    // Adres var mı yok mu sızmasın diye kullanıcıya yine aynı yanıt verilir; hata günlüğe yazılır.
    console.error(`bulten: abonelik hatası: ${e?.message ?? e}`);
  }
  return kontrol();
}

// GET /api/bulten/onay?t=
export async function onay(request, env, bagim = varsayilanBagim) {
  const t = new URL(request.url).searchParams.get('t');
  if (!belirtecGecerli(t)) return yonlendir('/bulten/?durum=gecersiz');
  const satir = await env.DB.prepare('SELECT durum, olusturma FROM abone WHERE belirtec = ?').bind(t).first();
  if (!satir) return yonlendir('/bulten/?durum=gecersiz');
  if (satir.durum === 'onayli') return yonlendir('/bulten/?durum=onaylandi');

  const simdi = bagim.now();
  if (simdi - Date.parse(satir.olusturma) > BEKLEME_MS) {
    await env.DB.prepare("DELETE FROM abone WHERE belirtec = ? AND durum = 'bekliyor'").bind(t).run();
    return yonlendir('/bulten/?durum=gecersiz');
  }
  await env.DB.prepare("UPDATE abone SET durum = 'onayli', onay = ? WHERE belirtec = ? AND durum = 'bekliyor'")
    .bind(new Date(simdi).toISOString(), t)
    .run();
  return yonlendir('/bulten/?durum=onaylandi');
}

// GET /api/bulten/ayril?t= : tek tuşlu onay formu. Bağlantı önizleyicileri aboneliği silmesin diye silme POST'ta yapılır.
export function ayrilSayfasi(request) {
  const t = new URL(request.url).searchParams.get('t');
  if (!belirtecGecerli(t)) return yonlendir('/bulten/?durum=gecersiz');
  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Bülten aboneliğinden ayrıl | finfolis</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f3ee;color:#1b1b1b;margin:0;padding:48px 16px;text-align:center}main{max-width:420px;margin:0 auto}button{font:inherit;padding:12px 20px;border:2px solid #1b1b1b;background:#1b1b1b;color:#fff;cursor:pointer}</style>
</head><body><main>
<h1 style="font-size:22px">Bülten aboneliğinden ayrılmak istiyor musunuz?</h1>
<p>Onaylarsanız adresiniz bültenden çıkarılır ve bir daha bülten almazsınız.</p>
<form method="post" action="/api/bulten/ayril?t=${kacis(t)}"><button type="submit">Aboneliğimi iptal et</button></form>
</main></body></html>`;
  return yanit(200, html, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
  });
}

// POST /api/bulten/ayril?t= (tek tıkla ayrılma: List-Unsubscribe=One-Click gövdesi de bu adrese gelir).
export async function ayril(request, env) {
  const t = new URL(request.url).searchParams.get('t');
  if (belirtecGecerli(t)) {
    await env.DB.prepare('DELETE FROM abone WHERE belirtec = ?').bind(t).run();
  }
  return yonlendir('/bulten/?durum=ayrildi');
}


// Haftalık gönderim (cron). Haber yoksa, abone yoksa ya da hafta zaten gönderildiyse hiçbir şey yapmaz.
export async function haftalikCalistir(env, bagim = varsayilanBagim) {
  const simdi = bagim.now();
  const hafta = isoHafta(new Date(simdi));

  // Onaysız kayıtlar 7 gün sonra silinir.
  await env.DB.prepare("DELETE FROM abone WHERE durum = 'bekliyor' AND olusturma < ?")
    .bind(new Date(simdi - BEKLEME_MS).toISOString())
    .run();

  if (!env.RESEND_API_KEY) return { durum: 'kapali' };

  const dosya = await env.ASSETS.fetch(new Request(`${SITE_URL}/bulten/haftalik.json`));
  if (!dosya.ok) return { durum: 'haber-yok', neden: `haftalik.json HTTP ${dosya.status}` };
  const secim = haftalikSecim(await dosya.json().catch(() => null), simdi);
  if (!secim.haberler.length) return { durum: 'haber-yok' };

  const onceden = await env.DB.prepare('SELECT 1 AS v FROM gonderim WHERE hafta = ? AND dil = ?').bind(hafta, DIL).first();
  if (onceden) return { durum: 'zaten-gonderildi', hafta };

  const { results } = await env.DB.prepare("SELECT eposta, belirtec FROM abone WHERE durum = 'onayli' AND dil = ?")
    .bind(DIL)
    .all();
  if (!results.length) return { durum: 'abone-yok' };

  let adet = 0;
  for (let i = 0; i < results.length; i += ALICI_PARTI) {
    const parti = results.slice(i, i + ALICI_PARTI).map((a) => {
      const ayrilmaUrl = `${SITE_URL}/api/bulten/ayril?t=${a.belirtec}`;
      const icerik = bultenIcerik({ hafta, haberler: secim.haberler, kalici: secim.kalici, ayrilmaUrl });
      return {
        from: env.BULTEN_GONDEREN,
        to: [a.eposta],
        subject: icerik.konu,
        html: icerik.html,
        text: icerik.metin,
        headers: {
          'List-Unsubscribe': `<${ayrilmaUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });
    // Her alıcıya ayrı e-posta; geçersiz bir alıcı tüm partiyi düşürmesin diye permissive.
    const r = await resendGonder(env, bagim, '/emails/batch', parti, { 'x-batch-validation': 'permissive' });
    if (!r.ok) throw new Error(`Resend batch HTTP ${r.status} (${i} sonrası)`);
    adet += parti.length;
  }

  await env.DB.prepare('INSERT INTO gonderim (hafta, dil, zaman, adet) VALUES (?, ?, ?, ?)')
    .bind(hafta, DIL, new Date(simdi).toISOString(), adet)
    .run();
  return { durum: 'gonderildi', hafta, adet };
}

// İstek yönlendirme. Yalnız /api/* bu Worker'a gelir (wrangler: run_worker_first).
export async function istek(request, env, bagim = varsayilanBagim) {
  const url = new URL(request.url);
  const yol = url.pathname.replace(/\/+$/, '');
  const yontem = request.method;
  if (yol === '/api/bulten/abone' && yontem === 'POST') return abone(request, env, bagim);
  if (yol === '/api/bulten/onay' && yontem === 'GET') return onay(request, env, bagim);
  if (yol === '/api/bulten/ayril' && yontem === 'GET') return ayrilSayfasi(request);
  if (yol === '/api/bulten/ayril' && yontem === 'POST') return ayril(request, env);
  return yanit(404, 'Bulunamadı', { 'Content-Type': 'text/plain; charset=utf-8' });
}
