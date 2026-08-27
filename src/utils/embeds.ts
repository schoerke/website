export const ALLOWED_EMBED_HOSTS = ['rts.ch', 'rsi.ch', 'ardmediathek.de'] as const

/**
 * Returns true when a field value is effectively empty (missing or whitespace-only)
 */
export const isEmptyField = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * Whether hostname may be embedded via iframe. Deny-by-default: exact
 * match or explicit dot-delimited subdomain of an allowlisted host.
 * Pass a parsed URL hostname (e.g. new URL(src).hostname), case-insensitive.
 * Optionally pass an explicit allowlist (defaults to ALLOWED_EMBED_HOSTS).
 */
export function isEmbedHostAllowed(hostname: string, allowedHosts: readonly string[] = ALLOWED_EMBED_HOSTS): boolean {
  const host = hostname.toLowerCase()
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
