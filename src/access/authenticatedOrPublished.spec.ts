import type { User } from '@/payload-types'
import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'
import { authenticatedOrPublished } from './authenticatedOrPublished'

describe('authenticatedOrPublished', () => {
  describe('when user is authenticated', () => {
    it('returns true for authenticated user', () => {
      const args = {
        req: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            updatedAt: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          } as unknown as User,
        },
      } as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      expect(result).toBe(true)
    })

    it('returns true even if user has minimal properties', () => {
      const args = {
        req: {
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'User',
            updatedAt: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          } as unknown as User,
        },
      } as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      expect(result).toBe(true)
    })
  })

  describe('when user is not authenticated', () => {
    it('returns published status constraint when user is undefined', () => {
      const args = {
        req: {
          user: undefined,
        },
      } as unknown as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      expect(result).toEqual({
        _status: {
          equals: 'published',
        },
      })
    })

    it('returns published status constraint when user is null', () => {
      const args = {
        req: {
          user: null,
        },
      } as unknown as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      expect(result).toEqual({
        _status: {
          equals: 'published',
        },
      })
    })

    it('returns published status constraint with correct structure', () => {
      const args = {
        req: {
          user: undefined,
        },
      } as unknown as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)

      // Verify structure
      expect(result).toHaveProperty('_status')
      expect(result).toHaveProperty('_status.equals')
      expect((result as { _status: { equals: string } })._status.equals).toBe('published')
    })
  })

  describe('return type validation', () => {
    it('returns boolean true for authenticated users', () => {
      const args = {
        req: {
          user: {
            id: '123',
            email: 'user@example.com',
            name: 'User',
            updatedAt: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          } as unknown as User,
        },
      } as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
    })

    it('returns object constraint for unauthenticated users', () => {
      const args = {
        req: {
          user: undefined,
        },
      } as unknown as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      expect(typeof result).toBe('object')
      expect(result).not.toBe(null)
    })
  })

  describe('edge cases', () => {
    it('returns true for empty user object (truthy in JavaScript)', () => {
      const args = {
        req: {
          user: {} as unknown as User,
        },
      } as unknown as Parameters<Access>[0]

      // Empty objects are truthy in JavaScript: Boolean({}) === true
      const result = authenticatedOrPublished(args)
      expect(result).toBe(true)
    })

    it('published constraint uses exact string match', () => {
      const args = {
        req: {
          user: null,
        },
      } as unknown as Parameters<Access>[0]

      const result = authenticatedOrPublished(args)
      const constraint = result as { _status: { equals: string } }

      // Verify it's "published" not "draft" or other status
      expect(constraint._status.equals).toBe('published')
      expect(constraint._status.equals).not.toBe('draft')
    })
  })
})
