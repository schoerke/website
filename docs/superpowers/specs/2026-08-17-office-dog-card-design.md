# Office Dog Card Design

**Date:** 2026-08-17

**Status:** Approved

## Goal

Append a static card for the office dog "Yuki" to the end of the team card grid on
the contact pages (`/en/contact`, `/de/kontakt`). The dog is **not** an employee and
must not be added to the `employees` collection. The card reuses the existing
`TeamMemberCard` component and a photo already present in the `images` collection
(`IMG_8115.JPG`, confirmed in the dev database).

## Context

- The team grid lives in `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx`
  (lines 60-70): `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3`, mapping
  `employees` to `TeamMemberCard`.
- Data assembly: `src/app/(frontend)/[locale]/_lib/contactPageData.ts` →
  `getContactPageData` already returns `phoneLabel`/`mobileLabel` from the
  `custom.pages.team` next-intl namespace and fetches images by filename via
  `getImageByFilename` (`src/services/media.server.ts`).
- `TeamMemberCard` (`src/components/Employee/TeamMemberCard.tsx`) renders
  email/phone/mobile links only when the respective string is truthy (lines 44-64),
  so empty strings render no links. Its `image` prop accepts a populated `Image`
  object (line 22).

## Design

### Approach: Reuse `TeamMemberCard`

No new component. The layout builds dog card props inline and appends the card as
the last cell of the existing grid.

### Data flow

1. `contactPageData.ts`: `getContactPageData` adds a parallel fetch
   `getImageByFilename('IMG_8115.JPG')` and returns `dogImage` plus `dogName` /
   `dogTitle` from the team i18n namespace.
2. `ContactPageLayout` receives new optional props:
   - `dogImage?: PayloadImage | null`
   - `dogName?: string`
   - `dogTitle?: string`
3. Inside the team grid, after the `employees.map(...)`, when `dogImage` is present:

```tsx
<TeamMemberCard
  id={-1}
  name={dogName}
  title={dogTitle}
  image={dogImage}
  email=""
  phone=""
  mobile=""
  phoneLabel={phoneLabel}
  mobileLabel={mobileLabel}
/>
```

### i18n

Add to the `custom.pages.team` namespace:

- `src/i18n/en.ts`: `dogName: 'Yuki'`, `dogTitle: 'Office Dog'`
- `src/i18n/de.ts`: `dogName: 'Yuki'`, `dogTitle: 'Bürohund'`

### Error handling / missing image

The dog card renders only when `dogImage` resolves (image exists in the current
database). If the image is missing (e.g. prod not synced), the card is simply not
rendered — no placeholder, no crash. Team section visibility gate
(`employees.length > 0`, line 48) is unchanged.

### Testing

- Unit test for `TeamMemberCard` already covers image rendering and link guards
  (`TeamMemberCard.spec.tsx`) — empty-link behavior is covered.
- New test: render `ContactPageLayout` with `dogImage` set and assert the dog card
  appears after the employee cards with name/title; render without `dogImage` and
  assert no dog card. No existing `ContactPageLayout` test file
  (`_components/` has none), so this is additive.
- **No database changes.** Read-only image lookup only; no schema, migration, or data
  modification. No new dependencies.

## Files touched

- `src/app/(frontend)/[locale]/_lib/contactPageData.ts`
- `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx`
- `src/app/(frontend)/[locale]/contact/page.tsx` (pass dog props)
- `src/app/(frontend)/[locale]/kontakt/page.tsx` (pass dog props)
- `src/i18n/en.ts`, `src/i18n/de.ts`
- Test files for `ContactPageLayout` (if test exists)

## Out of scope

- Adding the dog to the `employees` collection (explicitly rejected by client).
- Touching the `/team` redirect route (stays redirecting to contact pages).
- Homepage "Meet the Team" CTA (unchanged).

## Revision 2026-08-17: grayscale dog image

Replaces the "Approach: Reuse `TeamMemberCard`" rendering detail. The dog card image is
rendered permanently grayscale to visually distinguish the office dog from the staff.

- `TeamMemberCard` gains an optional `grayscale?: boolean` prop. When `true`, the
  `next/image` element gets the Tailwind `grayscale` filter class
  (`className={`h-full w-full object-cover${grayscale ? ' grayscale' : ''}`}`).
  Defaults to `false`; existing employee cards unchanged.
- `ContactPageLayout` passes `grayscale` (true) on the dog card only (plus the existing
  `dogImage`/`dogName`/`dogTitle` props).
- New test in `src/components/Employee/TeamMemberCard.spec.tsx`: card renders the
  grayscale class when `grayscale` is true and omits it when false.
- Data flow, i18n, missing-image handling, and out-of-scope notes unchanged.