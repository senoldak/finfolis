// <script type="application/ld+json" set:html={...}> için JSON metni. set:html içeriği kaçırmaz; JSON.stringify de
// "<" ve ">" karakterlerine dokunmaz, bu yüzden başlıktaki bir "</script>" öğeyi bitirip kalanını HTML yapardı.
// Bu karakterler ve U+2028/U+2029 satır ayırıcıları \uXXXX yazılır: çıktı aynı değeri veren geçerli JSON olarak kalır.
const KACIRILAN = ['<', '>', '&', String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
const KACIS = Object.fromEntries(KACIRILAN.map((c) => [c, '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')]));
const DESEN = new RegExp(`[${KACIRILAN.join('')}]`, 'g');

export function jsonLdMetni(veri) {
  return JSON.stringify(veri).replace(DESEN, (c) => KACIS[c]);
}

/**
 * Haber şemasının ek alanları (tidsrost haberAlanlari): isBasedOn (yazının dayandığı resmî kaynaklar), contentLocation
 * (ön bilgideki `yer`, haritadaki ilin yazı yeri) ve correction (düzeltme notu; şema 1 Aralık 2026'ya kadar kapalı).
 * Medya kaynakları burada yazılmaz: kaynak adları sitede gösterilmeye başlayınca eklenecek.
 * @param {{ kaynaklar?: { ad: string, url: string }[], yer?: { ad: string, boylam?: number, enlem?: number } | null, duzeltme?: string, guncellendi?: Date }} p
 */
export function haberAlanlari({ kaynaklar = [], yer = null, duzeltme, guncellendi } = {}) {
  const ut = {};
  const liste = kaynaklar.filter((k) => k?.ad && k?.url);
  if (liste.length) {
    ut.isBasedOn = liste.map((k) => ({ '@type': 'CreativeWork', url: k.url, publisher: { '@type': 'Organization', name: k.ad } }));
  }
  if (yer?.ad) {
    ut.contentLocation = {
      '@type': 'Place',
      name: yer.ad,
      address: { '@type': 'PostalAddress', addressRegion: yer.ad, addressCountry: 'TR' },
      ...(Number.isFinite(yer.enlem) && Number.isFinite(yer.boylam) ? { geo: { '@type': 'GeoCoordinates', latitude: yer.enlem, longitude: yer.boylam } } : {}),
    };
  }
  if (typeof duzeltme === 'string' && duzeltme.trim()) {
    ut.correction = { '@type': 'CorrectionComment', text: duzeltme.trim(), ...(guncellendi ? { datePublished: guncellendi.toISOString() } : {}) };
  }
  return ut;
}
