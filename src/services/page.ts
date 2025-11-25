import config from '@/payload.config'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

/**
 * Retrieves a single page by its URL slug.
 *
 * @param slug - The page's URL slug (e.g., 'impressum', 'datenschutz')
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to the page document, or null if not found
 * @throws Error if Payload initialization or database query fails
 *
 * @example
 * const page = await getPageBySlug('impressum', 'de')
 * console.log(page?.title) // "Impressum"
 * console.log(page?.content) // Rich text content
 */
export const getPageBySlug = async (slug: string, locale?: LocaleCode) => {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'pages',
      where: {
        slug: {
          equals: slug,
        },
      },
      locale: locale || 'de',
      fallbackLocale: 'de',
      limit: 1,
    })

    return result.docs[0] || null
  } catch (error) {
    console.error(`Failed to fetch page with slug "${slug}":`, error)
    throw new Error(`Failed to fetch page: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Retrieves all pages from the database.
 *
 * @param locale - Optional locale code ('de', 'en', or 'all'). Defaults to 'de' with 'de' fallback
 * @returns A promise resolving to all pages with full field data
 * @throws Error if Payload initialization or database query fails
 *
 * @example
 * const pages = await getPages('en')
 * console.log(pages.docs) // Array of page documents
 */
export const getPages = async (locale?: LocaleCode) => {
  try {
    const payload = await getPayload({ config })
    return await payload.find({
      collection: 'pages',
      locale: locale || 'de',
      fallbackLocale: 'de',
      limit: 0, // Fetch all pages (no limit)
    })
  } catch (error) {
    console.error('Failed to fetch pages:', error)
    throw new Error(`Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
