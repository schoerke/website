# Team Member Cards → Artist-Card Style with Hover Contact — Design

Date: 2026-08-21
Status: Historical design. Current implementation details below supersede the original mobile-footer proposal.

## Implemented Behavior

- Team cards keep a full-bleed image at every breakpoint. Name and title remain in the
  lower-left gradient scrim.
- On mobile, contact controls are icon-only, horizontal circular buttons on the lower
  right of the image. They use `mailto:` / `tel:` links with accessible labels; no white
  footer is rendered.
- On desktop, contact details use an independent bottom drawer that slides up on hover
  or keyboard focus. It does not affect the resting name/title position.
- The dog card has no mobile action controls: mobile shows only image, name, and title.
  Its desktop drawer shows localized `Wuff!` / `Woof!` plus a bone icon.
- `phoneLabel` / `mobileLabel` were removed. Desktop contact details use icons plus
  values; mobile controls are icons only.

## Problem

Contact-page team member cards (`TeamMemberCard`) don't match the artist-card visual
treatment. They are white cards with a `h-72` photo on top and name/title/contact links
in a body below. The artist cards are full-bleed image cards with gradient scrim and an
overlay that reacts on hover. Additionally, the office-dog card currently renders as a
normal grayscale team card showing "Yuki" / "Office Dog"; it should instead greet with
"Woof!" and a bone icon.

## Goals

1. Restyle `TeamMemberCard` to match `ArtistCard`: `aspect-square`, full-bleed `fill`
   image with focal point, rounded, shadow, hover scale, gradient scrim, name + title
   overlay.
2. Show contact info (email + phone + mobile) **on hover** (desktop) as slide-up overlay
   over the image, preserving `mailto:` / `tel:` links.
3. Touch devices have no hover: pin the contact links in an always-visible footer below
   the image on mobile (`sm:hidden`).
4. Dog card: rest state identical to other team members (name + title over photo); on
   hover (desktop) / footer (mobile) shows "Woof!" + Lucide `Bone` icon instead of
   contact info. Grayscale image treatment kept. Separate `DogCard` component.

## Architecture

Extract a shared card shell used by both cards; each card supplies its own
hover/footer content slot.

### New file: `src/components/Employee/EmployeeCardShell.tsx`

Props:

```tsx
interface EmployeeCardShellProps {
  name: string
  title: string
  image?: PayloadImage | number | null
  priority?: boolean
  grayscale?: boolean
  children: ReactNode // rendered in desktop-hover overlay + mobile footer
}
```

Responsibility: aspect-square artist-style image card. Owns:

- container (`group relative block aspect-square w-full overflow-hidden rounded bg-gray-100
shadow-md transition-transform hover:scale-[1.02]`),
- `fill` `next/image` with focal `objectPosition` (from `image.focalX/focalY`, default
  50),
- UserRound placeholder when no valid image (kept, full-bleed),
- `priority` / `grayscale` passthrough,
- bottom gradient scrim (ArtistCard's `from-black/70 via-black/20`, darkens on hover),
- always-visible bottom-left overlay: name (`font-playfair` italic bold white
  `drop-shadow`) + title (primary-yellow),
- desktop hover area (`hidden sm:block`): renders `children` in a slide-up overlay
  (`translate-y-2 opacity-0 ... group-hover:translate-y-0 group-hover:opacity-100`,
  matching `ArtistMasonryGrid` treatment, with the scroll-hover-disable variant from
  `useDisableHoverOnScroll`),
- mobile footer (`sm:hidden`, below the image inside the card): renders the same
  `children`.

So each card = shell + its `children` slot. Rest-state name/title stays 100% shared.

### Modify: `src/components/Employee/TeamMemberCard.tsx`

Becomes a thin composition over the shell. `children` = the contact block:

- email: `mailto:` link
- phone: `tel:` link, `Phone: +49 ...` (label via `phoneLabel`)
- mobile: `tel:` link, `Mobile: +49 ...` (label via `mobileLabel`)
- rendered only for non-empty values
- white small text for readability over the scrim

Keeps the current `TeamMemberCardProps` shape (`extends Employee` + `phoneLabel`,
`mobileLabel`, `priority`, `grayscale`).

### New file: `src/components/Employee/DogCard.tsx`

Same shell; `children` = "Woof!" text + Lucide `Bone` icon. `grayscale` always true.
Props: `image`, `name` (for the rest-state overlay, i.e. Yuki), `title` (i.e. Office
Dog). No contact props.

### Modify: `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx`

Replace the `TeamMemberCard` usage for the dog (lines ~77-92) with `DogCard` (passing
`image`, `name={dogName}`, `title={dogTitle}`). `dogImage ?` gate unchanged. Remove
`grayscale`, `email=""`, `phone=""`, `mobile=""` wiring for the dog.

## Behavior details

- Desktop at rest: photo, scrim, name + title. No contact visible.
- Desktop hover: contact links (or Woof!/Bone) slide up; scrim darkens; card scales.
- Mobile / touch: contact links (or Woof!/Bone) pinned in footer below image, always
  accessible.
- Scrolling suppresses hover effects (reuse `useDisableHoverOnScroll` variants) so
  overlays don't flash while the user scrolls.
- Missing image → UserRound placeholder (existing `data-testid` kept).
- No contact values → nothing in the children slot; card still renders name/title.

## Testing

- Update `src/components/Employee/TeamMemberCard.spec.tsx`: rest state shows name/title;
  desktop overlay carries slide-up `group-hover` classes; mobile footer (`sm:hidden`) and
  desktop overlay (`hidden sm:block`) both render links (distinguish via `data-testid` or
  `within()` scoping); mailto/tel hrefs preserved; empty-value omission preserved;
  placeholder/priority/grayscale behavior preserved.
- New `src/components/Employee/DogCard.spec.tsx`: rest shows name/title + photo; "Woof!"
  text and a bone (svg) present in overlay/footer; grayscale applied.
- Note happy-dom cannot compute layout; assertions target classes / presence, not visual
  layout, consistent with existing component specs.

## Out of scope

- Homepage / artist pages.
- Contact page layout/ordering, sidebar, i18n strings (existing `dogName`/`dogTitle`
  reused for rest-state overlay).
