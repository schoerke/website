/**
 * HTML utility functions for safe string manipulation in HTML contexts.
 * Prevents XSS (Cross-Site Scripting) attacks by escaping user input.
 */

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Converts: & < > " ' to HTML entities
 *
 * @param text - Raw text that may contain HTML characters
 * @returns Escaped text safe for HTML insertion
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Sanitize URLs to prevent javascript: and data: scheme attacks.
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or '#' if dangerous
 *
 * @example
 * sanitizeUrl('javascript:alert(1)') // Returns: '#'
 * sanitizeUrl('https://example.com') // Returns: 'https://example.com'
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()

  // Block dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '#'
  }

  // Allow http(s), mailto, and relative paths starting with /
  if (!/^(https?|mailto):/i.test(trimmed) && !trimmed.startsWith('/')) {
    return '#'
  }

  return trimmed
}
