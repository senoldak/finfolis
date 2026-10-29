// PPK ifade izi: karar metinlerinde bir ifadenin hangi toplantıda ilk göründüğü, hangisinde kaybolduğu.
// Saf işlevler: ağa ve dosyaya dokunmaz. Yapay zekâ yok; yalnız kurallı metin işleme.
//
// Yöntem
//  1. Her cümle sözcüklere bölünür; küçük harfe (tr-TR) çevrilir, tırnak/kesme işaretleri ve noktalama atılır.
//     Kesme işaretinden sonraki ek düşer (Raporu’nda → raporu, 37’den → 37).
//  2. Türkçe ekler yüzünden aynı sözcüğün çekimli halleri ayrı yazılır. Kaba ama açıklanabilir kural:
//     sözcüğün ilk 6 harfi "kök" sayılır (duruşu ve duruşunun aynı kök). Sayılar olduğu gibi kalır.
//     6 harf kuralının karıştırdığı birkaç sözcük (ihtiyaç/ihtiyat gibi) KOK_ISTISNA ile ayrı tutulur.
//  3. İfade, cümle içinde art arda gelen köklerdir; ifade bir cümlenin sınırını aşmaz.

const KESME = /[’‘´`ʼ′]/g;
const KOK_UZUNLUK = 6;

// Kökü 6 harfle karıştırılan sözcükler: ön ek → kullanılacak kök.
export const KOK_ISTISNA = [
  ['ihtiyaç', 'ihtiyaç'],
  ['ihtiyat', 'ihtiyat'],
];

// Tek sözcüğü (boşluksuz parça) {yuzey, kok} yapar; boşsa null.
function sozcukYap(ham) {
  let w = String(ham).replace(KESME, "'").toLocaleLowerCase('tr');
  const k = w.indexOf("'");
  if (k >= 0) w = w.slice(0, k);
  w = w.replace(/[^\p{L}\p{N},]/gu, '').replace(/^,+|,+$/g, '');
  if (!w) return null;
  return { yuzey: w, kok: kokBul(w) };
}

export function kokBul(w) {
  if (/^\p{N}/u.test(w)) return w;
  for (const [on, kok] of KOK_ISTISNA) if (w.startsWith(on)) return kok;
  return w.length > KOK_UZUNLUK ? w.slice(0, KOK_UZUNLUK) : w;
}

// Cümle → ham parçalar [{ham, t}]; t sözcük ise {yuzey, kok}, değilse (ör. tek başına tire) null.
export function parcala(cumle) {
  return String(cumle)
    .split(/[\s\u00a0]+/)
    .filter(Boolean)
    // Kesme işareti dışındaki bağlayıcı tireler sözcüğü birleştirir (makro-ihtiyati → makroihtiyati).
    .map((ham) => ({ ham, t: sozcukYap(ham.replace(/[-–—]/g, '')) }));
}

// Cümle → [{yuzey, kok}]
export function belirteclestir(cumle) {
  return parcala(cumle).filter((p) => p.t).map((p) => p.t);
}

// Cümleyi, belirteç dizinindeki ifadeyi [önce, eşleşen, sonra] olarak üçe böler (birebir metin, tek boşlukla).
export function vurgula(cumle, bas, n) {
  const p = parcala(cumle);
  let ti = -1;
  const onceki = [];
  const esl = [];
  const sonraki = [];
  for (const x of p) {
    if (x.t) ti++;
    const i = x.t ? ti : ti + 1; // belirteç olmayan parça sonraki belirtece bağlanır
    (i < bas ? onceki : i < bas + n ? esl : sonraki).push(x.ham);
  }
  return [onceki.join(' '), esl.join(' '), sonraki.join(' ')];
}

// Okurun yazdığı ifade → kök dizisi.
export function ifadeKokleri(metin) {
  return belirteclestir(metin).map((t) => t.kok);
}

// Kök dizisi, cümlenin kök dizisinde art arda geçiyor mu? Başlangıç dizinini verir, yoksa -1.
export function diziBul(kokler, ara) {
  if (!ara.length || ara.length > kokler.length) return -1;
  for (let i = 0; i + ara.length <= kokler.length; i++) {
    let ok = true;
    for (let j = 0; j < ara.length; j++) {
      if (kokler[i + j] !== ara[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

// Bir karar cümleleri içinde ifadeyi arar; bulunan ilk cümleyi (birebir) ve dizinini döndürür.
export function kararda(cumleler, ara) {
  for (let i = 0; i < cumleler.length; i++) {
    if (diziBul(belirteclestir(cumleler[i]).map((t) => t.kok), ara) >= 0) return { var: true, cumle: cumleler[i], sira: i };
  }
  return { var: false };
}

// Ardışık bloklar: bit dizisinde 1'lerin [başlangıç, bitiş] (dizinler, dahil) aralıkları.
export function bloklar(bit) {
  const b = [];
  let bas = -1;
  for (let i = 0; i <= bit.length; i++) {
    if (i < bit.length && bit[i]) {
      if (bas < 0) bas = i;
    } else if (bas >= 0) {
      b.push([bas, i - 1]);
      bas = -1;
    }
  }
  return b;
}

export function degisimSayisi(bit) {
  let n = 0;
  for (let i = 1; i < bit.length; i++) if (bit[i] !== bit[i - 1]) n++;
  return n;
}

// Dolgu ve kalıp ifadeler: her kararda zaten var olan ya da yalnız kalıp bağlaçlardan oluşan ifadeleri eler.
const DURAK = new Set(
  ['ve', 'ile', 'bir', 'bu', 'için', 'olan', 'da', 'de', 'ki', 'ise', 'ayrıca', 'ya', 'veya', 'gibi', 'kadar', 'daha', 'çok', 'en', 'olarak', 'üzerinde', 'karşı', 'ancak', 'ama', 'olması', 'olduğu', 'diğer', 'her', 'şekilde', 'biçimde'].map((s) => kokBul(s)),
);
const DOLGU = [
  /^para politi.* kurul/,
  /politika politika/,
  /bir hafta vadel/,
  /hafta vadel/,
  /repo ihale/,
  /ihale faiz/,
  /karar verm/,
  /kurul kurul/,
  /^kurul/,
  /^politi.*faiz/,
  /yüzde/,
  /beş iş gün/,
  /toplant özet/,
  /özet beş/,
  /özet yayıml/,
  /iş günü içind/,
  /yayıml/,
];

const hepsiDurak = (k) => k.every((x) => DURAK.has(x));

// Bir ifade (kök dizisi) kalıp ya da dolgu mu?
function elenir(kokler) {
  if (kokler.some((k) => /\d/.test(k))) return true; // sayılı ifadeler oran değişimidir, ifade değil
  if (DURAK.has(kokler[0]) || DURAK.has(kokler.at(-1))) return true;
  if (hepsiDurak(kokler)) return true;
  if (kokler.filter((k) => !DURAK.has(k)).length < 2) return true;
  const m = kokler.join(' ');
  return DOLGU.some((r) => r.test(m));
}

const altDizi = (kisa, uzun) => diziBul(uzun, kisa) >= 0;

// Otomatik keşif. kararlar: [{tarih, cumleler}] eskiden yeniye.
// opts: { enAz: 3, enFazla: 25, minN: 3, maxN: 6 }
export function kesfet(kararlar, opts = {}) {
  const { enAz = 3, enFazla = 25, minN = 3, maxN = 6 } = opts;
  const N = kararlar.length;
  const belirtec = kararlar.map((k) => k.cumleler.map((c) => belirteclestir(c)));

  // Her kararda geçen n-gram kümesi.
  const goruldu = new Map(); // anahtar → bit dizisi
  belirtec.forEach((cumleler, ki) => {
    for (const cum of cumleler) {
      const kokler = cum.map((t) => t.kok);
      for (let n = minN; n <= maxN; n++) {
        for (let i = 0; i + n <= kokler.length; i++) {
          const dilim = kokler.slice(i, i + n);
          const anahtar = dilim.join(' ');
          let bit = goruldu.get(anahtar);
          if (!bit) goruldu.set(anahtar, (bit = new Uint8Array(N)));
          bit[ki] = 1;
        }
      }
    }
  });

  // Aday: en az enAz kararda var, her kararda yok.
  let adaylar = [];
  for (const [anahtar, bit] of goruldu) {
    let toplam = 0;
    for (const v of bit) toplam += v;
    if (toplam < enAz || toplam === N) continue;
    const kokler = anahtar.split(' ');
    if (elenir(kokler)) continue;
    adaylar.push({ anahtar, kokler, bit, toplam });
  }

  // Aynı bit dizisini paylaşan, birbirinin alt dizisi olan ifadeler birleşir: en uzun kalır.
  const gruplar = new Map();
  for (const a of adaylar) {
    const k = Array.from(a.bit).join('');
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(a);
  }
  const secilen = [];
  for (const [, g] of gruplar) {
    g.sort((x, y) => y.kokler.length - x.kokler.length || x.anahtar.localeCompare(y.anahtar, 'tr'));
    const tutulan = [];
    for (const a of g) {
      if (tutulan.some((t) => altDizi(a.kokler, t.kokler))) continue;
      tutulan.push(a);
    }
    // Aynı desen birden çok ifadede görünüyorsa (aynı cümlenin parçaları) en uzun olanı temsil eder.
    secilen.push(tutulan[0]);
  }

  // İlgi puanı: değişim sayısı ve son değişimin yakınlığı.
  for (const a of secilen) {
    const bit = Array.from(a.bit);
    a.degisim = degisimSayisi(bit);
    let son = 0;
    for (let i = 1; i < N; i++) if (bit[i] !== bit[i - 1]) son = i;
    a.sonDegisim = son;
    const icerik = a.kokler.filter((k) => !DURAK.has(k)).length;
    // Az ama belirgin değişim (gelen ya da giden ifade) öne çıkar; her kararda bir girip çıkan cümle kalıpları geri düşer.
    a.puan = Math.min(a.degisim, 4) - Math.max(0, a.degisim - 6) * 0.5 + 3 * (son / (N - 1)) + 0.4 * Math.min(icerik, 5) + (a.toplam >= 5 ? 1 : 0);
  }
  secilen.sort((x, y) => y.puan - x.puan || x.anahtar.localeCompare(y.anahtar, 'tr'));

  // Birbirine çok benzeyen desenler (aynı cümlenin örtüşen ifadeleri) arasından en iyisi kalır.
  const son = [];
  for (const a of secilen) {
    const benzer = son.some((t) => {
      let ort = 0;
      let bir = 0;
      for (let i = 0; i < N; i++) {
        if (a.bit[i] && t.bit[i]) ort++;
        if (a.bit[i] || t.bit[i]) bir++;
      }
      const ortakSozcuk = a.kokler.filter((k) => t.kokler.includes(k) && !DURAK.has(k)).length;
      return ort / bir >= 0.8 && ortakSozcuk >= 2;
    });
    if (!benzer) son.push(a);
    if (son.length >= enFazla) break;
  }
  return { belirtec, ifadeler: son };
}

// Bir ifadenin kararlar boyunca izi.
export function izle(kararlar, belirtec, kokler) {
  const bit = [];
  const cumleSira = [];
  const yuzeyler = new Map();
  kararlar.forEach((k, ki) => {
    let bulundu = -1;
    belirtec[ki].forEach((cum, ci) => {
      const i = diziBul(cum.map((t) => t.kok), kokler);
      if (i >= 0) {
        if (bulundu < 0) bulundu = ci;
        const yz = cum.slice(i, i + kokler.length).map((t) => t.yuzey).join(' ');
        yuzeyler.set(yz, (yuzeyler.get(yz) ?? 0) + 1);
      }
    });
    bit.push(bulundu >= 0 ? 1 : 0);
    cumleSira.push(bulundu);
  });
  const bl = bloklar(bit);
  const ilk = bit.indexOf(1);
  const sonIdx = bit.lastIndexOf(1);
  const yuzey = [...yuzeyler.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))[0]?.[0] ?? kokler.join(' ');
  return {
    ifade: yuzey,
    kokler,
    bit,
    cumleSira,
    ilk: ilk >= 0 ? kararlar[ilk].tarih : null,
    son: sonIdx >= 0 ? kararlar[sonIdx].tarih : null,
    simdi: bit.at(-1) === 1,
    sayi: bit.reduce((a, b) => a + b, 0),
    bloklar: bl.map(([a, b]) => ({ ilk: kararlar[a].tarih, son: kararlar[b].tarih, adet: b - a + 1 })),
    degisim: degisimSayisi(bit),
  };
}

// Son karar ile önceki karar arasında giren ve çıkan ifadeler.
// Bir sözcük konumu, onu içeren herhangi bir 3'lü pencere öbür metinde geçiyorsa "ortak" sayılır;
// ortak olmayan art arda konumlar bir ifade olur. Yalnız sayı olan parçalar ve tek duraktan oluşanlar atılır.
function ucluler(belirtecCumleler) {
  const kume = new Set();
  for (const cum of belirtecCumleler) {
    const k = cum.map((t) => t.kok);
    for (let i = 0; i + 3 <= k.length; i++) kume.add(k.slice(i, i + 3).join(' '));
  }
  return kume;
}

function yeniIfadeler(kaynak, hedefKume) {
  const cikti = [];
  const goruldu = new Set();
  kaynak.forEach((cum, ci) => {
    const k = cum.map((t) => t.kok);
    const ortak = new Array(k.length).fill(false);
    for (let i = 0; i + 3 <= k.length; i++) {
      if (hedefKume.has(k.slice(i, i + 3).join(' '))) for (let j = i; j < i + 3; j++) ortak[j] = true;
    }
    let bas = -1;
    for (let i = 0; i <= k.length; i++) {
      if (i < k.length && !ortak[i]) {
        if (bas < 0) bas = i;
      } else if (bas >= 0) {
        const dilim = cum.slice(bas, i);
        const kokler = dilim.map((t) => t.kok);
        const sayisiz = kokler.filter((x) => !/\d/.test(x));
        if (sayisiz.length >= 2 && !hepsiDurak(sayisiz) && !DOLGU.some((r) => r.test(sayisiz.join(' ')))) {
          const metin = dilim.map((t) => t.yuzey).join(' ');
          if (!goruldu.has(metin)) {
            goruldu.add(metin);
            cikti.push({ ifade: metin, cumleSira: ci, bas, adet: i - bas });
          }
        }
        bas = -1;
      }
    }
  });
  return cikti;
}

export function sonKararDegisimi(kararlar, belirtec) {
  const N = kararlar.length;
  if (N < 2) return { giren: [], cikan: [] };
  const son = belirtec[N - 1];
  const onceki = belirtec[N - 2];
  const giren = yeniIfadeler(son, ucluler(onceki)).map((x) => ({ ...x, cumle: kararlar[N - 1].cumleler[x.cumleSira] }));
  const cikan = yeniIfadeler(onceki, ucluler(son)).map((x) => ({ ...x, cumle: kararlar[N - 2].cumleler[x.cumleSira] }));
  return { giren, cikan };
}

// Sayfanın tek girişi: kararlar eskiden yeniye [{id, tarih, cumleler}].
export function ifadeIziHesapla(kararlar, opts = {}) {
  const t0 = Date.now();
  const { belirtec, ifadeler } = kesfet(kararlar, opts);
  const izler = ifadeler.map((a) => izle(kararlar, belirtec, a.kokler));
  const degisim = sonKararDegisimi(kararlar, belirtec);
  return { izler, giren: degisim.giren, cikan: degisim.cikan, ms: Date.now() - t0 };
}

// Önceden belirlenmiş ifadeler (sayfada "sık sorulanlar"): yalnız var olanlar ve her kararda aynı olmayanlar.
export function ifadeleriIzle(kararlar, ifadeler) {
  const belirtec = kararlar.map((k) => k.cumleler.map((c) => belirteclestir(c)));
  return ifadeler
    .map((ad) => ({ ad, iz: izle(kararlar, belirtec, ifadeKokleri(ad)) }))
    .filter((x) => x.iz.sayi > 0)
    .map((x) => ({ ...x.iz, ifade: x.ad }));
}
