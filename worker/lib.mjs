// Bülten Worker'ının saf yardımcıları (ağ ya da veritabanı yok; testler doğrudan çağırır).

export const SITE_URL = 'https://finfolis.com';
export const DIL = 'tr';
export const ONAY_ARA_MS = 10 * 60 * 1000; // aynı adrese en sık bu aralıkla onay e-postası
export const BEKLEME_MS = 7 * 24 * 60 * 60 * 1000; // onaysız kayıt ve haftalık pencere: 7 gün
export const HAFTALIK_AZAMI = 10; // bir bültende en fazla haber
export const ALICI_PARTI = 100; // Resend batch: çağrı başına en fazla alıcı

const EPOSTA = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const BELIRTEC = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// E-posta: kırp, küçük harfe çevir, biçimi denetle. Geçersizse null.
export function epostaTemizle(deger) {
  if (typeof deger !== 'string') return null;
  const e = deger.trim().toLowerCase();
  if (e.length > 254 || !EPOSTA.test(e)) return null;
  return e;
}

export function belirtecGecerli(deger) {
  return typeof deger === 'string' && BELIRTEC.test(deger);
}

// ISO hafta anahtarı, örn. 2026-W43 (hafta Pazartesi başlar; UTC'ye göre hesaplanır).
export function isoHafta(tarih) {
  const d = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate()));
  const gun = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - gun);
  const yil = d.getUTCFullYear();
  const ilk = Date.UTC(yil, 0, 1);
  const hafta = Math.ceil(((d.getTime() - ilk) / 86_400_000 + 1) / 7);
  return `${yil}-W${String(hafta).padStart(2, '0')}`;
}

// Bağlantıya UTM parametreleri ekler (mevcut parametreleri korur).
export function utmEkle(adres, { kaynak, ortam, kampanya }) {
  const u = new URL(adres);
  u.searchParams.set('utm_source', kaynak);
  u.searchParams.set('utm_medium', ortam);
  u.searchParams.set('utm_campaign', kampanya);
  return u.href;
}

// Astro'nun ürettiği haftalık JSON'dan son 7 günün en fazla 10 haberini seçer.
// Yalnız kendi alan adımızdaki bağlantılar kabul edilir.
export function haftalikSecim(veri, simdi) {
  const alt = simdi - BEKLEME_MS;
  const haberler = (Array.isArray(veri?.haberler) ? veri.haberler : [])
    .filter((h) => {
      const t = Date.parse(h?.tarih);
      return (
        typeof h?.baslik === 'string' &&
        typeof h?.url === 'string' &&
        h.url.startsWith(`${SITE_URL}/`) &&
        Number.isFinite(t) &&
        t >= alt &&
        t <= simdi
      );
    })
    .sort((a, b) => Date.parse(b.tarih) - Date.parse(a.tarih))
    .slice(0, HAFTALIK_AZAMI);
  const kalici = (Array.isArray(veri?.kalici) ? veri.kalici : []).filter(
    (k) => typeof k?.baslik === 'string' && typeof k?.url === 'string' && k.url.startsWith(`${SITE_URL}/`),
  );
  return { hafta: typeof veri?.hafta === 'string' ? veri.hafta : null, haberler, kalici };
}

export function kacis(metin) {
  return String(metin ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tarihYaz(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.valueOf())) return '';
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
}

// Haftalık bülten e-postası (HTML + düz metin). Ayrılma bağlantısı her alıcıya ayrı verilir.
export function bultenIcerik({ hafta, haberler, kalici, ayrilmaUrl }) {
  const kampanya = `haftalik-${hafta}`;
  const bag = (adres) => utmEkle(adres, { kaynak: 'bulten', ortam: 'email', kampanya });
  const konu = `finfolis haftalık bülten: ${haberler.length} öne çıkan haber`;

  const haberHtml = haberler
    .map(
      (h) => `<tr><td style="padding:16px 28px;border-top:1px solid #cfccc2">
<a href="${kacis(bag(h.url))}" style="font-size:17px;font-weight:bold;color:#1b1b1b;text-decoration:none">${kacis(h.baslik)}</a>
<p style="margin:6px 0 0;color:#3d3c38;font-size:15px;line-height:1.5">${kacis(h.ozet ?? '')}</p>
<p style="margin:6px 0 0;color:#5d5b55;font-size:13px">${kacis(tarihYaz(h.tarih))}</p>
</td></tr>`,
    )
    .join('\n');

  const kaliciHtml = kalici.length
    ? `<tr><td style="padding:16px 28px;border-top:1px solid #cfccc2;font-size:15px">
<p style="margin:0 0 8px;font-weight:bold">Sitede</p>
${kalici.map((k) => `<p style="margin:4px 0"><a href="${kacis(bag(k.url))}" style="color:#2e5d8a">${kacis(k.baslik)}</a></p>`).join('\n')}
</td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${kacis(konu)}</title></head>
<body style="margin:0;background:#f4f3ee;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-top:4px solid #1b1b1b">
<tr><td style="padding:24px 28px 8px"><a href="${kacis(bag(`${SITE_URL}/`))}" style="font-size:24px;font-weight:bold;color:#1b1b1b;text-decoration:none">finfolis</a></td></tr>
<tr><td style="padding:8px 28px 4px"><h1 style="font-size:20px;margin:0">Bu haftanın öne çıkanları</h1>
<p style="margin:8px 0 0;color:#3d3c38;font-size:15px">Son yedi günün en önemli haberleri.</p></td></tr>
${haberHtml}
${kaliciHtml}
<tr><td style="padding:20px 28px;border-top:1px solid #cfccc2;color:#5d5b55;font-size:12px;line-height:1.6">
<p style="margin:0">Bu e-postayı finfolis bültenine abone olduğunuz için alıyorsunuz.</p>
<p style="margin:6px 0 0">Aboneliğinizi iptal etmek için <a href="${kacis(ayrilmaUrl)}" style="color:#2e5d8a">buraya tıklayın</a>. Adresiniz bu bültenden başka bir amaçla kullanılmaz; ayrıntılar için <a href="${kacis(bag(`${SITE_URL}/gizlilik/`))}" style="color:#2e5d8a">gizlilik sayfası</a>.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  const metin = [
    'finfolis haftalık bülten',
    'Bu haftanın öne çıkanları',
    '',
    ...haberler.flatMap((h) => [h.baslik, h.ozet ?? '', bag(h.url), '']),
    ...(kalici.length ? ['Sitede:', ...kalici.map((k) => `${k.baslik}: ${bag(k.url)}`), ''] : []),
    `Aboneliğinizi iptal etmek için: ${ayrilmaUrl}`,
  ].join('\n');

  return { konu, html, metin };
}
