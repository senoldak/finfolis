// Standartlar Faz 0: haber botunun yayın kapısındaki süzgeç bağı ve acil durdurma (standart.mjs tek kaynak kopyadır).
// Süzgeç hata verirse karar 'hata' olur: yazı yayımlanmaz, olay görülmedi kalır ve sonraki turda yeniden denenir.
import { standartDenetle, yayinDurduMu } from './standart.mjs';

const KARARLAR = new Set(['temiz', 'sari', 'kirmizi']);
const metin = (...p) => p.filter((x) => typeof x === 'string' && x.trim());
const tabloMetni = (t) => (t ? metin(t.baslik, ...(t.sutunlar ?? []), ...(t.satirlar ?? []).flat()) : []);
const grafikMetni = (g) => (g ? metin(g.baslik, g.birimEtiket, ...(g.satirlar ?? []).map((s) => `${s.etiket}: ${s.metin}`)) : []);

// Okura görünen, gövde dışındaki alanlar (Hızlı Çıkarım, rakam şeridi, sırada, tablo, grafik).
export function yaziEkleri(y) {
  return [
    ...metin(y.why_matters),
    ...metin(...(y.key_points ?? [])),
    ...metin(...(y.rakamlar ?? []).map((r) => `${r.etiket}: ${r.deger}`)),
    ...(y.sirada ? metin(`${y.sirada.tarih}: ${y.sirada.olay}`) : []),
    ...tabloMetni(y.tablo),
    ...grafikMetni(y.grafik),
  ];
}

// Döner: { karar: 'temiz'|'sari'|'kirmizi'|'hata', kirmizi, sari, gerekce }.
export function standartKapisi(yazi, kaynakMetni = '', denetle = standartDenetle) {
  try {
    const s = denetle({ dil: 'tr', baslik: yazi.baslik, ozet: yazi.spot, metin: yazi.govde, ekler: yaziEkleri(yazi), kaynakMetni });
    if (!s || !KARARLAR.has(s.karar)) throw new Error('beklenmeyen süzgeç yanıtı');
    return s;
  } catch (e) {
    return { karar: 'hata', kirmizi: [], sari: [], gerekce: 'standart:hata', hata: String(e?.message ?? e).slice(0, 120) };
  }
}

const BASLIK_SATIRI = /^#{1,6}\s/;

// Derleme: kırmızı çıkan paragraf (tek haber) atılır, yazı düşmez. Başlık ya da spot kırmızıysa, atınca da kırmızı
// kalıyorsa ya da hiç gövde kalmıyorsa tümü kırmızı döner (çağıran yazıyı yayımlamaz).
// Döner: { karar, yazi, atilan: [{kural, ham}], sari: [...], gerekce }.
export function derlemeSuz(yazi, kaynakMetni = '', denetle = standartDenetle) {
  const tum = standartKapisi(yazi, kaynakMetni, denetle);
  if (tum.karar !== 'kirmizi') return { karar: tum.karar, yazi, atilan: [], sari: tum.sari, gerekce: tum.gerekce, ozet: tum };
  const bos = standartKapisi({ ...yazi, govde: '', why_matters: undefined, key_points: undefined, rakamlar: undefined }, kaynakMetni, denetle);
  if (bos.karar !== 'temiz' && bos.karar !== 'sari') return { karar: 'kirmizi', yazi, atilan: [], sari: [], gerekce: tum.gerekce, ozet: tum };
  const bloklar = String(yazi.govde).split(/\n{2,}/);
  const atilan = [];
  const tutulan = [];
  for (const b of bloklar) {
    if (BASLIK_SATIRI.test(b.trim())) {
      tutulan.push({ b, baslik: true });
      continue;
    }
    const s = standartKapisi({ baslik: '', spot: '', govde: b }, kaynakMetni, denetle);
    if (s.karar === 'kirmizi' || s.karar === 'hata') atilan.push(...(s.kirmizi.length ? s.kirmizi : [{ kural: 'hata', ham: '' }]));
    else tutulan.push({ b, baslik: false });
  }
  if (!atilan.length) return { karar: 'kirmizi', yazi, atilan: [], sari: [], gerekce: tum.gerekce, ozet: tum };
  // Altında paragraf kalmayan ara başlık da gider.
  const govde = tutulan
    .filter((x, i) => !x.baslik || (tutulan[i + 1] && !tutulan[i + 1].baslik))
    .map((x) => x.b)
    .join('\n\n');
  const { rakamlar, ...oteki } = yazi; // atılan paragrafın rakamı şeritte kalmasın
  const yeni = { ...oteki, govde };
  const son = standartKapisi(yeni, kaynakMetni, denetle);
  if (son.karar === 'kirmizi' || son.karar === 'hata' || !govde.trim()) return { karar: 'kirmizi', yazi, atilan: [], sari: [], gerekce: son.gerekce === 'standart:hata' ? tum.gerekce : son.gerekce, ozet: son };
  return { karar: son.karar === 'sari' ? 'sari' : 'temiz', yazi: yeni, atilan, sari: son.sari, gerekce: son.gerekce, ozet: son };
}

// Tur başı acil durdurma. Döner: { durdu, neden }; ayarsız ya da saate ulaşılamazsa tur sürer (bkz. standart.mjs).
export async function acilDurdurma({ env = process.env, site = 'finfolis', log = console.log, fetchFn = fetch } = {}) {
  const d = await yayinDurduMu({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site, fetchFn });
  log(d.durdu ? `Acil durdurma açık: ${d.neden}` : `Acil durdurma kontrolü: ${d.neden}`);
  return d;
}
