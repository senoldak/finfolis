// Grafik ve tablo altındaki kaynak yazısında resmî kurum ve veri sistemi adlarını bağlantıya çevirir
// ("tonla veri kaynağı kullanıyoruz ama link vermiyoruz", 25 Kasım 2026). Yalnız bu listedeki resmî kurumlar ve
// kamu veri sistemleri bağlanır; medya kuruluşu adı bu listeye girmez (yayın adları yalnız haberin kaynak satırında,
// src/lib/kaynak-adlari.mjs). Bağlantı kurumun veri sayfasına gider; sayfa başındaki "Kaynak" satırı veri setinin
// kendisine bağlanır.
//
// kaynakParcalari(metin) -> [{ metin, url? }]: metnin tamamı sırayla; aynı adres bir kez bağlanır.

// Uzun ad önce: "TCMB EVDS" "TCMB"den, "Federal Reserve" "Fed"den önce denenir.
export const KURUMLAR = [
  ['TCMB EVDS', 'https://evds3.tcmb.gov.tr/'],
  ['EVDS', 'https://evds3.tcmb.gov.tr/'],
  ['Uluslararası Ödemeler Bankası', 'https://data.bis.org/'],
  ['Hazine ve Maliye Bakanlığı', 'https://www.hmb.gov.tr/'],
  ['Kültür ve Turizm Bakanlığı', 'https://www.ktb.gov.tr/'],
  ['İzmir Büyükşehir Belediyesi', 'https://acikveri.bizizmir.com/'],
  ['Otomotiv Sanayii Derneği', 'https://www.osd.org.tr/'],
  ['ABD Hazine Bakanlığı', 'https://home.treasury.gov/data/treasury-international-capital-tic-system'],
  ['Borsa İstanbul', 'https://www.borsaistanbul.com/'],
  ['ClinicalTrials.gov', 'https://clinicaltrials.gov/'],
  ['LBMA', 'https://www.lbma.org.uk/prices-and-data'],
  ['Federal Reserve Board', 'https://www.federalreserve.gov/'],
  ['Federal Reserve', 'https://www.federalreserve.gov/'],
  ['Fed', 'https://www.federalreserve.gov/'],
  ['FRED', 'https://fred.stlouisfed.org/'],
  ['ECB', 'https://www.ecb.europa.eu/'],
  ['BIS', 'https://data.bis.org/'],
  ['TÜİK', 'https://data.tuik.gov.tr/'],
  ['TCMB', 'https://www.tcmb.gov.tr/'],
  ['TEİAŞ', 'https://www.teias.gov.tr/'],
  ['Takasbank', 'https://www.takasbank.com.tr/'],
  ['BDDK', 'https://www.bddk.org.tr/'],
  ['SPK', 'https://spk.gov.tr/'],
  ['KAP', 'https://www.kap.org.tr/'],
  ['IMF', 'https://www.imf.org/en/Data'],
  ['OECD', 'https://data-explorer.oecd.org/'],
  ['Dünya Bankası', 'https://data.worldbank.org/'],
  ['SEC', 'https://www.sec.gov/'],
];

const kac = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Ad sözcük olarak geçmeli: "Fed" "Federal"in, "SEC" "SECTOR"ün içinde eşleşmez. Türkçe harfler sözcük harfi sayılır.
const HARF = 'A-Za-z0-9ÇĞİÖŞÜçğıöşü';
const DESEN = new RegExp(`(?<![${HARF}])(${KURUMLAR.map(([ad]) => kac(ad)).join('|')})(?![${HARF}])`, 'g');
const ADRES = new Map(KURUMLAR);

export function kaynakParcalari(metin) {
  const s = String(metin ?? '');
  const parcalar = [];
  const bagli = new Set();
  let son = 0;
  for (const m of s.matchAll(DESEN)) {
    const url = ADRES.get(m[1]);
    if (bagli.has(url)) continue;
    bagli.add(url);
    if (m.index > son) parcalar.push({ metin: s.slice(son, m.index) });
    parcalar.push({ metin: m[1], url });
    son = m.index + m[1].length;
  }
  if (son < s.length) parcalar.push({ metin: s.slice(son) });
  return parcalar;
}
