# DESIGN.md — Künstlersekretariat Astrid Schoerke GmbH

## Direction (anchor the whole design on this line)

**"An editorial, premium, light-first redesign of a classical music management agency website — same fixed brand
palette (yellow accent on white), Playfair Display + Inter typography, photography-first layouts, generous
whitespace, hairline dividers, calm and confident like the printed program of a serious concert hall."**

**Live site:** https://ks-schoerke.de · **Locales:** German (primary, default), English (secondary). All copy must
render in both; German runs ~30% longer than English — never use tight fixed-width labels.

---

## Brand

- **What:** Website of a classical music management agency (Künstlersekretariat) in Wiesbaden, Germany. Represents
  and books soloists, chamber ensembles, and conductors.
- **Primary audience:** Concert bookers, orchestra managers, festival directors, venue programmers — arrive
  purposefully to research artists, review recent activity, find who to contact.
- **Tone:** Refined, authoritative, warm. Elegant but not stuffy. The yellow reads as gold-tinged warmth, not
  playground brightness.
- **Must communicate:** credible & established · excellent current roster · active (news/projects/tours) · easy to
  contact.

## Non-negotiables

- Keep the exact palette below. No new hues.
- Light theme only. No dark mode.
- No gradients, glassmorphism, playful/whimsical elements, or gratuitous animation (subtle fades + hover lifts only).
- Yellow is an accent, never a large surface fill — typically ≤ ~15% of any viewport.
- Photography is the hero; give images space and let them breathe.
- Whitespace is a feature, not waste.

---

## Design Tokens

### Color (exact)

| Role            | Hex       | Usage                                                    |
| --------------- | --------- | -------------------------------------------------------- |
| Mikado Yellow   | `#FCC302` | Primary CTA, active/hover/focus emphasis, progress, underlines |
| Platinum        | `#E3E3E3` | Alternate section bg, footer lower band, hairline tints   |
| Silver          | `#ADB2B4` | Muted/secondary text, meta, captions, borders, placeholders |
| Raisin Black    | `#222126` | Headings, body text, dark surfaces, text on yellow        |
| White           | `#FFFFFF` | Primary background                                        |
| Success         | `#4A9D3F` | Success states (forms)                                    |
| Error           | `#DC2626` | Error states (validation, destructive)                    |

Rules: white bg dominant; raisin-black text; silver only for meta/captions/placeholder (never body copy on white);
hairline borders at `rgba(173,178,180,0.4)` or platinum; focus rings `2px` yellow with `2px` offset. Contrast:
black-on-yellow ~8.4:1 (required), never white text on yellow, white text on photos needs a scrim
(`rgba(0,0,0,0.5–0.7)`).

### Typography

- **Display:** Playfair Display (400–900, italic available) — all headings, card titles, quotes.
- **UI/Body:** Inter (400–700 variable) — body, labels, nav, buttons, meta.

| Token   | Font     | Size (mobile → desktop) | Weight | LH   | Use                                  |
| ------- | -------- | ----------------------- | ------ | ---- | ------------------------------------ |
| Display | Playfair | 3rem → 5rem             | 700    | 1.05 | Homepage H1, hero                    |
| H1      | Playfair | 2.5rem → 3.5rem         | 700    | 1.1  | Page titles                          |
| H2      | Playfair | 2rem → 2.75rem          | 700    | 1.15 | Section headlines                    |
| H3      | Playfair | 1.5rem → 1.875rem       | 700    | 1.25 | Card titles, subsections             |
| H4      | Playfair | 1.25rem → 1.375rem      | 600    | 1.3  | Artist names, small headings         |
| Lead    | Inter    | 1.125rem                | 400    | 1.6  | Intro paragraphs                     |
| Body    | Inter    | 1rem                    | 400    | 1.6  | Default text (max ~65–75ch)          |
| Small   | Inter    | 0.875rem                | 400    | 1.5  | Secondary, meta                      |
| Caption | Inter    | 0.75rem                 | 400    | 1.4  | Credits, footnotes                   |
| Overline| Inter    | 0.75rem, UPPERCASE      | 600    | 1.2  | Section labels, letter-spacing 0.08em |

### Spacing & layout

- 4px scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Container `max-w-7xl` (1280px) centered; horizontal padding 16px mobile / 24px tablet / 32px desktop; vertical
  section rhythm 48px mobile, 64–96px desktop.
- Radius: buttons/inputs/cards `8px`; pills `9999px`; images `0px` (gallery feel) or `8px` — consistent per context.
- Hairline `1px` borders only; prefer top/bottom hairlines over full boxes.
- Breakpoints: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1376.

---

## Component Inventory

- **Header:** sticky white top bar, 64px tall, slim bottom hairline. Left: logo (full lockup swaps to icon mark on
  scroll). Right: one-click **DE / EN** locale toggle (current locale bold) + search trigger. Desktop nav as text
  links with animated yellow underline. Mobile: hamburger → full-screen/slide-over menu with large Playfair links.
- **Buttons:** Primary = yellow bg, raisin-black text, 8px radius, 500–600 weight, `px-6 py-3`, subtle shadow, hover
  90% opacity. Secondary = transparent, 1px border (black or silver), black text, hover darkens border + faint
  platinum fill. Ghost/link = text link with animated yellow underline. Focus ring `2px` yellow, `2px` offset.
- **Links:** raisin-black text, yellow underline expands from center on hover (300ms); hover dim `rgba(34,33,38,0.7)`.
  Icon-only links (social/downloads) need `aria-label`.
- **Tabs (artist detail) + subtabs:** underline style — inactive transparent with `2px` transparent bottom border;
  active has `2px` Mikado-Yellow bottom border, no background fill. Applies to top-level tabs and section subtabs
  (e.g., Media → Images / Videos).
- **Artist cards:** photo-first masonry/grid, no card box/border, small gaps (4px). Hover: image zoom `scale-1.05`
  (500ms), dark scrim fade from bottom, Playfair name + Inter instruments slide up. Touch: static overlay bar.
- **News/Project cards:** image (4:3 or 3:2) → caption date (Silver) → Playfair H3 title → 2–3 line excerpt. Whole
  card links; title gets animated yellow underline. Grid: 1 / 2 / 3 columns.
- **Homepage slider:** large 4:3 crossfade (800ms); yellow left border accent, scrim, Playfair white title; thin
  yellow progress bar bottom, dots top-right; pause on hover, ~9s auto-advance.
- **Homepage sidebar:** right column, right-aligned; agency name (Playfair) → address → uppercase tracked nav links
  with underline. Quiet, not a heavy card.
- **Footer:** upper band white — logo + nav columns; lower band Platinum — copyright, legal links, social icons
  (Facebook, Instagram, X/Twitter, YouTube).
- **Forms:** clean inputs, 1px silver border, yellow focus ring, labels above, silver captions below, yellow submit.
  Success/error use `#4A9D3F` / `#DC2626`.
- **Tags/filters:** `rounded-full` pills; inactive = transparent + hairline border + black text; active = black bg +
  white text (or yellow bg + black text — pick one, be consistent).
- **Skeleton:** subtle platinum/silver shimmer while loading.

---

## Page Inventory

1. **Homepage** — no hero banner. Top-to-bottom: (1) News slider ~75% + agency sidebar ~25%; (2) full masonry
   artist roster (all artists, shuffled); (3) Meet the Team (centered heading + link); (4) Contact CTA (centered
   heading + link).
2. **Artists list** — heading, instrument filter pills, masonry grid of artist cards; agency address block.
3. **Artist detail** — photo, name (Playfair), instruments, short bio; tabs **Biography / Repertoire /
   Discography / Media / News / Projects**; optional editorial quote (large Playfair italic, yellow accent); bio-PDF
   download links.
4. **News list / Projects list** — heading, filterable list + pagination; responsive card grid (projects hide date).
5. **News detail / Project detail** — hero image, category, Playfair title, Silver date, prose body (65ch),
   related links.
6. **Team** — agency intro + member cards (portrait, Playfair name, role, contact).
7. **Kontakt / Contact** — heading, address, contact persons, contact form, social links; single-column form.
8. **Legal** — Impressum, Datenschutz / Privacy — simple prose, 65ch.
9. **404** — on-brand, returns home.

---

## Sample Copy (bilingual — use real text in designs)

- Nav: `Startseite`/`Home` · `Künstler`/`Artists` · `News`/`News` · `Projekte`/`Projects` · `Team`/`Team` ·
  `Kontakt`/`Contact`
- Overlines: `Aktuelles`/`Latest News` · `Unsere Künstler:innen`/`Our Artists` · `Das Team`/`Meet the Team` ·
  `Diskografie`/`Discography`
- CTAs: `Kontakt aufnehmen`/`Get in touch` · `Mehr erfahren`/`Learn more` · `Zum Team`/`Meet the team` ·
  `Zurück`/`Back`
- Artist card: name `Anna Lindemann`, role `Pianistin`/`Pianist`; `Konzerte & Projekte`/`Concerts & Projects`
- Empty states: `Keine Medien vorhanden`/`No media available` · `Keine Aufnahmen gefunden`/`No recordings found`
- Contact: `Terminanfrage senden`/`Send booking request`
- Meta: `Künstlersekretariat Astrid Schoerke GmbH · Wiesbaden`
