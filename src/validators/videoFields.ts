import { IFRAME_ATTR, IFRAME_TAG } from '@/utils/audioEmbed'
import { ALLOWED_EMBED_HOSTS, isEmbedHostAllowed } from '@/utils/embeds'

/**
 * Context passed by Payload to field validators
 */
interface VideoEmbedCodeContext {
  siblingData?: { url?: unknown; embedCode?: unknown }
}

/**
 * Returns true when a field value is effectively empty (missing or whitespace-only)
 */
const isEmptyVideoField = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * Validates raw <iframe> embed codes (e.g. RSI, ARD Mediathek, RTS) against the
 * code-hardcoded host allowlist.
 *
 * An empty embed code is allowed when a url is set on the sibling field.
 *
 * @param value - Raw iframe snippet string
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateVideoEmbedCode = (value: unknown, { siblingData }: VideoEmbedCodeContext = {}): true | string => {
  const siblingUrl = siblingData?.url

  if (isEmptyVideoField(value) && typeof siblingUrl === 'string' && siblingUrl.trim() !== '') {
    return true
  }

  if (isEmptyVideoField(value)) {
    return 'Please enter either a video URL or an embed code'
  }

  if (typeof value !== 'string' || !IFRAME_TAG.test(value)) {
    return 'Please enter a valid embed code'
  }

  const tag = value.match(IFRAME_TAG)?.[0] ?? ''
  const srcMatch = tag.match(IFRAME_ATTR('src'))
  if (!srcMatch || !srcMatch[1]) return 'Please enter a valid embed code'

  let url: URL
  try {
    url = new URL(srcMatch[1])
  } catch {
    return 'Please enter a valid embed code'
  }

  if (url.protocol !== 'https:') return 'Please enter a valid embed code'

  if (!isEmbedHostAllowed(url.hostname, ALLOWED_EMBED_HOSTS)) return 'Embed iframe host is not allowed'

  return true
}
