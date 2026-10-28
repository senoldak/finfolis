// Merkez bankası metin tonu puanlayıcıların ortak döngüsü (ppk-ton.mjs, fomc-ton.mjs). Metin dosyasındaki belgelerden
// henüz puanlanmamış olanları Gemini'ye okutur, sonucu ton dosyasına ekler. Puanlanmış metin bir daha okunmaz (istem
// sürümü değişmedikçe). Gemini kotasını korumak için bir turda en çok --en-cok (varsayılan 4) metin, en yeniden eskiye.
import { readFile, writeFile } from 'node:fs/promises';
import { gemini } from '../haberler/lib.mjs';
import { SEMA, yanitDogrula, belgeListesi } from '../../src/lib/ppk-ton.mjs';

const oku = async (yol, yedek) => {
  try {
    return JSON.parse(await readFile(yol, 'utf8'));
  } catch {
    return yedek;
  }
};

// ayar: { ad, metinDosyasi, tonDosyasi, turler, sistem, istemKur, istemSurumu, amac, metin? }
// metin(belge): modele verilen ve alıntıların arandığı metin; yoksa belgenin bütün paragrafları.
export async function tonCalistir(ayar, argv = process.argv) {
  const yaz = argv.includes('--yaz');
  const i = argv.indexOf('--en-cok');
  const enCok = i > 0 ? Number(argv[i + 1]) : 4;
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY yok; puanlama atlandı.');
    return;
  }
  const metinler = belgeListesi(await oku(ayar.metinDosyasi, null));
  if (!metinler.belgeler.length) {
    console.log(`${ayar.ad}: metin dosyası yok ya da boş; puanlama atlandı.`);
    return;
  }
  const ton = await oku(ayar.tonDosyasi, { istemSurumu: ayar.istemSurumu, puanlar: {} });
  const bekleyen = metinler.belgeler
    .filter((b) => ayar.turler.includes(b.tur) && ton.puanlar[b.id]?.istemSurumu !== ayar.istemSurumu)
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, enCok);
  console.log(`${ayar.ad}: bekleyen ${bekleyen.length} metin (bu tur en çok ${enCok}).`);
  let yeni = 0;
  for (const asil of bekleyen) {
    const b = ayar.metin ? { ...asil, paragraflar: ayar.metin(asil) } : asil;
    let sonuc = null;
    // Alıntısı metinde birebir bulunmayan yanıt reddedilir; bir kez daha denenir.
    for (let deneme = 0; deneme < 2 && !sonuc; deneme++) {
      const yanit = await gemini({ sistem: ayar.sistem, istem: ayar.istemKur(b), sema: SEMA, dusunme: 'low', _amac: ayar.amac });
      sonuc = yanitDogrula(yanit, b);
    }
    if (!sonuc) {
      console.log(`  ${b.id}: geçerli okuma yok, sonraki tura kaldı.`);
      continue;
    }
    ton.puanlar[b.id] = { ...sonuc, istemSurumu: ayar.istemSurumu, okundu: new Date().toISOString() };
    yeni++;
    console.log(`  ${b.id} (${b.tarih}): ileri yön ${sonuc.ileriYon}, duruş ${sonuc.durus}`);
  }
  if (!yeni) return;
  ton.istemSurumu = ayar.istemSurumu;
  ton.guncelleme = new Date().toISOString();
  if (yaz) {
    await writeFile(ayar.tonDosyasi, JSON.stringify(ton, null, 2) + '\n', 'utf8');
    console.log(`${yeni} yeni okuma yazıldı: ${ayar.tonDosyasi}`);
  } else console.log('Kaydetmek için --yaz.');
}
