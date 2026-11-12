// Dil redaksiyonu: yayın kurulunun olgu denetiminden SONRA, ayrı bir Gemini çağrısıyla haberin dilini düzeltir
// (TDK yazımı, çeviri kokan ifadeler, yazıyla sayı, dolgu). Olgu denetimiyle aynı çağrıyı paylaşmaz: denetim
// "küçük dil kusurları ret sebebi değildir" der ve model redaksiyonu ihmal ediyordu.
// Kabul: redaksiyon sonucu çağıranın verdiği kontrolden (kesin rakam/alıntı/ad kontrolü, biçim) ve gövde uzunluğu
// %90-115 şartından geçmeli. Geçmezse nedenleriyle bir kez yeniden denenir; yine geçmezse önceki metin kalır.
import { gemini as varsayilanGemini } from './lib.mjs';
import { ilgiliKisim } from './kaynak-kirp.mjs';
import { kelimeSay } from '../../src/lib/uzunluk.mjs';
import { dilDuzeltTr, dilSorunlariTr, REDAKSIYON_KURALLARI_TR } from './dil-tr.mjs';

export const REDAKSIYON_SEMASI = {
  type: 'object',
  properties: { baslik: { type: 'string' }, spot: { type: 'string' }, govde: { type: 'string' } },
  required: ['baslik', 'spot', 'govde'],
};
export const UZUNLUK_ALT = 0.9;
export const UZUNLUK_UST = 1.15;

const NESIR = { yuzde: 'yuzde' }; // finfolis biçimi: "yüzde 4,25"

/** Düzyazı alanlarına güvenli dil düzeltmesi (şerit rakamları, tablo ve grafik değerlerine dokunulmaz). */
export function dilDuzeltYazi(yazi) {
  const y = { ...yazi };
  for (const k of ['baslik', 'spot', 'govde', 'why_matters']) if (typeof y[k] === 'string') y[k] = dilDuzeltTr(y[k], NESIR);
  if (Array.isArray(y.key_points)) y.key_points = y.key_points.map((m) => (typeof m === 'string' ? dilDuzeltTr(m, NESIR) : m));
  return y;
}

/** Başlık, spot ve gövde için dil sorunları (kesin olanlar `kesin: true`). */
export function dilSorunlari(yazi, { derleme = false } = {}) {
  return [
    ...dilSorunlariTr(yazi.baslik ?? ''),
    ...dilSorunlariTr(yazi.spot ?? ''),
    ...dilSorunlariTr(yazi.govde ?? '', { govde: true, araBaslikYasak: !derleme }),
  ];
}

const bosDegil = (s) => typeof s === 'string' && s.trim() !== '';

/**
 * @param yazi   onaylı taslak (baslik/spot/govde + şerit alanları)
 * @param aday   kaynak (kaynakMetni)
 * @param opts.sorunMetni  sorunListesi(...) çıktısı; boş olabilir
 * @param opts.isle        (aday yazı) => yazı: yerel düzeltme (dilDuzeltYazi + yerelDuzelt)
 * @param opts.kontrol     (sonra, once) => string[]: kesin kontrol, biçim vb. nedenleri
 * @returns {{yazi}} kabul edilen metin (değişmemiş olabilir) ya da {atildi: neden}
 */
export async function dilRedaksiyonu(yazi, aday, { gemini = varsayilanGemini, sorunMetni = '', isle = (y) => y, kontrol = () => [] } = {}) {
  const onceKelime = kelimeSay(yazi.govde);
  const kaynak = ilgiliKisim(aday.kaynakMetni, [yazi.baslik, yazi.spot, yazi.govde].join('\n'), 20000);
  let neden = [];
  for (let deneme = 1; deneme <= 2; deneme++) {
    const istem = `Aşağıdaki haberin dilini düzelt; başlık, spot ve gövdeyi aynı alanlarla döndür. Kaynakta olmayan hiçbir bilgi, rakam ya da alıntı ekleme.
${sorunMetni ? `\nOtomatik denetimin bulduğu kusurlar (hepsini gider):\n${sorunMetni}\n` : ''}${neden.length ? `\nÖnceki denemen şu nedenlerle reddedildi, bu kez bunları yapma:\n${neden.map((n) => `- ${n}`).join('\n')}\n` : ''}
KAYNAK (olgu doğrulaması için):
${kaynak}

HABER:
Başlık: ${yazi.baslik}
Spot: ${yazi.spot}

Gövde:
${yazi.govde}`;
    let r;
    try {
      r = await gemini({ sistem: REDAKSIYON_KURALLARI_TR, istem, sema: REDAKSIYON_SEMASI, dusunme: 'medium', sicaklik: 0.2 });
    } catch (e) {
      return { atildi: `çağrı başarısız: ${String(e?.message ?? e).slice(0, 120)}` };
    }
    // Yanıt yok ya da bozuk: geri bildirilecek bir neden yok, yeniden denenmez.
    if (!r || !bosDegil(r.baslik) || !bosDegil(r.spot) || !bosDegil(r.govde)) return { atildi: 'yanıt yok ya da bozuk' };
    const sonra = isle({ ...yazi, baslik: r.baslik.trim(), spot: r.spot.trim(), govde: r.govde.trim() });
    neden = [...kontrol(sonra, yazi)];
    const kelime = kelimeSay(sonra.govde);
    if (kelime < onceKelime * UZUNLUK_ALT || kelime > onceKelime * UZUNLUK_UST) {
      neden.push(`gövde ${onceKelime} kelimeden ${kelime} kelimeye değişti; uzunluk %${UZUNLUK_ALT * 100}-${UZUNLUK_UST * 100} aralığında kalmalı`);
    }
    if (!neden.length) return { yazi: sonra };
  }
  return { atildi: neden.join('; ') };
}
