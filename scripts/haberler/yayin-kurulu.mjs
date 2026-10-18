// Yayın kurulu: insan onayı olmadan yayın yapıldığı için son kapı burasıdır.
// Sıra (tidsrost redaktor.mjs'den uyarlandı):
//   1. Kesin (yapay zekâsız) kontrol: her rakam ve alıntı kaynakta mı? (dogrula)
//   2. Kontrol masası (Gemini): olgu, atıf, tavsiye/abartı, neden-sonuç, başlık doğruluğu.
//   3. Sorun varsa yazara düzelttirme (en fazla 2 tur).
//   4. Türkçe redaksiyon: TDK yazımı, Türkçe sayı biçimi, çeviri kokan ifadeler, sade dil. Redaksiyon ayrı çağrı
//      değildir: onay veren kontrol masası aynı çağrıda düzeltilmiş metni de döndürür (Katman 2.4); düzeltilmiş
//      metin yeniden kontrol masasından geçer.
//   5. Son kesin kontrol. Kalan her sorun {dur} döndürür; haber yayınlanmaz.
import { gemini as varsayilanGemini } from './lib.mjs';
import { dogrula } from './dogrula.mjs';
import { duzelt, uzat, derlemeUzat, YAZI_SEMASI, KURALLAR } from './yazar.mjs';
import { ilgiliKisim } from './kaynak-kirp.mjs';
import { gizliMedyaAdlari } from './gizli.mjs';
import { kelimeSay, INDEKS_ESIGI } from '../../src/lib/uzunluk.mjs';

// Gövdesi bu kelime sayısının altında kalan haber yayımlanmaz: kısa taslak önce bir kez kaynaktan genişletilir
// (uzat), yine kısaysa durdurulur. Sitede 120 kelimenin altı zaten noindex olur (src/lib/uzunluk.mjs).
export const EN_AZ_KELIME = 200;
// Derleme alt sınırı: havuzdaki haberler zaten kaynağı az olduğu için kısa kalanlardır; 8 haberlik derleme
// uzatmadan sonra bile ~170 kelimede kalıyordu (18 Ekim). Haber başına 20 kelime, en az 150, en çok EN_AZ_KELIME.
export const derlemeEnAz = (n) => Math.min(EN_AZ_KELIME, Math.max(150, n * 20));
// Bu sayının altındaki taslak uzatılmaz (Katman 2); sitedeki noindex eşiğiyle aynı.
export const UZATMA_ESIGI = INDEKS_ESIGI;

const KARAR_SEMASI = {
  type: 'object',
  properties: {
    onay: { type: 'boolean' },
    sorunlar: { type: 'array', items: { type: 'string' }, description: 'Somut sorunlar; onaylıysa boş' },
  },
  required: ['onay', 'sorunlar'],
};

// Kontrol masası çağrısı redaksiyon da istenirse (duzenle) şema düzeltilmiş metni de taşır.
const DUZENLE_SEMASI = {
  type: 'object',
  properties: {
    ...KARAR_SEMASI.properties,
    duzeltilmis: {
      type: 'object',
      description: 'Yalnızca dili düzeltilmiş taslak; onay=false ise boş bırak',
      properties: { baslik: { type: 'string' }, spot: { type: 'string' }, govde: { type: 'string' } },
    },
  },
  required: KARAR_SEMASI.required,
};

// Redaksiyon kuralları: hem ayrı redaksiyon çağrısı hem birleşik kontrol çağrısı kullanır.
const REDAKSIYON_KURALLARI = `Düzelt:
- TDK yazım kuralları: yazım, noktalama, büyük harf, kesme işareti (Fed'in, TCMB'nin), bitişik/ayrı yazılanlar (de/da, ki, mi).
- Türkçe sayı biçimi: ondalık virgül (4,25), binlik nokta (1.250), "yüzde 4,25", tarih "10 Ekim 2026". Rakamın değerini asla değiştirme.
- Çeviri kokan ifadeler: İngilizceden birebir yapılar, gereksiz edilgen, "... olarak", "bir ... olan", "-mekte olan" yığılmaları, "önemli bir rol oynamak" gibi kalıplar.
- Sade dil: kısa cümleler (tercihen 25 kelimeden az), etken çatı, cümle başına tek fikir; bürokratik ifadeleri gündelik ekonomi diline çevir.
- Başlıkta yalnızca ilk kelime ve özel adlar büyük harfle başlar.
- Abartı, heyecan ve korku dili sakinleştirilir.
- "Dün", "bugün", "yarın" gibi göreli zaman ifadeleri metinde tarih varsa tarihle değiştirilir, yoksa çıkarılır.

Değiştirme:
- Olgular, rakamlar, isimler, tarihler, bilgilerin sırası.
- Tırnak içindeki doğrudan alıntılar.
- Atıflar ("Fed'e göre", "ECB'nin açıklamasına göre").
- Uzunluk (belirgin biçimde).

Metin zaten doğruysa aynen döndür.`;

const butunMetin = (y) =>
  [y.baslik, y.spot, y.govde, ...(y.rakamlar ?? []).map((r) => `${r.etiket}: ${r.deger}`), y.sirada ? `${y.sirada.tarih}: ${y.sirada.olay}` : '']
    .filter(Boolean)
    .join('\n');

const AY_TR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const AY_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// "12 Kasım 2026" kaynakta (Türkçe/İngilizce/sayısal biçimde) geçiyor mu? Gün+ay, varsa yıl da aranır.
export function tarihKaynaktaMi(tarih, kaynak) {
  const m = String(tarih).toLocaleLowerCase('tr').match(/(\d{1,2})\s+(\p{L}+)(?:\s+(\d{4}))?/u);
  if (!m) return false;
  const gun = Number(m[1]);
  const ay = AY_TR.indexOf(m[2]);
  if (ay < 0) return false;
  const k = String(kaynak).toLocaleLowerCase('tr');
  if (m[3] && !new RegExp(String.raw`(?<!\d)${m[3]}(?!\d)`).test(k)) return false;
  const g = String(gun).padStart(2, '0').replace(/^0/, '0?');
  const a = String(ay + 1).padStart(2, '0').replace(/^0/, '0?');
  const adlar = `(?:${AY_TR[ay]}|${AY_EN[ay]}|${AY_EN[ay].slice(0, 3)})`;
  const bicimler = [
    String.raw`(?<!\d)${gun}(?:st|nd|rd|th)?\.?\s+${adlar}`,
    String.raw`${adlar}\.?\s+${gun}(?!\d)`,
    String.raw`(?<!\d)${g}[./-]${a}[./-]`,
    String.raw`\d{4}-${a}-${g}(?!\d)`,
  ];
  return bicimler.some((b) => new RegExp(b, 'u').test(k));
}

// Kaynakta doğrulanamayan şerit rakamı ve sırada düşürülür (haber durmaz); en fazla 4 rakam kalır.
// Tablonun hücreleri kaynakta doğrulanmalı; tek bir hücre bile doğrulanmazsa tablo tamamen düşer (kısmi tablo yayımlanmaz).
// Etiket hücreleri (ör. ülke adı) sayı içermediği sürece kontrol edilmez; sayı içeren her hücre kaynakta aranır.
export function tabloKaynaktaMi(tablo, kaynak) {
  if (!tablo?.satirlar?.length) return false;
  return tablo.satirlar.every((satir) => satir.every((hucre) => dogrula(hucre, [kaynak]).tamam));
}

// Grafiğin her değeri (satır metni) kaynakta geçmeli; etiketler (ör. ülke adı) kontrol edilmez.
export function grafikKaynaktaMi(grafik, kaynak) {
  if (!grafik?.satirlar?.length) return false;
  return grafik.satirlar.every((s) => dogrula(s.metin, [kaynak]).tamam);
}

export function seridiSuz(yazi, aday) {
  const kaynak = aday.kaynakMetni ?? '';
  const { rakamlar, sirada, tablo, grafik, ...kalan } = yazi;
  const iyi = (rakamlar ?? []).filter((r) => r?.deger && dogrula(`${r.etiket}: ${r.deger}`, [kaynak]).tamam).slice(0, 4);
  const sOk = sirada && tarihKaynaktaMi(sirada.tarih, kaynak) && dogrula(sirada.olay, [kaynak]).tamam;
  const tOk = tablo && tabloKaynaktaMi(tablo, kaynak);
  const gOk = !tOk && grafik && grafikKaynaktaMi(grafik, kaynak);
  return {
    ...kalan,
    ...(iyi.length ? { rakamlar: iyi } : {}),
    ...(sOk ? { sirada } : {}),
    ...(tOk ? { tablo } : {}),
    ...(gOk ? { grafik } : {}),
  };
}

// Resmi kurumlar dışında hiçbir yayın kuruluşu (haber sitesi, gazete, kanal, ajans) metinde anılmaz (sahibin kuralı).
// "AA" (kredi notu) ve "AP" (Avrupa Parlamentosu) bilerek yok; yanlış alarm verirdi.
// Genel liste; şifreli kaynak listesindeki adlar çalışma anında eklenir (bkz. gizli.mjs). En uzun ad önce denenir.
const GENEL_MEDYA = [
  'AFP',
  'Anadolu Ajansı',
  'ANKA',
  'Associated Press',
  'Axios',
  "Barron's",
  'BBC',
  'Bloomberg',
  'Bloomberg HT',
  'CNBC',
  'CNN',
  'CNN Türk',
  'Demirören Haber Ajansı',
  'DHA',
  'Dünya Gazetesi',
  'Ekonomim',
  'Financial Times',
  'Fox Business',
  'FT',
  'Guardian',
  'Hürriyet',
  'İHA',
  'İhlas Haber Ajansı',
  'Milliyet',
  'New York Times',
  'NTV',
  'Politico',
  'Reuters',
  'Sabah',
  'The Economist',
  'Wall Street Journal',
  'Washington Post',
  'WSJ',
  'Yahoo Finance',
];
const regexKacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MEDYA_ADLARI = [...new Set([...GENEL_MEDYA, ...gizliMedyaAdlari()])]
  .sort((a, b) => b.length - a.length)
  .map(regexKacis)
  .join('|');
const MEDYA = new RegExp(String.raw`(?<![\p{L}\d])(${MEDYA_ADLARI})(?![\p{L}\d])`, 'gu');
export function medyaKontrol(metin) {
  const bulunan = [...new Set(metin.match(MEDYA) ?? [])];
  return bulunan.length ? [`Yayın kuruluşu adı geçiyor: ${bulunan.join(', ')}`] : [];
}

// Yerel (yapay zekâsız) düzeltme: basit sorunlar için Gemini'ye tüm kaynağı yeniden göndermeyelim.
// Yalnızca tırnak dışındaki metne dokunur; rakam ve isimler değişmez, cümle silinmez.
const GORELI = /(?<![\p{L}\d])(?:dün|bugün|yarın)(?![\p{L}\d])[ \t]*,?[ \t]*/giu;
const KESME = "['’]";
const MEDYA_ATIF = [
  // "Reuters'ın haberine göre," "Bloomberg'in aktardığına göre"
  new RegExp(String.raw`(?<![\p{L}\d])(?:${MEDYA_ADLARI})${KESME}(?:n?[ıiuü]n)\s+(?:haberine|aktardığına|aktardığı\s+bilgiye|bildirdiğine|yazdığına)\s+göre[ \t]*,?[ \t]*`, 'gu'),
  // "Reuters'a göre,"
  new RegExp(String.raw`(?<![\p{L}\d])(?:${MEDYA_ADLARI})${KESME}(?:y?[ae])\s+göre[ \t]*,?[ \t]*`, 'gu'),
  // "according to Reuters,"
  new RegExp(String.raw`(?<![\p{L}\d])according\s+to\s+(?:${MEDYA_ADLARI})(?![\p{L}\d])[ \t]*,?[ \t]*`, 'giu'),
];
const TIRNAK = /["“][^"“”\n]*["”]|«[^»\n]*»/g;
const BUYUT = '\u0001'; // silinen ifade cümle başındaysa sonraki harf büyütülür

function parcaDuzelt(t, oncesi) {
  const sil = (m, i, tum) => {
    const once = (oncesi + tum.slice(0, i)).replace(/[ \t]+$/, '');
    return once === '' || /[.!?\n]$/.test(once) ? BUYUT : ' ';
  };
  let s = t;
  for (const r of MEDYA_ATIF) s = s.replace(r, (m, i, tum) => sil(m, i, tum));
  return s.replace(GORELI, (m, i, tum) => sil(m, i, tum));
}

export function yerelDuzeltMetin(metin) {
  if (!metin) return metin;
  const src = String(metin);
  let out = '';
  let son = 0;
  for (const m of src.matchAll(TIRNAK)) {
    out += parcaDuzelt(src.slice(son, m.index), out) + m[0];
    son = m.index + m[0].length;
  }
  out += parcaDuzelt(src.slice(son), out);
  if (out === src) return src;
  return out
    .replace(/\u0001[ \t]*(\p{Ll})/gu, (_, h) => h.toLocaleUpperCase('tr'))
    .replaceAll(BUYUT, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/,([.;:!?])/g, '$1')
    .replace(/^[ \t]+|[ \t]+$/gm, '');
}

// Yalnızca baslik/spot/govde düzeltilir; şerit (rakamlar/sırada) aynen kalır.
export function yerelDuzelt(yazi) {
  const y = { ...yazi };
  for (const k of ['baslik', 'spot', 'govde']) if (typeof y[k] === 'string') y[k] = yerelDuzeltMetin(y[k]);
  return y;
}

// Habere özel yayın adları: derleyici adaylarında bağlantı verilen site genel listede olmayabilir. Gizli kaynakların
// site adı ve alan adının ana parçası (finance.ornek.com -> "ornek") metinde geçemez. Resmi kurum alanları atlanır.
const RESMI_ALAN = /\.(gov|int|mil|edu)$|\.gov\.[a-z]{2}$|(^|\.)(europa\.eu|bis\.org|imf\.org|worldbank\.org|oecd\.org|nber\.org)$/i;
export function adayMedyaKontrol(metin, gizliKaynaklar = []) {
  const adlar = new Set();
  for (const k of gizliKaynaklar) {
    let alan;
    try {
      alan = new URL(k.url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      continue;
    }
    if (RESMI_ALAN.test(alan)) continue;
    // ornek.co.uk, ornek.com.tr gibi iki parçalı uzantılarda ana parça bir öncekidir.
    const p = alan.split('.');
    const ana = p.length > 2 && p.at(-1).length === 2 && /^(co|com|net|org|ac|gov)$/.test(p.at(-2)) ? p.at(-3) : p.at(-2);
    for (const a of [k.ad, ana]) if (a && a.length >= 4) adlar.add(a);
  }
  const bulunan = [...adlar].filter((a) => new RegExp(String.raw`(?<![\p{L}\d])${regexKacis(a)}(?![\p{L}\d])`, 'iu').test(metin));
  return bulunan.length ? [`Yayın kuruluşu adı geçiyor: ${bulunan.join(', ')}`] : [];
}

// Yayın kuruluşu adı yayımlanan her alanda aranır: sentez bloğu, tablo ve grafik de sayfada görünür.
const yayimlananMetin = (y) =>
  [
    butunMetin(y),
    y.why_matters,
    ...(y.key_points ?? []),
    y.tablo ? [y.tablo.baslik, ...y.tablo.sutunlar, ...y.tablo.satirlar.flat()].join('\n') : '',
    y.grafik ? [y.grafik.baslik, y.grafik.birimEtiket, ...y.grafik.satirlar.map((s) => `${s.etiket}: ${s.metin}`)].join('\n') : '',
  ]
    .filter(Boolean)
    .join('\n');

function kesinKontrol(yazi, aday) {
  const metin = butunMetin(yazi);
  const { eksik } = dogrula(metin, [aday.kaynakMetni ?? '']);
  const tum = yayimlananMetin(yazi);
  const medya = [...new Set([...medyaKontrol(tum), ...adayMedyaKontrol(tum, aday.gizliKaynaklar)])];
  return [...eksik.map((e) => `Kaynakta bulunmayan rakam/alıntı: ${e}`), ...medya];
}

// Kontrol masası: önce kesin kontrol, sonra Gemini. Gemini çalışamazsa onay yok.
// duzenle: onay verirse aynı çağrıda taslağın redaksiyonunu da döndürür ({duzeltilmis}); onay ve sorunlar taslağın
// kendisi için verilir. Çağrı hâlâ denetimdir: girdi kontrol masasıyla aynı (kaynak en çok 20 bin karakter,
// ~5 bin token; toplam ~8 bin), çıktı birkaç yüz kelime; Gemma yedeğinin dakikada 16 bin token sınırına sığar.
export async function kontrolMasasi(yazi, aday, { gemini = varsayilanGemini, duzenle = false } = {}) {
  const sorunlar = kesinKontrol(yazi, aday);
  const r = await gemini({
    denetim: true,
    sema: duzenle ? DUZENLE_SEMASI : KARAR_SEMASI,
    sistem: 'Sen finfolis yayın kurulunun kontrol masasısın. Haberler insan onayı olmadan yayınlanır; son kapı sensin. Katı ol: şüphedeysen onaylama. Yanıtların Türkçe.',
    istem: `Yapay zekânın yazdığı taslağı KAYNAK ile karşılaştır. Aşağıdakilerden biri varsa onay=false ver ve her sorunu kısaca yaz:
1. Bir olgu (rakam, tarih, isim, unvan, kurum, olay) kaynakta yok ya da yanlış aktarılmış; İngilizce rakam Türkçe biçime çevrilirken değeri değişmiş.
2. Kurumun görüşü, beklentisi ya da değerlendirmesi kuruma atfedilmeden olgu gibi sunulmuş; tahmin kesinmiş gibi yazılmış.
3. Yatırım tavsiyesi: al/sat/tut önerisi, hedef fiyat, getiri vaadi, aciliyet ("kaçırmayın"), abartılı ya da korkutucu dil.
4. Kaynağın açıkça söylemediği bir neden-sonuç ilişkisi kurulmuş ya da kaynağın söylediği neden-sonuç kaynağa atfedilmemiş. Zaman sırası tek başına sorun değildir.
5. Başlık ya da spot metnin ve kaynağın desteklediğinden fazlasını söylüyor ya da yanıltıcı.
6. Çeviri hatası anlamı değiştirmiş ("öneri" yerine "karar", "değerlendiriyor" yerine "karar verdi" gibi).
Küçük dil kusurları ret sebebi değildir. Hiçbiri yoksa onay=true ve boş liste ver.
${duzenle ? `
Onay veriyorsan (onay=true) ayrıca duzeltilmis alanında taslağın redaksiyonunu ver; onay=false ise duzeltilmis boş kalsın. Redaksiyon YALNIZCA dili düzeltir:

${REDAKSIYON_KURALLARI}
` : ''}
Yazara verilen kurallar:
${KURALLAR}

KAYNAK:
${ilgiliKisim(aday.kaynakMetni, butunMetin(yazi), 20000)}

TASLAK:
Başlık: ${yazi.baslik}
Spot: ${yazi.spot}

${yazi.govde}`,
  });
  if (!r) return { onay: false, sorunlar: [...sorunlar, 'Yapay zekâ kontrolü çalıştırılamadı'] };
  sorunlar.push(...(r.sorunlar ?? []));
  const d = r.duzeltilmis;
  const duzeltilmis = duzenle && d?.baslik && d?.spot && d?.govde ? { baslik: d.baslik, spot: d.spot, govde: d.govde } : undefined;
  return { onay: Boolean(r.onay) && sorunlar.length === 0, sorunlar, ...(duzeltilmis ? { duzeltilmis } : {}) };
}

// Türkçe redaksiyon (ayrı çağrı): yalnızca dil; içerik değişmez. Başarısızsa metin aynen döner.
// yayinKurulu artık bunu çağırmaz (redaksiyon kontrol masası çağrısına katıldı); dışarıdan kullanım için kaldı.
export async function redaksiyon(yazi, { gemini = varsayilanGemini } = {}) {
  const r = await gemini({
    sema: YAZI_SEMASI,
    sistem: "Sen finfolis'in Türkçe redaktörüsün. Yalnızca dili düzeltirsin, içeriğe asla dokunmazsın.",
    istem: `Aşağıdaki haberin redaksiyonunu yap. YALNIZCA dili düzelt.

${REDAKSIYON_KURALLARI}

Başlık: ${yazi.baslik}
Spot: ${yazi.spot}

${yazi.govde}`,
  });
  return r?.baslik && r?.spot && r?.govde ? { baslik: r.baslik, spot: r.spot, govde: r.govde } : yazi;
}

// Döner: {yazi} ya da {dur: sebep}. dur doluysa haber yayınlanmaz.
export async function yayinKurulu(taslak, aday, { gemini = varsayilanGemini, enAzKelime } = {}) {
  const g = { gemini };
  const derleme = Array.isArray(aday.haberler);
  enAzKelime ??= derleme ? derlemeEnAz(aday.haberler.length) : EN_AZ_KELIME;
  let yazi = seridiSuz(taslak, aday);
  // düzeltme ve redaksiyon yalnızca baslik/spot/govde döndürür; şerit değişmeden taşınır
  const serit = {
    ...(yazi.rakamlar ? { rakamlar: yazi.rakamlar } : {}),
    ...(yazi.sirada ? { sirada: yazi.sirada } : {}),
    ...(yazi.tablo ? { tablo: yazi.tablo } : {}),
    ...(yazi.grafik ? { grafik: yazi.grafik } : {}),
  };
  const kisa = (y) => kelimeSay(y.govde) < enAzKelime;
  let uzatmaOncesi = null; // logda uzatmanın gerçekten çalışıp çalışmadığı görünsün
  const kisaDur = () => ({
    dur: `Metin kısa: ${kelimeSay(yazi.govde)} kelime${uzatmaOncesi === null ? '' : `, uzatmadan önce ${uzatmaOncesi}`} (en az ${enAzKelime}); kaynak yeterli bilgi içermiyor`,
    kisa: true,
  });
  // Katman 2 (Gemini kota planı): kısa taslak yalnız UZATMA_ESIGI'nin üstündeyse bir kez kaynaktan genişletilir;
  // daha kısası için kaynakta yeterli bilgi olmadığı neredeyse kesindir. Kısa kalan metin denetime girmez:
  // yazısı kullanılmaz, olay havuza gider (bkz. hent-haberler.mjs).
  // Derleme (aday.haberler) eşikten bağımsız uzatılır: birden çok haberin kaynağı vardır, kısalık yazımdan gelir.
  if (kisa(yazi)) {
    if (!derleme && kelimeSay(yazi.govde) < UZATMA_ESIGI) return kisaDur();
    uzatmaOncesi = kelimeSay(yazi.govde);
    yazi ={ ...(await (derleme ? derlemeUzat : uzat)(yazi, aday, kelimeSay(yazi.govde), g)), ...serit };
    if (kisa(yazi)) return kisaDur();
  }
  // Kontrol, sorun varsa düzeltme; en fazla 2 düzeltme turu, ardından son bir kontrol. Kontrol onay verirse aynı
  // çağrıda redaksiyon da gelir (Katman 2.4): ayrı redaksiyon çağrısı yok.
  let duzenli0;
  for (let tur = 0; ; tur++) {
    // basit sorunlar (göreli zaman, yayın kuruluşu atfı) önce yerelde düzelir; Gemini'ye yalnızca kalanlar gider
    yazi = yerelDuzelt(yazi);
    const karar = await kontrolMasasi(yazi, aday, { ...g, duzenle: true });
    if (karar.onay) {
      duzenli0 = karar.duzeltilmis;
      break;
    }
    if (tur >= 2) return { dur: `Yayın kurulu onaylamadı: ${karar.sorunlar.join('; ')}` };
    yazi = { ...(await duzelt(yazi, aday, karar.sorunlar, g)), ...serit };
  }

  // Redaksiyon da kontrol masasından geçmeli; hatasız onay almazsa onaylı önceki hâl kullanılır.
  // Değişiklik yoksa ikinci denetim gerekmez.
  const duzenli = duzenli0 && !ayniYazi(duzenli0, yazi) ? yerelDuzelt({ ...duzenli0, ...serit }) : yazi;
  // Redaksiyon metni en az uzunluğun altına indiremez.
  if (duzenli !== yazi && bicimKorunur(yazi, duzenli) && (!kisa(duzenli) || kisa(yazi)) && kesinKontrol(duzenli, aday).length === 0) {
    const karar = await kontrolMasasi(duzenli, aday, g);
    if (karar.onay) yazi = duzenli;
  }

  const kalan = kesinKontrol(yazi, aday);
  if (kalan.length) return { dur: `Son kontrol: ${kalan.join('; ')}` };
  // kisa: olay ayrı haber olmaz; havuzda eş bekler (derleme), eş yoksa bültende tek satır olur (bkz. hent-haberler.mjs).
  if (kisa(yazi)) return kisaDur();
  return { yazi };
}

const ayniYazi = (a, b) => ['baslik', 'spot', 'govde'].every((k) => a[k] === b[k]);

// Redaksiyon biçimi bozmamalı: paragraf/başlık satırları korunur ve özel adlar küçültülmez
// (ör. "Trex Bio" → "Trex bio"). Bozulursa redaksiyon atılır, onaylı metin yayınlanır.
export function bicimKorunur(once, sonra) {
  const satir = (t) => (t.match(/\n/g) ?? []).length;
  if (satir(sonra.govde) < Math.min(satir(once.govde), 2)) return false;
  const buyukler = (t) => (t.match(/\p{Lu}[\p{L}\d]*/gu) ?? []).slice(1);
  const kelimeler = once.baslik.split(/\s+/).slice(1).filter((w) => /\p{L}/u.test(w));
  // "Her Kelimesi Büyük" başlık: redaksiyon cümle düzenine indirebilir; yalnızca spot/gövdede de büyük harfle
  // geçen kelimeler (gerçek özel adlar) korunur.
  const herKelimeBuyuk = kelimeler.length >= 3 && kelimeler.filter((w) => /^\p{Lu}/u.test(w)).length / kelimeler.length >= 0.6;
  const metin = `${once.spot ?? ''} ${once.govde ?? ''}`;
  for (const k of buyukler(once.baslik)) {
    if (herKelimeBuyuk && !metin.includes(k)) continue;
    if (!sonra.baslik.includes(k) && sonra.baslik.toLocaleLowerCase('tr').includes(k.toLocaleLowerCase('tr'))) return false;
  }
  return true;
}
