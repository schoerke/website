import config from '@/payload.config'
import { getPayload } from 'payload'

type LocaleCode = 'de' | 'en'

/**
 * Retrieves the HomePage global document.
 *
 * Contains CMS-editable intro text for the homepage sections
 * (artists, team, contact). Fields fall back to `null` if not yet set
 * in the CMS — the homepage should render fallback copy in that case.
 *
 * @param locale - Locale code ('de' or 'en'). Defaults to 'de'
 * @returns A promise resolving to the HomePage global document
 *
 * @example
 * const homePage = await getHomePage('en')
 * const intro = homePage.contactIntro ?? t('contactTagline')
 */
import type { HomePage } from '@/payload-types'

export const getHomePage = async (locale: LocaleCode = 'de'): Promise<HomePage> => {
  try {
    const payload = await getPayload({ config })
    return await payload.findGlobal({
      slug: 'home-page',
      locale,
      fallbackLocale: 'de',
    })
  } catch (error) {
    console.error('Failed to fetch HomePage global:', error)
    throw new Error(`Failed to fetch HomePage global: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
