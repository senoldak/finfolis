// Dilim derlemesi: tek başına yayın eşiğinin (yayin-kurulu.mjs, EN_AZ_KELIME) altında kalan kısa olaylar, havuza
// girdikleri dilim (açılış/öğle/kapanış) bitince kategori aranmadan tek yazıda toplanır; yazı içinde her kategori ara
// başlık olur. Derleme de aynı yayın kurulu kapılarından geçer. Yazılamaz ya da geçemezse olaylar bülten satırı olur.
import { CATEGORIES } from '../../src/lib/kategoriler.js';
import { bultenDilimi, DILIM_HAFIZA, oncekiDilimAnahtari } from './bulten.mjs';
import { dilimAnahtari } from './havuz.mjs';

export const DERLEME_EN_AZ = 2; // bir derlemede en az bu kadar kısa olay
export const DERLEME_AZAMI = 8; // bir derlemede en fazla bu kadar kısa olay; fazlası bülten satırı olur
export const DERLEME_MAKS = 2; // bir çalıştırmada en fazla derleme sayısı
const HABER_BASINA_KAYNAK = 3500; // derleme isteminde her haber için kaynak metninden alınan karakter

// Dilimi bitmiş kısa olayları dilime göre gruplar (en eski dilim önce). Her grup önem sırasıyla en fazla DERLEME_AZAMI
// olay içerir; fazlası ve tek kalan dilimin olayı (DERLEME_EN_AZ altı) artan olur, bülten satırına adaydır.
export function dilimGruplari(olaylar) {
  const dilimler = new Map();
  for (const o of olaylar) {
    const d = dilimAnahtari(o);
    if (!dilimler.has(d)) dilimler.set(d, []);
    dilimler.get(d).push(o);
  }
  const gruplar = [];
  const artan = [];
  // Anahtar "YYYY-MM-DD:dilim"; düz sıralama aynı günde kapanışı öğleden önce koyar, dilimler gün içi sırayla dizilir.
  const SIRA = { acilis: 0, ogle: 1, kapanis: 2 };
  const anahtarSirasi = (k) => { const [g, d] = k.split(':'); return `${g}:${SIRA[d] ?? 9}`; };
  for (const d of [...dilimler.keys()].sort((a, b) => anahtarSirasi(a).localeCompare(anahtarSirasi(b)))) {
    const sirali = [...dilimler.get(d)].sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0));
    if (sirali.length < DERLEME_EN_AZ) {
      artan.push(...sirali);
      continue;
    }
    gruplar.push(sirali.slice(0, DERLEME_AZAMI));
    artan.push(...sirali.slice(DERLEME_AZAMI));
  }
  return { gruplar, artan };
}

// Her dilimin tek derlemesi olur ve yalnız dilim biter bitmez (bir sonraki dilim sürerken) yazılır. Daha eski dilimin
// grubu ya da derlemesi zaten yazılmış dilimin geç gelenleri derleme olmaz, bülten satırına adaydır. 19 Ekim'de bütçe
// darlığıyla bekleyen gruplar ertesi sabaha kadar her turda yeniden derlendi: aynı "açılış" için dört yazı, akşam üst üste.
export function derlenebilir(anahtar, simdi, durum) {
  return anahtar === oncekiDilimAnahtari(simdi) && !(durum.derlemeDilimleri ?? []).includes(anahtar);
}
export function derlemeDilimiKaydet(durum, anahtar) {
  durum.derlemeDilimleri = [...(durum.derlemeDilimleri ?? []).filter((a) => a !== anahtar), anahtar].slice(-DILIM_HAFIZA);
}

const kategoriAdi = (slug) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug ?? '';

// En çok haberi olan kategori; eşitlikte gruptaki ilk (en önemli) haberinki.
function enSikKategori(grup) {
  const sayi = new Map();
  for (const o of grup) sayi.set(o.kategori, (sayi.get(o.kategori) ?? 0) + 1);
  return grup.reduce((en, o) => (sayi.get(o.kategori) > sayi.get(en) ? o.kategori : en), grup[0].kategori);
}

const dilimEki = (o) => {
  const { gun, ay, ad } = bultenDilimi(new Date(o.havuzaGirdi ?? o.tarih ?? 0));
  return `${gun} ${ay}, ${ad}`;
};

// Grubu tek bir "aday" gibi döndürür: yazar ve yayın kurulu bunu bekler.
// kaynakMetni: sayı ve alıntı denetimi için birleşik kaynak (her haber kendi kısmında).
export function derlemeAdayi(grup) {
  const adaylar = grup.flatMap((o) => o.adaylar ?? []);
  const haberler = grup.map((o) => ({
    baslik: o.baslik ?? '',
    kategori: kategoriAdi(o.kategori),
    kaynakMetni: (o.adaylar ?? []).map((a) => a.kaynakMetni ?? '').join('\n\n').slice(0, HABER_BASINA_KAYNAK),
  }));
  const kaynaklar = [...new Map(adaylar.flatMap((a) => a.kaynaklar ?? []).map((k) => [k.url, k])).values()];
  const tarihler = grup.map((o) => new Date(o.tarih ?? 0).getTime());
  return {
    id: `derleme:${grup.map((o) => o.id).join('+')}`,
    kategori: enSikKategori(grup),
    dilimEki: dilimEki(grup[0]),
    tarih: new Date(Math.max(...tarihler)).toISOString(),
    onem: Math.max(...grup.map((o) => o.onem ?? 0)),
    haberler,
    kaynakMetni: haberler.map((h) => h.kaynakMetni).join('\n\n---\n\n'),
    kaynaklar,
    gizliKaynaklar: [...new Set(grup.flatMap((o) => o.gizliKaynaklar ?? []))],
    adaylar,
  };
}

// Derlemenin olay kaydı: yazılan haberle birlikte hafızaya ve haber takibine girer.
export function derlemeOlayi(grup, aday, baslik, slug) {
  return { id: aday.id, baslik, kategori: aday.kategori, tarih: aday.tarih, onem: aday.onem, adaylar: aday.adaylar, kaynaklar: aday.kaynaklar, gizliKaynaklar: aday.gizliKaynaklar, haberSlug: slug, derlenen: grup.map((o) => o.id) };
}
