import type { Payload } from 'payload'
import { extractLexicalText } from './extractLexicalText'
import { filterStopwords } from './filterStopwords'
import { normalizeText } from './normalizeText'

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

// Instrument translations (both DE and EN for bilingual search)
const INSTRUMENT_TRANSLATIONS: Record<string, string[]> = {
  piano: ['Klavier', 'Piano'],
  'piano-forte': ['Hammerklavier', 'Piano Forte'],
  harpsichord: ['Cembalo', 'Harpsichord'],
  conductor: ['Dirigent', 'Conductor'],
  violin: ['Violine', 'Violin', 'Geige'], // Added common German synonym
  viola: ['Bratsche', 'Viola'],
  cello: ['Violoncello', 'Cello'],
  bass: ['Kontrabass', 'Double Bass', 'Bass'],
  horn: ['Horn', 'Horn'],
  recorder: ['Blockflöte', 'Recorder'],
  'chamber-music': ['Kammermusik', 'Chamber Music'],
}

// Legal page slugs that should only be indexed by title, not content
// This prevents legal text (e.g., names in Impressum) from appearing in search results
const LEGAL_PAGE_SLUGS = ['impressum', 'imprint', 'datenschutz', 'privacy-policy', 'privacy']

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
  let documentSlug = ''

  // Extract and process content based on collection type
  switch (searchDoc.doc.relationTo) {
    case 'artists': {
      // Get artist name (non-localized)
      documentTitle = doc.name || ''
      // Get artist slug (non-localized)
      documentSlug = doc.slug || ''

      // Instruments (non-localized array)
      // Add BOTH German and English instrument names to searchable content
      // so "Klavier" and "Piano" both find pianists
      if (Array.isArray(doc.instrument) && doc.instrument.length > 0) {
        doc.instrument.forEach((instrumentKey: string) => {
          const translations = INSTRUMENT_TRANSLATIONS[instrumentKey] || [instrumentKey]
          // Add all translations for this instrument
          additionalContent += ` ${translations.join(' ')}`
        })
      }

      // Note: Biography, quote, repertoire, and discography are intentionally excluded
      // to keep KBar search focused on finding artists by name and instrument.
      // Full-text biography search can be added later as a separate feature.

      break
    }

    case 'employees': {
      // Get employee name (non-localized)
      documentTitle = doc.name || ''
      // Employees don't have slugs

      // Note: Employee bio is intentionally excluded to keep search focused on names

      break
    }

    case 'pages': {
      // Get page title (localized)
      documentTitle = doc.title || ''
      // Get page slug (localized)
      documentSlug = doc.slug || ''

      // Only index content for non-legal pages
      // Legal pages (impressum, privacy policy, etc.) are only searchable by title
      // This prevents legal text (e.g., names in Impressum) from cluttering search results
      const isLegalPage = LEGAL_PAGE_SLUGS.some((legalSlug) => documentSlug.toLowerCase().includes(legalSlug))

      if (doc.content && !isLegalPage) {
        const contentText = extractLexicalText(doc.content)
        additionalContent += ` ${contentText}`
      }

      break
    }

    case 'repertoire': {
      // Get repertoire title (localized)
      documentTitle = doc.title || ''
      // Repertoire doesn't have slugs (accessed via artist pages)

      // Content (localized richText)
      if (doc.content) {
        const contentText = extractLexicalText(doc.content)
        additionalContent += ` ${contentText}`
      }

      break
    }
  }

  // Combine the document title with additional extracted content
  const fullContent = `${documentTitle} ${additionalContent}`.trim()

  // Filter stopwords based on locale
  const filteredContent = filterStopwords(fullContent, locale as 'de' | 'en')

  // Normalize for diacritic-insensitive search
  const normalizedContent = normalizeText(filteredContent)

  return {
    ...searchDoc,
    // Store the clean document title for display
    displayTitle: documentTitle,
    // Store the slug for routing (artists only now)
    slug: documentSlug,
    // Store the normalized searchable content in title field (diacritic-insensitive)
    title: normalizedContent,
    // Store the locale for filtering search results
    locale,
  }
}
