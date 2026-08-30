import { describe, expect, it } from 'vitest'
import { hasBoundaryQuotationMark } from './quoteWarning'

describe('hasBoundaryQuotationMark', () => {
  it('detects quotation marks at either trimmed boundary', () => {
    expect(hasBoundaryQuotationMark('"Quoted text')).toBe(true)
    expect(hasBoundaryQuotationMark('Quoted text"')).toBe(true)
    expect(hasBoundaryQuotationMark('  “Quoted text”  ')).toBe(true)
  })

  it('accepts unquoted text', () => {
    expect(hasBoundaryQuotationMark('Quoted text')).toBe(false)
    expect(hasBoundaryQuotationMark('')).toBe(false)
    expect(hasBoundaryQuotationMark('   ')).toBe(false)
  })

  it('accepts non-string values', () => {
    expect(hasBoundaryQuotationMark(null)).toBe(false)
    expect(hasBoundaryQuotationMark(undefined)).toBe(false)
    expect(hasBoundaryQuotationMark(42)).toBe(false)
  })
})
