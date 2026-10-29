// TCMB karnesi: Enflasyon Raporu tahminleri, Piyasa Katılımcıları Anketi beklentisi ve PPK metin tonu, gerçekleşenle karşılaştırılır.
// Saf işlevler: ağa ve dosyaya dokunmaz (Enflasyon Raporu indirmesi scripts/veri/tcmb-karnesi.mjs'te).
// Fark ve sapma her yerde "gerçekleşen − tahmin (beklenti)" olarak alınır: artı değer, gerçekleşenin tahminden yüksek olduğunu gösterir.

import { faizKarari } from './ppk-metin.mjs';

export const AYRISTIRMA_SURUMU = 2;

const yuvarla = (n, k = 2) => Math.round(n * 10 ** k) / 10 ** k;
const sayi = (s) => Number(String(s).replace(',', '.'));
const SAYI = String.raw`\d+(?:,\d+)?`;

// ---------------------------------------------------------------------------------------------------------------
// 1) Enflasyon Raporu "3. Orta Vadeli Öngörüler" metninden tahmin, aralık ve ara hedef çıkarma
// ---------------------------------------------------------------------------------------------------------------

const tekSatir = (m) => String(m).replace(/\f/g, ' ').replace(/\s+/g, ' ').trim();

// "3.2 Orta Vadeli Görünüm" paragrafı, "Grafik 3.2.1" başlığına kadar. Bulunamazsa null.
export function ortaVadeliGorunum(metin) {
  const t = tekSatir(metin);
  const bas = [...t.matchAll(/3\.2\s+Orta Vadeli Görünüm/g)].map((m) => m.index);
  for (const i of bas) {
    // Metin içindeki "(Grafik 3.2.1)" göndermesi değil, iki noktalı grafik başlığı bölümü bitirir.
    const son = t.slice(i).search(/Grafik 3\.2\.1\s*:/);
    if (son > 0) return t.slice(i, i + son);
  }
  return null;
}

// Metinden { yil, nokta, alt, ust, araHedef } listesi. Metinde olmayan alan null kalır; hiçbir değer türetilmez.
export function erTahminleriCikar(metin) {
  const bolum = ortaVadeliGorunum(metin);
  if (!bolum) throw new Error('"3.2 Orta Vadeli Görünüm" bölümü bulunamadı');
  const yillar = new Map();
  const al = (yil) => {
    if (!yillar.has(yil)) yillar.set(yil, { yil, nokta: null, alt: null, ust: null, araHedef: null });
    return yillar.get(yil);
  };

  // Aralıklar: "2024 yılı sonunda orta noktası yüzde 36 olmak üzere, yüzde 30 ile yüzde 42 aralığında" ya da
  // "2025 yıl sonunda yüzde 25 ile yüzde 29 aralığında" (orta nokta yazılmamış).
  const aralik = new RegExp(
    String.raw`(\d{4})\s+yıl(?:ı)?\s+sonunda\s+(?:ise\s+)?(?:orta noktası\s+yüzde\s+(${SAYI})\s+olmak üzere,?\s+)?yüzde\s+(${SAYI})\s+ile\s+yüzde\s+(${SAYI})\s+aralığında`,
    'g',
  );
  for (const m of bolum.matchAll(aralik)) {
    const k = al(Number(m[1]));
    if (m[2]) k.nokta = sayi(m[2]);
    k.alt = sayi(m[3]);
    k.ust = sayi(m[4]);
  }

  // Yalnız nokta tahmini ("2026 yıl sonunda yüzde 26; 2027 yıl sonunda ise yüzde 15 olarak gerçekleşeceği tahmin edilmektedir"):
  // yalnızca "tahmin edilmektedir" ile biten ilk cümleye bakılır.
  const cumleler = bolum.split(/(?<=[.)])\s+(?=[A-ZÇĞİÖŞÜ0-9])/);
  const ilk = cumleler.find((c) => /tahmin edilmektedir/.test(c));
  if (ilk) {
    const nokta = new RegExp(String.raw`(\d{4})\s+yıl(?:ı)?\s+sonunda\s+(?:ise\s+)?yüzde\s+(${SAYI})(?!\d|,\d|\s+ile)`, 'g');
    for (const m of ilk.matchAll(nokta)) {
      const k = al(Number(m[1]));
      if (k.nokta == null && k.alt == null) k.nokta = sayi(m[2]);
    }
  }
  // "2026 yılı sonunda tek haneli seviyelere gerileyip yüzde 9’a düştükten sonra"
  for (const m of bolum.matchAll(new RegExp(String.raw`(\d{4})\s+yılı\s+sonunda\s+tek haneli seviyelere gerileyip\s+yüzde\s+(${SAYI})`, 'g'))) {
    const k = al(Number(m[1]));
    if (k.nokta == null && k.alt == null) k.nokta = sayi(m[2]);
  }

  // Ara hedefler (Enflasyon Raporu 2025-III ve sonrası): "2025, 2026 ve 2027 yılları için (ara hedefler) sırasıyla yüzde 24, yüzde 16 ve yüzde 9".
  const sira = new RegExp(String.raw`((?:\d{4}(?:,\s*|\s+ve\s+)?)+)\s+yılları\s+için\s+(?:ara hedefler\s+)?sırasıyla\s+((?:yüzde\s+${SAYI}(?:,\s*|\s+ve\s+)?)+)`, 'g');
  for (const m of bolum.matchAll(sira)) {
    const pencere = bolum.slice(Math.max(0, m.index - 160), m.index + m[0].length + 80);
    if (!/ara hedef/i.test(pencere)) continue;
    const ys = [...m[1].matchAll(/\d{4}/g)].map((x) => Number(x[0]));
    const vs = [...m[2].matchAll(new RegExp(String.raw`yüzde\s+(${SAYI})`, 'g'))].map((x) => sayi(x[1]));
    if (ys.length !== vs.length) throw new Error(`Ara hedef yılları ve değerleri eşleşmiyor: ${m[0]}`);
    ys.forEach((y, i) => {
      const k = al(y);
      if (k.araHedef == null) k.araHedef = vs[i];
    });
    break;
  }
  for (const m of bolum.matchAll(new RegExp(String.raw`(\d{4})\s+yılı\s+için\s+yüzde\s+(${SAYI})\s+olarak belirlenmiştir`, 'g'))) {
    const pencere = bolum.slice(Math.max(0, m.index - 220), m.index + 60);
    if (!/ara hedef/i.test(pencere)) continue;
    const k = al(Number(m[1]));
    if (k.araHedef == null) k.araHedef = sayi(m[2]);
  }

  const liste = [...yillar.values()].sort((a, b) => a.yil - b.yil);
  for (const k of liste) {
    if ((k.alt == null) !== (k.ust == null)) throw new Error(`${k.yil}: aralığın yalnız bir ucu bulundu`);
    if (k.alt != null && !(k.alt < k.ust)) throw new Error(`${k.yil}: aralık geçersiz (${k.alt}–${k.ust})`);
    if (k.nokta != null && k.alt != null && (k.nokta < k.alt || k.nokta > k.ust)) throw new Error(`${k.yil}: orta nokta aralığın dışında`);
  }
  return liste;
}

// "Karşılaştırma değeri": açık yazılmış nokta tahmini; yoksa aralığın ortası (açıkça işaretlenir); ikisi de yoksa null.
export function ortaDeger(t) {
  if (t.nokta != null) return { deger: t.nokta, tur: 'acik' };
  if (t.alt != null && t.ust != null) return { deger: yuvarla((t.alt + t.ust) / 2, 2), tur: 'aralik-ortasi' };
  return { deger: null, tur: null };
}

// Gerçekleşen yıl sonu yıllık TÜFE: yalnız Aralık verisi olan yıllar.
export function yilSonuTufe(enflasyonSatirlari) {
  const m = new Map();
  for (const s of enflasyonSatirlari) if (s.ay === 12 && Number.isFinite(s.yillik)) m.set(s.yil, s.yillik);
  return m;
}

// Raporlar ve gerçekleşen → hedef yıl bazında gruplanmış karne.
export function erKarne(raporlar, enflasyonSatirlari) {
  const gercek = yilSonuTufe(enflasyonSatirlari);
  const sonSatir = [...enflasyonSatirlari].sort((a, b) => a.yil * 12 + a.ay - (b.yil * 12 + b.ay)).at(-1) ?? null;
  const yillar = new Map();
  for (const r of [...raporlar].sort((a, b) => a.tarih.localeCompare(b.tarih))) {
    for (const t of r.tahminler ?? []) {
      if (!yillar.has(t.yil)) yillar.set(t.yil, []);
      const o = ortaDeger(t);
      const g = gercek.get(t.yil) ?? null;
      const aralikta = g != null && t.alt != null ? (g < t.alt ? 'alt' : g > t.ust ? 'ust' : 'icinde') : null;
      yillar.get(t.yil).push({
        id: r.id,
        donem: r.donem,
        tarih: r.tarih,
        url: r.url,
        ufuk: t.yil - Number(r.tarih.slice(0, 4)),
        nokta: t.nokta,
        alt: t.alt,
        ust: t.ust,
        araHedef: t.araHedef,
        orta: o.deger,
        ortaTuru: o.tur,
        fark: g != null && o.deger != null ? yuvarla(g - o.deger) : null,
        aralikta,
        farkAraHedef: g != null && t.araHedef != null ? yuvarla(g - t.araHedef) : null,
      });
    }
  }
  return [...yillar.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([yil, satirlar]) => ({ yil, gerceklesen: gercek.get(yil) ?? null, sonVeri: gercek.has(yil) ? null : sonSatir && sonSatir.yil === yil ? sonSatir : null, satirlar }));
}

// ---------------------------------------------------------------------------------------------------------------
// 2) Piyasa Katılımcıları Anketi: 12 ay sonrası beklenti ve 12 ay sonra gerçekleşen
// ---------------------------------------------------------------------------------------------------------------

// Anket ayı t'nin ay12 değeri, t+12 ayının yıllık TÜFE'siyle eşlenir. t+12 verisi henüz yoksa eşleşme oluşmaz.
export function pkaEsle(beklentiSatirlari, enflasyonSatirlari) {
  const yillik = new Map(enflasyonSatirlari.map((s) => [s.yil * 12 + s.ay - 1, s.yillik]));
  const esler = [];
  for (const b of [...beklentiSatirlari].sort((x, y) => x.yil * 12 + x.ay - (y.yil * 12 + y.ay))) {
    if (!Number.isFinite(b.ay12)) continue;
    const t = b.yil * 12 + b.ay - 1 + 12;
    const g = yillik.get(t);
    if (!Number.isFinite(g)) continue;
    esler.push({
      anketYil: b.yil,
      anketAy: b.ay,
      hedefYil: Math.floor(t / 12),
      hedefAy: (t % 12) + 1,
      beklenti: b.ay12,
      gerceklesen: g,
      sapma: yuvarla(g - b.ay12),
    });
  }
  return esler;
}

const ort = (xs) => (xs.length ? yuvarla(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function hataOlcusu(esler) {
  return {
    n: esler.length,
    ortSapma: ort(esler.map((e) => e.sapma)),
    ortMutlak: ort(esler.map((e) => Math.abs(e.sapma))),
    ilk: esler[0] ? { yil: esler[0].anketYil, ay: esler[0].anketAy } : null,
    son: esler.at(-1) ? { yil: esler.at(-1).anketYil, ay: esler.at(-1).anketAy } : null,
  };
}

// Anketin yapıldığı yıla göre ayrı ölçü (rejim değişimleri tek ortalamada kaybolmasın).
export function yilaGore(esler) {
  const m = new Map();
  for (const e of esler) {
    if (!m.has(e.anketYil)) m.set(e.anketYil, []);
    m.get(e.anketYil).push(e);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([yil, xs]) => ({ yil, ...hataOlcusu(xs) }));
}

// Tümü ve son N eşleşme (anket ayı olarak son N ay).
export function hataOzeti(esler, sonN = 24) {
  return { tumu: hataOlcusu(esler), son: hataOlcusu(esler.slice(-sonN)) };
}

// ---------------------------------------------------------------------------------------------------------------
// 3) İletişim karnesi: PPK metin tonu → bir sonraki PPK kararı
// ---------------------------------------------------------------------------------------------------------------

export const TON_ESIGI = 0.75;

// PPK karar belgelerinden toplantı tarihi → karar yönü ('artis' | 'sabit' | 'indirim'). Okunamayan toplantı eklenmez.
export function kararlariCikar(belgeler) {
  const m = new Map();
  for (const b of belgeler) {
    if (b.tur !== 'karar') continue;
    const k = faizKarari(b.cumleler ?? b.paragraflar ?? []);
    if (k) m.set(b.tarih, k.karar);
  }
  return m;
}

export function tonSinifi(ton, esik = TON_ESIGI) {
  return ton <= -esik ? 'guvercin' : ton >= esik ? 'sahin' : 'dengeli';
}

// Tonun sınıfına göre beklenen sonraki karar ve isabet kuralı (kullanıcı tanımı):
//  ton ≤ −0,75: indirim; ton ≥ +0,75: artırım ya da sabit (indirim değil); arada: sabit.
export function tonIsabeti(sinif, sonraki) {
  if (sinif === 'guvercin') return sonraki === 'indirim';
  if (sinif === 'sahin') return sonraki === 'artis' || sonraki === 'sabit';
  return sonraki === 'sabit';
}

// dongu: donguler() çıktısı (tarihe göre sıralı). kararlar: kararlariCikar() çıktısı.
// Her döngü için: tonu, aynı toplantının kararı ve BİR SONRAKİ toplantının kararı. Taban kural: "sonraki karar bu toplantının kararıyla aynı yönde".
export function tonKarnesi(dongu, kararlar, esik = TON_ESIGI) {
  const sirali = [...dongu].sort((a, b) => a.toplanti.localeCompare(b.toplanti));
  const satirlar = sirali.map((d, i) => {
    const bugun = kararlar.get(d.toplanti) ?? null;
    const sonrakiToplanti = sirali[i + 1]?.toplanti ?? null;
    const sonraki = sonrakiToplanti ? (kararlar.get(sonrakiToplanti) ?? null) : null;
    const ton = d.ileriYon ?? null;
    const sinif = ton == null ? null : tonSinifi(ton, esik);
    const olculur = ton != null && sonraki != null;
    return {
      toplanti: d.toplanti,
      ton,
      sinif,
      bugun,
      sonrakiToplanti,
      sonraki,
      olculur,
      tonIsabet: olculur ? tonIsabeti(sinif, sonraki) : null,
      tabanIsabet: olculur && bugun ? sonraki === bugun : null,
    };
  });
  const olculen = satirlar.filter((s) => s.olculur && s.tabanIsabet != null);
  const say = (xs, f) => xs.filter(f).length;
  const siniflar = {};
  for (const sn of ['guvercin', 'dengeli', 'sahin']) {
    const xs = olculen.filter((s) => s.sinif === sn);
    siniflar[sn] = { n: xs.length, isabet: say(xs, (s) => s.tonIsabet) };
  }
  // Yön değişen geçişler: sonraki karar bu toplantının kararından farklı. Taban kural bu geçişlerin hiçbirinde tutmaz.
  const degisen = olculen.filter((s) => s.bugun && s.sonraki !== s.bugun);
  return {
    satirlar,
    degisim: { n: degisen.length, tonIsabet: say(degisen, (s) => s.tonIsabet) },
    n: olculen.length,
    tonIsabet: say(olculen, (s) => s.tonIsabet),
    tabanIsabet: say(olculen, (s) => s.tabanIsabet),
    siniflar,
    sonrakiYok: satirlar.filter((s) => s.ton != null && !s.sonraki).map((s) => s.toplanti),
  };
}
