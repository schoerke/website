# Artist Media Tab with Image Gallery — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

Replace the existing "Video" tab on the artist detail page with a combined "Media" tab containing two sub-sections: "Images" (a masonry photo gallery with lightbox) and "Videos" (the existing YouTube accordion). A new `galleryImages` field is added to the Artist schema to store press photos.

## Schema Changes

**File:** `src/collections/Artists.ts`

Add a `galleryImages` array field inside the existing "Media" admin tab, alongside `youtubeLinks`:

```ts
{
  name: 'galleryImages',
  label: { en: 'Gallery Images', de: 'Galeriebilder' },
  type: 'array',
  labels: {
    singular: { en: 'Image', de: 'Bild' },
    plural: { en: 'Images', de: 'Bilder' },
  },
  admin: { initCollapsed: true },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'images',
      required: true,
    },
  ],
}
```

- No migration required — existing artists will simply have an empty gallery array.
- The existing `galleryZIP` download field is unchanged.
- Caption is not stored per-image; the `alt` text from the `images` collection is used instead.

## Tab Structure

**File:** `src/components/Artist/ArtistTabs.tsx`

- Rename `TabId` value `'video'` → `'media'`.
- Tabs array: `['biography', 'repertoire', 'discography', 'media', 'news', 'projects']`.
- Pass `artist.galleryImages` and `artist.youtubeLinks` as props to the new `MediaTab` component.
- No lazy-fetching needed — both fields are already on the artist document.

### URL Hash Navigation

The hash-reading logic on mount is extended to support compound hashes for the media sub-section:

| Hash              | Result                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `#media`          | Media tab, Images sub-section (default)                          |
| `#media-images`   | Media tab, Images sub-section                                    |
| `#media-videos`   | Media tab, Videos sub-section                                    |
| `#video` (legacy) | Falls through to default tab (Biography) — acceptable regression |

When the sub-section changes, `window.history.pushState` writes the compound hash (e.g. `#media-videos`).

## Components

### `MediaTab` (added to `ArtistTabContent.tsx`)

- Client component.
- Owns `mediaSection: 'images' | 'videos'` state, defaulting to `'images'` (or driven by initial hash).
- Renders a `ToggleGroup` sub-selector ("Images" / "Videos") in the same style as `RepertoireTab`.
- Renders `<ImageGallery>` or `<VideoAccordion>` based on `mediaSection`.
- Props: `images: Artist['galleryImages']`, `videos: Artist['youtubeLinks']`, `emptyMessage: string`, `initialSection: 'images' | 'videos'`.

### `ImageGallery` (`src/components/Artist/ImageGallery.tsx`)

- Client component.
- Renders a CSS columns masonry grid using the same Tailwind classes as `ArtistMasonryGrid`: `columns-1 sm:columns-2 lg:columns-3 gap-1`.
- Each item is a thumbnail (Next.js `<Image>`) with a click handler to open the lightbox at that index.
- Props: `images: Artist['galleryImages']`, `emptyMessage: string`.
- Empty state: same centered text pattern as other tabs.

### `ImageLightbox` (`src/components/Artist/ImageLightbox.tsx`)

- Client component.
- Built on **Radix `Dialog`** (already in project via shadcn) for the overlay: Escape to close, focus trap, accessibility handling.
- Uses **Embla Carousel** (already in project) inside the dialog for image navigation.
- Features:
  - Previous / next arrow buttons
  - Keyboard navigation (left/right arrows via `keydown` listener, Escape via Radix Dialog)
  - Touch swipe via Embla's built-in pointer events
  - Image `alt` text displayed as caption below the image
- Props: `images: Artist['galleryImages']`, `initialIndex: number`, `open: boolean`, `onClose: () => void`.

## i18n Changes

**Files:** `src/i18n/en.ts`, `src/i18n/de.ts`

Add/replace the following keys:

```ts
tabs: {
  // replace:
  video: 'Video'
  // with:
  media: 'Media', // DE: 'Medien'
},
empty: {
  // replace:
  video: 'No videos available.'
  // with:
  media: 'No media available.', // DE: 'Keine Medien verfügbar.'
},
// new keys:
media: {
  images: 'Images',   // DE: 'Bilder'
  videos: 'Videos',   // DE: 'Videos'
},
```

## Files Changed

| File                                              | Change                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/collections/Artists.ts`                      | Add `galleryImages` array field                                                                             |
| `src/components/Artist/ArtistTabs.tsx`            | Rename `video` → `media` TabId, update hash logic, pass new props                                           |
| `src/components/Artist/ArtistTabContent.tsx`      | Add `MediaTab` component; `VideoTab` export replaced by `MediaTab` (internally still uses `VideoAccordion`) |
| `src/components/Artist/ImageGallery.tsx`          | New component                                                                                               |
| `src/components/Artist/ImageLightbox.tsx`         | New component                                                                                               |
| `src/i18n/en.ts`                                  | Update/add translation keys                                                                                 |
| `src/i18n/de.ts`                                  | Update/add translation keys                                                                                 |
| `src/components/Artist/ArtistTabs.spec.tsx`       | Update tests for renamed tab                                                                                |
| `src/components/Artist/ArtistTabContent.spec.tsx` | Add tests for `MediaTab`                                                                                    |

## Out of Scope

- Migrating existing `galleryZIP` contents into `galleryImages` (manual editorial task)
- Rewriting `#video` legacy hash redirects
- Any changes to the `VideoAccordion` component itself
