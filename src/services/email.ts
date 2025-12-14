import { GENERAL_CONTACT } from '@/constants/contact'
import { escapeHtml, sanitizeUrl } from '@/utils/html'
import { lexicalToHtml } from '@/utils/lexical'
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
}

interface SendIssueNotificationEmailParams {
  payload: Payload
  to: string
  title: string
  description: string | object // Lexical JSON data or plain text
  status: string
  reporterName?: string
  reporterEmail?: string
  issueId: string
}

/**
 * Send password reset email to user using Payload's email transport.
 * Renders HTML template with proper escaping to prevent XSS attacks.
 *
 * @param params - Email parameters
 * @param params.payload - Payload instance
 * @param params.to - Recipient email address
 * @param params.resetLink - Password reset link with token
 * @returns Resend API response with email ID
 */
export async function sendResetPasswordEmail(params: SendResetPasswordEmailParams): Promise<ResendResponse> {
  const { payload, to, resetLink } = params

  // Validate recipient email
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Invalid recipient email address')
  }

  // Validate reset link uses HTTPS in production
  if (!resetLink.startsWith('https://') && process.env.NODE_ENV === 'production') {
    payload.logger.warn('Reset link should use HTTPS in production')
  }

  const adminPanelUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const logoUrl = `${adminPanelUrl}/logo.png`

  // Build HTML with proper escaping to prevent XSS
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <div style="margin-bottom: 32px;">
          <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(GENERAL_CONTACT.name)}" style="max-width: 400px; height: auto; display: block;" />
        </div>
        <h1 style="color: #222126; font-size: 24px; margin-bottom: 24px; font-weight: 600;">
          Password Reset
        </h1>
        <p style="color: #222126; font-size: 16px; margin-bottom: 24px; line-height: 1.5;">
          You are receiving this because you (or someone else) have requested the reset of the password for your account. Please click here to complete the process:
        </p>
        <a href="${sanitizeUrl(process.env.NEXT_PUBLIC_SERVER_URL ? `${process.env.NEXT_PUBLIC_SERVER_URL}${new URL(resetLink).pathname}` : resetLink)}" style="display: inline-block; background-color: #333333; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500; margin-bottom: 24px;">
          Reset Password
        </a>
        <p style="color: #222126; font-size: 14px; margin-top: 24px; line-height: 1.5;">
          If you did not request this, please ignore this email and your password will remain unchanged.
        </p>
      </div>
    </body>
    </html>
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
  const { payload, to, title, description, status, reporterName, reporterEmail, issueId } = params

  // Validate recipient email
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Invalid recipient email address')
  }

  // Validate content lengths
  if (title.length > 200) {
    throw new Error('Title exceeds maximum length (200 characters)')
  }

  // Validate description size
  if (typeof description === 'string' && description.length > 50000) {
    throw new Error('Description exceeds maximum length (50,000 characters)')
  }

  if (typeof description === 'object') {
    const jsonSize = JSON.stringify(description).length
    if (jsonSize > 100000) {
      throw new Error('Description JSON exceeds maximum size (100KB)')
    }
  }

  const adminPanelUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const issueUrl = `${adminPanelUrl}/admin/collections/issues/${issueId}`
  const logoUrl = `${adminPanelUrl}/logo.png`

  // Convert Lexical content to HTML (preserves inline images)
  const descriptionHtml =
    typeof description === 'object'
      ? lexicalToHtml(description, adminPanelUrl)
      : `<p style="color: #222126; font-size: 14px; margin: 0; line-height: 1.6;">${escapeHtml(description)}</p>`

  // Build HTML with proper escaping to prevent XSS
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <div style="margin-bottom: 32px;">
          <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(GENERAL_CONTACT.name)}" style="max-width: 400px; height: auto; display: block;" />
        </div>
        <h1 style="color: #222126; font-size: 24px; margin-bottom: 24px; font-weight: 600;">
          New Issue Report
        </h1>
        <div style="margin-bottom: 24px;">
          <h2 style="color: #222126; font-size: 18px; margin-bottom: 8px; font-weight: 600;">${escapeHtml(title)}</h2>
          <p style="color: #222126; font-size: 14px; margin-bottom: 4px;">
            Status: <strong style="color: #222126;">${escapeHtml(status)}</strong>
          </p>
          ${reporterName || reporterEmail ? `<p style="color: #222126; font-size: 14px;">Reporter: ${reporterName ? escapeHtml(reporterName) : ''}${reporterName && reporterEmail ? ' (' : ''}${reporterEmail ? escapeHtml(reporterEmail) : ''}${reporterName && reporterEmail ? ')' : ''}</p>` : ''}
        </div>
        <div style="margin-bottom: 24px; padding: 16px 0; border-top: 1px solid #e3e3e3; border-bottom: 1px solid #e3e3e3;">
          ${descriptionHtml}
        </div>
        <a href="${sanitizeUrl(issueUrl)}" style="display: inline-block; background-color: #333333; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
          View Issue in Admin Panel
        </a>
      </div>
    </body>
    </html>
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
