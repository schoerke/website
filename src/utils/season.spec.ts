import { describe, expect, it } from 'vitest'
import { getConcertSeason } from './season'

describe('getConcertSeason', () => {
  it('returns prior season on the final day of August', () => {
    expect(getConcertSeason(new Date(2026, 7, 31))).toBe('2025/2026')
  })

  it('returns new season on the first day of September', () => {
    expect(getConcertSeason(new Date(2026, 8, 1))).toBe('2026/2027')
  })

  it('returns current season at the end of December', () => {
    expect(getConcertSeason(new Date(2026, 11, 31))).toBe('2026/2027')
  })

  it('returns prior season at the start of January', () => {
    expect(getConcertSeason(new Date(2026, 0, 1))).toBe('2025/2026')
  })
})
