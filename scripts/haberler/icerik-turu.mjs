// Haberin içerik türü: okura yazının neye dayandığını söyler (Makine Okuması'ndaki "tür" etiketinden).
// Yapay zekâ kullanılmaz; tür, haberi üreten adayların kimlik öneklerinden çıkar:
//   veri       kur hareketi, eşik olayı, karne (piyasa/istatistik verisinden şablonla)
//   arastirma  merkez bankası ve uluslararası kurum çalışma tebliği, araştırma blogu
//   resmi      merkez bankası açıklaması, SEC bildirimi, resmi kurum duyurusu
// Gizli (resmi olmayan) kaynaklı haberin türü yoktur: sitede "haber" olarak kalır.
import { RESMI_BESLEMELER } from './kaynaklar/resmi-beslemeler.mjs';

export const TURLER = ['veri', 'arastirma', 'resmi'];

const VERI_ONEK = /^(kur|esik):/i;
const RESMI_ONEK = /^(fed|ecb|boj|tcmb|sec|bank of england):/i;

// Kimlik "<ad>:<adres>" ise resmi beslemenin türü (tur alanı yoksa resmi).
function beslemeTuru(id) {
  const b = RESMI_BESLEMELER.find((x) => id.toLowerCase().startsWith(`${x.ad.toLowerCase()}:`));
  return b ? (b.tur ?? 'resmi') : undefined;
}

function adayTuru(a) {
  const id = String(a?.id ?? '');
  if (VERI_ONEK.test(id)) return 'veri';
  return beslemeTuru(id) ?? (RESMI_ONEK.test(id) ? 'resmi' : undefined);
}

/** Olayın adaylarından içerik türü; öncelik: veri > araştırma > resmi. Hiçbiri yoksa undefined. */
export function icerikTuru(adaylar = []) {
  const turler = new Set(adaylar.map(adayTuru).filter(Boolean));
  return TURLER.find((t) => turler.has(t));
}

// Yayımlanmış yazının kaynak adından tür (geriye dönük etiketleme için). Bilinmeyen ad undefined döner.
const AD_TURU = [
  [/referans kuru|Piyasa kapanış verisi|Yahoo Finance|TÜİK/i, 'veri'],
  [/SEC EDGAR|Federal Reserve|Merkez Bankası|Bank of England/i, 'resmi'],
];
export function kaynakAdiTuru(ad = '') {
  return AD_TURU.find(([r]) => r.test(ad))?.[1];
}
