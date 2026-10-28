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

export const SEMA = {
  type: 'object',
  properties: {
    ileri_yon: { type: 'number', description: '-3 ile +3 arası, 0,5 adım' },
    durus: { type: 'number', description: '-3 ile +3 arası, 0,5 adım' },
    gerekce: { type: 'string', description: '1-2 cümle' },
    alintilar: { type: 'array', items: { type: 'string' }, description: 'metinden birebir 1-3 ifade' },
  },
  required: ['ileri_yon', 'durus', 'gerekce', 'alintilar'],
};

const TUR_ADI = { karar: 'PPK karar metni (faiz oranlarına ilişkin basın duyurusu)', ozet: 'PPK toplantı özeti' };

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

// PPK döngüleri: her karar bir döngü başlatır; özet, tarihi kendisinden önceki son karara ait döngüye girer.
// Döngü tonu karar ve özetin eşit ağırlıklı ortalamasıdır (hangisi puanlandıysa). ikinci: özetin türü (Fed için tutanak).
export function donguler(belgeler, puanlar, { ikinci = 'ozet' } = {}) {
  const sirali = [...belgeler].sort((a, b) => a.tarih.localeCompare(b.tarih));
  const sonuc = [];
  for (const b of sirali) {
    const p = puanlar[b.id];
    if (b.tur === 'karar') sonuc.push({ toplanti: b.tarih, kararId: b.id, karar: p ?? null, ozet: null, ozetId: null });
    else if (b.tur === ikinci && sonuc.length) {
      const d = sonuc.at(-1);
      if (!d.ozetId) {
        d.ozetId = b.id;
        d.ozet = p ?? null;
      }
    }
  }
  return sonuc.map((d) => {
    const okunan = [d.karar, d.ozet].filter(Boolean);
    return {
      toplanti: d.toplanti,
      kararId: d.kararId,
      ozetId: d.ozetId,
      ileriYon: ort(okunan.map((x) => x.ileriYon)),
      durus: ort(okunan.map((x) => x.durus)),
      kararIleriYon: d.karar?.ileriYon ?? null,
      ozetIleriYon: d.ozet?.ileriYon ?? null,
      metin: okunan.length,
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
