# Artist Collection: YouTube Links Feature Design

**Date:** 2025-11-09

## Purpose

Allow editors to add, label, reorder, and display multiple YouTube music videos for each artist. These videos will be embedded on the public artist page.

---

## Data Model

- Add a new field to the Artist collection schema under the "Media" tab.
- Field name: `youtubeLinks`
- Type: Array of objects
- Each object contains:
  - `label` (string, required): Short description/title for the video (e.g., "Official Music Video")
  - `url` (string, required): YouTube video URL

**Validation:**  
- The `url` field must match a YouTube URL pattern.  
  Example regex:  
  `/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/`

**Schema snippet:**
```js
{
  name: 'youtubeLinks',
  label: 'YouTube Links',
  type: 'array',
  fields: [
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      label: 'YouTube URL',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'https://www.youtube.com/watch?v=...',
      },
      validate: (value) => {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/
        return youtubeRegex.test(value) ? true : 'Please enter a valid YouTube URL'
      },
    },
  ],
  admin: {
    initCollapsed: true,
  },
}
```

---

## Admin Experience

- Editors can add/remove any number of YouTube links.
- Editors can drag-and-drop to reorder links (order determines display).
- Both `label` and `url` are required for each entry.
- Only valid YouTube URLs are accepted.

---

## Frontend Display

- Fetch artist data (including `youtubeLinks`) using the existing `getArtistById` service or Payload Local API.
- For each entry in `youtubeLinks`:
  - Display the `label` as a heading or caption.
  - Embed the YouTube video using an `<iframe>`, extracting the video ID from the URL.

**Example rendering logic:**
```tsx
{artist.youtubeLinks.map(({ label, url }, idx) => {
  const match = url.match(/(?:v=|be\/)([\w-]{11})/)
  const videoId = match ? match[1] : null
  return videoId ? (
    <div key={idx}>
      <h3>{label}</h3>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={label}
        allowFullScreen
      />
    </div>
  ) : null
})}
```

---

## Notes

- No changes needed to existing service methods; the new field will be included automatically.
- Editors can manage YouTube links directly in the Payload admin UI.
- The feature is fully localized within the Artist collection and does not require a separate collection.

---

**End of design.**
