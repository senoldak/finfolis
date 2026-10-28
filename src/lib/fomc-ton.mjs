// FOMC metin tonu: Fed'in FOMC basın açıklamaları ve toplantı tutanakları yapay zekâyla okunur; PPK tonuyla aynı iki
// puan (ileri yön, mevcut duruş; −3 güvercin … +3 şahin). Metin İngilizcedir: alıntılar İngilizce ve birebir, gerekçe
// Türkçe. Doğrulama, döngü ve ton adı src/lib/ppk-ton.mjs'ten. Ağ yok; çağrı scripts/veri/fomc-ton.mjs'te.

export const ISTEM_SURUMU = 1;

export const SISTEM = `Sen bir merkez bankası metin okuyucususun. Sana ABD Merkez Bankası Federal Açık Piyasa Komitesi'nin (FOMC) İngilizce bir metni verilecek.
Yalnız bu metne dayan. Metin dışı bilgi, piyasa beklentisi, sonradan olanlar ya da kendi görüşün puana girmez.

İki puan ver, her biri -3 ile +3 arasında, 0,5'lik adımlarla:

1) ileri_yon: Metnin para politikasının SONRAKİ adımları için verdiği işaret.
  +3: faiz artırımı ya da ek sıkılaştırma açıkça işaret ediliyor.
  +1,5: sıkılaştırma yönünde eğilim; enflasyon riskleri ağır basıyor, indirimlerin durdurulabileceği vurgulanıyor.
  0: yön verilmiyor ya da iki yön dengeli; "verilere bağlı" dil.
  -1,5: gevşeme yönünde eğilim; ek indirimlerin uygun olabileceği ima ediliyor.
  -3: belirgin ve hızlı gevşeme açıkça işaret ediliyor.
  Bu toplantıda alınan karar da sonraki adımlar hakkında işarettir: indirim ve ek ayarlamalardan söz eden dil gevşeme yönündedir.
  Kalıp cümleler ("the Committee would be prepared to adjust the stance of monetary policy as appropriate if risks emerge" gibi)
  hemen her açıklamada bulunur ve tek başına zayıf bir işarettir: metnin bir yöne eğilimi yalnız bunlara dayanıyorsa puan en çok ±0,5 olur.
  Karşı oy (dissent) veren üyelerin yönü de işarettir ama ana kararın önüne geçmez.

2) durus: Metnin BUGÜNKÜ para politikası duruşunu nasıl tanımladığı.
  +3: duruşun belirgin biçimde sıkı olduğu ya da sıkılaştırıldığı açıkça söyleniyor.
  +1: "modestly restrictive" gibi ılımlı sıkı duruş.
  0: nötr ("neutral" düzeye yakın). -2: destekleyici/gevşek duruş. -3: duruşun belirgin biçimde gevşetildiği açıkça söyleniyor.

Kurallar:
- gerekce: 1-2 cümle, sade Türkçe, puanların nedeni. Yorum katma, metinde olmayan bir şey söyleme.
- alintilar: puanı en çok belirleyen 1-3 ifade. Metinden BİREBİR, İngilizce kopyala; çevirme, kısaltma, düzeltme, birleştirme yapma.`;

const TUR_ADI = { karar: 'FOMC basın açıklaması (policy statement)', tutanak: 'FOMC toplantı tutanağı (minutes)' };

// Tutanaktan modele giden kısım: katılımcıların görünüm ve politika görüşleri ile komitenin kararı. Bölüm adı yoksa
// bütün metin; çok uzunsa baştan kesilir (alıntı doğrulaması da bu kısma göre yapılır).
const TUTANAK_BOLUM = /participants'? views|committee policy action|policy outlook|monetary policy/i;
export const TUTANAK_SINIR = 36_000;

export function tonMetni(belge) {
  const p = belge.paragraflar ?? [];
  if (belge.tur !== 'tutanak') return p;
  const bolumler = Array.isArray(belge.bolumler) && belge.bolumler.length === p.length ? belge.bolumler : null;
  const secili = bolumler ? p.filter((_, i) => TUTANAK_BOLUM.test(bolumler[i] ?? '')) : p;
  const kaynak = secili.length ? secili : p;
  const sonuc = [];
  let boy = 0;
  for (const par of kaynak) {
    if (boy + par.length > TUTANAK_SINIR) break;
    sonuc.push(par);
    boy += par.length + 2;
  }
  return sonuc;
}

export function istemKur(belge) {
  const metin = (belge.paragraflar ?? []).join('\n\n');
  return `Metin türü: ${TUR_ADI[belge.tur] ?? belge.tur}\nTarih: ${belge.tarih}\nBaşlık: ${belge.baslik}\n\n--- METİN ---\n${metin}\n--- METİN SONU ---`;
}
