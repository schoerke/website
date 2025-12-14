import type { User } from '@/payload-types'
import { sendIssueNotificationEmail } from '@/services/email'
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Send email notification to admin when an issue is created.
 * Uses the centralized email service with branded templates.
 *
 * @param doc - The issue document
 * @param operation - The operation type (create or update)
 * @param req - The Payload request object
 */
export const sendIssueNotification: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  // Only send notifications on create (not on updates to avoid spam)
  if (operation !== 'create') {
    return doc
  }

  try {
    // Get admin email from environment variable
    const adminEmail = process.env.ADMIN_EMAIL

    if (!adminEmail) {
      req.payload.logger.warn('ADMIN_EMAIL not configured, skipping issue notification')
      return doc
    }

    // Get reporter information if available
    let reporterName: string | undefined
    let reporterEmail: string | undefined

    if (doc.reporter) {
      if (typeof doc.reporter === 'object' && doc.reporter !== null) {
        // Reporter is already populated
        const reporter = doc.reporter as User
        reporterName = reporter.name || undefined
        reporterEmail = reporter.email || undefined
      } else {
        // Reporter is just an ID, fetch the user
        try {
          const reporter = await req.payload.findByID({
            collection: 'users',
            id: doc.reporter as number,
          })
          reporterName = reporter.name || undefined
          reporterEmail = reporter.email || undefined
        } catch (error) {
          req.payload.logger.warn(`Failed to fetch reporter user: ${error}`)
        }
      }
    }

    // Pass Lexical description directly to email service (which will convert to HTML)
    const description = doc.description || 'No description provided'

    await sendIssueNotificationEmail({
      payload: req.payload,
      to: adminEmail,
      title: doc.title,
      description,
      status: doc.status || 'open',
      reporterName,
      reporterEmail,
      issueId: doc.id,
    })

    req.payload.logger.info(`Issue notification email sent for: ${doc.title}`)
  } catch (error) {
    // Log error but don't fail the operation
    req.payload.logger.error(`Failed to send issue notification email: ${error}`)
  }

  return doc
}
