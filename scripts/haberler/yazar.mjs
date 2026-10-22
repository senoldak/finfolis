// Yazar: adayın kaynak metninden Türkçe haber taslağı üretir (Gemini).
// Yalnızca adayın kaynak metni kullanılır; ipucu başlıkları buraya hiç gelmez.
import { gemini as varsayilanGemini } from './lib.mjs';
import { ilgiliKisim } from './kaynak-kirp.mjs';

export const YAZI_SEMASI = {
  type: 'object',
  properties: {
    baslik: { type: 'string' },
    spot: { type: 'string', description: 'En fazla 2 cümle' },
    govde: { type: 'string', description: 'Markdown gövde; 250-400 kelime, 3-5 paragraf, yalnızca kaynaktaki bilgiler' },
    rakamlar: {
      type: 'array',
      maxItems: 4,
      description: 'Rakam şeridi; en fazla 4, yalnızca kaynakta geçen rakamlar',
      items: { type: 'object', properties: { etiket: { type: 'string' }, deger: { type: 'string' } }, required: ['etiket', 'deger'] },
    },
    sirada: {
      type: 'object',
      description: 'Sıradaki gelişme; yalnızca kaynakta tarih varsa',
      properties: { tarih: { type: 'string' }, olay: { type: 'string' } },
      required: ['tarih', 'olay'],
    },
    tablo: {
      type: 'object',
      description: 'En fazla bir karşılaştırma tablosu; yalnızca kaynakta birden çok öğenin sayısal olarak karşılaştırıldığı durumda. Her sayı kaynakta aynen geçmeli.',
      properties: {
        baslik: { type: 'string' },
        sutunlar: { type: 'array', items: { type: 'string' }, description: 'İlk sütun öğe adı; en az 2, en fazla 4 sütun' },
        satirlar: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'En fazla 8 satır; her satır sütun sayısı kadar hücre' },
      },
      required: ['baslik', 'sutunlar', 'satirlar'],
    },
    grafik: {
      type: 'object',
      description: 'En fazla bir piktogram grafiği; yalnızca kaynakta birden çok öğenin sayısal olarak karşılaştırıldığı durumda. Değerler kaynakta aynen geçmeli ve sıfırdan küçük olamaz.',
      properties: {
        baslik: { type: 'string' },
        simge: { type: 'string', enum: ['lira', 'banka', 'sepet'] },
        birimEtiket: { type: 'string', description: 'Birimin adı, ör. "yüzde", "TL", "dolar"; sayı eklenmez' },
        satirlar: {
          type: 'array',
          description: 'En az 2, en fazla 6 satır',
          items: { type: 'object', properties: { etiket: { type: 'string' }, deger: { type: 'string' } }, required: ['etiket', 'deger'] },
        },
      },
      required: ['baslik', 'simge', 'birimEtiket', 'satirlar'],
    },
    why_matters: { type: 'string', description: '1-2 cümle: Bu piyasa/ekonomi gelişmesi neden önemli?' },
    key_points: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
      description: 'Haberden en fazla 3 kritik somut madde / rakam',
    },
  },
  required: ['baslik', 'spot', 'govde'],
};

export const KURALLAR = `Kesin kurallar:
- Yalnızca KAYNAK metindeki bilgileri kullan. Her rakam ve tarih kaynakta geçmeli; rakam uydurma, hesaplama, tahmin etme.
- Doğrudan alıntı yalnızca kaynakta kelimesi kelimesine geçiyorsa tırnak içinde verilir; emin değilsen tırnaksız dolaylı anlatım kullan.
- Yatırım tavsiyesi yok: al/sat/tut önerisi, hedef fiyat, getiri vaadi, "kaçırmayın" gibi aciliyet yok.
- Neden-sonuç ilişkisi yalnızca kaynak açıkça söylüyorsa kurulur ve kaynağa atfedilir ("Fed'e göre ..."). Zaman sırası anlatılabilir ("karardan sonra ..."), ama kaynak söylemedikçe "bu yüzden" denmez.
- Tahmin ve beklentiler olgu gibi sunulmaz; kimin beklentisi olduğu belirtilir.
- Kurumun görüş ve değerlendirmeleri kuruma atfedilir.
- Haberin alındığı yayın kuruluşunun (gazete, haber sitesi, ajans) adı metinde asla geçmez; atıf yalnızca açıklamayı yapan kişi ya da kuruma yapılır.`;

export const SES = `Ses: sade, açıklayıcı Türkçe; abartı, heyecan, korku dili yok. Piyasa hareketleri sakin anlatılır. Her rakam ne anlama geldiğiyle birlikte verilir.
Türkçe yazım: TDK yazım kuralları; ondalık virgül (4,25), binlik nokta (1.250), "yüzde 4,25" biçimi; tarihler "10 Ekim 2026" biçiminde. Kaynak İngilizceyse rakamları Türkçe biçime çevir, değerini değiştirme.`;

const SISTEM = `Sen finfolis için çalışan bir ekonomi muhabirisin. Finans bilgisi olmayanlar da dahil geniş bir okur kitlesine anlaşılır haberler yazarsın.
${SES}
${KURALLAR}`;

export function yazarIstemi(aday) {
  return `Aşağıdaki kaynaktan Türkçe bir haber yaz.
- baslik: olanı doğru ve abartısız anlatan kısa başlık. Aranan kelimeyle başlar (kişi, kurum, gösterge ya da olay adı ilk kelime olur). İki noktalı başlangıç kullanma ("Kurum: …" değil); soru cümlesi yazma; "Yeni gelişme", "Dikkat çeken adım" gibi belirsiz başlık yazma. Yalnızca ilk kelime ve özel adlar büyük harfle başlar ("Amerikalıların borç ödemelerinde büyük artış"; "Amerikalıların Borç Ödemelerinde Büyük Artış" değil). Sonda nokta yok.
- spot: en fazla 2 cümle; ne oldu ve ana rakam.
- govde: Markdown, 250-400 kelime, 3-5 kısa paragraf. Sırayla: (1) ne oldu; (2) okur ve piyasalar için anlamı, kaynağın verdiği bağlam ve arka planla; (3) ana rakam, ait olduğu tarih ve açıklayan kurum ya da kişi. Yalnızca KAYNAK'taki bilgileri kullan: kaynak bu uzunluğa yetmiyorsa uydurma, tekrar ya da dolgu cümlesi yazma. Ara başlık koyma. Kaynak bağlantısı ekleme, otomatik eklenir.
- rakamlar: en fazla 4 öğe ({etiket, deger}); yalnızca kaynakta aynen geçen rakamlar, Türkçe biçimde. Emin değilsen boş bırak.
- sirada: {tarih, olay}; yalnızca kaynakta bir sonraki gelişmenin tarihi açıkça varsa ("12 Kasım 2026" biçiminde). Yoksa alanı hiç ekleme.
- tablo: {baslik, sutunlar, satirlar}; yalnızca kaynak birden çok öğeyi (ülke, şirket, gösterge, dönem) sayısal olarak karşılaştırıyorsa, en fazla 8 satır. Hücre sayıları kaynakta aynen geçmeli. Emin değilsen alanı ekleme.
- grafik: {baslik, simge, birimEtiket, satirlar}; tablo ile aynı koşul, ama tablo yerine görsel karşılaştırma için en fazla 6 satır, değerler sıfırdan küçük değil. Aynı haberde hem tablo hem grafik olmaz; biri seçilir. simge: lira (para), banka (faiz, kredi), sepet (fiyat, enflasyon). Emin değilsen alanı ekleme.

KONU: ${aday.baslik}
KATEGORİ: ${aday.kategori ?? ''}
KAYNAK (${(aday.kaynaklar ?? []).map((k) => k.ad).join(', ')}):
${String(aday.kaynakMetni ?? '').slice(0, 14000)}`;
}

// UTF-8 metnin Windows-1252 olarak okunmasıyla oluşan bozulmayı (ör. "EylÃ¼l", "DÃ¼ÅŸÃ¼ÅŸÃ¼") geri çevirir.
// Bozulma yoksa metne dokunmaz; geri çevrilmiş metin geçersiz UTF-8 üretirse orijinali bırakır.
const CP1252_BAYT = new Map([...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'].map((c, i) => [c, 0x80 + i]));
const BOZUK = /[Â-ô][-¿€‚-„†-•…‰‹ŒŽ‘-”–—˜™š›œžŸ]/;
export function mojibakeDuzelt(metin) {
  if (typeof metin !== 'string' || !BOZUK.test(metin)) return metin;
  const bayt = [];
  for (const c of metin) {
    const kod = c.codePointAt(0);
    if (kod < 0x100) bayt.push(kod);
    else if (CP1252_BAYT.has(c)) bayt.push(CP1252_BAYT.get(c));
    else return metin;
  }
  const geri = Buffer.from(bayt).toString('utf8');
  return geri.includes('�') ? metin : geri;
}

// Piktogram grafiği: birim, en büyük değer en fazla 20 simgeye sığacak şekilde seçilir (1-2-2,5-5 dizisinin on katları).
const BIRIM_ADAYLARI = [1, 2, 2.5, 5];
export function birimSec(enBuyuk) {
  const hedef = enBuyuk / 20;
  if (!(hedef > 0)) return 1;
  const kat = 10 ** Math.floor(Math.log10(hedef));
  for (const f of [...BIRIM_ADAYLARI, 10]) if (f * kat >= hedef) return Number((f * kat).toPrecision(6));
  return kat;
}

// Türkçe sayı metninden ilk sayıyı çıkarır: "yüzde 3,7" -> 3.7, "1.250" -> 1250. Sayı yoksa null.
export function sayiCoz(metin) {
  const m = String(metin).match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function grafikAyikla(g) {
  if (!g || typeof g.baslik !== 'string' || typeof g.birimEtiket !== 'string' || !Array.isArray(g.satirlar)) return null;
  if (!['lira', 'banka', 'sepet'].includes(g.simge)) return null;
  if (g.satirlar.length < 2 || g.satirlar.length > 6) return null;
  const satirlar = [];
  for (const s of g.satirlar) {
    const etiket = typeof s?.etiket === 'string' ? mojibakeDuzelt(s.etiket.trim()) : '';
    const metin = typeof s?.deger === 'string' ? mojibakeDuzelt(s.deger.trim()) : '';
    const deger = sayiCoz(metin);
    if (!etiket || !metin || deger === null || deger < 0) return null;
    satirlar.push({ etiket, metin, deger });
  }
  const birim = birimSec(Math.max(...satirlar.map((s) => s.deger)));
  const birimAdi = mojibakeDuzelt(g.birimEtiket.trim());
  if (!birimAdi) return null;
  return { baslik: mojibakeDuzelt(g.baslik.trim()), simge: g.simge, birimEtiket: birimAdi, birim, satirlar };
}

// Tablo biçimi: 2-4 sütun, 1-8 satır, her satır sütun sayısı kadar hücre. Bozuksa tablo atlanır (haber durmaz).
export function tabloAyikla(t) {
  if (!t || typeof t.baslik !== 'string' || !Array.isArray(t.sutunlar) || !Array.isArray(t.satirlar)) return null;
  const sutunlar = t.sutunlar.map((x) => mojibakeDuzelt(String(x).trim()));
  if (sutunlar.length < 2 || sutunlar.length > 4 || sutunlar.some((x) => !x)) return null;
  const satirlar = t.satirlar.map((r) => (Array.isArray(r) ? r.map((x) => mojibakeDuzelt(String(x).trim())) : null));
  if (satirlar.length < 1 || satirlar.length > 8) return null;
  if (satirlar.some((r) => !r || r.length !== sutunlar.length || r.some((x) => !x))) return null;
  return { baslik: mojibakeDuzelt(t.baslik.trim()), sutunlar, satirlar };
}

const yaziMi = (r) => {
  if (!(r?.baslik && r?.spot && r?.govde)) return null;
  const y = { baslik: mojibakeDuzelt(r.baslik), spot: mojibakeDuzelt(r.spot), govde: mojibakeDuzelt(r.govde) };
  const tablo = tabloAyikla(r.tablo);
  if (tablo) y.tablo = tablo;
  const grafik = grafikAyikla(r.grafik);
  if (grafik && !tablo) y.grafik = grafik;
  if (Array.isArray(r.rakamlar) && r.rakamlar.length) y.rakamlar = r.rakamlar.filter((x) => x?.etiket && x?.deger).map((x) => ({ etiket: mojibakeDuzelt(String(x.etiket)), deger: mojibakeDuzelt(String(x.deger)) }));
  if (r.sirada?.tarih && r.sirada?.olay) y.sirada = { tarih: mojibakeDuzelt(String(r.sirada.tarih)), olay: mojibakeDuzelt(String(r.sirada.olay)) };
  if (r.why_matters) y.why_matters = mojibakeDuzelt(String(r.why_matters).trim());
  if (Array.isArray(r.key_points) && r.key_points.length) {
    const kp = r.key_points.map((p) => mojibakeDuzelt(String(p).trim())).filter(Boolean);
    if (kp.length) y.key_points = kp;
  }
  return y;
};

// Döner: {baslik, spot, govde} ya da null (anahtar yok / boş yanıt).
export async function yaz(aday, { gemini = varsayilanGemini } = {}) {
  return yaziMi(await gemini({ sistem: SISTEM, istem: yazarIstemi(aday), sema: YAZI_SEMASI }));
}

// Tema derlemesi (bkz. derleme.mjs): aynı kategorideki kısa haberler tek yazıda anlatılır.
// aday.haberler: [{baslik, kaynakMetni}]; her haberin kendi kaynak metni verilir, yazı yalnızca bunlardan kurulur.
// Derleme gövde hedefi: haber başına 50–80 kelimelik paragraf; tek cümlelik özet paragraflar derlemeyi
// yayın eşiğinin (yayin-kurulu.mjs, EN_AZ_KELIME) altında bırakıyordu.
export const derlemeHedefi = (n) => ({ alt: Math.max(250, n * 50), ust: Math.max(400, n * 80) });

// Haberler kategori ara başlıkları altında; kategoriler gruptaki ilk görünüş sırasıyla.
function haberBlogu(aday) {
  const kategoriler = [...new Set(aday.haberler.map((h) => h.kategori ?? ''))];
  return kategoriler
    .map((k) => `## ${k}\n` + aday.haberler.filter((h) => (h.kategori ?? '') === k).map((h) => `### ${h.baslik}\n${h.kaynakMetni}`).join('\n\n'))
    .join('\n\n');
}

export function derlemeIstemi(aday) {
  const { alt, ust } = derlemeHedefi(aday.haberler.length);
  return `Aşağıda aynı zaman diliminden ${aday.haberler.length} kısa haber var. Bunları tek bir Türkçe derleme haberinde topla.
- baslik: dilimin öne çıkan konularını anlatan kısa başlık; tek bir haberi öne çıkarmaz. İki noktalı başlangıç kullanma; sonda nokta yok. Tarih ve saat yazma.
- spot: en fazla 2 cümle; dilimin ana noktası.
- govde: Markdown, ${alt}-${ust} kelime. Her kategori için bir ara başlık ("## Kategori adı", HABERLER'deki sırayla), altında o kategorideki her haber için bir paragraf. Her paragraf 50-80 kelime (3-4 cümle): haberin konusuyla başlar; ne olduğunu, ana rakamı ve kimin açıkladığını anlatır. Tek cümlelik özet yazma. Yalnızca o haberin KAYNAK bölümündeki bilgileri kullan; bir haberin kaynağında yetmeyen bilgi için başka haberin kaynağını kullanma, uydurma.
- rakamlar: en fazla 4 öğe ({etiket, deger}); yalnızca kaynakta aynen geçen rakamlar. Emin değilsen boş bırak.
- tablo, grafik, sirada: kullanma.

HABERLER:
${haberBlogu(aday)}`;
}

// Kısa kalan derlemeyi genişletir: ara başlıklar ve sıra korunur, her paragraf yalnız kendi haberinin kaynağıyla
// uzar. Tek haber uzatmasından (uzat) farkı budur; o ara başlık koymayı yasaklar. Başarısızsa taslak aynen döner.
export async function derlemeUzat(taslak, aday, kelime, { gemini = varsayilanGemini } = {}) {
  const { alt, ust } = derlemeHedefi(aday.haberler.length);
  const r = await gemini({
    sistem: SISTEM,
    sema: YAZI_SEMASI,
    istem: `Bu derleme haberinin gövdesi ${kelime} kelime; ${alt}-${ust} kelime olmalı. Her haber paragrafını 50-80 kelimeye (3-4 cümle) genişlet: ne olduğu, ana rakam, kimin açıkladığı, kaynaktaki bağlam.
Her paragrafı yalnızca HABERLER'de o haberin kendi bölümündeki bilgilerle genişlet; başka haberin kaynağını kullanma. Kaynakta olmayan bilgi, rakam, tahmin ya da yorum ekleme; aynı bilgiyi tekrar etme, dolgu cümlesi yazma. Ara başlıkları ("## ..."), paragraf sırasını, başlığı ve spotu değiştirme.

HABERLER:
${haberBlogu(aday)}

TASLAK:
Başlık: ${taslak.baslik}
Spot: ${taslak.spot}

${taslak.govde}`,
  });
  return yaziMi(r) ?? taslak;
}

// Döner: derleme taslağı ({baslik, spot, govde, rakamlar?}) ya da null. Tablo, grafik ve sıradaki gelişme derlemede kullanılmaz.
export async function derlemeYaz(aday, { gemini = varsayilanGemini } = {}) {
  const y = yaziMi(await gemini({ sistem: SISTEM, istem: derlemeIstemi(aday), sema: YAZI_SEMASI }));
  if (!y) return null;
  const { tablo, grafik, sirada, ...kalan } = y;
  return kalan;
}

// Kısa taslağı yalnızca kaynaktaki ek bilgilerle genişletir (bkz. yayin-kurulu.mjs, EN_AZ_KELIME).
// Kaynakta ek bilgi yoksa model taslağı aynen döndürür; başarısızsa taslak aynen döner. Sonuç yine denetimden geçer.
export async function uzat(taslak, aday, kelime, { gemini = varsayilanGemini } = {}) {
  const r = await gemini({
    sistem: SISTEM,
    sema: YAZI_SEMASI,
    istem: `Taslağın gövdesi ${kelime} kelime; okur ne olduğunu, neden önemli olduğunu ve ana rakamı tarihi ve kaynağıyla birlikte anlayabilmeli. Gövdeyi 250-400 kelimeye, 3-5 kısa paragrafa genişlet.
Yalnızca KAYNAK'taki bilgileri ekle: bağlam, arka plan, önceki dönem rakamları, açıklayan kurumun değerlendirmesi (kuruma atfederek). Kaynakta olmayan bilgi, rakam, tahmin ya da yorum ekleme; aynı bilgiyi tekrar etme, dolgu cümlesi yazma. Kaynakta ek bilgi yoksa taslağı aynen döndür. Başlık ve spotu değiştirme, ara başlık koyma.

KAYNAK:
${ilgiliKisim(aday.kaynakMetni, `${taslak.baslik}\n${taslak.spot}\n${taslak.govde}`, 14000)}

TASLAK:
Başlık: ${taslak.baslik}
Spot: ${taslak.spot}

${taslak.govde}`,
  });
  return yaziMi(r) ?? taslak;
}

// Yayın kurulunun bulduğu sorunlara göre taslağı düzelttirir; başarısızsa taslak aynen döner.
export async function duzelt(taslak, aday, sorunlar, { gemini = varsayilanGemini } = {}) {
  const r = await gemini({
    sistem: SISTEM,
    sema: YAZI_SEMASI,
    istem: `Yayın kurulu taslağında sorunlar buldu. Hepsini yalnızca KAYNAK'a dayanarak düzelt: kaynakta olmayan bilgi ve rakamı çıkar ya da kaynaktaki hâliyle yaz, görüşleri kaynağa atfet, kaynağın söylemediği neden-sonuç ilişkisini çıkar, tavsiye ve abartıyı sil. Kaynakta kelimesi kelimesine bulunmayan alıntıyı tırnaksız dolaylı anlatıma çevir. Biçim ve uzunluğu koru.

SORUNLAR:
${sorunlar.map((s) => `- ${s}`).join('\n')}

KAYNAK:
${ilgiliKisim(aday.kaynakMetni, `${taslak.baslik}\n${taslak.spot}\n${taslak.govde}`, 14000)}

TASLAK:
Başlık: ${taslak.baslik}
Spot: ${taslak.spot}

${taslak.govde}${taslak.why_matters ? `\n\nNeden önemli (why_matters): ${taslak.why_matters}` : ''}${taslak.key_points?.length ? `\nKısa maddeler (key_points): ${taslak.key_points.join(' | ')}` : ''}`,
  });
  return yaziMi(r) ?? taslak;
}
