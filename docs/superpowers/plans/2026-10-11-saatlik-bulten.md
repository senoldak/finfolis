# 3 Saatlik Bülten ve Kısa Haber Akışı Implementation Plan

> **Durum (2026-10-18):** Uygulandı.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botu, güvenilir yurtdışı RSS kaynaklarından olay toplayan, 3 saatte bir bölgelere ayrılmış bülten ve rakam şeritli kısa haber yayınlayan bir akışa dönüştürmek.

**Architecture:** Yeni genel RSS kaynak fabrikası çok sayıda beslemeyi aday listesine çevirir (`bolge`, `ucretli` alanlarıyla). Yeni `olaylar.mjs` adayları olaylara gruplar ve 48 saatlik olay hafızasıyla tekrarı keser. Orkestratör önemli+içerikli olayları kısa habere terfi ettirir, tüm olaylardan bülten yazar; mevcut yayın kurulu her ikisini de denetler.

**Tech Stack:** Node 22 ESM, `node:test`, Gemini (`lib.mjs` `gemini`), Astro 5 content collections, Satori/resvg kapak üreticisi (`scripts/kapak/kapak.mjs`), GitHub Actions, Cloudflare derlemesi.

**Spec:** `docs/superpowers/specs/2026-10-11-saatlik-bulten-design.md`

## Global Constraints

- Yeni npm bağımlılığı eklenmez (Windows lockfile/@emnapi sorunu). RSS/HTML ayrıştırma `kaynaklar/ortak.mjs` ile.
- Kod, adlar ve yorumlar Türkçe; mevcut dosyaların üslubu korunur.
- Bot 3 saatte bir çalışır (`cron: '47 */3 * * *'` aynen kalır); çalıştırma başına tek içerik commit'i.
- Günlük tavan yok: `GUNLUK_TAVAN` ve `KAYNAK_BASINA` kaldırılır.
- Bölgeler: `abd | avrupa | asya | kuresel`; başlıklar `## ABD`, `## Avrupa`, `## Asya`, `## Küresel`.
- Bülten başlığı: `Piyasa bülteni · 11 Ekim 14:00` (İstanbul saati, `Europe/Istanbul`).
- Bülten yalnızca son bültenden bu yana **en az 3 yeni olay** varsa yazılır; 7/24.
- Kısa haber: başlık + spot + 2–4 cümle gövde; "## Neden önemli?" yok.
- Rakam şeridi en fazla 4 rakam; doğrulanamayan rakam şeride girmez. Sırada satırı yalnızca kaynakta tarih varsa.
- Ücretli kaynak (`ucretli: true`) sayfası hiç çekilmez; yalnızca RSS başlığı+özeti. Ücretli tek kaynaklı olay habere terfi etmez.
- Olay hafızası 48 saat.
- Habere terfi eden olay bültende tek madde olarak kalır, linki bizim haberimize (`https://finfolis.com/haber/<slug>/`) gider.
- Kaynakta olmayan rakam/alıntı yayınlanmaz (`dogrula` + yayın kurulu her metinde).
- Ücretsiz planda kalınır; ücretli servis yok.

## Review Focus

1. **Bir besleme bozuk/erişilemez XML döner** → o kaynak atlanır, diğerleri çalışır, çalıştırma çökmez. (Task 1 testi)
2. **RSS özeti HTML/CDATA içerir veya boştur** → madde metni düz metin; özet boşsa başlıkla devam, rakam başlıkta yoksa madde rakamsız yazılır. (Task 1 testi)
3. **Aynı olay iki çalıştırmada farklı kaynaktan gelir** → ikinci çalıştırmada yeni yazı/madde açılmaz. (Task 2 testi)
4. **Gemini gruplama/yazma çağrısı başarısız olur** → gruplama her adayı tek olay sayar (tekrar riski kabul, çökme yok); bülten maddesi düşer, bülten kalan maddelerle ya da hiç yazılmaz. (Task 2 ve Task 4 testleri)
5. **İlk çalıştırmada yeni kaynaklar yüzlerce eski aday döker** → kaynak başına ilk çalıştırma sınırı (`FORSTE_GANG`) korunur, bülten ve haber sayısı patlamaz. (Task 5 testi)

---

### Task 1: Genel RSS haber kaynağı ve besleme listesi

**Files:**
- Create: `scripts/haberler/kaynaklar/rss-haber.mjs`
- Create: `scripts/haberler/kaynaklar/beslemeler.mjs`
- Create: `scripts/haberler/kaynaklar/rss-haber.test.mjs`
- Create: `scripts/haberler/kaynaklar/fixtures/acik-rss.xml`, `fixtures/acik-makale.html`, `fixtures/ucretli-rss.xml`
- Modify: `scripts/haberler/kaynaklar/merkez-bankalari.mjs` (adaylara `bolge`, `ucretli: false`)
- Modify: `scripts/haberler/kaynaklar/sec.mjs`, `kur-hareketi.mjs` (aynı alanlar; SEC `abd`, kur `kuresel`)

**Interfaces:**
- Produces: `rssHaberKaynagi({ ad: string, rss: string, bolge: Bolge, ucretli: boolean, kategori: string, onem?: number }) => { ad, hent(ctx) }`; aday ek alanları `bolge`, `ucretli`, `ozet` (RSS özeti, düz metin). `BESLEMELER: Array<Parameters<rssHaberKaynagi>[0]>` (`beslemeler.mjs`). `Bolge = 'abd'|'avrupa'|'asya'|'kuresel'`.

- [x] **Step 1: Write the failing tests** (`rss-haber.test.mjs`, mevcut `sahteFetch` kalıbıyla)
  - `açık kaynak: tam metin çekilir` — `kaynakMetni` makale fixture'ındaki bir cümleyi içerir; `bolge === 'abd'`, `ucretli === false`, `id === '<kod>:<özet>'`.
  - `ücretli kaynak: makale sayfası istenmez` — sahte fetch makale URL'si çağrılırsa test başarısız; `kaynakMetni === \`${baslik}\n${ozet}\``.
  - `makale alınamazsa özetle devam` — makale 500 → `kaynakMetni` özeti içerir.
  - `bozuk XML boş liste döner, hata fırlatmaz`.
  - `özet HTML/CDATA temizlenir` — `ozet` içinde `<` yok.
  - `7 günden eski kayıt atılır`.
- [x] **Step 2: Run to verify fail** — `node --test scripts/haberler/kaynaklar/rss-haber.test.mjs` → FAIL (modül yok).
- [x] **Step 3: Implement `rssHaberKaynagi`** — `rssOgeleri` + Atom ise `atomGirdileri`; açık kaynakta `htmlMetni(await hentMetin(url))` ve `merkez-bankalari.pencere` mantığıyla 15000 karakter; özet `metinTemizle(aciklama.replace(/<[^>]*>/g,' '))`; varsayılan `onem: 2`. `BESLEMELER`: şifreli kaynak listesi (bkz. scripts/haberler/gizli.mjs). Merkez bankası/SEC/kur adaylarına `bolge`/`ucretli` ekle.
- [x] **Step 4: Gerçek beslemeleri doğrula** — `node -e` ile her `BESLEMELER` URL'sini indirip öğe sayısını yazdır; 0 öğe veya hata verenleri listeden çıkar, aynı türden çalışan bir besleme ekle. Sonuç: her besleme ≥1 öğe.
- [x] **Step 5: Run tests** — `npm run test:bot` → PASS.
- [x] **Step 6: Commit** — `git commit -m "Genel RSS haber kaynağı ve yurtdışı besleme listesi"`

### Task 2: Olay gruplama ve 48 saatlik olay hafızası

**Files:**
- Create: `scripts/haberler/olaylar.mjs`, `scripts/haberler/olaylar.test.mjs`

**Interfaces:**
- Consumes: Task 1 aday alanları.
- Produces:
  - `Olay = { id: string, baslik: string, bolge: Bolge, onem: number, kategori: string, tarih: Date, adaylar: Aday[], kaynakMetni: string, kaynaklar: {ad,url}[], ucretliTek: boolean, icerikli: boolean }`
  - `olaylariGrupla(adaylar: Aday[], hafiza: HafizaKaydi[], { gemini }) => Promise<{ yeni: Olay[], bilinen: Aday[] }>`
  - `HafizaKaydi = { id: string, ozet: string, zaman: string }`; `hafizaGuncelle(hafiza, olaylar, simdi) => HafizaKaydi[]` (48 saatten eskiyi siler).
  - `icerikli` = adaylardan biri resmi kurum (merkez bankası/SEC/istatistik) ya da açık kaynak tam metni; `ucretliTek` = tüm adaylar `ucretli`.

- [x] **Step 1: Failing tests**
  - `aynı olayın iki adayı tek olay olur` — sahte gemini `{ gruplar: [[0,1],[2]] }` döner → 2 olay, ilkinin `kaynaklar.length === 2`, `kaynakMetni` iki metni de içerir, `onem` en yükseği.
  - `hafızadaki olayla eşleşen aday bilinen sayılır` — gemini aday 0'ı hafıza `id`'sine eşler → `yeni.length === 0`, `bilinen.length === 1`.
  - `gemini null dönerse her aday ayrı olay` (Review Focus 4).
  - `ucretliTek ve icerikli doğru hesaplanır`.
  - `hafizaGuncelle 48 saatten eskiyi siler`.
- [x] **Step 2: Run** — `node --test scripts/haberler/olaylar.test.mjs` → FAIL.
- [x] **Step 3: Implement** — tek Gemini çağrısı: numaralı aday başlıkları+ilk 300 karakter özet ve hafıza özetleri verilir; şema `{ gruplar: number[][], eslesen: { aday: number, hafiza: string }[] }`. İstem kuralı: aynı kurumun yeni belgesi/yeni rakamı (karar → tutanak, veri → revizyon) **yeni olaydır**. Geçersiz indeksler yok sayılır, gruplanmayan aday tek başına olay olur. Olay `id` = ilk adayın `id`'si.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** — `"Olay gruplama ve 48 saatlik olay hafızası"`

### Task 3: Kısa haber biçimi — rakam şeridi ve "Sırada"

**Files:**
- Modify: `scripts/haberler/yazar.mjs` (şema + istem), `yazar.test.mjs`
- Modify: `scripts/haberler/yayin-kurulu.mjs` (`butunMetin` şerit ve sıradayı da içerir), `yayin-kurulu.test.mjs`
- Modify: `scripts/haberler/lib.mjs` (`yaziYaz` frontmatter), `lib.test.mjs`
- Modify: `src/content.config.ts`, `src/pages/haber/[id].astro`
- Create: `src/components/RakamSeridi.astro`

**Interfaces:**
- Produces: yazı nesnesine `rakamlar?: { etiket: string, deger: string }[]` (≤4) ve `sirada?: { tarih: string, olay: string }`; frontmatter alanları `rakamlar`, `sirada` (aynı biçim, isteğe bağlı). `YAZI_SEMASI` bu iki alanı içerir (zorunlu değil).

- [x] **Step 1: Failing tests**
  - yazar: `yazarIstemi "Neden önemli" içermez ve 2-4 cümle ister`.
  - yayın kurulu: `şeritteki kaynakta olmayan rakam durdurur` — kaynakta olmayan `deger` ile `{dur}` ya da rakam şeritten düşer (seçim: **şeritten düşürülür**, haber durmaz); `sirada.tarih kaynakta yoksa sirada silinir`.
  - lib: `yaziYaz rakamlar ve sirada frontmatter'a yazılır`; yoksa alan yazılmaz.
- [x] **Step 2: Run** — `npm run test:bot` → FAIL.
- [x] **Step 3: Implement** — yazar istemi: gövde 2–4 cümle; `rakamlar` en fazla 4, yalnızca kaynakta geçen; `sirada` yalnızca kaynakta tarih varsa. Yayın kurulunda son kesin kontrolden sonra `rakamlar`ı `dogrula` ile tek tek süz, `>4` ise kes. Şema: `rakamlar: z.array(z.object({etiket: z.string(), deger: z.string()})).max(4).default([])`, `sirada: z.object({tarih: z.string(), olay: z.string()}).optional()`. `RakamSeridi.astro` gövdenin altında, kaynaklardan önce; mevcut tasarım tokenları (`DESIGN.md`).
- [x] **Step 4: Run** — `npm run test:bot` → PASS; `npm run build` → başarılı; mevcut haberler şeritsiz derlenir.
- [x] **Step 5: Görsel kontrol** — dev sunucuda örnek bir haber frontmatter'ına geçici `rakamlar` ekleyip sayfanın ekran görüntüsü; telefon genişliğinde taşma yok. Geçici değişikliği geri al.
- [x] **Step 6: Commit** — `"Kısa haber: rakam şeridi ve Sırada satırı, Neden önemli kaldırıldı"`

### Task 4: Bölgeli bülten ve bülten kapağı

**Files:**
- Modify: `scripts/haberler/bulten.mjs`, `bulten.test.mjs`
- Modify: `scripts/kapak/kapak.mjs` (yeni `bultenKapagi`), `scripts/kapak/ornekler.mjs`

**Interfaces:**
- Consumes: `Olay` (Task 2); her olaya orkestratörün eklediği isteğe bağlı `haberSlug`.
- Produces:
  - `bultenGerekli(olaySayisi: number) => boolean` (≥3).
  - `bultenYaz(olaylar: Olay[], piyasa, { gemini, simdi }) => Promise<{ yazi, anlik } | null>`
  - `bultenKapagi({ saat: string, tarih: string, basliklar: string[] }) ` (kapak türü, `kaynakKapagi` imza düzeninde).

- [x] **Step 1: Failing tests**
  - `başlık biçimi` — `simdi = 2026-10-11T11:00:00Z` → `Piyasa bülteni · 11 Ekim 14:00`.
  - `bölge başlıkları sırayla, boş bölge yok` — yalnızca abd ve asya olayları → gövdede `## ABD` önce `## Asya`, `## Avrupa` yok.
  - `olay başına tek madde, kaynak linkiyle`; `haberSlug` varsa link `https://finfolis.com/haber/<slug>/`.
  - `doğrulanamayan madde düşer, kalanlar yayınlanır` — sahte gemini bir maddede kaynakta olmayan rakam üretir.
  - `3'ten az geçerli madde kalırsa null`.
  - `göstergeler sonda kısa bölüm` — `## Göstergeler` son bölüm.
  - `bultenGerekli(2) === false`, `bultenGerekli(3) === true`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — tek Gemini çağrısı tüm olaylar için `{ maddeler: { olay: string, metin: string }[] }` (1–2 cümle, olay başına); her madde kendi olayının `kaynakMetni`ne karşı `dogrula` + tüm bülten için bir `kontrolMasasi` turu (sorunlu maddeler düşer, yeniden yazma yok). Kapak: üstte "14:00 bülteni" büyük, altında en yüksek `onem`li 3 olay başlığı, tarih; `cerceve` ve `piyasalar` kategorisi rengi. Eski `bultenGerekli(simdi, piyasa, onceki, …)` imzası ve gösterge eşiği kalkar.
- [x] **Step 4: Kapak örneği** — `ornekler.mjs`'e bülten örneği ekle, örnek PNG'yi üretip bak (taşma, kırpılma yok).
- [x] **Step 5: Run** — PASS.
- [x] **Step 6: Commit** — `"Bölgeli 3 saatlik bülten ve bülten kapağı"`

### Task 5: Orkestratörü yeni akışa bağla

**Files:**
- Modify: `scripts/haberler/hent-haberler.mjs`, `hent-haberler.test.mjs`

**Interfaces:**
- Consumes: Task 1–4'ün tümü.
- Produces: `durum.olaylar: HafizaKaydi[]` (`gorulen.json` içinde); `calistir()` sonucu `{ adet, bultenYazildi, yazilar, hatalar, durum }` aynı kalır.

- [x] **Step 1: Failing tests**
  - `tavan yok: 12 önemli içerikli olay 12 haber olur` (`MAKS_HABER` ayarlanmamışken çalıştırma bütçesi içinde).
  - `ücretli tek kaynaklı olay habere terfi etmez, bültende madde olur`.
  - `terfi eden olay bültende bizim linkimizle`.
  - `ikinci çalıştırmada aynı olay yeni kaynakla gelirse yazı açılmaz` (Review Focus 3).
  - `yeni kaynağın ilk çalıştırmasında yalnızca en yeni 2 aday` (Review Focus 5).
  - `bir kaynak hata fırlatırsa diğerleri işlenir` (Review Focus 1).
  - `çalıştırma bütçesi aşılınca kalan olaylar görülmedi kalır` — sahte saat 18 dakikayı geçince haber yazımı durur, kalan adaylar `gorulen`a yazılmaz.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — kaynaklar: mevcut üç + `BESLEMELER.map(rssHaberKaynagi)`; `GUNLUK_TAVAN`, `KAYNAK_BASINA` kaldır; `MAKS_HABER` varsayılanı sınırsız (ortamda verilirse uygulanır); `ipucu.onemArtir` korunur. Akış: adaylar → `olaylariGrupla` → terfi (`onem >= 4 && icerikli && !ucretliTek`) → her terfi için yazar+kurul+`yaziYaz` (`rakamlar`, `sirada` dahil), olaya `haberSlug` → `bultenGerekli(yeni.length)` ise `bultenYaz` → `hafizaGuncelle`. Bütçe: `BUTCE_MS = 18 * 60_000` (workflow zaman aşımı 25 dk). Bülten yazılınca bültene giren olayların adayları `gorulen`a işlenir; bülten yazılmadıysa (eşik altı) adaylar görülmedi kalır ve sonraki çalıştırmada birikir.
- [x] **Step 4: Run** — `npm run test:bot` → PASS.
- [x] **Step 5: Kuru çalıştırma** — `node scripts/haberler/hent-haberler.mjs --kuru` gerçek beslemelerle: kaynak başına aday sayısı, çökme yok.
- [x] **Step 6: Commit** — `"Orkestratör: olay akışı, habere terfi, tavansız yayın"`

### Task 6: Telegram ve iş akışı

**Files:**
- Modify: `scripts/haberler/telegram.mjs`, `telegram.test.mjs`
- Modify: `.github/workflows/haberler.yml`

**Interfaces:**
- Consumes: yazıların `tur` frontmatter'ı.

- [x] **Step 1: Failing tests**
  - `bülten açıklaması öne çıkan 3 madde içerir` — `aciklamaYaz({ tur: 'bulten', maddeler: [...] , ...})` ilk 3 maddeyi `•` ile listeler, ≤1024 karakter.
  - `sec sınırı 10` — 15 gönderilmemiş yazıdan 10'u seçilir.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — `AZAMI = 10`; `yazilariOku` `tur` ve bülten gövdesindeki ilk 3 madde satırını okur. Workflow: `git add` satırına değişiklik gerekmiyorsa dokunma; `timeout-minutes: 25` kalır.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Kota hesabı** — Cloudflare hesabındaki derleme kotasını kullanıcıya sor ya da panelden oku; ayda ~240 bot derlemesi + elle push'lar kotanın altında olmalı. Sonucu commit mesajına yaz.
- [x] **Step 6: Commit ve push** — `"Telegram: bülten mesajı, çalıştırma başına 10 yazı"`; push sonrası `workflow_dispatch` ile bir çalıştırma tetikle, Actions günlüğünde hata yok, Cloudflare derlemesi başarılı, sitede bülten ve en az bir kısa haber görünür.
