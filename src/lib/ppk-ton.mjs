// PPK metin tonu: TCMB'nin PPK karar metinleri ve toplantı özetleri yapay zekâyla okunur, iki puan verilir.
//  - İleri yön: metnin sonraki adımlar için verdiği işaret. −3 güçlü gevşeme (güvercin), +3 güçlü sıkılaştırma (şahin).
//  - Mevcut duruş: metnin bugünkü para politikasını nasıl tanımladığı. −3 çok gevşek, +3 çok sıkı.
// Model yalnız metne bakar; gerekçe ve metinden birebir alıntı vermek zorundadır. Metinde birebir geçmeyen alıntı atılır,
// hiç geçerli alıntı kalmazsa okuma reddedilir. Bu dosyada ağ yok; çağrı scripts/veri/ppk-ton.mjs'te.

export const ISTEM_SURUMU = 2;

export const SISTEM = `Sen bir merkez bankası metin okuyucususun. Sana Türkiye Cumhuriyet Merkez Bankası Para Politikası Kurulu'nun bir metni verilecek.
Yalnız bu metne dayan. Metin dışı bilgi, piyasa beklentisi, sonradan olanlar ya da kendi görüşün puana girmez.

İki puan ver, her biri -3 ile +3 arasında, 0,5'lik adımlarla:

1) ileri_yon: Metnin para politikasının SONRAKİ adımları için verdiği işaret.
  +3: ek sıkılaştırma açıkça işaret ediliyor (artırım, sıkılaştırmanın süreceği/güçlendirileceği kesin dille).
  +1,5: sıkılaştırma yönünde eğilim ya da koşullu sıkılaştırma vurgusu ağır basıyor.
  0: yön verilmiyor ya da iki yön dengeli.
  -1,5: gevşeme yönünde eğilim, adımların ihtiyatlı biçimde süreceği ima ediliyor.
  -3: belirgin ve hızlı gevşeme açıkça işaret ediliyor.
  Bu toplantıda alınan karar da sonraki adımlar hakkında işarettir: indirim kararı ve "adımlar sürecek" dili gevşeme yönündedir.
  Koşullu kalıp cümleler ("enflasyon görünümünde bozulma olursa duruş sıkılaştırılacaktır" gibi) merkez bankası metinlerinde
  hemen her zaman bulunur ve tek başına zayıf bir işarettir: metnin şahin tarafı yalnız bunlara dayanıyorsa puan en çok +0,5 olur.
  Faizin sabit tutulduğu, yön verilmeyen metin 0 civarındadır.

2) durus: Metnin BUGÜNKÜ para politikası duruşunu nasıl tanımladığı.
  +3: duruşun güçlendirildiği, ek sıkılaştırma yapıldığı açıkça söyleniyor.
  +2: "sıkı duruş sürdürülecek" gibi olağan sıkı duruş vurgusu.
  0: nötr. -2: destekleyici/gevşek duruş vurgusu. -3: duruşun belirgin biçimde gevşetildiği açıkça söyleniyor.

Kurallar:
- gerekce: 1-2 cümle, sade Türkçe, puanların nedeni. Yorum katma, metinde olmayan bir şey söyleme.
- alintilar: puanı en çok belirleyen 1-3 ifade. Metinden BİREBİR kopyala, kelimesi kelimesine; kısaltma, düzeltme, birleştirme yapma.`;

// Başkan konuşmaları, sunumlar ve Enflasyon/Finansal İstikrar Raporlarının genel değerlendirmeleri (tcmb-metinler.json)
// için aynı ölçek; bu metinlerin çoğu para politikası dışı konular da içerir, politika içeriği yoksa model bunu söyler.
export const ISTEM_SURUMU_EK = 2;
export const SISTEM_EK = SISTEM.replace(
  "Para Politikası Kurulu'nun bir metni verilecek.",
  "bir metni (Başkan'ın konuşması ya da sunumu, Enflasyon Raporu veya Finansal İstikrar Raporu genel değerlendirmesi) verilecek. Sunum metinleri slaytlardan çıkarılmıştır, kesik olabilir.",
) + `
- politika_icerigi: metin para politikasının duruşu ya da sonraki adımları hakkında bir şey söylüyorsa true. Yalnız finansal istikrar, ekonomik görünüm ya da kurumsal konular anlatılıyorsa false; o durumda puanları 0 ver, alıntı gerekmez.
- Sıkı ya da ihtiyatlı duruşun korunacağı, sürdürüleceği vurgusu BUGÜNKÜ duruşla ilgilidir ve durus puanına yansır; sonraki adımlar için tek başına sıkılaştırma işareti değildir. ileri_yon yalnız buna dayanıyorsa en çok +0,5 olur. Faiz indirimlerinin ihtiyatlı biçimde süreceğinin ima edilmesi gevşeme yönündedir.`;

export const SEMA = {
  type: 'object',
  properties: {
    ileri_yon: { type: 'number', description: '-3 ile +3 arası, 0,5 adım' },
    durus: { type: 'number', description: '-3 ile +3 arası, 0,5 adım' },
    gerekce: { type: 'string', description: '1-2 cümle' },
    alintilar: { type: 'array', items: { type: 'string' }, description: 'metinden birebir 1-3 ifade' },
    politika_icerigi: { type: 'boolean', description: 'metin para politikası hakkında bir şey söylüyor mu' },
  },
  required: ['ileri_yon', 'durus', 'gerekce', 'alintilar'],
};

const TUR_ADI = {
  karar: 'PPK karar metni (faiz oranlarına ilişkin basın duyurusu)',
  ozet: 'PPK toplantı özeti',
  konusma: "Başkan'ın konuşması ya da sunumu",
  rapor_er: 'Enflasyon Raporu genel değerlendirmesi',
  rapor_fir: 'Finansal İstikrar Raporu genel değerlendirmesi',
};

// ppk-metinler.json dizi ya da { belgeler: [...] } olabilir.
export function belgeListesi(veri) {
  return { belgeler: Array.isArray(veri) ? veri : Array.isArray(veri?.belgeler) ? veri.belgeler : [] };
}

export function belgeMetni(belge) {
  if (Array.isArray(belge.paragraflar) && belge.paragraflar.length) return belge.paragraflar.join('\n\n');
  return (belge.cumleler ?? []).join(' ');
}

export function istemKur(belge) {
  return `Metin türü: ${TUR_ADI[belge.tur] ?? belge.tur}\nTarih: ${belge.tarih}\nBaşlık: ${belge.baslik}\n\n--- METİN ---\n${belgeMetni(belge)}\n--- METİN SONU ---`;
}

// Alıntı karşılaştırması: tırnak/kesme işareti türleri, boşluklar ve büyük-küçük harf eşitlenir.
export function normal(s) {
  return String(s)
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/^["'.…\s]+|["'.…\s]+$/g, '');
}

export const yarimPuan = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.max(-3, Math.min(3, Math.round(x * 2) / 2));
};

// Modelin yanıtını denetler; geçersizse null.
export function yanitDogrula(yanit, belge) {
  if (!yanit || typeof yanit !== 'object') return null;
  // Politika içeriği olmayan metin (yalnız ek metinlerde istenir): puan yok, döngüye girmez.
  if (yanit.politika_icerigi === false) {
    const gerekce = String(yanit.gerekce ?? '').trim();
    return { politikaYok: true, ileriYon: null, durus: null, gerekce, alintilar: [] };
  }
  const ileriYon = yarimPuan(yanit.ileri_yon);
  const durus = yarimPuan(yanit.durus);
  if (ileriYon == null || durus == null) return null;
  const metin = normal(belgeMetni(belge));
  const alintilar = (Array.isArray(yanit.alintilar) ? yanit.alintilar : [])
    .map((a) => String(a).trim())
    .filter((a) => normal(a).length >= 12 && metin.includes(normal(a)))
    .slice(0, 3);
  if (!alintilar.length) return null;
  const gerekce = String(yanit.gerekce ?? '').trim();
  if (!gerekce) return null;
  return { ileriYon, durus, gerekce, alintilar };
}

const ort = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

// PPK döngüleri: her karar bir döngü başlatır; özet (ikinci) ve diğer metinler (konuşma, rapor), tarihi kendisinden
// önceki son karara ait döngüye girer. Döngü tonu tür dengelidir: karar, özet, konuşmalar ve raporlar önce kendi
// içinde ortalanır, sonra bu türler eşit ağırlıkla birleşir (hangisi puanlandıysa). Politika içeriği olmayan okuma sayılmaz.
// ikinci: özetin türü (Fed için tutanak, ECB için hesap). ekGruplar: diğer türlerin hangi gruba girdiği.
// Aynı gün yayımlanan metinlerde karar önce gelir (ECB'nin basın toplantısı metni kararla aynı gün).
const TUR_GRUBU = { konusma: 'konusma', rapor_er: 'rapor', rapor_fir: 'rapor' };

export function donguler(belgeler, puanlar, { ikinci = 'ozet', ekGruplar = TUR_GRUBU } = {}) {
  const sirali = [...belgeler].sort((a, b) => a.tarih.localeCompare(b.tarih) || (b.tur === 'karar') - (a.tur === 'karar'));
  const grupAdlari = [...new Set(Object.values(ekGruplar))];
  const sonuc = [];
  const gecerli = (p) => (p && !p.politikaYok && p.ileriYon != null ? p : null);
  for (const b of sirali) {
    const p = gecerli(puanlar[b.id]);
    if (b.tur === 'karar') {
      sonuc.push({ toplanti: b.tarih, kararId: b.id, karar: p, ozet: null, ozetId: null, ek: Object.fromEntries(grupAdlari.map((g) => [g, []])) });
    } else if (!sonuc.length) continue;
    else if (b.tur === ikinci) {
      const d = sonuc.at(-1);
      if (!d.ozetId) {
        d.ozetId = b.id;
        d.ozet = p;
      }
    } else if (ekGruplar[b.tur] && p) sonuc.at(-1).ek[ekGruplar[b.tur]].push(p);
  }
  return sonuc.map((d) => {
    const turler = {
      karar: d.karar ? { ileriYon: d.karar.ileriYon, durus: d.karar.durus } : null,
      ozet: d.ozet ? { ileriYon: d.ozet.ileriYon, durus: d.ozet.durus } : null,
      ...Object.fromEntries(
        grupAdlari.map((g) => [g, d.ek[g].length ? { ileriYon: ort(d.ek[g].map((x) => x.ileriYon)), durus: ort(d.ek[g].map((x) => x.durus)) } : null]),
      ),
    };
    const okunan = Object.values(turler).filter(Boolean);
    return {
      toplanti: d.toplanti,
      kararId: d.kararId,
      ozetId: d.ozetId,
      ileriYon: ort(okunan.map((x) => x.ileriYon)),
      durus: ort(okunan.map((x) => x.durus)),
      kararIleriYon: d.karar?.ileriYon ?? null,
      ozetIleriYon: d.ozet?.ileriYon ?? null,
      metin: [d.karar, d.ozet].filter(Boolean).length + grupAdlari.reduce((t, g) => t + d.ek[g].length, 0),
      turler,
    };
  });
}

// Puanın sözlü karşılığı (sayfada ve özet cümlede).
export function tonAdi(n) {
  if (n == null) return '–';
  if (n >= 2) return 'şahin';
  if (n >= 0.75) return 'ılımlı şahin';
  if (n > -0.75) return 'dengeli';
  if (n > -2) return 'ılımlı güvercin';
  return 'güvercin';
}
