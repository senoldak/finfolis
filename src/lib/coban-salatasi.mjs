// Çoban Salatası Endeksi (/veri/coban-salatasi/): dört kişilik bir çoban salatasının sebze-meyvesinin İzmir halindeki
// toptan maliyeti, aylık. Veri src/data/hal-fiyat.json (Gıda Fiyatları ve Tahmin sayfalarıyla aynı dosya, bot zincirinde
// güncellenir); ağ isteği yok.
//
//  - Tarif sabittir (TARIF): miktar × ayın ürün fiyatı, altı kalemin toplamı. Zeytinyağı, tuz, nane halde yoktur, girmez.
//  - Bir kalem için birden çok ürün anahtarı sırayla denenir (domates: salkım, yoksa beef, ...); ayda ilk bulunan
//      kullanılır ve hangisi olduğu kalemde yazılır. Bir kalemin hiçbir ürünü yoksa o ay hesaplanmaz.
//  - Yıllık değişim: toplamın bir yıl önceki aynı aya oranı (mevsim böyle sadeleşir). Aylık değişim: geçen aya oranı.
//  - 12 aylık ortalama: son on iki ayın toplamlarının aritmetik ortalaması; on iki ay dolmadan yok.
// Toptan fiyattır, perakende değildir; TÜİK'in tüketici fiyatları endeksi ya da onun bir kalemi değildir.
import { oncekiAy } from './gida.mjs';

// Dört kişilik, yaklaşık bir kilo salata. Anahtar: 'grup|ürünKodu|birim' (hal-fiyat.json), tercih sırasıyla.
export const TARIF = [
  {
    ad: 'Domates',
    miktar: 0.5,
    birim: 'KG',
    anahtarlar: ['sebze|161|KG', 'sebze|229|KG', 'sebze|1529|KG', 'sebze|158|KG', 'sebze|1596|KG', 'sebze|108|KG'],
  },
  { ad: 'Salatalık', miktar: 0.3, birim: 'KG', anahtarlar: ['sebze|159|KG', 'sebze|1401|KG'] },
  { ad: 'Sivri biber', miktar: 0.1, birim: 'KG', anahtarlar: ['sebze|106|KG', 'sebze|1573|KG'] },
  { ad: 'Kuru soğan', miktar: 0.1, birim: 'KG', anahtarlar: ['sebze|126|KG'] },
  { ad: 'Maydanoz', miktar: 1, birim: 'BAĞ', anahtarlar: ['sebze|34|BAĞ'] },
  { ad: 'Limon', miktar: 0.1, birim: 'KG', anahtarlar: ['meyve|33|KG', 'meyve|1532|KG'] },
];

const ayNo = (ay) => Number(ay.slice(0, 4)) * 12 + Number(ay.slice(5, 7)) - 1;
const degisim = (simdi, once) => (once > 0 ? 100 * (simdi / once - 1) : null);

// Bir ayın ürün fiyatlarından ({ anahtar: [fiyat, gün] }) tarifin maliyeti: { toplam, kalemler } ya da null.
export function maliyet(urunler) {
  const kalemler = [];
  for (const k of TARIF) {
    const anahtar = k.anahtarlar.find((a) => urunler[a]?.[0] > 0);
    if (!anahtar) return null;
    const fiyat = urunler[anahtar][0];
    kalemler.push({ ad: k.ad, miktar: k.miktar, birim: k.birim, anahtar, fiyat, tutar: k.miktar * fiyat });
  }
  return { toplam: kalemler.reduce((p, c) => p + c.tutar, 0), kalemler };
}

// Kalemlerin toplam içindeki payı (yüzde).
export function paylar(kalemler) {
  const toplam = kalemler.reduce((p, c) => p + c.tutar, 0);
  return kalemler.map((k) => ({ ...k, pay: toplam > 0 ? (100 * k.tutar) / toplam : 0 }));
}

// [{ ay, t, gun, toplam, aylik, yillik, ort12, kalemler: [{ ..., aylik, yillik }] }], hesaplanamayan aylar yok.
export function salataSerisi(aylar) {
  const m = {};
  for (const ay of Object.keys(aylar)) {
    const r = maliyet(aylar[ay].urunler ?? {});
    if (r) m[ay] = r;
  }
  const sira = Object.keys(m).sort();
  return sira.map((ay, i) => {
    const once = m[oncekiAy(ay, 1)];
    const yil = m[oncekiAy(ay, 12)];
    const son12 = sira.slice(Math.max(0, i - 11), i + 1);
    const tamYil = son12.length === 12 && ayNo(son12[0]) === ayNo(ay) - 11;
    return {
      ay,
      t: ayNo(ay),
      gun: aylar[ay].gunler.length,
      toplam: m[ay].toplam,
      aylik: once ? degisim(m[ay].toplam, once.toplam) : null,
      yillik: yil ? degisim(m[ay].toplam, yil.toplam) : null,
      ort12: tamYil ? son12.reduce((p, a) => p + m[a].toplam, 0) / 12 : null,
      kalemler: m[ay].kalemler.map((k, j) => ({
        ...k,
        aylik: once ? degisim(k.tutar, once.kalemler[j].tutar) : null,
        yillik: yil ? degisim(k.tutar, yil.kalemler[j].tutar) : null,
      })),
    };
  });
}
