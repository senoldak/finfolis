// Açık kamu verilerinden ve yurtdışı haber beslemelerinden haber ve piyasa bülteni üretir; src/content/haberler ve src/data/piyasa.json'a yazar.
// Kullanım: node scripts/haberler/hent-haberler.mjs [--kuru]   (--kuru: hiçbir şey yazmadan adayları listeler)
// Ortam: GEMINI_API_KEY, MAKS_HABER (çalıştırma başına haber sınırı, varsayılan 8)
import path from 'node:path';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { guncelle } from './piyasa-verisi.mjs';
import merkezBankalari from './kaynaklar/merkez-bankalari.mjs';
import sec from './kaynaklar/sec.mjs';
import kurHareketi from './kaynaklar/kur-hareketi.mjs';
import esikOlaylari from './kaynaklar/esik-olaylari.mjs';
import { rssHaberKaynagi } from './kaynaklar/rss-haber.mjs';
import { BESLEMELER, DERLEYICILER } from './kaynaklar/beslemeler.mjs';
import { derleyiciKaynagi } from './kaynaklar/derleyici.mjs';
import * as ipucuModulu from './ipucu.mjs';
import * as olaylarModulu from './olaylar.mjs';
import { yaz as yazarYaz, derlemeYaz as derlemeYazar } from './yazar.mjs';
import { dilimGruplari, derlemeAdayi, derlemeOlayi, DERLEME_MAKS } from './derleme.mjs';
import { yayinKurulu as kurul } from './yayin-kurulu.mjs';
import * as bultenModulu from './bulten.mjs';
import { karneler as varsayilanKarneler } from './karne.mjs';
import { BOLGELER, dilimDolu, dilimKaydet } from './bulten.mjs';
import { tekrarlariAyikla, hafizayaEkle, hafizaTohumla } from './tekrar.mjs';
import { havuzAc, havuzKapat, havuzaHazirla, havuzAyir, derlemeDenendi } from './havuz.mjs';
import { yaziYaz, gemini as varsayilanGemini } from './lib.mjs';
import { icerikTuru } from './icerik-turu.mjs';
import { kaynakKapagi, rakamKapagi, haberKapagi } from '../kapak/kapak.mjs';
import { gorunur } from '../../src/lib/gorunur.mjs';
import { anahtarVar, coz, kaynakIzi, sifrele } from './gizli.mjs';
import { butceYukle, geminiPayiBitti } from './butce.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const DURUM_DOSYASI = path.join(HER, 'gorulen.json');
const FORSTE_GANG = 2; // bir kaynak ilk çalıştığında yalnızca en yeni 2 aday
const KAYNAK_LIMIT = 15; // sonraki çalıştırmalarda kaynak başına en fazla aday
const MAKS_DENEME = 3;
export const MAKS_HABER = 8; // çalıştırma başına; kalan olaylar sonraki çalıştırmaya kalır
export const KAYNAK_BUTCE_MS = 8 * 60_000; // bu süreden sonra yeni kaynak başlatılmaz
export const BUTCE_MS = 18 * 60_000; // workflow zaman aşımı 25 dk
// Kaynağı kapak tarifi vermeyen kısa haber (genel RSS) için kapak:
// Başlık odaklı haberKapagi kullanılır. 8 karakterden kısa bir rakam varsa sağdaki veri kutusunda gösterilir.
export function varsayilanKapak(yazi, o) {
  const k0 = o.kaynaklar?.[0];
  let kaynak;
  try {
    kaynak = k0 ? `${k0.ad} · ${new URL(k0.url).hostname.replace(/^www\./, '')}` : undefined;
  } catch {
    kaynak = k0?.ad;
  }
  const bolge = BOLGELER.find(([k]) => k === o.bolge)?.[1] ?? 'Küresel';
  const r = yazi.rakamlar?.[0];
  const rakam = r && String(r.deger).replace(/^yüzde\s+/i, '%').trim();
  const kisaRakam = rakam && rakam.length <= 8;
  if (kisaRakam) {
    return {
      kapak: haberKapagi({
        kategori: o.kategori,
        bolge,
        baslik: yazi.baslik,
        spot: yazi.spot,
        rakam: { etiket: r.etiket, deger: rakam },
        kaynak,
      }),
      kapakAlt: `${r.etiket} ${rakam}`,
      kapakSitede: false, // başlık ve spotu tekrar eder; sitede başlığın hemen altında gereksiz
    };
  }
  return {
    kapak: haberKapagi({
      kategori: o.kategori,
      bolge,
      baslik: yazi.baslik,
      spot: yazi.spot,
      kaynak,
    }),
    kapakAlt: `${bolge} · ${yazi.baslik}`,
    kapakSitede: false,
  };
}

// Önem eşiği olay gruplamadaki haber değeri puanıyla birlikte (bkz. olaylar.mjs). Resmî kaynak (merkez bankaları, SEC)
// de genel RSS de 70'le yazılır (0–100 ölçeği; 2026-10-17 site sahibinin kararıyla 3/5 → 3,5/5 = 70/100); kısa kalan dilim derlemesine girer (bkz.
// havuz.mjs), altı yalnız bültende satır olur. Ücretli tek kaynak terfi etmez.
export const TERFI_ESIGI = 70;
export const RSS_TERFI_ESIGI = 70;
export const terfiMi = (o) =>
  o.onem >= ((o.adaylar ?? []).some(olaylarModulu.resmiMi) ? TERFI_ESIGI : RSS_TERFI_ESIGI) && o.icerikli && !o.ucretliTek;
const ARALIKLAR = [[90, 100, '90+'], [70, 89, '70-89'], [50, 69, '50-69'], [30, 49, '30-49'], [0, 29, '0-29']];
// Log satırı: gruplamadan çıkan yeni olayların önem dağılımı ve terfi etmeme nedenleri (darboğaz görünsün diye).
export function terfiOzeti(olaylar) {
  const say = (f) => olaylar.filter(f).length;
  const dagilim = ARALIKLAR.map(([alt, ust, ad]) => `${ad}:${say((o) => (o.onem ?? 0) >= alt && (o.onem ?? 0) <= ust)}`).join(' ');
  const terfi = say(terfiMi);
  const ucretli = say((o) => o.ucretliTek);
  const iceriksiz = say((o) => !o.ucretliTek && !o.icerikli);
  return `olaylar: ${olaylar.length} yeni (önem ${dagilim}); terfi ${terfi}, eşik altı ${olaylar.length - terfi - ucretli - iceriksiz}, içeriksiz ${iceriksiz}, ücretli ${ucretli}`;
}
// Kalıcı olarak görüldü sayılır (başarısız deneme bekleyenler hariç).
const goruldu = (durum, id) => Boolean(durum.gorulen[id]) && !durum.gorulen[id].deneme;
// Başarısız deneme sayar; MAKS_DENEME'ye ulaşınca görüldü işaretler.
function basarisiz(durum, a, iso, hatalar, neden, log) {
  const n = (durum.gorulen[a.id]?.deneme ?? 0) + 1;
  if (n >= MAKS_DENEME) {
    durum.gorulen[a.id] = { zaman: iso };
    log(`  - ${a.id}: ${n} denemede başarısız, görüldü sayıldı`);
  } else durum.gorulen[a.id] = { zaman: iso, deneme: n };
  hatalar.push(`${a.id}: ${neden}`);
}

// Olay hafızasındaki özetler kaynak başlıklarını içerir; durum dosyasında kayıt başına şifreli tutulur.
// Açılan kayıt şifreli metnini de taşır: değişmeyen kayıt yeniden şifrelenmez, dosya farkı küçük kalır.
export function hafizaAc(olaylar = []) {
  return olaylar.map((h) => {
    if (h.ozetSifreli === undefined) return h;
    let ozet = '';
    try {
      ozet = anahtarVar() ? String(coz(h.ozetSifreli)) : '';
    } catch {
      // çözülemeyen kayıt boş özetle kalır; mükerrer denetimi yalnızca kimliği kullanır
    }
    return { ...h, ozet };
  });
}
export function hafizaKapat(olaylar = []) {
  if (!anahtarVar()) return olaylar;
  return olaylar.map(({ ozet, ozetSifreli, ...h }) => ({ ...h, ozetSifreli: ozetSifreli ?? sifrele(ozet ?? '') }));
}
// Tekrar hafızasındaki (tekrar.mjs) kaynak başlık ve özetleri de şifreli saklanır. Anahtar yoksa düz metin
// yazılmaz: kaynak metinleri atılır, kayıt yalnızca slug, kendi başlığımız ve zamanla kalır.
export function yayinAc(yayinlar = []) {
  return yayinlar.map(({ kaynaklarSifreli, ...h }) => {
    if (kaynaklarSifreli === undefined) return h;
    try {
      return { ...h, kaynaklar: anahtarVar() ? coz(kaynaklarSifreli) : [], kaynaklarSifreli };
    } catch {
      return { ...h, kaynaklar: [] };
    }
  });
}
export function yayinKapat(yayinlar = []) {
  return yayinlar.map(({ kaynaklar, kaynaklarSifreli, ...h }) =>
    anahtarVar() ? { ...h, kaynaklarSifreli: kaynaklarSifreli ?? sifrele(kaynaklar ?? []) } : h,
  );
}

export async function jsonOku(dosya, varsayilan) {
  try {
    return JSON.parse(await readFile(dosya, 'utf8'));
  } catch (e) {
    // Yalnızca dosya yoksa varsayılan; bozuk dosya çalıştırmayı durdurur.
    if (e.code === 'ENOENT') return varsayilan;
    throw new Error(`${dosya} okunamadı: ${e.message}`);
  }
}

export async function calistir({
  kaynaklar = [merkezBankalari, sec, kurHareketi, esikOlaylari, ...BESLEMELER.map(rssHaberKaynagi), ...DERLEYICILER.map(derleyiciKaynagi)],
  ipucu = ipucuModulu,
  olaylar = olaylarModulu,
  gemini = varsayilanGemini,
  yaz = yazarYaz,
  derlemeYaz = derlemeYazar,
  yayinKurulu = kurul,
  bulten = bultenModulu,
  karneler = varsayilanKarneler,
  piyasa = guncelle,
  rot = ROT,
  simdi = new Date(),
  saat = () => Date.now(),
  durum,
  kuru = false,
  maksHaber = Number.isInteger(Number(process.env.MAKS_HABER)) && Number(process.env.MAKS_HABER) > 0 ? Number(process.env.MAKS_HABER) : MAKS_HABER,
  geminiVar = Boolean(process.env.GEMINI_API_KEY),
  log = console.log,
} = {}) {
  const baslangic = saat();
  const zamanBitti = () => saat() - baslangic > BUTCE_MS;
  // Katman 3: haber ve derleme süre ya da Gemini tur payı bitince durur; bülten ve karneler yalnız süreye bakar.
  const butceBitti = () => zamanBitti() || geminiPayiBitti();
  durum ??= await jsonOku(DURUM_DOSYASI, {});
  durum.gorulen ??= {};
  durum.sonBulten ??= null;
  durum.kaynaklar ??= {};
  durum.olaylar = hafizaAc(durum.olaylar ?? []);
  // Tekrar hafızası boşsa son 72 saatin yayımlanmış haberlerinden tohumlanır (tekrar.mjs).
  durum.yayinlar = yayinAc(durum.yayinlar ?? []);
  if (!durum.yayinlar.length) durum.yayinlar = await hafizaTohumla(rot, simdi);
  const iso = simdi.toISOString();
  const piyasaDosyasi = path.join(rot, 'src/data/piyasa.json');

  // 1. Piyasa verisi
  const eskiPiyasa = await jsonOku(piyasaDosyasi, undefined);
  let veri = eskiPiyasa ?? { guncelleme: iso, gostergeler: [] };
  try {
    veri = await piyasa(eskiPiyasa, simdi);
    if (!kuru) await writeFile(piyasaDosyasi, JSON.stringify(veri, null, 2) + '\n');
  } catch (e) {
    console.error(`[piyasa] güncellenemedi: ${e.message}`);
  }
  // Yalnızca görünür göstergeler: bayat değer bültene girmez.
  const gorunurPiyasa = { ...veri, gostergeler: (veri.gostergeler ?? []).filter((g) => gorunur(g, simdi)) };

  // 2. Adaylar
  const hatalar = [];
  let adaylar = [];
  for (const k of kaynaklar) {
    if (saat() - baslangic > KAYNAK_BUTCE_MS) {
      log('  ! kaynak bütçesi aşıldı; kalan kaynaklar sonraki çalıştırmaya kaldı');
      break;
    }
    try {
      const ilk = !durum.kaynaklar[k.ad];
      const ham = await k.hent({
        piyasa: gorunurPiyasa,
        simdi,
        goruldu: (id) => goruldu(durum, id),
        gorulen: durum.gorulen, // salt okunur; esik-olaylari günlük tavanı için
        limit: ilk ? FORSTE_GANG : KAYNAK_LIMIT,
        // İlk çalıştırmada sınır dışında kalan eski kayıtlar görüldü sayılır.
        kesilen: (id) => {
          if (ilk && !kuru) durum.gorulen[id] = { zaman: iso };
        },
        // Kaynağın kendisinin elediği kayıt (derleyici: okunamayan, ücretli, tarihsiz sayfa): yeniden istenmez.
        ele: (id) => {
          if (!kuru) durum.gorulen[id] = { zaman: iso, elendi: true };
        },
      });
      let liste = ham.filter((a) => !goruldu(durum, a.id) && !adaylar.some((x) => x.id === a.id));
      liste.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
      if (!durum.kaynaklar[k.ad]) {
        if (!kuru) for (const a of liste.slice(FORSTE_GANG)) durum.gorulen[a.id] = { zaman: iso };
        liste = liste.slice(0, FORSTE_GANG);
        if (!kuru) durum.kaynaklar[k.ad] = iso;
      }
      log(`${k.ad}: ${liste.length} yeni`);
      adaylar.push(...liste.map((a) => ({ ...a, _kaynak: k.ad })));
    } catch (e) {
      hatalar.push(`${k.ad}: ${e.message}`);
      console.error(`${k.ad}: HATA ${e.message}`);
    }
  }

  // 3. Önem artırma
  try {
    adaylar = ipucu.onemArtir(adaylar, await ipucu.hent(), simdi);
  } catch (e) {
    console.error(`[ipucu] ${e.message}`);
  }
  adaylar.sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0));

  const sonuc = { adet: 0, adaylar, hatalar, bultenYazildi: false, bultenGerekli: false, yazilar: [], konfigHatasi: false };

  if (kuru) {
    // Kuru çalıştırma: gruplama da yapılmaz (Gemini çağrısı yok), yalnızca adaylar listelenir.
    for (const a of adaylar) log(`  [kuru] onem=${a.onem ?? 0} ${a._kaynak} | ${a.id} | ${a.baslik}`);
    sonuc.bultenGerekli = bulten.bultenGerekli(adaylar.length);
    log(`Toplam ${adaylar.length} aday. Bülten gerekli mi (aday sayısına göre): ${sonuc.bultenGerekli ? 'evet' : 'hayır'}`);
    return sonuc;
  }

  // 4. Olay gruplama; hafızadaki olayla eşleşen adaylar yazılmadan görüldü sayılır.
  const temiz = adaylar.map(({ _kaynak, ...a }) => a);
  const { yeni, bilinen, grupHatasi } = await olaylar.olaylariGrupla(temiz, durum.olaylar, { gemini });
  if (grupHatasi) {
    // Gruplama yoksa mükerrer yayın riski: terfi ve bülten atlanır, adaylar görülmedi kalır.
    hatalar.push('olay gruplama başarısız; terfi ve bülten sonraki çalıştırmaya kaldı');
    console.error('  ! olay gruplama başarısız; terfi ve bülten atlandı');
    sonuc.durum = durum;
    return sonuc;
  }
  for (const a of bilinen) durum.gorulen[a.id] = { zaman: iso };
  // Son 72 saatte yayımlanan bir haberle aynı olay (tekrar.mjs): yazılmaz, bültene girmez, görüldü sayılır.
  for (const t of tekrarlariAyikla(yeni, durum.yayinlar ?? [], simdi)) {
    for (const a of t.olay.adaylar) durum.gorulen[a.id] = { zaman: iso };
    log(`  - ${t.olay.id}: tekrar (${t.neden}), ${t.slug} ile aynı olay`);
  }
  yeni.sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0));
  log(terfiOzeti(yeni));

  // 5. Terfi eden olayları yaz, denetle, kaydet
  const yazilan = [];
  const dislanan = new Set(); // durdurulan, başarısız ya da yazılamayan (bütçe/konfig/tavan) terfi olayları
  const kisaOlaylar = []; // yayın kurulunda kısa kalanlar: havuza girer, tema derlemesine aday (bkz. havuz.mjs)
  if (!geminiVar) console.error('UYARI: GEMINI_API_KEY yok; haber yazılmayacak, yalnızca piyasa verisi ve gösterge bülteni.');
  const terfi = geminiVar ? yeni.filter(terfiMi) : [];
  let dur = false;
  for (const o of terfi) {
    if (!dur && butceBitti()) {
      log(`  ! çalıştırma bütçesi aşıldı (${zamanBitti() ? 'süre' : 'Gemini tur payı'}); kalan olaylar sonraki çalıştırmaya kaldı`);
      dur = true;
    }
    if (dur || yazilan.length >= maksHaber) {
      dislanan.add(o); // görüldü sayılmaz, sonraki çalıştırmada yeniden gelir
      continue;
    }
    // Gruplamanın kaçırdığı kopya (aynı ülke + gösterge + dönem): yazılmaz, görüldü sayılır, bültene de girmez.
    const kopya = olaylarModulu.mukerrerBul(o, { yazilan, hafiza: durum.olaylar, simdi });
    if (kopya) {
      for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso };
      dislanan.add(o);
      log(`  - ${o.id}: mükerrer, ${kopya.id} ile aynı olay`);
      continue;
    }
    try {
      const taslak = await yaz(o, {});
      if (!taslak) {
        for (const a of o.adaylar) basarisiz(durum, a, iso, hatalar, 'yazar çıktı vermedi', log);
        dislanan.add(o);
        continue;
      }
      const r = await yayinKurulu(taslak, o, {});
      if (r.dur) {
        for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso };
        // Yalnızca kısa kaldığı için duran olay bu turun bültenine girmez: havuzda eş bekler (derleme). Kısa haber
        // tek başına yayımlanmaz; eş bulamazsa bülten satırı olur (havuz.mjs).
        dislanan.add(o);
        if (r.kisa) kisaOlaylar.push(o);
        else hatalar.push(`${o.id} «${o.baslik}»: yayınlanmadı, ${r.dur}`);
        log(`  - ${o.id}: durduruldu (${r.dur})`);
        continue;
      }
      const yazi = { ...r.yazi, kategori: o.kategori, tarih: new Date(o.tarih), tur: 'haber', icerikTuru: icerikTuru(o.adaylar), kaynaklar: o.kaynaklar ?? [], kaynakIzi: kaynakIzi(o.gizliKaynaklar) };
      const kapakli = o.adaylar.find((a) => a.kapak);
      Object.assign(yazi, kapakli ? { kapak: kapakli.kapak, kapakAlt: kapakli.kapakAlt } : varsayilanKapak(yazi, o));
      const slug = await yaziYaz(rot, yazi);
      for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso, yazildi: true };
      o.haberSlug = slug;
      yazilan.push(o);
      sonuc.adet++;
      sonuc.yazilar.push(slug);
      log(`  + ${slug}`);
    } catch (e) {
      dislanan.add(o);
      if (e.konfig) {
        // Anahtar/model hatası haberin suçu değil: deneme sayılmaz, çalıştırma durur.
        hatalar.push(`Gemini yapılandırma hatası: ${e.message}`);
        console.error(`  ! yapılandırma hatası: ${e.message}`);
        sonuc.konfigHatasi = true;
        dur = true;
        continue;
      }
      // Görüldü sayılmaz: sonraki çalıştırmada yeniden denenir.
      for (const a of o.adaylar) basarisiz(durum, a, iso, hatalar, e.message, log);
      console.error(`  ! ${o.id}: ${e.message}`);
    }
  }

  // 5b. Kısa haber havuzu ve tema derlemesi: bu turun kısa olayları önceki turlardan bekleyenlerle birleşir;
  // aynı kategoriden birkaçı tek yazı olur. Derleme yazılamazsa ya da yayın kurulundan geçemezse olaylar bülten
  // satırına aday olur. Eş bulamayan olay havuzda kalır; süresi dolunca bülten satırına adaydır (havuz.mjs).
  const havuz = [...havuzAc(durum.havuz ?? []), ...kisaOlaylar.map((o) => havuzaHazirla(o, iso))];
  // Bekleyen olay bu arada (bu turda ya da önceki turlarda) tam haber olarak yazıldıysa havuzdan düşer.
  for (const t of tekrarlariAyikla(havuz, hafizayaEkle(durum.yayinlar ?? [], yazilan, simdi), simdi)) {
    log(`  - havuz ${t.olay.id}: tekrar (${t.neden}), ${t.slug} ile aynı olay`);
  }
  const { bekleyen, olgun, suresiDolan, dusen } = havuzAyir(havuz, simdi);
  for (const o of dusen) log(`  - havuz ${o.id}: bekleme süresi doldu, düştü`);
  // Dilimi bitmiş kısa haberler derlemeye girer; tek kalanlar ve fazlası bülten satırı olur.
  const { gruplar, artan } = dilimGruplari(olgun);
  const bultenYedek = [...suresiDolan, ...artan]; // bu turun bülteni yazılırsa satır olur, yazılmazsa havuzda bekler
  const derlenmeyen = [...bekleyen];
  for (const [i, grup] of gruplar.entries()) {
    if (i >= DERLEME_MAKS || dur || butceBitti()) {
      derlenmeyen.push(...grup); // sonraki tura kalır
      continue;
    }
    const yedekle = () => {
      for (const o of grup) derlemeDenendi(o);
      bultenYedek.push(...grup);
    };
    const birlesik = derlemeAdayi(grup);
    try {
      const taslak = await derlemeYaz(birlesik, {});
      if (!taslak) {
        log(`  - derleme (${grup.length} haber): yazar çıktı vermedi`);
        yedekle();
        continue;
      }
      const r = await yayinKurulu(taslak, birlesik, {});
      if (r.dur) {
        log(`  - derleme (${grup.length} haber): durduruldu (${r.dur})`);
        yedekle();
        continue;
      }
      // Başlığa dilim eki: her dilimin derlemesi tek başlık taşır.
      const yazi = { ...r.yazi, baslik: `${r.yazi.baslik} · ${birlesik.dilimEki}`, kategori: birlesik.kategori, tarih: new Date(birlesik.tarih), tur: 'haber', kaynaklar: birlesik.kaynaklar, kaynakIzi: kaynakIzi(birlesik.gizliKaynaklar) };
      Object.assign(yazi, varsayilanKapak(yazi, birlesik));
      const slug = await yaziYaz(rot, yazi);
      const o = derlemeOlayi(grup, birlesik, yazi.baslik, slug);
      for (const k of grup) {
        dislanan.add(k); // bültende ikinci kez yer almasın
        for (const a of k.adaylar ?? []) durum.gorulen[a.id] = { zaman: iso, yazildi: true };
      }
      yazilan.push(o);
      sonuc.adet++;
      sonuc.yazilar.push(slug);
      log(`  + derleme ${slug} (${grup.length} haber)`);
    } catch (e) {
      if (e.konfig) {
        hatalar.push(`Gemini yapılandırma hatası: ${e.message}`);
        sonuc.konfigHatasi = true;
        dur = true;
        derlenmeyen.push(...grup); // olayların suçu değil: havuzda beklemeye devam eder
        continue;
      }
      // Geçici hata (Gemini meşgul, ağ): olayların suçu değil, derleme denenmiş sayılmaz; havuzda bekler ve
      // sonraki turda yeniden denenir.
      log(`  ! derleme: ${e.message}`);
      derlenmeyen.push(...grup);
    }
  }
  if (derlenmeyen.length) log(`  ~ havuz: ${derlenmeyen.length} kısa haber eş bekliyor`);

  // 6. Bülten: yazılan haberler (bizim linkimizle) + terfi etmeyen olaylar.
  // Bülten yazılmazsa terfi etmeyen olayların adayları görülmedi kalır ve sonraki çalıştırmada birikir.
  const bultenOlaylari = [...yeni.filter((o) => !dislanan.has(o)), ...bultenYedek];
  // Günde en fazla üç bülten: bu dilimin (açılış/öğle/kapanış) bülteni yazıldıysa olaylar sonraki dilime kalır.
  sonuc.bultenGerekli = bulten.bultenGerekli(bultenOlaylari.length) && !dilimDolu(durum, simdi);
  let bultendekiler = [];
  if (sonuc.bultenGerekli && zamanBitti()) {
    log('  ! çalıştırma bütçesi aşıldı; bülten sonraki çalıştırmaya kaldı');
  } else if (sonuc.bultenGerekli) {
    try {
      const b = await bulten.bultenYaz(bultenOlaylari, gorunurPiyasa, { simdi, butceBitti });
      if (b) {
        const slug = await yaziYaz(rot, b.yazi);
        durum.sonBulten = b.anlik;
        dilimKaydet(durum, simdi);
        sonuc.bultenYazildi = true;
        sonuc.yazilar.push(slug);
        // Tavan dışı kalanlar da görüldü sayılır ve hafızaya girer: başka kaynaktan gelen kopyaları geri dönmesin.
        bultendekiler = bultenOlaylari;
        bultenYedek.length = 0; // satır oldu, havuza dönmez
        for (const o of bultenOlaylari) for (const a of o.adaylar) if (!durum.gorulen[a.id]?.yazildi) durum.gorulen[a.id] = { zaman: iso };
        log(`  + bülten ${slug}`);
      }
    } catch (e) {
      hatalar.push(`bülten: ${e.message}`);
      console.error(`  ! bülten: ${e.message}`);
    }
  }

  // Bülten satırı olamayan süresi dolmuş olaylar SON_SAAT'e kadar havuzda kalır.
  durum.havuz = [...derlenmeyen, ...bultenYedek.filter((o) => o.havuzaGirdi)];

  // 6b. Karneler (haftalık, aylık, enflasyon): Gemini'siz, veriden şablonla; zamanı gelmediyse ağ isteği de yok.
  if (!zamanBitti()) {
    try {
      for (const yazi of await karneler({ durum, simdi, piyasa: veri, log })) {
        const slug = await yaziYaz(rot, { icerikTuru: 'veri', ...yazi });
        sonuc.adet++;
        sonuc.yazilar.push(slug);
        log(`  + karne ${slug}`);
      }
    } catch (e) {
      hatalar.push(`karne: ${e.message}`);
      console.error(`  ! karne: ${e.message}`);
    }
  }

  // 7. Olay hafızası ve temizlik: buradaki bir hata bu çalıştırmanın gorulen güncellemelerini kaybettirmez.
  try {
    durum.olaylar = olaylar.hafizaGuncelle(durum.olaylar, [...new Set([...yazilan, ...bultendekiler])], simdi);
    durum.yayinlar = hafizayaEkle(durum.yayinlar, yazilan, simdi);
  } catch (e) {
    hatalar.push(`olay hafızası: ${e.message}`);
    console.error(`  ! olay hafızası: ${e.message}`);
  }
  try {
    // 60 günden eski kayıtları temizle
    const sinir = simdi.getTime() - 60 * 864e5;
    for (const [id, g] of Object.entries(durum.gorulen)) if (Date.parse(g?.zaman) < sinir) delete durum.gorulen[id];
  } catch (e) {
    hatalar.push(`temizlik: ${e.message}`);
  }
  sonuc.durum = durum;
  return sonuc;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const kuru = process.argv.includes('--kuru');
  if (!kuru) console.log(await butceYukle({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'finfolis' }));
  const s = await calistir({ kuru });
  if (!kuru) {
    await writeFile(DURUM_DOSYASI, JSON.stringify({ ...s.durum, olaylar: hafizaKapat(s.durum.olaylar), yayinlar: yayinKapat(s.durum.yayinlar), havuz: havuzKapat(s.durum.havuz ?? []) }, null, 2) + '\n');
    const adet = s.adet + (s.bultenYazildi ? 1 : 0);
    console.log(`Bitti: ${s.adet} yeni haber${s.bultenYazildi ? ', 1 bülten' : ''}.`);
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `adet=${adet}\n`);
    if (s.konfigHatasi && process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'konfig_hatasi=1\n');
    if (process.env.GITHUB_STEP_SUMMARY && s.hatalar.length)
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Haber botu\n${s.hatalar.map((h) => `- ${h}`).join('\n')}\n`);
  }
}
