import { escapeHtml, sanitizeUrl } from '@/utils/html'
import type { Payload } from 'payload'

/**
 * Response type from Resend email adapter
 */
export interface ResendResponse {
  id: string
}

interface SendResetPasswordEmailParams {
  payload: Payload
  to: string
  resetLink: string
  userName?: string
}

interface SendIssueNotificationEmailParams {
  payload: Payload
  to: string
  title: string
  description: string
  status: string
  reporterName?: string
  reporterEmail?: string
  issueId: string
  images?: string[]
}

/**
 * Send password reset email to user using Payload's email transport.
 * Renders HTML template with proper escaping to prevent XSS attacks.
 *
 * @param params - Email parameters
 * @param params.payload - Payload instance
 * @param params.to - Recipient email address
 * @param params.resetLink - Password reset link with token
 * @param params.userName - Optional user name for personalization
 * @returns Resend API response with email ID
 */
export async function sendResetPasswordEmail(params: SendResetPasswordEmailParams): Promise<ResendResponse> {
  const { payload, to, resetLink, userName } = params

  // Validate recipient email
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Invalid recipient email address')
  }

  // Validate reset link uses HTTPS in production
  if (!resetLink.startsWith('https://') && process.env.NODE_ENV === 'production') {
    payload.logger.warn('Reset link should use HTTPS in production')
  }

  // Validate userName length if provided
  if (userName && userName.length > 100) {
    throw new Error('User name exceeds maximum length (100 characters)')
  }

  const logoUrl = process.env.NEXT_PUBLIC_SERVER_URL ? `${process.env.NEXT_PUBLIC_SERVER_URL}/logo.png` : undefined

  // Build HTML with proper escaping to prevent XSS
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      ${
        logoUrl
          ? `<div style="text-align: center; margin-bottom: 32px;">
               <img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-width: 200px; height: auto;" />
             </div>`
          : ''
      }
      <h1 style="color: #222126; font-size: 24px; margin-bottom: 16px; font-weight: 600;">
        Password Reset Request
      </h1>
      ${userName ? `<p style="color: #222126; font-size: 16px; margin-bottom: 24px;">Hi ${escapeHtml(userName)},</p>` : ''}
      <p style="color: #222126; font-size: 16px; margin-bottom: 24px; line-height: 1.5;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      <a href="${sanitizeUrl(resetLink)}" style="display: inline-block; background-color: #fcc302; color: #222126; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500; margin-bottom: 24px;">
        Reset Password
      </a>
      <p style="color: #adb2b4; font-size: 14px; margin-top: 24px; line-height: 1.5;">
        If you didn't request this password reset, you can safely ignore this email.
      </p>
      <p style="color: #adb2b4; font-size: 14px; line-height: 1.5;">This link will expire in 1 hour.</p>
    </div>
  `

  const emailFrom = process.env.EMAIL_FROM
  if (!emailFrom) {
    payload.logger.error('EMAIL_FROM environment variable not configured')
    throw new Error('Email service not properly configured')
  }

  const response = await payload.sendEmail({
    from: emailFrom,
    to,
    subject: 'Reset Your Password',
    html,
  })

  return response as ResendResponse
}

/**
 * Send issue notification email to admin using Payload's email transport.
 * Renders HTML template with proper escaping to prevent XSS attacks.
 *
 * @param params - Email parameters
 * @param params.payload - Payload instance
 * @param params.to - Admin email address
 * @param params.title - Issue title
 * @param params.description - Issue description
 * @param params.status - Issue status
 * @param params.reporterName - Optional reporter name
 * @param params.reporterEmail - Optional reporter email
 * @param params.issueId - Issue ID for admin panel link
 * @param params.images - Optional array of image URLs from issue description
 * @returns Resend API response with email ID
 */
export async function sendIssueNotificationEmail(params: SendIssueNotificationEmailParams): Promise<ResendResponse> {
  const { payload, to, title, description, status, reporterName, reporterEmail, issueId, images = [] } = params

  // Validate recipient email
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Invalid recipient email address')
  }

  // Validate content lengths
  if (title.length > 200) {
    throw new Error('Title exceeds maximum length (200 characters)')
  }

  if (description.length > 5000) {
    throw new Error('Description exceeds maximum length (5000 characters)')
  }

  const adminPanelUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const issueUrl = `${adminPanelUrl}/admin/collections/issues/${issueId}`

  // Build HTML with proper escaping to prevent XSS
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #222126; font-size: 24px; margin-bottom: 24px; font-weight: 600;">
        New Issue Report
      </h1>
      <div style="margin-bottom: 24px;">
        <h2 style="color: #222126; font-size: 18px; margin-bottom: 8px; font-weight: 600;">${escapeHtml(title)}</h2>
        <p style="color: #adb2b4; font-size: 14px; margin-bottom: 4px;">
          Status: <strong style="color: #222126;">${escapeHtml(status)}</strong>
        </p>
        ${reporterName || reporterEmail ? `<p style="color: #adb2b4; font-size: 14px;">Reporter: ${reporterName ? escapeHtml(reporterName) : ''}${reporterName && reporterEmail ? ' (' : ''}${reporterEmail ? escapeHtml(reporterEmail) : ''}${reporterName && reporterEmail ? ')' : ''}</p>` : ''}
      </div>
      <div style="margin-bottom: 24px; padding: 16px 0; border-top: 1px solid #e3e3e3; border-bottom: 1px solid #e3e3e3;">
        <p style="color: #222126; font-size: 14px; margin: 0; line-height: 1.6;">${escapeHtml(description)}</p>
      </div>
      ${
        images.length > 0
          ? `<div style="margin-bottom: 24px;">
               <h3 style="color: #222126; font-size: 16px; margin-bottom: 12px; font-weight: 600;">Screenshots (${images.length})</h3>
               ${images
                 .map(
                   (imageUrl) =>
                     `<div style="margin-bottom: 16px;">
                       <img src="${sanitizeUrl(imageUrl)}" alt="Issue screenshot" style="max-width: 100%; height: auto; border: 1px solid #e3e3e3; border-radius: 4px;" />
                     </div>`,
                 )
                 .join('')}
             </div>`
          : ''
      }
      <a href="${sanitizeUrl(issueUrl)}" style="display: inline-block; background-color: #fcc302; color: #222126; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
        View Issue in Admin Panel
      </a>
    </div>
  `

  const emailFrom = process.env.EMAIL_FROM
  if (!emailFrom) {
    payload.logger.error('EMAIL_FROM environment variable not configured')
    throw new Error('Email service not properly configured')
  }

  const response = await payload.sendEmail({
    from: emailFrom,
    to,
    subject: `New Issue: ${title}`,
    html,
  })

  return response as ResendResponse
}
