# finfolis

Astro ile yapılmış, Cloudflare'de ücretsiz yayınlanan haber sitesi. Haberler `/admin` adresindeki panelden (Sveltia CMS) girilir ve GitHub'da saklanır.

## Yapı

| Klasör / dosya | Ne işe yarar |
|---|---|
| `src/content/haberler/<haber>/index.md` | Her haber kendi klasöründe, kapak resmiyle birlikte |
| `src/lib/site.ts` | Site adı, açıklama, sosyal medya linkleri, kategoriler |
| `public/admin/config.yml` | Panel ayarları (kategoriler `site.ts` ile aynı olmalı) |
| `src/styles/global.css` | Tasarım (renkler en üstte); kurallar `DESIGN.md`'de |
| `src/data/piyasa.json` | Anasayfadaki piyasa göstergeleri (haber botu gecikmeli gerçek veriyle günceller) |
| `scripts/kapak/` | Haber kapaklarını çizen kod (simge dizisi, büyük rakam, kategori kartı) |
| `saat/` | Botu Oslo saatiyle çift saatlerde (08–02) başlatan Cloudflare Worker (GitHub'ın zamanlayıcısı güvenilmez). Kurulum: `saat/README.md` |

## Kurulum (bir kerelik)

1. **GitHub:** github.com'da `finfolis` adında bir repo aç ve bu klasörü yükle.
2. **Panel ayarı:** `public/admin/config.yml` içinde repo `senoldak/finfolis` olarak ayarlı.
3. **Cloudflare:** Workers & Pages → Create → Pages → GitHub reposunu bağla.
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Alan adı:** Pages projesinde Custom domains → `finfolis.com` ekle.
5. **Panele giriş:** `finfolis.com/admin` → "Erişim Token'ı Kullanarak Giriş Yap". Açılan GitHub sayfasında token oluştur (sadece `finfolis` reposuna, Contents: Read and write) ve yapıştır. Tarayıcı bunu hatırlar.

## Günlük kullanım

`finfolis.com/admin` → Haberler → Yeni Haber → yaz, resim ekle → Kaydet. Site 1-2 dakika içinde güncellenir.

- **Manşet:** Anasayfanın en üstünde büyük gösterilir.
- **Son dakika:** Kırmızı şeritte gösterilir.
- **Taslak:** Sitede görünmez.

## Haber kapakları

Kapaklar fotoğraf değil, `scripts/kapak/kapak.mjs` ile kendi verimizden çizilir (tidsrost'taki gibi): 1200×675 PNG, sitenin renkleri ve fontlarıyla. Üç tür var: `gostergeKapagi` (rakamları simge dizileriyle karşılaştırır), `rakamKapagi` (tek büyük rakam) ve `kaynakKapagi` (verisi olmayan haberler için kategori kartı). Kapak türlerinin demo çıktısını almak için (`.kapak-ornekleri/` klasörüne yazar, siteye girmez):

```bash
node scripts/kapak/ornekler.mjs
```

## Haber botu

Zamanlanmış bir GitHub Actions iş akışı (`.github/workflows/haberler.yml`) haberleri kendisi üretir. Kaynaklardan haberleri toplar, yayın kurulu aşamasından geçirir, her çalıştırmada bölgeli bir piyasa bülteni hazırlar ve gecikmeli gerçek piyasa verisini `src/data/piyasa.json`'a yazar. Örnek ya da uydurma veri asla kullanılmaz. Bot sonucu repoya commit'ler, Cloudflare siteyi yeniden derler.

- **Zamanlama:** Oslo saatiyle 08:40, 10:40 … 22:40, 00:40, 02:40 (03:00–07:59 gece modu). Botu `saat/` klasöründeki Cloudflare Worker başlatır, çünkü GitHub'ın zamanlayıcısı çalışmaları geciktirip atlayabiliyor ve yaz/kış saatini izlemiyor (kurulum: `saat/README.md`). Actions sekmesinden elle de çalıştırılabilir (workflow_dispatch).
- **Gerekli secret:** `GEMINI_API_KEY` (GitHub → Settings → Secrets and variables → Actions → Secrets).
- **İsteğe bağlı değişkenler** (aynı yerde Variables): `GEMINI_MODEL`, `MAKS_HABER` (çalıştırma başına en fazla yazı).
- **Bilgisayarda deneme:** `node scripts/haberler/hent-haberler.mjs --kuru`
- **Testler:** `npm run test:bot`

## Telegram

Bot her çalıştırmada yeni yazıları [@finfolis](https://t.me/finfolis) kanalına kapak resmiyle gönderir (`scripts/haberler/telegram.mjs`): 🧮 başlık, özet ve site linki. Bir yazı sitede yayına girmeden gönderilmez; gönderilenler `scripts/haberler/telegram-gonderilen.json` dosyasında tutulur, bir çalıştırmada en fazla 3 yazı gider. Gereken GitHub Secret'ları: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_KANAL` (ör. `@finfolis`); bot kanalda yönetici olmalıdır.

## Bilgisayarda çalıştırma

```bash
npm install
npm run dev
```
