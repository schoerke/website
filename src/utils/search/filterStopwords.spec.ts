import { describe, expect, it } from 'vitest'
import { filterStopwords } from './filterStopwords'

describe('filterStopwords', () => {
  describe('German stopwords', () => {
    it('should remove common German stopwords', () => {
      // "der" is a stopword, "Pianist" and "spielt" and "gut" are not
      expect(filterStopwords('der Pianist spielt gut', 'de')).toBe('pianist spielt gut')
    })

    it('should remove German articles', () => {
      expect(filterStopwords('der die das', 'de')).toBe('')
      expect(filterStopwords('ein eine einen', 'de')).toBe('')
    })

    it('should remove German prepositions', () => {
      // "in" and "dem" are stopwords
      expect(filterStopwords('in dem Haus', 'de')).toBe('haus')
      // "auf" and "der" are stopwords
      expect(filterStopwords('auf der Straße', 'de')).toBe('straße')
    })

    it('should keep non-stopword German words', () => {
      expect(filterStopwords('Beethoven Symphonie Orchester', 'de')).toBe('beethoven symphonie orchester')
    })
  })

  describe('English stopwords', () => {
    it('should remove common English stopwords', () => {
      // "the" and "well" are stopwords, "pianist" and "plays" are not
      expect(filterStopwords('the pianist plays well', 'en')).toBe('pianist plays')
    })

    it('should remove English articles', () => {
      expect(filterStopwords('the a an', 'en')).toBe('')
    })

    it('should remove English prepositions', () => {
      expect(filterStopwords('in the house', 'en')).toBe('house')
      expect(filterStopwords('on the street', 'en')).toBe('street')
    })

    it('should keep non-stopword English words', () => {
      expect(filterStopwords('Beethoven Symphony Orchestra', 'en')).toBe('beethoven symphony orchestra')
    })
  })

  describe('punctuation handling', () => {
    it('should keep punctuation in output but filter based on clean word', () => {
      // Punctuation is kept in output but removed for stopword comparison
      expect(filterStopwords('The quick, brown fox!', 'en')).toBe('quick, brown fox!')
    })

    it('should filter stopwords even with punctuation attached', () => {
      // "the" is filtered even with period
      expect(filterStopwords('The. pianist. violinist.', 'en')).toBe('pianist. violinist.')
    })

    it('should handle question marks', () => {
      // "where", "does", "he" are stopwords
      expect(filterStopwords('Where does he live?', 'en')).toBe('live?')
    })

    it('should handle parentheses', () => {
      // "the" and "in" are stopwords, opening paren is removed (punctuation-only token)
      expect(filterStopwords('The concert (in Vienna)', 'en')).toBe('concert vienna)')
    })

    it('should handle quotes', () => {
      // Quotes are kept in output
      expect(filterStopwords('The "amazing" performance', 'en')).toBe('"amazing" performance')
    })

    it('should handle brackets', () => {
      // Brackets are kept in output
      expect(filterStopwords('The [amazing] violinist', 'en')).toBe('[amazing] violinist')
    })
  })

  describe('case handling', () => {
    it('should normalize all text to lowercase', () => {
      expect(filterStopwords('THE PIANIST', 'en')).toBe('pianist')
      expect(filterStopwords('DER PIANIST', 'de')).toBe('pianist')
    })

    it('should handle mixed case', () => {
      expect(filterStopwords('The Great Violinist', 'en')).toBe('great violinist')
    })
  })

  describe('whitespace handling', () => {
    it('should handle multiple spaces', () => {
      expect(filterStopwords('the  pianist   plays   well', 'en')).toBe('pianist plays')
    })

    it('should handle leading/trailing spaces', () => {
      expect(filterStopwords('  the pianist  ', 'en')).toBe('pianist')
    })

    it('should handle tabs and newlines', () => {
      expect(filterStopwords('the\tpianist\nplays\nwell', 'en')).toBe('pianist plays')
    })
  })

  describe('edge cases', () => {
    it('should return empty string when all words are stopwords', () => {
      expect(filterStopwords('the a an is', 'en')).toBe('')
      expect(filterStopwords('der die das ist', 'de')).toBe('')
    })

    it('should handle empty string', () => {
      expect(filterStopwords('', 'en')).toBe('')
      expect(filterStopwords('', 'de')).toBe('')
    })

    it('should handle single non-stopword', () => {
      expect(filterStopwords('Symphony', 'en')).toBe('symphony')
      expect(filterStopwords('Symphonie', 'de')).toBe('symphonie')
    })

    it('should handle single stopword', () => {
      expect(filterStopwords('the', 'en')).toBe('')
      expect(filterStopwords('der', 'de')).toBe('')
    })

    it('should preserve word order', () => {
      expect(filterStopwords('Mozart and Beethoven', 'en')).toBe('mozart beethoven')
    })

    it('should handle only punctuation', () => {
      expect(filterStopwords('.,!?;:', 'en')).toBe('')
      expect(filterStopwords('.,!?;:', 'de')).toBe('')
    })
  })

  describe('real-world examples', () => {
    it('should filter German artist biography text', () => {
      // "ist", "einer", "der" are stopwords; "besten" is NOT a stopword
      const text = 'Der Geiger ist einer der besten Musiker'
      expect(filterStopwords(text, 'de')).toBe('geiger besten musiker')
    })

    it('should filter English concert description', () => {
      const text = 'The orchestra performs at the concert hall'
      expect(filterStopwords(text, 'en')).toBe('orchestra performs concert hall')
    })

    it('should handle German composition titles', () => {
      const text = 'Symphonie Nr. 9 in D-Moll'
      // "in" is a stopword, period stays with "nr."
      expect(filterStopwords(text, 'de')).toBe('symphonie nr. 9 d-moll')
    })

    it('should handle English composition titles', () => {
      const text = 'Symphony No. 5 in C Minor'
      // "in" is a stopword, standalone period is removed (punctuation-only token)
      expect(filterStopwords(text, 'en')).toBe('symphony 5 c minor')
    })
  })

  describe('locale switching', () => {
    it('should use different stopword lists for different locales', () => {
      const text = 'the der pianist plays'
      // English: "the" is stopword, "der" is not
      expect(filterStopwords(text, 'en')).toBe('der pianist plays')
      // German: "der" is stopword, "the" is not (but also "the" is English stopword in German list)
      expect(filterStopwords(text, 'de')).toBe('the pianist plays')
    })

    it('should handle German-specific stopwords', () => {
      // "und", "oder", "aber" are German stopwords
      expect(filterStopwords('und oder aber', 'de')).toBe('')
      // Not in English stopwords
      expect(filterStopwords('und oder aber', 'en')).toBe('und oder aber')
    })
  })

  describe('punctuation edge cases', () => {
    it('should handle words with apostrophes', () => {
      // Apostrophes are NOT in the punctuation removal list, so they're kept
      expect(filterStopwords("it's a great performance", 'en')).toBe("it's great performance")
    })

    it('should handle hyphens in words', () => {
      // Hyphens are NOT in the punctuation removal list
      expect(filterStopwords('The C-Major Symphony', 'en')).toBe('c-major symphony')
    })
  })
})
