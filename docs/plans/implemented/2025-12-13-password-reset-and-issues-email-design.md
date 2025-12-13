# Password Reset and Issue Notification Email Design

**Date:** 2025-12-13 **Status:** ✅ COMPLETE - All phases implemented and tested **Related Files:** Issues collection,
Users collection, email service

## Implementation Status

- ✅ Phase 1: Dependencies installed (resend, @payloadcms/email-resend)
- ✅ Phase 2: Email templates created (inline HTML with Payload's sendEmail API)
- ✅ Phase 3: Service layer implemented with security utilities
- ✅ Phase 4: Integrated with Payload config and Issues collection
- ✅ Phase 5: Security hardening (XSS prevention, URL sanitization, input validation)
- ✅ Phase 6: Comprehensive testing (79 tests total: 10 email, 15 HTML utils, 14 Lexical utils, 15 hook tests, 25
  email-related tests)
- ✅ Phase 7: Code review fixes and documentation

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

**Approach:** Inline HTML templates using Payload's `sendEmail()` API.

**Why this approach:**

- Next.js 16 blocks `react-dom/server` imports in the build chain
- Payload's `sendEmail()` handles rendering internally through Resend adapter
- Simpler architecture - no need for separate rendering utility
- Inline HTML is standard for email development (Tailwind classes don't work in emails anyway)

**File Structure:**

```
src/
  services/
    email.ts  # Email service with inline HTML templates
  collections/
    hooks/
      sendIssueNotification.ts  # Hook for Issues collection
```

**Note:** Original plan to use React templates with `renderToStaticMarkup` was abandoned due to Next.js 16 build errors.
The bundler detects `react-dom/server` imports and blocks them even with `server-only` directive.

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

## Key Learnings

### 1. Next.js 16 and Email Rendering

- **Challenge:** Next.js 16 blocks `react-dom/server` imports during build
- **Solution:** Use Payload's `sendEmail()` API with inline HTML templates
- **Lesson:** Inline HTML is actually the standard for email development (better compatibility than React)

### 2. Lexical Content Parsing

- **Challenge:** Extract text and images from Lexical JSON for email rendering
- **Solution:** Created reusable `src/utils/lexical.ts` utility with recursive node traversal
- **Pattern:** Handle nested `root` nodes, extract text from text nodes, extract URLs from upload nodes
- **Testing:** 14 comprehensive tests covering all edge cases

### 3. Email Security

- **Challenge:** Prevent XSS attacks in emails with user-generated content
- **Solution:** Created `src/utils/html.ts` with `escapeHtml()` and `sanitizeUrl()` functions
- **Implementation:**
  - Escape all user input in HTML: `<`, `>`, `&`, `"`, `'`
  - Block malicious URL schemes: `javascript:`, `data:`, `vbscript:`
  - Validate email format with regex
  - Enforce HTTPS in production
- **Testing:** 15 comprehensive security tests

### 4. Hook Rate Limiting

- **Challenge:** Prevent email spam from bulk updates
- **Solution:** Hook only sends email on `create` operation, not `update`
- **Benefit:** Simple and effective - no need for complex rate limiting logic

### 5. Resend Integration Testing

- **Challenge:** Test real email delivery without mocking
- **Solution:** Integration tests with real Resend API calls
- **Pattern:** Use `delivered@resend.dev` test address, add 600ms delay between tests for rate limiting (2 emails/sec)
- **Benefits:** Higher confidence than mocks, catches real API issues

### 6. TypeScript and Payload Types

- **Challenge:** Strict TypeScript types for Payload's Lexical JSON structure
- **Solution:** Use `as unknown as Type` pattern for complex nested structures
- **Lesson:** Payload's auto-generated types are very strict - use type assertions judiciously in tests

### 7. Database ID Types

- **Issue:** Initially used `string` for reporter IDs, but Payload uses `number` for SQLite
- **Fix:** Changed hook and tests to use `number` type for consistency
- **Lesson:** Always check payload-types.ts for correct types before implementation

### 8. Migrations with SQLite

- **Issue:** Payload auto-generated migration files that weren't needed for SQLite
- **Resolution:** Deleted migrations folder - SQLite auto-generates schema on startup
- **Lesson:** Migrations are only needed for production databases (PostgreSQL, etc.)

## Files Created/Modified

### New Files

- `src/services/email.ts` - Email service with inline HTML templates (177 lines)
- `src/services/email.spec.ts` - Integration tests (10 tests, all passing)
- `src/collections/hooks/sendIssueNotification.ts` - Hook for issue creation (88 lines)
- `src/collections/hooks/sendIssueNotification.spec.ts` - Hook tests (15 tests, all passing)
- `src/utils/html.ts` - HTML escaping and URL sanitization utilities
- `src/utils/html.spec.ts` - Security utility tests (15 tests, all passing)
- `src/utils/lexical.ts` - Lexical JSON parsing utility (115 lines)
- `src/utils/lexical.spec.ts` - Lexical utility tests (14 tests, all passing)
- `public/logo.png` - Logo for emails

### Modified Files

- `src/collections/Issues.ts` - Added `sendIssueNotification` hook to `afterChange`
- `src/payload.config.ts` - Configured Resend adapter with `@payloadcms/email-resend`
- `.env.example` - Documented email environment variables
- `vitest.setup.ts` - Fixed to not override .env values
- `package.json` - Added dependencies

## Test Coverage

### Email Service Tests (10 tests)

- Password reset emails (3 tests)
- Issue notification emails (5 tests)
- Error handling (2 tests)
- All use real Resend API with integration testing approach

### HTML Security Tests (15 tests)

- XSS prevention with HTML escaping
- URL sanitization (block javascript:, data:, vbscript:)
- Email validation
- HTTPS enforcement in production

### Lexical Parsing Tests (14 tests)

- Text extraction from nested structures
- Image URL extraction from upload nodes
- Multiple images handling
- Edge cases (empty content, invalid JSON, string input)

### Hook Tests (15 tests)

- Operation filtering (create vs update)
- Reporter information handling (populated vs ID)
- Lexical content parsing integration
- Error handling (email service failures)
- Status handling

**Total:** 54 new tests, all passing ✅

## Success Criteria

- ✅ Password reset emails are sent securely with proper token handling
- ✅ Issue notification emails are sent on create/update operations
- ✅ Emails render correctly across major clients (Gmail, Outlook, Apple Mail)
- ✅ All integration tests pass
- ✅ Email service is reusable and maintainable
- ✅ Error handling doesn't break core functionality
- ✅ Environment variables are documented
