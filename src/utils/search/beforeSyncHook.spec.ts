import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { beforeSyncHook } from './beforeSyncHook'

// Mock the utility functions
vi.mock('./extractLexicalText', () => ({
  extractLexicalText: vi.fn((content) => {
    // Simple mock that returns "extracted: <stringified content>"
    return `extracted: ${JSON.stringify(content)}`
  }),
}))

vi.mock('./filterStopwords', () => ({
  filterStopwords: vi.fn((text, locale) => `filtered(${locale}): ${text}`),
}))

vi.mock('./normalizeText', () => ({
  normalizeText: vi.fn((text) => `normalized: ${text}`),
}))

describe('beforeSyncHook', () => {
  const mockPayload = {} as Payload

  describe('artists collection', () => {
    it('should process artist with name and instruments', async () => {
      const originalDoc = {
        name: 'Christian Poltéra',
        slug: 'christian-poltera',
        instrument: ['cello', 'chamber-music'],
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-123',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Should include artist name
      expect(result.displayTitle).toBe('Christian Poltéra')
      // Should include slug
      expect(result.slug).toBe('christian-poltera')
      // Should default to 'de' locale
      expect(result.locale).toBe('de')
      // Should include instrument translations in searchable content
      expect(result.title).toContain('Christian Poltéra')
      expect(result.title).toContain('Violoncello')
      expect(result.title).toContain('Cello')
      expect(result.title).toContain('Kammermusik')
      expect(result.title).toContain('Chamber Music')
    })

    it('should handle artist with single instrument', async () => {
      const originalDoc = {
        name: 'Pianist Name',
        slug: 'pianist-name',
        instrument: ['piano'],
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-456',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Pianist Name')
      expect(result.title).toContain('Klavier')
      expect(result.title).toContain('Piano')
    })

    it('should handle artist with unknown instrument', async () => {
      const originalDoc = {
        name: 'Artist Name',
        slug: 'artist-slug',
        instrument: ['unknown-instrument'],
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-789',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Unknown instruments should be included as-is
      expect(result.title).toContain('unknown-instrument')
    })

    it('should handle artist with no instruments', async () => {
      const originalDoc = {
        name: 'Conductor Name',
        slug: 'conductor-slug',
        instrument: [],
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-999',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Conductor Name')
      // Should still process name even without instruments
      expect(result.title).toContain('Conductor Name')
    })

    it('should handle artist with missing instrument field', async () => {
      const originalDoc = {
        name: 'Artist Name',
        slug: 'artist-slug',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-111',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Artist Name')
      expect(result.title).toContain('Artist Name')
    })

    it('should handle empty artist name', async () => {
      const originalDoc = {
        name: '',
        slug: 'some-slug',
        instrument: ['violin'],
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-222',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('')
      // Should still include instrument translations
      expect(result.title).toContain('Violine')
    })
  })

  describe('employees collection', () => {
    it('should process employee with name', async () => {
      const originalDoc = {
        name: 'John Doe',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'employees',
          value: 'employee-123',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('John Doe')
      expect(result.slug).toBe('')
      expect(result.locale).toBe('de')
      expect(result.title).toContain('John Doe')
    })

    it('should handle empty employee name', async () => {
      const originalDoc = {
        name: '',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'employees',
          value: 'employee-456',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('')
      expect(result.title).toBeDefined()
    })
  })

  describe('pages collection', () => {
    it('should process page with title and content', async () => {
      const originalDoc = {
        title: 'About Us',
        slug: 'about-us',
        content: {
          root: {
            children: [{ text: 'Page content here' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-123',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('About Us')
      expect(result.slug).toBe('about-us')
      expect(result.locale).toBe('de')
      // Should include extracted content
      expect(result.title).toContain('About Us')
      expect(result.title).toContain('extracted')
    })

    it('should exclude content for legal pages (impressum)', async () => {
      const originalDoc = {
        title: 'Impressum',
        slug: 'impressum',
        content: {
          root: {
            children: [{ text: 'Legal text with names' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-1',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Impressum')
      // Should NOT include extracted content
      expect(result.title).toContain('Impressum')
      expect(result.title).not.toContain('extracted')
    })

    it('should exclude content for legal pages (imprint)', async () => {
      const originalDoc = {
        title: 'Imprint',
        slug: 'imprint',
        content: {
          root: {
            children: [{ text: 'Legal content' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-2',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Imprint')
      expect(result.title).not.toContain('extracted')
    })

    it('should exclude content for legal pages (datenschutz)', async () => {
      const originalDoc = {
        title: 'Datenschutz',
        slug: 'datenschutz',
        content: {
          root: {
            children: [{ text: 'Privacy policy content' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-3',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.title).not.toContain('extracted')
    })

    it('should exclude content for legal pages (privacy-policy)', async () => {
      const originalDoc = {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: {
          root: {
            children: [{ text: 'Privacy content' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-4',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.title).not.toContain('extracted')
    })

    it('should exclude content for legal pages (privacy)', async () => {
      const originalDoc = {
        title: 'Privacy',
        slug: 'privacy',
        content: {
          root: {
            children: [{ text: 'Privacy text' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-5',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.title).not.toContain('extracted')
    })

    it('should handle page with no content', async () => {
      const originalDoc = {
        title: 'Empty Page',
        slug: 'empty-page',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-456',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Empty Page')
      expect(result.title).toContain('Empty Page')
      expect(result.title).not.toContain('extracted')
    })

    it('should handle legal page slug with mixed case', async () => {
      const originalDoc = {
        title: 'Impressum',
        slug: 'IMPRESSUM',
        content: {
          root: {
            children: [{ text: 'Should not be indexed' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-6',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Should still detect as legal page (case-insensitive)
      expect(result.title).not.toContain('extracted')
    })

    it('should handle legal page slug as substring', async () => {
      const originalDoc = {
        title: 'Our Impressum Page',
        slug: 'our-impressum-page',
        content: {
          root: {
            children: [{ text: 'Should not be indexed' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-legal-7',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Should detect "impressum" within slug
      expect(result.title).not.toContain('extracted')
    })
  })

  describe('repertoire collection', () => {
    it('should process repertoire with title and content', async () => {
      const originalDoc = {
        title: 'Symphony No. 5',
        content: {
          root: {
            children: [{ text: 'Beethoven composition' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'repertoire',
          value: 'repertoire-123',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Symphony No. 5')
      expect(result.slug).toBe('')
      expect(result.locale).toBe('de')
      expect(result.title).toContain('Symphony No. 5')
      expect(result.title).toContain('extracted')
    })

    it('should handle repertoire with no content', async () => {
      const originalDoc = {
        title: 'Concerto',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'repertoire',
          value: 'repertoire-456',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('Concerto')
      expect(result.title).toContain('Concerto')
      expect(result.title).not.toContain('extracted')
    })

    it('should handle empty repertoire title', async () => {
      const originalDoc = {
        title: '',
        content: {
          root: {
            children: [{ text: 'Some content' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'repertoire',
          value: 'repertoire-789',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.displayTitle).toBe('')
      expect(result.title).toContain('extracted')
    })
  })

  describe('locale handling', () => {
    it('should use document locale when present', async () => {
      const originalDoc = {
        name: 'Artist Name',
        locale: 'en',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-en-1',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.locale).toBe('en')
      // Should pass locale to filterStopwords
      expect(result.title).toContain('filtered(en)')
    })

    it('should default to de locale when missing', async () => {
      const originalDoc = {
        name: 'Artist Name',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'artists',
          value: 'artist-de-1',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      expect(result.locale).toBe('de')
      expect(result.title).toContain('filtered(de)')
    })
  })

  describe('content processing pipeline', () => {
    it('should apply full processing pipeline: extract -> filter -> normalize', async () => {
      const originalDoc = {
        title: 'Test Page',
        slug: 'test-page',
        content: {
          root: {
            children: [{ text: 'Content to process' }],
          },
        },
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'pages',
          value: 'page-pipeline',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Result should show the processing pipeline
      // normalized: filtered(de): Test Page extracted: ...
      expect(result.title).toContain('normalized:')
      expect(result.title).toContain('filtered(de):')
      expect(result.title).toContain('Test Page')
      expect(result.title).toContain('extracted')
    })
  })

  describe('unknown collection types', () => {
    it('should handle unknown collection gracefully', async () => {
      const originalDoc = {
        someField: 'value',
      }

      const searchDoc = {
        title: '',
        doc: {
          relationTo: 'unknown-collection',
          value: 'doc-123',
        },
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Should return processed result even with no specific handling
      expect(result.displayTitle).toBe('')
      expect(result.slug).toBe('')
      expect(result.locale).toBe('de')
      expect(result.title).toBeDefined()
    })
  })

  describe('searchDoc preservation', () => {
    it('should preserve original searchDoc properties', async () => {
      const originalDoc = {
        name: 'Artist Name',
      }

      const searchDoc = {
        title: 'original-title',
        doc: {
          relationTo: 'artists',
          value: 'artist-123',
        },
        customField: 'custom-value',
      }

      const result = await beforeSyncHook({
        originalDoc,
        payload: mockPayload,
        searchDoc,
      })

      // Should preserve searchDoc.doc
      expect(result.doc).toEqual({
        relationTo: 'artists',
        value: 'artist-123',
      })
      // Should preserve custom fields
      expect(result.customField).toBe('custom-value')
      // Should override title with processed content
      expect(result.title).not.toBe('original-title')
    })
  })
})
