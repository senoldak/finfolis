# finfolis Kimlik v2 Uygulama Planı

> Steps use checkbox (`- [ ]`) syntax for tracking. Yöntem kifobu'daki planla aynı
> (`kifobu/docs/superpowers/plans/2026-10-18-kifobu-kimlik-uygulama.md`).

**Goal:** `BRAND.md` (Kimlik v2) kararlarını sitede, kapaklarda ve marka dosyalarında uygulamak; içerik, yapı ve veri
akışı değişmeden.

**Architecture:** Önce ortak temel (Bricolage Grotesque + TCMB ₺, renk belirteçleri, abaküs işareti ve boncuk sırası
yardımcıları), sonra her yüzey ayrı görevde yeniden giydirilir. Görev 2–4 aynı gün art arda yayınlanır.

**Tech Stack:** Astro (statik), saf CSS, sharp (SVG→PNG), fontkitten (yazı → glif yolu; Pango'ya bağımlılık kalkar),
fontTools (yazı tipi yaması, Python), Node test runner (`npm test`).

**Spec:** `BRAND.md` (sürüm 2).

## Global Constraints

- Yazı: yalnız **Bricolage Grotesque** (SIL OFL), genişlik ekseni 100'e sabitlenmiş (opsz + wght kalır), kendi
  sunucumuzda; CSP `font-src 'self'` değişmez. ₺ glifi TCMB çizimine göre yeniden çizilir.
- Marka renkleri: kâğıt `#f4f3ee`, mürekkep `#1b1b1b`, pişmiş toprak `#c2502b` (tek marka rengi), boncuk grisi
  `#cfccc2`, soluk `#e4e1d7`, gri `#5d5b55`.
- Veri renkleri: yükseliş `#3f7350`, düşüş `#a3243b`; yön her zaman okla da yazılır. Pişmiş toprak veri rengi olmaz.
- Isotype kategori renkleri ve piktogramları kalkar; kategori adı pişmiş toprak.
- Para: görselde/tabloda `₺41,23` (önde, boşluksuz); düz metinde `41,23 TL`.
- Mevcut sayfalarda **yeni blok eklenmez**; bölümler, metinler ve sıra aynı kalır.
- Resmî olmayan haber kaynaklarının adı hiçbir dosyaya, teste, commit mesajına yazılmaz (`AGENTS.md`).
- Windows'ta `npm install` çalıştırılmaz; yeni bağımlılık eklenmez (sharp ve fontkitten zaten kilit dosyasında).
- Fotoğraf, doku, gölge, degrade yok. Site yalnız açık tema.
- Örnek rakam asla gerçek gibi gösterilmez; kapaklardaki "Örnek veri" notu korunur.

## Review Focus

- **₺ glifi:** opsz 12–96 ve wght 200–800 köşelerinde yay iç boşluğu kapanmaz, çizgiler yaya değmez.
- **Kesirli boncuk:** `miktar / birim` kesri doğru kırpılır; 0,1'in altındaki kesir çizilmez (bugünkü IsoRow kuralı).
- **Uzun başlık:** kapakta başlık abaküsün altına ve alt satıra binmez (punto küçülür).
- **Türkçe büyük harf:** kategori `toLocaleUpperCase('tr-TR')` (`Kişisel Finans → KİŞİSEL FİNANS`).
- **Bot kapakları Linux'ta:** yazı glif yolu olduğundan Actions makinesinde yazı tipi kurulu olması gerekmez.

---

### Görev 1: Yazı tipi — Bricolage Grotesque ve TCMB ₺

**Files:** Create `scripts/marka/tl-simgesi.py`, `scripts/kapak/fonts/BricolageGrotesque.ttf`,
`scripts/kapak/fonts/OFL-Bricolage.txt`, `public/fonts/bricolage-latin{,-ext}-v1.woff2`.

- [ ] Google Fonts deposundaki değişken TTF'yi indir; `wdth=100`'e sabitle (instancer).
- [ ] ₺'yi TCMB geometrisiyle çiz (kifobu `tl-simgesi.py` ile aynı kurgu); ölçüler her ana noktada `I` gövdesinden
  ve büyük harf yüksekliğinden alınır; ana noktalar opsz {12, 96} × wght {200, 400, 800}; deltalar
  `VariationModel` ile; ilerleme genişliği özgün glifinki (HVAR geçerli kalır).
- [ ] latin / latin-ext woff2 alt kümeleri (unicode-range bugünkü `global.css` ile aynı).
- [ ] Köşe örneklerini PNG'ye bas, göz kontrolü.

### Görev 2: Ortak yardımcılar — abaküs işareti ve boncuk sırası

**Files:** Create `src/lib/kimlik.js`, `src/lib/kimlik.test.mjs`, `scripts/marka/abakus-isaret.mjs`.

- [ ] `KIMLIK` renk sabiti.
- [ ] `abakusSvg({ boyut, kucuk, zemin: 'acik'|'toprak', vurgu })`: tam (4 tel, koyu 3·2·1·0, gri 1·2·3·4) ve küçük
  (3 tel, koyu 2·1·0, gri 1·2·3); `vurgu` sağ üst boncuğu pişmiş toprak yapar; `toprak` zemin profil içindir.
- [ ] `boncuklar(miktar, birim)` → tellere bölünmüş kesir listesi (10'arlı), testli.
- [ ] `brand/` dosyaları: `finfolis-abakus.svg`, `-kucuk.svg`, `-koyu-zemin.svg`; eski f monogramı `brand/eski/`.

### Görev 3: Site temeli

**Files:** `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Logo.astro`,
`src/components/Pictograms.astro`, `src/lib/kategoriler.js`, `public/favicon*`, `public/apple-touch-icon.png`,
`public/site.webmanifest`, `public/finfolis-logo.png`, `public/og-default.png`.

- [ ] `@font-face` Bricolage; `--sans` ve `--serif` Bricolage; Jost/Literata dosyaları kalkar.
- [ ] Renk belirteçleri; `.ink-*` sınıfları pişmiş toprağa iner; `--red` düşüş kırmızısı olur.
- [ ] Üst kısım ve alt kısım: abaküs + "finfolis" (600, sıkı aralık); üstte pişmiş toprak ince bant.
- [ ] Menüdeki kategori piktogramları kalkar (benim kararım: Isotype simgeleri kimlikten çıktı).
- [ ] Favicon: saydam; ≤32 piksel küçük abaküs. `?v=2` sürüm eki. Yayıncı logosu, og-default.

### Görev 4: Boncuk sıraları ve veri bileşenleri

**Files:** `src/components/IsoRow.astro` → boncuk sırası (aynı props), `Indicators.astro`, `Grafik.astro`,
`Change.astro` ve ilgili CSS.

- [ ] Simge yerine boncuk: 10'arlı teller alt alta; bugün mürekkep, önceki gri; açıklama "● = ₺2".
- [ ] Değişim okları ▲ ▼ ve veri renkleri.
- [ ] Ana sayfa, kategori, haber, veri, sözlük, hesapla, arşiv, şeffaflık sayfalarında gözle kontrol (CSP'li
  önizleme).

### Görev 5: Kapaklar — C dili

**Files:** `scripts/kapak/kapak.mjs`, `scripts/kapak/kapak.test.mjs`, `scripts/kapak/logo.mjs`,
`scripts/kapak/isaret.mjs`.

- [ ] `yazi()` Pango yerine fontkitten glif yoluyla (arayüz aynı: PNG + genişlik/yükseklik); yazı tipi bekçisi buna göre.
- [ ] Ortak çerçeve: kâğıt zemin, sağdan taşan soluk büyük abaküs (vurgu boncuğu pişmiş toprak), sol üstte kategori
  pişmiş toprak büyük harf, sol altta "finfolis". Başlık 700, abaküsün solunda.
- [ ] Haber, kaynak, bülten, rakam, gösterge, grafik, karne aynı çerçeveye.
- [ ] Testler; örnek kapaklar (`ornekler.mjs`) göz kontrolü; son 14 günün kapakları `yenile.mjs` ile yeniden çizilir
  (verisi saklanmayan eski rakam/kaynak kapakları dokunulmaz).

### Görev 6: Sosyal dosyalar ve logo paketi

**Files:** Create `scripts/marka/sosyal-uret.mjs`, `scripts/marka/logo-paketi.mjs`, `brand/sosyal/*`, `brand/logo/*`.

- [ ] Profil 1080 (pişmiş toprak zemin, kâğıt boncuklar), X 1500×500, Facebook 1640×624, LinkedIn 1128×191 (logo ve
  slogan ortada, soluk büyük abaküs sağda).
- [ ] Logo paketi: yatay, dikey, sloganlı dikey, işaret, küçük işaret; açık ve koyu zemin; SVG + saydam PNG.

### Görev 7: Belgeler

- [ ] `DESIGN.md` yeni kimliğe göre yeniden yazılır; `PRODUCT.md` marka satırları güncellenir.

## Yayın sırası

Görev 1–4 tek yayında (site yarım kimlikte kalmasın), sonra Görev 5 (bot kapakları), sonra 6–7.
Her itişten önce `git pull --rebase`; itişten sonra `yayinla.yml` çalışması kontrol edilir.

## Bu planın dışında

- Telegram/Facebook paylaşım metinleri (değişmez).
- TÜRKPATENT benzerlik araması (sahibi).
