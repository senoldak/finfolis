// "Türkiye dünyada kaçıncı?": her gösterge için Türkiye'nin sırası. Saf hesap (ağ yok); veri src/data/emsal-ulkeler.json
// (OECD, BIS) ve src/data/dunya-faizleri.json (BIS) dosyalarındadır. Yargı yoktur: yalnız "en yüksek" ve "en düşük" denir.
// Verisi olmayan ülke o göstergede sayılmaz; kaç ülkenin sayıldığı her sonuçta `n` olarak durur.
import { donemEtiket } from './emsal-ulkeler.mjs';

// kaynak: 'emsal' (emsal-ulkeler.json satırı) ya da 'faiz' (dunya-faizleri.json satırı).
// en: ondalık hane; isaret: pozitife + konur; birim: değerin sonuna yazılan ek.
export const GOSTERGELER = [
  { k: 'gsyhCeyrek', kaynak: 'emsal', ad: 'GSYH, çeyreklik değişim', kisa: 'çeyreklik büyümede', birim: '%', onEk: true, en: 1 },
  { k: 'gsyhYillik', kaynak: 'emsal', ad: 'GSYH, yıllık değişim', kisa: 'yıllık büyümede', birim: '%', onEk: true, en: 1 },
  { k: 'tufe', kaynak: 'emsal', ad: 'TÜFE, yıllık', kisa: 'yıllık enflasyonda', birim: '%', onEk: true, en: 1 },
  { k: 'cekirdek', kaynak: 'emsal', ad: 'Çekirdek TÜFE, yıllık', kisa: 'çekirdek enflasyonda', birim: '%', onEk: true, en: 1 },
  { k: 'issizlik', kaynak: 'emsal', ad: 'İşsizlik oranı', kisa: 'işsizlikte', birim: '%', onEk: true, en: 1 },
  { k: 'faiz', kaynak: 'emsal', ad: 'Politika faizi', kisa: 'politika faizinde', birim: '%', onEk: true, en: 2 },
  { k: 'tahvil', kaynak: 'emsal', ad: '10 yıllık tahvil getirisi', kisa: '10 yıllık tahvil getirisinde', birim: '%', onEk: true, en: 2 },
  { k: 'reel', kaynak: 'emsal', ad: 'Reel faiz', kisa: 'reel faizde', birim: ' puan', onEk: false, en: 1, isaret: true },
  { k: 'faizDegisim', kaynak: 'faiz', ad: 'Politika faizinin 12 aylık değişimi', kisa: 'faizin 12 aylık değişiminde', birim: ' baz puan', onEk: false, en: 0, isaret: true },
];

export const medyan = (d) => {
  if (!d.length) return null;
  const s = [...d].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2;
};

/** Sayıyı Türkçe yazar: eksi işareti gerçek eksi (−), sıfıra yuvarlanan negatif eksi almaz. */
export function sayiYaz(n, en = 1, isaret = false) {
  const yuv = Math.round(Math.abs(n) * 10 ** en);
  const eksi = n < 0 && yuv > 0;
  const m = Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: en, maximumFractionDigits: en });
  return `${eksi ? '−' : isaret && yuv > 0 ? '+' : ''}${m}`;
}

/** Göstergenin değeri: önek % ise "%12,3" ("%" başta, Türkçe yazım), değilse "6,3 puan". */
export function degerYaz(n, g) {
  const m = sayiYaz(n, g.en, !!g.isaret);
  return g.onEk ? `%${m}` : `${m}${g.birim}`;
}

// Bir satırdan (kaynağa göre) { deger, donem } çıkarır; yoksa null.
function gozlem(satir, g, faizSatirlari) {
  if (g.kaynak === 'faiz') {
    const f = faizSatirlari.get(satir.kod);
    return f && typeof f.degisim12Ay === 'number' ? { deger: f.degisim12Ay, donem: f.tarih?.slice(0, 7) ?? null } : null;
  }
  const o = g.k === 'reel' ? (satir.reel ? { deger: satir.reel.deger, donem: satir.reel.tufeDonem } : null) : satir[g.k];
  if (!o || typeof o.deger !== 'number') return null;
  return { deger: o.deger, donem: o.donem ?? o.tarih?.slice(0, 7) ?? null };
}

/**
 * Tüm göstergeler için sıralama.
 * @param emsal emsal-ulkeler.json içeriği
 * @param faizler dunya-faizleri.json içeriği
 * @returns {Array} her gösterge için: { k, ad, kisa, n, sira, yon, yonSira, deger, donem, baslikDonem, ustte, altta, medyan,
 *   dizi, eksik, donemFarkli, uygun }
 *   sira: büyükten küçüğe sıra (eşitlikte aynı sıra); yon/yonSira: "en yüksek 2." ya da "en düşük 5." (yakın uca göre).
 */
export function hesapla(emsal, faizler) {
  const faizSatirlari = new Map((faizler?.satirlar ?? []).map((s) => [s.kod, s]));
  const bd = emsal.baslikDonemleri ?? {};
  return GOSTERGELER.map((g) => {
    const tumu = emsal.satirlar.map((s) => ({ kod: s.kod, ad: s.ad, tr: s.grup === 'tr', o: gozlem(s, g, faizSatirlari) }));
    const dizi = tumu
      .filter((s) => s.o)
      .map((s) => ({ kod: s.kod, ad: s.ad, tr: s.tr, deger: s.o.deger, donem: s.o.donem }))
      .sort((a, b) => b.deger - a.deger || a.ad.localeCompare(b.ad, 'tr'));
    const eksik = tumu.filter((s) => !s.o).map((s) => s.ad);
    const tr = dizi.find((s) => s.tr);
    const n = dizi.length;
    const baslikDonem = g.k === 'faizDegisim' ? null : (bd[g.k] ?? null);
    const diger = dizi.filter((s) => !s.tr);
    const donemFarkli = baslikDonem ? diger.filter((s) => s.donem && s.donem !== baslikDonem).map((s) => ({ ad: s.ad, donem: s.donem })) : [];
    const sonuc = { k: g.k, ad: g.ad, kisa: g.kisa, n, dizi, eksik, baslikDonem, donemFarkli, medyan: medyan(diger.map((s) => s.deger)), uygun: !!tr };
    if (!tr) return { ...sonuc, sira: null, yon: null, yonSira: null, deger: null, donem: null, ustte: null, altta: null };
    const sira = 1 + dizi.filter((s) => s.deger > tr.deger).length;
    const siraAlt = 1 + dizi.filter((s) => s.deger < tr.deger).length;
    const yon = sira <= siraAlt ? 'en yüksek' : 'en düşük';
    // En yakın üstteki ve alttaki ülke: Türkiye'den kesin büyük en küçük, kesin küçük en büyük değer.
    const ust = dizi.filter((s) => s.deger > tr.deger).at(-1) ?? null;
    const alt = dizi.find((s) => s.deger < tr.deger) ?? null;
    return {
      ...sonuc,
      sira,
      yon,
      yonSira: yon === 'en yüksek' ? sira : siraAlt,
      deger: tr.deger,
      donem: tr.donem,
      ustte: ust && { ad: ust.ad, deger: ust.deger },
      altta: alt && { ad: alt.ad, deger: alt.deger },
    };
  });
}

/** "23 ekonomi arasında reel faizde en yüksek 2." gibi tek cümle. */
export function sonucCumlesi(s) {
  return `${s.n} ekonomi arasında ${s.kisa} ${s.yon} ${s.yonSira}.`;
}

/** Dönem uyumsuzluğu notu; uyumsuzluk yoksa boş metin. Ülke adları en çok üç tane sayılır. */
export function donemNotu(s) {
  const f = s.donemFarkli;
  if (!f.length) return '';
  const ornek = f.slice(0, 3).map((x) => `${x.ad} (${donemEtiket(x.donem)})`).join(', ');
  return `Veri ${donemEtiket(s.baslikDonem)} dönemine ait; ${f.length} ekonomide son dönem farklı: ${ornek}${f.length > 3 ? ' ve diğerleri' : ''}.`;
}

/** Türkiye'nin kendi dönemi başlık döneminden farklıysa bunu söyler. */
export function trDonemNotu(s) {
  if (!s.baslikDonem || !s.donem || s.donem === s.baslikDonem) return '';
  return `Türkiye'nin verisi ${donemEtiket(s.donem)} dönemine ait.`;
}

/** Gösterge anahtarından dosya/adres adı: 'gsyhCeyrek' -> 'gsyh-ceyrek'. */
export const slug = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Kartın altbilgisindeki kaynak adı. */
export const KAYNAK_AD = { gsyhCeyrek: 'OECD', gsyhYillik: 'OECD', tufe: 'OECD', cekirdek: 'OECD', issizlik: 'OECD', tahvil: 'OECD', reel: 'OECD, BIS', faiz: 'BIS', faizDegisim: 'BIS' };
