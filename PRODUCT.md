# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A broad Turkish audience that wants to understand the economy and the markets, from beginners to people who already hold a little stock, gold, foreign currency or crypto. They are not professionals: they need the meaning of a number explained, not just the number. They read on phones and desktops, often in short sessions, and many arrive directly on a single article from social media or search.

## Product Purpose

finfolis untangles the complexity of financial markets and strengthens investment decisions with data-driven insight. It makes economic indicators, trends and opportunities in local (Turkish) and global markets understandable and accessible. Success means a non-expert reader leaves each story knowing what happened, why it matters, and what the key number was.

## Positioning

An analysis-and-explanation platform, not a ticker terminal or a tip sheet. Every story pairs a market fact with the context a general reader needs to understand it, and the site carries periodic market data (indices, currencies, gold, rates) alongside the reporting.

## Operating Context

- Content lives as Markdown folders in `src/content/haberler/<slug>/index.md` with an optional cover image, edited through Sveltia CMS at `/admin` and stored on GitHub.
- Production: an automated news bot (planned, like tidsrost's newsroom bot) will write stories from official/public sources (e.g. TCMB, TÜİK, KAP), and an editor will add analyses by hand. Many bot stories will have **no cover image**, so every layout must be complete without imagery.
- Market data (index levels, exchange rates, gold, interest rates) will be fetched at build/bot time and shown as static, periodically refreshed figures, always with an "as of" time. Not real-time.
- Flags: `featured` (manşet), `breaking` (son dakika), draft.
- Categories: Piyasalar, Borsa, Döviz & Altın, Kripto, Ekonomi, Kişisel Finans (kept in sync between `src/lib/site.ts` and `public/admin/config.yml`).
- Pages: front page, category pages, article, Hakkımızda, 404, RSS.

## Capabilities and Constraints

- Astro static site on Cloudflare Workers static assets. Security headers live in `public/_headers` (CSP allows only `'self'` for fonts, styles, scripts), so fonts must be self-hosted and there is no client-side fetching from third parties.
- Data source and exact market-data fields: to be decided with the bot. Until then the design reserves the data components with clearly marked sample values.
- Editor-facing comments in code are Turkish; all reader-facing copy is Turkish (`tr-TR`, Europe/Istanbul time).
- Deploy gotcha: `npm install` on Windows can drop `@emnapi/*` from package-lock and break the Linux build on Cloudflare.
- Sister sites `tidsrost` and `kifobu` share the code skeleton but finfolis must have a **fully separate identity**, with no shared family look.

## Brand Commitments

- Name: **finfolis**, lowercase.
- Identity v2 (2026-10-18): abacus mark, paper/ink with one accent (pişmiş toprak `#c2502b`), Bricolage Grotesque, slogan "Karmaşadan uzakta", personality öğretici ve sıcak. `BRAND.md` is the single source; the old f monogram is retired (`brand/eski/`).
- Voice: plain, explanatory Turkish; no hype, no return promises, no "kaçırmayın" urgency.
- An investment-advice disclaimer ("yatırım tavsiyesi değildir", SPK-compatible wording) is visible under every article and in the footer.

## Evidence on Hand

- Only placeholder articles in `src/content/haberler/`.
- Not on hand: real market data feed, audience numbers, testimonials, editor/publisher identity, social account figures. Do not fabricate any of these, and never present sample market figures as real.

## Product Principles

1. Explain, don't just report: every number arrives with what it means.
2. Numbers are honest: each figure carries its date/time and source; samples are labelled.
3. Not investment advice: the site informs, it never recommends; the disclaimer is always in view.
4. Calm over loud: market swings are reported soberly; red and green are information, not alarm.
5. Complete without images: text-and-number stories are the default case.
