# finfolis Haber Botu Implementation Plan

> **Durum (2026-10-18):** Uygulandı. Task 8 (zamanlayıcı) mecmua saat + haberler.yml ile yer değiştirdi.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scheduled bot that writes a few verified Turkish world-economy stories a day plus a 3-hourly market bulletin, keeps `src/data/piyasa.json` filled with real delayed data, and draws a cover for each post.

**Architecture:** A port of tidsrost's `scripts/nyheter` pipeline into `finfolis/scripts/haberler/`. Each source module returns candidates; the orchestrator picks a few, Gemini writes, and a non-AI fact check plus a Gemini editor gate publication. Files land in `src/content/haberler/<slug>/` with a `kapak.png` from `scripts/kapak/kapak.mjs`. A GitHub Actions workflow commits the result, a cron Worker triggers it, and Cloudflare rebuilds on push.

**Tech Stack:** Node 22 ESM (`.mjs`), `node:test` (no new dependencies), Gemini REST API, sharp (already present via astro), Astro content collections, GitHub Actions, Cloudflare Workers cron.

**Spec:** `docs/superpowers/specs/2026-10-11-haber-botu-design.md`

## Global Constraints

- No mock, sample, estimated or invented figures are ever published. If data can't be fetched, show the last real value with its date, or hide it.
- Every number and quote in a story must be found in the fetched source data. If it can't be verified, the story is not published.
- News-agency RSS feeds are tips only. Never copy, translate or take figures from agency text.
- Only free sources that need no key and allow republication. No EVDS, no paid APIs, no Yahoo or Investing data.
- No investment advice: no buy/sell, no price targets, no return promises.
- Publish directly, with no draft or approval step.
- Volume: 4–8 selected stories a day plus a bulletin every 3 hours. Bulletins are skipped when markets are closed (nights and weekends) or nothing moved meaningfully.
- Cause and effect only when an official source says it, and attributed to that source. Time order is fine ("after the election, the real fell x%").
- `GEMINI_API_KEY` lives only as a GitHub secret. It is never written to a file, log or commit.
- No new npm dependencies: package-lock.json must not change, because of the Windows @emnapi gotcha.
- Reader-facing copy is Turkish (`tr-TR`, Europe/Istanbul). Code comments are Turkish, as in the rest of the repo.

## Review Focus

1. Turkish number formats in the fact check: a story's "49,17" must match source "49.173" and "%0,1" must match 0.1. Pinned in Task 2.
2. A source that is down or returns HTML/garbage: that source is skipped, and the run neither crashes nor publishes. Pinned in Tasks 3 and 6.
3. Stale data: an FX rate older than 3 days is hidden, while the policy rate stays visible until it's replaced. Pinned in Task 3.
4. The same event coming in again on the next run is not rewritten (`gorulen.json`). Pinned in Task 7.
5. Weekend or night run: no bulletin is produced. Pinned in Task 6.

## Owner decisions during planning

- KAP is out (owner, 2026-10-11).
- The editor stage is called **yayın kurulu**, modelled on tidsrost's `redaktor.mjs`. It reviews, has the writer fix, and publishes with no human step.

## Known limit (v1)

There is no free, republishable source for BIST 100, ETF/stock prices, Brent or gold. These indicators stay hidden. Stories that depend on a price move (for example "the Brazil ETF fell") can only use FX moves (Frankfurter/ECB), such as the Brazilian real or yen moves. Political events with no official result source become stories only as FX-move stories whose trigger is a tip. Tell the owner this at hand-off.

---

### Task 1: Bot skeleton, content schema and story writer

**Files:**
- Create: `scripts/haberler/lib.mjs`, `scripts/haberler/lib.test.mjs`
- Modify: `src/content.config.ts` (add fields), `public/admin/config.yml` (same fields, hidden or read-only), `package.json` (script `"test:bot": "node --test scripts/"`), `src/pages/haber/[id].astro` (show the source list under the article)

**Interfaces:**
- Produces:
  - `hentMetin(url, {timeout=20000}) → Promise<string>` and `hentJson(url) → Promise<any>`. Both send the User-Agent `finfolis-haber-botu (+https://finfolis.com)`, retry once, and throw on non-2xx.
  - `gemini({ sistem, istem, sema }) → Promise<object|null>`. Ported from tidsrost `lib.mjs:112`. Returns null when `GEMINI_API_KEY` is missing. Model from `GEMINI_MODEL`.
  - `slugla(baslik) → string`. Turkish-aware: ı→i, ğ→g, ş→s, ç→c, ö→o, ü→u, İ→i.
  - `yaziYaz(rot, yazi) → Promise<slug>`. `yazi = { baslik, spot, govde, kategori, tarih: Date, tur: 'haber'|'bulten', kaynaklar: [{ad, url}], kapak?: () => Promise<Buffer>, kapakAlt? }`. Writes `index.md` with frontmatter and an optional `kapak.png`.
- Schema adds `tur: z.enum(['haber','bulten']).default('haber')` and `kaynaklar: z.array(z.object({ ad: z.string(), url: z.string().url() })).default([])`.

- [x] Step 1: Tests in `lib.test.mjs`:
  - `slugla('Japonya Merkez Bankası faizi İkinci kez artırdı')` === `'japonya-merkez-bankasi-faizi-ikinci-kez-artirdi'`.
  - `yaziYaz` writes into a temp dir. Its frontmatter round-trips through the `yaml` package (already in node_modules via astro), including a title containing `"` and `:`. The tidsrost/finfolis coverAlt quoting bug must not recur.
- [x] Step 2: `npm run test:bot` → FAIL.
- [x] Step 3: Implement `lib.mjs`. Serialise YAML values with `JSON.stringify` (valid YAML).
- [x] Step 4: Make the article page render `kaynaklar` as a "Kaynaklar" list above the disclaimer. Run `npm run test:bot` → PASS, then `npx astro build` → Complete.
- [x] Step 5: Commit `Haber botu: iskelet, içerik şeması, yazı yazıcı`.

### Task 2: Non-AI fact check (`dogrula.mjs`)

**Files:** Create `scripts/haberler/dogrula.mjs`, `scripts/haberler/dogrula.test.mjs`

**Interfaces:**
- Produces `sayilariBul(metin) → number[]`. It parses Turkish (`49,17`, `10.482`, `%0,1`, `0,1 puan`) and English (`49.173`, `1,234.5`) formats.
- Produces `dogrula(metin, kaynakMetinleri: string[], {tolerans=0.005}) → { tamam: boolean, eksik: string[] }`. Each number in the story must equal a source number after rounding to the story's precision, or be within relative tolerance. Exempt from checking: years 1900–2100, dates and day numbers inside a date phrase, and the numbers 1–10 written in words.
- Produces `alintilariBul(metin) → string[]` (text in "…" or “…”). Each quote must appear verbatim, case- and whitespace-insensitive, in a source text; otherwise it lands in `eksik`.

- [x] Step 1: Tests:
  - `sayilariBul('Dolar 49,17 liraya çıktı, %0,1 arttı')` → `[49.17, 0.1]`.
  - `dogrula('Dolar 49,17 lira', ['TRY":49.173'])` → `tamam: true`.
  - `dogrula('Dolar 50,17 lira', ['TRY":49.173'])` → `tamam: false` with `eksik` containing `'50,17'`.
  - `dogrula('2026 yılında ...', [''])` → `tamam: true`.
  - An invented quote → `tamam: false`.
- [x] Step 2: FAIL. Step 3: Implement. Step 4: PASS.
- [x] Step 5: Commit `Haber botu: yapay zekâsız rakam ve alıntı doğrulaması`.

### Task 3: Market data → `piyasa.json`, and the site shows only real data

**Files:**
- Create: `scripts/haberler/piyasa-verisi.mjs`, `scripts/haberler/piyasa-verisi.test.mjs`
- Modify: `src/data/piyasa.json` (new shape), `src/lib/piyasa.ts`, `src/components/Indicators.astro`, `src/components/Cizelge.astro`

**Interfaces:**
- Sources:
  - Frankfurter, `https://api.frankfurter.dev/v1/` (ECB reference rates, free, no key). Pulls USD/TRY, EUR/TRY, JPY/TRY, BRL/TRY, the current value and the value one year ago (`/v1/<date>`).
  - TCMB policy rate, parsed from the TCMB press release page.
  - TÜİK annual CPI, parsed from the latest TÜİK CPI bulletin page.
  - The implementer verifies both page URLs and selectors first and records them at the top of the module.
- Produces `guncelle(eski) → Promise<PiyasaVerisi>`. Each indicator is `{ id, ad, deger, onceki?, oncekiEtiket?, degisim?, kaynak: {ad,url}, zaman: ISO, gecerlilik: 'kur'|'aciklama', …display fields as today }`. Top level is `{ guncelleme: ISO, gostergeler }`, with no `ornek` field.
- Rule: if a fetch fails, the previous real value is kept with its old `zaman`. A value that was never fetched is not added.
- `piyasa.ts`:
  - `gorunur(g, simdi) → boolean`. An indicator with `gecerlilik: 'kur'` is hidden when `zaman` is older than 3 days; `'aciklama'` stays visible until replaced.
  - Each visible indicator shows its own "kaynak · zaman" line.
  - The "Örnek veri" label code is deleted.
- Vitrin (Isotype) indicators in v1: Dolar/TL, Yıllık enflasyon, Euro/TL (the gold column is removed). The table shows Politika faizi, Japon yeni/TL and Brezilya reali/TL. Pictogram units: dolar 2 TL, enflasyon 3 puan, euro 2 TL.

- [x] Step 1: Tests with stubbed `fetch`, using JSON/HTML fixtures under `scripts/haberler/fixtures/`:
  - The Frankfurter fixture yields `deger` 49.173 for `dolar` (USD→TRY).
  - A Frankfurter 500 with `eski` given keeps the old value and old `zaman`.
  - A Frankfurter 500 without `eski` yields no `dolar` entry.
  - `gorunur({gecerlilik:'kur', zaman: 4 days ago})` → false.
  - `gorunur({gecerlilik:'aciklama', zaman: 40 days ago})` → true.
- [x] Step 2: FAIL. Step 3: Implement. Step 4: PASS.
- [x] Step 5: Run `node scripts/haberler/piyasa-verisi.mjs --yaz` for real, which writes `piyasa.json`. Then `npx astro build` → Complete. Check that the front page shows real values with source and time, and no "Örnek veri".
- [x] Step 6: Commit `Piyasa verisi: gerçek gecikmeli veri, örnek veri kaldırıldı`.

### Task 4: Official sources

**Files:** Create `scripts/haberler/kaynaklar/{merkez-bankalari,sec,kur-hareketi}.mjs`, each with a `.test.mjs` and fixtures.

**Interfaces:**
- Every module exports `{ ad: string, hent(): Promise<Aday[]> }`. `Aday = { id, baslik, tarih: Date, onem: 1–5, kategori, kaynakMetni: string, kaynaklar: [{ad,url}], kapak?: () => Promise<Buffer>, kapakAlt? }`.
- `kaynakMetni` is the full fetched text or data, which Task 2 checks against.
- `merkez-bankalari`:
  - Fed `press_all.xml`, ECB press RSS, BoJ `whatsnew.xml` and TCMB press releases.
  - Rate decisions get `onem` 5, other monetary-policy releases 3, everything else is dropped.
  - Category `piyasalar` / `ekonomi`. Cover: `rakamKapagi` with the rate when one is parsed, otherwise `kaynakKapagi`.
- `sec`: EDGAR atom feeds (`getcurrent`) for S-1/F-1 (IPO filing, `onem` 3), 424B4 (priced IPO, `onem` 4) and N-1A/485APOS new ETF (`onem` 2).
  - Send the User-Agent from Task 1.
  - Keep at most 5 per run and only issuers whose filing has an offering size. Category `borsa`.
- `kur-hareketi`:
  - From Task 3 data: a daily move of at least 1.5% in JPY, BRL, EUR or USD against TRY or USD becomes a candidate (`onem` 4).
  - Cover: `gostergeKapagi` or `rakamKapagi`. Category `doviz`.
- [x] Step 1: For each module, a test that parses its fixture into the expected candidates. One fixture each: a rate decision, an S-1, a priced IPO, a 2% BRL move.
- [x] Step 2: FAIL. Step 3: Implement. Step 4: PASS.
- [x] Step 5: Commit `Haber botu: resmi kaynaklar (merkez bankaları, SEC, kur hareketi)`.

### Task 5: Tips (RSS), the writer and the editorial board (yayın kurulu)

**Files:** Create `scripts/haberler/ipucu.mjs`, `scripts/haberler/yazar.mjs`, `scripts/haberler/yayin-kurulu.mjs`, with tests.

**Interfaces:**
- `ipucu.hent() → Promise<{baslik, tarih}[]>`. Headlines only from the tip feeds in the encrypted source list (see scripts/haberler/gizli.mjs).
- `onemArtir(adaylar, ipuclari) → adaylar`. A candidate gets +1 `onem` (max 5) if a tip from the last 24 hours shares at least 2 significant keywords with its title. Tips never become stories themselves, and their text never reaches the writer.
- `yaz(aday) → Promise<{baslik, spot, govde}|null>`. Gemini, Turkish, in the PRODUCT.md voice: explain what happened, why it matters, and the key number.
  - The system prompt holds the Global Constraints rules: no advice, no causal claims unless the source says so, only numbers from `kaynakMetni`.
- `yayinKurulu(taslak, aday)` (the editorial board; owner's term, replaces `duzenle` → Promise<{yazi}|{dur: string}>`. Port of tidsrost `redaktor.mjs`:
  - Task 2 check, then a Gemini control desk, up to 2 fix rounds, Turkish copy edit, and a final Task 2 check.
  - Any leftover unverified number returns `{dur}`.
- [x] Step 1: Tests with `gemini` stubbed:
  - A draft with an invented number gets fixed by the stub, then passes.
  - A draft that is still wrong after 2 rounds returns `{dur}`.
  - `onemArtir` raises a matching candidate and leaves a non-matching one alone.
  - A tip's text never appears in the writer's prompt (assert on the stub's received prompt).
- [x] Step 2: FAIL. Step 3: Implement. Step 4: PASS.
- [x] Step 5: Commit `Haber botu: yazar, yayın kurulu, ipucu akışları`.

### Task 6: 3-hour bulletin

**Files:** Create `scripts/haberler/bulten.mjs` and `bulten.test.mjs`. Modify `src/pages/index.astro` (a "Piyasa bülteni" slot showing the latest bulletin above Gündem; bulletins are excluded from the other lists) and `src/lib/news.ts` (`getNews({tur})` filter).

**Interfaces:**
- `bultenGerekli(simdi: Date, piyasa, onceki) → boolean`.
  - False on Saturday/Sunday (Europe/Istanbul) and between 22:00 and 07:00 Istanbul time.
  - False if no indicator moved at least 0.3% since the last bulletin's values and there were no new candidates since then.
- `bultenYaz(piyasa, sonAdaylar) → Promise<yazi|null>`.
  - Title pattern `Piyasa bülteni: <gün> <saat>`.
  - The body is the indicator lines (built from data, no AI), then a Gemini paragraph about the top 3 candidates of the last 3 hours, checked with Task 2.
  - Cover: `gostergeKapagi`. `tur: 'bulten'`, category `piyasalar`.
- [x] Step 1: Tests:
  - Saturday 12:00 → false.
  - Tuesday 23:30 → false.
  - Tuesday 12:00 with USD/TRY moving 0.5% → true.
  - Tuesday 12:00 with nothing moved and no candidates → false.
- [x] Step 2: FAIL. Step 3: Implement. Step 4: PASS, and `npx astro build` → Complete.
- [x] Step 5: Commit `Haber botu: 3 saatlik piyasa bülteni`.

### Task 7: Orchestrator

**Files:** Create `scripts/haberler/hent-haberler.mjs`, `scripts/haberler/gorulen.json` (`{ "gorulen": {}, "sonBulten": null }`) and `hent-haberler.test.mjs`.

**Interfaces:**
- CLI: `node scripts/haberler/hent-haberler.mjs [--kuru]`. `--kuru` only lists, without writing.
- Order:
  1. Update market data (Task 3).
  2. Fetch candidates from all sources; a source error is logged and that source skipped.
  3. Raise `onem` from tips.
  4. Drop ids already in `gorulen`.
  5. Pick at most `MAKS_HABER` (env, default 3) by `onem` with at most 2 per source. With 8 runs a day this caps volume, and the daily cap is enforced by counting today's posts in `gorulen` (max 8).
  6. Write each pick, edit it, and save it with `yaziYaz`.
  7. Write a bulletin if `bultenGerekli`.
  8. Save `gorulen.json` and print `adet=<n>` to `$GITHUB_OUTPUT`.
- On a source's first run, only its 2 newest candidates are taken and the rest marked seen (same as tidsrost `FORSTE_GANG`).
- [x] Step 1: Tests with all sources and Gemini stubbed:
  - A second run with the same candidates writes 0 stories.
  - A throwing source doesn't stop the others.
  - With 9 stories already today, 0 are written.
- [x] Step 2: FAIL. Step 3: Implement. Step 4: PASS.
- [x] Step 5: Run locally with `--kuru` against the real sources and paste the candidate list into the hand-off.
- [x] Step 6: Commit `Haber botu: yönetici akış`.

### Task 8: Schedule, secret, go-live

**Files:**
- Create: `.github/workflows/haber-botu.yml` (port of tidsrost `nyheter.yml`), `zamanlayici/worker.js` and `zamanlayici/wrangler.jsonc` (port of tidsrost `tidsur`; cron `47 */3 * * *`)
- Modify: `README.md` (bot section)
- Delete: `src/content/haberler/ornek-*`, `scripts/kapak/ornekler.mjs` sample data (keep the file as a dev demo only if its output path is outside `src/content`)

**Steps:**
- [x] Step 1: Check the Gemini key works with a single minimal request. The key is typed in by the owner, piped through stdin, and never echoed.
- [x] Step 2: Set the secret with `gh secret set GEMINI_API_KEY --repo senoldak/finfolis` (value from stdin).
- [x] Step 3: Write the workflow:
  - `npm ci`, run, commit `src/content/haberler src/data/piyasa.json scripts/haberler/gorulen.json`.
  - Use `[skip ci]` when `adet=0` and only state changed. Note: piyasa.json changes still need a rebuild, so `[skip ci]` only applies when piyasa.json is unchanged too.
- [x] Step 4: Delete the sample stories, run the workflow once with `workflow_dispatch`, and watch it succeed. Check the Workers Builds check-run is `success` and that the live site shows real indicators and at least the bulletin or one story.
- [x] Step 5: Deploy the cron Worker (`cd zamanlayici && npx wrangler deploy`). It needs a GitHub token as a Cloudflare secret, set up the same way as tidsur; follow tidsur/README.md.
- [x] Step 6: Commit `Haber botu: zamanlama ve yayın`, then push.
