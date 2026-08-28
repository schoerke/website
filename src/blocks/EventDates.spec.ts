import { describe, expect, it } from 'vitest'

import { validateEventDates } from './EventDates'

describe('validateEventDates', () => {
  it('accepts a non-empty array', () => {
    expect(validateEventDates([{ date: '2026-07-04', location: 'Yamagata' }])).toBe(true)
  })

  it('rejects a non-array value', () => {
    expect(validateEventDates('nope')).toBe('At least one event is required')
  })

  it('rejects an empty array', () => {
    expect(validateEventDates([])).toBe('At least one event is required')
  })

  it('rejects undefined', () => {
    expect(validateEventDates(undefined)).toBe('At least one event is required')
  })
})
