# finfolis: yurtdışı odaklı 3 saatlik bülten ve kısa haber akışı — tasarım

Tarih: 11 Ekim 2026. Önceki tasarım: `2026-10-11-haber-botu-design.md` (bot altyapısı bunun üzerine kurulur).

## Niyet ve neden

Site bugün cılız: bot yalnızca Fed/ECB/BoJ/TCMB duyuruları, SEC başvuruları ve kur hareketlerinden besleniyor, günde 8 haber tavanı var, bazı haberler (Fed tutanağı örneği) içeriksiz çıkıyor. Hedef, Türk okura **ABD, Avrupa ve Asya piyasalarını** Midas'ın "Midas'ın Kulakları" tarzında — lafı uzatmadan, net — anlatan, sürekli dolu bir yurtdışı finans haber sitesi.

Başarı: siteye giren biri her 3 saatte yeni bir bülten ve gün içinde çok sayıda kısa, rakamlı, kaynaklı haber görür; hiçbir haber "tutanaklar önemlidir çünkü tutanaktır" türü boş laf içermez.

## Hedefler

1. **3 saatlik bülten.** Her 3 saatte bir, son bültenden bu yana güvenilir kaynaklarda çıkan gelişmeleri tek bir yazıda toplar. Her bülten **ayrı bir yazıdır**.
2. **Kısa haber.** Büyük olaylar (merkez bankası kararı, büyük bilanço, önemli makro veri, büyük birleşme vb.) ayrıca kısa haber olarak yazılır.
3. **Çok kaynak.** RSS beslemesi listesi ciddi biçimde genişler; hacim kaynak kadardır, **günlük tavan yoktur** (kullanıcı kararı).
4. **İçerik dolu.** Başlık tek başına yetmez; açık kaynakların tam metni okunur.
5. **Telegram.** Hem 3 saatlik bültenler hem kısa haberler kanala gider (kullanıcı kararı).

## Hedef olmayanlar

- Türkiye piyasası ana odak değil (TCMB kaynağı kalabilir, ama içerik yurtdışı ağırlıklı).
- Yorum, analiz, köşe yazısı, tahmin yok.
- Anlık (dakikalık) fiyat verisi ve "piyasa tepkisi" satırı yok (değerlendirildi, şimdilik dışarıda).
- Ücretli kaynakların duvarını aşma, giriş yapma, kazıma yok.

## Karşı hedefler (teknik olarak çalışsa bile başarısızlık sayılır)

- Kaynakta olmayan rakam, tarih ya da alıntı içeren yayın.
- Kaynak metnin çevirisi/kopyası gibi okunan yazı (metin her zaman bizim Türkçe cümlelerimiz).
- Aynı olayın birden çok haber ya da bir bültende birden çok madde olarak çıkması.
- Genel geçer "neden önemli" lafı; içi boş, rakamsız haber.
- Yatırım tavsiyesi dili.

## Kısıtlar

- Mevcut boru hattı korunur: kaynak modülü → yazar (Gemini) → yayın kurulu (yapay zekâsız `dogrula` + Gemini kontrol masası + redaksiyon) → `yaziYaz` → GitHub Actions commit → Cloudflare derlemesi → Telegram. Kod `scripts/haberler/` altında, Türkçe adlandırmayla, bağımlılıksız (regex RSS ayrıştırıcıları `kaynaklar/ortak.mjs`).
- Model: Gemini (`gemini-flash-lite-latest`, `GEMINI_MODEL` ile değişebilir). Maliyet düşük; engel sayılmaz ama çağrı sayısı makul tutulmalı.
- **Para harcanmaz (kullanıcı kararı).** Cloudflare ve GitHub ücretsiz planlarında kalınır. Bu yüzden bot saatlik değil **3 saatte bir** çalışır (ayda ~240 derleme, ücretsiz kota içinde). Her çalıştırma tek commit atar; kısa haberler ve bülten aynı commit'tedir. `[skip ci]` commit'leri derleme tetiklemez. Plan, ücretsiz kotayı ve bu hesabı doğrulamalı.
- Windows'ta `npm install` Linux lockfile'ını bozuyor (@emnapi düşüyor); bağımlılık değişirse Cloudflare derlemesi kontrol edilir. Tercihen yeni bağımlılık eklenmez.
- Telegram: kanala yalnızca sitede yayına girmiş (200 dönen) yazı gider; şu an çalıştırma başına `AZAMI = 3`. Hacim artınca bu sınır yeniden ayarlanmalı (bkz. builder'a bırakılanlar).

## Kararlaşan "nasıl"

### Kaynaklar
- Yalnızca güvenilir kaynaklar. Açık RSS'i olan haber siteleri ve resmi kurumlar (Fed, ECB, BoJ, BoE, ABD BLS/BEA, Eurostat, mevcut SEC). Resmi olmayan kaynakların listesi repoda açık durmaz; şifreli tutulur (bkz. scripts/haberler/gizli.mjs).
- **Ücretli kaynak**: yalnızca RSS başlığı ve özeti kullanılır, sayfa çekilmez.
- **Açık kaynak**: makale sayfasının tam metni çekilir (bugünkü `govdeMetni` yaklaşımı). Sayfa alınamazsa RSS özetiyle devam.
- Her kaynak modülü bugünkü arayüzü kullanır: `{ ad, hent(ctx) }` → aday listesi (`id, baslik, tarih, onem, kategori, kaynakMetni, kaynaklar, …`). Ek alan: `bolge` (`abd | avrupa | asya | kuresel`) ve `ucretli` (boolean).

### Olay birleştirme (tekrar ayıklama)
- Aynı olayı anlatan adaylar tek "olay" altında toplanır; olayın kaynak metni üyelerin metinlerinin birleşimidir, `kaynaklar` hepsinin linkleridir.
- Yöntem builder'a bırakıldı (başlık benzerliği, Gemini ile gruplama ya da ikisi). Şart: aynı olay ne iki haber ne bir bültende iki madde olur; daha önce yazılmış bir olay yeni kaynakla tekrar gelirse yeni yazı açılmaz.

### 3 saatlik bülten (ayrı yazı)
- `tur: 'bulten'` yazısı. Başlık biçimi: `Piyasa bülteni · 11 Ekim 14:00` (İstanbul saati).
- Gövde: bölge başlıkları (`## ABD`, `## Avrupa`, `## Asya`, gerekirse `## Küresel`), altında olay başına **tek madde**: 1–2 net cümle, sonunda kaynak linki. Boş bölge yazılmaz.
- Bugünkü gösterge satırları (kurlar vb.) bültenin sonunda kısa bir bölüm olarak kalabilir; ana içerik maddelerdir.
- Her madde kendi olayının kaynak metnine karşı `dogrula` ile doğrulanır; doğrulanamayan madde bültenden düşer (bültenin tamamı düşmez).
- Ücretli ve tek kaynaklı olay yalnızca bülten maddesi olabilir; maddedeki rakam başlık/özette geçmek zorundadır.
- **Kapak:** mevcut kapak üreticisiyle yeni bir bülten kapağı: büyük saat ("14:00 bülteni"), altında o saatin öne çıkan 2–3 başlığı, tarih; sitenin kapak stilinde.
- Sitede bültenler ayrı yazılar olarak birikir; ana sayfada son bülten öne çıkar (yerleşim builder'a bırakıldı, mevcut tasarım diline uyar).

### Kısa haber
- Uzunluk: başlık + spot + gövdede 2–4 net cümle. **"## Neden önemli?" bölümü kaldırılır** (kullanıcı beğenmedi).
- Yerine:
  - **Rakam şeridi:** en fazla 3–4 rakam (açıklanan, önceki, varsa beklenti vb.), etiketli. Frontmatter'da yapılandırılmış alan (ör. `rakamlar: [{ etiket, deger }]`), sayfada haberin altında şerit olarak gösterilir. Her rakam kaynakta doğrulanır; doğrulanamayan rakam şeride girmez. Rakam yoksa şerit çıkmaz.
  - **Sırada satırı:** kaynakta geçen bir sonraki somut adım (ör. "Bir sonraki Fed toplantısı: 28-29 Ekim"). Yalnızca kaynakta tarih varsa; tarih uydurulmaz, yoksa satır çıkmaz. Frontmatter'da ayrı alan (ör. `sirada: { tarih, olay }`).
- Habere terfi kuralı: olay önemliyse **ve** içerik yeterliyse (resmi kaynak ya da en az bir açık kaynağın tam metni). Ücretli tek kaynaklı olay habere terfi etmez.
- Yayın kurulu aynen uygulanır; rakam şeridi ve sırada satırı da kesin kontrolden geçer.

### Zamanlama ve hacim
- Bot 3 saatte bir çalışır (bugünkü gibi). Günlük tavan (`GUNLUK_TAVAN = 8`) ve kaynak başına 2 sınırı kaldırılır ya da hacme göre büyütülür; sınır kaynakların ürettiği kadardır.
- Bir çalıştırmanın süresi workflow zaman aşımını (25 dk) aşmamalı; aşacaksa çalıştırma başına üretilecek haber sayısı builder tarafından sınırlanır (kalan adaylar sonraki çalıştırmaya kalır, kaybolmaz).

### Telegram
- 3 saatlik bültenler ve kısa haberler gönderilir. Bülten mesajı kapak + başlık + öne çıkan 2–3 madde + link.

## Benim kararlarım (kullanıcı açıkça söylemedi; itiraz edebilir)

- Bölgeler: ABD, Avrupa, Asya, artı birden çok bölgeyi ilgilendiren olaylar için Küresel.
- Bülten 7/24 her 3 saatte çalışır, ama son bültenden bu yana **en az 3 yeni olay** yoksa o çalıştırmada bülten yazılmaz (boş bülten yayınlanmaz).
- Habere terfi için "önemli" eşiği mevcut `onem` puanlamasının genişletilmesiyle belirlenir.
- Mevcut kategoriler (Piyasalar, Borsa, Döviz & Altın, Kripto, Ekonomi, Kişisel Finans) korunur; bültenler için "Bülten" görünümü/kategorisi eklenir.
- Ücretli kaynakta yalnızca başlık+özet; bu sayfaları hiç çekmemek hem hukuki hem teknik sadelik için.
- Habere terfi eden olay o çalıştırmanın bülteninde de tek madde olarak yer alır, kaynağı yerine bizim haberimize link verir; "en az 3 yeni olay" eşiğine sayılır. Telegram'a hem haber hem bülten gider (bülten mesajı maddeleri değil öne çıkanları özetlediği için tekrar sorun değil).
- Olay hafızası 48 saat: bu sürede aynı olaya yeni kaynak gelirse yeni yazı açılmaz. Gerçekten yeni gelişme (yeni belge ya da yeni rakam: karar sonrası tutanak, revize veri) yeni olaydır. Hafıza `gorulen.json` yanında kısa olay özetleri olarak tutulur, 48 saatten eskisi silinir.

## Builder'a bırakılanlar

- Kesin RSS listesi ve her beslemenin çalıştığının doğrulanması.
- Olay birleştirme yöntemi.
- Rakam şeridi ve sırada satırının frontmatter şeması ve sayfa bileşeni (mevcut tasarım diliyle).
- Bülten kapağının çizimi (`scripts/kapak/kapak.mjs`'e yeni bir tür).
- Ana sayfada son bültenin yerleşimi.
- Telegram çalıştırma başına sınırının yeni hacme göre ayarı.
- Mevcut 3 saatlik gösterge bülteninin yeni bültene nasıl eritileceği.
- Testler: mevcut `node --test` düzeni; her yeni kaynak için fixture'lı test, bülten ve rakam şeridi doğrulaması için test.
