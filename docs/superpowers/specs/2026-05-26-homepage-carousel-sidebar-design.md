# Homepage Carousel Sidebar Design

## Problem

On small screens the `HomePageSlider` is too tall — `aspectRatio: 4/3` on a narrow viewport pushes content below the fold. On larger screens the client feels the carousel is too large / "too mobile". A sidebar approach naturally constrains carousel width on desktop without changing aspect ratio or cropping behavior.

## Solution

Add a contact info sidebar to the right of the news carousel on `lg+` screens. Hidden on mobile.

## Layout

**File:** `src/app/(frontend)/[locale]/page.tsx`

Replace the news `<section>` wrapper with a CSS grid:

```tsx
<section className="mb-16">
  <h2 ...>{t('newsHeading')}</h2>
  <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-8">
    <HomePageSlider slides={newsSlides} interval={9000} />
    <HomePageSidebar />
  </div>
</section>
```

- `grid-cols-1` on mobile — carousel full width, sidebar hidden
- `grid-cols-[65fr_35fr]` at `lg` — carousel ~65%, sidebar ~35%
- `gap-8` between columns

## New Component: `HomePageSidebar`

**File:** `src/components/HomePageSidebar/HomePageSidebar.tsx`

- `hidden lg:block` — invisible on mobile/tablet
- Hardcoded contact info (no CMS dependency for now)
- Vertically aligned to top of carousel

### Content

- **Agency name:** Künstlersekretariat Astrid Schoerke GmbH
- **Address:** Emanuel-Geibel-Str. 10, D-65185 Wiesbaden
- **Email:** info@ks-schoerke.de (mailto link)
- **Phone:** +49 (0)611-50 58 90 50 (tel link)

### Styling

- Heading: `font-playfair` for agency name
- Details: muted gray text (`text-gray-600`)
- Links: match existing site link style
- No border/card — clean, minimal

## Behavior

- Mobile (`< lg`): sidebar not rendered, carousel full width
- Desktop (`>= lg`): 65/35 grid, carousel naturally smaller, sidebar shows contact info
- Aspect ratio `4/3` unchanged — carousel is just narrower, so shorter on screen

## Out of Scope

- CMS-driven contact info (future enhancement)
- Quote carousel (separate feature, placed under artist grid)
- Meet the Team / Contact CTAs in sidebar
