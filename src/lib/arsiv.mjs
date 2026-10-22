// Takvimli arşiv: haberler İstanbul gününe göre gruplanır. Günün özeti, o günün son bülteninin spotudur
// (bülteni bot zaten yazar; arşiv için ayrıca Gemini çağrısı yapılmaz).
import { istanbulGunu } from './seffaflik.mjs';

// Bu sayının altında haberi olan gün sayfası arama motoruna kapalıdır (noindex, follow) ve site haritasına girmez.
export const ARSIV_ESIGI = 3;

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "2026-10-16" → "16 Ekim 2026" */
export function gunBasligi(gun) {
  const [y, a, g] = gun.split('-').map(Number);
  return `${g} ${AYLAR[a - 1]} ${y}`;
}

/** "2026-10" → "Ekim 2026" */
export function ayBasligi(ay) {
  const [y, a] = ay.split('-').map(Number);
  return `${AYLAR[a - 1]} ${y}`;
}

/**
 * Haberleri günlere ayırır. Girdi { id, data: { date, tur } } listesi (koleksiyon girdisi biçimi).
 * Çıktı yeniden eskiye: [{ gun, haberler (eskiden yeniye), bulten (günün son bülteni ya da undefined) }]
 */
export function gunlereAyir(haberler) {
  const harita = new Map();
  for (const h of haberler) {
    const gun = istanbulGunu(h.data.date);
    if (!harita.has(gun)) harita.set(gun, { gun, haberler: [], bultenler: [] });
    harita.get(gun)[h.data.tur === 'bulten' ? 'bultenler' : 'haberler'].push(h);
  }
  const zaman = (h) => h.data.date.valueOf();
  return [...harita.values()]
    .map(({ gun, haberler: hs, bultenler }) => ({
      gun,
      haberler: hs.sort((a, b) => zaman(a) - zaman(b)),
      bulten: bultenler.sort((a, b) => zaman(b) - zaman(a))[0],
    }))
    .sort((a, b) => (a.gun < b.gun ? 1 : -1));
}

/**
 * Ay takvimi: pazartesiyle başlayan haftalar; her hücre { gun, sayi } ya da boşluk için null.
 * @param ay "YYYY-AA"  @param sayilar Map<gun, haber sayısı>
 */
export function ayTakvimi(ay, sayilar) {
  const [y, a] = ay.split('-').map(Number);
  const gunSayisi = new Date(Date.UTC(y, a, 0)).getUTCDate();
  const bosluk = (new Date(Date.UTC(y, a - 1, 1)).getUTCDay() + 6) % 7; // pazartesi = 0
  const hucreler = Array.from({ length: bosluk }, () => null);
  for (let g = 1; g <= gunSayisi; g++) {
    const gun = `${ay}-${String(g).padStart(2, '0')}`;
    hucreler.push({ gun, no: g, sayi: sayilar.get(gun) ?? 0 });
  }
  while (hucreler.length % 7) hucreler.push(null);
  const haftalar = [];
  for (let i = 0; i < hucreler.length; i += 7) haftalar.push(hucreler.slice(i, i + 7));
  return haftalar;
}

/**
 * Bülten gövdesindeki "- **Başlık:** cümle" maddeleri (günün özeti). "([Ayrıntı](…))" bağlantıları atılır.
 * @returns {{ baslik: string, metin: string }[]}
 */
export function bultenMaddeleri(govde = '', azami = 4) {
  const maddeler = [];
  for (const m of String(govde).matchAll(/^[-*]\s+\*\*(.+?):?\*\*:?\s*(.+)$/gm)) {
    const metin = m[2]
      .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim();
    if (metin) maddeler.push({ baslik: m[1].replace(/:$/, '').trim(), metin });
    if (maddeler.length >= azami) break;
  }
  return maddeler;
}

/**
 * Bülten gövdesindeki bölümler ("## Bölge") ve her bölümdeki madde sayısı; içindekiler tablosu için.
 * @returns {{ baslik: string, sayi: number }[]}
 */
export function bultenBolumleri(govde = '') {
  const bolumler = [];
  for (const satir of String(govde).split(/\r?\n/)) {
    const h = satir.match(/^##\s+(.+?)\s*$/);
    if (h) bolumler.push({ baslik: h[1], sayi: 0 });
    else if (bolumler.length && /^[-*]\s+\S/.test(satir)) bolumler.at(-1).sayi++;
  }
  return bolumler.filter((b) => b.sayi > 0);
}

/** ISO 8601 hafta: "2026-10-16" → { yil: 2026, no: 42, anahtar: "2026-42" } (pazartesi başlar). */
export function isoHafta(gun) {
  const [y, a, g] = gun.split('-').map(Number);
  const t = new Date(Date.UTC(y, a - 1, g));
  const haftaGunu = (t.getUTCDay() + 6) % 7; // pazartesi = 0
  t.setUTCDate(t.getUTCDate() - haftaGunu + 3); // haftanın perşembesi
  const yil = t.getUTCFullYear();
  // Haftanın perşembesi hangi yıldaysa hafta o yılındır; numara, o yılın 1 Ocak'ından beri geçen tam hafta + 1.
  const no = 1 + Math.floor((t - Date.UTC(yil, 0, 1)) / 86400000 / 7);
  return { yil, no, anahtar: `${yil}-${String(no).padStart(2, '0')}` };
}

/** Günleri (gunlereAyir çıktısı) ISO haftalarına toplar; yeni hafta önce. */
export function haftalaraAyir(gunler) {
  const harita = new Map();
  for (const g of gunler) {
    const h = isoHafta(g.gun);
    if (!harita.has(h.anahtar)) harita.set(h.anahtar, { ...h, gunler: [] });
    harita.get(h.anahtar).gunler.push(g);
  }
  return [...harita.values()]
    .map((h) => ({
      ...h,
      gunler: h.gunler.sort((a, b) => (a.gun < b.gun ? 1 : -1)),
      ilk: h.gunler.map((g) => g.gun).sort()[0],
      son: h.gunler.map((g) => g.gun).sort().at(-1),
      sayi: h.gunler.reduce((t, g) => t + g.haberler.length, 0),
    }))
    .sort((a, b) => (a.anahtar < b.anahtar ? 1 : -1));
}
