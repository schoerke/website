# Password Reset and Issue Notification Email Design

**Date:** 2025-12-13
**Status:** Design Complete
**Related Files:** Issues collection, Users collection, email service

## Overview

This document outlines the design for implementing password reset and issue notification email features. The goal is to
enhance user experience and streamline administrative workflows by providing secure and branded email communication.

## Purpose

1. **Password Reset Emails:** Allow users to securely reset their passwords via email.
2. **Issue Notification Emails:** Notify the admin when issues are created or updated.

## Requirements

### Password Reset Emails

- Triggered when a user requests a password reset
- Includes a secure reset link with token
- Styled with React and Tailwind CSS for branding
- Delivered via Resend email service
- Secure token expiration handling

### Issue Notification Emails

- Triggered when an issue is created or updated
- Includes issue details (title, description, status, reporter)
- Link to view issue in admin panel
- Styled with React and Tailwind CSS for branding
- Delivered via Resend email service
- Only sent to admin email address

## Architecture

### Email Template Rendering

**Approach:** Use React components styled with Tailwind CSS, rendered to static HTML using `react-dom/server`.

**Why this approach:**

- Leverages existing React/Tailwind knowledge
- Type-safe with TypeScript
- Easy to maintain and test
- No additional dependencies beyond what's already in the project

**File Structure:**

```
src/
  emails/
    ResetPasswordEmail.tsx      # Password reset template
    IssueNotificationEmail.tsx  # Issue notification template
```

#### Example: Password Reset Email Template

```typescript
import React from 'react'

interface ResetPasswordEmailProps {
  resetLink: string
  userName?: string
}

const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({ resetLink, userName }) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#f3f4f6', padding: '40px 20px' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px' }}>
          <h1 style={{ color: '#111827', fontSize: '24px', marginBottom: '16px' }}>
            Password Reset Request
          </h1>
          {userName && (
            <p style={{ color: '#374151', fontSize: '16px', marginBottom: '24px' }}>
              Hi {userName},
            </p>
          )}
          <p style={{ color: '#374151', fontSize: '16px', marginBottom: '24px' }}>
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <a
            href={resetLink}
            style={{
              display: 'inline-block',
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
              marginBottom: '24px',
            }}
          >
            Reset Password
          </a>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '24px' }}>
            If you didn't request this password reset, you can safely ignore this email.
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            This link will expire in 1 hour.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordEmail
```

#### Example: Issue Notification Email Template

```typescript
import React from 'react'

interface IssueNotificationEmailProps {
  title: string
  description: string
  status: string
  reporterEmail?: string
  issueId: string
  adminPanelUrl: string
}

const IssueNotificationEmail: React.FC<IssueNotificationEmailProps> = ({
  title,
  description,
  status,
  reporterEmail,
  issueId,
  adminPanelUrl,
}) => {
  const issueUrl = `${adminPanelUrl}/admin/collections/issues/${issueId}`

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#f3f4f6', padding: '40px 20px' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px' }}>
          <h1 style={{ color: '#111827', fontSize: '24px', marginBottom: '16px' }}>
            New Issue Report
          </h1>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ color: '#374151', fontSize: '18px', marginBottom: '8px' }}>{title}</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
              Status: <strong>{status}</strong>
            </p>
            {reporterEmail && (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Reporter: {reporterEmail}
              </p>
            )}
          </div>
          <div
            style={{
              backgroundColor: '#f9fafb',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '24px',
            }}
          >
            <p style={{ color: '#374151', fontSize: '14px', margin: 0 }}>{description}</p>
          </div>
          <a
            href={issueUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
            }}
          >
            View Issue in Admin Panel
          </a>
        </div>
      </div>
    </div>
  )
}

export default IssueNotificationEmail
```

### Centralized Email Service

**File:** `src/services/email.ts`

**Purpose:**

- Single source of truth for all email-sending logic
- Reusable across different collections and hooks
- Easy to test and maintain
- Handles rendering and delivery

**Implementation:**

```typescript
import { Resend } from 'resend'
import { renderToStaticMarkup } from 'react-dom/server'
import ResetPasswordEmail from '@/emails/ResetPasswordEmail'
import IssueNotificationEmail from '@/emails/IssueNotificationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendResetPasswordEmailParams {
  to: string
  resetLink: string
  userName?: string
}

interface SendIssueNotificationEmailParams {
  to: string
  title: string
  description: string
  status: string
  reporterEmail?: string
  issueId: string
}

/**
 * Send password reset email to user
 * @param params Email parameters
 * @returns Resend API response with email ID
 */
export async function sendResetPasswordEmail(params: SendResetPasswordEmailParams) {
  const { to, resetLink, userName } = params

  const html = renderToStaticMarkup(ResetPasswordEmail({ resetLink, userName }))

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    to,
    subject: 'Reset Your Password',
    html,
  })
}

/**
 * Send issue notification email to admin
 * @param params Email parameters
 * @returns Resend API response with email ID
 */
export async function sendIssueNotificationEmail(params: SendIssueNotificationEmailParams) {
  const { to, title, description, status, reporterEmail, issueId } = params

  const adminPanelUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  const html = renderToStaticMarkup(
    IssueNotificationEmail({
      title,
      description,
      status,
      reporterEmail,
      issueId,
      adminPanelUrl,
    }),
  )

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    to,
    subject: `New Issue: ${title}`,
    html,
  })
}
```

### Integration with Payload CMS

#### Password Reset Integration

Payload CMS has built-in password reset functionality. We'll configure the email adapter to use our custom template.

**Configuration in `payload.config.ts`:**

```typescript
import { buildConfig } from 'payload/config'
import { resendAdapter } from '@payloadcms/email-resend'

export default buildConfig({
  // ... other config
  email: resendAdapter({
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    defaultFromName: 'Your App Name',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  collections: [
    // ... your collections
  ],
})
```

**Note:** Payload's built-in password reset will automatically use the configured email adapter. For custom templates,
we may need to override the `forgotPassword` hook in the Users collection.

#### Issue Notification Integration

**Add `afterChange` hook to Issues collection (`src/collections/Issues.ts`):**

```typescript
import type { CollectionConfig } from 'payload/types'
import { sendIssueNotificationEmail } from '@/services/email'

export const Issues: CollectionConfig = {
  slug: 'issues',
  // ... other config
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        // Only send email on create or update
        if (operation === 'create' || operation === 'update') {
          try {
            // Get admin email from environment variable
            const adminEmail = process.env.ADMIN_EMAIL

            if (!adminEmail) {
              req.payload.logger.warn('ADMIN_EMAIL not configured, skipping issue notification')
              return doc
            }

            // Get reporter email if available
            const reporterEmail = typeof doc.reporter === 'object' ? doc.reporter.email : undefined

            await sendIssueNotificationEmail({
              to: adminEmail,
              title: doc.title,
              description: doc.description || '',
              status: doc.status || 'new',
              reporterEmail,
              issueId: doc.id,
            })

            req.payload.logger.info(`Issue notification email sent for: ${doc.title}`)
          } catch (error) {
            // Log error but don't fail the operation
            req.payload.logger.error(`Failed to send issue notification email: ${error}`)
          }
        }

        return doc
      },
    ],
  },
}
```

## Environment Variables

Add to `.env`:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email configuration
EMAIL_FROM=noreply@yourapp.com

# Admin email for issue notifications
ADMIN_EMAIL=admin@yourapp.com

# Server URL for links in emails
NEXT_PUBLIC_SERVER_URL=https://yourapp.com
```

Add to `.env.example`:

```bash
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAIL=
NEXT_PUBLIC_SERVER_URL=
```

## Testing Strategy

### Integration Tests

**File:** `src/services/email.spec.ts`

**Approach:** Use Resend's test API key to verify email rendering and delivery.

```typescript
import { sendResetPasswordEmail, sendIssueNotificationEmail } from './email'

describe('Email Service', () => {
  describe('sendResetPasswordEmail', () => {
    it('should send a password reset email with correct content', async () => {
      const result = await sendResetPasswordEmail({
        to: 'test@example.com',
        resetLink: 'https://example.com/reset-password?token=abc123',
        userName: 'Test User',
      })

      expect(result).toHaveProperty('id')
      expect(result.error).toBeUndefined()
    })

    it('should send email without userName if not provided', async () => {
      const result = await sendResetPasswordEmail({
        to: 'test@example.com',
        resetLink: 'https://example.com/reset-password?token=abc123',
      })

      expect(result).toHaveProperty('id')
      expect(result.error).toBeUndefined()
    })
  })

  describe('sendIssueNotificationEmail', () => {
    it('should send an issue notification email with all details', async () => {
      const result = await sendIssueNotificationEmail({
        to: 'admin@example.com',
        title: 'Bug Report: Login Issue',
        description: 'Users cannot log in with Google OAuth',
        status: 'new',
        reporterEmail: 'reporter@example.com',
        issueId: '123',
      })

      expect(result).toHaveProperty('id')
      expect(result.error).toBeUndefined()
    })

    it('should send email without reporterEmail if not provided', async () => {
      const result = await sendIssueNotificationEmail({
        to: 'admin@example.com',
        title: 'Feature Request',
        description: 'Add dark mode support',
        status: 'new',
        issueId: '124',
      })

      expect(result).toHaveProperty('id')
      expect(result.error).toBeUndefined()
    })
  })
})
```

### Manual Testing Checklist

1. **Password Reset Flow:**
   - [ ] Request password reset from login page
   - [ ] Verify email is received
   - [ ] Check email renders correctly in Gmail
   - [ ] Check email renders correctly in Outlook
   - [ ] Verify reset link works
   - [ ] Verify expired token shows appropriate error

2. **Issue Notification Flow:**
   - [ ] Create a new issue from public form
   - [ ] Verify admin receives notification email
   - [ ] Check email renders correctly in Gmail
   - [ ] Check email renders correctly in Outlook
   - [ ] Verify link to admin panel works
   - [ ] Update existing issue and verify email is sent

3. **Accessibility:**
   - [ ] Test with screen reader
   - [ ] Verify all links have descriptive text
   - [ ] Check color contrast ratios
   - [ ] Verify semantic HTML structure

## Dependencies

### New Dependencies

```bash
pnpm add resend @payloadcms/email-resend
```

### Existing Dependencies

- `react` - For email templates
- `react-dom` - For rendering to HTML
- `payload` - CMS integration
- TypeScript types from `@/payload-types`

## Edge Cases

1. **Missing Environment Variables:**
   - Log warning and skip email sending
   - Don't fail the operation (issue creation should still succeed)

2. **Resend API Failure:**
   - Log error with details
   - Don't fail the operation
   - Consider retry logic for production

3. **Invalid Email Addresses:**
   - Resend will return error
   - Log error and continue

4. **Large Issue Descriptions:**
   - Truncate in email preview
   - Link to full issue in admin panel

5. **Multiple Rapid Updates:**
   - Consider debouncing or rate limiting
   - Track last notification time

## Future Enhancements

- Add email preferences for users (opt-in/opt-out)
- Support multiple admin recipients
- Add email templates for other events (new user, etc.)
- Implement email queue for reliability
- Add email analytics tracking
- Support localization (i18n) in email templates
- Add inline CSS processing for better email client compatibility

## Success Criteria

- ✅ Password reset emails are sent securely with proper token handling
- ✅ Issue notification emails are sent on create/update operations
- ✅ Emails render correctly across major clients (Gmail, Outlook, Apple Mail)
- ✅ All integration tests pass
- ✅ Email service is reusable and maintainable
- ✅ Error handling doesn't break core functionality
- ✅ Environment variables are documented
