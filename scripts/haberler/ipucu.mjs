// İpucu akışları: ajans RSS başlıkları yalnızca önem sinyalidir.
// Ajans metni asla okunmaz, çevrilmez, rakamı alınmaz; ipucu kendi başına habere dönüşmez.
import { hentMetin } from './lib.mjs';
import { rssOgeleri } from './kaynaklar/ortak.mjs';
import { adresiSil, gizliKaynaklar, kaynakKodu } from './gizli.mjs';

// Akışlar repoda açık durmaz; gizli-kaynaklar.sifreli dosyasından okunur (bkz. gizli.mjs).
export const AKISLAR = gizliKaynaklar({ uyar: () => {} }).ipucu;

// Yalnızca başlık ve tarih döner; bozuk akış atlanır. Loglarda akışın adı yerine kısa kodu yazılır.
export async function hent({ indir = hentMetin, akislar = AKISLAR } = {}) {
  const out = [];
  for (const a of akislar) {
    try {
      for (const o of rssOgeleri(await indir(a.url))) {
        if (o.baslik && o.tarih) out.push({ baslik: o.baslik, tarih: o.tarih, alan: alanAdi(o.url) });
      }
    } catch (e) {
      console.warn(`  İpucu akışı alınamadı (${kaynakKodu(a.ad)}): ${adresiSil(e.message)}`);
    }
  }
  return out;
}

const DOLGU = new Set(['için', 'ile', 'olarak', 'gibi', 'daha', 'sonra', 'önce', 'yeni', 'bir', 'olan', 'the', 'and', 'for', 'with', 'from', 'after', 'over', 'says', 'new', 'its', 'are', 'has', 'was']);

// Anlamlı anahtar kelimeler: küçük harf, en az 3 harf, dolgu değil; Türkçe ekler için ilk 5 harfe kısaltılır.
export function anahtarlar(baslik) {
  return new Set(
    String(baslik)
      .toLocaleLowerCase('tr')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((k) => k.length >= 3 && !DOLGU.has(k))
      .map((k) => k.slice(0, 5)),
  );
}

// Adres ya da aday kimliğindeki ("Kaynak:https://...") adresin alan adı; www. atılır.
export function alanAdi(s) {
  const m = String(s ?? '').match(/https?:\/\/([^/\s]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : null;
}

// Son 24 saatteki bir ipucuyla en az 2 anlamlı kelime paylaşan adaya +1 önem (en fazla 5).
// Adayla aynı siteden gelen ipucu sayılmaz: bir besleme hem aday hem ipucu olursa kendi kendini onaylardı.
export function onemArtir(adaylar, ipuclari, simdi = new Date()) {
  const sinir = simdi.getTime() - 24 * 3600 * 1000;
  const taze = ipuclari.filter((i) => new Date(i.tarih).getTime() >= sinir).map((i) => ({ k: anahtarlar(i.baslik), alan: i.alan ?? null }));
  return adaylar.map((a) => {
    const k = anahtarlar(a.baslik);
    const alan = a.alan ?? alanAdi(a.id);
    const eslesir = taze.some((t) => !(alan && t.alan === alan) && [...t.k].filter((w) => k.has(w)).length >= 2);
    return eslesir ? { ...a, onem: Math.min(5, (a.onem ?? 0) + 1) } : a;
  });
}
