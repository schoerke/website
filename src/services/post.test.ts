// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { buildPostSearchWhere } from '@/services/post'

describe('buildPostSearchWhere', () => {
  it('returns or clause with normalizedTitle and normalizedContent when search >= 3 chars', () => {
    const result = buildPostSearchWhere('violine')

    expect(result).toBeDefined()
    expect(result?.or).toHaveLength(2)
    expect(result?.or[0]).toEqual({ normalizedTitle: { contains: 'violine' } })
    expect(result?.or[1]).toEqual({ normalizedContent: { contains: 'violine' } })
  })

  it('returns undefined when search < 3 chars', () => {
    const result = buildPostSearchWhere('ab')
    expect(result).toBeUndefined()
  })

  it('returns undefined when search is empty string', () => {
    const result = buildPostSearchWhere('')
    expect(result).toBeUndefined()
  })

  it('returns undefined when search is undefined', () => {
    const result = buildPostSearchWhere(undefined)
    expect(result).toBeUndefined()
  })

  it('uses normalize function on search term', () => {
    const mockNormalize = (text: string) => text.toLowerCase()
    const result = buildPostSearchWhere('VIOLINE', mockNormalize)

    expect(result?.or[0]).toEqual({ normalizedTitle: { contains: 'violine' } })
  })

  it('trims whitespace before length check', () => {
    // '  ab  ' trimmed = 'ab' (2 chars) => undefined
    const result = buildPostSearchWhere('  ab  ')
    expect(result).toBeUndefined()
  })

  it('trims whitespace and uses trimmed value in clause', () => {
    const mockNormalize = (text: string) => text
    const result = buildPostSearchWhere('  concert  ', mockNormalize)

    expect(result?.or[0]).toEqual({ normalizedTitle: { contains: 'concert' } })
  })
})
