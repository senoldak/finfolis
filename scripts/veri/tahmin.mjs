// Tahmin sayfasının (/veri/tahmin/) hesabı. Yalnız depodaki resmi verilerden çalışır, ağ isteği ve yapay zekâ çağrısı
// yoktur; bot zincirinde resmi veri ve tahmin-veri adımlarından sonra saniyeler içinde biter.
//  - src/data/tahmin.json: modellerin örneklem dışı karnesi, kapı kararı, yayımlanan güncel tahminler, hesap makinesi ve
//      Taylor bandı verisi. Kapıyı geçemeyen modelin güncel rakamı bu dosyaya hiç yazılmaz.
//  - src/data/tahmin-arsivi.json: yalnız ekleme yapılan arşiv. Kapıdan geçip yayımlanan her tahmin bir kez, yapıldığı
//      tarih ve model sürümüyle yazılır; var olan kayıt değiştirilmez, silinmez. Model değişirse SURUMLER'de yeni ad alır.
//
// Kullanım: node scripts/veri/tahmin.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  SURUMLER,
  ak,
  akdenAy,
  ekkSinama,
  karne,
  tufeGozlemleri,
  cariGozlemleri,
  sanayiGozlemleri,
  ar1Ekle,
  ppkKararlari,
  ppkGozlemleri,
  ppkSinama,
  pkaYolKarnesi,
  taylorSerisi,
  TAYLOR,
  KAPI_P,
  yuvarlaNesne,
} from '../../src/lib/tahmin/modeller.mjs';
import { arsiveEkle } from '../../src/lib/tahmin/arsiv.mjs';

const veri = (ad) => fileURLToPath(new URL(`../../src/data/${ad}`, import.meta.url));
const okuJson = async (ad, bos) => {
  try {
    return JSON.parse(await readFile(veri(ad), 'utf8'));
  } catch (e) {
    if (bos !== undefined) return bos;
    throw e;
  }
};
// Takvim günü İstanbul saatine göre (bot UTC'de çalışır).
export const istanbulGunu = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(d);
const ayStr = (t) => {
  const { yil, ay } = akdenAy(t);
  return `${yil}-${String(ay).padStart(2, '0')}`;
};

// Model sınama ayarları: başlangıç ayı ve en az eğitim gözlemi (karar notundaki dönemler).
export const AYAR = {
  tufe: { basla: ak({ yil: 2015, ay: 1 }), enAz: 60, bazlar: ['pka', 'ito', 'gecenYil'], birim: 'yuzde' },
  cari: { basla: ak({ yil: 2016, ay: 1 }), enAz: 36, bazlar: ['gecenYil', 'disTicaret'], birim: 'milyonUsd' },
  sanayi: { basla: ak({ yil: 2017, ay: 1 }), enAz: 36, bazlar: ['ar1', 'gecenAy'], birim: 'yuzde' },
};

function ekkModeli(ad, gozlemler) {
  const a = AYAR[ad];
  const s = ekkSinama(gozlemler, a);
  const k = karne(s.sonuclar, a.bazlar);
  const seri = s.sonuclar.slice(-24).map((r) => ({ ay: ayStr(r.t), tahmin: r.tahmin, a80: r.a80, a95: r.a95, gercek: r.gercek, bazlar: r.bazlar }));
  return {
    surum: SURUMLER[ad],
    birim: a.birim,
    bazlar: a.bazlar,
    gecti: k.gecti,
    karne: { ...k, tum: k.tum && { ...k.tum, ilk: ayStr(k.tum.ilk), son: ayStr(k.tum.son) }, son: k.son && { ...k.son, ilk: ayStr(k.son.ilk), son: ayStr(k.son.son) } },
    // Kapıyı geçemeyen modelin ne güncel tahmini ne geçmiş tahmin serisi sayfaya gider; yalnız karnesi.
    seri: k.gecti ? seri : [],
    simdi: k.gecti && s.simdi ? { ay: ayStr(s.simdi.t), tahmin: s.simdi.tahmin, a80: s.simdi.a80, a95: s.simdi.a95 } : null,
  };
}

export function hesapla({ resmi, ito, girdi, ppkMetin, ppkTon, takvim }, simdi = new Date()) {
  const bugun = istanbulGunu(simdi);
  const buAy = ak({ yil: Number(bugun.slice(0, 4)), ay: Number(bugun.slice(5, 7)) });
  const tufe = resmi.enflasyon.satirlar;

  const modeller = {
    tufe: ekkModeli('tufe', tufeGozlemleri({ tufe, ito: ito.satirlar, girdi: girdi.satirlar }, buAy)),
    cari: ekkModeli('cari', cariGozlemleri({ cari: resmi.cari.satirlar, disTicaret: resmi.disTicaret.satirlar }, buAy)),
    sanayi: ekkModeli(
      'sanayi',
      ar1Ekle(sanayiGozlemleri({ sanayi: resmi.sanayi.satirlar, kapasite: resmi.kapasite.satirlar, disTicaret: resmi.disTicaret.satirlar }, buAy)),
    ),
  };

  // PPK: bir sonraki toplantı takvimden; tahmin yalnız kapıdan geçerse ve toplantı günü gelmediyse verilir.
  const kararlar = ppkKararlari({ belgeler: ppkMetin.belgeler, puanlar: ppkTon.puanlar, faizGecmisi: resmi.faiz.gecmis, beklenti: resmi.beklenti.satirlar });
  const gozlem = ppkGozlemleri(kararlar);
  const sonKarar = kararlar.at(-1);
  const toplanti = (takvim?.olaylar ?? [])
    .filter((o) => o.baslik === 'PPK toplantı kararı' && o.tarih > sonKarar.tarih && o.tarih >= bugun)
    .map((o) => o.tarih)
    .sort()[0];
  let sonraki = null;
  if (toplanti && sonKarar.ton != null) {
    const tt = ak({ yil: Number(toplanti.slice(0, 4)), ay: Number(toplanti.slice(5, 7)) });
    const pka = resmi.beklenti.satirlar.filter((s) => ak(s) <= tt - 1).at(-1);
    const oran = resmi.faiz.gecmis.at(-1).oran;
    if (pka) sonraki = { tarih: toplanti, x: [sonKarar.ton, sonKarar.yon - 1, oran - pka.ay12], son: sonKarar.yon, girdiler: { ton: sonKarar.ton, sonYon: sonKarar.yon, faiz: oran, pka12: pka.ay12, pkaAy: `${pka.yil}-${String(pka.ay).padStart(2, '0')}` } };
  }
  const ppk = ppkSinama(gozlem, sonraki);
  modeller.ppk = {
    surum: SURUMLER.ppk,
    gecti: ppk.karne.gecti,
    karne: ppk.karne,
    gozlem: gozlem.length,
    ilk: gozlem[0]?.tarih ?? null,
    sonrakiToplanti: toplanti ?? null,
    simdi: ppk.karne.gecti && ppk.simdi ? { tarih: ppk.simdi.tarih, olasilik: ppk.simdi.model, girdiler: ppk.simdi.girdiler } : null,
  };

  // Yıllık enflasyon yolu: son 11 ayın aylık değişimi ve PKA'nın aylık beklentileri (hesap makinesinin açılış değerleri).
  const yk = pkaYolKarnesi({ tufe, girdi: girdi.satirlar });
  const sonTufe = tufe.at(-1);
  const pkaSon = girdi.satirlar.filter((s) => s.pkaCari != null && s.pka12 != null).at(-1);
  const yol = {
    surum: SURUMLER.yol,
    sonAy: ayStr(ak(sonTufe)),
    sonYillik: sonTufe.yillik,
    aylikGecmis: tufe.slice(-12).map((s) => ({ ay: ayStr(ak(s)), aylik: s.aylik })),
    pka: pkaSon && { ay: ayStr(ak(pkaSon)), cari: pkaSon.pkaCari, bir: pkaSon.pka1, iki: pkaSon.pka2, ay12: pkaSon.pka12 },
    pkaKarne: {
      hataSayisi: yk.hataSayisi,
      ortalamaHata: yk.ortalamaHata,
      rmse: yk.rmse,
      kapsama80: yk.kapsama80,
      kapsama95: yk.kapsama95,
      olcuSayisi: yk.olcuSayisi,
      ilk: yk.sonuclar[0] && ayStr(yk.sonuclar[0].t),
    },
    pkaAralik: yk.sonuclar.at(-1) && { ay: ayStr(yk.sonuclar.at(-1).t), beklenti: yk.sonuclar.at(-1).beklenti, a80: yk.sonuclar.at(-1).a80, a95: yk.sonuclar.at(-1).a95 },
    // Grafik: t ayındaki 12 ay sonrası beklentisi, gerçekleştiği ayın (t+12) karşısına yazılır.
    seri: girdi.satirlar
      .filter((s) => s.pka12 != null)
      .map((s) => ({ ay: ayStr(ak(s) + 12), beklenti: s.pka12, gercek: tufe.find((u) => ak(u) === ak(s) + 12)?.yillik ?? null })),
  };

  const ts = taylorSerisi({ tufe, beklenti: resmi.beklenti.satirlar, faizGecmisi: resmi.faiz.gecmis });
  const taylor = {
    surum: SURUMLER.taylor,
    varsayimlar: { rYildiz: TAYLOR.rYildiz, a: TAYLOR.a, hedef: TAYLOR.hedef, baslangic: ayStr(TAYLOR.baslangic) },
    seri: ts.map((s) => ({ ay: ayStr(s.t), alt: s.alt, ust: s.ust, faiz: s.faiz })),
    son: ts.at(-1) && { ay: ayStr(ts.at(-1).t), alt: ts.at(-1).alt, ust: ts.at(-1).ust, faiz: ts.at(-1).faiz, varyantlar: ts.at(-1).varyantlar },
  };

  return yuvarlaNesne({ kapiP: KAPI_P, modeller, yol, taylor }, 4);
}

// Yayımlanan tahminlerin arşiv kayıtları (yalnız kapıdan geçenler).
export function arsivKayitlari(sonuc, bugun) {
  const out = [];
  for (const ad of ['tufe', 'cari', 'sanayi']) {
    const m = sonuc.modeller[ad];
    if (m.gecti && m.simdi) out.push({ model: ad, surum: m.surum, hedef: m.simdi.ay, yapildi: bugun, tahmin: m.simdi.tahmin, a80: m.simdi.a80, a95: m.simdi.a95, birim: m.birim });
  }
  const p = sonuc.modeller.ppk;
  if (p.gecti && p.simdi) out.push({ model: 'ppk', surum: p.surum, hedef: p.simdi.tarih, yapildi: bugun, olasilik: p.simdi.olasilik });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const simdi = new Date();
  const girdiler = {
    resmi: await okuJson('resmi.json'),
    ito: await okuJson('ito-enflasyon.json'),
    girdi: await okuJson('tahmin-girdi.json'),
    ppkMetin: await okuJson('ppk-metinler.json'),
    ppkTon: await okuJson('ppk-ton.json'),
    takvim: await okuJson('veri-takvimi.json', null),
  };
  const sonuc = hesapla(girdiler, simdi);
  const eski = await okuJson('tahmin.json', null);
  const { guncelleme: _g, ...eskiVeri } = eski ?? {};
  const degisti = JSON.stringify(eskiVeri) !== JSON.stringify(sonuc);
  const arsiv = await okuJson('tahmin-arsivi.json', { aciklama: '', kayitlar: [] });
  const yeniArsiv = arsiveEkle(arsiv, arsivKayitlari(sonuc, istanbulGunu(simdi)));
  const ozet = Object.entries(sonuc.modeller)
    .map(([ad, m]) => `${ad}:${m.gecti ? 'geçti' : 'geçmedi'}`)
    .join(' ');
  if (process.argv.includes('--yaz')) {
    if (degisti) await writeFile(veri('tahmin.json'), JSON.stringify({ guncelleme: simdi.toISOString(), ...sonuc }, null, 2) + '\n');
    if (yeniArsiv !== arsiv) await writeFile(veri('tahmin-arsivi.json'), JSON.stringify(yeniArsiv, null, 2) + '\n');
    console.log(`[tahmin] ${ozet}${degisti ? '' : ' (değişmedi)'}; arşiv ${yeniArsiv.kayitlar.length} kayıt`);
  } else {
    console.log(JSON.stringify(sonuc, null, 2));
  }
}
