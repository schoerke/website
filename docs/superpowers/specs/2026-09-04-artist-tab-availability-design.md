# Artist Tab Availability Design

## Goal

Show only artist tabs with content. Do not show empty-state panels as artist profile tabs.

## Data Availability

The artist page computes availability before rendering `ArtistTabs`. Canonical order is Biography, Repertoire, Discography, Media, News, Projects:

- Biography: visible Lexical text exists.
- Repertoire: one or more populated entries with visible content exist.
- Discography: a count query finds one or more published recordings for the artist. It uses the same artist relation and locale behavior as the lazy recording query, but retrieves no recording payload.
- Media: at least one gallery image with a valid URL, or one video with embed code or a supported embed URL, exists.
- News and projects: existing page-level availability checks remain.

`ArtistTabs` receives these availability flags and builds its tab list from them.

The recording collection gets change and delete hooks that revalidate the artists route subtree. This keeps server-computed discography availability current.

## Navigation

The first available tab is the fallback tab. Initial rendering, URL hash resolution, browser navigation, and changing availability use that fallback. A hash pointing to unavailable content resolves to it. Existing behavior preserves the URL hash; it does not rewrite history.

When Media is available, its initial subsection is Images when it has valid images, otherwise Videos. A media hash targeting an empty subsection falls back to its populated subsection.

If no tab has data, `ArtistTabs` renders nothing.

## Testing

Extend artist tab tests to verify each content source hides or shows its tab, direct hashes to hidden tabs use the first available tab, Media subsection fallback, and no markup renders when no tabs are available. Unit-test recording availability and recording revalidation hooks. Existing keyboard and ARIA behavior remains unchanged.
