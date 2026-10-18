# finfolis — Kimlik Kılavuzu

> Sürüm 2 · 18 Ekim 2026. Sahibiyle adım adım, soru-cevapla kuruldu (kifobu ile aynı yöntem). Bu belge kimliğin tek
> kaynağıdır; `DESIGN.md` (bugünkü Isotype teması) yeni kimlik uygulanınca bu belgeye göre yeniden yazılacak.
> "Benim kararım" diye işaretli maddeler sahibin onayına açıktır.

## 1. Neden varız

Sahibin cümlesi:

> **Finfolis, finansal piyasaların karmaşıklığını çözen, yatırım kararlarını veriye dayalı içgörülerle güçlendiren bir
> analiz platformudur.**

Slogan bu cümlenin özüdür (sahibin kendi sözü):

> **Karmaşadan uzakta.**

finfolis bilgilendirir, karar okurundur: **yatırım tavsiyesi vermez.**

## 2. Ne olduğumuz

- **Bir analiz platformu:** hisse terminali değil, tüyo sayfası değil. Her rakam ne anlama geldiğiyle birlikte gelir.
- **Kime konuşuyoruz:** üçüne birden, eşit — bireysel yatırımcı, ekonomiyi anlamak isteyen meraklı okur, piyasayı
  zaten izleyen bilgili okur. Bu yüzden her sayfa **katmanlıdır:** başlık ve rakamın anlamı herkese, verinin derinliği
  (tablo, seri, kaynak) isteyene.
- **Sınırımız:** kardeş siteler (kifobu, tidsrost, jendume) ile aile görünümü kurulmaz; finfolis kendi dilini konuşur.

## 3. Kişilik

Sahibinin seçimi: **öğretici ve sıcak.**

| Özellik | Anlamı |
|---|---|
| **Sabırlı öğretmen** | Terimi açıklar, okuru yargılamaz; "bunu bilmen gerekirdi" tonu yoktur. |
| **Sıcak** | Soğuk kurum dili değil; okura yanında oturan biri gibi konuşur. |
| **Sakin** | Piyasa dalgalanması alarm değil, bilgidir. "Çakıldı", "uçuşa geçti" yok. |
| **Dürüst** | Her rakam tarihi ve kaynağıyla; örnek veri asla gerçekmiş gibi sunulmaz. |

## 4. Ses

- **Sıra:** ne oldu → neden önemli → kilit rakam ne → bu ne demek.
- **Rakam bağlamıyla:** "geçen aya göre", "yıllık", "bir yıl önce".
- **Sade Türkçe:** kısa cümle; terim ilk geçtiği yerde açıklanır.
- **Tavsiye yok:** getiri vaadi, al/sat/tut, hedef fiyat yok. Her yazının, veri ve hesaplayıcı sayfasının altında ve
  sayfa altında **Yasal Uyarı** durur: SPK III-37.1 Tebliği EK/3 uyarı notu birebir, altında tamamlayıcı uyarı
  (öneri/vaat değildir, doğruluk garantisi yok, veri gecikmeli olabilir, sorumluluk reddi). Tebliğin 79. maddesi gereği
  metinle aynı yazı karakteri ve puntoda, dikkat çekici biçimde, metnin sonunda (`src/lib/yasal-uyari.mjs`,
  `YasalUyari.astro`; EK/3 metnine dokunulmaz).
- **Kaynak kuralı:** resmî olmayan haber kaynaklarının adı anılmaz, bağlantısı verilmez (bkz. `AGENTS.md`).
  Resmî kurumlar (TCMB, TÜİK, Fed, ECB, SEC…) anılır.

## 5. İşaret

**Abaküs.** Kökeni sahibin amaç cümlesindeki 🧮. Çerçevesiz dört yatay tel; her telde boncuklar.

- **Soldaki boncuklar mürekkep:** üstten alta 3, 2, 1, 0.
- **Sağdaki boncuklar gri:** üstten alta 1, 2, 3, 4. Sağ üstteki tek boncuk vurgu yerinde **pişmiş toprak** olabilir
  (kapaklarda büyük soluk abaküste öyledir); küçük işarette gri kalır. *Benim kararım.*
- **Anlamı:** boncuk saymak = karmaşayı düzene sokmak. Koyu boncuklar sayılmış ve anlaşılmış olandır.
- **Geometri** (120 birimlik kare): teller y = 24, 48, 72, 96, x = 10–110; boncuk yarıçapı 8, aralık 17
  (sol sütun x = 18, 35, 52; sağ sütun x = 100, 83, 66, 49).
- **Yapılmaz:** daire, oval ya da kare çerçeve içine almak; boncukları oval/köşeli yapmak; boncuklarla harf yazmak;
  döndürme, gölge, kontur, degrade.
- Eski f monogramı (`brand/finfolis-mark.svg`) emekliye ayrılır.
- Kesinleştirmeden önce TÜRKPATENT'te benzerlik araması yapılmalı.

## 6. Logo

- İşaret solda, **"finfolis"** sağda: küçük harf, Bricolage Grotesque 600, sıkı harf aralığı. *Benim kararım.*
- **Dikey düzen** (profil, baskı): işaret üstte, "finfolis" ortada, slogan altta.

## 7. Renk

İki ayrı sistem vardır ve karıştırılmaz.

**Marka renkleri**

| Ad | Hex | Kullanım |
|---|---|---|
| Kâğıt | `#f4f3ee` | Site ve kapak zemini |
| Mürekkep | `#1b1b1b` | Metin, işaretin koyu boncukları |
| **Pişmiş toprak** | `#c2502b` | **Tek marka rengi:** üst bant, kategori etiketi, vurgu boncuğu, "bu ne demek" altı çizgisi |
| Boncuk grisi | `#cfccc2` | İşaretin gri boncukları, "önceki" değer boncukları |
| Soluk | `#e4e1d7` | Kapaktaki büyük abaküs, ayraçlar |
| Gri | `#5d5b55` | İkincil metin, tarih ve kaynak satırı |

**Veri renkleri** (markaya değil veriye aittir)

| Ad | Hex | Kullanım |
|---|---|---|
| Yükseliş yeşili | `#3f7350` | ▲ yükseliş |
| Düşüş kırmızısı | `#a3243b` | ▼ düşüş — pişmiş topraktan ayrı dursun diye daha koyu ve soğuk. *Benim kararım.* |

- Yeşil ve kırmızı hiçbir zaman tek başına anlam taşımaz; yön her zaman okla (▲ ▼) da yazılır.
- Pişmiş toprak hiçbir zaman veri rengi olarak kullanılmaz.
- Eski Isotype kategori renkleri (mavi, hardal, kahve) kalkar; kategori adı pişmiş toprakla yazılır. *Benim kararım.*

## 8. Yazı

- **Tek aile: Bricolage Grotesque** (SIL OFL, kendi sunucumuzda). Fark kalınlık, boyut ve optik boyla kurulur.
- Başlık 700, büyük rakam 700, ara başlık 600, metin 400, etiket 600 büyük harf ve geniş aralık.
- Eşit genişlikli rakam yalnız alt alta hizalanan rakamlarda (tablolar, karne).
- **₺ simgesi** TCMB çizimine göre denetlenir; uymuyorsa kifobu'daki gibi yazı tipinin içine yeniden çizilir
  (`kifobu/scripts/marka/tl-simgesi.py` yöntemi).

## 9. Veri dili

**Boncuk sırası** (Isotype piktogramlarının yerine):

- Bir boncuk sabit bir miktardır; açıklaması bloğun altında: "● = ₺2", "● = 3 puan".
- Boncuklar 10'arlı tellere dizilir; teller alt alta durur, her gösterge küçük bir abaküse döner.
- **Bugün mürekkep, bir yıl önce gri.** Son boncuk kesirliyse kısmen çizilir.

**Rakamlar**

- Görsel, kapak, tablo ve göstergede simge önde, boşluksuz: **₺41,23**, **$200 milyon**. Düz metinde birim arkada:
  **41,23 TL**. İkisi aynı yerde kullanılmaz (TCMB kuralı).
- Her rakam tarih ve kaynakla: "18 Ekim 2026 · TCMB".
- Yüzde ve değişim okla: **▲ %0,25**, **▼ %1,08**.
- Kapakta SEC belgesinden ayrıştırılmış rakam gösterilmez.

## 10. Görüntü

Fotoğraf yok, illüstrasyon yok, doku yok. finfolis rakam, boncuk ve tipografiyle konuşur.

## 11. Uygulamalar

| Uygulama | Düzen |
|---|---|
| **Haber kapağı** (1200×675) | Kâğıt zemin; sağdan taşan **soluk büyük abaküs** (yalnız sağ üst boncuk pişmiş toprak); sol üstte kategori, pişmiş toprak büyük harf; başlık Bricolage 700 (~80 px), abaküsün solunda kalır; sol altta "finfolis" |
| **Gösterge kapağı** | Aynı çerçeve; "KATEGORİ · GÖSTERGE", gösterge adı, çok büyük rakam (₺ önde), altında okla değişim (veri rengi), sağ altta "tarih · kaynak" |
| **Karne kapağı** | Aynı çerçeve; satır satır ad ve okla yüzde, ince ayraçlar, sağ altta tarih aralığı |
| **Site** | Mevcut sayfalar kimliğe **uydurulur, yeni blok eklenmez**: aynı bölümler, metinler ve sıra. Piktogram sıraları boncuk sırasına döner |
| **Profil fotoğrafı** | Pişmiş toprak zemin, kâğıt rengi boncuklar (gri boncuklar zeminin açık tonu `#e39a80`), tam işaret |
| **Kapak görseli** (X 1500×500; Facebook 1640×624; LinkedIn 1128×191) | Kâğıt zemin; logo ve altında slogan **ortada** (profil fotoğrafından ve mobil kırpmadan uzak); sağdan taşan soluk büyük abaküs, yalnız vurgu boncuğu pişmiş toprak. Başka satır yok |
| **Favicon** | Saydam zemin. 32 piksel ve altında **üç telli küçük işaret** (koyu 2·1·0, gri 1·2·3, iri boncuk, kalın tel); 33 piksel ve üstünde tam işaret |

## 12. Yapılmayacaklar

- Getiri vaadi, al/sat/tut önerisi, hedef fiyat.
- Örnek veya uydurma piyasa verisi; tarihsiz ya da kaynaksız rakam.
- Medya kuruluşu adı veya bağlantısı.
- Pişmiş toprağı veri rengi olarak kullanmak; yönü yalnız renkle söylemek.
- Fotoğraf, stok görsel, süs, doku, gölge, degrade.
- Mevcut sayfalara sorulmadan yeni blok eklemek.
