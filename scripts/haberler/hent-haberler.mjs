// Açık kamu verilerinden ve yurtdışı haber beslemelerinden haber ve piyasa bülteni üretir; src/content/haberler ve src/data/piyasa.json'a yazar.
// Kullanım: node scripts/haberler/hent-haberler.mjs [--kuru]   (--kuru: hiçbir şey yazmadan adayları listeler)
// Ortam: GEMINI_API_KEY, MAKS_HABER (çalıştırma başına haber sınırı, varsayılan 8),
//   MOTOR_TUR=1 + MOTOR_DIZIN (aday turu private mecmua deposundaki ortak motorla sürülür; bkz. motor-modu.mjs)
// Akışın aday okuma + gruplama + yazım + havuz + bülten gövdesi uyarlayici.mjs'te (motor sözleşmesine uyan uyarlayıcı);
// burada piyasa verisi, karneler ve tur girişi kalır.
import path from 'node:path';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { guncelle } from './piyasa-verisi.mjs';
import * as ipucuModulu from './ipucu.mjs';
import * as olaylarModulu from './olaylar.mjs';
import { yaz as yazarYaz, derlemeYaz as derlemeYazar } from './yazar.mjs';
import { yayinKurulu as kurul } from './yayin-kurulu.mjs';
import { standartDenetle, standartOzeti } from './standart.mjs';
import { standartKapisi, acilDurdurma } from './standart-kapi.mjs';
import { motorKaydet } from './motor.mjs';
import * as bultenModulu from './bulten.mjs';
import { karneler as varsayilanKarneler } from './karne.mjs';
import { hafizaTohumla } from './tekrar.mjs';
import { havuzKapat } from './havuz.mjs';
import { yaziYaz, gemini as varsayilanGemini } from './lib.mjs';
import { GRAFIK_ARALIK_MS } from './grafik-kapak.mjs';
import { seriOkuyucu } from './yahoo-seri.mjs';
import { gorunur } from '../../src/lib/gorunur.mjs';
import { adresiSil, anahtarVar, coz, sifrele } from './gizli.mjs';
import { butceYukle } from './butce.mjs';
import { TUR_TOKEN_TAVANI } from './token-tavani.mjs';
import { kullanim } from './kullanim.mjs';
import { BUTCE_MS, MAKS_HABER, varsayilanKaynaklar, uyarlayiciKur, yerelTur } from './uyarlayici.mjs';
import { turSec } from './motor-modu.mjs';

export { ONCELIKLI_ONEM, MAKS_HABER, KAYNAK_BUTCE_MS, BUTCE_MS, BULTEN_PAYI_MS, TERFI_ESIGI, RSS_TERFI_ESIGI, terfiMi, terfiOzeti, varsayilanKapak } from './uyarlayici.mjs';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const DURUM_DOSYASI = path.join(HER, 'gorulen.json');

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
  kaynaklar = varsayilanKaynaklar(),
  ipucu = ipucuModulu,
  olaylar = olaylarModulu,
  gemini = varsayilanGemini,
  yaz = yazarYaz,
  derlemeYaz = derlemeYazar,
  yayinKurulu = kurul,
  standart = standartDenetle, // Standartlar Faz 0: kırmızı süzgeç (testlerde değiştirilebilir)
  motor = (kayit) => motorKaydet({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, kayit }), // karar defteri (testlerde değiştirilebilir)
  bulten = bultenModulu,
  karneler = varsayilanKarneler,
  // Ara kayıt (F4): her yazılan haberden sonra durum dosyası yazılır; süreç sonradan çökerse yazılan haberler görüldü
  // kalır ve aynı adaylar için Gemini yeniden harcanmaz. Testlerde boş.
  araKayit = async () => {},
  // Bir çalıştırmalık piyasa serisi okuyucusu: eşik olayları, kur grafikleri, haber kapakları ve karneler aynı sembolü
  // bir kez indirir. null verilirse haber kapaklarına grafik çizilmez (testler ağsız çalışır).
  okuyucu,
  piyasa = guncelle,
  rot = ROT,
  simdi = new Date(),
  saat = () => Date.now(),
  durum,
  kuru = false,
  maksHaber = Number.isInteger(Number(process.env.MAKS_HABER)) && Number(process.env.MAKS_HABER) > 0 ? Number(process.env.MAKS_HABER) : MAKS_HABER,
  geminiVar = Boolean(process.env.GEMINI_API_KEY),
  tokenTavani = TUR_TOKEN_TAVANI,
  harcananToken = () => kullanim.giris,
  env = process.env,
  tur = turSec, // aday turunu sürer: MOTOR_TUR=1 ise ortak motor, yoksa yerelTur (testlerde değiştirilebilir)
  log = console.log,
} = {}) {
  const baslangic = saat();
  const motorModu = env.MOTOR_TUR === '1';
  const zamanBitti = () => saat() - baslangic > BUTCE_MS;
  if (okuyucu === undefined) okuyucu = seriOkuyucu(simdi);
  durum ??= await jsonOku(DURUM_DOSYASI, {});
  // Motor defteri yardımcıdır: kuru çalışmada yazılmaz, hata turu durdurmaz.
  const motoraYaz = async (kayit) => {
    if (kuru) return;
    try {
      await motor(kayit);
    } catch (e) {
      log(`  motor kaydı yazılamadı: ${String(e?.message ?? e).slice(0, 100)}`);
    }
  };
  durum.gorulen ??= {};
  durum.sonBulten ??= null;
  durum.kaynaklar ??= {};
  durum.olayOnbellek ??= {}; // gruplama + puan önbelleği (olaylar.mjs)
  durum.grafikKapak ??= {}; // araç → son grafik kapak zamanı (grafik-kapak.mjs, 24 saat kuralı)
  for (const [k, z] of Object.entries(durum.grafikKapak)) if (simdi - new Date(z) > 2 * GRAFIK_ARALIK_MS) delete durum.grafikKapak[k];
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
  // 2-6. Adaylar, olay gruplama, yazım, havuz/derleme ve bülten: uyarlayici.mjs (motor yokken yerelTur eskisi gibi sürer).
  const uyarlayici = uyarlayiciKur({
    durum,
    simdi,
    ayar: { kuru, maksHaber, geminiVar, tokenTavani, harcananToken, baslangic, piyasa: gorunurPiyasa, motorModu, log },
    bag: { kaynaklar, ipucu, olaylar, gemini, yaz, derlemeYaz, yayinKurulu, standart, motorYaz: motoraYaz, bulten, okuyucu, rot, saat, araKayit },
  });

  if (kuru) {
    // Kuru çalıştırma: gruplama da yapılmaz (Gemini çağrısı yok), yalnızca adaylar listelenir.
    await uyarlayici.adaylar({ log });
    const adaylar = uyarlayici.ham();
    const sonuc = { adet: 0, adaylar, hatalar: uyarlayici.ozet.hatalar, bultenYazildi: false, bultenGerekli: false, yazilar: [], konfigHatasi: false };
    for (const a of adaylar) log(`  [kuru] onem=${a.onem ?? 0} ${a._kaynak} | ${a.id} | ${a.baslik}`);
    sonuc.bultenGerekli = bulten.bultenGerekli(adaylar.length);
    log(`Toplam ${adaylar.length} aday. Bülten gerekli mi (aday sayısına göre): ${sonuc.bultenGerekli ? 'evet' : 'hayır'}`);
    return sonuc;
  }

  // Motor modunda tur hata fırlatırsa (yapılandırma, defter, motor yüklenemedi) yine de durum, yazılan haberler ve sayaç yazılır;
  // hata sonuçta taşınır ve çıkış kodu 1 olur. Yerel modda eski davranış: beklenmeyen hata olduğu gibi fırlar.
  // surVar yalnız süre bütçesini taşır: Gemini tur payı haber ve derleme için uyarlayıcının içinde (isBitti) uygulanır; payı bitince
  // bülten, karne ve Gemini'siz şablon haberler sürmeli (surVar'a katılırsa bunlar da durur).
  let motorHatasi = null;
  try {
    await tur({ env, uyarlayici, durum, simdi, rot, yerel: (u, d) => yerelTur(u, d, { log }), surVar: () => !zamanBitti(), log });
  } catch (e) {
    if (!motorModu) throw e;
    motorHatasi = e;
    console.error(`  ! motor turu hatayla bitti: ${adresiSil(e?.message ?? e)}`);
  }
  const o = uyarlayici.ozet;
  const sonuc = { adet: o.adet, adaylar: uyarlayici.ham(), hatalar: o.hatalar, bultenYazildi: o.bultenYazildi, bultenGerekli: o.bultenGerekli, yazilar: o.yazilar, konfigHatasi: o.konfigHatasi, motorHatasi };
  const hatalar = sonuc.hatalar;
  if (motorHatasi) hatalar.push(`motor turu: ${adresiSil(motorHatasi.message ?? motorHatasi)}`);
  if (o.gruplamaHatasi) {
    // Gruplama yoksa mükerrer yayın riski: terfi ve bülten atlanır, adaylar görülmedi kalır.
    sonuc.durum = durum;
    return sonuc;
  }

  // 6b. Karneler (haftalık, aylık, enflasyon): Gemini'siz, veriden şablonla; zamanı gelmediyse ağ isteği de yok.
  if (!zamanBitti()) {
    try {
      for (const yazi of await karneler({ durum, simdi, piyasa: veri, log, ...(okuyucu ? { okuyucu } : {}) })) {
        // Standartlar: karne de yayımlanmadan önce süzgeçten geçer; kırmızı ya da çalışmayan süzgeçte yazılmaz.
        const std = standartKapisi(yazi, '', standart);
        if (std.karar === 'kirmizi' || std.karar === 'hata') {
          log(`  - karne yazılmadı: ${std.karar === 'hata' ? 'standart denetimi çalıştırılamadı' : standartOzeti(std)}`);
          continue;
        }
        if (std.karar === 'sari') log(`  ~ karne: ${standartOzeti(std)}`);
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


// Tur girişi. Acil durdurma bayrağı açıksa Gemini'ye hiç dokunmadan, hiçbir şey yazmadan döner (çıkış kodu 0, workflow'daki
// sonraki adımlar durdu=1 çıktısıyla atlanır). Döner: { durdu }.
export async function turBaslat({ kuru = false, env = process.env, acil = acilDurdurma, calis = calistir, durumDosyasi = DURUM_DOSYASI, log = console.log } = {}) {
  if (!kuru) {
    const d = await acil({ env, site: 'finfolis', log });
    if (d.durdu) {
      if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, 'durdu=1\n');
      return { durdu: true };
    }
    log(await butceYukle({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site: 'finfolis' }));
  }
  // Durum dosyası: tur sonunda ve (F4) her yazılan haberden sonra. Şifreleyiciler yeni nesne döner, bellekteki durum değişmez.
  const durumYaz = (d) => writeFile(durumDosyasi, JSON.stringify({ ...d, olaylar: hafizaKapat(d.olaylar), yayinlar: yayinKapat(d.yayinlar), havuz: havuzKapat(d.havuz ?? []) }, null, 2) + '\n');
  const s = await calis(kuru ? { kuru } : { kuru, araKayit: durumYaz });
  if (!kuru) {
    await durumYaz(s.durum);
    const adet = s.adet + (s.bultenYazildi ? 1 : 0);
    log(`Bitti: ${s.adet} yeni haber${s.bultenYazildi ? ', 1 bülten' : ''}.`);
    if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `adet=${adet}\n`);
    if (s.konfigHatasi && env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, 'konfig_hatasi=1\n');
    if (env.GITHUB_STEP_SUMMARY && s.hatalar.length)
      await appendFile(env.GITHUB_STEP_SUMMARY, `### Haber botu\n${s.hatalar.map((h) => `- ${h}`).join('\n')}\n`);
  }
  if (!kuru && s.motorHatasi) {
    log(`Tur hatayla bitti: ${adresiSil(s.motorHatasi.message ?? s.motorHatasi)}`);
    return { durdu: false, hata: s.motorHatasi };
  }
  return { durdu: false };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = await turBaslat({ kuru: process.argv.includes('--kuru') });
  if (r.hata) process.exitCode = 1; // durum ve yazılar yazıldı; iş kırmızı biter (Commit adımı yine çalışır)
}
