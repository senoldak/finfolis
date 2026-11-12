// Kaynak: mecmua/site-ortak/dil/dil-tr.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Türkçe haber metni için kodla dil kapısı (12 Kasım 2026). Gemini Flash-Lite'ın yazıp yine Flash-Lite'ın onayladığı
// metinde dili hiçbir adım denetlemiyordu: "yapay zeka", "Duvar Sokağı", yazıyla rakam ("otuz dört milyon dolar"),
// çevrilmemiş İngilizce cümle yayına çıkıyordu. İki iş yapar:
//   dilDuzeltTr(metin, ayar)  güvenli, anlamı değiştirmeyen düzeltmeler (TDK düzeltme işareti, kesme işareti, ondalık)
//   dilSorunlariTr(metin, ayar)  kalan sorunları listeler; kesin olanlar yayından önce giderilmeli, diğerleri redaksiyona
// Yazım hakemi TDK (yazım dizini, Güncel Türkçe Sözlük); listedeki her biçim TDK dizininde doğrulandı.

// TDK düzeltme işaretli biçimler. `kok` küçük harfle aranır; `yasakSonra` köke bitişik gelebilecek harfleri sınırlar ki
// "mekanik", "kafile" gibi başka sözcükler bozulmasın. Belirsiz olanlar (kar/kâr, hala/hâlâ dışında hal/hâl,
// resmi/resmî = "resim" belirtme hâli) bilerek yok.
const DUZELTME_ISARETI = [
  { kok: 'zeka', dogru: 'zekâ', yasakSonra: /^i(?![a-zçğıöşü])/ }, // Zekai (ad)
  { kok: 'imkan', dogru: 'imkân' },
  { kok: 'kağıt', dogru: 'kâğıt', yasakSonra: /^hane/ }, // Kağıthane (ilçe adı)
  { kok: 'kağıd', dogru: 'kâğıd' },
  { kok: 'rüzgar', dogru: 'rüzgâr' },
  { kok: 'mekan', dogru: 'mekân', yasakSonra: /^(ik|iz|ist)/ },
  { kok: 'halihazırda', dogru: 'hâlihazırda' },
  { kok: 'tezgah', dogru: 'tezgâh' },
  { kok: 'dükkan', dogru: 'dükkân' },
  { kok: 'hikaye', dogru: 'hikâye' },
  { kok: 'nikah', dogru: 'nikâh' },
  { kok: 'şikayet', dogru: 'şikâyet' },
];

const HARF = 'a-zçğıöşüâîûA-ZÇĞİÖŞÜÂÎÛ';

function buyukIlk(s) {
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
}

function duzeltmeIsareti(metin) {
  let sonuc = metin;
  for (const { kok, dogru, yasakSonra } of DUZELTME_ISARETI) {
    const re = new RegExp(`(^|[^${HARF}])(${kok}|${buyukIlk(kok)})(?=([${HARF}]*))`, 'g');
    sonuc = sonuc.replace(re, (tum, once, sozcuk, devam) => {
      if (yasakSonra && yasakSonra.test(devam)) return tum;
      const yeni = sozcuk === kok ? dogru : buyukIlk(dogru);
      return once + yeni;
    });
  }
  // "hala" (zarf) → "hâlâ"; ekli biçimler (halası = babanın kız kardeşi) dokunulmaz.
  sonuc = sonuc.replace(new RegExp(`(^|[^${HARF}])(hala|Hala)(?![${HARF}])`, 'g'), (_, once, s) => once + (s === 'Hala' ? 'Hâlâ' : 'hâlâ'));
  sonuc = sonuc.replace(/gayri safi/g, 'gayrisafi').replace(/Gayri safi/g, 'Gayrisafi');
  return sonuc;
}

/**
 * Güvenli düzeltmeler. ayar.yuzde: 'yuzde' → "%5" "yüzde 5" olur; 'isaret' → "yüzde 5" "%5" olur; verilmezse dokunulmaz.
 */
export function dilDuzeltTr(metin, ayar = {}) {
  if (typeof metin !== 'string' || !metin) return metin;
  let s = duzeltmeIsareti(metin);
  // Kesme işareti: harf’harf → harf'harf (sitelerde düz kesme çoğunlukta; karışık yazım tutarsız görünüyor).
  s = s.replace(new RegExp(`([${HARF}0-9])’(?=[${HARF}])`, 'g'), "$1'");
  // İngilizce ondalık nokta ölçek sözcüğünden önce: "3.5 milyar" → "3,5 milyar" (binlik grup 3 hane olduğu için 1–2 hane ondalıktır).
  s = s.replace(/(\d)\.(\d{1,2})(?=\s+(milyon|milyar|trilyon|bin)\b)/g, '$1,$2');
  if (ayar.yuzde === 'yuzde') s = s.replace(/(^|[\s(])%\s?(\d+(?:,\d+)?)/g, '$1yüzde $2');
  if (ayar.yuzde === 'isaret') s = s.replace(/(^|[\s(])([Yy])üzde (\d+(?:,\d+)?)/g, (_, once, _y, sayi) => `${once}%${sayi}`);
  return s;
}

const SAYI_SOZ = 'bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan|yüz';
const BIRIM = 'milyon|milyar|trilyon|dolar|avro|euro|lira|sterlin|yen|yuan|ruble|rupi|frank';

// İngilizce işlev sözcükleri; Türkçede tek başına sözcük olarak geçmezler. CUMLE_ING cümle kurduğunu gösterenlerdir
// (fiil, zamir, edat): "Office of the Comptroller of the Currency" gibi kurum ve eser adları yalnız of/the taşır.
const INGILIZCE = new Set([
  'the', 'and', 'of', 'is', 'are', 'was', 'were', 'with', 'that', 'this', 'have', 'has', 'had', 'will', 'would', 'be',
  'been', 'from', 'their', 'they', 'which', 'what', 'into', 'than', 'it', 'its', 'we', 'our', 'you', 'not', 'but', 'can',
  'should', 'there', 'where', 'when', 'about', 'more', 'every', 'to', 'for', 'by',
]);
const CUMLE_ING = new Set([
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'would', 'be', 'been', 'can', 'should', 'we', 'our', 'they',
  'their', 'it', 'its', 'you', 'that', 'this', 'which', 'where', 'when', 'not', 'but', 'there', 'to', 'for', 'by',
]);

// Yalnız ASCII harfli art arda sözcük dizileri; Türkçe harf taşıyan ya da sayı olan sözcük diziyi böler.
function ingilizceDiziler(metin) {
  const diziler = [];
  let dizi = [];
  for (const w of metin.split(/[\s“”"«»()]+/)) {
    const temiz = w.replace(/[.,;:!?’']+$/, '').replace(/^[‘']+/, '');
    if (/^[A-Za-z][A-Za-z'’-]*$/.test(temiz)) dizi.push(temiz);
    else {
      if (dizi.length) diziler.push(dizi);
      dizi = [];
    }
  }
  if (dizi.length) diziler.push(dizi);
  return diziler;
}

// ❌ kalıp → öneri. kesin: yayından önce giderilmeli. esik: metinde en az bu kadar geçerse sorun sayılır.
const KALIPLAR = [
  { re: /Duvar Sokağı/g, mesaj: '"Duvar Sokağı" yanlış çeviri: "Wall Street" yaz', kesin: true },
  { re: /(?<![a-zçğıöşü])(crore|lakh)(?![a-zçğıöşü])/gi, mesaj: 'Hint birimi (crore/lakh) çevrilmemiş: milyon/milyar rupi olarak yaz', kesin: true },
  { re: /(?<![a-zçğıöşü])çek(ler|leri)? yaz/gi, mesaj: '"çek yazmak" İngilizceden kelimesi kelimesine: "yatırım yapmak" yaz' },
  { re: /(Pre-Seed|Pre-Series [A-Z]|Seed funding|seed turu)/gi, mesaj: 'İngilizce tur adı: "tohum öncesi", "tohum turu", "Seri A öncesi" yaz' },
  { re: /yüzde [\d,]+ oranında/g, mesaj: '"yüzde X oranında" dolgu: "yüzde X" yeter' },
  { re: /Federal Rezerv/g, mesaj: '"Federal Rezerv" yerine "Fed" ya da "ABD Merkez Bankası (Fed)" yaz' },
  { re: /(?<![a-zçğıöşü])gerçekleştir/gi, esik: 2, mesaj: '"gerçekleştirdi" kalıbı tekrarlanıyor: "yaptı", "düzenledi", "açıkladı" gibi doğrudan fiil kullan' },
  { re: /(?<![a-zçğıöşü])hayata geçir/gi, esik: 2, mesaj: '"hayata geçirdi" tekrarlanıyor: doğrudan fiil kullan' },
  { re: /dikkat çek/gi, esik: 2, mesaj: '"dikkat çekti" tekrarlanıyor: neyin önemli olduğunu doğrudan söyle' },
  { re: /(?<![a-zçğıöşü])kritik(?![a-zçğıöşü])/gi, esik: 3, mesaj: '"kritik" sözcüğü tekrarlanıyor' },
  { re: /(mektedir|maktadır)(?![a-zçğıöşü])/g, esik: 3, mesaj: '"-mektedir/-maktadır" resmî yazışma dili: "-iyor/-ıyor" kipine geç' },
  {
    re: /(?<![a-zçğıöşü])(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar) günü(?![a-zçğıöşü])/gi,
    mesaj: 'Haftanın günü göreli zamandır: tarih yaz ya da çıkar',
  },
];

function cumleler(metin) {
  return metin
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ"“'])/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function sozcukler(c) {
  return c.toLocaleLowerCase('tr').match(new RegExp(`[${HARF}']+`, 'g')) ?? [];
}

/**
 * Kalan dil sorunlarını döndürür: [{ kod, mesaj, kesin, ornek }].
 * ayar.araBaslikYasak: gövdede ## / ### başlık sorun sayılır. ayar.govde: metin haber gövdesiyse paragraf denetimi yapılır.
 */
export function dilSorunlariTr(metin, ayar = {}) {
  if (typeof metin !== 'string' || !metin.trim()) return [];
  const sorunlar = [];
  const ekle = (kod, mesaj, kesin, ornek) => sorunlar.push({ kod, mesaj, kesin: Boolean(kesin), ...(ornek && { ornek }) });

  // Yazıyla yazılmış sayı: "otuz dört milyon dolar", "yüzde on", "iki bin on bir", "on dört virgül sekiz".
  const sayiBirim = new RegExp(`(?<![${HARF}])((?:(?:${SAYI_SOZ}|bin)\\s+)*(?:${SAYI_SOZ}))\\s+(${BIRIM}|virgül)(?![${HARF}])`, 'giu');
  const yazili = [];
  let yalnizBir = false;
  for (const m of metin.matchAll(sayiBirim)) {
    // Tek başına "bir milyon" haber dilinde de görülür: kesin sayılmaz, redaksiyona gider.
    if (/^bir$/i.test(m[1].trim())) yalnizBir = true;
    else yazili.push(m[0]);
  }
  for (const m of metin.matchAll(new RegExp(`[Yy]üzde\\s+(?:${SAYI_SOZ})(?![${HARF}])`, 'g'))) yazili.push(m[0]);
  for (const m of metin.matchAll(new RegExp(`(?<![${HARF}])(?:${SAYI_SOZ})\\s+bin\\s+(?:${SAYI_SOZ})(?![${HARF}])`, 'gi'))) yazili.push(m[0]);
  if (yazili.length) ekle('yazili-sayi', 'Sayılar yazıyla yazılmış: rakamla yaz ("34 milyon dolar", "yüzde 10", "2011")', true, yazili[0]);
  else if (yalnizBir) ekle('yazili-sayi', '"bir milyon" gibi yazıyla sayı: rakamla yaz ("1 milyon")', false);

  // Çevrilmemiş İngilizce cümle ya da cümle parçası (alıntı dahil): en az 6 ASCII sözcüklük dizide 2 İngilizce işlev
  // sözcüğü, en az biri cümle kuran türden ve sözcüklerin yarısı küçük harfli (eser/kurum adları büyük harfli olur).
  for (const d of ingilizceDiziler(metin)) {
    if (d.length < 6) continue;
    const ing = d.map((w) => w.toLowerCase()).filter((w) => INGILIZCE.has(w));
    const kucukHarfli = d.filter((w) => /^[a-z]/.test(w)).length;
    if (ing.length >= 2 && ing.some((w) => CUMLE_ING.has(w)) && kucukHarfli * 2 >= d.length) {
      ekle('ingilizce', 'Çevrilmemiş İngilizce cümle: Türkçeye çevir; alıntıysa dolaylı anlatımla aktar', true, d.join(' ').slice(0, 120));
      break;
    }
  }

  // Aynı cümle iki kez.
  const gorulen = new Set();
  for (const c of cumleler(metin)) {
    const n = sozcukler(c).join(' ');
    if (n.split(' ').length < 5) continue;
    if (gorulen.has(n)) {
      ekle('tekrar-cumle', 'Aynı cümle iki kez geçiyor: birini sil', true, c.slice(0, 120));
      break;
    }
    gorulen.add(n);
  }

  // Art arda aynı işlev sözcüğü ("ve ve", "bir bir"). İkilemeler (yavaş yavaş) bilerek dışarıda.
  const cift = metin.match(new RegExp(`(?<![${HARF}])(ve|ile|bir|bu|için|de|da|ki|olarak) \\1(?![${HARF}])`, 'i'));
  // "de de" / "da da" bazen bilinçli vurgudur: kesin değil.
  if (cift) ekle('cift-sozcuk', `Aynı sözcük art arda: "${cift[0]}"`, !/^(de|da|ki) /i.test(cift[0]), cift[0]);

  for (const k of KALIPLAR) {
    const bulunan = metin.match(k.re) ?? [];
    if (bulunan.length >= (k.esik ?? 1)) ekle('kalip', k.mesaj, k.kesin, bulunan[0]);
  }

  if (ayar.araBaslikYasak && /^#{2,4}\s/m.test(metin)) ekle('ara-baslik', 'Gövdede ara başlık var: başlıkları kaldır, metni paragraflarla sürdür', false);

  if (ayar.govde) {
    const paragraflar = metin.split(/\n\s*\n/).filter((p) => p.trim() && !/^#/.test(p.trim()));
    const kelime = metin.split(/\s+/).filter(Boolean).length;
    if (paragraflar.length === 1 && kelime > 150) ekle('tek-paragraf', 'Gövde tek paragraf: 3–6 paragrafa böl', false);
  }

  return sorunlar;
}

export const kesinSorunlar = (sorunlar) => sorunlar.filter((s) => s.kesin);

/** Redaksiyon istemine eklenecek sorun listesi (boşsa boş dize). */
export function sorunListesi(sorunlar) {
  if (!sorunlar.length) return '';
  return sorunlar.map((s) => `- ${s.mesaj}${s.ornek ? ` (örnek: «${s.ornek}»)` : ''}`).join('\n');
}

// Redaksiyon istemi (dil masası). Kötü/iyi çift örnekler, son haftanın gerçek hatalarından. Olgu, rakam, ad ve alıntı
// değiştirilmez; metin kısaltılmaz.
export const REDAKSIYON_KURALLARI_TR = `Sen bir Türk haber ajansında kıdemli redaktörsün. Sana verilen haberin dilini düzeltirsin; haberi yeniden yazmazsın.

Değiştirme:
- Olgu, rakam, tarih, kişi ve kurum adı, alıntı içeriği aynı kalır. Yeni bilgi ekleme, bilgi çıkarma.
- Uzunluk aynı kalır (en fazla %10 kısalabilir). Paragraf sayısını koru.

Düzelt:
- Yazım TDK'ya göre: zekâ, hâlâ, imkân, kâğıt, rüzgâr, hikâye, şikâyet, gayrisafi; özel adlara gelen ek kesmeyle ayrılır (OpenAI'ın, Fed'in).
- İngilizceden kelimesi kelimesine çeviri kokan ifadeyi Türk basınında kullanılan karşılığıyla değiştir.
- Çevrilmemiş İngilizce sözcük ya da cümle kalmasın. İngilizce alıntıyı dolaylı anlatımla Türkçeye aktar ("... dedi" yerine "...ğını söyledi").
- Sayılar rakamla yazılır: 34 milyon dolar, 2011. Ondalık virgülle: 3,5 milyar. Yüzde yazımını ("%10" ya da "yüzde 10") metinde nasılsa öyle bırak; kod sitenin biçimine çevirir.
- Aynı bilgiyi iki kez veren cümleyi birleştir; dolgu cümlesini (bilgi taşımayan genel yargı) sil ya da kaynaktaki somut bilgiyle değiştir.
- Kipler tutarlı olsun: haber dili "-dı/-di" ve "-iyor"; "-mektedir/-maktadır" kullanma.
- Şirketin adını eş anlamlı sözcüklerle ("kuruluş", "işletme", "teşebbüs") değiştirip durma; adı ya da "şirket" yeter.

Örnekler:
❌ Duvar Sokağı analistlerine göre        ✅ Wall Street analistlerine göre
❌ 30 ile 60 milyon dolar arasında çekler yazmayı planlıyor   ✅ 30 ile 60 milyon dolar arasında yatırım yapmayı planlıyor
❌ hisseleri yüzde 8,6 oranında düşüş yaşadı   ✅ hisseleri yüzde 8,6 düştü
❌ yıllık kâr beklentisini yüzde 9 oranında yukarı yönlü revize etti   ✅ yıllık kâr beklentisini yüzde 9 yükseltti
❌ Ekim ayında otuz dört yeni şirketle   ✅ Ekim ayında 34 yeni şirketle
❌ iş yükünü katbek kat artırdığını   ✅ iş yükünü katbekat artırdığını
❌ Seed funding turunda 5 milyon dolar   ✅ tohum turunda 5 milyon dolar
❌ Yatırım turunun ardından şirketin ulaştığı yeni değerleme dikkat çekti.   ✅ (cümleyi sil ya da değerlemeyi rakamla yaz)
❌ Bu gelişme, sektör için yeni bir dönemin habercisi niteliğinde.   ✅ (cümleyi sil; yerine kaynaktaki somut bir ayrıntı)`;
