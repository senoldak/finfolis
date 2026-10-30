// Ekonomik ajanda veri şeması, gösterge değerlendirme mantığı ve yardımcı işlevler.
// Kimlik v2 (BRAND.md) ve ürün ilkeleri (PRODUCT.md): sakin, öğretici ve sıcak.
// Rakam kuru bir borsa terminali gibi verilmez; her gösterge ne anlama geldiği ve eşiğiyle açıklanır.
import { z } from 'astro/zod';
import ajandaVeriDosyasi from '../data/ajanda.json' with { type: 'json' };

export const ONEM_DERECELERI = /** @type {const} */ (['kritik', 'yuksek', 'orta', 'dusuk']);

export const esikSemasi = z.object({
  deger: z.number(),
  tur: z.string().optional(),
  yon: z.enum(['ustu-buyume', 'alti-buyume', 'hedef-civari']).optional(),
  aciklama: z.string().optional(),
});

export const gostergeSemasi = z.object({
  id: z.string().min(2),
  saat: z.string().regex(/^\d{1,2}:\d{2}$/, 'Saat GG:DD biçiminde olmalıdır'),
  ulke: z.string().min(2),
  ulkeKodu: z.string().length(2),
  bayrak: z.string().min(1),
  gosterge: z.string().min(2),
  donem: z.string().optional(),
  onem: z.enum(ONEM_DERECELERI).default('orta'),
  onceki: z.string().min(1),
  beklenti: z.string().nullable().optional(),
  aciklanan: z.string().nullable().optional(),
  birim: z.string().optional(),
  esik: esikSemasi.optional(),
  nedenOnemli: z.string().min(10, 'Eğitici not en az 10 karakter olmalıdır'),
  piyasaEtkisi: z.string().optional(),
  kaynak: z.string().min(2),
  kaynakUrl: z.string().url().or(z.literal('')).nullable().optional(),
});

export const gunlukAjandaSemasi = z.object({
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalıdır'),
  baslik: z.string().min(2),
  altBaslik: z.string().optional(),
  ozet: z.string().optional(),
  gostergeler: z.array(gostergeSemasi).min(1, 'En az bir gösterge bulunmalıdır'),
});

export const ajandaVerisiSemasi = z.object({
  guncellenme: z.string().optional(),
  kaynak: z.string().optional(),
  ajandalar: z.array(gunlukAjandaSemasi).min(1),
});

/**
 * Türkçe ve uluslararası biçimlendirilmiş metinden veya sayıdan sayısal değeri ayrıştırır.
 * "49,8" -> 49.8, "49.8" -> 49.8, "−0,2" -> -0.2, "%-0,2" -> -0.2, "-4,8 Milyar $" -> -4.8, 50 -> 50
 * @param {string|number|null|undefined} metin
 * @returns {number|null}
 */
export function sayiCoz(metin) {
  if (metin == null) return null;
  if (typeof metin === 'number') return Number.isFinite(metin) ? metin : null;
  if (typeof metin !== 'string') return null;

  // Unicode eksi ve tire karakterlerini (U+2212, U+2013, U+2014, U+FE63, U+FF0D) ASCII '-' yap
  let s = metin.replace(/[\u2212\u2013\u2014\uFE63\uFF0D]/g, '-').trim();

  // Binlik ve ondalık ayırıcıları çöz
  const sonNokta = s.lastIndexOf('.');
  const sonVirgul = s.lastIndexOf(',');

  if (sonNokta !== -1 && sonVirgul !== -1) {
    if (sonVirgul > sonNokta) {
      // 1.250,50 -> noktaları at, virgülü nokta yap
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50 -> virgülleri at
      s = s.replace(/,/g, '');
    }
  } else if (sonVirgul !== -1) {
    // Sadece virgül var -> "49,8" -> "49.8"
    s = s.replace(',', '.');
  }
  // Sadece nokta varsa ("49.8") zaten standart ondalık biçimindedir

  // Rakam, nokta, artı ve eksiyi bırak, gerisini temizle
  const temiz = s.replace(/[^\d.\-+]/g, '');
  const sayi = parseFloat(temiz);
  return Number.isFinite(sayi) ? sayi : null;
}

/**
 * PMI (Satın Alma Yöneticileri Endeksi) değerini 50 eşiğine göre yorumlar.
 * @param {number|string|null|undefined} deger
 * @returns {{ durum: 'genisleme'|'daralma'|'notr'|'belirsiz', aciklama: string, etiket: string }}
 */
export function pmiDegerlendir(deger) {
  const sayi = typeof deger === 'number' ? deger : sayiCoz(deger);
  if (sayi == null) {
    return { durum: 'belirsiz', aciklama: '50 eşik değerdir; 50 üzeri büyüme, altı daralmadır.', etiket: 'Eşik: 50' };
  }
  if (sayi > 50) {
    return { durum: 'genisleme', aciklama: '50 eşiğinin üzerinde; sektörde büyümeye (genişlemeye) işaret eder.', etiket: 'Büyüme Bölgesi (>50)' };
  }
  if (sayi < 50) {
    return { durum: 'daralma', aciklama: '50 eşiğinin altında; sektörde daralmaya (yavaşlamaya) işaret eder.', etiket: 'Daralma Bölgesi (<50)' };
  }
  return { durum: 'notr', aciklama: 'Tam 50 seviyesinde; sektörde büyüme veya daralma olmadığını gösterir.', etiket: 'Eşik Düzeyi (50)' };
}

/**
 * Göstergenin önem derecesine uygun Türkçe etiket ve CSS sınıfı döner.
 * @param {'kritik'|'yuksek'|'orta'|'dusuk'|string} onem
 */
export function onemBilgisi(onem) {
  switch (onem) {
    case 'kritik':
      return { etiket: 'Kritik Önem', kisa: 'Kritik', sinif: 'onem-kritik' };
    case 'yuksek':
      return { etiket: 'Yüksek Önem', kisa: 'Yüksek', sinif: 'onem-yuksek' };
    case 'orta':
      return { etiket: 'Orta Düzey', kisa: 'Orta', sinif: 'onem-orta' };
    case 'dusuk':
    default:
      return { etiket: 'İzleme', kisa: 'Düşük', sinif: 'onem-dusuk' };
  }
}

/**
 * Açıklanan değer ile beklenti veya önceki arasındaki farkı ve yönü değerlendirir.
 * @param {import('./ajanda.d.mts').AjandaGosterge} gosterge
 * @returns {{ durumu: 'beklenti-ustu'|'beklenti-alti'|'paralel'|'bekleniyor', metin: string, yon?: 'yukari'|'asagi'|'ayni' }}
 */
export function gostergeFarkiniHesapla(gosterge) {
  if (!gosterge.aciklanan) {
    return { durumu: 'bekleniyor', metin: 'Sonuç bekleniyor' };
  }
  const aciklananSayi = sayiCoz(gosterge.aciklanan);
  const beklentiSayi = sayiCoz(gosterge.beklenti);
  const oncekiSayi = sayiCoz(gosterge.onceki);

  const kiyaslanan = beklentiSayi ?? oncekiSayi;
  const beklentiVar = beklentiSayi != null;

  if (aciklananSayi == null || kiyaslanan == null) {
    return { durumu: 'paralel', metin: 'Açıklandı' };
  }

  const fark = Math.round((aciklananSayi - kiyaslanan) * 100) / 100;
  if (Math.abs(fark) < 0.05) {
    const paralelMetin = beklentiVar ? 'beklentiye paralel' : 'öncekine paralel';
    return { durumu: 'paralel', metin: paralelMetin, yon: 'ayni' };
  }
  if (fark > 0) {
    const ustMetin = beklentiVar
      ? `beklenti üzerinde (+${fark.toLocaleString('tr-TR')})`
      : `öncekinin üzerinde (+${fark.toLocaleString('tr-TR')})`;
    return { durumu: 'beklenti-ustu', metin: ustMetin, yon: 'yukari' };
  }
  const altMetin = beklentiVar
    ? `beklenti altında (${fark.toLocaleString('tr-TR')})`
    : `öncekinin altında (${fark.toLocaleString('tr-TR')})`;
  return { durumu: 'beklenti-alti', metin: altMetin, yon: 'asagi' };
}

/**
 * Verilen ajanda listesinden tarihine göre günün ajandasını döner.
 * Tarih verilmezse en yeni (en son) ajandayı getirir.
 * @param {string} [tarih] YYYY-AA-GG
 * @param {import('./ajanda.d.mts').AjandaVerisi} [veri]
 * @returns {import('./ajanda.d.mts').GunlukAjanda}
 */
export function gunlukAjandaGetir(tarih, veri = ajandaVeriDosyasi) {
  const ajandalar = veri?.ajandalar ?? [];
  if (ajandalar.length === 0) {
    throw new Error('Ajanda verisi boş veya bulunamadı');
  }
  if (tarih) {
    const bulunan = ajandalar.find((a) => a.tarih === tarih);
    if (bulunan) return bulunan;
  }
  // En güncel ajanda
  return ajandalar[0];
}

/**
 * Göstergeleri kategori veya önem filtresine göre süzer.
 * @param {import('./ajanda.d.mts').AjandaGosterge[]} gostergeler
 * @param {'tumu'|'kritik'|'turkiye'|'kuresel'} filtre
 * @returns {import('./ajanda.d.mts').AjandaGosterge[]}
 */
export function gostergeleriFiltrele(gostergeler, filtre = 'tumu') {
  if (!Array.isArray(gostergeler)) return [];
  switch (filtre) {
    case 'kritik':
      return gostergeler.filter((g) => g.onem === 'kritik' || g.onem === 'yuksek');
    case 'turkiye':
      return gostergeler.filter((g) => g.ulkeKodu === 'TR');
    case 'kuresel':
      return gostergeler.filter((g) => g.ulkeKodu !== 'TR');
    case 'tumu':
    default:
      return gostergeler;
  }
}

/**
 * Anasayfa veya özet vitrin için günün en kritik ve öne çıkan göstergelerini seçer.
 * Kritik ve yüksek önemdekileri önceler, saat sırasına göre dizer.
 * @param {import('./ajanda.d.mts').GunlukAjanda} [ajanda]
 * @param {number} [limit=4]
 * @returns {import('./ajanda.d.mts').AjandaGosterge[]}
 */
export function oneCikanGostergeler(ajanda, limit = 4) {
  const aktifAjanda = ajanda ?? gunlukAjandaGetir();
  const gostergeler = aktifAjanda?.gostergeler ?? [];
  if (gostergeler.length === 0 || limit <= 0) return [];

  const ONEM_PUANI = {
    kritik: 4,
    yuksek: 3,
    orta: 2,
    dusuk: 1,
  };

  const adaylar = gostergeler.map((g, index) => {
    const onemSkoru = ONEM_PUANI[g.onem] ?? 1;
    // Yerel (TR) göstergeler eşit önem düzeyinde hafif öncelikli
    const yerelBonus = g.ulkeKodu === 'TR' ? 0.2 : 0;
    return {
      gosterge: g,
      index,
      skor: onemSkoru + yerelBonus,
    };
  });

  // Skora göre azalan sırala, eşitlikte günün akış sırasını koru
  adaylar.sort((a, b) => b.skor - a.skor || a.index - b.index);

  // En yüksek öncelikli limit kadar göstergeyi seç
  const secilenler = adaylar.slice(0, limit);

  // Vitrinde günün doğal akışı içinde (saat / kronolojik sıra) göstermek için
  // seçilen göstergeleri orijinal sırasına göre tekrar diz
  secilenler.sort((a, b) => a.index - b.index);

  return secilenler.map((a) => a.gosterge);
}


/**
 * Temel makroekonomik kavramlar için öğretici sözlük kartı.
 * Kullanıcı göstergeye tıkladığında veya merak ettiğinde sabırlı bir öğretmen gibi açıklar.
 */
export const GOSTERGE_REHBERI = /** @type {const} */ ({
  pmi: {
    baslik: 'PMI (Satın Alma Yöneticileri Endeksi)',
    esik: '50 puan',
    nedir: 'Şirketlerin satın alma ve tedarik yöneticilerine yapılan aylık anketle hesaplanan öncü ekonomik göstergedir.',
    nasilOkunur: '50 üzeri genişleme (büyüme), 50 altı daralma demektir. 50\'den uzaklaştıkça büyüme ya da daralmanın hızı artar.',
    onemi: 'Resmi sanayi üretimi ve GSYH büyümesi 2-3 ay sonra yayımlanırken, PMI ay biter bitmez açıklanır ve en erken sinyali verir.',
  },
  tufe: {
    baslik: 'TÜFE (Tüketici Fiyat Endeksi)',
    esik: 'Merkez bankası hedefi (%5 / %2)',
    nedir: 'Hanehalklarının günlük yaşamda tükettiği mal ve hizmetlerin fiyatlarındaki ortalama değişim hızını ölçer.',
    nasilOkunur: 'Aylık oran fiyat artışının ivmesini, yıllık oran ise son bir yıldaki hayat pahalılığı artışını gösterir.',
    onemi: 'Maaş zamları, kira tavanı ve faiz kararlarının ana belirleyicisidir.',
  },
  faiz: {
    baslik: 'Politika Faizi (1 Hafta Repo)',
    esik: 'Enflasyon beklentisi (Reel faiz dengesi)',
    nedir: 'Merkez bankasının ticari bankalara borç verirken uyguladığı referans faiz oranıdır.',
    nasilOkunur: 'Faiz yükselirse kredi ve mevduat faizleri artar, harcama azalır, tasarruf teşvik edilir, enflasyon düşürülmeye çalışılır.',
    onemi: 'Piyasadaki tüm borçlanma maliyetlerini ve döviz kurlarının seyrini doğrudan etkiler.',
  },
  pce: {
    baslik: 'Çekirdek PCE (Kişisel Tüketim Harcamaları)',
    esik: 'Fed hedefi: %2,0',
    nedir: 'ABD Merkez Bankası\'nın (Fed) enflasyonu izlerken en çok güvendiği göstergedir; gıda ve enerjiyi dışlar.',
    nasilOkunur: 'TÜFE\'den farklı olarak hanehalkının ürün ikamelerini hesaba katar; daha pürüzsüz ve kalıcı bir trend sunar.',
    onemi: 'Fed\'in faiz artırma ya da indirme hızını en net şekillendiren veri setidir.',
  },
});
