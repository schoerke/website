/**
 * Field validators for Payload CMS collections
 * Provides reusable validation functions with proper sanitization
 */

/**
 * Validates and sanitizes YouTube URLs
 * Accepts both youtube.com/watch?v= and youtu.be/ formats
 */
export const validateYouTubeURL = (value: unknown): true | string => {
  if (typeof value !== 'string') return 'Please enter a valid YouTube URL'

  try {
    const url = new URL(value)

    // Check if it's a YouTube domain
    const isYouTubeDomain =
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'youtube.com' ||
      url.hostname === 'youtu.be' ||
      url.hostname === 'm.youtube.com'

    if (!isYouTubeDomain) {
      return 'Please enter a valid YouTube URL'
    }

    // Validate video ID format (11 characters, alphanumeric, hyphens, underscores)
    let videoId: string | null = null

    if (url.hostname.includes('youtu.be')) {
      // Format: youtu.be/VIDEO_ID
      videoId = url.pathname.slice(1).split('/')[0]
    } else {
      // Format: youtube.com/watch?v=VIDEO_ID
      videoId = url.searchParams.get('v')
    }

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
      return 'Please enter a valid YouTube URL with a valid video ID'
    }

    return true
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
        const isAllowed = options.allowedDomains.some((domain) => url.hostname.endsWith(domain))
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
