# Design: HomePageSlider Skeleton + `useImageLoad` Hook

**Date:** 2026-04-18

## Problem

The home page slider (`HomePageSlider`) shows an empty/black container while the first image loads. The masonry grid and image gallery components already use `ImageSkeleton` for this, but the pattern is duplicated inline across three components with no shared abstraction.

## Goal

1. Add an animated shimmer skeleton to `HomePageSlider` while the first image loads.
2. Extract a `useImageLoad` hook to eliminate the duplicated load/error tracking pattern across `ArtistMasonryGrid`, `ImageGallery`, and `HomePageSlider`.

## Hook: `useImageLoad`

**Location:** `src/hooks/useImageLoad.ts`

**Returns:**

```ts
{
  loaded: boolean
  error: boolean
  ref: (node: HTMLImageElement | null) => void  // handles already-cached images
  onLoad: () => void
  onError: () => void
}
```

The `ref` callback checks `node.complete` to handle images that are already in the browser cache when the component mounts (bypassing the `onLoad` event).

**Usage:**

```tsx
const { loaded, error, ref, onLoad, onError } = useImageLoad()

<Image
  src={src}
  ref={ref}
  onLoad={onLoad}
  onError={onError}
  className={loaded && !error ? 'opacity-100' : 'opacity-0'}
/>
{!loaded && !error && <ImageSkeleton ... />}
```

## Component Changes

### `ArtistMasonryGrid.tsx`

Replace inline `useState(false)` for `loaded`/`error` + manual `ref`/`onLoad`/`onError` in `MasonryItem` with `useImageLoad()`.

### `ImageGallery.tsx`

Replace `loadedMap`/`errorMap` record state + per-image keyed handlers with one `useImageLoad()` call per image inside the `.map()`. The array is stable (server-rendered data), so this is safe. Eliminates the record-keyed approach entirely.

### `HomePageSlider.tsx`

- Use `useImageLoad()` for slide `idx === 0` only.
- Render `<ImageSkeleton fallbackRatio="4 / 3" />` as an `absolute inset-0` layer behind all slides.
- Hide (remove from DOM) the skeleton once `loaded` is `true`.
- All other slides remain unchanged — no skeleton needed for non-first slides since they are hidden until the user reaches them.

No changes to `ImageSkeleton`.

## Tests

- **`src/hooks/useImageLoad.spec.ts`** — unit tests: initial state, `onLoad` sets loaded, `onError` sets error, `ref` with `node.complete` sets loaded immediately.
- **`src/components/HomePageSlider/HomePageSlider.spec.tsx`** — new test file: skeleton renders before first image loads, skeleton is removed after first image `onLoad` fires.
- Existing component tests (`ArtistMasonryGrid.spec.tsx`, `ImageGallery` if tests exist) continue to pass.

## Out of Scope

- Skeleton for slides 2–N (they are hidden until active; the crossfade handles the transition).
- Error fallback UI for the slider (not requested).
- Any changes to `ImageSkeleton` itself.
