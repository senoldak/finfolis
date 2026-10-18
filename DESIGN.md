---
name: finfolis
description: Kimlik v2 — abaküs işareti, kâğıt ve mürekkep, tek vurgu pişmiş toprak; rakamlar abaküs boncuklarıyla sayılır.
colors:
  paper: "#f4f3ee"
  paper-2: "#e9e7df"
  ink: "#1b1b1b"
  ink-2: "#3d3c38"
  muted: "#5d5b55"
  hair: "#cfccc2"
  toprak: "#c2502b"
  toprak-text: "#a8431f"
  boncuk: "#cfccc2"
  soluk: "#e4e1d7"
  yukselis: "#3f7350"
  dusus: "#a3243b"
typography:
  family: "Bricolage Grotesque (opsz 12–96, wght 200–800, wdth sabit 100), tek aile"
  display: { weight: 700, letterSpacing: "-0.02em" }
  figure: { weight: 700, fontFeature: "tnum yalnız hizalı sütunlarda" }
  body: { weight: 400, lineHeight: 1.6 }
  label: { weight: 600, transform: uppercase, letterSpacing: "0.08–0.1em" }
rounded:
  none: "0px"
---

# Design System: finfolis

> Kimliğin tek kaynağı `BRAND.md`'dir; bu belge onun sitedeki ve kapaklardaki uygulamasını anlatır.
> Uygulama planı: `docs/superpowers/plans/2026-10-18-finfolis-kimlik-uygulama.md`.

## Overview

Sakin, öğretici ve sıcak bir analiz platformu. Kâğıt zemin, mürekkep yazı, tek bir marka rengi (pişmiş toprak) ve
rakamları sayılabilir kılan abaküs boncukları. Fotoğraf, doku, gölge, degrade ve yuvarlak köşe yok. Site yalnız açık tema.

## Colors

- **Marka:** kâğıt `#f4f3ee`, mürekkep `#1b1b1b`, pişmiş toprak `#c2502b` (üst bant, kategori adı, vurgu boncuğu,
  "bu ne demek" vurguları). Küçük yazıda `#a8431f` (kâğıtta 5,4:1).
- **Veri:** yükseliş `#3f7350`, düşüş `#a3243b`. Yön her zaman okla (▲ ▼) da yazılır. Pişmiş toprak veri rengi olmaz.
- **Nötr:** boncuk grisi `#cfccc2` (önceki değer, işaretin gri boncukları), soluk `#e4e1d7` (teller, kapaktaki büyük
  abaküs), gri `#5d5b55` (ikincil metin, tarih ve kaynak).
- Eski Isotype kategori renkleri (`--blue`, `--ochre`, `--brown`) ve `.ink-*` sınıfları pişmiş toprağa iner;
  işaretleme değişmedi.

## Typography

- **Tek aile: Bricolage Grotesque**, kendi sunucumuzda (`public/fonts/bricolage-{latin,latin-ext}-v1.woff2`; kapaklar
  `scripts/kapak/fonts/BricolageGrotesque.ttf`). ₺ glifi TCMB çizimine göre yeniden çizildi:
  `scripts/marka/tl-simgesi.py`. Yazı tipi değişirse woff2 sürüm ekini artır (`/fonts/*` 30 gün önbellekte).
- Başlık 700, büyük rakam 700, ara başlık 600, metin 400, etiket 600 büyük harf.
- `font-optical-sizing: auto`: büyük başlıkta karakterli, gövdede sakin.

## Layout

Mevcut sayfa düzeni, bölümleri ve sırası korunur (kimlik yalnız görünümü değiştirdi, yeni blok eklenmedi).
Künye: üstte 5 px pişmiş toprak bant, abaküs + "finfolis" (600, −0,03em), kategori menüsü, altında ince çizgi.

## Components

### Boncuk sırası (imza)

`src/components/IsoRow.astro` (adı eski; içi boncuk). Bir boncuk sabit bir miktar; açıklaması bloğun altında
("● = ₺2"). Boncuklar onar onar tellere dizilir, teller alt alta durur; her gösterge küçük bir abaküse döner.
Bugün mürekkep, karşılaştırma (önceki) boncuk grisi. Son boncuk kesirliyse soldan o kadarı çizilir; 0,1'in altı
çizilmez. Hesap: `boncukTelleri()` (`src/lib/kimlik.js`).

### İşaret

`abakusSvg()` (`src/lib/kimlik.js`): tam (4 tel; koyu 3·2·1·0, gri 1·2·3·4) ve küçük (≤48 piksel; 3 tel, koyu 2·1·0,
gri 1·2·3). Zeminler: açık, koyu, pişmiş toprak (profil, uygulama simgesi), soluk (kapaktaki büyük abaküs; yalnız sağ
üst boncuk pişmiş toprak). Favicon ve marka dosyaları: `scripts/marka/favicon-uret.mjs`, `scripts/marka/marka-uret.mjs`.

### Değişim işareti, tablolar, grafikler

Değişim oku ve yüzde veri renginde. Gösterge çizelgesi, haber tablosu ve kıvılcım grafikleri mürekkep; satır ayraçları
ince çizgi.

## Covers (kapaklar)

`scripts/kapak/kapak.mjs`, 1200×675. Yazılar glif yolu (fontkitten), Pango'ya bağımlılık yok.

- **Başlık kapakları** (haber, kaynak, bülten, rakam): kâğıt zemin; sağdan taşan soluk büyük abaküs; sol üstte kategori
  (pişmiş toprak, büyük harf); başlık Bricolage 700, abaküsün solunda; sol altta "finfolis".
- **Veri kapakları** (gösterge, grafik, karne): aynı zemin; veri tüm genişliği kullanır, büyük abaküs yok; kategori sağ
  altta. Gösterge boncuk sırasıyla; grafik çizgisi mürekkep; karnede yükseliş yeşil, düşüş kırmızı.
- "Örnek veri" notu korunur. Son 14 günün kapakları `scripts/kapak/yenile.mjs` ile yeniden çizilebilir.

## Do's and Don'ts

### Do

- Her rakam tarih ve kaynakla; para görselde `₺41,23`, düz metinde `41,23 TL`.
- Yönü okla da söyle; renk tek başına anlam taşımaz.
- Tek vurgu: pişmiş toprak. Geri kalan her şey mürekkep, gri ve kâğıt.

### Don't

- Isotype piktogramı, kategori renkleri, ikinci yazı ailesi.
- İşareti daire, oval ya da kare çerçeveye almak; boncuklarla harf yazmak.
- Fotoğraf, doku, gölge, degrade, yuvarlak köşe.
- Mevcut sayfalara sorulmadan yeni blok eklemek.
