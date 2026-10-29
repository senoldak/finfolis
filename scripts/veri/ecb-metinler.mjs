// ECB para politikası kararları basın açıklaması, basın toplantısı giriş metni ve toplantı hesabı metinlerini toplar,
// src/data/ecb-metinler.json dosyasına yazar. Yalnız ecb.europa.eu. Yapay zekâ yok.
// Artımlıdır: dosyada var olan belge yeniden indirilmez. Kaynak düşerse var olan dosya bozulmaz.
// Bağlantılar ECB'nin yıllık liste parçalarından (index_include) okunur, tahmin edilmez.
//
// Kullanım: node scripts/veri/ecb-metinler.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentMetin, sleep } from '../haberler/lib.mjs';
import {
  ECB_KARAR_LISTE,
  ECB_ACIKLAMA_LISTE,
  ECB_HESAP_LISTE,
  yilParcalari,
  listeAyristir,
  belgeTuru,
  adresTarihi,
  hesapToplantiTarihi,
  kararAyristir,
  aciklamaAyristir,
  hesapAyristir,
  ecbKarari,
  cumleBol,
} from '../../src/lib/ecb-metin.mjs';

const HEDEF = fileURLToPath(new URL('../../src/data/ecb-metinler.json', import.meta.url));
const ILK_TARIH = '2023-01-01'; // Ocak 2023'ten önceki toplantılar kapsam dışı
const BEKLEME_MS = 1000;
const KAYNAK = { ad: 'ECB para politikası kararları', url: ECB_KARAR_LISTE };

async function mevcutOku() {
  try {
    const j = JSON.parse(await readFile(HEDEF, 'utf-8'));
    if (Array.isArray(j.belgeler)) return j;
  } catch {}
  return { alinma: null, kaynak: KAYNAK, atlanan: [], belgeler: [] };
}

// Bir liste sayfasının (karar/açıklama/hesap) ilk yıldan bugüne bütün kayıtları: [{ tarih, baslik, url, tur }]
async function listeTopla(sayfaUrl, simdi, indir, bekle) {
  const parcalar = yilParcalari(await indir(sayfaUrl), sayfaUrl).filter((p) => p.yil >= Number(ILK_TARIH.slice(0, 4)) && p.yil <= simdi.getUTCFullYear());
  if (!parcalar.length) throw new Error(`Yıllık liste bulunamadı: ${sayfaUrl}`);
  const out = new Map();
  for (const p of parcalar) {
    await bekle(BEKLEME_MS);
    for (const k of listeAyristir(await indir(p.url))) {
      const tur = belgeTuru(k.url);
      if (tur) out.set(k.url, { ...k, tur });
    }
  }
  return [...out.values()];
}

export async function ecbMetinleriUret({ simdi = new Date(), indir = hentMetin, bekle = sleep, log = console.log } = {}) {
  const veri = await mevcutOku();
  const var_ = new Set([...veri.belgeler.map((b) => b.id), ...(veri.atlanan ?? [])]);
  const yeni = [];
  let hata = 0;
  const bugun = simdi.toISOString().slice(0, 10);

  // Listeler alınamazsa hata fırlar; var olan dosya korunur.
  const kayitlar = [];
  for (const [sayfa, tur] of [[ECB_KARAR_LISTE, 'karar'], [ECB_ACIKLAMA_LISTE, 'aciklama'], [ECB_HESAP_LISTE, 'hesap']]) {
    const l = (await listeTopla(sayfa, simdi, indir, bekle)).filter((k) => k.tur === tur);
    kayitlar.push(...l);
    await bekle(BEKLEME_MS);
  }
  if (!kayitlar.some((k) => k.tur === 'karar')) throw new Error('Listede karar bulunamadı; var olan dosya korunuyor');

  for (const k of kayitlar.sort((a, b) => a.tarih.localeCompare(b.tarih))) {
    let id;
    let toplanti;
    if (k.tur === 'hesap') {
      toplanti = hesapToplantiTarihi(k.baslik);
      if (!toplanti) {
        hata++;
        log(`Hesap başlığı okunamadı: ${k.baslik}`);
        continue;
      }
      id = `ecbhesap_${toplanti}`;
    } else {
      toplanti = adresTarihi(k.url);
      id = `${k.tur === 'karar' ? 'ecb' : 'ecbacik'}_${toplanti}`;
    }
    if (toplanti < ILK_TARIH || k.tarih > bugun || var_.has(id)) continue;
    try {
      const s = k.tur === 'karar' ? kararAyristir(await indir(k.url)) : k.tur === 'aciklama' ? aciklamaAyristir(await indir(k.url)) : hesapAyristir(await indir(k.url, { timeout: 40000 }));
      if (s.tarih !== k.tarih) throw new Error(`tarih uyuşmuyor: sayfa ${s.tarih}, liste ${k.tarih}`);
      const belge = {
        id,
        tur: k.tur,
        tarih: k.tarih,
        toplantiTarihi: toplanti,
        ...(s.aralik ? { toplantiAraligi: s.aralik } : {}),
        baslik: s.baslik,
        url: k.url,
        paragraflar: s.paragraflar,
        bolumler: s.bolumler,
        cumleler: s.paragraflar.flatMap(cumleBol),
      };
      if (k.tur === 'karar' && !ecbKarari(belge.cumleler)) {
        hata++;
        log(`Faiz kararı okunamadı (${id}); belge yine de eklendi`);
      }
      yeni.push(belge);
      log(`+ ${id} ${s.baslik} (${s.paragraflar.length} paragraf)`);
    } catch (e) {
      hata++;
      log(`Alınamadı (${id}): ${e.message}`);
    }
    await bekle(BEKLEME_MS);
  }

  const belgeler = [...veri.belgeler, ...yeni].sort((a, b) => a.tarih.localeCompare(b.tarih) || a.id.localeCompare(b.id));
  return {
    sonuc: { alinma: yeni.length || !veri.alinma ? simdi.toISOString() : veri.alinma, kaynak: KAYNAK, atlanan: [...(veri.atlanan ?? [])].sort(), belgeler },
    yeniSayi: yeni.length,
    hata,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yaz = process.argv.includes('--yaz');
  const { sonuc, yeniSayi, hata } = await ecbMetinleriUret();
  const ozet = (tur) => {
    const l = sonuc.belgeler.filter((b) => b.tur === tur);
    return `${tur} ${l.length} (${l[0]?.tarih}..${l.at(-1)?.tarih})`;
  };
  console.log(`${ozet('karar')}, ${ozet('aciklama')}, ${ozet('hesap')}; yeni ${yeniSayi}, hata ${hata}`);
  if (yaz) {
    const yeniMetin = JSON.stringify(sonuc, null, 1) + '\n';
    const eskiMetin = await readFile(HEDEF, 'utf-8').catch(() => null);
    // Yalnız içerik değiştiyse yazılır (alinma zaman damgası tek başına dosyayı değiştirmesin).
    const govde = (m) => m && m.replace(/"alinma": "[^"]*"/, '');
    if (govde(yeniMetin) !== govde(eskiMetin)) {
      await writeFile(HEDEF, yeniMetin, 'utf-8');
      console.log('Yazıldı: src/data/ecb-metinler.json');
    } else console.log('Yeni belge yok; dosya değişmedi.');
  }
  if (hata > 0) process.exitCode = 1;
}
