import { describe, expect, it } from 'vitest'
import { isEmbedHostAllowed } from './embeds'

describe('isEmbedHostAllowed', () => {
  it('allows an exact allowlisted host', () => {
    expect(isEmbedHostAllowed('rts.ch')).toBe(true)
  })

  it('allows an explicit subdomain of an allowlisted host', () => {
    expect(isEmbedHostAllowed('www.rts.ch')).toBe(true)
  })

  it('rejects a host not on the allowlist', () => {
    expect(isEmbedHostAllowed('evil.example.com')).toBe(false)
  })

  it('rejects a lookalike host (suffix match, not a subdomain)', () => {
    expect(isEmbedHostAllowed('not-rts-ch.com')).toBe(false)
    expect(isEmbedHostAllowed('rtsch.com')).toBe(false)
  })

  it('rejects empty strings', () => {
    expect(isEmbedHostAllowed('')).toBe(false)
  })
})
