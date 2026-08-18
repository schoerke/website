export const ALLOWED_EMBED_HOSTS = ['rts.ch'] as const

/**
 * Whether hostname may be embedded via iframe. Deny-by-default: exact
 * match or explicit dot-delimited subdomain of an allowlisted host.
 * Pass a parsed URL hostname (e.g. new URL(src).hostname), case-insensitive.
 */
export function isEmbedHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_EMBED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
