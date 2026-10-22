---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/haber/[id].astro","src/pages/kategori/[slug].astro"]
---

# finfolis: front page, article, category pages

Scope: whole reader-facing site (front page, category, article, Hakkımızda, 404). Mode: Read.
Audience: broad Turkish audience, beginners included; job: understand today's market numbers and what they mean.
Proof/content: placeholder articles; market data is sample until the bot lands, always labelled "Örnek veri" with an as-of time.
Constraints: self-hosted fonts (CSP 'self'), no client fetching, complete without cover images, disclaimer under every article.
Unresolved: real logo (placeholder wordmark until supplied), data source for market figures.

## Direction contract

THESIS: Isotype for the Turkish economy: numbers become countable rows of identical pictograms (1 simge = a stated unit), so a reader counts the day before reading it. Refuses the ticker-strip plus photo-hero news template and every dark terminal.

OWN-WORLD: Neutral printed paper ground, black ink, four flat Isotype inks (red, blue, ochre, green) plus brown, each fixed to one category; Arntz-style flat silhouettes authored as SVG symbols; Jost (Futura lineage) for labels, numbers, nav; Literata for headlines and reading; heavy 4px black rule under the masthead, 1px rules elsewhere; no shadows, no radii, no gradients. Change direction drawn as small SVG triangles in ink, never red/green alarm.

STORY: The reader sees three indicator rows (Dolar/TL, yıllık enflasyon, gram altın) with this year's row against last year's paler row, understands the scale from the legend, then reads the manşet and moves into the list. Articles open with a 4px rule in the category ink and the category (icon + name) in the künye line; pictogram rows appear only where they count a real quantity, never as decoration. Text-only stories look intentional.

FIRST VIEWPORT: Masthead (wordmark left, category nav inline, 4px rule). Full-width band of three indicator columns: label, big Jost value, pictogram rows (bugün / bir yıl önce), one-line meaning, legend, "Örnek veri · as-of". Below: manşet (Literata 600 ~46px, spot) left two-thirds, ruled headline list right third.

FORM: Isotype pictorial statistics (Neurath/Arntz, İstatistik Yıllığı tradition), position 1 on the ordered list, chosen as IMPECCABLE'S PICK over assigned candidate 3; seed key 5089ba2b. Signature interaction: pictograms count in one by one on first load (reduced-motion: static).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
