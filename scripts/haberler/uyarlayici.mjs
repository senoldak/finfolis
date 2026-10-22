// finfolis haber akışının motor uyarlayıcısı: hent-haberler.mjs'in eski akış gövdesi, ortak motorun sürebileceği iki parçaya bölündü.
//   adaylar({ log }) → [{ kimlik, yuk, baslik }]   kaynakları okur; gorulen'de karar verilmemiş adayları döner
//   isle(adaylar, { surVar, log }) → Sonuc[]         gruplama → eşik → yazım → havuz/derleme → bülten akışı; üye başına Sonuc
// Piyasa verisi, resmî veri ve karneler uyarlayıcının dışında kalır (hent-haberler.mjs calistir). Motor yokken yerelTur aynı akışı
// eskisi gibi sürer: gorulen işaretleri akışın içinde (eskisi gibi) atılır; yerelTur karar verilenleri yalnız güvenceye alır.
// Sonuc = { kimlik: motorKimlik(aday.id), durum: 'yazildi' | 'elendi' | 'bekliyor', gerekce?, hata?, slug?, havuzda?, sayilmaz? }
// Sonucu olmayan aday bekliyor kalır (eşik altı ve bültene girmedi, gruplama hatası, süre/Gemini payı doldu, havuz üyesi).
import merkezBankalari from './kaynaklar/merkez-bankalari.mjs';
import sec from './kaynaklar/sec.mjs';
import kurHareketi from './kaynaklar/kur-hareketi.mjs';
import esikOlaylari from './kaynaklar/esik-olaylari.mjs';
import { rssHaberKaynagi } from './kaynaklar/rss-haber.mjs';
import { BESLEMELER, DERLEYICILER } from './kaynaklar/beslemeler.mjs';
import { derleyiciKaynagi } from './kaynaklar/derleyici.mjs';
import * as olaylarModulu from './olaylar.mjs';
import { dilimGruplari, derlemeAdayi, derlemeOlayi, DERLEME_MAKS, derlenebilir, derlemeDilimiKaydet } from './derleme.mjs';
import { derlemeEnAz, sablonKontrol } from './yayin-kurulu.mjs';
import { standartOzeti } from './standart.mjs';
import { standartKapisi, derlemeSuz, yaziEkleri } from './standart-kapi.mjs';
import { kirmiziKayit, sariKayit, motorKimlik } from './motor.mjs';
import { BOLGELER, dilimDolu, dilimKaydet } from './bulten.mjs';
import { tekrarlariAyikla, hafizayaEkle } from './tekrar.mjs';
import { havuzAc, havuzaHazirla, havuzAyir, derlemeDenendi, dilimAnahtari } from './havuz.mjs';
import { yaziYaz } from './lib.mjs';
import { icerikTuru } from './icerik-turu.mjs';
import { haberKapagi } from '../kapak/kapak.mjs';
import { haberGrafigi } from './grafik-kapak.mjs';
import { kelimeSay } from '../../src/lib/uzunluk.mjs';
import { adresiSil, kaynakIzi, gizliMedyaAdlari } from './gizli.mjs';
import { geminiPayiBitti } from './butce.mjs';
import { olayTokenTahmini, derlemeTokenTahmini, tokenTavaniAsildi } from './token-tavani.mjs';

const FORSTE_GANG = 2; // bir kaynak ilk çalıştığında yalnızca en yeni 2 aday
const KAYNAK_LIMIT = 15; // sonraki çalıştırmalarda kaynak başına en fazla aday
const MAKS_DENEME = 3;
const GUN_MS = 86_400_000;
// Katman 3 öncelik sırası: bülten > önem 5-4 (70+) > dilim derlemeleri > önem 3 (60-69) > iyileştirme çağrıları.
// Bütçe daralınca alttan kesilir; bu yüzden 70+ olaylar yazılır, ardından derlemeler, en son 60-69 olaylar.
export const ONCELIKLI_ONEM = 70;
export const MAKS_HABER = 8; // çalıştırma başına; kalan olaylar sonraki çalıştırmaya kalır
export const KAYNAK_BUTCE_MS = 8 * 60_000; // bu süreden sonra yeni kaynak başlatılmaz
export const BUTCE_MS = 18 * 60_000; // workflow zaman aşımı 25 dk
// Bülten payı (21 Ekim): dilimin bülteni yazılmadıysa haber ve derleme bütçenin son bu kadarına girmez. 20 Ekim'de
// haberler 18 dakikayı üç tur üst üste doldurdu, kapanış bülteni 5-6 saat gecikti (bülten 1-4 dakika sürüyor).
export const BULTEN_PAYI_MS = 4 * 60_000;
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
// de genel RSS de 60'la yazılır (0–100 ölçeği). 2026-10-17'de 70'e çıkarıldı; hafta sonu akşamı turlarda hiç olay geçmeyince
// site sahibinin kararıyla aynı gün 60'a (3/5) geri alındı. Kısa kalan dilim derlemesine girer (bkz. havuz.mjs), altı yalnız
// bültende satır olur. Ücretli tek kaynak terfi etmez.
export const TERFI_ESIGI = 60;
export const RSS_TERFI_ESIGI = 60;
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
export const goruldu = (durum, id) => Boolean(durum.gorulen[id]) && !durum.gorulen[id].deneme;
// Başarısız deneme sayar; MAKS_DENEME'ye ulaşınca görüldü işaretler.
function basarisiz(durum, a, iso, hatalar, neden, log) {
  const n = (durum.gorulen[a.id]?.deneme ?? 0) + 1;
  if (n >= MAKS_DENEME) {
    durum.gorulen[a.id] = { zaman: iso };
    log(`  - ${a.id}: ${n} denemede başarısız, görüldü sayıldı`);
  } else durum.gorulen[a.id] = { zaman: iso, deneme: n };
  hatalar.push(`${a.id}: ${neden}`);
}

// Çalıştırmada kullanılan kaynaklar (kaynak modülleri ve şifreli listeden gelen beslemeler); adayiKur kaynağın var olup olmadığına bunlara bakar.
export const varsayilanKaynaklar = () => [merkezBankalari, sec, kurHareketi, esikOlaylari, ...BESLEMELER.map(rssHaberKaynagi), ...DERLEYICILER.map(derleyiciKaynagi)];

// Motor yükü şifreli 16 KB'a sığmalı: uzun alanlar hem karakter hem UTF-8 bayt sınırıyla kırpılır (yük JSON'u ~11 KB altında).
const kes = (m, enCok, enCokBayt) => {
  let t = String(m ?? '').slice(0, enCok);
  while (Buffer.byteLength(t) > enCokBayt) t = t.slice(0, Math.floor(t.length * 0.9));
  return t;
};
export const KAYNAK_METNI_ENCOK = 4000;

export const YUK_AZAMI_BAYT = 11_000; // şifreli 16 KB'a sığmalı (motor AZAMI_YUK)

/**
 * Adayın başka süreçte yeniden işlenmesine yetecek alanlar. Yük motor defterinde şifreli durur (motor şifreler), bu yüzden
 * resmî olmayan kaynağın gerçek adı ve gizliKaynaklar girişleri taşınır: yeniden kurulan aday adayMedyaKontrol'den aynı
 * sonucu alır. Kapak çizimi taşınmaz (başlıktan yeniden çizilir). Şablon (sablonYazi) adaylar yükten kurulmaz: sablon
 * işareti taşınır, eski bir şablon adayının yerine bu turun taze adayı işlenir (isle).
 * Yükün JSON boyu YUK_AZAMI_BAYT'ın altında kalır; tırnak ve satır sonu kaçışları dahil.
 */
export const adayYuku = (a) => {
  const tarih = a.tarih instanceof Date ? a.tarih.toISOString() : String(a.tarih ?? '');
  const gizli = (a.gizliKaynaklar ?? []).filter((k) => k?.url).slice(0, 2).map((k) => ({ ad: kes(k.ad, 80, 160), url: kes(k.url, 300, 400) }));
  const link = [...(a.kaynaklar ?? []), ...(a.gizliKaynaklar ?? [])].find((k) => k?.url)?.url;
  const yuk = {
    id: a.id,
    kaynak: a._kaynak ?? '',
    baslik: kes(a.baslik, 300, 600),
    ozet: kes(a.ozet, 400, 800),
    tarih,
    link: link ? kes(link, 300, 400) : undefined,
    onem: a.onem ?? 0,
    kategori: a.kategori,
    bolge: a.bolge,
    ucretli: Boolean(a.ucretli),
    alan: a.alan ? kes(a.alan, 100, 200) : undefined,
    kaynaklar: (a.kaynaklar ?? []).slice(0, 3).map((k) => ({ ad: kes(k.ad, 50, 100), url: kes(k.url, 250, 300) })),
    gizliKaynaklar: gizli.length ? gizli : undefined,
    sablon: a.sablonYazi ? true : undefined,
    kaynakMetni: kes(a.kaynakMetni, KAYNAK_METNI_ENCOK, 7000),
  };
  // JSON kaçışları (tırnak, satır sonu, kontrol karakterleri) uzunluğu bayttan fazla şişirebilir: sınırın altına inene kadar kırp.
  const boy = () => Buffer.byteLength(JSON.stringify(yuk));
  for (const alan of ['kaynakMetni', 'ozet', 'baslik']) while (boy() >= YUK_AZAMI_BAYT && yuk[alan].length > 0) yuk[alan] = yuk[alan].slice(0, Math.floor(yuk[alan].length * 0.9));
  return yuk;
};

/** Yükten aday kurar; kaynak (etiket) artık kaynak listesinde yoksa ya da yük şablon adaydan geldiyse null. */
export function adayiKur(yuk, kaynaklar = varsayilanKaynaklar()) {
  if (yuk.sablon) return null;
  if (!kaynaklar.some((k) => k.ad === yuk.kaynak)) return null;
  const resmi = (yuk.kaynaklar ?? []).length > 0;
  return {
    id: yuk.id,
    baslik: yuk.baslik,
    ozet: yuk.ozet ?? '',
    tarih: yuk.tarih,
    onem: yuk.onem ?? 0,
    kategori: yuk.kategori,
    bolge: yuk.bolge,
    ucretli: Boolean(yuk.ucretli),
    alan: yuk.alan ?? null,
    kaynakMetni: yuk.kaynakMetni ?? '',
    kaynaklar: yuk.kaynaklar ?? [],
    gizliKaynaklar: resmi ? [] : yuk.gizliKaynaklar ?? (yuk.link ? [{ ad: yuk.kaynak, url: yuk.link }] : []),
  };
}

// Günlüğe ve motora giden gerekçelerden adres ve yayın kuruluşu adı silinir.
let medyaDeseni;
const medyaGizle = (m) => {
  medyaDeseni ??= (() => {
    let adlar = [];
    try {
      adlar = gizliMedyaAdlari().filter((a) => String(a).trim().length >= 3);
    } catch {
      // şifreli liste açılamazsa yalnız adres silinir
    }
    return adlar.length ? new RegExp(adlar.map((a) => String(a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi') : null;
  })();
  return medyaDeseni ? String(m).replace(medyaDeseni, '[yayın]') : String(m);
};
const temiz = (m) => adresiSil(medyaGizle(String(m)));

/** Durum dosyasında karar verilmemiş (gorulen'de kalıcı olmayan) adaylar. */
export const gorulmeyen = (adaylar, durum) => adaylar.filter((a) => !goruldu(durum, a.yuk.id));

/**
 * @param {{ durum: object, simdi: Date, ayar?: object, bag?: object }} p
 *   ayar: { kuru, maksHaber, geminiVar, tokenTavani, harcananToken, baslangic, piyasa, yasGun, log }  (piyasa: görünür göstergeler)
 *   bag: calistir bağımlılıkları (kaynaklar, ipucu, olaylar, gemini, yaz, derlemeYaz, yayinKurulu, standart, motorYaz, bulten,
 *        okuyucu, rot, saat, araKayit); testler bunları enjekte eder.
 */
export function uyarlayiciKur({ durum, simdi, ayar = {}, bag = {} }) {
  const A = {
    kuru: false,
    maksHaber: MAKS_HABER,
    geminiVar: true,
    tokenTavani: undefined,
    harcananToken: () => 0,
    baslangic: Date.now(),
    piyasa: { gostergeler: [] },
    yasGun: 5,
    log: console.log,
    ...ayar,
  };
  const B = {
    kaynaklar: [],
    ipucu: { hent: async () => [], onemArtir: (a) => a },
    olaylar: olaylarModulu,
    gemini: undefined,
    yaz: undefined,
    derlemeYaz: undefined,
    yayinKurulu: undefined,
    standart: undefined,
    motorYaz: async () => {},
    bulten: { bultenGerekli: () => false, bultenYaz: async () => null },
    okuyucu: null,
    rot: '.',
    saat: () => Date.now(),
    araKayit: async () => {},
    ...bag,
  };
  const iso = simdi.toISOString();
  durum.gorulen ??= {};
  durum.kaynaklar ??= {};
  durum.olaylar ??= [];
  durum.olayOnbellek ??= {};
  durum.grafikKapak ??= {};
  durum.yayinlar ??= [];

  const ozet = { adet: 0, yazilar: [], hatalar: [], bultenYazildi: false, bultenGerekli: false, konfigHatasi: false, gruplamaHatasi: false };
  const tam = new Map(); // bu turda okunan adayların tam hali (kapak, şablon yazı, gizli kaynak adları yükte taşınmaz); yerel yol eskisi gibi tamını kullanır
  let ham = []; // sıralı ham aday listesi (_kaynak'lı): kuru çalışma ve sonuç için
  const adayIdleri = (o) => (o.adaylar ?? []).map((a) => a.id);

  async function adaylar({ log = A.log } = {}) {
    const hatalar = ozet.hatalar;
    let liste = [];
    const kuru = A.kuru;
    const baslangic = A.baslangic;
    for (const k of B.kaynaklar) {
      if (B.saat() - baslangic > KAYNAK_BUTCE_MS) {
        log('  ! kaynak bütçesi aşıldı; kalan kaynaklar sonraki çalıştırmaya kaldı');
        break;
      }
      try {
        const ilk = !durum.kaynaklar[k.ad];
        const ham1 = await k.hent({
          piyasa: A.piyasa,
          simdi,
          goruldu: (id) => goruldu(durum, id),
          gorulen: durum.gorulen, // salt okunur; esik-olaylari günlük tavanı için
          ...(B.okuyucu ? { okuyucu: B.okuyucu } : {}),
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
        let yeniler = ham1.filter((a) => !goruldu(durum, a.id) && !liste.some((x) => x.id === a.id));
        yeniler.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
        if (!durum.kaynaklar[k.ad]) {
          if (!kuru) for (const a of yeniler.slice(FORSTE_GANG)) durum.gorulen[a.id] = { zaman: iso };
          yeniler = yeniler.slice(0, FORSTE_GANG);
          if (!kuru) durum.kaynaklar[k.ad] = iso;
        }
        log(`${k.ad}: ${yeniler.length} yeni`);
        liste.push(...yeniler.map((a) => ({ ...a, _kaynak: k.ad })));
      } catch (e) {
        hatalar.push(`${k.ad}: ${e.message}`);
        console.error(`${k.ad}: HATA ${e.message}`);
      }
    }

    // Önem artırma
    try {
      liste = B.ipucu.onemArtir(liste, await B.ipucu.hent(), simdi);
    } catch (e) {
      console.error(`[ipucu] ${e.message}`);
    }
    liste.sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0));
    ham = liste;
    tam.clear();
    for (const { _kaynak, ...a } of liste) tam.set(a.id, a);
    return liste.map((a) => ({ kimlik: motorKimlik(a.id), yuk: adayYuku(a), baslik: a.baslik }));
  }

  async function isle(girdi, { surVar, log = A.log, kapi = null } = {}) {
    const sonuclar = [];
    const yer = new Map();
    // Aynı kimliğe sonradan gelen sonuç öncekinin yerine geçer (havuza girip aynı turda derlemeye giren olay gibi).
    const koy = (s) => {
      if (yer.has(s.kimlik)) sonuclar[yer.get(s.kimlik)] = s;
      else {
        yer.set(s.kimlik, sonuclar.length);
        sonuclar.push(s);
      }
    };
    // Yayın kapısı, ikinci okuma (ortak/kapi.mjs): yalnız belirlenimci süzgeç kırmızı değilken ve kapi fonksiyonsa çağrılır.
    // Döner null (kapı yok) ya da { karar: 'gec'|'elendi'|'bekle', gerekce, hata? }; ayar hatasında kapi fırlatır (e.ayar).
    const kapidan = async (metinler) => (typeof kapi === 'function' ? kapi(metinler) : null);
    const kapiGerekcesi = (sari, k) => [sari, k?.gerekce].filter((x) => typeof x === 'string' && x.trim()).join(' ').slice(0, 300);
    const simdiki = (id) => sonuclar[yer.get(motorKimlik(id))];
    const uyeKoy = (ids, s) => ids.forEach((id) => koy({ kimlik: motorKimlik(id), ...s }));
    const elendiO = (o, gerekce) => uyeKoy(adayIdleri(o), { durum: 'elendi', gerekce: temiz(gerekce) });
    // Sarı karar gerekçesi yazildi sonucunda taşınır (motor modunda olay düzeyi kayıt yazılmaz, karar üye başına gider).
    const yazildiO = (o, slug, gerekce) => uyeKoy(adayIdleri(o), { durum: 'yazildi', slug, ...(gerekce ? { gerekce: temiz(gerekce) } : {}) });
    const bekliyorO = (o, mesaj, ek = {}) => uyeKoy(adayIdleri(o), { durum: 'bekliyor', hata: new Error(temiz(mesaj)), ...ek });
    const havuzdaO = (o) => uyeKoy(adayIdleri(o), { durum: 'bekliyor', gerekce: 'havuzda', havuzda: true });
    const karar = (id, gerekce) => {
      const g = durum.gorulen[id];
      if (g.yazildi && g.slug) return { durum: 'yazildi', slug: g.slug };
      return { durum: 'elendi', gerekce };
    };

    const hatalar = ozet.hatalar;
    const baslangic = A.baslangic;
    const zamanBitti = () => (surVar ? !surVar() : B.saat() - baslangic > BUTCE_MS);
    // Katman 3: haber ve derleme süre ya da Gemini tur payı bitince durur; bülten ve karneler yalnız süreye bakar.
    // Haber ve derleme ayrıca tur giriş-token tavanına bakar (TPM'den türetilir, bkz. token-tavani.mjs): sıradaki iş
    // tavanı aşacaksa kalan işler sonraki tura kalır. Bülten bu tavandan muaftır (en yüksek öncelik).
    const isBitti = (tahmin = 0) => {
      if (zamanBitti() || (!dilimDolu(durum, simdi) && B.saat() - baslangic > BUTCE_MS - BULTEN_PAYI_MS)) return 'süre'; // bülten payı motor modunda da korunur
      if (geminiPayiBitti()) return 'Gemini tur payı';
      if (tokenTavaniAsildi(tahmin, { harcanan: A.harcananToken(), tavan: A.tokenTavani })) return 'giriş token tavanı';
      return null;
    };
    // Motor modunda olay düzeyindeki karar kaydı (çok üyeli kimlik) yazılmaz: üye başına Sonuc kararı taşır.
    const motoraYaz = async (kayit) => {
      if (A.kuru || A.motorModu) return;
      await B.motorYaz(kayit);
    };

    // ── Gelen adaylar: havuzdakiler işlenmez; çökme sonrası yeniden gelen (eski) adaylar önce gorulen'e sorulur ──
    const ilkHavuzIdleri = new Set(havuzAc(durum.havuz ?? []).flatMap((o) => adayIdleri(o)));
    const gelen = [];
    for (const a of girdi) {
      const id = a.yuk.id;
      if (ilkHavuzIdleri.has(id)) continue; // havuzda bekliyor (taze ya da eski gelse de): işlenmez, Sonuc dönmez, havuz büyümez
      if (a.eski && goruldu(durum, id)) {
        koy({ kimlik: a.kimlik, ...karar(id, 'önceki turda karar verildi') });
        continue;
      }
      // Şablon adaylar yükten kurulmaz: bu turun taze eşi (aynı id) varsa o işlenir, yoksa kaynakta artık yok sayılır.
      const o = tam.get(id) ?? adayiKur(a.yuk, B.kaynaklar);
      if (!o) {
        const gerekce = a.yuk.sablon ? 'kaynakta artık yok' : 'kaynak listeden çıkarıldı';
        koy({ kimlik: a.kimlik, durum: 'elendi', gerekce });
        durum.gorulen[id] = { zaman: iso, elendi: true, gerekce };
        continue;
      }
      if (a.eski && simdi - new Date(o.tarih) > A.yasGun * GUN_MS) {
        koy({ kimlik: a.kimlik, durum: 'elendi', gerekce: 'bayat (5 günü geçti)' });
        durum.gorulen[id] = { zaman: iso, elendi: true, gerekce: 'bayat' };
        continue;
      }
      gelen.push(o);
    }
    gelen.sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0)); // adaylar() zaten sıralı; sıralama kararlı

    // 4. Olay gruplama; hafızadaki olayla eşleşen adaylar yazılmadan görüldü sayılır.
    // Şablon yazılan adaylar (eşik olayları) Gemini'siz yazılır: gruplama çağrısına girmez, her biri kendi olayıdır.
    // Mükerrer denetimi yine çalışır: tekrarlariAyikla (72 saat) ve olayYaz içindeki mukerrerBul, ikisi de Gemini'siz.
    const sablonAdaylari = gelen.filter((a) => a.sablonYazi);
    const { yeni: grupYeni, bilinen, grupHatasi } = await B.olaylar.olaylariGrupla(gelen.filter((a) => !a.sablonYazi), durum.olaylar, { gemini: B.gemini, onbellek: durum.olayOnbellek, surumEki: `esik${TERFI_ESIGI}/${RSS_TERFI_ESIGI}`, simdi });
    if (grupHatasi) {
      // Gruplama yoksa mükerrer yayın riski: terfi ve bülten atlanır, adaylar görülmedi kalır.
      hatalar.push('olay gruplama başarısız; terfi ve bülten sonraki çalıştırmaya kaldı');
      console.error('  ! olay gruplama başarısız; terfi ve bülten atlandı');
      ozet.gruplamaHatasi = true;
      return sonuclar;
    }
    const yeni = [...grupYeni, ...sablonAdaylari.map((a) => olaylarModulu.olayYap([a]))];
    for (const a of bilinen) {
      durum.gorulen[a.id] = { zaman: iso };
      koy({ kimlik: motorKimlik(a.id), durum: 'elendi', gerekce: 'bilinen olay (hafızada)' });
    }
    // Son 72 saatte yayımlanan bir haberle aynı olay (tekrar.mjs): yazılmaz, bültene girmez, görüldü sayılır.
    for (const t of tekrarlariAyikla(yeni, durum.yayinlar ?? [], simdi)) {
      for (const a of t.olay.adaylar) durum.gorulen[a.id] = { zaman: iso };
      elendiO(t.olay, 'tekrar: son 72 saatte yayımlanan haberle aynı olay');
      log(`  - ${t.olay.id}: tekrar (${t.neden}), ${t.slug} ile aynı olay`);
    }
    yeni.sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0));
    log(terfiOzeti(yeni));

    // 5. Terfi eden olayları yaz, denetle, kaydet
    const yazilan = [];
    const dislanan = new Set(); // durdurulan, başarısız ya da yazılamayan (bütçe/konfig/tavan) terfi olayları
    const kisaOlaylar = []; // yayın kurulunda kısa kalanlar: havuza girer, tema derlemesine aday (bkz. havuz.mjs)
    if (!A.geminiVar) console.error('UYARI: GEMINI_API_KEY yok; haber yazılmayacak, yalnızca piyasa verisi ve gösterge bülteni.');
    const terfi = A.geminiVar ? yeni.filter(terfiMi) : [];
    let dur = false;
    let ayarHatasi = null;
    // Önem 70+ olaylar önce, 60-69 olaylar derlemelerden sonra yazılır (ONCELIKLI_ONEM).
    let sablonAdet = 0; // Gemini'siz yazılanlar: ne Gemini bütçesine ne MAKS_HABER'e sayılır
    // Başarısız deneme: üçüncüde görüldü sayılır (elendi), öncesinde bekliyor.
    const denemeSonucu = (o, neden) => {
      for (const a of o.adaylar) {
        if (durum.gorulen[a.id]?.deneme) uyeKoy([a.id], { durum: 'bekliyor', hata: new Error(temiz(neden)) });
        else uyeKoy([a.id], { durum: 'elendi', gerekce: 'üç denemede yazılamadı' });
      }
    };
    const olayYaz = async (o) => {
      const sablon = o.adaylar?.length === 1 ? o.adaylar[0].sablonYazi : undefined;
      const neden = dur || sablon ? null : isBitti(olayTokenTahmini(o));
      if (neden) {
        log(`  ! çalıştırma bütçesi aşıldı (${neden}); kalan olaylar sonraki çalıştırmaya kaldı`);
        dur = true;
      }
      if (sablon ? zamanBitti() : dur || yazilan.length - sablonAdet >= A.maksHaber) {
        dislanan.add(o); // görüldü sayılmaz, sonraki çalıştırmada yeniden gelir
        return;
      }
      // Gruplamanın kaçırdığı kopya (aynı ülke + gösterge + dönem): yazılmaz, görüldü sayılır, bültene de girmez.
      const kopya = olaylarModulu.mukerrerBul(o, { yazilan, hafiza: durum.olaylar, simdi });
      if (kopya) {
        for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso };
        dislanan.add(o);
        elendiO(o, 'mükerrer: aynı olay zaten yazılmış');
        log(`  - ${o.id}: mükerrer, ${kopya.id} ile aynı olay`);
        return;
      }
      try {
        let r;
        if (sablon) r = sablonKontrol(sablon, o);
        else {
          const taslak = await B.yaz(o, {});
          if (!taslak) {
            for (const a of o.adaylar) basarisiz(durum, a, iso, hatalar, 'yazar çıktı vermedi', log);
            dislanan.add(o);
            denemeSonucu(o, 'yazar çıktı vermedi');
            return;
          }
          r = await B.yayinKurulu(taslak, o, {});
        }
        if (r.dur && r.bekle) {
          // Denetim çalışamadı (emin değil): yayımlanmaz, görüldü sayılmaz; sonraki turda yeniden denenir.
          dislanan.add(o);
          hatalar.push(`${o.id} «${o.baslik}»: ${r.dur}`);
          log(`  - ${o.id}: bekletildi (${r.dur})`);
          bekliyorO(o, r.dur);
          return;
        }
        if (r.dur) {
          for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso };
          // Yalnızca kısa kaldığı için duran olay bu turun bültenine girmez: havuzda eş bekler (derleme). Kısa haber
          // tek başına yayımlanmaz; eş bulamazsa bülten satırı olur (havuz.mjs).
          dislanan.add(o);
          if (r.kisa) {
            kisaOlaylar.push(o);
            havuzdaO(o);
          } else {
            hatalar.push(`${o.id} «${o.baslik}»: yayınlanmadı, ${r.dur}`);
            elendiO(o, r.dur);
          }
          log(`  - ${o.id}: durduruldu (${r.dur})`);
          return;
        }
        // Standartlar: son metin hazır, dosya yazılmadan önce kırmızı süzgeç. Kırmızı: elendi + gerekçe, yazı yok.
        // Süzgeç çalışamazsa haber bekletilir (görüldü sayılmaz).
        const std = standartKapisi(r.yazi, o.kaynakMetni ?? '', B.standart);
        if (std.karar === 'hata') {
          dislanan.add(o);
          hatalar.push(`${o.id} «${o.baslik}»: standart denetimi çalıştırılamadı (${std.hata})`);
          log(`  - ${o.id}: bekletildi (standart denetimi çalıştırılamadı)`);
          bekliyorO(o, `standart denetimi çalıştırılamadı (${std.hata})`);
          return;
        }
        if (std.karar === 'kirmizi') {
          for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso, elendi: true, gerekce: std.gerekce };
          dislanan.add(o);
          log(`  - ${o.id}: elendi, ${standartOzeti(std)}`);
          elendiO(o, std.gerekce);
          await motoraYaz(kirmiziKayit(adayIdleri(o), std.gerekce));
          return;
        }
        if (std.karar === 'sari') log(`  ~ ${o.id}: ${standartOzeti(std)}`);
        const kr = await kapidan([{ dil: 'tr', baslik: r.yazi.baslik, ozet: r.yazi.spot, metin: r.yazi.govde, ekler: yaziEkleri(r.yazi) }]);
        if (kr?.karar === 'elendi') {
          for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso, elendi: true, gerekce: kr.gerekce };
          dislanan.add(o);
          log(`  - ${o.id}: elendi, yayın kapısı (${kr.gerekce})`);
          elendiO(o, kr.gerekce);
          await motoraYaz(kirmiziKayit(adayIdleri(o), kr.gerekce));
          return;
        }
        if (kr?.karar === 'bekle') {
          dislanan.add(o);
          hatalar.push(`${o.id} «${o.baslik}»: yayın kapısı okuyamadı (${kr.hata ?? kr.gerekce})`);
          log(`  - ${o.id}: bekletildi (yayın kapısı okuyamadı)`);
          bekliyorO(o, `yayın kapısı okuyamadı (${kr.hata ?? kr.gerekce})`, { sayilmaz: true });
          return;
        }
        const yazGerekce = kr?.karar === 'gec' ? kapiGerekcesi(std.karar === 'sari' ? std.gerekce : '', kr) : std.karar === 'sari' ? std.gerekce : '';
        const yazi = { ...r.yazi, kategori: o.kategori, tarih: new Date(o.tarih), tur: 'haber', icerikTuru: icerikTuru(o.adaylar), kaynaklar: o.kaynaklar ?? [], kaynakIzi: kaynakIzi(o.gizliKaynaklar) };
        // Kapak: kaynağın tarifi; yoksa başlıkta anılan piyasa aracının grafiği; o da yoksa başlık kartı.
        const kapakli = o.adaylar.find((a) => a.kapak);
        Object.assign(yazi, kapakli ? { kapak: kapakli.kapak, kapakAlt: kapakli.kapakAlt } : ((await haberGrafigi(yazi, o, B.okuyucu, simdi, durum.grafikKapak)) ?? varsayilanKapak(yazi, o)));
        const slug = await yaziYaz(B.rot, yazi);
        for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso, yazildi: true, ...(yazGerekce ? { gerekce: yazGerekce } : {}) };
        if (std.karar === 'sari') await motoraYaz(sariKayit(adayIdleri(o), slug, std.gerekce));
        o.haberSlug = slug;
        if (sablon) sablonAdet++;
        yazilan.push(o);
        ozet.adet++;
        ozet.yazilar.push(slug);
        yazildiO(o, slug, yazGerekce || undefined);
        log(`  + ${slug}${r.uzatma ? ` (uzatıldı ${r.uzatma[0]}→${r.uzatma[1]} kelime)` : ''}`);
        await B.araKayit(durum).catch((e) => console.error(`  ! ara kayıt yazılamadı: ${e.message}`));
      } catch (e) {
        dislanan.add(o);
        if (e.konfig || e.ayar) {
          // Anahtar/model hatası haberin suçu değil: deneme sayılmaz, çalıştırma durur (e.ayar: yayın kapısı ayarı).
          hatalar.push(`${e.ayar ? 'Yayın kapısı' : 'Gemini'} yapılandırma hatası: ${e.message}`);
          console.error(`  ! yapılandırma hatası: ${e.message}`);
          ozet.konfigHatasi = true;
          ayarHatasi ??= e;
          dur = true;
          return;
        }
        // Günlük kota bitti: haberin suçu değil, deneme sayılmaz; yayımlanmaz, sonraki turda yeniden denenir.
        if (e.kota) {
          hatalar.push(`${o.id}: ${e.message}`);
          log(`  - ${o.id}: bekletildi (${e.message})`);
          bekliyorO(o, e.message, { sayilmaz: true });
          return;
        }
        // Bozuk yanıt (çıkış tavanı, geçersiz JSON): tek deneme; gerekçesiyle görüldü sayılır, yeniden yazılmaz.
        if (e.bozuk) {
          for (const a of o.adaylar) durum.gorulen[a.id] = { zaman: iso, gerekce: 'bozuk yanıt' };
          hatalar.push(`${o.id}: ${e.message}`);
          log(`  - ${o.id}: bozuk yanıt, görüldü sayıldı (yeniden denenmez)`);
          console.error(`  ! ${o.id}: ${e.message}`);
          elendiO(o, 'bozuk yanıt');
          return;
        }
        // Görüldü sayılmaz: sonraki çalıştırmada yeniden denenir.
        for (const a of o.adaylar) basarisiz(durum, a, iso, hatalar, e.message, log);
        console.error(`  ! ${o.id}: ${e.message}`);
        denemeSonucu(o, e.message);
      }
    };

    const yuksekOlaylar = terfi.filter((o) => (o.onem ?? 0) >= ONCELIKLI_ONEM);
    const dusukOlaylar = terfi.filter((o) => (o.onem ?? 0) < ONCELIKLI_ONEM);
    for (const o of yuksekOlaylar) await olayYaz(o);

    // 5b. Kısa haber havuzu ve tema derlemesi: bu turun kısa olayları önceki turlardan bekleyenlerle birleşir;
    // aynı kategoriden birkaçı tek yazı olur. Derleme yazılamazsa ya da yayın kurulundan geçemezse olaylar bülten
    // satırına aday olur. Eş bulamayan olay havuzda kalır; süresi dolunca bülten satırına adaydır (havuz.mjs).
    // Derleme turu iki kez çalışabilir: önce 70+ olaylardan sonra (öncelik 3), 60-69 olaylar kısa kalırsa bir kez daha.
    let havuzListe = havuzAc(durum.havuz ?? []);
    const bultenYedek = [];
    let derlenmeyen = [];
    let islenenKisa = 0;
    let derlemeDenemesi = 0;
    let tokenLogu = 0;
    const derlemeTuru = async () => {
      const yeniKisalar = kisaOlaylar.slice(islenenKisa);
      islenenKisa = kisaOlaylar.length;
      const havuz = [...havuzListe, ...yeniKisalar.map((o) => havuzaHazirla(o, iso))];
      // Bekleyen olay bu arada (bu turda ya da önceki turlarda) tam haber olarak yazıldıysa havuzdan düşer.
      for (const t of tekrarlariAyikla(havuz, hafizayaEkle(durum.yayinlar ?? [], yazilan, simdi), simdi)) {
        log(`  - havuz ${t.olay.id}: tekrar (${t.neden}), ${t.slug} ile aynı olay`);
        elendiO(t.olay, 'tekrar: yayımlanmış haberle aynı olay');
      }
      const { bekleyen, olgun, suresiDolan, dusen } = havuzAyir(havuz, simdi);
      for (const o of dusen) log(`  - havuz ${o.id}: bekleme süresi doldu, düştü`);
      // Dilimi bitmiş kısa haberler derlemeye girer; tek kalanlar ve fazlası bülten satırı olur.
      const { gruplar, artan } = dilimGruplari(olgun);
      bultenYedek.push(...suresiDolan, ...artan); // bu turun bülteni yazılırsa satır olur, yazılmazsa havuzda bekler
      const kalanlar = [...bekleyen];
      for (const grup of gruplar) {
        const dilim = dilimAnahtari(grup[0]);
        if (!derlenebilir(dilim, simdi, durum)) {
          bultenYedek.push(...grup); // geç kalmış ya da derlemesi yazılmış dilim: bülten satırı olur
          continue;
        }
        const neden = derlemeDenemesi >= DERLEME_MAKS || dur ? 'sınır' : isBitti(derlemeTokenTahmini(grup));
        if (neden) {
          if (neden === 'giriş token tavanı' && !tokenLogu++) log('  ! giriş token tavanı: kalan derlemeler sonraki çalıştırmaya kaldı');
          kalanlar.push(...grup); // sonraki tura kalır
          continue;
        }
        derlemeDenemesi++;
        const yedekle = () => {
          for (const o of grup) derlemeDenendi(o);
          bultenYedek.push(...grup);
        };
        const birlesik = derlemeAdayi(grup);
        try {
          const taslak = await B.derlemeYaz(birlesik, {});
          if (!taslak) {
            log(`  - derleme (${grup.length} haber): yazar çıktı vermedi`);
            yedekle();
            continue;
          }
          const r = await B.yayinKurulu(taslak, birlesik, {});
          if (r.dur && r.bekle) {
            // Denetim çalışamadı: derleme yayımlanmaz, olaylar havuzda bekler.
            log(`  - derleme (${grup.length} haber): bekletildi (${r.dur})`);
            kalanlar.push(...grup);
            continue;
          }
          if (r.dur) {
            log(`  - derleme (${grup.length} haber): durduruldu (${r.dur})`);
            yedekle();
            continue;
          }
          // Standartlar: kırmızı çıkan madde (paragraf) tek başına atılır; yazı bütünüyle düşmez. Atınca derleme alt sınırın
          // altına inerse ya da süzgeç kırmızı kalırsa derleme yazılmaz, haberler bülten satırı adayı olur (her satır ayrıca süzülür).
          const sz = derlemeSuz(r.yazi, birlesik.kaynakMetni ?? '', B.standart);
          if (sz.karar === 'hata') {
            log(`  - derleme (${grup.length} haber): bekletildi (standart denetimi çalıştırılamadı)`);
            kalanlar.push(...grup);
            continue;
          }
          if (sz.karar === 'kirmizi' || (sz.atilan.length && kelimeSay(sz.yazi.govde) < derlemeEnAz(grup.length))) {
            log(`  - derleme (${grup.length} haber): yazılmadı, ${standartOzeti(sz.ozet)}${sz.atilan.length ? ' (kırmızı maddeler atılınca metin kısa kaldı)' : ''}`);
            yedekle();
            continue;
          }
          const derlemeGerekcesi = [
            sz.atilan.length ? `standart:kirmizi-madde-atlandi:${[...new Set(sz.atilan.map((b) => b.kural))].join(',')}` : '',
            sz.karar === 'sari' ? sz.gerekce : '',
          ]
            .filter(Boolean)
            .join(' | ');
          if (sz.atilan.length) log(`  ~ derleme: ${sz.atilan.length} madde atıldı, ${standartOzeti({ karar: 'kirmizi', kirmizi: sz.atilan, sari: [] })}`);
          else if (sz.karar === 'sari') log(`  ~ derleme: ${standartOzeti(sz.ozet)}`);
          // Yayın kapısı (ikinci okuma): derleme bütünü tek çağrıyla. Elendi: yazı yazılmaz, üyeleri elendi; bekle: üyeleri havuzda bekler.
          const kd = await kapidan([{ dil: 'tr', baslik: sz.yazi.baslik, ozet: sz.yazi.spot, metin: sz.yazi.govde, ekler: yaziEkleri(sz.yazi) }]);
          if (kd?.karar === 'elendi') {
            log(`  - derleme (${grup.length} haber): elendi, yayın kapısı (${kd.gerekce})`);
            for (const k of grup) {
              dislanan.add(k);
              for (const a of k.adaylar ?? []) durum.gorulen[a.id] = { zaman: iso, elendi: true, gerekce: kd.gerekce };
              elendiO(k, kd.gerekce);
              await motoraYaz(kirmiziKayit(adayIdleri(k), kd.gerekce));
            }
            continue;
          }
          if (kd?.karar === 'bekle') {
            log(`  - derleme (${grup.length} haber): bekletildi (yayın kapısı okuyamadı)`);
            kalanlar.push(...grup);
            continue;
          }
          const kapiDerleme = kd?.karar === 'gec' ? kapiGerekcesi(derlemeGerekcesi, kd) : derlemeGerekcesi;
          // Başlığa dilim eki: her dilimin derlemesi tek başlık taşır.
          const yazi = { ...sz.yazi, baslik: `${r.yazi.baslik} · ${birlesik.dilimEki}`, kategori: birlesik.kategori, tarih: new Date(birlesik.tarih), tur: 'haber', kaynaklar: birlesik.kaynaklar, kaynakIzi: kaynakIzi(birlesik.gizliKaynaklar) };
          Object.assign(yazi, varsayilanKapak(yazi, birlesik));
          const slug = await yaziYaz(B.rot, yazi);
          derlemeDilimiKaydet(durum, dilim);
          const o = derlemeOlayi(grup, birlesik, yazi.baslik, slug);
          for (const k of grup) {
            dislanan.add(k); // bültende ikinci kez yer almasın
            for (const a of k.adaylar ?? []) durum.gorulen[a.id] = { zaman: iso, yazildi: true, ...(kapiDerleme ? { gerekce: kapiDerleme.slice(0, 300) } : {}) };
            yazildiO(k, slug, kapiDerleme);
          }
          if (sz.karar === 'sari') await motoraYaz(sariKayit(grup.flatMap(adayIdleri), slug, derlemeGerekcesi));
          yazilan.push(o);
          ozet.adet++;
          ozet.yazilar.push(slug);
          log(`  + derleme ${slug} (${grup.length} haber, ${kelimeSay(yazi.govde)} kelime)`);
          await B.araKayit(durum).catch((e) => console.error(`  ! ara kayıt yazılamadı: ${e.message}`));
        } catch (e) {
          if (e.konfig || e.ayar) {
            hatalar.push(`${e.ayar ? 'Yayın kapısı' : 'Gemini'} yapılandırma hatası: ${e.message}`);
            ozet.konfigHatasi = true;
            ayarHatasi ??= e;
            dur = true;
            kalanlar.push(...grup); // olayların suçu değil: havuzda beklemeye devam eder
            continue;
          }
          // Geçici hata (Gemini meşgul, ağ): olayların suçu değil, derleme denenmiş sayılmaz; havuzda bekler ve
          // sonraki turda yeniden denenir.
          log(`  ! derleme: ${e.message}`);
          kalanlar.push(...grup);
        }
      }
      havuzListe = kalanlar;
      derlenmeyen = kalanlar;
    };
    await derlemeTuru();
    for (const o of dusukOlaylar) await olayYaz(o);
    if (kisaOlaylar.length > islenenKisa) await derlemeTuru(); // 60-69 olayların kısa kalanları
    if (derlenmeyen.length) log(`  ~ havuz: ${derlenmeyen.length} kısa haber eş bekliyor`);

    // 6. Bülten: yazılan haberler (bizim linkimizle) + terfi etmeyen olaylar.
    // Bülten yazılmazsa terfi etmeyen olayların adayları görülmedi kalır ve sonraki çalıştırmada birikir.
    const bultenOlaylari = [...yeni.filter((o) => !dislanan.has(o)), ...bultenYedek];
    // Günde en fazla üç bülten: bu dilimin (açılış/öğle/kapanış) bülteni yazıldıysa olaylar sonraki dilime kalır.
    ozet.bultenGerekli = B.bulten.bultenGerekli(bultenOlaylari.length) && !dilimDolu(durum, simdi);
    let bultendekiler = [];
    const bultenElenen = new Set(); // standart süzgecinde kırmızı çıkan bülten maddesi olayları
    const bultenBekleyen = new Set(); // süzgeç çalışamayan maddeler: görülmedi kalır
    if (ozet.bultenGerekli && zamanBitti()) {
      log('  ! çalıştırma bütçesi aşıldı; bülten sonraki çalıştırmaya kaldı');
    } else if (ozet.bultenGerekli) {
      try {
        // Bülten Gemini tur payına bakmaz, yalnız süreye (öncelik sırasında en üstte): pay haberlere gidince kontrol
        // masası reddi bülteni sessizce düşürüyordu (19 Ekim öğleden 20 Ekim sabahına kadar hiç bülten çıkmadı).
        const izleyici = {};
        const b = await B.bulten.bultenYaz(bultenOlaylari, A.piyasa, { simdi, butceBitti: zamanBitti, standart: B.standart, izleyici });
        // Standartlar: kırmızı çıkan madde elendi sayılır (gerekçesiyle, bülten yazılmasa da); süzgeci çalışamayan madde
        // görülmedi kalır ve sonraki turda yeniden denenir. Havuzdaki kırmızı olay havuza geri dönmez.
        for (const e of izleyici.elenen ?? []) {
          for (const a of e.olay.adaylar ?? []) durum.gorulen[a.id] = { zaman: iso, elendi: true, gerekce: e.gerekce };
          bultenElenen.add(e.olay.id);
          elendiO(e.olay, e.gerekce);
          await motoraYaz(kirmiziKayit(adayIdleri(e.olay), e.gerekce));
          log(`  - bülten maddesi elendi (${e.olay.id}): ${standartOzeti(e.ozet)}`);
        }
        for (const o of izleyici.bekleyen ?? []) {
          bultenBekleyen.add(o.id);
          log(`  - bülten maddesi bekletildi (${o.id}): standart denetimi çalıştırılamadı`);
        }
        for (const m of izleyici.sari ?? []) log(`  ~ bülten maddesi (${m.olay.id}): ${standartOzeti(m.ozet)}`);
        // Yayın kapısı (ikinci okuma): bülten bütünü tek çağrıyla. Elendi: bülten yazılmaz, üyeleri elendi; bekle: üyeleri bekler.
        const kb = b ? await kapidan([{ dil: 'tr', baslik: b.yazi.baslik, ozet: b.yazi.spot, metin: b.yazi.govde, ekler: yaziEkleri(b.yazi) }]) : null;
        const kapiUyeleri = bultenOlaylari.filter((o) => !bultenBekleyen.has(o.id) && !bultenElenen.has(o.id));
        if (kb?.karar === 'elendi') {
          for (const o of kapiUyeleri) {
            for (const a of o.adaylar ?? []) durum.gorulen[a.id] = { zaman: iso, elendi: true, gerekce: kb.gerekce };
            bultenElenen.add(o.id);
            elendiO(o, kb.gerekce);
            await motoraYaz(kirmiziKayit(adayIdleri(o), kb.gerekce));
          }
          log(`  - bülten elendi, yayın kapısı (${kb.gerekce})`);
        } else if (kb?.karar === 'bekle') {
          for (const o of kapiUyeleri) {
            bultenBekleyen.add(o.id);
            bekliyorO(o, `yayın kapısı okuyamadı (${kb.hata ?? kb.gerekce})`, { sayilmaz: true });
          }
          log('  - bülten bekletildi (yayın kapısı okuyamadı)');
        } else if (b) {
          const slug = await yaziYaz(B.rot, b.yazi);
          durum.sonBulten = b.anlik;
          dilimKaydet(durum, simdi);
          ozet.bultenYazildi = true;
          ozet.yazilar.push(slug);
          // Tavan dışı kalanlar da görüldü sayılır ve hafızaya girer: başka kaynaktan gelen kopyaları geri dönmesin.
          bultendekiler = bultenOlaylari.filter((o) => !bultenBekleyen.has(o.id) && !bultenElenen.has(o.id));
          bultenYedek.splice(0, bultenYedek.length, ...bultenYedek.filter((o) => bultenBekleyen.has(o.id))); // satır oldu, havuza dönmez (bekletilenler hariç)
          for (const o of bultendekiler) {
            const sariGerekce0 = (izleyici.sari ?? []).find((m) => m.olay.id === o.id)?.gerekce;
            const sariGerekce = kb?.karar === 'gec' ? kapiGerekcesi(sariGerekce0, kb) : sariGerekce0;
            for (const a of o.adaylar) if (!durum.gorulen[a.id]?.yazildi) durum.gorulen[a.id] = { zaman: iso, ...(sariGerekce ? { gerekce: sariGerekce } : {}) };
            // Bülten satırı olan her üye yazıldı sayılır (haberin kendi yazısı varsa onun sonucu kalır).
            for (const a of o.adaylar) if (simdiki(a.id)?.durum !== 'yazildi') yazildiO({ adaylar: [a] }, slug, sariGerekce);
            if (sariGerekce0) await motoraYaz(sariKayit(adayIdleri(o), slug, sariGerekce));
          }
          log(`  + bülten ${slug}`);
        } else {
          log(`  - bülten yazılmadı (${bultenOlaylari.length} olay; doğrulanan ya da onaylanan madde 3'ten az)`);
        }
      } catch (e) {
        if (e.ayar) {
          ozet.konfigHatasi = true;
          ayarHatasi ??= e;
        }
        hatalar.push(`bülten: ${e.message}`);
        console.error(`  ! bülten: ${e.message}`);
      }
    }

    // Bülten satırı olamayan süresi dolmuş olaylar SON_SAAT'e kadar havuzda kalır.
    durum.havuz = [...derlenmeyen, ...bultenYedek.filter((o) => o.havuzaGirdi && !bultenElenen.has(o.id))];

    // Havuz üyelerinin sonu: derlemeye ya da bültene girenler yukarıda yazildi, kırmızılar elendi oldu; havuzda kalanlar bekliyor
    // kalır (yeni kısa olayın "havuzda" sonucu yerinde durur, eskiler için yeni sonuç yok); süresi dolup bülten satırı bile
    // olamayanlar (eş bulunamadı, tekrar, kısa) elendi olur.
    const kalanHavuz = new Set(durum.havuz.flatMap(adayIdleri));
    for (const id of new Set([...ilkHavuzIdleri, ...kisaOlaylar.flatMap(adayIdleri)])) {
      const s = simdiki(id);
      if (kalanHavuz.has(id) || (s && (s.durum === 'yazildi' || s.durum === 'elendi'))) continue;
      uyeKoy([id], { durum: 'elendi', gerekce: 'kısa, eş bulunamadı' });
    }

    // 7. Olay hafızası: buradaki bir hata bu çalıştırmanın gorulen güncellemelerini kaybettirmez.
    try {
      durum.olaylar = B.olaylar.hafizaGuncelle(durum.olaylar, [...new Set([...yazilan, ...bultendekiler])], simdi);
      durum.yayinlar = hafizayaEkle(durum.yayinlar, yazilan, simdi);
    } catch (e) {
      hatalar.push(`olay hafızası: ${e.message}`);
      console.error(`  ! olay hafızası: ${e.message}`);
    }

    if (ayarHatasi) {
      ayarHatasi.sonuclar = sonuclar;
      throw ayarHatasi;
    }
    return sonuclar;
  }

  return { adaylar, isle, ozet, simdi, ham: () => ham };
}

/**
 * Motor yokken yerel tur: karar bekleyen adaylar (gorulen'de kalıcı olmayanlar) işlenir; yazildi / elendi / havuzda olan her üye
 * gorulen'e işaretlenir (çoğu zaman akış bunu zaten yapmıştır, ??= ile bozulmaz), bekleyenler (puanlanamayan, düzeltmesi
 * cevapsız, payı dolan) işaretlenmez. Bugünkü davranışın aynısı. Turu durduran yapılandırma hatası ayarHatasi olarak döner
 * (eskiden de tur durur, durum yine yazılırdı).
 */
export async function yerelTur(uyarlayici, durum, { log } = {}) {
  const hepsi = await uyarlayici.adaylar({ ...(log ? { log } : {}) });
  const kimden = new Map(hepsi.map((a) => [a.kimlik, a.yuk.id]));
  let sonuclar;
  let ayarHatasi = null;
  try {
    sonuclar = await uyarlayici.isle(gorulmeyen(hepsi, durum), { ...(log ? { log } : {}) });
  } catch (e) {
    if (!Array.isArray(e?.sonuclar)) throw e;
    sonuclar = e.sonuclar;
    ayarHatasi = e;
  }
  const zaman = (uyarlayici.simdi ?? new Date()).toISOString();
  for (const s of sonuclar) {
    const kararli = s.durum === 'yazildi' || s.durum === 'elendi' || (s.durum === 'bekliyor' && s.havuzda);
    const id = kimden.get(s.kimlik);
    if (kararli && id) durum.gorulen[id] ??= { zaman };
  }
  return { sonuclar, ayarHatasi };
}
