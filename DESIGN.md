---
name: finfolis
description: Isotype for the Turkish economy; numbers become countable rows of identical pictograms on printed paper.
colors:
  paper: "#f4f3ee"
  paper-2: "#e9e7df"
  ink: "#1b1b1b"
  ink-2: "#3d3c38"
  muted: "#5d5b55"
  hair: "#cfccc2"
  red: "#c43d2b"
  red-text: "#b2351f"
  blue: "#2e5d8a"
  ochre: "#e0b43a"
  ochre-text: "#80600c"
  green: "#3f7350"
  green-text: "#3a6b4a"
  brown: "#8b5a3c"
  brown-text: "#83533a"
typography:
  display:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "clamp(2rem, 3.4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.012em"
  figure:
    fontFamily: "Jost, Futura, Century Gothic, system-ui, sans-serif"
    fontSize: "clamp(2rem, 2.5vw, 2.3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  title:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1.18rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  prose:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.75
  section-label:
    fontFamily: "Jost, Futura, Century Gothic, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    letterSpacing: "0.1em"
  label:
    fontFamily: "Jost, Futura, Century Gothic, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 4.5vw, 64px)"
  column-gap: "48px"
  section: "40px"
  row: "16px"
  iso: "22px"
components:
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 0 16px"
  section-head:
    textColor: "{colors.ink}"
    typography: "{typography.section-label}"
    padding: "0 0 10px"
  breaking-label:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "6px 10px"
  indicator-value:
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
  news-row:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "16px 0 18px"
  disclaimer-box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
  footer:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-2}"
    padding: "36px 0 22px"
---

# Design System: finfolis

## Overview

**Creative North Star: "The Statistical Yearbook"**

finfolis is a page of pictorial statistics in the Neurath/Arntz Isotype tradition, printed on neutral paper in black ink plus a few flat inks. A number is shown as a countable row of identical silhouettes (one pictogram equals a stated unit), so a reader counts the day before reading about it. Everything else (the rules, the labels, the reading type) is quiet and typographic, so that the pictograms are the only pictures the system draws.

The density is a newspaper's: ruled lists, a masthead, a 2/3 + 1/3 front page, with text-only stories treated as the default case, not a fallback. The world is light-only. It is printed paper, and there is deliberately no dark scheme (`color-scheme: light`). It turns down the ticker strip with a photo hero, the dark trading terminal, and red/green alarm signalling. Sister sites tidsrost and kifobu share the code skeleton but must never share this look.

**Key Characteristics:**
- Neutral printed-paper ground, black ink, flat category inks, no gradients.
- Quantity shown as the number of identical pictograms, never as their size.
- Jost (Futura lineage) for labels, numbers and navigation; Literata for headlines and reading.
- Heavy 4px ink rules for structure, 1px rules for everything else.
- Square, flat, and shadowless everywhere.

## Colors

A paper-and-ink palette with five flat Isotype inks plus black, each tied to exactly one meaning.

### Primary
- **Press Black** (`ink`): text, all structural rules, the masthead, the breaking label, focus outlines, selection. It is also the Kripto category ink.

### Secondary (category inks, fill vs text)
Each category owns one ink and one pictogram, one-to-one and fixed. The **fill** token paints pictograms, nav underlines and category rules. The **text** token colours category names set in type, darkened where the fill alone would be hard to read.
- **Signal Blue** (`blue`, used as both fill and text): Piyasalar, pictogram *terazi* (scales).
- **Isotype Red** (`red` fill, `red-text` text): Borsa, pictogram *fabrika* (factory).
- **Bullion Ochre** (`ochre` fill, `ochre-text` text): Euro/TL pictogram (the gold column was removed with the sample data). The fill is far too light to use for text. Type always uses the darkened `ochre-text`.
- **Press Black** (`ink`): Kripto, pictogram *altigen* (hexagon).
- **Earth Brown** (`brown` fill, `brown-text` text): Ekonomi, pictogram *insan* (figure).
- **Ledger Green** (`green` fill, `green-text` text): Kişisel Finans, pictogram *cuzdan* (wallet).

Market indicators borrow an ink for their own pictogram rows (Dolar/TL blue, enflasyon red, Euro/TL ochre). That is the same palette serving data, never decoration.

### Neutral
- **Newsprint** (`paper`): page ground.
- **Folded Newsprint** (`paper-2`): footer band and the empty frame behind images.
- **Soft Ink** (`ink-2`): spot text, meaning lines, comparison values, change figures.
- **Pencil Grey** (`muted`): dates, legends, data notes, captions, list markers.
- **Hairline** (`hair`): 1px row dividers inside lists and tables.

### Named Rules
**The One Ink, One Meaning Rule.** Every category ink is bound to one category and one pictogram. An ink never appears as decoration, as a background wash, or on a second category.

**The Fill Is Not Text Rule.** Pictograms and rules use the fill token, and type uses the text token. Never set type in the `ochre` fill.

**The No Alarm Rule.** Red and green never encode up or down. Change direction is drawn as a small ink triangle (up, down, or a dash for flat) in `ink-2`, with a screen-reader word ("yükseldi / düştü / değişmedi").

## Typography

**Display Font:** Literata (with Georgia, serif), self-hosted variable with optical sizing
**Label/Number Font:** Jost (with Futura, Century Gothic, system-ui), self-hosted variable

**Character:** Jost carries the Isotype poster voice: geometric, uppercase-tracked labels and big tabular figures. Literata keeps headlines and long reading warm and bookish.

### Hierarchy
- **Display** (Literata 600, clamp(2rem, 3.4vw, 3rem), 1.1): manşet headline (max 22ch) and article title (up to clamp(2rem, 4.4vw, 3rem)).
- **Figure** (Jost 700, clamp(2rem, 2.5vw, 2.3rem), 1.05, tabular numerals): indicator values. Every number on the site uses tabular numerals.
- **Title** (Literata 600, 1.18rem, 1.3): headlines in list rows.
- **Body** (Literata 400, 1rem, 1.6). Spots run at 1.2rem/1.55 (max 60ch). Article prose runs at 1.12rem/1.75 inside a 720px column, with Jost 700 subheads.
- **Section label** (Jost 700, 1.05rem, 0.1em tracking, uppercase): section heads and indicator names (0.95rem).
- **Label** (Jost 500 to 600, 0.8 to 0.92rem, 0.06 to 0.1em tracking, uppercase for nav, table heads and category names; sentence case for dates, legends and notes).

### Named Rules
**The Sans Counts, Serif Tells Rule.** Anything you count, scan or navigate is set in Jost. Anything you read is set in Literata.

**The No Kicker Rule.** Headings stand alone. No small uppercase line sits above a headline. The category belongs in the künye line below (icon + name + date).

## Layout

The container is 1440px max with a fluid gutter (clamp(16px, 4.5vw, 64px)). The front page stacks: masthead, the breaking strip, a full-width indicator band of three columns (48px gaps), then a 2fr/1fr grid with the manşet on the left and a ruled side list on the right, then sections of two-column ruled lists (48px column gap). Sections open with 40px top space. List rows are 16/18px with a hairline below. Thumbnails are optional at 132px (96px on mobile) on the right of a row.

Responsive behaviour: the masthead date hides below 1440px. The nav wraps to its own scrolling row below 1240px. Below 1100px the indicator band becomes one row per indicator (name, value, meaning and legend left, pictogram table right). The front grid and footer go to one column below 900px. Lists go to one column below 700px and the pictogram height drops from 22px to 20px.

## Elevation & Depth

The system is flat. There are no shadows, no blur and no tonal layering beyond the one `paper-2` footer band. Hierarchy comes from rule weight and ink, never from depth.

### Named Rules
**The Rule Weight Rule.** A 4px rule marks structure: under the masthead, under section heads (in the category ink where there is one), above article heads, and above the footer. A 1px ink rule closes bands. 1px `hair` rules separate rows. Article tables use a single 2px ink rule under their header.

## Shapes

Every corner is square (0px), and there are no gradients. Images sit in fixed aspect frames (16:9 manşet, 4:3 thumbnails) over `paper-2`. The only rounded or organic forms are the pictograms themselves: flat, single-colour Arntz-style silhouettes on a 24×24 grid, authored as one SVG sprite and referenced with `<use>`. The brand mark (owner-supplied, traced in `brand/finfolis-mark.svg`) is drawn in `currentColor` beside the Jost 700 wordmark.

## Components

### Isotype Row (signature)
Quantity is the **count** of identical pictograms at a fixed height (22px, or 20px on mobile), never their size. Pictograms come in groups of ten (2px apart inside a group, 10px between groups) so a reader can count them. A fractional remainder is drawn by cropping the last pictogram's viewBox, never by scaling it. Each indicator shows a "Bugün" row in full ink and a comparison row ("Bir yıl önce", with its value) at 0.38 opacity. A legend sits under every indicator ("[pictogram] = 2 TL"), and each indicator ends with its own "[source] · [date]" line. Only real, delayed data is shown; the band is hidden entirely when there is none. Rows exist only where they count a real quantity.

**Motion:** on first load the pictograms count in one by one (0.42s, cubic-bezier(0.16, 1, 0.3, 1), 26ms stagger, comparison row delayed 380ms; rising 4px from 0.7 scale). Under `prefers-reduced-motion` they are static.

### Change Mark
Jost 500 in `ink-2`, tabular. An ink triangle (0.62em) gives the direction and a dash with "sabit" marks no change. The figure is unsigned (%0,8), because the triangle carries the sign. It is never red or green.

### Navigation
The masthead runs on one line: mark and wordmark, then the category nav (Jost 500, 0.92rem, uppercase, 0.08em). Each link is led by its 16px category pictogram in its ink. Hover and the current page show a 4px underline in the category ink that sits on the masthead rule. The current page is also set in 700.

### Section Head
Jost 700 uppercase label with an optional 20px pictogram, over a 4px rule in the category ink (ink by default). The rule drops to 1px in the side list.

### News Row and Künye
A Literata 600 headline, an optional spot in `ink-2`, and the künye line. The künye shows the category pictogram (14px, fill ink) and category name (uppercase, text ink), then the date in `muted`. Rows are complete without images.

### Breaking Strip
A reversed label (paper on ink, Jost 700 uppercase, 0.8rem), then headlines in a horizontal scroller, closed by a 1px ink rule. This is a functional label for the strip, not a heading kicker.

### Indicator Table
Other indicators sit in a ruled table: a pictogram in ink, an uppercase name, a right-aligned bold value, the value a year ago, a yearly and a daily change mark, with hairline rows and a data note below. Column headers are buttons that sort the rows; the active sort is announced with `aria-sort`, and missing values always sort last. A ninety-day column shows the trend as a sparkline.

### Article Table (haber tablosu)
A comparison table inside a story, at most one per article. Same ruled style as the Indicator Table, with a sans header row, a sans first column and right-aligned tabular figures. It is drawn only when every number in it appears in the source text; the source and date line sits below it.

### Pictogram Chart (haber grafiği)
A story's comparison as rows of identical pictograms, one per 2 to 6 items. The unit is chosen so the largest value fits in 20 pictograms, and a legend gives the unit ("= 0,2 yüzde"). It appears only when the story has no table, and every value must be in the source.

### Sparkline
A 120×36 px line in `ink-2`, 1.25 px, with a 2.25 px dot in `ink` on the latest point. No fill and no gradient. It is drawn only from at least seven real points, so a short or missing series shows nothing. Its label names the date range and the direction in words ("yükseldi / düştü / değişmedi").

### Disclaimer Box
A 1px ink border, square, Jost 0.92rem in `ink-2`, under every article. The same wording appears in the footer.

### Focus and Links
Links underline on hover (1px, 0.18em offset). Prose links are always underlined. Focus is a 2px ink outline at a 3px offset. Selection is paper on ink.

## Do's and Don'ts

### Do:
- **Do** show quantity as a count of identical pictograms, in groups of ten, cropping the last one for fractions.
- **Do** pair every pictogram row with a legend stating the unit, and give every indicator its own "[source] · [date]" line. Never show sample or estimated data.
- **Do** use each category's fill token for pictograms and rules and its text token for type.
- **Do** use 4px ink or category-ink rules for structure and 1px rules elsewhere.
- **Do** set every figure in Jost with tabular numerals.
- **Do** give every motion a static `prefers-reduced-motion` fallback.
- **Do** style through classes in the stylesheet. The CSP forbids inline styles, so no `style` attributes.

### Don't:
- **Don't** scale a pictogram to show a bigger number, or use pictograms as decoration.
- **Don't** encode up or down with red or green.
- **Don't** put kickers or eyebrows above headings.
- **Don't** use shadows, rounded corners or gradients.
- **Don't** add a dark scheme. The world is printed paper.
- **Don't** reassign an ink to a second category or set type in the ochre fill.
- **Don't** borrow tidsrost or kifobu visual devices. finfolis has no family look.
