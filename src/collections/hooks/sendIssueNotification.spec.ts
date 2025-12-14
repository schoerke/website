import type { Issue, User } from '@/payload-types'
import { sendIssueNotificationEmail } from '@/services/email'
import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendIssueNotification } from './sendIssueNotification'

/**
 * Tests for sendIssueNotification hook
 *
 * Verifies that issue notification emails are sent correctly:
 * - Only on create operations (not updates)
 * - With proper reporter information
 * - With Lexical content parsing
 * - With error handling
 */

// Type for hook arguments
type HookArgs = Parameters<CollectionAfterChangeHook>[0]

// Mock the email service
vi.mock('@/services/email', () => ({
  sendIssueNotificationEmail: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
}))

describe('sendIssueNotification hook', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env = { ...originalEnv }
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper to create mock Payload request
  const createMockRequest = (overrides?: Partial<PayloadRequest>): PayloadRequest => {
    return {
      payload: {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        findByID: vi.fn(),
      },
      ...overrides,
    } as unknown as PayloadRequest
  }

  // Helper to create mock issue document (using Partial to avoid strict Lexical typing)
  const createMockIssue = (overrides?: Partial<Issue>): Partial<Issue> => ({
    id: 123,
    title: 'Test Issue',
    description: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Test description' }],
          },
        ],
      },
    } as unknown as Issue['description'],
    status: 'open' as const,
    reporter: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  describe('operation filtering', () => {
    it('should send email on create operation', async () => {
      const req = createMockRequest()
      const doc = createMockIssue()

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith({
        payload: req.payload,
        to: 'admin@example.com',
        title: 'Test Issue',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Test description' }],
              },
            ],
          },
        },
        status: 'open',
        reporterName: undefined,
        reporterEmail: undefined,
        issueId: 123,
      })
      expect(req.payload.logger.info).toHaveBeenCalledWith('Issue notification email sent for: Test Issue')
    })

    it('should NOT send email on update operation', async () => {
      const req = createMockRequest()
      const doc = createMockIssue()

      await sendIssueNotification({
        doc,
        operation: 'update',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).not.toHaveBeenCalled()
      expect(req.payload.logger.info).not.toHaveBeenCalled()
    })
  })

  describe('ADMIN_EMAIL configuration', () => {
    it('should skip sending email if ADMIN_EMAIL is not configured', async () => {
      delete process.env.ADMIN_EMAIL

      const req = createMockRequest()
      const doc = createMockIssue()

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).not.toHaveBeenCalled()
      expect(req.payload.logger.warn).toHaveBeenCalledWith('ADMIN_EMAIL not configured, skipping issue notification')
    })
  })

  describe('reporter information', () => {
    it('should extract reporter info when reporter is populated object', async () => {
      const req = createMockRequest()
      const reporter: User = {
        id: 456,
        email: 'reporter@example.com',
        name: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const doc = createMockIssue({ reporter })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterName: 'John Doe',
          reporterEmail: 'reporter@example.com',
        }),
      )
    })

    it('should fetch reporter info when reporter is just an ID', async () => {
      const mockReporter: User = {
        id: 789,
        email: 'fetched@example.com',
        name: 'Jane Smith',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const req = createMockRequest()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(req.payload.findByID).mockResolvedValue(mockReporter as any)

      const doc = createMockIssue({ reporter: 789 })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(req.payload.findByID).toHaveBeenCalledWith({
        collection: 'users',
        id: 789,
      })
      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterName: 'Jane Smith',
          reporterEmail: 'fetched@example.com',
        }),
      )
    })

    it('should handle error when fetching reporter by ID', async () => {
      const req = createMockRequest()
      vi.mocked(req.payload.findByID).mockRejectedValue(new Error('User not found'))

      const doc = createMockIssue({ reporter: 99999 })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(req.payload.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch reporter user'))
      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterName: undefined,
          reporterEmail: undefined,
        }),
      )
    })

    it('should handle reporter object without name or email', async () => {
      const req = createMockRequest()
      const reporter: User = {
        id: 999,
        email: '',
        name: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const doc = createMockIssue({ reporter })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterName: undefined,
          reporterEmail: undefined,
        }),
      )
    })
  })

  describe('Lexical content parsing', () => {
    it('should pass Lexical JSON description to email service', async () => {
      const req = createMockRequest()
      const lexicalDescription = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'This is the issue description.' }],
            },
          ],
        },
      }
      const doc = createMockIssue({
        description: lexicalDescription as unknown as Issue['description'],
      })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          description: lexicalDescription,
        }),
      )
    })

    it('should pass Lexical JSON with images to email service', async () => {
      const req = createMockRequest()
      const lexicalWithImages = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Screenshot attached' }],
            },
            {
              type: 'upload',
              value: {
                url: '/media/screenshot1.jpg',
              },
              relationTo: 'images',
            },
            {
              type: 'upload',
              value: {
                url: '/media/screenshot2.jpg',
              },
              relationTo: 'images',
            },
          ],
        },
      }
      const doc = createMockIssue({
        description: lexicalWithImages as unknown as Issue['description'],
      })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          description: lexicalWithImages,
        }),
      )
    })

    it('should use default description if description is invalid', async () => {
      const req = createMockRequest()
      const doc = createMockIssue({
        description: 'invalid-lexical-format' as unknown as Issue['description'],
      })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'invalid-lexical-format',
        }),
      )
    })

    it('should use default description if description is missing', async () => {
      const req = createMockRequest()
      const doc = createMockIssue({ description: undefined })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'No description provided',
        }),
      )
    })
  })

  describe('error handling', () => {
    it('should log error and continue if sendIssueNotificationEmail fails', async () => {
      const mockError = new Error('Email service unavailable')
      vi.mocked(sendIssueNotificationEmail).mockRejectedValue(mockError)

      const req = createMockRequest()
      const doc = createMockIssue()

      const result = await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(req.payload.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send issue notification email'),
      )
      expect(result).toEqual(doc)
    })

    it('should return original document even if email fails', async () => {
      vi.mocked(sendIssueNotificationEmail).mockRejectedValue(new Error('Network error'))

      const req = createMockRequest()
      const doc = createMockIssue()

      const result = await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(result).toBe(doc)
    })
  })

  describe('status handling', () => {
    it('should handle issue with status field', async () => {
      const req = createMockRequest()
      const doc = createMockIssue({ status: 'in-progress' })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in-progress',
        }),
      )
    })

    it('should default to "open" if status is missing', async () => {
      const req = createMockRequest()
      const doc = createMockIssue({ status: undefined })

      await sendIssueNotification({
        doc,
        operation: 'create',
        req,
      } as HookArgs)

      expect(sendIssueNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
        }),
      )
    })
  })
})
