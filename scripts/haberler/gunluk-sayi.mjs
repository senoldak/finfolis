// Yayın odası sayfasının gerçek günlük sayıları (src/data/yayin-odasi/gunluk-sayi.json). Her tur sonunda o turun sayıları
// İstanbul gününe eklenir. Dosyada yalnız sayılar ve sabit kodlar durur: başlık, kaynak adı, adres ya da serbest gerekçe metni
// yazılmaz (besleme listesi gizlidir; gerekçe metni kaynak adı taşıyabilir).
// Sayım birimi: gorulen/degerlendirilen/elenen aday (kaynak öğesi) sayısıdır, bir haber birkaç adaydan yazılabilir;
// yazilan ve yayimlanan benzersiz yazı (slug) sayısıdır. Uyarlayıcı vermediği hiçbir şey sayılmaz.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const SAKLA_GUN = 400;
export const GUN_ALANLARI = ['tur', 'gorulen', 'degerlendirilen', 'yazilan', 'yayimlanan', 'bulten', 'bekleyen'];

// Ret gerekçesi → sabit kod. Sıra önemlidir: ilk eşleşen kazanır. Kodların okura giden metni src/lib/yayin-odasi.mjs'te.
const KODLAR = [
  [/^(kaynakta artık yok|kaynak listeden çıkarıldı)/, 'kaynakta-yok'],
  [/^bayat/, 'bayat'],
  [/^bilinen olay/, 'bilinen-olay'],
  [/^(tekrar|mükerrer):/, 'tekrar'],
  [/^(üç denemede yazılamadı|bozuk yanıt)/, 'yazilamadi'],
  [/^kısa, eş bulunamadı/, 'kisa-es-yok'],
  [/^(metin kısa|yayın kurulu onaylamadı|son kontrol|şablon yazı)/i, 'kontrol-masasi'],
];
// Önceki turda verilmiş kararın tekrarı: aynı aday o gün zaten sayıldı, yeniden sayılmaz.
const TEKRAR_KARAR = /^önceki turda karar verildi/;

/**
 * Ret gerekçesinin kodları. Standart reddi kural başına 'standart:<kural>' (kural kodu yalnız [a-z0-9-]); öteki gerekçeler
 * tek sabit kod; bilinmeyen 'diger'. Boş dizi: sayılmayacak gerekçe.
 */
export function elemeKodlari(gerekce) {
  const g = String(gerekce ?? '').trim();
  if (TEKRAR_KARAR.test(g)) return [];
  const s = /^standart:(?:kirmizi|sari):([a-z0-9,-]+)/.exec(g);
  if (s) {
    const kurallar = [...new Set(s[1].split(',').filter(Boolean))];
    return kurallar.length ? kurallar.map((k) => `standart:${k}`) : ['standart'];
  }
  if (/^standart:/.test(g)) return ['standart'];
  return [KODLAR.find(([re]) => re.test(g))?.[1] ?? 'diger'];
}

/** Bir turun sayıları. sonuclar: uyarlayıcının Sonuc listesi; gorulen: turdaki aday sayısı; ozet: uyarlayıcının tur özeti. */
export function turSayilari({ gorulen = 0, sonuclar = [], ozet = {} }) {
  const elenen = {};
  let degerlendirilen = 0;
  for (const s of sonuclar) {
    if (s.durum === 'elendi') {
      const kodlar = elemeKodlari(s.gerekce);
      if (!kodlar.length) continue;
      degerlendirilen += 1;
      for (const k of kodlar) elenen[k] = (elenen[k] ?? 0) + 1;
    } else if (s.durum === 'yazildi') degerlendirilen += 1;
  }
  const yazilanlar = new Set([...sonuclar.filter((s) => s.durum === 'yazildi' && s.slug).map((s) => s.slug), ...(ozet.yazilar ?? [])]);
  const yazilan = yazilanlar.size;
  const bulten = ozet.bultenYazildi ? 1 : 0;
  return {
    tur: 1,
    gorulen,
    degerlendirilen,
    elenen,
    yazilan,
    yayimlanan: Math.max(0, yazilan - bulten),
    bulten,
    bekleyen: new Set(sonuclar.filter((s) => s.durum === 'bekliyor').map((s) => s.kimlik ?? s)).size,
  };
}

/** İstanbul takvim günü (YYYY-MM-DD). */
export const istanbulGunu = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(t);

/** İki sayı nesnesini toplar (iç içe elenen dahil). */
function topla(a = {}, b = {}) {
  const c = { ...a };
  for (const [k, v] of Object.entries(b)) c[k] = typeof v === 'object' && v !== null ? topla(c[k], v) : (c[k] ?? 0) + v;
  return c;
}

/** Dosya içeriğine bu turun sayılarını ekler; SAKLA_GUN'den eski günler düşer. */
export function gunEkle(veri, gun, sayilar, guncellendi) {
  const gunler = { ...(veri?.gunler ?? {}), [gun]: topla(veri?.gunler?.[gun], sayilar) };
  const sirali = Object.keys(gunler).sort().slice(-SAKLA_GUN);
  return { guncellendi, gunler: Object.fromEntries(sirali.map((g) => [g, gunler[g]])) };
}

/** Uyarlayıcıyı sarar: aday sayısını ve isle sonuçlarını (hatayla gelen kısmi sonuçlar dahil) toplar. */
export function sayiciSar(uyarlayici) {
  let gorulen = 0;
  const sonuclar = [];
  return {
    uyarlayici: {
      ...uyarlayici,
      adaylar: async (...a) => {
        const liste = await uyarlayici.adaylar(...a);
        gorulen += liste.length;
        return liste;
      },
      isle: async (...a) => {
        try {
          const r = await uyarlayici.isle(...a);
          sonuclar.push(...(r ?? []));
          return r;
        } catch (e) {
          sonuclar.push(...(e?.sonuclar ?? []));
          throw e;
        }
      },
    },
    sayilar: (ozet = uyarlayici.ozet) => turSayilari({ gorulen, sonuclar, ozet }),
  };
}

/** Turun sayılarını dosyaya yazar. Hata turu düşürmez: çağıran yakalar ve loglar. */
export async function sayiYaz(dosya, sayilar, simdi = new Date()) {
  let veri = {};
  try {
    veri = JSON.parse(await readFile(dosya, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  await mkdir(path.dirname(dosya), { recursive: true });
  await writeFile(dosya, `${JSON.stringify(gunEkle(veri, istanbulGunu(simdi), sayilar, simdi.toISOString()), null, 1)}\n`, 'utf8');
}
