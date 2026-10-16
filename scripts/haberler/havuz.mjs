// Kısa haber havuzu: yayın kurulunda yalnızca kısa kaldığı için duran olaylar hemen bültene düşmez, çalıştırmalar
// arasında bekler. Aynı kategoriden bir eş gelince ikisi tema derlemesi olur (derleme.mjs). HAVUZ_SAAT içinde eş
// bulamayan olay bülten satırına adaydır; SON_SAAT'e kadar bültene de giremezse düşer.
// Olaylar kaynak metni ve adresi taşır: durum dosyasında kayıt başına şifreli durur (gizli.mjs). Anahtar yoksa havuz
// yazılmaz; düz metin hiçbir zaman dosyaya girmez.
import { anahtarVar, coz, sifrele } from './gizli.mjs';

export const HAVUZ_SAAT = 6; // eş bekleme süresi (finfolis turu 2 saatte bir: 3 tur)
export const SON_SAAT = 24; // bülten satırı olarak da bekleme sınırı
export const HAVUZ_AZAMI = 16; // aşan en eski olaylar beklemeden bülten adayı olur
const KAYNAK_AZAMI = 3500; // olay başına saklanan kaynak metni (derleme isteminde de bu kadarı kullanılır)

const yas = (o, simdi) => (simdi.getTime() - Date.parse(o.havuzaGirdi)) / 3600e3;

// Kısa olayı havuza girecek biçime getirir: kaynak metni kırpılır, giriş zamanı eklenir.
export function havuzaHazirla(o, iso) {
  return {
    ...o,
    havuzaGirdi: iso,
    adaylar: (o.adaylar ?? []).map((a) => ({ ...a, kaynakMetni: String(a.kaynakMetni ?? '').slice(0, KAYNAK_AZAMI) })),
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
      acik.push({ ...coz(k.sifreli), havuzaGirdi: k.havuzaGirdi, sifreli: k.sifreli });
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

// bekleyen: eş aramaya devam edenler; suresiDolan: bülten satırına aday olanlar (HAVUZ_SAAT doldu, havuz taştı ya da
// derlemesi denendi);
// dusen: SON_SAAT'i geçenler.
export function havuzAyir(havuz, simdi) {
  const dusen = havuz.filter((o) => yas(o, simdi) >= SON_SAAT);
  const kalan = havuz.filter((o) => yas(o, simdi) < SON_SAAT).sort((a, b) => Date.parse(b.havuzaGirdi) - Date.parse(a.havuzaGirdi));
  const bekleyen = [];
  const suresiDolan = [];
  for (const o of kalan) {
    if (!o.derlemeDenendi && yas(o, simdi) < HAVUZ_SAAT && bekleyen.length < HAVUZ_AZAMI) bekleyen.push(o);
    else suresiDolan.push(o);
  }
  return { bekleyen, suresiDolan, dusen };
}
