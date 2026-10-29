// Tahmin sayfasının taze meyve-sebze kalemi için girdi (src/data/hal-fiyat.json):
//  - İzmir Büyükşehir Belediyesi hal fiyatları (açık veri, CC BY 4.0): bu ayın ve geçen ayın ilk 20 iş gününden eksik
//      bültenler çekilir, ürün başına aylık geometrik ortalamaya eklenir. Ham bülten saklanmaz. Tatil günü boş yanıt döner;
//      geçmiş günse bir daha istenmez.
//  - TÜİK TÜFE taze meyve (01162-01165) ve sebze (01171-01175) alt sınıf endeksleri, TCMB EVDS'den (2025=100).
// Bir kaynak alınamazsa o bölüm eski hâliyle kalır. Hesap tahmin.mjs'tedir (ağsız).
//
// Kullanım: node scripts/veri/hal-veri.mjs [--yaz]
//           node scripts/veri/hal-veri.mjs --gecmis <bülten klasörü> --yaz   (bir kerelik: YYYY-MM-DD.json dosyalarından)
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evdsCek } from '../haberler/evds-ek.mjs';
import { GUN_SINIRI, MEYVE, SEBZE, bultenFiyatlari, gunEkle } from '../../src/lib/tahmin/hal.mjs';

const DOSYA = fileURLToPath(new URL('../../src/data/hal-fiyat.json', import.meta.url));
const URL_ = 'https://openapi.izmir.bel.tr/api/ibb/halfiyatlari/sebzemeyve/';
const UA = 'finfolis-veri/1.0 (+https://finfolis.com)';
const TUIK_SERILERI = [...MEYVE, ...SEBZE].map((k) => `TP.TUKFIY2025.${k}`);
export const KAYNAK = {
  hal: {
    ad: 'İzmir Büyükşehir Belediyesi, hal fiyatları (sebze ve meyve)',
    url: 'https://acikveri.bizizmir.com/',
    lisans: 'CC BY 4.0',
  },
  tuik: { ad: 'TÜİK TÜFE alt sınıf endeksleri (2025=100), TCMB EVDS üzerinden', url: 'https://evds3.tcmb.gov.tr/' },
};

const istanbulGunu = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(d);

// Bu ayın ve geçen ayın, bugüne kadarki ilk GUN_SINIRI günündeki hafta içi günler.
export function istenecekGunler(bugun) {
  const [y, m] = bugun.split('-').map(Number);
  const out = [];
  for (const [yy, mm] of [m === 1 ? [y - 1, 12] : [y, m - 1], [y, m]]) {
    for (let d = 1; d <= GUN_SINIRI; d++) {
      const t = `${yy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hg = new Date(`${t}T12:00:00Z`).getUTCDay();
      if (t <= bugun && hg !== 0 && hg !== 6) out.push(t);
    }
  }
  return out;
}

async function bultenAl(tarih) {
  const r = await fetch(URL_ + tarih, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`İzmir hal ${tarih}: HTTP ${r.status}`);
  const metin = await r.text();
  try {
    return JSON.parse(metin);
  } catch {
    return null; // tatil günü: boş yanıt
  }
}

export async function halGuncelle(veri, simdi = new Date(), al = bultenAl, bekle = 1200) {
  const bugun = istanbulGunu(simdi);
  let aylar = veri.aylar ?? {};
  const bos = new Set(veri.bos ?? []);
  const istenen = istenecekGunler(bugun).filter((t) => !aylar[t.slice(0, 7)]?.gunler.includes(t) && !bos.has(t));
  let alinan = 0;
  for (const t of istenen) {
    if (alinan > 0 && bekle) await new Promise((r) => setTimeout(r, bekle));
    const fiyatlar = bultenFiyatlari(await al(t));
    alinan++;
    if (Object.keys(fiyatlar).length) aylar = gunEkle(aylar, t, fiyatlar);
    else if (t < bugun) bos.add(t);
  }
  // Boş gün listesi yalnız istenebilecek pencere için tutulur.
  const pencere = new Set(istenecekGunler(bugun));
  return { aylar, bos: [...bos].filter((t) => pencere.has(t)).sort(), istek: alinan };
}

export async function tuikAl(simdi, anahtar) {
  const satirlar = await evdsCek(TUIK_SERILERI, TUIK_SERILERI.map(() => 0), new Date(Date.UTC(2019, 0, 1)), simdi, anahtar);
  const out = satirlar
    .map((s) => {
      const r = { yil: s.yil, ay: s.ay };
      for (const k of [...MEYVE, ...SEBZE]) r[k] = s[`TP_TUKFIY2025_${k}`];
      return r;
    })
    .filter((r) => [...MEYVE, ...SEBZE].every((k) => r[k] != null));
  if (out.length < 60) throw new Error('TÜİK alt sınıf serisi yetersiz');
  return out;
}

// Dosyanın biçimi: her ay ve her TÜİK satırı tek satır (diff okunur kalsın).
export function halJson(v) {
  const aylar = Object.keys(v.aylar)
    .sort()
    .map((a) => `    ${JSON.stringify(a)}: ${JSON.stringify(v.aylar[a])}`)
    .join(',\n');
  const tuik = v.tuik.map((s) => `    ${JSON.stringify(s)}`).join(',\n');
  return `{\n  "kaynak": ${JSON.stringify(v.kaynak)},\n  "gunSiniri": ${v.gunSiniri},\n  "bos": ${JSON.stringify(v.bos)},\n  "aylar": {\n${aylar}\n  },\n  "tuik": [\n${tuik}\n  ]\n}\n`;
}

async function gecmistenKur(klasor) {
  let aylar = {};
  const dosyalar = (await readdir(klasor)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of dosyalar) {
    aylar = gunEkle(aylar, f.slice(0, 10), bultenFiyatlari(JSON.parse(await readFile(join(klasor, f), 'utf8'))));
  }
  return aylar;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const simdi = new Date();
  let eskiMetin = '';
  let eski = { aylar: {}, bos: [], tuik: [] };
  try {
    eskiMetin = await readFile(DOSYA, 'utf8');
    eski = JSON.parse(eskiMetin);
  } catch {}
  const yeni = { kaynak: KAYNAK, gunSiniri: GUN_SINIRI, bos: eski.bos ?? [], aylar: eski.aylar ?? {}, tuik: eski.tuik ?? [] };
  const gi = process.argv.indexOf('--gecmis');
  try {
    if (gi > 0) yeni.aylar = await gecmistenKur(process.argv[gi + 1]);
    const h = await halGuncelle(yeni, simdi);
    Object.assign(yeni, { aylar: h.aylar, bos: h.bos });
    console.log(`[hal-veri] İzmir ${h.istek} istek`);
  } catch (e) {
    console.error(`[hal-veri] İzmir bülteni alınamadı, eski aylar korunuyor: ${e.message}`);
  }
  const anahtar = process.env.EVDS_API_KEY?.replace(/^﻿/, '').trim();
  if (anahtar) {
    try {
      yeni.tuik = await tuikAl(simdi, anahtar);
    } catch (e) {
      console.error(`[hal-veri] TÜİK alt sınıfları alınamadı, eskisi korunuyor: ${e.message}`);
    }
  } else console.error('[hal-veri] EVDS_API_KEY yok, TÜİK bölümü atlandı');
  const metin = halJson(yeni);
  const sonAy = Object.keys(yeni.aylar).sort().at(-1);
  const ozet = `${Object.keys(yeni.aylar).length} ay (son ${sonAy}, ${yeni.aylar[sonAy]?.gunler.length ?? 0} gün), TÜİK ${yeni.tuik.length} ay`;
  if (process.argv.includes('--yaz')) {
    if (metin !== eskiMetin) {
      await writeFile(DOSYA, metin);
      console.log(`[hal-veri] ${ozet}`);
    } else console.log(`[hal-veri] ${ozet} (değişmedi)`);
  } else console.log(ozet);
}
