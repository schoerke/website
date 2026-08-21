# Fix Masonry Grid Jumping on Homepage — Design

Date: 2026-08-21
Status: Approved by user (design phase)

## Problem

On the homepage, `ArtistMasonryGrid` jumps around while the user scrolls as late
artist images finish loading. CSS multi-column (`columns-*`) layout rebalances
whenever an item's height changes, so any late height change causes items to move
between columns.

## Root Cause

Two compounding bugs in `MasonryGridItem` (`src/components/Artist/ArtistMasonryGrid.tsx`):

1. **Skeleton + image double-stack.** While an image loads, `<ImageSkeleton>` (in-flow
   `div`) and `<Image>` (in-flow, `opacity-0`) are rendered as siblings. Both are
   block elements with `w-full`, so the item occupies roughly double its final height.
   When the image loads, the skeleton unmounts and the item collapses — a large reflow
   that rebalances the columns.

2. **Box ratio changes on load.** Pre-load, the `<Image>` box uses the browser's
   aspect-ratio derived from the `width={600} height={800}` attributes (3:4). Post-load,
   with `h-auto w-full`, the box follows the image's intrinsic ratio (e.g. 4:5). The
   skeleton uses the Payload metadata ratio (`image.width / image.height`). These three
   can differ, causing a secondary height jitter on every image load.

Both bugs share one symptom: item height is not constant across load states.

## Solution

Make every item's height constant from first paint, so the column layout computes once
and never rebalances.

### Changes to `MasonryGridItem`

- **Stable box ratio.** Add `style={{ aspectRatio: ratio, objectPosition: ... }}` to the
  `<Image>`, where `ratio = `${image.width} / ${image.height}`` when width/height are
  present, else `3 / 4`. CSS `aspect-ratio` overrides the attribute-derived hint, so the
  box keeps the metadata ratio both before and after load. Per-artist ratios are kept, so
  the masonry's varied-height waterfall look is preserved (images are NOT forced to a
  uniform 3:4).
- **Skeleton out of flow.** Render `<ImageSkeleton>` as `absolute inset-0` so the only
  in-flow box is the image. No more double-height items.
- Keep the existing per-image fade-in (`useImageLoad` + `opacity` transition).

### Unchanged

- Missing-image / error placeholder (already fixed 3:4).
- `useImageLoad` hook.
- Shuffle + grid-level opacity reveal in `ArtistMasonryGrid`.
- `ArtistCard`, `ImageSlide`, slider, sidebar, or any other component.

## Testing

- Update `src/components/Artist/ArtistMasonryGrid.spec.tsx` for the new image `style` and
  any changed class names.
- Run `pnpm test` for the grid spec and `pnpm lint`.

## Out of Scope (noted, not implemented)

`ImageGallery.tsx` (`src/components/Artist/ImageGallery.tsx`) uses the identical
skeleton+image double-stack pattern and will have the same jank on artist pages. Fixing
it is a follow-up pending user interest.