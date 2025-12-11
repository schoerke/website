import type { User } from '@/payload-types'
import type { AccessArgs } from 'payload'
import { describe, expect, it } from 'vitest'
import { authenticated } from './authenticated'

describe('authenticated', () => {
  describe('when user is authenticated', () => {
    it('returns true for authenticated user object', () => {
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
      } as unknown as AccessArgs<User>

      expect(authenticated(args)).toBe(true)
    })

    it('returns true for user with minimal properties', () => {
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
      } as unknown as AccessArgs<User>

      expect(authenticated(args)).toBe(true)
    })
  })

  describe('when user is not authenticated', () => {
    it('returns false when user is undefined', () => {
      const args = {
        req: {
          user: undefined,
        },
      } as unknown as AccessArgs<User>

      expect(authenticated(args)).toBe(false)
    })

    it('returns false when user is null', () => {
      const args = {
        req: {
          user: null,
        },
      } as unknown as AccessArgs<User>

      expect(authenticated(args)).toBe(false)
    })

    it('returns true for empty user object (truthy in JavaScript)', () => {
      const args = {
        req: {
          user: {} as unknown as User,
        },
      } as unknown as AccessArgs<User>

      // Empty objects are truthy in JavaScript: Boolean({}) === true
      expect(authenticated(args)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles user with falsy id gracefully', () => {
      const args = {
        req: {
          user: {
            id: '',
            email: 'user@example.com',
            name: '',
            updatedAt: '2025-01-01T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
          } as unknown as User,
        },
      } as unknown as AccessArgs<User>

      // Object exists, so Boolean(user) is true
      expect(authenticated(args)).toBe(true)
    })

    it('returns correct boolean type', () => {
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
      } as unknown as AccessArgs<User>

      const result = authenticated(args)
      expect(typeof result).toBe('boolean')
    })
  })
})
