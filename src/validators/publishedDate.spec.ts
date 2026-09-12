import { describe, expect, it } from 'vitest'
import { isFuturePublishedDate, validatePublishedDate } from './publishedDate'

// DateFieldValidation options require req/path/siblingData etc.; the validator only reads
// req.locale, so tests cast a minimal object.
const makeOptions = (locale?: string) => ({ req: { locale } }) as never

describe('isFuturePublishedDate', () => {
  // 2026-09-12T12:00:00Z = 2026-09-12 14:00 Europe/Berlin (CEST, UTC+2)
  const berlinNoon = new Date('2026-09-12T12:00:00.000Z')

  it('returns false for a past date', () => {
    expect(isFuturePublishedDate(new Date('2026-09-01T00:00:00.000Z'), berlinNoon)).toBe(false)
  })

  it('returns false for an invalid Date', () => {
    expect(isFuturePublishedDate(new Date('not-a-date'), berlinNoon)).toBe(false)
  })

  it('returns false for today in Berlin', () => {
    expect(isFuturePublishedDate(new Date('2026-09-12T00:00:00.000Z'), berlinNoon)).toBe(false)
  })

  it('returns true when UTC says today but Berlin says tomorrow', () => {
    // 2026-09-12T23:00:00Z = 2026-09-13 01:00 Berlin -> tomorrow in Berlin, today in UTC
    expect(isFuturePublishedDate(new Date('2026-09-12T23:00:00.000Z'), berlinNoon)).toBe(true)
  })

  it('returns false when both are the same Berlin day across a midnight boundary', () => {
    // now = Berlin Sept 13 01:00, value = Berlin Sept 13 00:30 -> same day, not future
    const berlinAfterMidnight = new Date('2026-09-12T23:00:00.000Z')
    const valueSameBerlinDay = new Date('2026-09-12T22:30:00.000Z')
    expect(isFuturePublishedDate(valueSameBerlinDay, berlinAfterMidnight)).toBe(false)
  })
})

describe('validatePublishedDate', () => {
  it('accepts null/undefined (field optional)', () => {
    expect(validatePublishedDate(undefined, makeOptions())).toBe(true)
    expect(validatePublishedDate(null, makeOptions())).toBe(true)
  })

  it('rejects an empty string (would store Invalid Date and crash reads)', () => {
    expect(validatePublishedDate('', makeOptions())).toBe('Invalid date.')
  })

  it('rejects an invalid string', () => {
    expect(validatePublishedDate('not-a-date', makeOptions())).toBe('Invalid date.')
  })

  it('rejects a far-future date (en)', () => {
    expect(validatePublishedDate('2999-01-01T00:00:00.000Z', makeOptions())).toBe('Date cannot be in the future.')
  })

  it('rejects a far-future date (de)', () => {
    expect(validatePublishedDate('2999-01-01T00:00:00.000Z', makeOptions('de'))).toBe(
      'Das Datum darf nicht in der Zukunft liegen.'
    )
  })

  it('accepts a past date', () => {
    expect(validatePublishedDate('2020-01-01T00:00:00.000Z', makeOptions())).toBe(true)
  })

  it('accepts a Date object in the past', () => {
    expect(validatePublishedDate(new Date('2020-01-01T00:00:00.000Z'), makeOptions())).toBe(true)
  })
})
