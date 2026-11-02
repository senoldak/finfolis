// Yayın ekibi: haber sayfasındaki "Bu yazı nasıl hazırlandı" kartının adımları ve figürleri.
// Adlar otomatik adımların adıdır, insan değildir (Şenol Dak hariç); görünüşler yayın odası sahnesiyle aynı
// (src/scripts/yayin-odasi.mjs). tur: 'yz' yapay zekâ adımı, 'program' kurala göre çalışan kod, 'insan'.
// Adımlar botun gerçek akışını anlatır (scripts/haberler/uyarlayici.mjs, dogrula.mjs, yayin-kurulu.mjs, standart-kapi.mjs).
import { sahipYazisiMi, zincirYazisiMi } from './yapay-zeka-notu.mjs';

export const AJANLAR = {
  senol: { ad: 'Şenol Dak', rol: 'Gazeteci', tur: 'insan', u: { sac: 'kisa', sacRenk: '#2b211b', ten: '#e6bc96', ust: '#f4f3ee', ceket: '#1b1b1b' } },
  selin: { ad: 'Selin', rol: 'İzci', tur: 'program', u: { sac: 'uzun', sacRenk: '#e2c26a', ten: '#f2cfb0', ust: '#c2502b', ustGolge: '#9a4423' } },
  tarik: { ad: 'Tarık', rol: 'Değerlendirici', tur: 'yz', u: { sac: 'kisa', sakal: true, sacRenk: '#6b4226', ten: '#e3b48f', ust: '#a0643c', ustGolge: '#86512f' } },
  elif: { ad: 'Elif', rol: 'Yazar', tur: 'yz', u: { sac: 'topuz', sacRenk: '#b5482a', ten: '#f5d4ba', ust: '#c2502b', ustGolge: '#9a4423', gozluk: true } },
  zeynep: { ad: 'Zeynep', rol: 'Denetçi', tur: 'program', u: { sac: 'kivircik', sacRenk: '#1f1611', ten: '#8d5a3b', ust: '#5d5b55', ustGolge: '#474d53' } },
  kemal: { ad: 'Kemal', rol: 'Kontrol masası', tur: 'yz', u: { sac: 'kel', sakal: true, sacRenk: '#b8b8b0', ten: '#efc9a8', ust: '#5d6b73', ustGolge: '#4a565d', gozluk: true } },
  toprak: { ad: 'Toprak', rol: 'Kapakçı', tur: 'program', u: { sac: 'kakul', sacRenk: '#1b1b1b', ten: '#d2a079', ust: '#d9b88c', ustGolge: '#c9a27a', alt: '#c2502b' } },
  deniz: { ad: 'Deniz', rol: 'Yayıncı', tur: 'program', u: { sac: 'atkuyrugu', sacRenk: '#2a1c14', ten: '#a8714e', ust: '#3b3a36', ustGolge: '#2b2a27' } },
  ayse: { ad: 'Ayşe', rol: 'Yazı işleri müdürü', tur: 'yz', u: { sac: 'kisa', sacRenk: '#8a8a82', ten: '#f0cdb2', ust: '#3b3a36', ceket: '#3b3a36' } },
  burak: { ad: 'Burak', rol: 'Araştırmacı', tur: 'yz', u: { sac: 'kivircik', sacRenk: '#a0643c', ten: '#f2cfb0', ust: '#5d5b55', sakal: true } },
  ece: { ad: 'Ece', rol: 'Yazar', tur: 'yz', u: { sac: 'uzun', sacRenk: '#3b2a1f', ten: '#c98e66', ust: '#c2502b', ustGolge: '#9a4423' } },
  fikret: { ad: 'Fikret', rol: 'Doğrulayıcı', tur: 'yz', u: { sac: 'kisa', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#5d6b73', gozluk: true } },
  hakan: { ad: 'Hakan', rol: 'Masa editörü', tur: 'yz', u: { sac: 'kel', sacRenk: '#3b2a1f', ten: '#e3b48f', ust: '#c2502b', ceket: '#2d3135' } },
  gul: { ad: 'Gül', rol: 'Grafikçi', tur: 'yz', u: { sac: 'topuz', sacRenk: '#1b1b1b', ten: '#8d5a3b', ust: '#d9b88c', ustGolge: '#c9a27a' } },
  sevgi: { ad: 'Sevgi', rol: 'Dil editörü', tur: 'yz', u: { sac: 'atkuyrugu', sacRenk: '#b5482a', ten: '#f2cfb0', ust: '#a0643c', ustGolge: '#86512f' } },
  cem: { ad: 'Cem', rol: 'Hukukçu', tur: 'yz', u: { sac: 'kisa', sacRenk: '#1b1b1b', ten: '#d2a079', ust: '#f4f3ee', ceket: '#1b1b1b', gozluk: true } },
  mine: { ad: 'Mine', rol: 'Haber müdürü', tur: 'yz', u: { sac: 'uzun', sacRenk: '#6b4226', ten: '#f0cdb2', ust: '#3b3a36', ceket: '#c2502b' } },
};

const adim = (id, metin) => ({ id, metin });

/** Yazının türü: 'sahip' (Şenol Dak'ın yazısı), 'zincir' (yazı işleri), 'bot' (haber botu); bülten ve elle yazı null. */
export function uretimTuru(veri) {
  if (sahipYazisiMi(veri)) return 'sahip';
  if (zincirYazisiMi(veri)) return 'zincir';
  if (veri?.tur === 'bulten' || veri?.uretim === 'editor') return null;
  return 'bot';
}

const YAYIN_SAYISI = { 1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört', 5: 'beş', 6: 'altı', 7: 'yedi', 8: 'sekiz', 9: 'dokuz' };

// medya: haberin altında adıyla gösterilen kaynak yayın sayısı (src/lib/kaynak-adlari.mjs); adlar burada yazılmaz.
function bulmaMetni(icerikTuru, medya = 0) {
  if (medya > 0) return `Haberi ${YAYIN_SAYISI[medya] ?? medya} yayında buldu.`;
  if (icerikTuru === 'resmi') return 'Haberi resmî kurumun duyurusunda buldu.';
  if (icerikTuru === 'arastirma') return 'Haberi kurumun yayımladığı çalışmada buldu.';
  if (icerikTuru === 'veri') return 'Rakam hareketini piyasa ve istatistik verisinde buldu.';
  return 'Haberi takip ettiğimiz kaynakların akışında buldu.';
}

/** Kartın adımları; kart çıkmayacaksa boş dizi. medya: adıyla gösterilen kaynak yayın sayısı. */
export function adimlar(veri, { medya = 0 } = {}) {
  const tur = uretimTuru(veri);
  if (tur === 'sahip') {
    return [
      adim('senol', 'Yazıyı yazdı. Konuyu, veriyi ve bakış açısını seçti, hesapları yaptı.'),
      adim('sevgi', 'İmlayı ve dili düzeltti, içeriği değiştirmedi.'),
    ];
  }
  if (tur === 'zincir') {
    return [
      adim('ayse', 'Konuyu ve bakış açısını seçti.'),
      adim('burak', 'Rakamları ve belgeleri resmî kaynaklardan topladı.'),
      adim('ece', 'Taslağı yazdı.'),
      adim('fikret', 'Rakamları ve alıntıları kaynaklarla karşılaştırdı.'),
      adim('hakan', 'Metni sıkılaştırdı.'),
      adim('gul', 'Grafikleri hazırladı.'),
      adim('sevgi', 'Dili gözden geçirdi.'),
      adim('cem', 'Hukuki riski değerlendirdi.'),
      adim('mine', 'Yazıyı yayına hazırladı.'),
    ];
  }
  if (tur === 'bot') {
    return [
      adim('selin', bulmaMetni(veri?.icerikTuru, medya)),
      adim('tarik', 'Önemini 100 üzerinden puanladı. 60’ın altındaki olaylar ayrı haber olmuyor, en çok bültende bir satır oluyor.'),
      adim('elif', 'Metni kaynağa dayanarak yazdı.'),
      adim('zeynep', 'Metindeki her rakamın ve alıntının kaynakta geçtiğini denetledi.'),
      adim('kemal', 'Olguları, atıfları ve başlığı kaynakla karşılaştırdı; yatırım tavsiyesi ya da abartı aradı, dili düzeltti.'),
      adim('toprak', 'Kapak görselini çizdi.'),
      adim('deniz', 'Yayın kuralları süzgecinden geçen haberi yayımladı.'),
    ];
  }
  return [];
}

const SAYI = { 2: 'İki', 3: 'Üç', 4: 'Dört', 5: 'Beş', 6: 'Altı', 7: 'Yedi', 8: 'Sekiz', 9: 'Dokuz' };
const sayiYaz = (n) => SAYI[n] ?? String(n);
const kucuk = (s) => s.toLocaleLowerCase('tr');

/** Kapalı kartın tek satırı, açık kartın açıklaması ve sorumluluk cümlesi. */
export function kartMetinleri(veri) {
  const tur = uretimTuru(veri);
  const liste = adimlar(veri);
  const yz = liste.filter((a) => AJANLAR[a.id].tur === 'yz').length;
  const prg = liste.filter((a) => AJANLAR[a.id].tur === 'program').length;
  if (tur === 'sahip') {
    return {
      ozet: 'Şenol Dak yazdı. Yapay zekâ yalnız dili düzeltti.',
      aciklama: 'Yazı Şenol Dak’ın kendi yazısı. Yapay zekâ imlayı ve dili düzeltti; içeriğe, bakış açısına ve rakamlara dokunmadı.',
      sorumluluk: ', gazeteci, yayıncı ve editör, yazıyı yayından önce okudu ve onayladı.',
      insanOkumadi: false,
    };
  }
  if (tur === 'zincir') {
    return {
      ozet: `${sayiYaz(yz)} yapay zekâ adımıyla yazıldı, editör onayladı.`,
      aciklama: 'Yazı yapay zekâ adımlarıyla hazırlandı. Rakamlar ve alıntılar resmî kaynaklarla karşılaştırıldı; yazı yayından önce editör tarafından okunup onaylandı.',
      sorumluluk: ', gazeteci, yayıncı ve editör, yazıyı yayından önce okudu ve onayladı.',
      insanOkumadi: false,
    };
  }
  return {
    ozet: `Otomatik yazıldı: ${kucuk(sayiYaz(yz))} yapay zekâ adımı, ${kucuk(sayiYaz(prg))} program adımı.`,
    aciklama: 'Haber, takip ettiğimiz kaynaklardan otomatik yazıldı. Yapay zekâ adımları “YZ”, kurala göre çalışan program adımları “Program” diye işaretli.',
    sorumluluk: ', gazeteci, yayıncı ve editör, otomatik yayının kurallarını belirliyor.',
    insanOkumadi: true,
  };
}
