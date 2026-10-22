// Katman 3 (Gemini kota planı): tur başına giriş-token tavanı. Ücretsiz katmanda ana model (Flash Lite) dakikada
// 250 bin giriş tokenı alır. Bot çağrıları en az GEMINI_ARALIK_MS arayla sıralı yapar; bir tur en çok BUTCE_MS
// (18 dk) sürer. Tavan = TPM × tur dakikası × PAY_ORANI (%20 elle çalıştırma ve sürprizler için kalır).
// Sıradaki işin tahmini girişi (karakter / 4) tavanı aşacaksa iş sonraki tura kalır. Harcanan, Gemini yanıtlarındaki
// gerçek promptTokenCount toplamıdır (kullanim.mjs). Bülten bu tavandan muaftır.
import { PAY_ORANI } from './butce.mjs';

export const TPM_SINIRI = 250_000;
export const TUR_DAKIKA = 18;
export const TUR_TOKEN_TAVANI = Number(process.env.GEMINI_TUR_TOKEN_TAVANI) || Math.floor(TPM_SINIRI * TUR_DAKIKA * PAY_ORANI);

export const tokenTahmini = (metin) => Math.ceil(String(metin ?? '').length / 4);

const KAYNAK_KARAKTER_AZAMI = 20_000; // yayin-kurulu.mjs: kontrol masasına en çok bu kadar kaynak gider
const SABIT = 2_500; // sistem istemi, kurallar, taslak ve çıktı payı (çağrı başına)
const HABER_CAGRISI = 3; // yazar + kontrol masası + (redaksiyon sonrası) ikinci kontrol; hepsi kaynağı taşır

const kaynakKarakteri = (o) => String(o.kaynakMetni ?? (o.adaylar ?? []).map((a) => a.kaynakMetni ?? '').join('\n'));

// Bir olayı yazmanın tahmini giriş tokenı.
export function olayTokenTahmini(o) {
  const kaynak = Math.min(kaynakKarakteri(o).length, KAYNAK_KARAKTER_AZAMI);
  return HABER_CAGRISI * (Math.ceil(kaynak / 4) + SABIT);
}

// Bir derleme grubunun (olay listesi) tahmini giriş tokenı: bütün kaynaklar birlikte gider.
export function derlemeTokenTahmini(grup) {
  const kaynak = Math.min(grup.reduce((t, o) => t + kaynakKarakteri(o).length, 0), KAYNAK_KARAKTER_AZAMI);
  return HABER_CAGRISI * (Math.ceil(kaynak / 4) + SABIT);
}

export const tokenTavaniAsildi = (tahmin, { harcanan = 0, tavan = TUR_TOKEN_TAVANI } = {}) => harcanan + tahmin > tavan;
