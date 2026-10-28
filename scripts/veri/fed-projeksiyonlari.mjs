// Fed Ekonomik Projeksiyonlar Özeti (SEP) çekici: medyanlar, nokta grafiği dağılımı, gerçekleşen faiz.
// Kaynak: federalreserve.gov (FOMC takvimi ve her SEP'in HTML tabloları); gerçekleşen faiz için FRED DFEDTARU/DFEDTARL.
// Artımlıdır: dosyada olan SEP'ler yeniden indirilmez. Kaynak düşerse mevcut JSON'a dokunulmaz.
//
// Kullanım: node scripts/veri/fed-projeksiyonlari.mjs [--yaz] [--hepsi]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep } from '../haberler/lib.mjs';
import {
  TAKVIM_URL,
  takvimLinkleri,
  sepAyristir,
  gerceklesenFaiz,
  noktaMedyani,
} from '../../src/lib/fed-projeksiyonlari.mjs';

const HEDEF_DOSYA = fileURLToPath(new URL('../../src/data/fed-projeksiyonlari.json', import.meta.url));
const UST_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARU&cosd=2022-12-01';
const ALT_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARL&cosd=2022-12-01';
const KAYNAKLAR = [
  { ad: 'Federal Reserve, FOMC Ekonomik Projeksiyonlar Özeti', url: TAKVIM_URL },
  { ad: 'FRED (St. Louis Fed), federal fon hedef aralığı: DFEDTARU ve DFEDTARL', url: 'https://fred.stlouisfed.org/series/DFEDTARU' },
];

async function eskiyiOku() {
  try {
    return JSON.parse(await readFile(HEDEF_DOSYA, 'utf-8'));
  } catch {
    return null;
  }
}

// Ayrıştırılan SEP'in iç tutarlılık kontrolü; uyarı metinleri döner (hata değil, çünkü kaynak resmi).
function uyarilar(s) {
  const u = [];
  s.yillar.forEach((y, i) => {
    const hesap = noktaMedyani(s.nokta, i);
    const yayim = s.degiskenler.faiz.medyan[i];
    if (hesap == null || yayim == null) return;
    // Fed medyanı onda bire yarıyı yukarı yuvarlar.
    const yuvarla = Math.floor(hesap * 10 + 0.5 + 1e-9) / 10;
    if (Math.abs(yuvarla - yayim) > 1e-9) u.push(`${y}: nokta medyanı ${hesap} tablodaki ${yayim} ile uyuşmuyor`);
  });
  return u;
}

export async function fedVerisiUret({ hepsi = false } = {}) {
  const eski = await eskiyiOku();
  const takvim = await hentMetin(TAKVIM_URL, { timeout: 45000 });
  const linkler = takvimLinkleri(takvim);
  if (!linkler.length) throw new Error('FOMC takviminde SEP bağlantısı bulunamadı');

  const mevcut = new Map((eski?.sepler ?? []).map((s) => [s.tarih, s]));
  const sepler = [];
  const hatalar = [];
  let indirilen = 0;
  for (const l of linkler) {
    const var_ = mevcut.get(l.tarih);
    if (var_ && !hepsi) {
      sepler.push(var_);
      continue;
    }
    try {
      if (indirilen++) await sleep(1200);
      const html = await hentMetin(l.url, { timeout: 45000 });
      const s = sepAyristir(html, l);
      for (const w of uyarilar(s)) console.warn(`Uyarı ${l.tarih}: ${w}`);
      sepler.push(s);
      console.log(`SEP alındı: ${l.tarih}`);
    } catch (e) {
      hatalar.push(`${l.tarih}: ${e.message}`);
      if (var_) sepler.push(var_); // eskisini koru
    }
  }

  let gerceklesen = eski?.gerceklesen ?? null;
  try {
    const [ust, alt] = await Promise.all([hentMetin(UST_URL, { timeout: 60000 }), hentMetin(ALT_URL, { timeout: 60000 })]);
    gerceklesen = gerceklesenFaiz(ust, alt);
  } catch (e) {
    hatalar.push(`FRED: ${e.message}`);
  }

  if (!sepler.length) throw new Error('Hiç SEP alınamadı');
  sepler.sort((a, b) => a.tarih.localeCompare(b.tarih));
  const veri = { alinma: new Date().toISOString(), kaynaklar: KAYNAKLAR, sepler, gerceklesen };
  return { veri, hatalar, indirilen: indirilen };
}

async function main() {
  const yaz = process.argv.includes('--yaz');
  const hepsi = process.argv.includes('--hepsi');
  console.log('Fed SEP verileri çekiliyor...');
  const { veri, hatalar, indirilen } = await fedVerisiUret({ hepsi });
  const ilk = veri.sepler[0];
  const son = veri.sepler.at(-1);
  console.log(`SEP sayısı: ${veri.sepler.length} (${ilk.tarih} – ${son.tarih}), bu çalıştırmada indirilen: ${indirilen}`);
  const f = son.degiskenler.faiz;
  console.log(`Son SEP faiz medyanı (${son.yillar.join('/')}): ${f.medyan.join(' / ')} | önceki: ${f.onceki?.join(' / ')}`);
  if (veri.gerceklesen) {
    const g = veri.gerceklesen.sonGozlem;
    console.log(`Gerçekleşen (${g.tarih}): ${g.alt}–${g.ust}, orta ${g.orta}`);
  }
  if (hatalar.length) {
    console.error('Hatalar:\n' + hatalar.map((h) => ` - ${h}`).join('\n'));
  }
  if (yaz) {
    // Tam başarısızlıkta (hiç yeni veri, hata var) eski dosyayı ezme; kısmi başarıda alınanlar kaydedilir.
    const eski = await eskiyiOku();
    const degisti = !eski || JSON.stringify(eski.sepler) !== JSON.stringify(veri.sepler) || JSON.stringify(eski.gerceklesen) !== JSON.stringify(veri.gerceklesen);
    if (!degisti) {
      console.log('Veri değişmedi; dosya yazılmadı.');
    } else {
      await writeFile(HEDEF_DOSYA, JSON.stringify(veri, null, 2) + '\n', 'utf-8');
      console.log(`Veri kaydedildi: ${HEDEF_DOSYA}`);
    }
  } else {
    console.log('Veriyi kaydetmek için --yaz parametresini ekleyin.');
  }
  if (hatalar.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((hata) => {
    console.error('Hata:', hata);
    process.exit(1);
  });
}
