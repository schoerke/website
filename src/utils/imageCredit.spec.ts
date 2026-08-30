import { describe, expect, it } from 'vitest'

import { normalizeImageCredit } from './imageCredit'

describe('normalizeImageCredit', () => {
  it('removes a leading lowercase copyright marker and following whitespace', () => {
    expect(normalizeImageCredit('(c)  Max Mustermann')).toBe('Max Mustermann')
  })

  it('removes a leading uppercase copyright marker and following whitespace', () => {
    expect(normalizeImageCredit('(C)\tMax Mustermann')).toBe('Max Mustermann')
  })

  it('removes leading whitespace before a copyright marker', () => {
    expect(normalizeImageCredit(' (c) Irene Zandel')).toBe('Irene Zandel')
  })

  it('removes an underscore separator after a copyright marker', () => {
    expect(normalizeImageCredit('(c)_Andrej Grilc')).toBe('Andrej Grilc')
  })

  it('returns null when the credit contains only a marker and whitespace', () => {
    expect(normalizeImageCredit('(c)   ')).toBeNull()
  })

  it('retains inputs without a leading copyright marker', () => {
    expect(normalizeImageCredit('Foto (c) Max Mustermann')).toBe('Foto (c) Max Mustermann')
    expect(normalizeImageCredit(null)).toBeNull()
    expect(normalizeImageCredit(undefined)).toBeUndefined()
  })

  it('retains arbitrary non-string values', () => {
    expect(normalizeImageCredit(42)).toBe(42)
    expect(normalizeImageCredit(false)).toBe(false)
    expect(normalizeImageCredit({ credit: '(c) Max Mustermann' })).toEqual({ credit: '(c) Max Mustermann' })
  })
})
