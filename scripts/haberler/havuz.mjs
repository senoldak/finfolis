// Kısa haber havuzu: yayın kurulunda yalnızca kısa kaldığı için duran olaylar tek başına yayımlanmaz; girdikleri
// zaman diliminin (açılış/öğle/kapanış, İstanbul; bkz. bulten.mjs bultenDilimi) sonuna kadar havuzda birikir. Dilim
// bitince o dilimin kısa haberleri kategori aranmadan tek derleme olur (derleme.mjs); tek kalan bülten satırına adaydır.
// SON_SAAT'e kadar bültene de giremezse düşer.
// Olaylar kaynak metni ve adresi taşır: durum dosyasında kayıt başına şifreli durur (gizli.mjs). Anahtar yoksa havuz
// yazılmaz; düz metin hiçbir zaman dosyaya girmez.
import { anahtarVar, coz, sifrele } from './gizli.mjs';
import { bultenDilimi } from './bulten.mjs';

export const SON_SAAT = 24; // bülten satırı olarak da bekleme sınırı
export const HAVUZ_AZAMI = 16; // aşan en eski olaylar beklemeden bülten adayı olur
// Olay başına saklanan kaynak metni: derleme (derleme.mjs HABER_BASINA_KAYNAK) adayların birleşik metninin, bülten
// satırı (bulten.mjs) olayın metninin yalnız başını kullanır. Fazlası şifrelenip her turda commit'lenir, kullanılmaz.
export const KAYNAK_AZAMI = 3500;

const yas = (o, simdi) => (simdi.getTime() - Date.parse(o.havuzaGirdi)) / 3600e3;

// Kısa olayı havuza girecek biçime getirir: kaynak metinleri kırpılır, giriş zamanı eklenir.
// Adayların metni toplamda KAYNAK_AZAMI kadar tutulur (sırayla; derleme de birleşik metnin başını alır), olayın
// birleşik kaynakMetni de aynı sınırla. 19 Ekim'de olay başına 7–95 KB'lık kayıtlar durum dosyasını 2,4 MB'a çıkarmıştı.
export function havuzaHazirla(o, iso) {
  let kalan = KAYNAK_AZAMI;
  const adaylar = (o.adaylar ?? []).map((a) => {
    const metin = String(a.kaynakMetni ?? '').slice(0, Math.max(kalan, 0));
    kalan -= metin.length;
    return { ...a, kaynakMetni: metin };
  });
  return {
    ...o,
    ...(o.kaynakMetni != null ? { kaynakMetni: String(o.kaynakMetni).slice(0, KAYNAK_AZAMI) } : {}),
    havuzaGirdi: iso,
    adaylar,
  };
}

// Durum dosyasındaki kayıtları açar. Açılan olay şifreli metnini de taşır: değişmeyen kayıt yeniden şifrelenmez.
export function havuzAc(kayitlar = []) {
  if (!anahtarVar()) return [];
  const acik = [];
  for (const k of kayitlar) {
    if (!k.sifreli) {
      acik.push(k); // bu çalıştırmada açılmış olay (havuzAc iki kez çağrılırsa)
      continue;
    }
    try {
      const o = coz(k.sifreli);
      // 2026-10-17 öncesi kayıtlar 1–5 ölçeğinde; 0–100'e çevrilir.
      if (o.onem > 0 && o.onem <= 5) o.onem *= 20;
      acik.push({ ...o, havuzaGirdi: k.havuzaGirdi, sifreli: k.sifreli });
    } catch {
      // çözülemeyen kayıt (anahtar değişti) düşer
    }
  }
  return acik;
}

// Durum dosyasına yazılacak biçim: yalnız kimlik, kategori, giriş zamanı ve şifreli olay.
export function havuzKapat(olaylar = []) {
  if (!anahtarVar()) return [];
  return olaylar.map(({ sifreli, havuzaGirdi, ...o }) => ({
    id: o.id,
    kategori: o.kategori ?? '',
    havuzaGirdi,
    sifreli: sifreli ?? sifrele(o),
  }));
}

// Derlemesi denenip yayımlanamayan olay bir daha derlemeye girmez (her turda Gemini harcanmasın); yalnız bülten bekler.
export function derlemeDenendi(o) {
  o.derlemeDenendi = true;
  delete o.sifreli; // değişti: kapatılırken yeniden şifrelenir
}

// Olayın havuza girdiği dilim (ör. "2026-10-12:acilis").
export const dilimAnahtari = (o) => bultenDilimi(new Date(o.havuzaGirdi)).anahtar;

// bekleyen: dilimi sürenler (derleme için birikir); olgun: dilimi bitmiş, derlemeye aday olanlar;
// suresiDolan: bülten satırına aday olanlar (derlemesi denendi ya da havuz taştı); dusen: SON_SAAT'i geçenler.
export function havuzAyir(havuz, simdi) {
  const dusen = havuz.filter((o) => yas(o, simdi) >= SON_SAAT);
  const kalan = havuz.filter((o) => yas(o, simdi) < SON_SAAT).sort((a, b) => Date.parse(b.havuzaGirdi) - Date.parse(a.havuzaGirdi));
  const simdikiDilim = bultenDilimi(simdi).anahtar;
  const bekleyen = [];
  const olgun = [];
  const suresiDolan = [];
  for (const o of kalan) {
    if (o.derlemeDenendi) suresiDolan.push(o);
    else if (dilimAnahtari(o) !== simdikiDilim) olgun.push(o);
    else if (bekleyen.length < HAVUZ_AZAMI) bekleyen.push(o);
    else suresiDolan.push(o);
  }
  return { bekleyen, olgun, suresiDolan, dusen };
}
