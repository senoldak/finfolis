// Haberin altındaki "Resmî kaynak" satırı. Yalnız resmî kurumların kendi alan adlarındaki bağlantılar gösterilir
// (izin listesi; bilinmeyen alan adı gösterilmez). Medya kaynağı izi (kaynakIzi) taşıyan haberde resmî satır çıkmaz;
// onun yerine adsız kaynak satırı (adsizKaynakSatiri) gösterilir: kaynak bağlantısı ve adı eklenmez.
const RESMI_ALANLAR = [
  'tcmb.gov.tr', 'tuik.gov.tr', 'spk.gov.tr', 'bddk.org.tr', 'kap.org.tr', 'hmb.gov.tr', 'resmigazete.gov.tr',
  'sec.gov', 'federalreserve.gov', 'newyorkfed.org', 'treasury.gov', 'bls.gov', 'bea.gov',
  'ecb.europa.eu', 'europa.eu', 'bis.org', 'imf.org', 'oecd.org', 'worldbank.org',
  'bankofengland.co.uk', 'boj.or.jp', 'bankofcanada.ca', 'snb.ch', 'rba.gov.au', 'norges-bank.no', 'riksbank.se',
];
// Aracı veri servisleri: resmî verinin kendisi kurumun sayfasına bağlanır.
const ARACI = { 'frankfurter.dev': 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html' };

const alanEslesir = (host, alan) => host === alan || host.endsWith(`.${alan}`);

export function resmiKaynaklar(veri) {
  if (typeof veri?.kaynakIzi === 'string' && veri.kaynakIzi.trim()) return [];
  const sonuc = [];
  for (const k of Array.isArray(veri?.kaynaklar) ? veri.kaynaklar : []) {
    let u;
    try {
      u = new URL(k?.url);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./, '');
    const araci = Object.entries(ARACI).find(([alan]) => alanEslesir(host, alan));
    const url = araci ? araci[1] : RESMI_ALANLAR.some((a) => alanEslesir(host, a)) ? u.href.replace(/^http:/, 'https:') : null;
    if (!url || !k?.ad || sonuc.some((s) => s.url === url)) continue;
    sonuc.push({ ad: String(k.ad), url });
  }
  return sonuc;
}

// Medya kaynaklı haberde (kaynakIzi dolu) resmî satırın yerine geçen adsız satır. Bülten karma kaynaklıdır.
// Kaynakİzi yoksa null (resmî kaynaklı haber ve sahibin adıyla çıkan yazılarda satır değişmez).
export function adsizKaynakSatiri(veri) {
  if (!(typeof veri?.kaynakIzi === 'string' && veri.kaynakIzi.trim())) return null;
  return veri.tur === 'bulten'
    ? 'Kaynak: Resmî kurum verileri ve kamuya açık piyasa haberleri.'
    : 'Kaynak: Kamuya açık finansal veriler ve bağımsız piyasa haber akışları.';
}
