import { GERMAN_STOPWORDS } from '../stopwords/de'
import { ENGLISH_STOPWORDS } from '../stopwords/en'

/**
 * Removes stopwords from text based on the specified locale.
 *
 * @param text - The text to filter
 * @param locale - The locale code ('de' or 'en')
 * @returns Text with stopwords removed, normalized and rejoined
 */
export const filterStopwords = (text: string, locale: 'de' | 'en'): string => {
  const stopwordsArray = locale === 'de' ? GERMAN_STOPWORDS : ENGLISH_STOPWORDS
  const stopwords = new Set(stopwordsArray)

  // Split into words, normalize, filter, rejoin
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => {
      // Remove punctuation from word for comparison
      const cleanWord = word.replace(/[.,!?;:()"\[\]{}]/g, '')
      return cleanWord.length > 0 && !stopwords.has(cleanWord)
    })

  return words.join(' ')
}
