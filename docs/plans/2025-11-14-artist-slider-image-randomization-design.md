# Artist Slider Image Randomization Design

**Date:** 2025-11-14

## Overview

This document describes the approach for randomizing the order of images in the artist slider on the artist list page. The goal is to provide a fresh, randomized image order for each artist every time the page loads, improving visual variety and flexibility.

## Requirements

- The order of images in each artist’s slider should be randomized on every page load.
- The randomization should occur server-side, using the Payload CMS local API.
- The frontend slider component should display images in the order received, with no additional shuffling logic.
- No changes are required to the Media collection or image upload process.

## Implementation

### Data Fetching

- Update the data fetching logic for the artist list page (e.g., in `src/services/artist.ts` or the relevant API route).
- After fetching each artist and their associated images from Payload CMS using the local API, apply a shuffle algorithm to the images array before returning the data to the frontend.

#### Example (TypeScript)

```ts
import payload from 'payload'

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const getArtistsWithShuffledImages = async () => {
  const { docs: artists } = await payload.find({ collection: 'artists' })
  return artists.map(artist => ({
    ...artist,
    images: shuffleArray(artist.images || []),
  }))
}
```

- Integrate this logic into the existing data fetching function (e.g., `getArtistListData` or a new function as appropriate).

### Frontend

- The slider component should render images in the order provided by the backend.
- No changes are needed to the slider logic.

### Testing

- Reload the artist list page multiple times to confirm that the image order changes on each load.
- Ensure that the frontend displays the images in the order received.

## Notes

- This approach ensures a consistent, randomized order per page load, with no flicker or reordering during client-side navigation.
- If future requirements call for more advanced ordering (e.g., session-persistent or user-customizable), this design can be extended.

