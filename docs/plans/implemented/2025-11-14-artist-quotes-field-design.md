# Artist Quotes Field Design

- **Date:** 2025-11-14
- **Topic:** Artist Collection – Quotes Field and Rotating Display
- **Status: IMPLEMENTED**

---

## Overview

This design introduces a new `quotes` field to the Artist collection in Payload CMS. The goal is to allow content
creators to add up to three orderable, localized quotes (with optional citations) for each artist. These quotes will be
displayed on the artist detail page, fading smoothly between each quote every 5–6 seconds.

---

## 1. Collection Schema Changes

- **Field:** `quotes`
- **Type:** Array
- **Options:**
  - `maxRows: 3` (maximum of 3 quotes per artist)
  - `draggable: true` (orderable by content creators)
- **Fields in each array item:**
  - `quote` (type: text, required, localized)
  - `citation` (type: text, optional, localized)

**Example Payload config:**

```ts
{
  name: 'quotes',
  label: 'Quotes',
  type: 'array',
  maxRows: 3,
  draggable: true,
  fields: [
    {
      name: 'quote',
      label: 'Quote',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'citation',
      label: 'Citation',
      type: 'text',
      required: false,
      localized: true,
    },
  ],
}
```

---

## 2. Localization & Admin UI

- Both `quote` and `citation` fields are localized, allowing entry in multiple languages.
- The array itself is not localized (order and presence of quotes is the same in all languages).
- Admin UI allows adding, reordering, and localizing up to 3 quotes per artist.

---

## 3. Frontend Rendering

- On the artist detail page:
  - Display one quote at a time, fading/blending in and out every 5–6 seconds.
  - Cycle through all available quotes in the order set in the CMS.
  - If only one quote, display it statically.
  - If no quotes, omit the section.
  - Show the citation (if present) below or alongside the quote.
- No manual navigation controls.
- Ensure accessibility (screen reader support, respect reduced motion).

---

## 4. Implementation Notes

- Use the current i18n setup to select the correct language for each quote/citation.
- Animation should be smooth and not distracting.
- Follow project code style and component conventions.
