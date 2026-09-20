/**
 * Shared sizing/quality config for an artist's featured/hero image on their detail page
 * (`src/app/(frontend)/[locale]/artists/[slug]/page.tsx`).
 *
 * Exported so other components (e.g. the homepage artist grid) can preload the exact same
 * `next/image` responsive variant ahead of navigation — matching `src`/`sizes`/`quality` produces
 * a byte-identical optimizer URL, so a preload with these values warms the browser cache with the
 * same bytes the detail page will request, making the transition feel instant.
 */
export const ARTIST_FEATURED_IMAGE_SIZES = '(min-width: 1024px) min(75vw, 912px), (min-width: 768px) 75vw, 100vw'
export const ARTIST_FEATURED_IMAGE_QUALITY = 80
