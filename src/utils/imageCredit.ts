export function normalizeImageCredit<T>(credit: T): T | string | null {
  if (typeof credit !== 'string') return credit

  const normalized = credit.replace(/^\s*\(c\)\s*_?\s*/i, '')
  if (normalized === credit) return credit

  return normalized || null
}
