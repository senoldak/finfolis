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
