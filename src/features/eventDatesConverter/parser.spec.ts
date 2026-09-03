import { describe, expect, it } from 'vitest'

import { parseEventDateLine, validateEventUrl } from './parser'

describe('parseEventDateLine', () => {
  it('parses post 262 German numeric event text', () => {
    expect(parseEventDateLine('29.5.2026 19.30 Uhr mit dem Mozarteumorchester Salzburg')).toEqual({
      date: '2026-05-29T12:00:00.000Z',
      location: '19.30 Uhr mit dem Mozarteumorchester Salzburg',
      url: undefined,
    })
  })

  it('parses German and English month dates and ISO dates', () => {
    expect(parseEventDateLine('4. Juli 2026, Yamagata')).toEqual({
      date: '2026-07-04T12:00:00.000Z',
      location: 'Yamagata',
      url: undefined,
    })
    expect(parseEventDateLine('July 4, 2026 - Yamagata')).toEqual({
      date: '2026-07-04T12:00:00.000Z',
      location: 'Yamagata',
      url: undefined,
    })
    expect(parseEventDateLine('2026-07-04 Yamagata')).toEqual({
      date: '2026-07-04T12:00:00.000Z',
      location: 'Yamagata',
      url: undefined,
    })
  })

  it('parses English ordinal month dates', () => {
    expect(parseEventDateLine('July 15th 2023, Wulfshagen')).toEqual({
      date: '2023-07-15T12:00:00.000Z',
      location: 'Wulfshagen',
      url: undefined,
    })
  })

  it('accepts German dot-separated numeric dates and rejects every slash or hyphen numeric date', () => {
    expect(parseEventDateLine('29.5.2026, Salzburg')).toMatchObject({
      date: '2026-05-29T12:00:00.000Z',
      location: 'Salzburg',
    })
    expect(parseEventDateLine('3.6.2026, Post 262 first event')).toMatchObject({
      date: '2026-06-03T12:00:00.000Z',
      location: 'Post 262 first event',
    })
    expect(parseEventDateLine('4.6.2026, Post 262 second event')).toMatchObject({
      date: '2026-06-04T12:00:00.000Z',
      location: 'Post 262 second event',
    })
    for (const line of ['03/04/2026 Yamagata', '29/05/2026 Yamagata', '03-04-2026 Yamagata', '29-05-2026 Yamagata']) {
      expect(parseEventDateLine(line)).toMatchObject({ error: expect.any(String) })
    }
  })

  it('normalizes German month names and accepts unambiguous abbreviations', () => {
    expect(parseEventDateLine('4. März 2026, Berlin')).toMatchObject({
      date: '2026-03-04T12:00:00.000Z',
      location: 'Berlin',
    })
    expect(parseEventDateLine('4. Okt. 2026, Berlin')).toMatchObject({
      date: '2026-10-04T12:00:00.000Z',
      location: 'Berlin',
    })
    expect(parseEventDateLine('4. Dez. 2026, Berlin')).toMatchObject({
      date: '2026-12-04T12:00:00.000Z',
      location: 'Berlin',
    })
  })

  it('accepts decomposed German month names', () => {
    expect(parseEventDateLine('4. Ma\u0308rz 2026, Berlin')).toMatchObject({
      date: '2026-03-04T12:00:00.000Z',
      location: 'Berlin',
    })
  })

  it('preserves Unicode accents in locations', () => {
    expect(parseEventDateLine('4. März 2026, Théâtre des Champs-Élysées')).toMatchObject({
      location: 'Théâtre des Champs-Élysées',
    })
  })

  it('handles terminal date punctuation before a location', () => {
    expect(parseEventDateLine('4. Juli 2026. Yamagata')).toMatchObject({
      date: '2026-07-04T12:00:00.000Z',
      location: 'Yamagata',
    })
  })

  it('strips Unicode dash separators before a location', () => {
    expect(parseEventDateLine('4. Juli 2026 – Yamagata')).toMatchObject({ location: 'Yamagata' })
    expect(parseEventDateLine('4. Juli 2026 — Yamagata')).toMatchObject({ location: 'Yamagata' })
  })

  it('accepts valid leap-year dates', () => {
    expect(parseEventDateLine('29. Februar 2024, Berlin')).toMatchObject({
      date: '2024-02-29T12:00:00.000Z',
      location: 'Berlin',
    })
  })

  it('rejects keyword date ranges and relative-date terms', () => {
    for (const line of [
      '4. Juli 2026 bis 5. Juli 2026 Yamagata',
      'July 4, 2026 to July 5, 2026 Yamagata',
      '2026-07-04 until 2026-07-05 Yamagata',
      '4. Juli 2026 morgen Yamagata',
      '4. Juli 2026 tomorrow Yamagata',
      '4. Juli 2026 heute Yamagata',
      '4. Juli 2026 today Yamagata',
      '4. Juli 2026 gestern Yamagata',
      '4. Juli 2026 yesterday Yamagata',
    ]) {
      expect(parseEventDateLine(line)).toMatchObject({ error: expect.any(String) })
    }
  })

  it('allows ordinary location prose containing relative-term substrings', () => {
    expect(parseEventDateLine('4. Juli 2026, Tomorrowland Festival')).toMatchObject({
      location: 'Tomorrowland Festival',
    })
  })

  it('rejects slash-separated date ranges', () => {
    expect(parseEventDateLine('4. Juli 2026 / 5. Juli 2026 Yamagata')).toMatchObject({ error: expect.any(String) })
  })

  it('allows an ordinary slash in a location', () => {
    expect(parseEventDateLine('4. Juli 2026, Berlin/Hamburg Tour')).toMatchObject({
      location: 'Berlin/Hamburg Tour',
    })
  })

  it('rejects invalid calendars, missing locations, ranges, relative, and yearless dates', () => {
    for (const line of [
      '29. Februar 2025 Berlin',
      '31. April 2026 Berlin',
      '4. Juli 2026',
      '4. Juli 2026.',
      '4.-5. Juli 2026 Yamagata',
      '2026-07-04 - 2026-07-05 Yamagata',
      '29.5.2026 - 30.5.2026 Salzburg',
      '4. Juli - 5. Juli 2026 Yamagata',
      '4. Juli 2026 - 5. Juli 2026 Yamagata',
      '4. Juli 2026 - 5. Juli Berlin',
      'July 4 - July 5, 2026 Yamagata',
      'July 4, 2026 - July 5, 2026 Yamagata',
      '2026-07-04 – 2026-07-05 Yamagata',
      '29.5.2026 — 30.5.2026 Salzburg',
      'morgen Yamagata',
      '4. Juli Yamagata',
    ]) {
      expect(parseEventDateLine(line)).toMatchObject({ error: expect.any(String) })
    }
  })

  it('keeps a valid custom URL and rejects invalid custom URLs', () => {
    expect(parseEventDateLine('4. Juli 2026, Yamagata', ' https://example.com/tour ')).toEqual({
      date: '2026-07-04T12:00:00.000Z',
      location: 'Yamagata',
      url: 'https://example.com/tour',
    })
    expect(parseEventDateLine('4. Juli 2026, Yamagata', 'javascript:alert(1)')).toMatchObject({
      error: expect.any(String),
    })
  })
})

describe('validateEventUrl', () => {
  it('trims valid HTTP(S) URLs', () => {
    expect(validateEventUrl(' https://example.com/tour ')).toEqual({ url: 'https://example.com/tour' })
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', '//example.com', 'https://user:pass@example.com', 'example.com'])(
    'rejects unsafe or malformed URL %s',
    (url) => expect(validateEventUrl(url)).toMatchObject({ error: expect.any(String) })
  )
})
