// Fed FOMC açıklama (statement) ve tutanak (minutes) metinlerini toplar,
// src/data/fomc-metinler.json dosyasına yazar. Yalnız federalreserve.gov. Yapay zekâ yok.
// Artımlıdır: dosyada var olan belge yeniden indirilmez. Kaynak düşerse var olan dosya bozulmaz.
//
// Kullanım: node scripts/veri/fomc-metinler.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep } from '../haberler/lib.mjs';
import { FED_TAKVIM, takvimdenToplantilar, aciklamaAyristir, tutanakAyristir, cumleBol } from '../../src/lib/fomc-metin.mjs';

const HEDEF = fileURLToPath(new URL('../../src/data/fomc-metinler.json', import.meta.url));
const ILK_TARIH = '2023-01-01'; // Ocak 2023'ten önceki toplantılar kapsam dışı
const BEKLEME_MS = 1000;
const KAYNAK = { ad: 'Federal Reserve FOMC toplantı takvimi', url: FED_TAKVIM };

async function mevcutOku() {
  try {
    const j = JSON.parse(await readFile(HEDEF, 'utf-8'));
    if (Array.isArray(j.belgeler)) return j;
  } catch {}
  return { alinma: null, kaynak: KAYNAK, atlanan: [], belgeler: [] };
}

export async function fomcMetinleriUret({ simdi = new Date(), indir = hentMetin, bekle = sleep, log = console.log } = {}) {
  const veri = await mevcutOku();
  const var_ = new Set([...veri.belgeler.map((b) => b.id), ...(veri.atlanan ?? [])]);
  const atlanan = new Set(veri.atlanan ?? []);
  const yeni = [];
  let hata = 0;

  // Takvim alınamazsa hata fırlar; var olan dosya korunur.
  const toplantilar = takvimdenToplantilar(await indir(FED_TAKVIM)).filter((t) => t.toplantiTarihi >= ILK_TARIH && t.toplantiTarihi <= simdi.toISOString().slice(0, 10));
  if (!toplantilar.length) throw new Error('Takvimde toplantı bulunamadı; var olan dosya korunuyor');
  await bekle(BEKLEME_MS);

  for (const t of toplantilar) {
    if (t.aciklama && !var_.has(`fomc_${t.toplantiTarihi}`)) {
      const id = `fomc_${t.toplantiTarihi}`;
      try {
        const s = aciklamaAyristir(await indir(t.aciklama.url));
        // Takvimde "Statement" olarak geçen ama faiz kararı olmayan duyurular (ör. strateji metni güncellemesi) atlanır.
        if (!/FOMC statement/i.test(s.baslik)) {
          atlanan.add(id);
          log(`- ${id} atlandı: ${s.baslik}`);
          continue;
        }
        if (s.tarih !== t.toplantiTarihi) throw new Error(`tarih uyuşmuyor: ${s.tarih}`);
        yeni.push({
          id,
          tur: 'karar',
          tarih: s.tarih,
          toplantiTarihi: t.toplantiTarihi,
          baslik: s.baslik,
          url: t.aciklama.url,
          paragraflar: s.paragraflar,
          cumleler: s.paragraflar.flatMap(cumleBol),
          ...(s.oyCumlesi ? { oyCumlesi: s.oyCumlesi } : {}),
        });
        log(`+ ${id} ${s.baslik}`);
      } catch (e) {
        hata++;
        log(`Açıklama alınamadı (${id}): ${e.message}`);
      }
      await bekle(BEKLEME_MS);
    }
    if (t.tutanak && !var_.has(`fomctut_${t.toplantiTarihi}`)) {
      const id = `fomctut_${t.toplantiTarihi}`;
      try {
        if (!t.tutanak.yayim) throw new Error('yayım tarihi takvimde yok');
        const s = tutanakAyristir(await indir(t.tutanak.url, { timeout: 40000 }));
        yeni.push({
          id,
          tur: 'tutanak',
          tarih: t.tutanak.yayim,
          toplantiTarihi: t.toplantiTarihi,
          toplantiAraligi: s.aralik,
          baslik: s.baslik,
          url: t.tutanak.url,
          paragraflar: s.paragraflar,
          bolumler: s.bolumler,
          cumleler: s.paragraflar.flatMap(cumleBol),
        });
        log(`+ ${id} ${s.aralik} (${s.paragraflar.length} paragraf)`);
      } catch (e) {
        hata++;
        log(`Tutanak alınamadı (${id}): ${e.message}`);
      }
      await bekle(BEKLEME_MS);
    }
  }

  const belgeler = [...veri.belgeler, ...yeni].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.id.localeCompare(b.id));
  return {
    sonuc: { alinma: yeni.length || !veri.alinma ? simdi.toISOString() : veri.alinma, kaynak: KAYNAK, atlanan: [...atlanan].sort(), belgeler },
    yeniSayi: yeni.length,
    hata,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yaz = process.argv.includes('--yaz');
  const { sonuc, yeniSayi, hata } = await fomcMetinleriUret();
  const k = sonuc.belgeler.filter((b) => b.tur === 'karar');
  const o = sonuc.belgeler.filter((b) => b.tur === 'tutanak');
  console.log(`Açıklama ${k.length} (${k[0]?.tarih}..${k.at(-1)?.tarih}), tutanak ${o.length} (${o[0]?.tarih}..${o.at(-1)?.tarih}); yeni ${yeniSayi}, hata ${hata}`);
  if (yaz) {
    const yeniMetin = JSON.stringify(sonuc, null, 1) + '\n';
    const eskiMetin = await readFile(HEDEF, 'utf-8').catch(() => null);
    // Yalnız içerik değiştiyse yazılır (alinma zaman damgası tek başına dosyayı değiştirmesin).
    const govde = (m) => m && m.replace(/"alinma": "[^"]*"/, '');
    if (govde(yeniMetin) !== govde(eskiMetin)) {
      await writeFile(HEDEF, yeniMetin, 'utf-8');
      console.log('Yazıldı: src/data/fomc-metinler.json');
    } else console.log('Yeni belge yok; dosya değişmedi.');
  }
  if (hata > 0) process.exitCode = 1;
}
