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
 * Note: The search plugin calls this hook once per locale for localized collections.
 * The `originalDoc` is already fetched with the correct locale by the plugin.
 *
 * @param args - The beforeSync hook arguments
 * @returns Modified search data with enhanced searchableContent and locale
 */
export const beforeSyncHook: BeforeSync = async ({ originalDoc, searchDoc, payload }) => {
  const doc = originalDoc as any

  // The plugin passes the document with locale already resolved
  // For localized collections, doc contains the localized content
  // For non-localized collections, we default to 'de'
  const locale = doc.locale || 'de'

  let documentTitle = ''
  let additionalContent = ''

  // Extract and process content based on collection type
  switch (searchDoc.doc.relationTo) {
    case 'artists': {
      // Get artist name (non-localized)
      documentTitle = doc.name || ''

      // Biography (localized richText)
      if (doc.biography) {
        const biographyText = extractLexicalText(doc.biography)
        additionalContent += ` ${biographyText}`
      }

      // Quote (localized text)
      if (doc.quote) {
        additionalContent += ` ${doc.quote}`
      }

      // Repertoire sections (localized richText)
      if (Array.isArray(doc.repertoire)) {
        doc.repertoire.forEach((section: any) => {
          if (section.title) {
            additionalContent += ` ${section.title}`
          }
          if (section.content) {
            const contentText = extractLexicalText(section.content)
            additionalContent += ` ${contentText}`
          }
        })
      }

      // Discography sections (localized richText)
      if (Array.isArray(doc.discography)) {
        doc.discography.forEach((section: any) => {
          if (section.recordings) {
            const recordingsText = extractLexicalText(section.recordings)
            additionalContent += ` ${recordingsText}`
          }
        })
      }

      break
    }

    case 'posts': {
      // Get post title (localized)
      documentTitle = doc.title || ''

      // Content (localized richText)
      if (doc.content) {
        const contentText = extractLexicalText(doc.content)
        additionalContent += ` ${contentText}`
      }

      // Denormalize related artist names
      if (Array.isArray(doc.artists) && doc.artists.length > 0) {
        const artistIds = doc.artists.map((artist: any) => (typeof artist === 'object' ? artist.id : artist))

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
      // Get recording title (localized)
      documentTitle = doc.title || ''

      // Description (localized richText)
      if (doc.description) {
        const descriptionText = extractLexicalText(doc.description)
        additionalContent += ` ${descriptionText}`
      }

      break
    }

    case 'employees': {
      // Get employee name (construct from first + last name, non-localized)
      const firstName = doc.firstName || ''
      const lastName = doc.lastName || ''
      documentTitle = `${firstName} ${lastName}`.trim()

      // Bio (localized richText)
      if (doc.bio) {
        const bioText = extractLexicalText(doc.bio)
        additionalContent += ` ${bioText}`
      }

      break
    }
  }

  // Combine the document title with additional extracted content
  const fullContent = `${documentTitle} ${additionalContent}`.trim()

  // Filter stopwords based on locale
  const filteredContent = filterStopwords(fullContent, locale as 'de' | 'en')

  console.log('beforeSyncHook:', {
    collection: searchDoc.doc.relationTo,
    docId: searchDoc.doc.value,
    displayTitle: documentTitle,
    locale,
  })

  return {
    ...searchDoc,
    // Store the clean document title for display
    displayTitle: documentTitle,
    // Store the full searchable content in title field
    title: filteredContent,
    // Store the locale for filtering search results
    locale,
  }
}
