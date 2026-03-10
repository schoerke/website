---
Status: Implemented
---

# Project-Wide Search Design

## Overview

Implement a fast, mobile-friendly search feature that allows users to search across all public content (Artists,
Projects, News, Employees, Media, Posts, Pages) via both a robust integrated command palette (using KBar) and search
inputs on key pages. The search uses the official Payload CMS Search Plugin as the primary backend, with performance
optimizations and a static JSON backup for resilience.

> **Note:** The requirement for a dedicated `/search` page is intentionally deferred. The site-wide search UX is fully
> integrated into the news, projects, and other public-facing pages, as well as accessible via KBar. If a standalone
> route is needed in the future, it can be added with minimal architectural change.

## Requirements

- **Content indexed:** Artists, Projects, News, Employees, Media, Posts, Pages (public/published only)
- **Indexing method:** Payload CMS Search Plugin maintains a real-time search collection; static JSON files
  (`public/search-index-de.json`, `public/search-index-en.json`) generated from the search collection as a backup
- **Frontend:**
  - Integrated search inputs on news/projects pages
  - Command palette (KBar) with cmd-k/ctrl-k shortcut
- **Results presentation:** Grouped by content type, ranked by relevance within each group
- **Mobile-friendly:** Responsive UI, accessible navigation
- **No Google fallback:** If no results, display a “No results found” message

## Architecture

### 1. Search Indexing (Payload Search Plugin)

- **Plugin-managed:**
  - The Payload Search Plugin automatically maintains a “search” collection in the database, syncing search-critical
    fields from all public content in real time.
  - Fields and result prioritization are configurable.
- **API:**
  - The frontend queries the search collection via Payload’s API for live results.
- **Security:**
  - Only public/published content is exposed to unauthenticated users.

### 2. Frontend Integration

- **KBar:**
  - Debounced, localized input triggers queries against the Payload API.
  - Returns are mapped to KBar actions and grouped by content type.
- **Integrated Search Inputs:**
  - Debounced input on news/projects pages, with pagination and “no results” handling.
  - Results grouped, ranked, and presented as cards or lists.
- **Performance:**
  - Debounce all search requests to reduce API load and improve UX.
  - Cache recent queries/results in memory.
  - Fields limited to those needed for display; paginated as needed.

### 3. Static JSON Backup

- **Generation:**
  - Generated during build by `scripts/reindexSearch.ts`.
  - Output at `public/search-index-de.json` and `public/search-index-en.json`.
- **Fallback Logic:**
  - If the Payload API is unavailable, frontend seamlessly falls back to static JSON for client-side search.
  - Resilience to downtime/deploy.

### 4. Mobile & Accessibility

- **UI:**
  - Responsive, accessible layouts for both KBar and integrated search.
  - Keyboard, screen reader support, large touch targets, and clear messaging.

## Implementation Notes

- Only public content is indexed and exposed
- No sensitive or unpublished data in the index
- No external search service required
- Reused mapping/filter logic between KBar and page inputs
- Debounced, cached search requests improve performance
- Static JSON backup ensures resilience

---

**This plan is fully implemented as of [March 10, 2026].**

- Payload Search Plugin setup confirmed
- Static JSON index files generated at build
- Robust fallback logic
- Accessible, responsive UI
- Search fully integrated; standalone route intentionally deferred

---
