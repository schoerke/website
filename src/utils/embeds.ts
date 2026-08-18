export const ALLOWED_EMBED_HOSTS = ['rts.ch'] as const

export function isEmbedHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_EMBED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
