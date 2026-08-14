# DESIGN.md — Künstlersekretariat Astrid Schoerke GmbH

**Purpose:** Single design brief for refreshing the website's branding and styles. Read this document in full and
generate designs that follow it exactly. Preserve the existing color identity; modernize everything else toward an
editorial, premium, light-first aesthetic.

**Live site:** https://ks-schoerke.de · **Locales:** German (primary) and English

---

## 1. Brand Overview

**What this is:** The website of **Künstlersekretariat Astrid Schoerke GmbH**, a classical music management agency
(Künstlersekretariat) based in Wiesbaden, Germany. The agency represents and books classical musicians — soloists,
chamber ensembles, and conductors — for orchestras, festivals, and venues.

**Primary audience:** Concert bookers, orchestra managers, festival directors, and venue programmers who come to the
site purposefully to research artists, review recent activity, and find the right person to contact.

**Secondary audience:** The artists themselves and the general public curious about the roster.

**Tone of voice and visual character:** Refined, authoritative, and warm. The design must feel like the printed
program of a serious concert hall — elegant but never stuffy, confident but never loud. The yellow accent is a
signature; it should read as gold-tinged warmth, not playground brightness.

**What the site must communicate quickly:**
1. This is a credible, established agency (trust).
2. The roster is excellent and current (quality).
3. The agency is active — recent news, projects, tours (liveness).
4. Getting in touch is easy (approachability).

---

## 2. Design Direction

**One-line direction:** *An editorial, premium evolution of the existing identity — same palette, elevated
typography, generous whitespace, refined components.*

### Principles

1. **Keep the palette.** The five brand colors are non-negotiable. Do not introduce new hues.
2. **Photography first.** Artist photography is the hero content. Layouts give images space and let them breathe.
3. **Editorial typography.** Playfair Display serif for display; Inter for UI and body. Strong, deliberate hierarchy.
4. **Calm surfaces.** White and light platinum dominate. Yellow is a measured accent, never overwhelming.
5. **Premium restraint.** Fewer borders, more whitespace. Hairline dividers instead of heavy boxes. Quiet refinement.
6. **Purposeful motion.** Subtle fades, smooth hover lifts. No bounce, no flash.

### Non-Goals (do NOT do)

- Do **not** change or add brand colors.
- Do **not** introduce a dark mode. Light theme only.
- Do **not** add playful or whimsical elements, gradients, glassmorphism, or gratuitous animations.
- Do **not** treat yellow as a background fill for large surfaces — reserve it for accents, the primary action, and
  interactive emphasis.
- Do **not** crowd the page. Whitespace is a feature, not waste.

---

## 3. Color System

The palette is fixed. Use these exact hex values everywhere. Do not add new colors; derive all neutrals from the
existing five.

### Brand Colors (exact)

| Name           | Hex       | Role                                              |
| -------------- | --------- | ------------------------------------------------- |
| Mikado Yellow  | `#FCC302` | Primary accent, primary CTA, hover/focus emphasis |
| Platinum       | `#E3E3E3` | Light surfaces, section backgrounds, hairline tints |
| Silver         | `#ADB2B4` | Muted text, secondary text, borders, placeholders |
| Raisin Black   | `#222126` | Primary text, headings, dark surfaces             |
| White          | `#FFFFFF` | Primary background                                |
| Success        | `#4A9D3F` | Success states (forms, confirmations)             |
| Error          | `#DC2626` | Error states (validation, destructive)            |

### Usage Rules

- **Background:** White (`#FFFFFF`) dominant. Platinum (`#E3E3E3`) for alternate/section backgrounds and the footer
  lower band.
- **Text:** Raisin Black (`#222126`) for headings and body. Silver (`#ADB2B4`) for muted/secondary text. Never use
  silver for body copy on white — reserved for captions, meta, and placeholder.
- **Accent / Primary action:** Mikado Yellow (`#FCC302`) background with Raisin Black text. Use yellow for the single
  primary CTA per view, hover underlines, focus rings, active states, and progress indicators.
- **Yellow coverage:** Yellow should typically cover **no more than ~15% of any viewport**. When in doubt, use less.
- **Borders & dividers:** Hairline, using Silver at reduced opacity (`rgba(173,178,180,0.4)`) or Platinum. Avoid
  harsh full-strength gray borders.

### Semantic Roles

- `--color-primary-yellow`: `#FCC302`
- `--color-primary-platinum`: `#E3E3E3`
- `--color-primary-silver`: `#ADB2B4`
- `--color-primary-black`: `#222126`
- `--color-primary-white`: `#FFFFFF`
- `--color-primary-success`: `#4A9D3F`
- `--color-primary-error`: `#DC2626`

### Contrast (WCAG AA)

- Raisin Black on White: ~16:1 ✅
- Silver on White: ~5.8:1 — allowed for large/muted text and non-essential text only.
- Raisin Black on Mikado Yellow: ~8.4:1 ✅ — required for all text on yellow.
- White on Mikado Yellow: ❌ never use white text on yellow.
- White on artist photos: use a scrim (`rgba(0,0,0,0.5–0.7)`) behind white text.

---

## 4. Typography

### Font Families

| Role    | Family             | Weights                                          | Notes                                        |
| ------- | ------------------ | ------------------------------------------------ | -------------------------------------------- |
| Display | **Playfair Display** | 400, 500, 600, 700, 800, 900; italic available   | Serif. All major headings. Editorial feel.   |
| UI/Body | **Inter**          | 400, 500, 600, 700 (variable)                    | All body copy, UI text, labels, nav, buttons. |

Load both from Google Fonts. Playfair Display first, Inter second.

### Type Scale (fluid)

| Token       | Family    | Size (mobile → desktop) | Weight | Line height | Usage                                      |
| ----------- | --------- | ----------------------- | ------ | ----------- | ------------------------------------------ |
| Display     | Playfair  | 3rem → 5rem (48→80px)   | 700    | 1.05        | Homepage H1, hero headlines                |
| H1          | Playfair  | 2.5rem → 3.5rem         | 700    | 1.1         | Page titles                                |
| H2          | Playfair  | 2rem → 2.75rem          | 700    | 1.15        | Section headlines                          |
| H3          | Playfair  | 1.5rem → 1.875rem       | 700    | 1.25        | Card titles, subsections                   |
| H4          | Playfair  | 1.25rem → 1.375rem      | 600    | 1.3         | Artist names, small headings               |
| Lead        | Inter     | 1.125rem                | 400    | 1.6         | Intro paragraphs, subheadings              |
| Body        | Inter     | 1rem (16px)             | 400    | 1.6         | Default body text                          |
| Small       | Inter     | 0.875rem                | 400    | 1.5         | Secondary text, meta                       |
| Caption     | Inter     | 0.75rem                 | 400    | 1.4         | Image credits, footnotes                   |
| Overline    | Inter     | 0.75rem                 | 600    | 1.2         | Section labels — UPPERCASE, letter-spacing 0.08em |
| Nav/Button  | Inter     | 0.875–1rem              | 500–600 | —           | Navigation, buttons                        |

### Usage Rules

- **Headings:** Always Playfair Display, bold, tight line height. Never set body copy in Playfair.
- **Uppercase overlines** (small caps, tracked) introduce sections — e.g., "News", "Our Artists", "Meet the Team".
  Use sparingly and consistently.
- **Letter-spacing:** Display headings: normal to slightly negative (`-0.01em`). Overlines/buttons: wide
  (`0.05–0.1em`). Body: normal.
- **Max line length:** ~65–75 characters for body text (approx. `max-w-prose` / 65ch).
- **Italics:** Use Playfair italic sparingly for quotes and editorial emphasis.

---

## 5. Spacing & Layout

### Base Unit

4px spacing scale. Use Tailwind-scale values: 4, 8, 12, 16, 24, 32, 48, 64, 96.

### Container

- `max-w-7xl` (1280px) content container, centered.
- Horizontal padding: `16px` mobile, `24px` tablet, `32px` desktop.
- Consistent vertical rhythm between sections: `64–96px` on desktop, `48px` on mobile.

### Editorial Rhythm

- Generous whitespace between sections. A section starts with an overline label, then a Playfair heading, then
  content.
- Whitespace does the separating — avoid stacking multiple boxed/outlined surfaces.
- Alternating backgrounds (white → platinum) are acceptable for section alternation but keep it calm.

### Radius

- Buttons, inputs, cards: `8px` (`rounded-lg`).
- Images: `0px` or `8px`; keep consistent per context. Artist imagery may be flush (no radius) for a gallery feel.
- Pills/tags: `9999px` (`rounded-full`).

### Borders

- Hairline borders only: `1px`, Silver at `rgba(173,178,180,0.4)` or `#E3E3E3`.
- Prefer top/bottom hairlines over full-box borders.

### Breakpoints

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1376px.

---

## 6. Core Components

### Header

- Sticky top bar, white background, slim (`64px` height), subtle bottom hairline.
- Left: logo. On scroll, the full lockup swaps to the icon-only mark (scroll-aware behavior).
- Right: locale switcher (DE/EN) and search trigger.
- Desktop navigation: Startseite/Künstler/News/Projekte/Team/Kontakt — text links with the animated yellow underline.
- Mobile: hamburger menu → full-screen or slide-over nav, large Playfair links.

### Buttons

- **Primary:** Mikado Yellow background, Raisin Black text, `8px` radius, `500–600` weight, comfortable padding
  (`px-6 py-3`), subtle shadow. Hover: yellow at 90% opacity. This is the single dominant CTA style.
- **Secondary:** Transparent, `1px` Raisin Black or Silver border, Raisin Black text. Hover: border darkens, faint
  platinum fill.
- **Ghost/Link:** Text link with animated yellow underline (see Links).
- Focus ring: `2px` yellow outline offset `2px` on all interactive elements.

### Links

- Standard text links: Raisin Black, animated yellow underline that expands from center on hover (`300ms` ease).
- Hover dim: `rgba(34,33,38,0.7)`.
- Icon links (social, downloads): icon-only, inherits text color, dims on hover, `aria-label` required.

### Artist Cards / Grid

- Photography-first masonry or grid. Image fills the card; no background color behind photos.
- Hover: subtle image zoom (`scale-1.05`, `500ms`), dark scrim fades in from bottom (`rgba(0,0,0,0.6)`), artist name
  (Playfair, white) and instruments (Inter, white/80) slide up.
- Without hover (touch): show name + instruments in a static overlay bar or below the image.
- Card itself: no border, no box — images separated by small gaps (`4px`).

### News / Project Cards

- Image on top (4:3 or 3:2), then date (caption, Silver), then title (Playfair H3), then excerpt (body, 2–3 lines).
- Entire card links; title has the animated yellow underline on hover.
- Layout: responsive grid — 1 col mobile, 2 col tablet, 3 col desktop.

### Homepage Slider

- Large 4:3 image slider, crossfade between slides (`800ms`).
- Title treatment: left border accent bar in Mikado Yellow, dark scrim behind text, Playfair white title.
- Thin yellow progress bar at bottom; dot indicators top-right.
- Pause on hover. Auto-advance ~9 seconds.

### Sidebar (Homepage)

- Right column on desktop, right-aligned text.
- Agency name in Playfair, address in body, then uppercase tracked nav links with animated underline.
- Quiet, informational — not a heavy card.

### Footer

- **Upper band:** white. Logo + navigation columns (Home, Artists, News, Projects, Team / Kontakt, Legal, Privacy).
- **Lower band:** Platinum (`#E3E3E3`). Copyright, legal links, social icons (Facebook, Instagram, X/Twitter, YouTube).
- Decorative motif allowed but keep it subtle and tonal (platinum/yellow at low opacity).

### Forms (Contact)

- Clean single-line inputs, hairline bottom border style or `1px` Silver border, focus ring yellow.
- Labels above inputs, Silver captions below.
- Primary yellow submit button. Success/error states use `#4A9D3F` / `#DC2626`.

### Tags / Filters

- Pill (`rounded-full`) filters, e.g., instrument filter on artists page.
- Inactive: transparent, hairline border, Raisin Black text. Active: Raisin Black background, white text. Or active:
  yellow background, Raisin Black text — pick one and be consistent.

### Loading / Skeleton

- Image skeletons: subtle shimmer in Platinum/Silver tones.

---

## 7. Page Designs

### Homepage

Top-to-bottom narrative. No hero banner — bookers arrive purposefully.

1. **News section:** Overline "Aktuelles / Latest News" → large 4:3 slider (news images) occupying ~75% width, with
   the agency sidebar (~25%) to the right. Slider slides link to news/project detail pages.
2. **Artist roster:** Overline "Unsere Künstler:innen / Our Artists" → centered Playfair heading → short intro →
   full masonry roster (all artists, shuffled, no filter tabs on homepage). On mobile: link to the artists page.
3. **Meet the Team:** Centered Playfair heading + tagline + "Zum Team" link (animated underline).
4. **Contact CTA:** Centered Playfair heading + tagline + "Kontakt aufnehmen" link.

### Artists List

- Heading + optional instrument filter pills.
- Grid of artist cards (photography-first, hover reveal). Sort by instrument priority, then last name.
- Address block of the agency (per existing design).

### Artist Detail

- Top: artist photo, name (Playfair), instruments, short bio.
- Tabs: Biography, Media, Repertoire, Projects (as configured).
- Quote (if present): editorial treatment — large Playfair italic, yellow accent, generous whitespace.
- Downloads (bio PDFs) as icon links with animated underline.

### News / Projects List

- Heading + filterable list with pagination (posts-per-page selector).
- News/project cards in a responsive grid; projects hide the date (per existing behavior).

### News / Project Detail

- Hero image, category label, Playfair title, date (Silver), body copy in `prose` with a 65ch measure.
- Related links at the bottom.

### Team

- Agency introduction, then team member cards: portrait, name (Playfair), role, contact info.

### Contact / Kontakt

- Heading, agency address, contact persons (with `#team` anchor), contact form, social links.
- Clean single-column form with generous spacing.

### Legal Pages (Impressum, Datenschutz / Privacy, Imprint)

- Simple, readable: Playfair page title, body text in prose, 65ch measure.

---

## 8. Image & Artwork Treatment

- **Photography is the hero.** Use large, uncropped-feeling images with correct focal points.
- All artist images use `object-cover` with focal-point positioning; never distort or letterbox.
- Credit photographers: caption line (Inter, caption size, Silver) beneath images where credit exists.
- Provide image skeleton shimmer while loading; fall back to a neutral placeholder on error.
- News/hero images: 4:3 or 3:2. Artist portraits: 3:4.
- White text on photos always sits on a dark scrim for legibility.

---

## 9. Accessibility, Constraints & Technical

### Accessibility (WCAG AA)

- Minimum 4.5:1 for body text, 3:1 for large text and UI components.
- Visible focus states on all interactive elements: `2px` Mikado Yellow outline, `2px` offset.
- Icon-only links/buttons require `aria-label`.
- Decorative icons: `aria-hidden="true"`.
- Semantic HTML: `header`, `nav`, `main`, `footer`, `address`, `ul`/`li`.
- External links: `target="_blank"` with `rel="noopener noreferrer"`.

### Constraints

- **Light theme only.** No dark mode.
- **Bilingual:** All copy appears in German and English; layouts must accommodate both (German text runs ~30% longer
  than English — avoid tight fixed-width labels).
- **Responsive:** Mobile-first; stack gracefully at `sm`/`md`, multi-column at `lg`/`xl`.
- **Performance:** Images optimized (Next.js `next/image`), lazy-loaded below the fold, first image prioritized.
- **No new dependencies:** Use existing stack — Tailwind CSS, shadcn/ui primitives, lucide-react icons, Playfair
  Display + Inter via Google Fonts.

### Implementation Mapping

- Colors live in `src/app/(frontend)/globals.css` (`@theme` block).
- Semantic tokens in the same file (`:root` oklch variables).
- Component patterns in `src/components/`.
- Documented in `docs/design-system.md` — keep it in sync with this brief.

---

## 10. Deliverables for Stitch

Generate the following, in priority order:

1. **Design tokens** — color swatches, typography scale, spacing, radius, per the values above.
2. **Component library** — header, footer, buttons, links, cards (artist/news), slider, forms, tags, pagination.
3. **Page designs** — Homepage, Artists List, Artist Detail, News List, News Detail, Team, Contact, Legal, 404.
4. **Responsive states** — mobile, tablet, desktop for key pages.
5. **Style guide** — a single reference sheet showing the refreshed identity at a glance.

Everything must respect the fixed palette, the Playfair + Inter pairing, the editorial premium direction, and the
light-only constraint.
