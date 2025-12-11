import { describe, expect, it } from 'vitest'
import { normalizeText } from './normalizeText'

describe('normalizeText', () => {
  describe('basic functionality', () => {
    it('should convert text to lowercase', () => {
      expect(normalizeText('HELLO WORLD')).toBe('hello world')
      expect(normalizeText('MixedCase')).toBe('mixedcase')
    })

    it('should return empty string for null input', () => {
      expect(normalizeText(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      expect(normalizeText(undefined)).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(normalizeText('')).toBe('')
    })
  })

  describe('diacritics removal', () => {
    it('should remove acute accents (é, á, etc.)', () => {
      expect(normalizeText('café')).toBe('cafe')
      expect(normalizeText('Poltéra')).toBe('poltera')
      expect(normalizeText('José')).toBe('jose')
    })

    it('should remove grave accents (è, à, etc.)', () => {
      expect(normalizeText('crème')).toBe('creme')
      expect(normalizeText('à la mode')).toBe('a la mode')
    })

    it('should remove circumflex accents (ê, â, etc.)', () => {
      expect(normalizeText('fête')).toBe('fete')
      expect(normalizeText('château')).toBe('chateau')
    })

    it('should remove umlauts (ü, ö, ä)', () => {
      expect(normalizeText('Müller')).toBe('muller')
      expect(normalizeText('Köln')).toBe('koln')
      expect(normalizeText('Bären')).toBe('baren')
    })

    it('should remove tilde (ñ)', () => {
      expect(normalizeText('español')).toBe('espanol')
      expect(normalizeText('niño')).toBe('nino')
    })

    it('should remove cedilla (ç)', () => {
      expect(normalizeText('français')).toBe('francais')
      expect(normalizeText('façade')).toBe('facade')
    })

    it('should handle Czech/Slovak characters (ř, č, ž, š)', () => {
      expect(normalizeText('Dvořák')).toBe('dvorak')
      expect(normalizeText('Janáček')).toBe('janacek')
      expect(normalizeText('Martinů')).toBe('martinu')
    })
  })

  describe('real-world artist names', () => {
    it('should normalize Christian Poltéra', () => {
      expect(normalizeText('Christian Poltéra')).toBe('christian poltera')
    })

    it('should normalize Antonín Dvořák', () => {
      expect(normalizeText('Antonín Dvořák')).toBe('antonin dvorak')
    })

    it('should normalize Béla Bartók', () => {
      expect(normalizeText('Béla Bartók')).toBe('bela bartok')
    })

    it('should normalize François Leleux', () => {
      expect(normalizeText('François Leleux')).toBe('francois leleux')
    })

    it('should normalize names with multiple diacritics', () => {
      expect(normalizeText('José María López')).toBe('jose maria lopez')
    })
  })

  describe('edge cases', () => {
    it('should handle text with numbers', () => {
      expect(normalizeText('Symphony No. 9')).toBe('symphony no. 9')
    })

    it('should handle text with special characters', () => {
      expect(normalizeText('Müller & Co.')).toBe('muller & co.')
    })

    it('should preserve whitespace structure', () => {
      expect(normalizeText('Hello  World')).toBe('hello  world') // double space preserved
      expect(normalizeText('Hello\nWorld')).toBe('hello\nworld') // newline preserved
    })

    it('should handle mixed diacritics and case', () => {
      expect(normalizeText('CAFÉ au LAIT')).toBe('cafe au lait')
    })

    it('should handle single character strings', () => {
      expect(normalizeText('é')).toBe('e')
      expect(normalizeText('Ü')).toBe('u')
    })

    it('should handle strings with only diacritics', () => {
      expect(normalizeText('éèêëēėę')).toBe('eeeeeee')
    })
  })

  describe('unicode normalization', () => {
    it('should normalize composed and decomposed forms equally', () => {
      // Composed form (single character)
      const composed = 'é'
      // Decomposed form (e + combining acute accent)
      const decomposed = 'e\u0301'

      expect(normalizeText(composed)).toBe('e')
      expect(normalizeText(decomposed)).toBe('e')
      expect(normalizeText(composed)).toBe(normalizeText(decomposed))
    })

    it('should handle complex unicode strings', () => {
      expect(normalizeText('naïve résumé')).toBe('naive resume')
    })
  })
})
