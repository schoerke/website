# Project-Wide Search Design

## Overview

Implement a fast, mobile-friendly search feature that allows users to search across all public content (Artists,
Projects, News, Employees, Media, Posts, Pages) via both a dedicated search page and a cmd-k style command palette
(using KBar). The search will use a static JSON index generated from public content.

## Requirements

- **Content indexed:** Artists, Projects, News, Employees, Media, Posts, Pages (public/published only)
- **Indexing method:** Static JSON file (`public/search-index.json`), generated via Payload CMS hooks, scheduled job, or
  during build
- **Frontend:**
  - Dedicated search page
  - Command palette (KBar) with cmd-k/ctrl-k shortcut
- **Results presentation:** Grouped by content type, ranked by relevance within each group
- **Mobile-friendly:** Responsive UI, accessible navigation
- **No Google fallback:** If no results, display a “No results found” message

## Architecture

### 1. Search Index Generation

- **Trigger:**
  - Preferred: Payload CMS `afterChange`/`afterDelete` hooks
  - Alternatives: Scheduled job (cron, GitHub Action), or during site build
- **Process:**
  1. Fetch all public content from Payload CMS
  2. Normalize into an array of items with: `id`, `type`, `title`, `description`, `url`
  3. Write to `public/search-index.json`
- **Security:** Only public fields included

### 2. Frontend Integration

- **Loading:** Fetch `/search-index.json` on app load or when needed
- **Mapping:** Map each item to a KBar action (`id`, `name`, `subtitle`, `section`, `url`, `perform`)
- **Context:** Store mapped actions in React context/state for KBar and search page
- **Grouping & Ranking:** Use KBar’s `section` for grouping; implement simple keyword-based ranking

### 3. Dedicated Search Page

- **UI:** Search input, grouped results, cards/list items linking to content
- **UX:** Responsive, accessible, “No results found” message if empty

### 4. Command Palette (KBar)

- **UI:** Cmd-k/ctrl-k shortcut, grouped results, instant navigation
- **UX:** Mobile-friendly, accessible, customizable

## Implementation Notes

- Only public content is indexed and exposed
- No sensitive or unpublished data in the index
- No external search service required
- Reuse mapping/filtering logic between KBar and search page
