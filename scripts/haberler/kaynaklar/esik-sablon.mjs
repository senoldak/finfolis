// Eşik olayı yazısı: Gemini'siz, doğrudan fiyat serisinden şablonla (karne.mjs gibi). Yalnızca rakam ve olgu yazılır;
// yorum, tahmin, beklenti ve yatırım tavsiyesi yoktur. Her rakam esik-olaylari.mjs'in kaynak metninde (kaynakMetni)
// bulunur; hent-haberler.mjs yazıyı yine de rakam doğrulaması ve standart süzgeciyle geçirir (yayin-kurulu.mjs sablonKontrol).
// Cümle kalıpları olay kimliğinin özetiyle seçilir: aynı olay hep aynı metni verir, farklı olaylar birbirine benzemez.
import { createHash } from 'node:crypto';

const GUN = 864e5;
const YIL = 365.25 * GUN;
const TR_AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trTarih = (iso) => `${Number(iso.slice(8, 10))} ${TR_AY[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const zaman = (iso) => Date.parse(`${iso}T00:00:00Z`);
const yuvarla = (n, o) => Math.round(n * 10 ** o) / 10 ** o;
const fark = (a, b) => yuvarla(((a - b) / b) * 100, 1);
const sayi1 = (v) => Math.abs(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
const yz = (v) => `yüzde ${sayi1(v)}`;
const sinyal = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}%${sayi1(v)}`;

// Aynı anahtar ve kimlik her zaman aynı kalıbı seçer.
const sec = (kimlik, anahtar, secenekler) => secenekler[parseInt(createHash('sha1').update(`${kimlik}|${anahtar}`).digest('hex').slice(0, 8), 16) % secenekler.length];

// Karne uyarısıyla aynı not (karne.mjs): geçmiş veri, öneri değil.
export const SABLON_UYARI = 'Geçmiş performans gelecekteki sonuçların göstergesi değildir; bu yazı yatırım tavsiyesi değildir.';

const TURETME = {
  bistusd: 'Dolar bazında BIST 100, BIST 100 endeksinin değerinin dolar/TL kuruna bölünmesiyle hesaplanır.',
  altingumus: 'Altın/gümüş oranı, ons altın fiyatının ons gümüş fiyatına bölünmesiyle hesaplanır.',
  btcaltin: 'Bitcoin/altın oranı, Bitcoin fiyatının ons altın fiyatına bölünmesiyle hesaplanır.',
};

// Son kapanışın dönemlere göre durumu: "yüzde 4,9 üzerinde" / "yüzde 1,2 altında" / "aynı düzeyinde".
const karsi = (v) => (v > 0 ? `son kapanış bunun ${yz(v)} üzerinde` : v < 0 ? `son kapanış bunun ${yz(v)} altında` : 'son kapanış bununla aynı düzeyde');
const konum = (v, tamlayan) => (v > 0 ? `${tamlayan} ${yz(v)} üzerinde` : v < 0 ? `${tamlayan} ${yz(v)} altında` : `${tamlayan} düzeyinde`);
const artisDusus = (v) => (v > 0 ? `${yz(v)} artış` : v < 0 ? `${yz(v)} düşüş` : 'sıfır');

// o: olaylariBul çıktısı, e: enstrüman tanımı, seri: günlük kapanışlar, d: değer biçimleyici (birim ekli), kimlik: aday kimliği.
export function sablonYazisi({ o, e, seri, baslik, d, kimlik }) {
  const son = seri.at(-1);
  const onceki = seri.at(-2);
  const r = o.referans;
  const t = zaman(son.tarih);
  const dd = (v) => `${d(v)}${e.birim === 'puan' ? ' puan' : ''}`;
  const ad = e.ad;
  const bugun = trTarih(son.tarih);
  const gunluk = fark(son.deger, onceki.deger);

  // Bağlam: bir hafta, bir ay, üç ay, yılbaşı, bir yıl, 12 aylık aralık (esik-olaylari.mjs baglamSatirlari ile aynı hesap).
  const geri = (gun) => [...seri].reverse().find((p) => zaman(p.tarih) <= t - gun * GUN);
  const donemler = [
    ['Bir hafta', 7],
    ['Bir ay', 30],
    ['Üç ay', 91],
  ]
    .map(([ba, gun]) => [ba, geri(gun)])
    .filter(([, p]) => p)
    .map(([ba, p]) => `${ba} önceki kapanış (${trTarih(p.tarih)}) ${dd(p.deger)} idi; ${karsi(fark(son.deger, p.deger))}.`);
  const yilBasi = [...seri].reverse().find((p) => p.tarih < `${son.tarih.slice(0, 4)}-01-01`);
  if (yilBasi) donemler.push(`Geçen yılın son kapanışı (${trTarih(yilBasi.tarih)}) ${dd(yilBasi.deger)} idi; ${karsi(fark(son.deger, yilBasi.deger))}.`);
  const yilOnce = seri.find((p) => zaman(p.tarih) >= t - YIL);
  const yil12 = seri.filter((p) => zaman(p.tarih) >= t - YIL);
  const tepe = yil12.reduce((a, p) => (p.deger > a.deger ? p : a));
  const dip = yil12.reduce((a, p) => (p.deger < a.deger ? p : a));

  // Olaya özgü iki bölüm: ilk paragraf (ne oldu), ikinci paragraf (eşiğin ayrıntısı), spot, rakam şeridi, tanım cümlesi.
  let spot, giris, ayrinti, tanim, serit;
  const sureAy = (yil) => (yil < 1 ? `${Math.floor(yil * 12)} ay` : `${Math.floor(yil)} yıl`);
  if (o.tur === 'rekor') {
    spot = `${ad}, ${bugun} kapanışında ${dd(son.deger)} ile tüm zamanların en yüksek günlük kapanışına ulaştı; önceki rekor ${dd(r.deger)} idi.`;
    giris = sec(kimlik, 'giris', [
      `${ad}, ${bugun} işlem gününü ${dd(son.deger)} seviyesinden tamamladı. Bu değer, günlük kapanış verisinin başladığı ${trTarih(seri[0].tarih)} tarihinden bu yana kaydedilen en yüksek kapanış.`,
      `${ad} ${bugun} günü ${dd(son.deger)} ile kapandı ve günlük kapanış verisinin başladığı ${trTarih(seri[0].tarih)} tarihinden bu yana en yüksek değere ulaştı.`,
      `${bugun} kapanışında ${ad} ${dd(son.deger)} seviyesine çıktı; bu seviye, veri serisinin başından beri görülen tüm zamanların en yüksek günlük kapanışı.`,
    ]);
    ayrinti = `Önceki rekor kapanış ${trTarih(r.tarih)} tarihinde ${dd(r.deger)} olarak kaydedilmişti. Yeni kapanış ${konum(fark(son.deger, r.deger), 'bu değerin')}.`;
    tanim = 'Rekor kapanış, günlük kapanış fiyatlarının veri serisindeki en yüksek değeridir; gün içinde görülen daha yüksek fiyatlar bu hesaba katılmaz.';
    serit = [['Son kapanış', dd(son.deger)], ['Önceki rekor', dd(r.deger)]];
  } else if (o.tur === 'yuksek' || o.tur === 'dusuk') {
    const yuksek = o.tur === 'yuksek';
    const s = yuksek ? 'yüksek' : 'düşük';
    spot = `${ad}, ${bugun} kapanışında ${dd(son.deger)} ile son ${o.yil} yılın en ${s} seviyesinde.`;
    giris = sec(kimlik, 'giris', [
      `${ad}, ${bugun} işlem gününü ${dd(son.deger)} seviyesinden tamamladı. Bu, son ${o.yil} yılın en ${s} günlük kapanışı.`,
      `${ad} ${bugun} günü ${dd(son.deger)} ile kapandı; bu değer yaklaşık ${o.yil} yılın en ${s} kapanış seviyesi.`,
      `${bugun} kapanışında ${ad} ${dd(son.deger)} seviyesinde bulundu ve son ${o.yil} yılın en ${s} değerini gördü.`,
    ]);
    ayrinti = o.veriBasi
      ? `Günlük kapanış verisi ${trTarih(o.veriBasi)} tarihinde başlıyor ve bu aralıkta daha önceki en ${s} kapanış ${trTarih(r.tarih)} tarihinde ${dd(r.deger)} olarak görüldü.`
      : `Bu seviyeye eşit ya da daha ${s} son kapanış ${trTarih(r.tarih)} tarihinde ${dd(r.deger)} olarak kaydedilmişti; yani aynı düzey yaklaşık ${o.yil} yıldır görülmemişti.`;
    tanim = `Seviye, günlük kapanış fiyatlarının karşılaştırılmasıyla belirlenir; gün içinde görülen daha ${s} fiyatlar bu hesaba katılmaz.`;
    serit = [['Son kapanış', dd(son.deger)], [yuksek ? 'Önceki zirve' : 'Önceki dip', dd(r.deger)]];
  } else if (o.tur === 'olagandisi') {
    const artis = o.yuzde > 0;
    const y = yuvarla(o.yuzde, 1);
    spot = `${ad}, ${bugun} günü bir önceki kapanışa göre ${yz(y)} ${artis ? 'yükselerek' : 'gerileyerek'} ${dd(son.deger)} seviyesinden kapandı.`;
    giris = sec(kimlik, 'giris', [
      `${ad}, ${bugun} günü bir önceki kapanışa göre ${yz(y)} ${artis ? 'yükseldi' : 'geriledi'} ve ${dd(son.deger)} seviyesinden kapandı. Bu, son ${sureAy(o.yil)} içindeki en sert günlük ${artis ? 'yükseliş' : 'düşüş'}.`,
      `${bugun} işlem gününde ${ad} ${yz(y)} ${artis ? 'artışla' : 'düşüşle'} ${dd(son.deger)} seviyesinde kapandı; son ${sureAy(o.yil)} içinde bu büyüklükte günlük ${artis ? 'yükseliş' : 'düşüş'} görülmemişti.`,
      `${ad} ${bugun} günü ${dd(son.deger)} seviyesinden kapanırken günlük değişim ${yz(y)} ${artis ? 'artış' : 'düşüş'} oldu; bu, son ${sureAy(o.yil)} içindeki en büyük günlük ${artis ? 'yükseliş' : 'düşüş'}.`,
    ]);
    ayrinti = `Bir önceki kapanış ${trTarih(r.tarih)} tarihinde ${dd(r.deger)} idi. ${
      o.onceGun
        ? `Aynı yönde ve en az bu büyüklükte son günlük hareket ${trTarih(o.onceGun.tarih)} tarihinde ${yz(yuvarla(o.onceGun.yuzde, 1))} ${artis ? 'artış' : 'düşüş'} olarak kaydedilmişti; bu, yaklaşık ${sureAy(o.yil)} öncesine denk geliyor.`
        : `Veri serisinin başladığı ${trTarih(seri[0].tarih)} tarihinden bu yana aynı yönde bu büyüklükte günlük hareket görülmemişti.`
    }`;
    tanim = 'Günlük değişim, bir işlem günü kapanışının bir önceki işlem günü kapanışına göre yüzde farkıdır; gün içindeki dalgalanmalar bu hesaba girmez.';
    serit = [['Son kapanış', dd(son.deger)], ['Önceki kapanış', dd(r.deger)]];
  } else if (o.tur === 'seri') {
    const yukari = o.yon === 'yukari';
    const toplam = fark(son.deger, o.baslangic.deger);
    spot = `${ad}, üst üste ${o.uzunluk} işlem günü ${yukari ? 'yükselerek' : 'gerileyerek'} ${dd(son.deger)} seviyesinden kapandı; bu dönemdeki toplam değişim ${artisDusus(toplam)}.`;
    giris = sec(kimlik, 'giris', [
      `${ad}, ${bugun} itibarıyla üst üste ${o.uzunluk} işlem günüdür ${yukari ? 'yükselişte' : 'düşüşte'}. Son kapanış ${dd(son.deger)}.`,
      `${ad} üst üste ${o.uzunluk}. işlem gününde de ${yukari ? 'bir önceki kapanışın üzerinde' : 'bir önceki kapanışın altında'} kapandı ve ${bugun} günü ${dd(son.deger)} seviyesine geldi.`,
      `${bugun} kapanışıyla ${ad}, ${o.uzunluk} işlem günü üst üste ${yukari ? 'yükselmiş' : 'gerilemiş'} oldu; son kapanış ${dd(son.deger)}.`,
    ]);
    ayrinti = `Seri ${trTarih(o.baslangic.tarih)} tarihindeki ${dd(o.baslangic.deger)} kapanışından sonra başladı; o günden bu yana toplam değişim ${artisDusus(toplam)}. ${
      o.onceki
        ? `Aynı yönde bu uzunlukta ya da daha uzun son seri ${trTarih(o.onceki.tarih)} tarihinde sona ermişti; o seri ${o.onceki.uzunluk} işlem günü sürmüştü ve yaklaşık ${sureAy(o.yil)} öncesine denk geliyor.`
        : `Veri serisinin başladığı ${trTarih(seri[0].tarih)} tarihinden bu yana aynı yönde bu uzunlukta başka bir seri görülmemişti.`
    }`;
    tanim = `Seri, her kapanışın bir önceki kapanıştan ${yukari ? 'yüksek' : 'düşük'} olduğu ardışık işlem günlerini sayar; hafta sonları ve tatil günleri sayıma girmez.`;
    serit = [['Son kapanış', dd(son.deger)], ['Seri başı', dd(o.baslangic.deger)], ['Seri boyunca', sinyal(toplam)]];
  } else if (o.tur === 'dusus') {
    const dusus = fark(son.deger, r.deger);
    spot = `${ad}, son 12 ayın en yüksek kapanışı olan ${dd(r.deger)} seviyesinin ${yz(dusus)} altında; son kapanış ${dd(son.deger)}.`;
    giris = sec(kimlik, 'giris', [
      `${ad}, ${bugun} işlem gününü ${dd(son.deger)} seviyesinden tamamladı. Bu değer, son 12 ayın en yüksek kapanışı olan ${dd(r.deger)} seviyesinin ${yz(dusus)} altında.`,
      `${ad} ${bugun} günü ${dd(son.deger)} ile kapandı ve son 12 aydaki zirve kapanışa (${trTarih(r.tarih)}, ${dd(r.deger)}) göre ${yz(dusus)} geride kaldı.`,
      `${bugun} kapanışında ${ad} ${dd(son.deger)} seviyesinde bulundu; son 12 ayın zirvesi ${trTarih(r.tarih)} tarihindeki ${dd(r.deger)} idi ve son kapanış bunun ${yz(dusus)} altında.`,
    ]);
    ayrinti = `Zirveye göre yüzde ${o.esik} düzeyindeki gerileme eşiği ${trTarih(o.asim.tarih)} tarihinde, ${dd(o.asim.deger)} kapanışıyla ilk kez aşıldı.${
      e.borsa
        ? ' Piyasada son zirveden yüzde 10 ya da daha fazla gerileme genellikle "düzeltme", yüzde 20 ya da daha fazlası "ayı piyasası" olarak adlandırılır.'
        : ''
    }`;
    tanim = 'Zirveden düşüş, son 12 aydaki en yüksek günlük kapanıştan son kapanışa yüzde farkıdır.';
    serit = [['Son kapanış', dd(son.deger)], ['Son 12 ayın zirvesi', dd(r.deger)], ['Zirveden', sinyal(dusus)]];
  } else {
    const yuk = fark(son.deger, r.deger);
    spot = `${ad}, son 12 ayın en düşük kapanışı olan ${dd(r.deger)} seviyesinin ${yz(yuk)} üzerinde; son kapanış ${dd(son.deger)}.`;
    giris = sec(kimlik, 'giris', [
      `${ad}, ${bugun} işlem gününü ${dd(son.deger)} seviyesinden tamamladı. Bu değer, son 12 ayın en düşük kapanışı olan ${dd(r.deger)} seviyesinin ${yz(yuk)} üzerinde.`,
      `${ad} ${bugun} günü ${dd(son.deger)} ile kapandı ve son 12 aydaki dip kapanışa (${trTarih(r.tarih)}, ${dd(r.deger)}) göre ${yz(yuk)} yukarıda.`,
      `${bugun} kapanışında ${ad} ${dd(son.deger)} seviyesinde bulundu; son 12 ayın dibi ${trTarih(r.tarih)} tarihindeki ${dd(r.deger)} idi ve son kapanış bunun ${yz(yuk)} üzerinde.`,
    ]);
    ayrinti = `Dibe göre yüzde ${o.esik} düzeyindeki yükseliş eşiği ${trTarih(o.asim.tarih)} tarihinde, ${dd(o.asim.deger)} kapanışıyla ilk kez aşıldı.${
      e.borsa ? ' Piyasada son dipten yüzde 20 ya da daha fazla yükseliş genellikle "boğa piyasası" olarak adlandırılır.' : ''
    }`;
    tanim = 'Dipten yükseliş, son 12 aydaki en düşük günlük kapanıştan son kapanışa yüzde farkıdır.';
    serit = [['Son kapanış', dd(son.deger)], ['Son 12 ayın dibi', dd(r.deger)], ['Dipten', sinyal(yuk)]];
  }

  const gunAcilis = sec(kimlik, 'gun', [
    `Bir önceki işlem günü kapanışı ${dd(onceki.deger)} idi (${trTarih(onceki.tarih)}); günlük değişim ${artisDusus(gunluk)}.`,
    `Önceki kapanış ${trTarih(onceki.tarih)} tarihinde ${dd(onceki.deger)} olarak kaydedilmişti; son işlem gününde değişim ${artisDusus(gunluk)} oldu.`,
  ]);
  const baglam = [gunAcilis, ...donemler].join(' ');
  const yillikDeg = fark(son.deger, yilOnce.deger);
  const aralik = `Bir yıl önceki kapanış (${trTarih(yilOnce.tarih)}) ${dd(yilOnce.deger)} idi; son bir yılda değişim ${artisDusus(yillikDeg)}. Son 12 ayın en yüksek kapanışı ${trTarih(tepe.tarih)} tarihinde ${dd(tepe.deger)}, en düşük kapanışı ${trTarih(dip.tarih)} tarihinde ${dd(dip.deger)} olarak kaydedildi. Son kapanış, ${konum(fark(son.deger, tepe.deger), '12 aylık zirvenin')} ve ${konum(fark(son.deger, dip.deger), '12 aylık dibin')}.`;
  const turetme = e.turet && TURETME[e.turet] ? ` ${TURETME[e.turet]}` : '';
  const not = `${tanim}${turetme} Değerler günlük kapanış fiyatlarıdır; yüzdeler kapanıştan kapanışa hesaplanır ve ilk ondalığa yuvarlanır. Dönem karşılaştırmalarında tarihi hafta sonuna ya da tatile denk gelen günler için en yakın önceki işlem günü kapanışı esas alınmıştır. ${SABLON_UYARI}`;

  const govde = [giris, ayrinti, baglam, aralik, not].join('\n\n');
  const rakamlar = [
    ...serit,
    ['Günlük değişim', sinyal(gunluk)],
    ['Yıllık değişim', sinyal(yillikDeg)],
  ]
    .slice(0, 4)
    .map(([etiket, deger]) => ({ etiket, deger }));
  return { baslik, spot, govde, rakamlar };
}
