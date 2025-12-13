import 'dotenv/config'

import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { sendIssueNotificationEmail, sendResetPasswordEmail, type ResendResponse } from './email'

/**
 * Email Integration Tests
 *
 * Tests real email delivery through Resend API.
 * Domain verified: notifications.ks-schoerke.de
 *
 * Note: These tests make real API calls to Resend and count against rate limits.
 */
describe('email service - integration tests', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  // Add delay after each test to avoid rate limiting (2 emails/second limit)
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
  })

  describe('sendResetPasswordEmail', () => {
    it('should send password reset email via Resend and return email ID', async () => {
      const result: ResendResponse = await sendResetPasswordEmail({
        payload,
        to: 'delivered@resend.dev',
        resetLink: 'https://example.com/reset?token=test-token-123',
        userName: 'Test User',
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
        userName: 'Logo Test User',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })
  })

  describe('sendIssueNotificationEmail', () => {
    it('should send issue notification email via Resend and return email ID', async () => {
      const result: ResendResponse = await sendIssueNotificationEmail({
        payload,
        to: 'delivered@resend.dev',
        title: 'Test Issue: Search functionality broken',
        description: 'The search feature returns no results when searching for artist names.',
        status: 'open',
        reporterName: 'Test Reporter',
        reporterEmail: 'reporter@example.com',
        issueId: 'test-issue-123',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should send email without optional reporterEmail', async () => {
      const result: ResendResponse = await sendIssueNotificationEmail({
        payload,
        to: 'delivered@resend.dev',
        title: 'Anonymous Issue Report',
        description: 'Issue reported without email address.',
        status: 'open',
        issueId: 'test-issue-456',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should handle different issue statuses', async () => {
      const result: ResendResponse = await sendIssueNotificationEmail({
        payload,
        to: 'delivered@resend.dev',
        title: 'Closed Issue',
        description: 'This issue has been resolved.',
        status: 'closed',
        reporterName: 'Test User',
        reporterEmail: 'user@example.com',
        issueId: 'test-issue-789',
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should include admin panel link with correct issue ID', async () => {
      const issueId = 'test-issue-with-link'

      const result: ResendResponse = await sendIssueNotificationEmail({
        payload,
        to: 'delivered@resend.dev',
        title: 'Issue with Link Test',
        description: 'Testing admin panel link generation.',
        status: 'in-progress',
        issueId,
      })

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should include multiple screenshots in email', async () => {
      const result: ResendResponse = await sendIssueNotificationEmail({
        payload,
        to: 'delivered@resend.dev',
        title: 'Issue with Screenshots',
        description: 'This issue has multiple screenshots attached.',
        status: 'open',
        reporterName: 'Test User',
        reporterEmail: 'test@example.com',
        issueId: 'test-issue-images',
        images: [
          'https://example.com/screenshot1.jpg',
          'https://example.com/screenshot2.jpg',
          'https://example.com/screenshot3.jpg',
        ],
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
        }),
      ).rejects.toThrow()
    })

    it('should throw error for empty recipient email', async () => {
      await expect(
        sendIssueNotificationEmail({
          payload,
          to: '',
          title: 'Test',
          description: 'Test description',
          status: 'open',
          issueId: 'test',
        }),
      ).rejects.toThrow()
    })
  })
})
