// Veri yayın takvimi: kaynak yanıtlarını ortak olay biçimine çevirir, birleştirir, günlere ve haftalara böler.
// Olay: { tarih: 'YYYY-MM-DD', saat: 'HH:MM'|null, kurum: 'TÜİK'|'TCMB', baslik, donem|null, url|null, kaynak, haftalik? }
// Saatler kaynakların verdiği Türkiye saatidir (kaynaklardaki 'Z' eki saat dilimi değildir, duvar saati olarak okunur).

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const GUN_ADLARI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const AY_NO = new Map(AYLAR.map((a, i) => [a.toLocaleLowerCase('tr'), i + 1]));
const iki = (n) => String(n).padStart(2, '0');

// '22 Ocak 2026' -> '2026-01-22'; çözülemezse null.
export function trTarihCoz(metin) {
  const m = String(metin ?? '').replace(/ /g, ' ').trim().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/u);
  if (!m) return null;
  const ay = AY_NO.get(m[2].toLocaleLowerCase('tr'));
  const gun = Number(m[1]);
  if (!ay || gun < 1 || gun > 31) return null;
  const t = `${m[3]}-${iki(ay)}-${iki(gun)}`;
  return gecerliTarih(t) ? t : null;
}

export function gecerliTarih(t) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

function metinTemizle(h) {
  return String(h ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// TCMB "Para Politikası Kurulu Toplantıları ve Rapor Takvimi" tablosu: 4 sütun (karar, özet, Enflasyon Raporu, Finansal İstikrar Raporu).
export function ppkTablosuAyristir(html, url = null) {
  const kaynak = 'tcmb-takvim';
  const sutunlar = ['PPK toplantı kararı', 'PPK toplantı özeti', 'Enflasyon Raporu', 'Finansal İstikrar Raporu'];
  const tablo = String(html).match(/<table[^>]*id="midTable"[\s\S]*?<\/table>/i)?.[0] ?? '';
  const govde = tablo.split(/<tbody/i)[1] ?? '';
  const olaylar = [];
  for (const tr of govde.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const hucreler = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => metinTemizle(m[1]));
    hucreler.slice(0, 4).forEach((h, i) => {
      const tarih = trTarihCoz(h);
      if (tarih) olaylar.push({ tarih, saat: null, kurum: 'TCMB', baslik: sutunlar[i], donem: null, url, kaynak });
    });
  }
  return olaylar;
}

// TCMB veri yayımlama takvimi (appg.tcmb.gov.tr) kaydı -> olay. 'tarih' alanı duvar saatidir.
export function tcmbKaydiniOlayYap(k) {
  const tarih = String(k?.tarih ?? '').slice(0, 10);
  const baslik = metinTemizle(k?.yayinBilgi?.yayimAdi);
  if (!gecerliTarih(tarih) || !baslik) return null;
  const saatHam = String(k.tarih).slice(11, 16);
  const link = k?.veriLink?.link ? String(k.veriLink.link).trim().replace(/^http:\/\//i, 'https://') : '';
  return {
    tarih,
    saat: /^\d{2}:\d{2}$/.test(saatHam) && saatHam !== '00:00' ? saatHam : null,
    kurum: 'TCMB',
    baslik,
    donem: metinTemizle(k.donem) || null,
    url: /^https:\/\//.test(link) ? link : null,
    kaynak: 'tcmb-api',
    ...(String(k.period ?? '').toLocaleLowerCase('tr').startsWith('haftal') ? { haftalik: true } : {}),
  };
}

// Resmi İstatistik Portalı takvim kaydı -> olay (yalnız TÜİK).
export function tuikKaydiniOlayYap(k) {
  if (k?.SorumluKisaAd !== 'TÜİK') return null;
  const tarih = String(k.GTarih ?? '').slice(0, 10);
  const baslik = metinTemizle(k.Adi);
  if (!gecerliTarih(tarih) || !baslik) return null;
  const saatHam = String(k.GTarih).slice(11, 16);
  const link = String(k.Link ?? '').trim();
  return {
    tarih,
    saat: /^\d{2}:\d{2}$/.test(saatHam) && saatHam !== '00:00' ? saatHam : null,
    kurum: 'TÜİK',
    baslik,
    donem: metinTemizle(k.Donemi) || null,
    url: /^https?:\/\//.test(link) ? link : null,
    kaynak: 'tuik',
  };
}

export function sirala(olaylar) {
  return [...olaylar].sort(
    (a, b) =>
      a.tarih.localeCompare(b.tarih) ||
      (a.saat ?? '99:99').localeCompare(b.saat ?? '99:99') ||
      a.kurum.localeCompare(b.kurum, 'tr') ||
      a.baslik.localeCompare(b.baslik, 'tr'),
  );
}

export function tekrarsiz(olaylar) {
  const goruldu = new Set();
  return olaylar.filter((o) => {
    const k = [o.kaynak, o.tarih, o.saat, o.baslik, o.donem].join('|');
    if (goruldu.has(k)) return false;
    goruldu.add(k);
    return true;
  });
}

// Bir kaynak başarıyla alındıysa, kaynağın kapsadığı aralıktaki eski kayıtlar yenisiyle değişir; aralık dışındakiler kalır.
export function birlestir(eski, yeni, kaynak, { bas, bit }) {
  const korunan = eski.filter((o) => o.kaynak !== kaynak || o.tarih < bas || o.tarih > bit);
  return sirala(tekrarsiz([...korunan, ...yeni]));
}

// Dosyayı şişirmemek için bugünden 30 gün öncesi ile 120 gün sonrası arası tutulur.
export function pencereyeKirp(olaylar, bugun, once = 30, sonra = 120) {
  const bas = gunEkle(bugun, -once);
  const bit = gunEkle(bugun, sonra);
  return olaylar.filter((o) => o.tarih >= bas && o.tarih <= bit);
}

// ---- Tarih yardımcıları ('YYYY-MM-DD' dizgileri, UTC günü olarak) ----

export function gunEkle(tarih, n) {
  const d = new Date(`${tarih}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Europe/Istanbul takvim günü.
export function bugunIstanbul(simdi = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(simdi);
  return p;
}

export function haftaninGunu(tarih) {
  return new Date(`${tarih}T00:00:00Z`).getUTCDay(); // 0 = Pazar
}

export function gunAdi(tarih) {
  return GUN_ADLARI[haftaninGunu(tarih)];
}

export function haftaBasi(tarih) {
  const g = haftaninGunu(tarih);
  return gunEkle(tarih, -((g + 6) % 7));
}

// ---- Dışa açık sorgular ----

// [bas, bit] günleri dahil; sıralı döner. Haber planlama gibi başka yerlerden de kullanılabilir.
export function araliktakiOlaylar(olaylar, bas, bit, { kurum = null, haftalikDahil = true } = {}) {
  return sirala(
    olaylar.filter((o) => o.tarih >= bas && o.tarih <= bit && (!kurum || o.kurum === kurum) && (haftalikDahil || !o.haftalik)),
  );
}

export function sonGunlerdeAciklananlar(olaylar, bugun, gun = 7) {
  return araliktakiOlaylar(olaylar, gunEkle(bugun, -gun), gunEkle(bugun, -1), { haftalikDahil: false }).reverse();
}

// Bugünden başlayıp haftaSayisi hafta (7 × haftaSayisi gün) ileri; Pazartesi başlangıçlı haftalara bölünür.
// Boş haftalar da listelenir. Her hafta: { bas, bit, gunler: [{ tarih, olaylar }] } (yalnız olaylı günler).
export function haftalaraGrupla(olaylar, bugun, haftaSayisi = 8) {
  const son = gunEkle(bugun, haftaSayisi * 7 - 1);
  const secili = araliktakiOlaylar(olaylar, bugun, son);
  const haftalar = [];
  let bas = haftaBasi(bugun);
  while (bas <= son) {
    const bit = gunEkle(bas, 6);
    const gunler = new Map();
    for (const o of secili) {
      if (o.tarih < bas || o.tarih > bit) continue;
      if (!gunler.has(o.tarih)) gunler.set(o.tarih, []);
      gunler.get(o.tarih).push(o);
    }
    haftalar.push({ bas, bit, gunler: [...gunler].map(([tarih, liste]) => ({ tarih, olaylar: liste })) });
    bas = gunEkle(bas, 7);
  }
  return haftalar;
}
