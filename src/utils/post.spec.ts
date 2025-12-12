import { createMockArtist } from '@/tests/utils/payloadMocks'
import { describe, expect, it } from 'vitest'
import { formatDate, getRelatedArtists } from './post'

describe('Post Utils', () => {
  describe('formatDate', () => {
    it('should format date in English locale', () => {
      const result = formatDate('2024-01-15T12:00:00.000Z', 'en')
      expect(result).toContain('January')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should format date in German locale', () => {
      const result = formatDate('2024-01-15T12:00:00.000Z', 'de')
      expect(result).toContain('Januar')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should handle different date formats', () => {
      const result = formatDate('2024-12-25T00:00:00.000Z', 'en')
      expect(result).toContain('December')
      expect(result).toContain('25')
      expect(result).toContain('2024')
    })
  })

  describe('getRelatedArtists', () => {
    it('should return array of artist objects', () => {
      const artists = [createMockArtist({ id: 1, name: 'Artist 1' }), createMockArtist({ id: 2, name: 'Artist 2' })]

      const result = getRelatedArtists(artists)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name', 'Artist 1')
      expect(result[1]).toHaveProperty('name', 'Artist 2')
    })

    it('should filter out null values', () => {
      const artists = [createMockArtist({ id: 1 }), null, createMockArtist({ id: 2 })]

      const result = getRelatedArtists(artists)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })

    it('should filter out ID references (numbers)', () => {
      const artists = [createMockArtist({ id: 1 }), 123, createMockArtist({ id: 2 })]

      const result = getRelatedArtists(artists)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })

    it('should return empty array for non-array input', () => {
      expect(getRelatedArtists(null)).toEqual([])
      expect(getRelatedArtists(undefined)).toEqual([])
      expect(getRelatedArtists('string')).toEqual([])
      expect(getRelatedArtists(123)).toEqual([])
    })

    it('should return empty array for empty array', () => {
      expect(getRelatedArtists([])).toEqual([])
    })

    it('should handle mixed array with objects and primitives', () => {
      const artists = [createMockArtist({ id: 1 }), 456, null, undefined, 'string', createMockArtist({ id: 2 })]

      const result = getRelatedArtists(artists)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[1].id).toBe(2)
    })
  })
})
