// Düzeltmeler sayfasının kayıtları: haberlerin `duzeltme` alanı + kaldırılan yazıların kaydı
// (src/data/duzeltmeler-kaldirilan.json). İkisi birleştirilir, en yeniden eskiye sıralanır.
import { duzeltmeNotu } from './duzeltme.mjs';

const NOT_TARIHI = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+\d{1,2}:\d{2})?\s*:\s*/;

// Notun başındaki "gg.aa.yyyy[ ss:dd]:" tarihi; yoksa yazının güncelleme ya da yayın tarihi.
export function notTarihi(metin, yedek) {
  const m = NOT_TARIHI.exec(metin);
  if (m) {
    const t = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12));
    if (!Number.isNaN(t.valueOf())) return t;
  }
  return yedek;
}

// Görünen not metni: başındaki tarih ayrıca gösterildiği için atılır.
export function notMetni(metin) {
  return metin.replace(NOT_TARIHI, '').trim();
}

// haberler: [{ id, data }] (içerik koleksiyonu girdileri); kaldirilan: kayıt dizisi.
export function duzeltmeKayitlari(haberler, kaldirilan = []) {
  const kayitlar = [];
  for (const h of haberler) {
    const not = duzeltmeNotu(h.data);
    if (!not) continue;
    kayitlar.push({
      tur: 'duzeltme',
      tarih: notTarihi(not.metin, h.data.updated ?? h.data.date),
      baslik: h.data.title,
      metin: notMetni(not.metin),
      href: `/haber/${h.id}/`,
      ilkYayin: h.data.date,
    });
  }
  for (const k of kaldirilan) {
    kayitlar.push({
      tur: 'kaldirildi',
      tarih: new Date(`${k.tarih}T12:00:00Z`),
      baslik: k.baslik ?? null,
      metin: k.neden,
      href: null,
      ilkYayin: k.ilkYayin ? new Date(`${k.ilkYayin}T12:00:00Z`) : null,
    });
  }
  return kayitlar.sort((a, b) => b.tarih.valueOf() - a.tarih.valueOf());
}
