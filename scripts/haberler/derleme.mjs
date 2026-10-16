// Tema derlemesi: tek başına yayın eşiğinin (yayin-kurulu.mjs, EN_AZ_KELIME) altında kalan kısa olayları,
// aynı kategoriden olanları gruplayıp tek bir yazıda anlatır. Derleme de aynı yayın kurulu kapılarından geçer.
// Bir grup yazılamazsa ya da yayın kurulundan geçemezse olaylar bülten satırı olarak kalır.

export const DERLEME_EN_AZ = 2; // bir derlemede en az bu kadar kısa olay
export const DERLEME_AZAMI = 4; // bir derlemede en fazla bu kadar kısa olay
export const DERLEME_MAKS = 2; // bir çalıştırmada en fazla derleme sayısı
const HABER_BASINA_KAYNAK = 3500; // derleme isteminde her haber için kaynak metninden alınan karakter

// Kısa olayları kategoriye göre gruplar; her grup önem sırasına göre en fazla DERLEME_AZAMI olay içerir.
// Tek kalan olaylar (DERLEME_EN_AZ altı) gruba girmez ve bülten satırı olarak kalır.
export function kisaGruplari(olaylar) {
  const kategoriler = new Map();
  for (const o of olaylar) {
    const k = o.kategori ?? '';
    if (!kategoriler.has(k)) kategoriler.set(k, []);
    kategoriler.get(k).push(o);
  }
  const gruplar = [];
  for (const liste of kategoriler.values()) {
    const sirali = [...liste].sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0));
    for (let i = 0; i < sirali.length; i += DERLEME_AZAMI) {
      const parca = sirali.slice(i, i + DERLEME_AZAMI);
      if (parca.length >= DERLEME_EN_AZ) gruplar.push(parca);
    }
  }
  return gruplar;
}

// Grubu tek bir "aday" gibi döndürür: yazar ve yayın kurulu bunu bekler.
// kaynakMetni: sayı ve alıntı denetimi için birleşik kaynak (her haber kendi kısmında).
export function derlemeAdayi(grup) {
  const adaylar = grup.flatMap((o) => o.adaylar ?? []);
  const haberler = grup.map((o) => ({
    baslik: o.baslik ?? '',
    kaynakMetni: (o.adaylar ?? []).map((a) => a.kaynakMetni ?? '').join('\n\n').slice(0, HABER_BASINA_KAYNAK),
  }));
  const kaynaklar = [...new Map(adaylar.flatMap((a) => a.kaynaklar ?? []).map((k) => [k.url, k])).values()];
  const tarihler = grup.map((o) => new Date(o.tarih ?? 0).getTime());
  return {
    id: `derleme:${grup.map((o) => o.id).join('+')}`,
    kategori: grup[0].kategori,
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
