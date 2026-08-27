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

  it('is case-insensitive', () => {
    expect(isEmbedHostAllowed('RTS.CH')).toBe(true)
    expect(isEmbedHostAllowed('WWW.RTS.CH')).toBe(true)
  })

  it('allows rsi.ch (RSI) and its subdomains', () => {
    expect(isEmbedHostAllowed('rsi.ch')).toBe(true)
    expect(isEmbedHostAllowed('www.rsi.ch')).toBe(true)
  })

  it('allows ardmediathek.de (ARD Mediathek) and its subdomains', () => {
    expect(isEmbedHostAllowed('ardmediathek.de')).toBe(true)
    expect(isEmbedHostAllowed('www.ardmediathek.de')).toBe(true)
    expect(isEmbedHostAllowed('api.ardmediathek.de')).toBe(true)
  })

  it('rejects lookalikes of the new hosts', () => {
    expect(isEmbedHostAllowed('rsi-ch.com')).toBe(false)
    expect(isEmbedHostAllowed('rsi.ch.evil.com')).toBe(false)
    expect(isEmbedHostAllowed('ardmediathek.de.evil.com')).toBe(false)
    expect(isEmbedHostAllowed('ardmediathek.com')).toBe(false)
  })

  it('keeps rts.ch allowlisted', () => {
    expect(isEmbedHostAllowed('rts.ch')).toBe(true)
  })

  it('honors an explicit allowlist argument (override)', () => {
    expect(isEmbedHostAllowed('rts.ch', [])).toBe(false)
    expect(isEmbedHostAllowed('foo.com', ['foo.com'])).toBe(true)
    expect(isEmbedHostAllowed('www.foo.com', ['foo.com'])).toBe(true)
  })
})
