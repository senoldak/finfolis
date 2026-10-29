// ECB metin tonu: ECB'nin para politikası kararı açıklamaları, basın toplantısı giriş metinleri ve toplantı hesapları
// (accounts) yapay zekâyla okunur; PPK ve FOMC tonuyla aynı iki puan (ileri yön, mevcut duruş; −3 güvercin … +3 şahin).
// Metin İngilizcedir: alıntılar İngilizce ve birebir, gerekçe Türkçe. Doğrulama ve döngü src/lib/ppk-ton.mjs'ten.
// Ağ yok; çağrı scripts/veri/ecb-ton.mjs'te.

export const ISTEM_SURUMU = 1;

export const SISTEM = `Sen bir merkez bankası metin okuyucususun. Sana Avrupa Merkez Bankası'nın (ECB) İngilizce bir para politikası metni verilecek.
Yalnız bu metne dayan. Metin dışı bilgi, piyasa beklentisi, sonradan olanlar ya da kendi görüşün puana girmez.

İki puan ver, her biri -3 ile +3 arasında, 0,5'lik adımlarla:

1) ileri_yon: Metnin para politikasının SONRAKİ adımları için verdiği işaret.
  +3: faiz artırımı ya da ek sıkılaştırma açıkça işaret ediliyor.
  +1,5: sıkılaştırma yönünde eğilim; enflasyona yukarı yönlü riskler ağır basıyor.
  0: yön verilmiyor ya da iki yön dengeli; "data-dependent, meeting-by-meeting" dili.
  -1,5: gevşeme yönünde eğilim; ek indirimlerin uygun olabileceği ima ediliyor.
  -3: belirgin ve hızlı gevşeme açıkça işaret ediliyor.
  Bu toplantıda alınan karar da sonraki adımlar hakkında işarettir.
  ECB'nin kalıp cümleleri ("data-dependent and meeting-by-meeting approach", "not pre-committing to a particular rate path",
  "stands ready to adjust all of its instruments") hemen her metinde bulunur ve tek başına yön işareti değildir: metnin
  bir yöne eğilimi yalnız bunlara dayanıyorsa puan en çok ±0,5 olur.

2) durus: Metnin BUGÜNKÜ para politikası duruşunu nasıl tanımladığı.
  +3: duruşun belirgin biçimde sıkı olduğu ya da sıkılaştırıldığı açıkça söyleniyor ("sufficiently restrictive" vurgusu).
  +1: ılımlı sıkı duruş. 0: nötr ("neutral range", "well positioned"). -2: destekleyici/gevşek duruş.
  -3: duruşun belirgin biçimde gevşetildiği açıkça söyleniyor.

Kurallar:
- gerekce: 1-2 cümle, sade Türkçe, puanların nedeni. Yorum katma, metinde olmayan bir şey söyleme.
- alintilar: puanı en çok belirleyen 1-3 ifade. Metinden BİREBİR, İngilizce kopyala; çevirme, kısaltma, düzeltme, birleştirme yapma.`;

const TUR_ADI = {
  karar: 'ECB para politikası kararı basın açıklaması',
  aciklama: 'ECB basın toplantısı giriş metni (monetary policy statement)',
  hesap: 'ECB para politikası toplantısı hesabı (account)',
};

// Hesaptan modele giden kısım: para politikası değerlendirmesi ve kararı. Bölüm adı yoksa bütün metin; çok uzunsa kesilir.
const HESAP_BOLUM = /monetary policy (considerations|stance|decisions)|policy options/i;
export const HESAP_SINIR = 36_000;

export function tonMetni(belge) {
  const p = belge.paragraflar ?? [];
  if (belge.tur !== 'hesap') return p;
  const bolumler = Array.isArray(belge.bolumler) && belge.bolumler.length === p.length ? belge.bolumler : null;
  const secili = bolumler ? p.filter((_, i) => HESAP_BOLUM.test(bolumler[i] ?? '')) : p;
  const sonuc = [];
  let boy = 0;
  for (const par of secili.length ? secili : p) {
    if (boy + par.length > HESAP_SINIR) break;
    sonuc.push(par);
    boy += par.length + 2;
  }
  return sonuc;
}

export function istemKur(belge) {
  const metin = (belge.paragraflar ?? []).join('\n\n');
  return `Metin türü: ${TUR_ADI[belge.tur] ?? belge.tur}\nTarih: ${belge.tarih}\nBaşlık: ${belge.baslik}\n\n--- METİN ---\n${metin}\n--- METİN SONU ---`;
}

// Döngü ayarı: karar döngüyü başlatır, hesap ikinci metin, basın toplantısı metni ayrı tür (tür dengeli ortalama).
export const DONGU_AYARI = { ikinci: 'hesap', ekGruplar: { aciklama: 'aciklama' } };
