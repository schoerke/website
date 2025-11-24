import type { Payload } from 'payload'
import { extractLexicalText } from './extractLexicalText'
import { filterStopwords } from './filterStopwords'

// Type definitions from @payloadcms/plugin-search
interface DocToSync {
  title: string
  doc: {
    relationTo: string
    value: string
  }
  [key: string]: any
}

type BeforeSync = (args: {
  originalDoc: {
    [key: string]: any
  }
  payload: Payload
  searchDoc: DocToSync
}) => DocToSync | Promise<DocToSync>

/**
 * BeforeSync hook for the Payload Search Plugin.
 *
 * This hook processes documents before they are indexed in the search collection.
 * It performs three critical operations:
 *
 * 1. **Text Extraction**: Extracts plain text from Lexical richText fields
 * 2. **Stopword Filtering**: Removes common words (based on locale) to improve search quality
 * 3. **Relationship Denormalization**: Includes related entity names (e.g., artist names in posts)
 *
 * @param args - The beforeSync hook arguments
 * @returns Modified search data with enhanced searchableContent and locale
 */
export const beforeSyncHook: BeforeSync = async ({ originalDoc, searchDoc, payload }) => {
  // Determine the locale from the document
  // For localized collections, use the document's locale context
  // For non-localized collections like artists, use default 'de'
  const locale = (originalDoc as any).locale || 'de'

  let additionalContent = ''

  // Extract and process content based on collection type
  switch (searchDoc.doc.relationTo) {
    case 'artists': {
      // Artists: Extract from biography and repertoire
      const artist = originalDoc as any

      // Biography (localized richText)
      if (artist.biography) {
        const biographyText = extractLexicalText(artist.biography[locale] || artist.biography)
        additionalContent += ` ${biographyText}`
      }

      // Quote (localized text)
      if (artist.quote && artist.quote[locale]) {
        additionalContent += ` ${artist.quote[locale]}`
      }

      // Repertoire sections (localized richText)
      if (Array.isArray(artist.repertoire)) {
        artist.repertoire.forEach((section: any) => {
          if (section.title && section.title[locale]) {
            additionalContent += ` ${section.title[locale]}`
          }
          if (section.content) {
            const contentText = extractLexicalText(section.content[locale] || section.content)
            additionalContent += ` ${contentText}`
          }
        })
      }

      // Discography sections (localized richText)
      if (Array.isArray(artist.discography)) {
        artist.discography.forEach((section: any) => {
          if (section.recordings) {
            const recordingsText = extractLexicalText(section.recordings[locale] || section.recordings)
            additionalContent += ` ${recordingsText}`
          }
        })
      }

      break
    }

    case 'posts': {
      // Posts: Extract from content and denormalize artist names
      const post = originalDoc as any

      // Content (localized richText)
      if (post.content) {
        const contentText = extractLexicalText(post.content[locale] || post.content)
        additionalContent += ` ${contentText}`
      }

      // Denormalize related artist names
      if (Array.isArray(post.artists) && post.artists.length > 0) {
        const artistIds = post.artists.map((artist: any) => (typeof artist === 'object' ? artist.id : artist))

        // Fetch artist names
        const artistsData = await payload.find({
          collection: 'artists',
          where: {
            id: {
              in: artistIds,
            },
          },
          limit: artistIds.length,
        })

        const artistNames = artistsData.docs.map((artist: any) => artist.name).join(' ')
        additionalContent += ` ${artistNames}`
      }

      break
    }

    case 'recordings': {
      // Recordings: Extract from description
      const recording = originalDoc as any

      // Description (localized richText)
      if (recording.description) {
        const descriptionText = extractLexicalText(recording.description[locale] || recording.description)
        additionalContent += ` ${descriptionText}`
      }

      break
    }

    case 'employees': {
      // Employees: Extract from bio
      const employee = originalDoc as any

      // Bio (localized richText)
      if (employee.bio) {
        const bioText = extractLexicalText(employee.bio[locale] || employee.bio)
        additionalContent += ` ${bioText}`
      }

      break
    }
  }

  // Combine the default title with additional extracted content
  const fullContent = `${searchDoc.title} ${additionalContent}`.trim()

  // Filter stopwords based on locale
  const filteredContent = filterStopwords(fullContent, locale as 'de' | 'en')

  return {
    ...searchDoc,
    // Override the default title with our enhanced, filtered content
    title: filteredContent,
    // Store the locale for filtering search results
    locale,
  }
}
