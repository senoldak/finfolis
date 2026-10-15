# finfolis haber botu: tasarım

Tarih: 2026-10-11 · Durum: sahibin cevaplarıyla güncellendi, onay bekliyor

## Amaç ve neden

finfolis bugün yalnızca elle girilen haberlerle ve **örnek** piyasa verisiyle çalışıyor. Bot, siteyi kendi kendine yaşayan bir finans yayınına çevirecek: dünyadaki önemli ekonomik gelişmeleri seçip Türkçe, sade, açıklayıcı haberler yazacak ve anasayfadaki göstergeleri gerçek (gecikmeli) veriyle güncelleyecek.

Okur geniş bir Türk kitlesi; amaç "ne oldu, neden önemli, rakam ne" sorusunu yanıtlamak (bkz. PRODUCT.md). Örnek olarak sahibin aklındaki haber türleri:

- yeni ETF'ler ve halka arzlar (IPO),
- ABD hisse haberleri, BIST haberleri (KAP'ın tamamı değil, önemli olanlar),
- her yeri etkileyen makro gelişmeler (ör. Japonya'da yen hareketi),
- siyasi olayların piyasa etkisi (ör. Brezilya seçim sonucunun Brezilya ETF'lerini etkilemesi).

## Hedefler

1. **Seçilmiş haberler:** günde birkaç (hedef 4–8) önemli gelişme; Bloomberg gibi dakika başı akış değil.
2. **3 saatlik piyasa bülteni:** her 3 saatte bir, son 3 saatin özetini veren tek bir toplu yazı (göstergelerin durumu + öne çıkan birkaç gelişme). Seçilmiş haberlerden ayrı.
3. **Gerçek gösterge verisi:** `src/data/piyasa.json` her çalışmada gerçek, gecikmeli veriyle güncellenir; anasayfa bandı ve çizelge buradan beslenir.
4. **Kapaklar:** her habere `scripts/kapak/kapak.mjs` ile çizilmiş kapak (gösterge, rakam ya da kategori kartı).
5. **Zamanlanmış çalışma:** tidsrost'taki gibi GitHub Actions + Cloudflare zamanlayıcı Worker; commit gelince Cloudflare siteyi yeniden derler.

## Kesin kurallar (anti-hedefler)

- **Asla sahte ya da örnek veri yayınlanmaz.** Gecikmeli veri olur; uydurma, tahmini ya da "örnek" rakam olmaz. Bir veri çekilemezse ya son gerçek değer **tarihiyle** gösterilir ya da o gösterge gizlenir.
- **Haberdeki her rakam ve alıntı** resmi kaynaktan ya da piyasa verisinden gelir ve kaynakta doğrulanır. Doğrulanamayan haber yayınlanmaz (tidsrost'taki "stopp" mantığı).
- **Haber ajansı RSS'leri yalnızca olay yakalamak (ipucu) için** okunur. Ajans metni kopyalanmaz, çevrilip yayınlanmaz; rakam ajans metninden alınmaz. Olayın kendisi resmi kaynak/piyasa verisiyle doğrulanamıyorsa haber yazılmaz.
- Yatırım tavsiyesi verilmez; "al/sat", hedef fiyat, getiri vaadi yok. Sitedeki uyarı her yazıda durur.
- Dakika başı akış, clickbait başlık, abartı dili yok.

## Kaynaklar

Üç katman; botun her haber için en az birinci ya da ikinci katmandan doğrulama bulması gerekir.

1. **Resmi kaynaklar (olgu):** merkez bankaları (Fed, ECB, BoJ, TCMB) duyuruları ve verileri; SEC EDGAR (halka arz başvuruları S-1/F-1, ETF başvuruları ve listelemeler); KAP (yalnızca önemli bildirim türleri: halka arz, sermaye artırımı, birleşme/devralma, büyük ihale/sözleşme, temettü, pay geri alımı, finansal tablo); TÜİK, ABD BLS/BEA gibi istatistik kurumları; seçim gibi siyasi olaylarda resmi seçim kurulu sonuçları.
2. **Piyasa verisi (rakam):** kurlar, endeksler, emtia, ETF/hisse fiyatları; gecikmeli ücretsiz kaynaklardan. Kaynak ve zaman damgası her rakamla saklanır.
3. **Haber ajansı RSS'leri (ipucu):** yalnızca "neler oluyor" listesi; olay adayı üretir, olgu üretmez.

Kesin kaynak listesi (hangi API, hangi RSS, lisans ve kullanım şartları) uygulama planında belirlenecek; her kaynak tidsrost'taki gibi `kilder/` altında ayrı modül olur ve lisansı/kullanım şartı modül başında yazılır.

## Yapı (tidsrost'u temel alarak)

- `scripts/haberler/` (tidsrost `scripts/nyheter` karşılığı): `hent-haberler.mjs` (giriş), `lib.mjs`, `editor.mjs` (doğrulama ve dil), `kaynaklar/*.mjs`, `gorulen.json` (görülen olaylar, tekrar yazmamak için).
- **Yazar:** Gemini (tidsrost'taki gibi `GEMINI_API_KEY`), Türkçe, PRODUCT.md'deki sade ve açıklayıcı ses.
- **Editör aşaması:** yapay zekâsız kesin kontroller (rakam ve alıntılar kaynakta var mı), kontrol masası, en fazla 2 düzeltme turu, Türkçe redaksiyon, son kesin kontrol. Kalan uydurma rakam = yayın yok.
- **Seçim:** adaylar kaynaklar arasında dengeli ve önem puanına göre seçilir; bir çalışmada en fazla birkaç haber.
- **Bülten:** her 3 saatte bir ayrı bir yazı türü; göstergeler `gostergeKapagi`/`rakamKapagi` ile kapaklanır.
- **Gösterge verisi:** her çalışmada `src/data/piyasa.json` yeniden yazılır; `ornek` alanı kalkar, her göstergeye `kaynak` ve `zaman` eklenir; site çekilemeyen göstergeyi gizler.
- **Çalıştırma:** `.github/workflows/haber-botu.yml` (ubuntu, `npm ci`, sharp kapaklar için) ve ayrı bir zamanlayıcı Worker (tidsrost `tidsur` karşılığı). Durum dosyası değiştiyse `[skip ci]`.

## Yayına geçişte temizlik

Bot ilk gerçek verilerle çalıştığında: sitedeki örnek haberler (`ornek-*`, `finfolis-yayinda` hariç) kaldırılır, `piyasa.json` gerçek veriye geçer, "Örnek veri" etiketi koddan da kalkar (artık gerekmez), `scripts/kapak/ornekler.mjs` geliştirici aracı olarak kalabilir ama örnek rakamlar sitede görünmez.

## Sahibin kararları

- **Doğrudan yayın:** bot onay beklemeden yayınlar; güvenlik tamamen editör aşamasındaki kesin kontrollere ve "doğrulanamazsa yayınlama" kuralına dayanır. Bu yüzden kesin kontroller sıkı tutulur (her rakam kaynak verisinde birebir aranır).
- **Tamamen ücretsiz veri:** ücretli servis ya da anahtar isteyen servis (EVDS dahil) yok. Yalnızca ücretsiz ve yeniden yayınlanmasına izin veren kaynaklar; izin vermeyen kaynaktaki gösterge gizli kalır. Kaynak bulunamayan gösterge (ör. BIST 100) gerekirse ilk sürümde gizlenir.
- **Ayrı Gemini anahtarı:** finfolis'e ait anahtar, GitHub'da `GEMINI_API_KEY` Secret'ı olarak durur; koda ve repoya yazılmaz.

## Kararı uygulayıcıya bırakılanlar

- Kesin kaynak listesi ve hangi göstergelerin çekileceği (dolar/TL, euro/TL, gram altın, BIST 100, politika faizi, Brent, yıllık enflasyon bugün sitede).
- Önem puanlamasının ayrıntısı, bültenin tam biçimi, kategori eşlemesi.
- Zamanlama dakikası (tidsrost ile çakışmaması yeterli).

## Benim kararlarım (sahibin onayına açık)

- tidsrost mimarisi ve Gemini birebir örnek alınır.
- Seçilmiş haber hedefi günde 4–8.
- Veri çekilemezse son gerçek değer tarihiyle gösterilir; tazelik sınırı göstergeye göre ayrı (kur ve endeks saatler, enflasyon ve politika faizi bir sonraki açıklamaya kadar geçerli).
- Bülten her 3 saatte bir; piyasaların kapalı olduğu gece/hafta sonu saatlerinde ve rakamlar anlamlı değişmediyse atlanır. Haberlerle aynı içerik koleksiyonunda bir `tur: bulten` alanıyla durur, anasayfada kendi yerinde gösterilir ve seçilmiş haberleri listeden itmez.
- Siyasi/olay haberlerinde zaman sırası yazılabilir ("seçimin ardından ETF %x düştü"); neden-sonuç ancak resmi bir kaynak söylüyorsa yazılır, o da atfedilerek.
- Örnek haberlerin ve "Örnek veri" etiketinin kaldırılması, bot ilk gerçek veriyle çalıştığında elle ve bir kerelik yapılır.
