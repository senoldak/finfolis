// PPK günü paketi: TCMB faiz kararından sonraki ilk turda tek bir derinlik yazısı (Gemini'siz şablon).
// Karar (faiz eski → yeni), karar metninin bir önceki karara göre değişen cümleleri (en çok değişen üçü birebir alıntı),
// metnin yapay zekâ ton okuması (varsa) ve dünya merkez bankaları arasındaki yer (reel faiz sırası, faz sayıları).
// Hepsi hazır veriden gelir: src/data/ppk-metinler.json, ppk-ton.json, dunya-faizleri.json (üretim scripts/veri/ içinde).
// Rakam ve alıntıların tamamı kaynakMetni'nde bulunur; yayın kurulunun kesin kontrolü (sablonKontrol) bunu doğrular.
//
// merkez-bankalari.mjs aynı kararı "TCMB politika faizini açıkladı" diye hemen haberleştirir (karar metninden, ilk tur).
// Bu kaynak onunla yarışmaz, ondan sonra gelen ikinci, farklı açılı yazıdır: kimlik öneki "tcmb:" değildir (içerik türü
// "resmi" etiketi almaz, çünkü yazı kısmen finfolis'in kendi okumasıdır), başlığı başka kelimeyle başlar (tekrar.mjs
// başlık eşleşmesi tutmaz) ve özet alanı taşımaz. Kapağı politika faizi grafiği değil, ton serisidir (aynı resim iki habere çıkmaz).
// Karar metni geldiyse ton yoksa bile yazılır; ton bölümü o zaman hiç konmaz. Duyuru gününden sonraki 2 gün içinde aday olur.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cumleFarki } from '../../../src/lib/ppk-fark.mjs';
import { faizKarari } from '../../../src/lib/ppk-metin.mjs';
import { belgeListesi, donguler, tonAdi } from '../../../src/lib/ppk-ton.mjs';
import { grafikKapagi, rakamKapagi } from '../../kapak/kapak.mjs';
import { trSayi } from './ortak.mjs';

const VERI = (ad) => fileURLToPath(new URL(`../../../src/data/${ad}`, import.meta.url));
const GUN_MS = 86400000;
const TAZE_GUN = 2; // duyuru gününden sonra bu kadar gün daha aday olur
const SITE = 'https://finfolis.com/veri';
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const gun = (t) => `${Number(t.slice(8, 10))} ${AYLAR[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}`;
const ay = (d) => `${AYLAR[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

// ── Türkçe ekler (sayıdan sonra): 37'den, 36'ya, 37'de ──
const BIR = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ON = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const SESLI = 'aeıioöuü';
const SERT = 'çfhkpsşt';
function okunusSonu(s) {
  const [tam, kesir] = String(s).split(',');
  if (kesir) return BIR[Number(kesir.at(-1))];
  const n = Number(tam);
  if (n === 0) return 'sıfır';
  if (n === 100) return 'yüz';
  return n % 10 ? BIR[n % 10] : ON[(n / 10) % 10];
}
export function ek(sayi, tur) {
  const w = okunusSonu(sayi);
  const sonSesli = [...w].filter((c) => SESLI.includes(c)).at(-1);
  const kalin = 'aıou'.includes(sonSesli);
  const sesliBitis = SESLI.includes(w.at(-1));
  const d = SERT.includes(w.at(-1)) ? 't' : 'd';
  if (tur === 'yonelme') return `${sayi}'${sesliBitis ? 'y' : ''}${kalin ? 'a' : 'e'}`;
  if (tur === 'ayrilma') return `${sayi}'${d}${kalin ? 'an' : 'en'}`;
  return `${sayi}'${d}${kalin ? 'a' : 'e'}`; // bulunma
}

const isaretli = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${trSayi(Math.abs(n))}`;
const say = (n) => trSayi(Math.round(n * 100) / 100);
const kelimeSayisi = (s) => String(s).split(/\s+/).filter(Boolean).length;
const SIRA = (n) => `${n}.`;

const FAIZ_CUMLESI = /faiz oran/i;
const FAIZ_KARARI = /sabit|indiril|indirmiş|artırıl|artırmış|karar vermiştir/i;

// Değişen cümleler: faiz cümleleri hariç, en çok değişen üçü (belge sırasıyla).
export function enCokDegisenler(satirlar, adet = 3) {
  const adaylar = satirlar
    .filter((s) => s.tur !== 'ayni')
    .filter((s) => {
      const m = s.yeni ?? s.eski ?? '';
      return !(FAIZ_CUMLESI.test(m) && FAIZ_KARARI.test(m));
    })
    .map((s, sira) => ({
      s,
      sira,
      puan: s.tur === 'degisti' ? s.sozcukler.filter((p) => p.tur !== 'ayni').reduce((t, p) => t + kelimeSayisi(p.metin), 0) : kelimeSayisi(s.yeni ?? s.eski),
    }));
  return adaylar
    .sort((a, b) => b.puan - a.puan || a.sira - b.sira)
    .slice(0, adet)
    .sort((a, b) => a.sira - b.sira)
    .map((x) => x.s);
}

const maddeMetni = (s) => {
  if (s.tur === 'degisti') return `Önceki metin: “${s.eski}” Yeni metin: “${s.yeni}”`;
  if (s.tur === 'eklendi') return `Yeni metne eklenen cümle: “${s.yeni}”`;
  return `Önceki metinde yer alan ve yeni metinden çıkarılan cümle: “${s.eski}”`;
};

const KARAR_FIILI = { indirim: 'indirdi', artis: 'artırdı' };
const GECMIS_FIIL = { indirim: 'indirilmişti', artis: 'artırılmıştı' };

// Başlık: olgusal, "PPK ..." ile başlar (merkez-bankalari adayının "TCMB ..." başlığıyla eşleşmesin diye).
export function baslikKur(k) {
  const yeni = trSayi(k.yeni);
  const onceki = trSayi(k.onceki);
  const son = 'karar metninde neler değişti';
  if (k.karar === 'sabit') return `PPK politika faizini %${ek(yeni, 'bulunma')} sabit tuttu: ${son}`;
  return `PPK politika faizini %${ek(onceki, 'ayrilma')} %${ek(yeni, 'yonelme')} ${k.karar === 'indirim' ? 'indirdi' : 'yükseltti'}: ${son}`;
}

/**
 * Paket adayı. Girdi: { metinler, ton, dunya, simdi, goruldu }. Koşul yoksa null.
 *  metinler: ppk-metinler.json (dizi ya da { belgeler }), ton: ppk-ton.json ({ puanlar }), dunya: dunya-faizleri.json.
 */
export function ppkPaketiAdayi({ metinler, ton, dunya, simdi = new Date(), goruldu } = {}) {
  const belgeler = belgeListesi(metinler).belgeler;
  const kararlar = belgeler.filter((b) => b.tur === 'karar' && Array.isArray(b.cumleler) && b.cumleler.length).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const son = kararlar.at(-1);
  const onceki = kararlar.at(-2);
  if (!son || !onceki) return null;
  const bas = new Date(`${son.tarih}T14:00:00+03:00`).getTime();
  const bitis = new Date(`${son.tarih}T00:00:00+03:00`).getTime() + (TAZE_GUN + 1) * GUN_MS;
  if (simdi.getTime() < bas || simdi.getTime() >= bitis) return null;
  const id = `ppk-paketi:${son.id}`;
  if (goruldu?.(id)) return null;

  const k = faizKarari(son.cumleler);
  const ok = faizKarari(onceki.cumleler);
  if (!k || !ok) return null;

  const fark = cumleFarki(onceki.cumleler, son.cumleler);
  const o = fark.ozet;
  const yeniToplam = o.ayni + o.degisen + o.eklenen;
  const secilen = enCokDegisenler(fark.satirlar);

  // Ton (yoksa bölüm konmaz).
  const puanlar = ton?.puanlar ?? {};
  const puan = puanlar[son.id] ?? null;
  const dongu = donguler(belgeler, puanlar);
  const buDongu = dongu.find((d) => d.kararId === son.id);
  const oncekiDongu = dongu.find((d) => d.kararId === onceki.id);
  const tonVar = Boolean(puan && buDongu && buDongu.ileriYon != null);

  // Dünya (TCMB oranı bu kararla uyuşmuyorsa, yani BIS verisi geride ise, bölüm konmaz).
  const satirlar = dunya?.satirlar ?? [];
  const tr = satirlar.find((s) => s.kod === 'TUR');
  const reelliler = satirlar.filter((s) => s.reel != null).sort((a, b) => b.reel - a.reel);
  const dunyaVar = Boolean(tr && tr.reel != null && tr.faiz === k.yeni && reelliler.length >= 10);
  const faz = (f) => satirlar.filter((s) => s.faz === f).length;

  const baslik = baslikKur(k);
  const tarih = gun(son.tarih);
  const yeniS = trSayi(k.yeni);
  const oncekiS = trSayi(k.onceki);
  const bp = Math.round(Math.abs(k.yeni - k.onceki) * 100);

  // ── Paragraflar ──
  const p = [];
  const karaMetni =
    k.karar === 'sabit'
      ? `Para Politikası Kurulu (PPK), ${tarih} tarihli toplantısında politika faizi olan bir hafta vadeli repo ihale faiz oranını yüzde ${ek(yeniS, 'bulunma')} sabit tuttu.`
      : `Para Politikası Kurulu (PPK), ${tarih} tarihli toplantısında politika faizi olan bir hafta vadeli repo ihale faiz oranını yüzde ${ek(oncekiS, 'ayrilma')} yüzde ${ek(yeniS, 'yonelme')} ${KARAR_FIILI[k.karar]}; değişim ${bp} baz puan.`;
  const oncekiMetni =
    ok.karar === 'sabit'
      ? `${gun(onceki.tarih)} tarihli toplantıda faiz yüzde ${ek(trSayi(ok.yeni), 'bulunma')} sabit tutulmuştu`
      : `${gun(onceki.tarih)} tarihli toplantıda faiz yüzde ${ek(trSayi(ok.onceki), 'ayrilma')} yüzde ${ek(trSayi(ok.yeni), 'yonelme')} ${GECMIS_FIIL[ok.karar]}`;
  p.push(`${karaMetni} Kararın öncesinde, ${oncekiMetni}. Politika faizinin geçmişi [TCMB politika faizi](${SITE}/politika-faizi/) sayfasında.`);

  const sayim = [
    o.ayni ? `${o.ayni} cümlesi önceki metinle aynı` : null,
    o.degisen ? `${o.degisen} cümlesi değişmiş` : null,
    o.eklenen ? `${o.eklenen} cümlesi yeni eklenmiş` : null,
  ].filter(Boolean);
  const silindi = o.silinen ? ` Önceki metinden ${o.silinen} cümle çıkarılmış.` : '';
  let metinParagrafi = `Karar metni bir önceki toplantının metniyle cümle cümle karşılaştırıldığında, yeni metnin ${yeniToplam} cümlesinden ${sayim.join(', ')}.${silindi}`;
  if (secilen.length) {
    metinParagrafi += ` Faizi bildiren cümleler dışında, en çok değişen ${secilen.length === 1 ? 'cümle' : 'cümleler'} şunlar.`;
    p.push(metinParagrafi);
    for (const s of secilen) p.push(maddeMetni(s));
    p.push(`İki metin yan yana, değişen sözcükler işaretli olarak [PPK karar metni karşılaştırması](${SITE}/ppk-karar-metni/) sayfasında görülebilir.`);
  } else {
    p.push(`${metinParagrafi} Faizi bildiren cümleler dışında değişen cümle yok. İki metin [PPK karar metni karşılaştırması](${SITE}/ppk-karar-metni/) sayfasında yan yana görülebilir.`);
  }

  // Ton
  let tonKaynak = '';
  if (tonVar) {
    const ileri = buDongu.ileriYon;
    const alintilar = (puan.alintilar ?? []).slice(0, 2);
    let t = `finfolis'in yapay zekâ okumasına göre bu karar metninin ileri yön puanı ${isaretli(ileri)} (${tonAdi(ileri)}), mevcut duruş puanı ${isaretli(puan.durus)} (${tonAdi(puan.durus)}). Puanlar −3 ile +3 arasındadır; eksi değerler gevşeme yönünü, artı değerler sıkılaştırma yönünü gösterir.`;
    let fakat = '';
    if (oncekiDongu && oncekiDongu.ileriYon != null) {
      const d = Math.round((ileri - oncekiDongu.ileriYon) * 100) / 100;
      fakat = ` Önceki döngünün (${gun(onceki.tarih)} toplantısı ve özeti) ileri yön puanı ${isaretli(oncekiDongu.ileriYon)} (${tonAdi(oncekiDongu.ileriYon)}) idi; yeni okuma ${d === 0 ? 'ona eşit' : `${say(Math.abs(d))} puan ${d < 0 ? 'gevşeme' : 'sıkılaştırma'} yönünde`}.`;
      tonKaynak += ` Önceki döngü ileri yön ${isaretli(oncekiDongu.ileriYon)} (${tonAdi(oncekiDongu.ileriYon)}); fark ${say(Math.abs(d))} puan.`;
    }
    t += fakat;
    if (!buDongu.ozetId) t += ' Bu karar için toplantı özeti henüz yayımlanmadığından döngü puanı yalnızca karar metnine dayanıyor; özet yayımlandığında değişebilir.';
    p.push(t);
    if (puan.gerekce) p.push(`Okumanın gerekçesi şöyle: ${puan.gerekce}`);
    if (alintilar.length) p.push(`Puanı en çok belirleyen ${alintilar.length === 1 ? 'ifade' : 'ifadeler'} karar metninden birebir: ${alintilar.map((a) => `“${a.replace(/\s*[.…]+$/, '')}”`).join('; ')}.`);
    p.push(`Bu puan bir yapay zekâ okumasıdır, TCMB'nin değerlendirmesi değildir. Seri ve yöntem [PPK metin tonu](${SITE}/ppk-tonu/) sayfasında.`);
    tonKaynak = `İleri yön ${isaretli(ileri)} (${tonAdi(ileri)}), duruş ${isaretli(puan.durus)} (${tonAdi(puan.durus)}), puan aralığı −3 ile +3.${tonKaynak} Gerekçe: ${puan.gerekce ?? ''} Alıntılar: ${alintilar.join(' | ')}`;
  }

  // Dünya
  let dunyaKaynak = '';
  if (dunyaVar) {
    const sira = reelliler.findIndex((s) => s.kod === 'TUR') + 1;
    const tufe = tr.tufe ? `${ay(tr.tufe.donem)} yıllık TÜFE (yüzde ${trSayi(tr.tufe.deger)})` : 'son yıllık TÜFE';
    const gev = faz('Gevşeme');
    const sik = faz('Sıkılaştırma');
    const bek = faz('Beklemede');
    p.push(
      `Uluslararası karşılaştırmada, finfolis'in izlediği ${satirlar.length} ekonomi${reelliler.length === satirlar.length ? ' için' : `nin ${reelliler.length} tanesinde`} reel politika faizi hesaplanabiliyor. Reel faiz, politika faizinden yıllık TÜFE'nin çıkarılmasıyla bulunuyor. Türkiye'de ${tufe} esas alındığında reel faiz yüzde ${trSayi(tr.reel)} ile ${SIRA(sira)} sırada.`,
    );
    p.push(
      `Faz sınıflamasında, serideki en yeni tarihten geriye 6 ay içinde bir indirim varsa gevşeme, bir artırım varsa sıkılaştırma denir; hareket yoksa banka beklemede sayılır. Buna göre ${satirlar.length} bankadan ${gev} tanesi gevşeme, ${sik} tanesi sıkılaştırma fazında, ${bek} tanesi beklemede. Tablonun tamamı [dünya politika faizleri](${SITE}/dunya-politika-faizleri/) sayfasında.`,
    );
    dunyaKaynak = `Dünya politika faizleri tablosu (BIS, veri tarihi ${gun(dunya.referansTarih)}): ${satirlar.length} ekonomi, reel faizi hesaplanan ${reelliler.length}. Türkiye politika faizi yüzde ${trSayi(tr.faiz)}, ${tr.tufe ? `${ay(tr.tufe.donem)} yıllık TÜFE yüzde ${trSayi(tr.tufe.deger)}` : 'son yıllık TÜFE'}, reel faiz yüzde ${trSayi(tr.reel)}, reel faiz sırası ${sira}. Faz: gevşeme ${gev}, sıkılaştırma ${sik}, beklemede ${bek}; faz 6 ay penceresiyle belirlenir. Reel faiz politika faizinden yıllık TÜFE çıkarılarak bulunur.`;
  }

  const govde = p.join('\n\n');

  // Spot ve rakam şeridi
  const spot =
    k.karar === 'sabit'
      ? `PPK, politika faizini yüzde ${ek(yeniS, 'bulunma')} sabit tuttu. Karar metninin ${yeniToplam} cümlesinden ${o.degisen + o.eklenen} tanesi bir önceki toplantıya göre değişti.`
      : `PPK, politika faizini yüzde ${ek(oncekiS, 'ayrilma')} yüzde ${ek(yeniS, 'yonelme')} ${KARAR_FIILI[k.karar]}. Karar metninin ${yeniToplam} cümlesinden ${o.degisen + o.eklenen} tanesi bir önceki toplantıya göre değişti.`;
  const rakamlar = [
    { etiket: 'Politika faizi', deger: `%${yeniS}` },
    { etiket: 'Önceki faiz', deger: `%${oncekiS}` },
    { etiket: 'Değişen cümle', deger: `${o.degisen + o.eklenen} / ${yeniToplam}` },
  ];
  if (tonVar) rakamlar.push({ etiket: 'İleri yön puanı', deger: isaretli(buDongu.ileriYon) });
  else if (dunyaVar) rakamlar.push({ etiket: 'Reel faiz sırası', deger: SIRA(reelliler.findIndex((s) => s.kod === 'TUR') + 1) });

  // ── Kaynak metni (doğrulama): iki karar metninin tamamı + hesaplanan veriler ──
  const hesaplanan = [
    `Faiz kararı: yüzde ${oncekiS} → yüzde ${yeniS}, değişim ${bp} baz puan.`,
    `Cümle karşılaştırması: yeni metin ${yeniToplam} cümle; aynı ${o.ayni}, değişen ${o.degisen}, eklenen ${o.eklenen}, silinen ${o.silinen}. Değişen ve eklenen toplam ${o.degisen + o.eklenen}.`,
    tonKaynak.trim(),
    dunyaKaynak,
  ].filter(Boolean);
  const kaynakMetni = [
    `TCMB, Para Politikası Kurulu karar metni, ${tarih}: ${son.cumleler.join(' ')}`,
    `TCMB, Para Politikası Kurulu karar metni, ${gun(onceki.tarih)} (önceki): ${onceki.cumleler.join(' ')}`,
    ...hesaplanan,
  ].join('\n\n');

  // ── Kapak: ton serisi (ileri yön); yoksa faiz rakamı ──
  const seri = dongu.filter((d) => d.ileriYon != null).slice(-12).map((d) => ({ tarih: d.toplanti, deger: d.ileriYon }));
  let kapak;
  let kapakAlt;
  if (tonVar && seri.length >= 3) {
    kapak = grafikKapagi({
      kategori: 'piyasalar',
      ust: 'PPK metin tonu · ileri yön puanı',
      baslik,
      seri,
      vurgu: `Son okuma ${isaretli(buDongu.ileriYon)}`,
      ondalik: 1,
    });
    kapakAlt = `PPK karar metinlerinin yapay zekâ okumasında ileri yön puanı, son ${seri.length} toplantı: son okuma ${isaretli(buDongu.ileriYon)}`;
  } else {
    kapak = rakamKapagi({ kategori: 'piyasalar', ust: 'TCMB politika faizi', rakam: `%${yeniS}`, alt: 'PPK karar metni karşılaştırması' });
    kapakAlt = `TCMB politika faizi %${yeniS}`;
  }

  const kaynaklar = [
    { ad: `TCMB, PPK karar metni (${tarih})`, url: son.url },
    { ad: `TCMB, PPK karar metni (${gun(onceki.tarih)})`, url: onceki.url },
  ];
  if (dunyaVar) kaynaklar.push({ ad: 'BIS, merkez bankası politika faizleri', url: 'https://data.bis.org/topics/CBPOL' });

  return {
    id,
    baslik,
    tarih: new Date(bas),
    onem: 90,
    kategori: 'piyasalar',
    bolge: 'turkiye',
    ucretli: false,
    kaynakMetni,
    // Gemini'siz şablon yazı (esik-olaylari ile aynı yol): uyarlayici sablonKontrol'den geçirip yazar.
    sablonYazi: { baslik, spot, govde, rakamlar },
    kaynaklar,
    kapak,
    kapakAlt,
  };
}

async function oku(dosya) {
  return JSON.parse(await readFile(dosya, 'utf8'));
}

export default {
  ad: 'ppk-paketi',
  async hent(ctx = {}) {
    try {
      const metinler = ctx.ppkMetinler ?? (await oku(VERI('ppk-metinler.json')));
      // Ton ve dünya verisi yoksa ilgili bölüm konmaz; yalnız metin zorunludur.
      const ton = ctx.ppkTon ?? (await oku(VERI('ppk-ton.json')).catch(() => null));
      const dunya = ctx.dunyaFaizleri ?? (await oku(VERI('dunya-faizleri.json')).catch(() => null));
      const a = ppkPaketiAdayi({ metinler, ton, dunya, simdi: ctx.simdi ?? new Date(), goruldu: ctx.goruldu });
      return a ? [a] : [];
    } catch (e) {
      console.error(`[ppk-paketi] veri okunamadı: ${e.message}`);
      return [];
    }
  },
};
