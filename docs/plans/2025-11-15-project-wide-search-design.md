# Project-Wide Search Design

## Overview

Implement a fast, mobile-friendly search feature that allows users to search across all public content (Artists,
Projects, News, Employees, Media, Posts, Pages) via both a dedicated search page and a cmd-k style command palette
(using KBar). The search will use the official Payload CMS Search Plugin as the primary backend, with performance
optimizations and a static JSON backup for resilience.

## Requirements

- **Content indexed:** Artists, Projects, News, Employees, Media, Posts, Pages (public/published only)
- **Indexing method:** Payload CMS Search Plugin maintains a real-time search collection; optional static JSON file
  (`public/search-index.json`) generated from the search collection as a backup
- **Frontend:**
  - Dedicated search page
  - Command palette (KBar) with cmd-k/ctrl-k shortcut
- **Results presentation:** Grouped by content type, ranked by relevance within each group
- **Mobile-friendly:** Responsive UI, accessible navigation
- **No Google fallback:** If no results, display a “No results found” message

## Architecture

### 1. Search Indexing (Payload Search Plugin)

- **Plugin-managed:**
  - The Payload Search Plugin automatically maintains a “search” collection in the database, syncing search-critical
    fields from all public content in real time.
  - You configure which fields are indexed and how results are prioritized.
- **API:**
  - The frontend queries the search collection via Payload’s REST or GraphQL API for live, up-to-date results.
- **Security:**
  - Configure access control so only public/published content is exposed to unauthenticated users.

### 2. Frontend Integration

- **KBar:**
  - On palette open or as the user types, debounce input (e.g., 200–300ms) and send a search query to the Payload API.
  - Map returned search records to KBar actions (id, name, section, url, etc.).
  - Group and display results by content type, ranked by plugin prioritization.
- **Dedicated Search Page:**
  - As the user types, debounce input and send queries to the Payload API.
  - Display grouped, ranked results as cards or list items.
  - Show “No results found” if the API returns nothing.
- **Performance:**
  - Debounce all search requests to reduce API load and improve UX.
  - Optionally cache recent queries/results in memory to avoid duplicate API calls.
  - Limit API fields to only those needed for display; paginate if necessary.

### 3. Static JSON Backup (Optional)

- **Generation:**
  - Periodically (e.g., nightly or on deploy), generate a static JSON index from the search collection and store it at
    `public/search-index.json`.
- **Fallback Logic:**
  - If the Payload API is unavailable or slow, the frontend loads and searches the static JSON as a backup.
  - Ensures search is always available, even during Payload downtime or deploys.

### 4. Mobile & Accessibility

- **UI:**
  - Responsive layouts for both KBar and the search page.
  - Large touch targets, accessible navigation, keyboard and screen reader support.

## Implementation Notes

- Only public content is indexed and exposed
- No sensitive or unpublished data in the index
- No external search service required
- Reuse mapping/filtering logic between KBar and search page
- Debounce and cache search requests for performance
- Static JSON backup ensures resilience
