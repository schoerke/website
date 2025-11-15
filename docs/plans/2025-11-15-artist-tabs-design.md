# Artist Detail Page Tab Group – Design

## Overview

This document describes the design for a tab group component on the Artist detail page. The tab group organizes artist-related content into clearly separated, easily accessible sections, improving navigation and discoverability for users. The component is specific to the Artist detail page and is tailored to the data model and UX needs of this site.

## Goals

- Improve navigation and discoverability of artist-related content
- Reduce page length and cognitive load by separating content into tabs
- Enable deep linking and browser navigation for specific sections
- Optimize performance by lazy-loading tab content as needed
- Ensure accessibility and mobile usability
- **Support internationalization (i18n) for all tab labels, placeholders, and UI text**

## Tab Group Structure & Behavior

- Tabs: Biography (default), Repertoire, Discography, Video, News, Projects, Concert Dates (conditionally rendered)
- On desktop, tabs are shown as a horizontal tab list; on mobile, they collapse into a dropdown menu
- The selected tab is reflected in the URL hash (e.g., #video) for deep linking and navigation history
- Tab state is managed in React; on mount, the component reads the URL hash to set the initial tab
- Follows WAI-ARIA accessibility patterns for keyboard and screen reader support
- Skeleton loader is shown while loading tab content
- The component is specific to the Artist detail page and not intended for general reuse

## Data Fetching Strategy

- On initial page load, only minimal artist info (biography, name, image) is fetched
- The Biography tab renders immediately from this data
- All other tabs fetch their content on demand from the Payload Local API when selected, using the artist’s ID/slug
- The Concert Dates tab is only rendered if the `externalCalendarURL` field exists on the Artist collection
- Skeleton loaders are shown while tab content is loading

## Tab Details

### Biography
- Renders from already-fetched artist data (no additional fetch)
- No change to current loading logic

### Repertoire
- New `repertoire` RichText field on the Artist collection
- Supports text formatting (headings, lists, bold, italics, links); no images or embedded media
- No maximum length
- Renders using the existing RichText renderer
- Placeholder message shown if field is empty

### Discography
- New `discography` array field on the Artist collection
- Each object represents a recording (structure flexible for now; at minimum, a title)
- Renders as a list of recordings (optionally grid view in the future)
- Placeholder message shown if array is empty
- Designed to be easily extended as the data model evolves

### Video
- New `videos` array field on the Artist collection
- Each object contains at least a YouTube video URL or ID
- Renders as a list of YouTube embeds, each wrapped in a details/summary accordion
- Only one video is open/playing at a time (opening a new accordion stops any currently playing video)
- Placeholder message shown if array is empty

### News
- Pulls from the Posts collection, filtered by artist and the "news" category
- Uses a reusable PostList component for rendering
- Displays posts relevant to the artist, showing title, date, excerpt, and link to full post
- Placeholder message shown if no posts are found

### Projects
- Pulls from the Posts collection, filtered by artist and the "project" category
- Uses the same reusable PostList component as News
- Displays posts relevant to the artist and categorized as "project"
- Placeholder message shown if no posts are found

### Concert Dates
- Only rendered if the `externalCalendarURL` field exists on the Artist collection
- Displays a button or prominent link to open the external calendar in a new tab
- Not rendered if the field is missing or empty

## Accessibility, i18n & Mobile UX

- Tab group follows WAI-ARIA tab pattern for accessibility
- Fully keyboard navigable and screen reader friendly
- On mobile, tabs collapse into a dropdown menu for optimal usability
- Skeleton loaders are accessible and indicate loading state
- **All tab labels, placeholders, and UI text must use the site’s i18n system (e.g., translation files)**
- **Content fields (biography, repertoire, etc.) should support multiple languages if the CMS is configured for this**
- **The tab group and all tab content must render correctly in all supported languages**

## Future-Proofing & Extensibility

- Tab content components are designed to be easily extended as the data model evolves (e.g., richer discography or video info)
- The PostList component is reusable for other parts of the site
- The Concert Dates tab can be expanded to show structured concert data in the future if requirements change

