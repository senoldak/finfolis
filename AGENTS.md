## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Haber kaynakları gizlidir

Repo herkese açık. Resmi olmayan haber kaynaklarının (haber siteleri, ajanslar) adı, alan adı ve besleme adresi
repoya hiçbir yerde yazılmaz: kod, test, fixture, belge, commit mesajı ve log dahil. Liste
`scripts/haberler/kaynaklar/gizli-kaynaklar.sifreli` dosyasında şifreli durur; anahtar `KAYNAK_ANAHTARI`
(GitHub Secret, yerelde `.env`). Düzenlemek için `node scripts/haberler/gizli.mjs ac`, sonra `kapat`.
Testlerde `haber.example.com` gibi uydurma adlar kullanılır. Resmi kurumlar (Fed, ECB, SEC, TCMB…) bu kurala dahil değildir.
