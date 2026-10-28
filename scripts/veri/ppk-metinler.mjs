// TCMB PPK karar metinleri (Faiz Oranlarına İlişkin Basın Duyurusu) ve toplantı özetlerini toplar,
// src/data/ppk-metinler.json dosyasına yazar. Yalnız tcmb.gov.tr. Yapay zekâ yok.
// Artımlıdır: dosyada var olan belge yeniden indirilmez. Kaynak düşerse var olan dosya bozulmaz.
//
// Kullanım: node scripts/veri/ppk-metinler.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep } from '../haberler/lib.mjs';
import { TCMB_TABAN, listedenBelgeler, belgeAyristir, cumleBol } from '../../src/lib/ppk-metin.mjs';

const HEDEF = fileURLToPath(new URL('../../src/data/ppk-metinler.json', import.meta.url));
const ILK_YIL = 2023;
const ILK_TARIH = '2023-06-01'; // Haziran 2023'ten önceki toplantılar kapsam dışı
const BEKLEME_MS = 1000;
const KAYNAK = { ad: 'TCMB duyurular', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin' };

async function mevcutOku() {
  try {
    const j = JSON.parse(await readFile(HEDEF, 'utf-8'));
    if (Array.isArray(j.belgeler)) return j;
  } catch {}
  return { alinma: null, kaynak: KAYNAK, atlanan: [], belgeler: [] };
}

export async function ppkMetinleriUret({ simdi = new Date(), indir = hentMetin, bekle = sleep, log = console.log } = {}) {
  const veri = await mevcutOku();
  const var_ = new Set(veri.belgeler.map((b) => b.id));
  const atlanan = new Set(veri.atlanan ?? []);
  const yeni = [];
  let listeBasari = 0;
  let hata = 0;

  for (let yil = ILK_YIL; yil <= simdi.getUTCFullYear(); yil++) {
    let liste;
    try {
      liste = listedenBelgeler(await indir(`${TCMB_TABAN}/${yil}`), yil);
      listeBasari++;
    } catch (e) {
      hata++;
      log(`Liste alınamadı (${yil}): ${e.message}`);
      await bekle(BEKLEME_MS);
      continue;
    }
    await bekle(BEKLEME_MS);
    for (const b of liste) {
      const id = `ppk_${b.kod}`;
      if (var_.has(id) || atlanan.has(id)) continue;
      try {
        const s = belgeAyristir(await indir(b.url));
        if (s.sayi && s.sayi !== b.kod) throw new Error(`sayı uyuşmuyor: ${s.sayi}`);
        if (s.baslik !== b.baslik) throw new Error(`başlık uyuşmuyor: ${s.baslik}`);
        if ((s.toplantiTarihi ?? s.tarih) < ILK_TARIH) {
          atlanan.add(id);
          continue;
        }
        const belge = {
          id,
          tur: b.tur,
          tarih: s.tarih,
          ...(s.toplantiTarihi ? { toplantiTarihi: s.toplantiTarihi } : {}),
          baslik: b.baslik,
          url: b.url,
          ...(s.uyeler ? { uyeler: s.uyeler } : {}),
          paragraflar: s.paragraflar,
          ...(b.tur === 'ozet' ? { bolumler: s.bolumler } : {}),
          cumleler: s.paragraflar.flatMap(cumleBol),
        };
        yeni.push(belge);
        log(`+ ${id} ${s.tarih} ${b.baslik}`);
      } catch (e) {
        hata++;
        log(`Belge alınamadı (${id}): ${e.message}`);
      }
      await bekle(BEKLEME_MS);
    }
  }

  if (listeBasari === 0) throw new Error('Hiçbir yıl listesi alınamadı; var olan dosya korunuyor');
  // Kapsam: Haziran 2023 ve sonrasındaki toplantılar (özette toplantı tarihi, kararda duyuru tarihi).
  const kapsam = (b) => (b.toplantiTarihi ?? b.tarih) >= ILK_TARIH;
  for (const b of [...veri.belgeler, ...yeni]) if (!kapsam(b)) atlanan.add(b.id);
  const belgeler = [...veri.belgeler, ...yeni].filter(kapsam).sort((a, b) => a.tarih.localeCompare(b.tarih) || a.id.localeCompare(b.id, 'en', { numeric: true }));
  return {
    sonuc: { alinma: yeni.length || !veri.alinma ? simdi.toISOString() : veri.alinma, kaynak: KAYNAK, atlanan: [...atlanan].sort(), belgeler },
    yeniSayi: yeni.length,
    hata,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yaz = process.argv.includes('--yaz');
  const { sonuc, yeniSayi, hata } = await ppkMetinleriUret();
  const k = sonuc.belgeler.filter((b) => b.tur === 'karar');
  const o = sonuc.belgeler.filter((b) => b.tur === 'ozet');
  console.log(`Karar ${k.length} (${k[0]?.tarih}..${k.at(-1)?.tarih}), özet ${o.length} (${o[0]?.tarih}..${o.at(-1)?.tarih}); yeni ${yeniSayi}, hata ${hata}`);
  if (yaz) {
    const yeniMetin = JSON.stringify(sonuc, null, 1) + '\n';
    const eskiMetin = await readFile(HEDEF, 'utf-8').catch(() => null);
    // Yalnız içerik değiştiyse yazılır (alinma zaman damgası tek başına dosyayı değiştirmesin).
    const govde = (m) => m && m.replace(/"alinma": "[^"]*"/, '');
    if (govde(yeniMetin) !== govde(eskiMetin)) {
      await writeFile(HEDEF, yeniMetin, 'utf-8');
      console.log('Yazıldı: src/data/ppk-metinler.json');
    } else console.log('Yeni belge yok; dosya değişmedi.');
  }
  if (hata > 0) process.exitCode = 1;
}
