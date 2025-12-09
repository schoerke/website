import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

// Mock dependencies
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

vi.mock('@/utils/search/normalizeText', () => ({
  normalizeText: (text: string) => text.toLowerCase(),
}))

describe('Search API Route', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  describe('Contact Person Population', () => {
    it('should populate contact persons for artist results', async () => {
      // Mock search results with an artist
      const mockSearchResults = {
        docs: [
          {
            id: 4,
            title: 'christian zacharias dirigent conductor klavier piano',
            displayTitle: 'Christian Zacharias',
            slug: 'christian-zacharias',
            priority: 50,
            locale: 'de',
            doc: {
              relationTo: 'artists',
              value: 20, // Artist ID
            },
          },
        ],
        totalDocs: 1,
        limit: 10,
        page: 1,
      }

      // Mock artist with contact persons
      const mockArtistResults = {
        docs: [
          {
            id: 20,
            name: 'Christian Zacharias',
            contactPersons: [
              {
                id: 4,
                name: 'Eva Wagner',
                email: 'e.wagner@ks-schoerke.de',
                title: 'Managing Director',
              },
              {
                id: 3,
                name: 'Justine Stemmelin',
                email: 'j.stemmelin@ks-schoerke.de',
                title: 'Assistant Artist Manager',
              },
            ],
          },
        ],
      }

      // Setup mock responses
      vi.mocked(mockPayload.find)
        .mockResolvedValueOnce(mockSearchResults as any) // First call: search collection
        .mockResolvedValueOnce(mockArtistResults as any) // Second call: artists with contactPersons

      const request = new Request('http://localhost:3000/api/search?q=Zacharias&locale=de&limit=10')
      const response = await GET(request)
      const data = await response.json()

      // Verify search collection query
      expect(mockPayload.find).toHaveBeenNthCalledWith(1, {
        collection: 'search',
        locale: 'de',
        where: {
          title: {
            contains: 'zacharias',
          },
        },
        limit: 10,
        page: 1,
        sort: '-priority',
        depth: 0,
      })

      // Verify artists query with depth: 1
      expect(mockPayload.find).toHaveBeenNthCalledWith(2, {
        collection: 'artists',
        where: {
          id: {
            in: [20],
          },
        },
        depth: 1,
        limit: 1,
      })

      // Verify contact persons are included in response
      expect(data.results).toHaveLength(1)
      expect(data.results[0].contactPersons).toEqual([
        {
          id: 4,
          name: 'Eva Wagner',
          email: 'e.wagner@ks-schoerke.de',
        },
        {
          id: 3,
          name: 'Justine Stemmelin',
          email: 'j.stemmelin@ks-schoerke.de',
        },
      ])
    })

    it('should handle empty artist results without querying artists collection', async () => {
      const mockSearchResults = {
        docs: [
          {
            id: 10,
            title: 'Impressum',
            displayTitle: 'Impressum',
            slug: 'impressum',
            priority: 25,
            locale: 'de',
            doc: {
              relationTo: 'pages',
              value: 5,
            },
          },
        ],
        totalDocs: 1,
        limit: 10,
        page: 1,
      }

      vi.mocked(mockPayload.find).mockResolvedValueOnce(mockSearchResults as any)

      const request = new Request('http://localhost:3000/api/search?q=impressum&locale=de&limit=10')
      const response = await GET(request)
      const data = await response.json()

      // Should only call find once (search collection, not artists)
      expect(mockPayload.find).toHaveBeenCalledTimes(1)

      // Result should not have contactPersons
      expect(data.results).toHaveLength(1)
      expect(data.results[0].contactPersons).toBeUndefined()
    })

    it('should filter out invalid contact persons (missing email)', async () => {
      const mockSearchResults = {
        docs: [
          {
            id: 4,
            title: 'Till Fellner',
            displayTitle: 'Till Fellner',
            slug: 'till-fellner',
            priority: 50,
            locale: 'de',
            doc: {
              relationTo: 'artists',
              value: 6,
            },
          },
        ],
        totalDocs: 1,
        limit: 10,
        page: 1,
      }

      const mockArtistResults = {
        docs: [
          {
            id: 6,
            name: 'Till Fellner',
            contactPersons: [
              {
                id: 4,
                name: 'Eva Wagner',
                email: 'e.wagner@ks-schoerke.de',
              },
              {
                // Invalid: missing email
                id: 99,
                name: 'Invalid Contact',
              },
              null, // Invalid: null
              {
                // Invalid: no email field
                id: 100,
                name: 'Another Invalid',
              },
            ],
          },
        ],
      }

      vi.mocked(mockPayload.find)
        .mockResolvedValueOnce(mockSearchResults as any)
        .mockResolvedValueOnce(mockArtistResults as any)

      const request = new Request('http://localhost:3000/api/search?q=fellner&locale=de&limit=10')
      const response = await GET(request)
      const data = await response.json()

      // Should only include valid contact person
      expect(data.results[0].contactPersons).toEqual([
        {
          id: 4,
          name: 'Eva Wagner',
          email: 'e.wagner@ks-schoerke.de',
        },
      ])
    })

    it('should handle multiple artists with contact persons', async () => {
      const mockSearchResults = {
        docs: [
          {
            id: 20,
            title: 'Tzimon Barto',
            displayTitle: 'Tzimon Barto',
            slug: 'tzimon-barto',
            priority: 50,
            locale: 'de',
            doc: { relationTo: 'artists', value: 4 },
          },
          {
            id: 4,
            title: 'Till Fellner',
            displayTitle: 'Till Fellner',
            slug: 'till-fellner',
            priority: 50,
            locale: 'de',
            doc: { relationTo: 'artists', value: 6 },
          },
        ],
        totalDocs: 2,
        limit: 10,
        page: 1,
      }

      const mockArtistResults = {
        docs: [
          {
            id: 4,
            name: 'Tzimon Barto',
            contactPersons: [
              { id: 4, name: 'Eva Wagner', email: 'e.wagner@ks-schoerke.de' },
              { id: 3, name: 'Justine Stemmelin', email: 'j.stemmelin@ks-schoerke.de' },
            ],
          },
          {
            id: 6,
            name: 'Till Fellner',
            contactPersons: [
              { id: 4, name: 'Eva Wagner', email: 'e.wagner@ks-schoerke.de' },
              { id: 2, name: 'Veronika Fischer', email: 'v.fischer@ks-schoerke.de' },
            ],
          },
        ],
      }

      vi.mocked(mockPayload.find)
        .mockResolvedValueOnce(mockSearchResults as any)
        .mockResolvedValueOnce(mockArtistResults as any)

      const request = new Request('http://localhost:3000/api/search?q=piano&locale=de&limit=10')
      const response = await GET(request)
      const data = await response.json()

      // Verify both artists have their contact persons
      expect(data.results).toHaveLength(2)
      expect(data.results[0].contactPersons).toHaveLength(2)
      expect(data.results[1].contactPersons).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('should return 400 if query parameter is missing', async () => {
      const request = new Request('http://localhost:3000/api/search')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Query parameter "q" is required')
    })

    it('should return 400 if query parameter is empty', async () => {
      const request = new Request('http://localhost:3000/api/search?q=')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 if database query fails', async () => {
      vi.mocked(mockPayload.find).mockRejectedValueOnce(new Error('Database connection failed'))

      const request = new Request('http://localhost:3000/api/search?q=test&locale=de')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})
