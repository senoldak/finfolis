// Olay gruplama: aynı olayı anlatan adayları tek olaya birleştirir, 7 günlük olay hafızasıyla eşler.
// Aynı çağrıda her adaya haber değeri puanı (1-5) verilir; olayın önemi kaynağın önemiyle puanın büyüğüdür.
// Böylece genel RSS adayları (kaynak önemi 2) da büyük bir gelişmeyse kısa habere terfi edebilir.
import { gemini as varsayilanGemini } from './lib.mjs';
import { RESMI_BESLEMELER } from './kaynaklar/resmi-beslemeler.mjs';

// Bir hafta: yayımlanmış her haber ve bülten maddesi bu süre boyunca yeniden yazılmaz (geç düşen kopyalar dahil).
export const HAFIZA_SAAT = 7 * 24;

const SEMA = {
  type: 'object',
  properties: {
    gruplar: { type: 'array', items: { type: 'array', items: { type: 'integer' } } },
    eslesen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { aday: { type: 'integer' }, hafiza: { type: 'string' } },
        required: ['aday', 'hafiza'],
      },
    },
    puanlar: {
      type: 'array',
      items: {
        type: 'object',
        properties: { aday: { type: 'integer' }, onem: { type: 'integer' } },
        required: ['aday', 'onem'],
      },
    },
  },
  required: ['gruplar'],
};

const SISTEM = `Sen bir haber editörüsün. Aynı olayı anlatan haber adaylarını gruplar, ayrıca daha önce işlenmiş olaylarla eşleştirirsin.
Kural: aynı kurumun yeni bir belgesi ya da yeni bir rakamı (karar -> tutanak, veri -> revizyon) YENİ olaydır; aynı konuyla ilgili olsa bile eski olayla eşleştirme ve aynı gruba koyma.
Yalnızca aynı gelişmeyi anlatan adayları grupla.
Her adaya finfolis'in (Türk okura dünya piyasalarını anlatan finans sitesi) okuru için haber değeri puanı ver (onem).
Ölçüt piyasa ve ekonomi etkisidir: piyasalarla, şirket finansıyla, makro ekonomiyle ya da yatırımcıyla ilgisi zayıf haberler (tüketici ürünü tanıtımı, otomobil modeli, kültür, banknot tasarımı, tatbikat, genel siyaset) en fazla 1 alır.
5 = piyasayı oynatan büyük gelişme (faiz kararı, enflasyon/istihdam verisi, büyük kriz);
4 = önemli gelişme (büyük şirket bilançosu, milyar dolarlık birleşme/satın alma, büyük halka arz, önemli makro veri ya da düzenleme);
3 = kendi başına kısa haber olmaya değer, rakamlı somut gelişme (şirket haberi, sektör verisi, emtia/kur hareketi, merkez bankası açıklaması);
2 = rutin ya da küçük gelişme (bültende bir satır yeter);
1 = haber değeri yok (yorum, tanıtım, liste, etkinlik).`;

// Katman 2 (Gemini kota planı): gruplama istemi eskiden bütün 7 günlük hafızayı taşıyordu (~1.000 kayıt, ~50 bin
// token). Artık yalnız adaylarla en az iki ayırt edici kelime paylaşan kayıtlar gider; 7 günlük koruma sürer.
export const HAFIZA_AZAMI = 150;
const HAFIZA_OZET = 140;
const ADAY_OZET = 200;
const SIRADAN = new Set(
  ('that this with from have will said says after over more than into about their they been were what when which would could ' +
    'also year years percent million billion week weeks month months today news live update updates report reports shares ' +
    'stock stocks market markets amid first last new latest says day days rise rises rose fall falls fell company companies ' +
    'yüzde milyon milyar olarak daha için gibi sonra ancak kadar göre ilgili yeni')
    .split(' '),
);

const kelimeler = (metin) =>
  new Set(
    (String(metin ?? '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
      (k) => !SIRADAN.has(k) && (k.length >= 4 || (/\d/.test(k) && k.length >= 2)),
    ),
  );

// Adaylarla en az iki ortak kelimesi olan hafıza kayıtları; en çok ortak kelimesi olan önce, eşitse yeni önce.
export function ilgiliHafiza(adaylar, hafiza, azami = HAFIZA_AZAMI) {
  const havuz = new Set();
  for (const a of adaylar) for (const k of kelimeler(`${a.baslik} ${String(a.ozet ?? a.kaynakMetni ?? '').slice(0, ADAY_OZET)}`)) havuz.add(k);
  return hafiza
    .map((h) => ({ h, puan: [...kelimeler(h.ozet)].filter((k) => havuz.has(k)).length }))
    .filter((x) => x.puan >= 2)
    .sort((x, y) => y.puan - x.puan || new Date(y.h.zaman) - new Date(x.h.zaman))
    .slice(0, azami)
    .map((x) => x.h);
}

// Resmi kaynak kimlik önekleri: merkez bankası/SEC modülleri ve resmi RSS beslemelerinin adları.
const kacir = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RESMI_ONEK = new RegExp(
  `^(${['fed', 'ecb', 'boj', 'tcmb', 'sec', ...RESMI_BESLEMELER.map((b) => kacir(b.ad))].join('|')}):`,
  'i',
);

export const resmiMi = (a) => RESMI_ONEK.test(String(a.id ?? ''));
const acikTamMetinMi = (a) =>
  !a.ucretli && String(a.kaynakMetni ?? '').length > `${a.baslik}\n${a.ozet ?? ''}`.length;

function olayYap(adaylar) {
  const ilk = adaylar[0];
  const kaynaklar = [];
  for (const a of adaylar) {
    for (const k of a.kaynaklar ?? []) if (!kaynaklar.some((x) => x.url === k.url)) kaynaklar.push(k);
  }
  const gizliKaynaklar = [];
  for (const a of adaylar) {
    for (const k of a.gizliKaynaklar ?? []) if (!gizliKaynaklar.some((x) => x.url === k.url)) gizliKaynaklar.push(k);
  }
  const enOnemli = adaylar.reduce((m, a) => ((a.onem ?? 0) > (m.onem ?? 0) ? a : m), ilk);
  return {
    id: ilk.id,
    baslik: ilk.baslik,
    bolge: enOnemli.bolge ?? ilk.bolge,
    onem: Math.max(...adaylar.map((a) => a.onem ?? 0)),
    kategori: ilk.kategori,
    tarih: adaylar.map((a) => a.tarih).filter(Boolean).sort((x, y) => new Date(y) - new Date(x))[0] ?? ilk.tarih,
    adaylar,
    kaynakMetni: adaylar.map((a) => a.kaynakMetni).filter(Boolean).join('\n\n---\n\n'),
    kaynaklar,
    gizliKaynaklar,
    ucretliTek: adaylar.every((a) => a.ucretli),
    icerikli: adaylar.some((a) => resmiMi(a) || acikTamMetinMi(a)),
  };
}

export async function olaylariGrupla(adaylar, hafiza = [], { gemini = varsayilanGemini } = {}) {
  if (!adaylar.length) return { yeni: [], bilinen: [] };
  const ilgili = ilgiliHafiza(adaylar, hafiza);
  const istem = `ADAYLAR:
${adaylar.map((a, i) => `${i}. ${a.baslik} — ${String(a.ozet ?? a.kaynakMetni ?? '').slice(0, ADAY_OZET)}`).join('\n')}

HAFIZA (son 7 günde işlenen, adaylara benzeyen olaylar):
${ilgili.length ? ilgili.map((h) => `[${h.id}] ${String(h.ozet ?? '').slice(0, HAFIZA_OZET)}`).join('\n') : '(yok)'}

Çıktı: gruplar = aynı olayı anlatan aday numaraları (her aday en çok bir grupta); eslesen = hafızadaki bir olayla aynı olan adaylar ({aday, hafiza: hafıza id'si}); puanlar = her aday için {aday, onem}.`;
  // Gruplama başarısızsa bütün tur boşa gider; bir kez daha denenir.
  let r = null;
  for (let deneme = 1; deneme <= 2 && !r; deneme++) {
    try {
      r = await gemini({ sistem: SISTEM, istem, sema: SEMA, dusunme: 'minimal' });
      if (!r) console.warn(`[olaylar] gruplama: Gemini boş yanıt verdi (${deneme}. deneme)`);
    } catch (e) {
      console.warn(`[olaylar] gruplama: Gemini hatası (${deneme}. deneme): ${e.message}`);
      r = null;
    }
  }

  const hafizaIdleri = new Set(hafiza.map((h) => h.id));
  const bilinenIdx = new Set();
  for (const e of Array.isArray(r?.eslesen) ? r.eslesen : []) {
    if (Number.isInteger(e?.aday) && adaylar[e.aday] && hafizaIdleri.has(e.hafiza)) bilinenIdx.add(e.aday);
  }

  // Puan yalnızca önemi yükseltir; 1-5 dışındaki puanlar yok sayılır.
  const puanli = adaylar.map((a) => ({ ...a }));
  for (const p of Array.isArray(r?.puanlar) ? r.puanlar : []) {
    if (Number.isInteger(p?.aday) && puanli[p.aday] && Number.isInteger(p.onem) && p.onem >= 1 && p.onem <= 5) {
      puanli[p.aday].onem = Math.max(puanli[p.aday].onem ?? 0, p.onem);
    }
  }

  const kullanildi = new Set();
  const gruplar = [];
  for (const g of Array.isArray(r?.gruplar) ? r.gruplar : []) {
    if (!Array.isArray(g)) continue;
    // Grubun bir üyesi hafızadaysa tüm grup bilinen sayılır (aynı olay iki kez yayımlanmaz).
    if (g.some((i) => bilinenIdx.has(i))) for (const i of g) if (Number.isInteger(i) && adaylar[i]) bilinenIdx.add(i);
    const uyeler = [];
    for (const i of g) {
      if (Number.isInteger(i) && adaylar[i] && !kullanildi.has(i) && !bilinenIdx.has(i)) {
        kullanildi.add(i);
        uyeler.push(i);
      }
    }
    if (uyeler.length) gruplar.push(uyeler);
  }
  adaylar.forEach((_, i) => {
    if (!kullanildi.has(i) && !bilinenIdx.has(i)) gruplar.push([i]);
  });
  gruplar.sort((x, y) => x[0] - y[0]);

  const sonuc = {
    yeni: gruplar.map((g) => olayYap(g.map((i) => puanli[i]))),
    bilinen: [...bilinenIdx].sort((a, b) => a - b).map((i) => adaylar[i]),
  };
  // Gruplama yapılamadı: çağıran terfi ve bülteni bu çalıştırmada atlar.
  if (!r) sonuc.grupHatasi = true;
  return sonuc;
}

export function hafizaGuncelle(hafiza, olaylar, simdi = new Date()) {
  const sinir = simdi.getTime() - HAFIZA_SAAT * 3600 * 1000;
  const korunan = hafiza.filter((k) => new Date(k.zaman).getTime() >= sinir);
  const yeni = olaylar
    .filter((o) => !korunan.some((k) => k.id === o.id))
    .map((o) => ({
      id: o.id,
      ozet: `${o.baslik} — ${String(o.adaylar?.[0]?.ozet ?? '').slice(0, 200)}`.trim(),
      zaman: simdi.toISOString(),
    }));
  return [...korunan, ...yeni];
}

// Deterministik mükerrer denetimi (Gemini'siz): gruplama aynı olayı iki gruba bölebilir. Örnek (15.10.2026):
// bir beslemedeki "UK economy grew 0.1% in August" ile başlığı başka konuyla açılan başka bir beslemenin canlı yayını
// "Tech stock sell-off intensifies…; UK growth beats forecasts in August" ayrı gruplarda kaldı ve iki haber yazıldı.
// Yazardan önce her olay, bu çalıştırmada yazılanlarla ve son 24 saatin hafızasıyla karşılaştırılır.
// Yanlış pozitifi düşük tutmak için yalnızca makro veri haberleri eşlenir: aynı ülke + aynı gösterge + aynı ay/çeyrek.
export const MUKERRER_SAAT = 24;

const ULKELER = [
  // Kısaltmalar büyük/küçük harf duyarlı ("us" zamiri ABD sayılmasın).
  ['abd', /\b(?:US|USA)\b|\bU\.S\.|\b[Uu]nited [Ss]tates\b|\bAmerican?\b/],
  ['ingiltere', /\bUK\b|\bU\.K\.|\b[Bb]ritain\b|\b[Bb]ritish\b|\b[Uu]nited [Kk]ingdom\b/],
  ['euro', /\beuro ?zone\b|\beuro area\b/i],
  ['almanya', /\bgerman(?:y)?\b/i],
  ['fransa', /\bfrance\b|\bfrench\b/i],
  ['italya', /\bital(?:y|ian)\b/i],
  ['ispanya', /\bspain\b|\bspanish\b/i],
  ['japonya', /\bjapan(?:ese)?\b/i],
  ['cin', /\bchina\b|\bchinese\b/i],
  ['hindistan', /\bindia(?:n)?\b/i],
  ['kanada', /\bcanad(?:a|ian)\b/i],
  ['avustralya', /\baustralia(?:n)?\b/i],
  ['turkiye', /\bturkey\b|\bt[uü]rkiye\b|\bturkish\b/i],
  ['singapur', /\bsingapore\b/i],
  ['guney-kore', /\bsouth korea(?:n)?\b/i],
  ['isvicre', /\bswiss\b|\bswitzerland\b/i],
  ['brezilya', /\bbrazil(?:ian)?\b/i],
  ['meksika', /\bmexic(?:o|an)\b/i],
];

const GOSTERGELER = [
  // Ücret, kâr, satış vb. büyümesi GSYH büyümesi sayılmaz.
  ['buyume', /\bgdp\b|(?<!\b(?:wage|pay|earnings|sales|revenue|profit|credit|loan|lending|jobs?|payrolls?|price|rent|productivity|user|subscriber) )\bgrowth\b|\beconomy (?:grew|expanded|shrank|contracted|unexpectedly)\b|\brecession\b/i],
  ['enflasyon', /\binflation\b|\bcpi\b|\bconsumer prices?\b/i],
  ['uretici-fiyat', /\bppi\b|\bproducer prices?\b/i],
  ['istihdam', /\bunemployment\b|\bjobless\b|\bpayrolls?\b|\bjobs report\b|\bemployment\b/i],
  ['perakende', /\bretail sales\b/i],
  ['pmi', /\bpmi\b|\bpurchasing managers\b/i],
  ['dis-ticaret', /\btrade (?:balance|surplus|deficit)\b|\bexports\b|\bimports\b/i],
  ['sanayi', /\bindustrial (?:production|output)\b|\bfactory output\b/i],
];

const CEYREK = { first: 1, second: 2, third: 3, fourth: 4 };

function donemler(metin) {
  const s = new Set();
  // "May" ve "March" fiil/kip de olabildiğinden yalnızca büyük harfle sayılır.
  for (const m of metin.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g)) s.add(m[1].toLowerCase());
  for (const m of metin.matchAll(/\b(january|february|april|june|july|august|september|october|november|december)\b/gi)) s.add(m[1].toLowerCase());
  for (const m of metin.matchAll(/\bQ([1-4])\b/g)) s.add(`c${m[1]}`);
  for (const m of metin.matchAll(/\b(first|second|third|fourth)[- ]quarter\b/gi)) s.add(`c${CEYREK[m[1].toLowerCase()]}`);
  return s;
}

export function olayIzi(metin) {
  const t = String(metin ?? '');
  return {
    ulkeler: new Set(ULKELER.filter(([, r]) => r.test(t)).map(([k]) => k)),
    gostergeler: new Set(GOSTERGELER.filter(([, r]) => r.test(t)).map(([k]) => k)),
    donemler: donemler(t),
  };
}

const kesisir = (a, b) => [...a].some((x) => b.has(x));

// İki metin aynı makro veri olayını mı anlatıyor? Ülke, gösterge ve dönemin üçü de ortak olmalı.
export function ayniMakroOlay(a, b) {
  const x = olayIzi(a);
  const y = olayIzi(b);
  return kesisir(x.ulkeler, y.ulkeler) && kesisir(x.gostergeler, y.gostergeler) && kesisir(x.donemler, y.donemler);
}

const adayMetni = (a) => `${a.baslik ?? ''} — ${a.ozet ?? ''}`;

// Olayın bir adayı, bu çalıştırmada yazılan bir olayın adayıyla ya da son 24 saatin hafızasındaki bir olayla
// aynı makro olaysa eşleşeni döndürür ({id, metin}); yoksa null.
export function mukerrerBul(olay, { yazilan = [], hafiza = [], simdi = new Date() } = {}) {
  const sinir = simdi.getTime() - MUKERRER_SAAT * 3600 * 1000;
  const referanslar = [
    ...yazilan.flatMap((o) => (o.adaylar ?? []).map((a) => ({ id: o.id, metin: adayMetni(a) }))),
    ...hafiza.filter((h) => new Date(h.zaman).getTime() >= sinir).map((h) => ({ id: h.id, metin: String(h.ozet ?? '') })),
  ];
  for (const a of olay.adaylar ?? []) {
    const m = adayMetni(a);
    const r = referanslar.find((ref) => ayniMakroOlay(m, ref.metin));
    if (r) return r;
  }
  return null;
}
