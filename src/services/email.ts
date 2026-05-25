import { GENERAL_CONTACT } from '@/constants/contact'
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
