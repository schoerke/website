import { isEmptyField } from '@/utils/embeds'
import { YOUTUBE_HOSTS, extractYouTubeVideoId } from '@/utils/videoEmbed'

/**
 * Field validators for Payload CMS collections
 * Provides reusable validation functions with proper sanitization
 */

/**
 * Context passed by Payload to field validators
 */
interface VideoURLContext {
  siblingData?: { url?: unknown; embedCode?: unknown }
}

/**
 * Validates video URLs for supported platforms: YouTube and arte.tv
 * YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live|embed|shorts/ID
 * arte.tv: arte.tv/{locale}/videos/{ID}/...
 *
 * An empty url is allowed when an embed code is set on the sibling field.
 */
export const validateVideoURL = (value: unknown, { siblingData }: VideoURLContext = {}): true | string => {
  const embedCode = siblingData?.embedCode

  if (isEmptyField(value)) {
    // Empty url is fine when an embed code is set on the sibling field
    if (typeof embedCode === 'string' && embedCode.trim() !== '') {
      return true
    }
    // No embedCode sibling -> generic URL message (e.g. Artists array-item context).
    // embedCode sibling present but empty -> block context asks for either field.
    return embedCode === undefined
      ? 'Please enter a valid video URL'
      : 'Please enter either a video URL or an embed code'
  }

  if (typeof value !== 'string') return 'Please enter a valid video URL'

  try {
    const url = new URL(value)

    // YouTube
    if (extractYouTubeVideoId(value)) {
      return true
    }

    if (YOUTUBE_HOSTS.includes(url.hostname)) {
      return 'Please enter a valid YouTube URL with a valid video ID'
    }

    // arte.tv: pathname must be /{locale}/videos/{ID}/...
    const isArteDomain = url.hostname === 'www.arte.tv' || url.hostname === 'arte.tv'

    if (isArteDomain) {
      const arteMatch = url.pathname.match(/^\/[a-z]{2}\/videos\/([^/]+)\/?/)
      if (!arteMatch || !arteMatch[1]) {
        return 'Please enter a valid arte.tv video URL'
      }
      return true
    }

    return 'Please enter a valid YouTube or arte.tv video URL'
  } catch {
    return 'Please enter a valid URL format'
  }
}

/**
 * Validates general URLs with optional domain restrictions
 */
export const validateURL =
  (options?: { allowedDomains?: string[]; message?: string }) =>
  (value: unknown): true | string => {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return true // Allow empty values (use 'required' separately)
    }

    try {
      const url = new URL(value)

      // Ensure it's http or https
      if (!['http:', 'https:'].includes(url.protocol)) {
        return options?.message || 'URL must use HTTP or HTTPS protocol'
      }

      // Check allowed domains if specified
      if (options?.allowedDomains && options.allowedDomains.length > 0) {
        const isAllowed = options.allowedDomains.some(
          (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        )
        if (!isAllowed) {
          return options?.message || `URL must be from one of these domains: ${options.allowedDomains.join(', ')}`
        }
      }

      return true
    } catch {
      return options?.message || 'Please enter a valid URL'
    }
  }

/**
 * Validates quote fields to ensure they don't start or end with quotation marks
 */
export const validateQuote = (value: unknown): true | string => {
  if (typeof value !== 'string') return true

  const quoteRegex = /^["""''']|["""''']$/
  return quoteRegex.test(value) ? 'Please avoid starting or ending the quote with quotation marks' : true
}

/**
 * Password validation constants
 */
const MIN_PASSWORD_LENGTH = 12
const MAX_PASSWORD_LENGTH = 128
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/
const SPECIAL_CHARS_LIST = '!@#$%^&*()_+-=[]{}|;:,.<>?'

/**
 * Validates password strength for user authentication
 * Enforces industry best practices for secure passwords
 *
 * Requirements:
 * - Minimum 12 characters, maximum 128 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - Cannot be empty or only whitespace
 */
export const validatePassword = (value: unknown): true | string => {
  // Allow undefined/null (field not being changed)
  if (value === undefined || value === null) return true

  // Type guard
  if (typeof value !== 'string') return 'Password must be a string'

  // Trim whitespace for validation
  const trimmed = value.trim()

  // Empty check
  if (trimmed === '') return 'Password cannot be empty'

  // Length checks
  if (trimmed.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
  }

  if (trimmed.length > MAX_PASSWORD_LENGTH) {
    return `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`
  }

  // Character requirement checks
  if (!/[A-Z]/.test(trimmed)) {
    return 'Password must contain at least one uppercase letter'
  }

  if (!/[a-z]/.test(trimmed)) {
    return 'Password must contain at least one lowercase letter'
  }

  if (!/[0-9]/.test(trimmed)) {
    return 'Password must contain at least one number'
  }

  if (!SPECIAL_CHARS_REGEX.test(trimmed)) {
    return `Password must contain at least one special character (${SPECIAL_CHARS_LIST})`
  }

  return true
}
