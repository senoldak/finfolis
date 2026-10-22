// Şeffaflık sayfasının verisi: bot ne kadar içerik taradı, kaçını yazdı, hangi kaynak türlerinden.
// Kaynak adı hiçbir yerde geçmez: resmi olmayan kaynaklar yalnız sayı olarak ("diğer yayınlar") görünür.
// Taranan adaylar scripts/haberler/gorulen.json'dan (bot 60 gün tutar), yayımlananlar haber koleksiyonundan gelir.
import { icerikTuru } from '../../scripts/haberler/icerik-turu.mjs';

const GUN_MS = 86400000;

/** İstanbul takvim günü (YYYY-AA-GG). */
export const istanbulGunu = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

// Aday kimliğinden kaynak türü: veri | arastirma | resmi | yayin (resmi olmayan yayın).
export const kaynakTuru = (id) => icerikTuru([{ id }]) ?? 'yayin';

// Kaynak kimliği: "<önek>:..." ifadesinin öneki; veri modüllerinde modül adı (kur, esik).
const kaynakAnahtari = (id) => String(id).split(':')[0].toLowerCase();

/**
 * @param haberler {{ date: Date, tur?: string, icerikTuru?: string }[]}
 * @param gorulen {Record<string, { zaman: string, yazildi?: boolean }>}
 */
export function seffaflikVerisi(haberler, gorulen, { simdi = new Date(), gun = 30 } = {}) {
  const kayitlar = Object.entries(gorulen ?? {}).map(([id, v]) => ({ id, gun: istanbulGunu(v.zaman), yazildi: !!v.yazildi }));
  const ilkTarama = kayitlar.map((k) => k.gun).sort()[0];
  const bugun = istanbulGunu(simdi);
  const gunler = [];
  for (let i = gun - 1; i >= 0; i--) {
    const g = istanbulGunu(simdi.valueOf() - i * GUN_MS);
    if (!ilkTarama || g >= ilkTarama) gunler.push(g);
  }
  const ilkGun = gunler[0] ?? bugun;
  const pencere = (g) => g >= ilkGun && g <= bugun;

  const yayinlanan = haberler.filter((h) => pencere(istanbulGunu(h.date)));
  const taranan = kayitlar.filter((k) => pencere(k.gun));

  const gunluk = gunler.map((g) => ({
    gun: g,
    taranan: taranan.filter((k) => k.gun === g).length,
    yayinlanan: yayinlanan.filter((h) => istanbulGunu(h.date) === g && h.tur !== 'bulten').length,
    bulten: yayinlanan.filter((h) => istanbulGunu(h.date) === g && h.tur === 'bulten').length,
  }));

  const TURLER = ['yayin', 'resmi', 'arastirma', 'veri'];
  const kaynakTurleri = TURLER.map((tur) => {
    const k = taranan.filter((x) => kaynakTuru(x.id) === tur);
    return { tur, taranan: k.length, kaynak: new Set(k.map((x) => kaynakAnahtari(x.id))).size };
  }).filter((x) => x.taranan > 0);

  const icerik = { haber: 0, resmi: 0, arastirma: 0, veri: 0, bulten: 0 };
  for (const h of yayinlanan) icerik[h.tur === 'bulten' ? 'bulten' : (h.icerikTuru ?? 'haber')]++;

  const haberSayisi = gunluk.reduce((t, g) => t + g.yayinlanan, 0);
  return {
    ilkGun,
    sonGun: bugun,
    gunSayisi: gunler.length,
    taranan: taranan.length,
    yayinlanan: haberSayisi,
    bulten: gunluk.reduce((t, g) => t + g.bulten, 0),
    // Yayına dönüşen aday oranı: bir haber birden çok adaydan (aynı olayın farklı kaynakları) yazılabilir.
    secilmeOrani: taranan.length ? taranan.filter((k) => k.yazildi).length / taranan.length : 0,
    kaynakSayisi: kaynakTurleri.reduce((t, x) => t + x.kaynak, 0),
    gunluk,
    kaynakTurleri,
    icerik,
  };
}
