# Artist List Page Design

Status: IMPLEMENTED

## Overview & Goals

The Artist List page showcases all artists from Payload CMS, allowing users to browse, filter by instrument, and view
artist details. The page is optimized for SEO, performance, and accessibility, and follows the existing TeamPage grid
design.

**Key features:**

- Image slider of all artists (auto-advancing, clickable)
- Instrument filter tabs (single-select, unselect to show all)
- Responsive artist grid (image, name, instrument)
- All data from Payload CMS via Local API
- Lazy-loaded images
- SSR for SEO

## Data Fetching

- Use Next.js `getServerSideProps` (or `getStaticProps` if content is static) to fetch all artists and their instruments
  from Payload CMS using the Payload Local API.
- Fetch only required fields: name, image, instrument, slug/id.
- Extract unique instruments for filter tabs.

## UI Structure

1. **Image Slider**
   - Displays all artist images in a horizontal slider at the top.
   - Auto-advances every few seconds.
   - Each slide is clickable and navigates to the artist’s detail page.
   - Images are lazy-loaded and include alt text.

2. **Instrument Filter Tabs**
   - Renders a tab for each unique instrument.
   - Single-select: only one tab active at a time; clicking again unselects (shows all artists).
   - No “All” tab; unselecting shows all.
   - No URL changes on filter.
   - Keyboard accessible, clear selection state.

3. **Artist Grid**
   - Responsive grid layout, matching TeamPage grid style.
   - Each card shows artist image (lazy-loaded), name, and instrument.
   - Clicking a card navigates to the artist’s detail page.

## Interactivity & Filtering

- Filtering is performed client-side; all artist data is loaded up front.
- Selecting a tab filters the grid to show only artists with that instrument.
- Unselecting the tab shows all artists.
- No URL or query string changes.

## Error Handling

- If the Payload Local API fetch fails, display a user-friendly error message.
- If no artists are found, display a “No artists found” message.
- Assume all artists have images (no placeholder handling needed).

## SEO & Performance

- SSR ensures all data and markup are present for search engines.
- Set appropriate `<title>`, `<meta name="description">`, and Open Graph tags.
- Use semantic HTML and alt text for accessibility.
- Lazy-load all images in slider and grid.
- Minimize data payload (fetch only needed fields).
- Use responsive image sizes and defer slider JS if possible.

## Design Reference

- The artist grid should visually match the existing TeamPage grid for consistency.
