# Fix Homepage Masonry Grid Jank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ArtistMasonryGrid` items keep a constant height across image load states so the CSS multi-column layout never rebalances and the grid stops jumping while scrolling.

**Architecture:** Two root causes in `MasonryGridItem`: (1) the in-flow `ImageSkeleton` and `opacity-0` `<Image>` stack vertically, doubling the item height until load; (2) the `<Image>` box aspect ratio changes on load (attr hint 3:4 → intrinsic ratio). Fix: force the `<Image>` box to the Payload metadata ratio via inline `style.aspectRatio` and make the skeleton `absolute inset-0` so only the image box sizes the item. Per-artist ratios are kept, so the masonry waterfall look is preserved.

**Tech Stack:** React 19, Next.js (`next/image`), Tailwind CSS, Vitest + Testing Library.

---

## File Structure

- `src/components/ui/ImageSkeleton.tsx` — add optional `className` prop so the skeleton can be positioned out of flow where consumed.
- `src/components/Artist/ArtistMasonryGrid.tsx` — compute a stable aspect ratio from image metadata, apply it to `<Image>`, make skeleton absolute.
- `src/components/Artist/ArtistMasonryGrid.spec.tsx` — update the `next/image` mock to forward `style`, add tests for the stable box.

---

## Task 1: Failing tests for the stable image box

**Files:**

- Modify: `src/components/Artist/ArtistMasonryGrid.spec.tsx`
- Test: `src/components/Artist/ArtistMasonryGrid.spec.tsx`

### Step 1: Update the `next/image` mock to forward `style`

In `src/components/Artist/ArtistMasonryGrid.spec.tsx:10-27`, replace the mock with:

```tsx
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
    style,
    onLoad,
    onError,
  }: {
    src: string
    alt: string
    className?: string
    style?: React.CSSProperties
    onLoad?: () => void
    onError?: () => void
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} onError={onError} />
  ),
}))
```

### Step 2: Add failing tests

Add the following three `it` blocks inside the `describe('ArtistMasonryGrid', ...)` block, after the existing "renders the real image" test (`ArtistMasonryGrid.spec.tsx:58-64`):

```tsx
it('reserves the image box with the Payload aspect ratio before the image loads', () => {
  const artist = createMockArtist({
    image: createMockImage({ url: 'https://example.com/jane.jpg', width: 900, height: 1200 }) as never,
  })
  renderGrid([artist])

  const img = screen.getByAltText('Jane Artist') as HTMLElement
  expect(img).toHaveStyle({ aspectRatio: '900 / 1200' })
})

it('falls back to a 3:4 aspect ratio when image dimensions are unknown', () => {
  const artist = createMockArtist({
    image: { url: 'https://example.com/jane.jpg' } as unknown as never,
  })
  renderGrid([artist])

  const img = screen.getByAltText('Jane Artist') as HTMLElement
  expect(img).toHaveStyle({ aspectRatio: '3 / 4' })
})

it('keeps the skeleton out of the flow so it does not double the item height', () => {
  const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
  renderGrid([artist])

  const skeleton = document.getElementsByClassName('animate-pulse')[0] as Element
  expect(skeleton).toHaveClass('absolute', 'inset-0')
})
```

### Step 3: Run tests to verify they fail

Run: `pnpm vitest run src/components/Artist/ArtistMasonryGrid.spec.tsx`

Expected: FAIL — `toHaveStyle({ aspectRatio })` fails (no `style` with `aspectRatio` forwarded / not set), and the `skeleton` is not `absolute inset-0`.

---

## Task 2: Implement stable box + out-of-flow skeleton

**Files:**

- Modify: `src/components/ui/ImageSkeleton.tsx`
- Modify: `src/components/Artist/ArtistMasonryGrid.tsx`
- Test: `src/components/Artist/ArtistMasonryGrid.spec.tsx`

### Step 1: Add `className` prop to `ImageSkeleton`

Replace the full contents of `src/components/ui/ImageSkeleton.tsx`:

```tsx
interface ImageSkeletonProps {
  width?: number | null
  height?: number | null
  fallbackRatio?: string
  className?: string
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ width, height, fallbackRatio = '3 / 2', className }) => {
  const aspectRatio = width && height ? `${width} / ${height}` : fallbackRatio
  return (
    <div className={`w-full animate-pulse bg-gray-200 ${className ?? ''}`} style={{ aspectRatio }} aria-hidden="true" />
  )
}

export default ImageSkeleton
```

### Step 2: Compute stable aspect ratio in `MasonryGridItem`

In `src/components/Artist/ArtistMasonryGrid.tsx`, inside `MasonryGridItem` (`ArtistMasonryGrid.tsx:25-99`), after the `focalY` line (`ArtistMasonryGrid.tsx:31`), add:

```tsx
const aspectRatio = image?.width && image?.height ? `${image.width} / ${image.height}` : '3 / 4'
```

### Step 3: Make skeleton absolute and pin the image box ratio

In `src/components/Artist/ArtistMasonryGrid.tsx:59-74`, replace the loading-state fragment:

```tsx
<>
  {/* Skeleton shimmer — collapses once image loads */}
  {!loaded && <ImageSkeleton width={image?.width} height={image?.height} fallbackRatio="3 / 4" />}
  <Image
    src={imageUrl}
    alt={artist.name}
    width={600}
    height={800}
    className={`${imageClasses} ${loaded ? 'opacity-100' : 'opacity-0 transition-opacity'}`}
    style={{ objectPosition: `${focalX}% ${focalY}%` }}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    ref={ref}
    onLoad={onLoad}
    onError={onError}
  />
</>
```

with:

```tsx
<>
  {/* Skeleton shimmer — out of flow so only the image box sizes the item */}
  {!loaded && (
    <ImageSkeleton width={image?.width} height={image?.height} fallbackRatio="3 / 4" className="absolute inset-0" />
  )}
  <Image
    src={imageUrl}
    alt={artist.name}
    width={600}
    height={800}
    className={`${imageClasses} ${loaded ? 'opacity-100' : 'opacity-0 transition-opacity'}`}
    style={{ aspectRatio, objectPosition: `${focalX}% ${focalY}%` }}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    ref={ref}
    onLoad={onLoad}
    onError={onError}
  />
</>
```

### Step 4: Run tests to verify they pass

Run: `pnpm vitest run src/components/Artist/ArtistMasonryGrid.spec.tsx`

Expected: PASS — all 8 tests (5 existing behavior tests + 3 new stable-box tests). The existing `renders the real image` test still passes because `src` and `alt` are unchanged.

### Step 5: Commit

```bash
git add src/components/ui/ImageSkeleton.tsx src/components/Artist/ArtistMasonryGrid.tsx src/components/Artist/ArtistMasonryGrid.spec.tsx
git commit -m "fix: stop homepage masonry grid from jumping while images load"
```

---

## Task 3: Full verification

**Files:** none (verification only)

### Step 1: Run typecheck

Run: `pnpm typecheck`

Expected: exit 0, no type errors.

### Step 2: Run lint

Run: `pnpm lint`

Expected: exit 0, no warnings.

### Step 3: Run full test suite

Run: `pnpm test`

Expected: exit 0, all specs pass.

### Step 4: Format check

Run: `pnpm format`

Expected: prettier/oxfmt rewrites nothing (working tree stays clean after step 3's changes).

---

## Self-Review Notes

- Spec coverage: stable box ratio (✓ Tasks 1-2), skeleton out of flow (✓ Tasks 1-2), fade-in kept (unchanged code), placeholder unchanged (untouched), `ImageGallery` explicitly out of scope per spec.
- No placeholders: every changed line is spelled out above.
- Type consistency: `aspectRatio` is a single const used only in the `<Image>` `style`; `className` prop is optional everywhere, so existing `ImageSkeleton` call sites (`HomePageSlider.tsx`, `ImageGallery.tsx`) compile unchanged.
