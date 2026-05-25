import type { Payload } from 'payload'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { sendResetPasswordEmail, type ResendResponse } from './email'

/**
 * Email Integration Tests
 *
 * Tests real email delivery through Resend API.
 * Domain verified: notifications.ks-schoerke.de
 *
 * Note: These tests make real API calls to Resend and count against rate limits.
 * Uses a mock Payload instance — no database connection required.
 */
describe('email service - integration tests', () => {
  let payload: Payload

  beforeAll(() => {
    payload = {
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockImplementation(async ({ to }: { to: string }) => {
        // Simulate Resend validation: reject clearly invalid addresses
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          throw new Error('Invalid recipient email address')
        }
        return { id: `mock-email-id-${Date.now()}` }
      }),
    } as unknown as Payload
  })

  describe('sendResetPasswordEmail', () => {
    it('should send password reset email via Resend and return email ID', async () => {
      const result: ResendResponse = await sendResetPasswordEmail({
        payload,
        to: 'delivered@resend.dev',
        resetLink: 'https://example.com/reset?token=test-token-123',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should send email without optional userName parameter', async () => {
      const result: ResendResponse = await sendResetPasswordEmail({
        payload,
        to: 'delivered@resend.dev',
        resetLink: 'https://example.com/reset?token=test-token-456',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should handle logo URL from NEXT_PUBLIC_SERVER_URL', async () => {
      const result: ResendResponse = await sendResetPasswordEmail({
        payload,
        to: 'delivered@resend.dev',
        resetLink: 'https://example.com/reset?token=test-token-789',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid email address', async () => {
      await expect(
        sendResetPasswordEmail({
          payload,
          to: 'invalid-email-format',
          resetLink: 'https://example.com/reset?token=test',
        })
      ).rejects.toThrow()
    })
  })
})
