import { describe, expect, it } from 'vitest'

import { normalizeDisplayText, parsePerformersListLine } from './parser'

describe('normalizeDisplayText', () => {
  it('removes C0 and C1 control characters before trimming Unicode whitespace', () => {
    expect(normalizeDisplayText('\u0000\u001FTianwa Yang\u007F\u009F\u00A0')).toBe('Tianwa Yang')
  })
})

describe('parsePerformersListLine', () => {
  it('parses a performer with spaced pipe separator', () => {
    expect(parsePerformersListLine('Tianwa Yang | Violine')).toEqual({
      type: 'performer',
      name: 'Tianwa Yang',
      instrument: 'Violine',
    })
  })

  it('parses a performer with no-space pipe separator', () => {
    expect(parsePerformersListLine('Tianwa Yang|Violine')).toEqual({
      type: 'performer',
      name: 'Tianwa Yang',
      instrument: 'Violine',
    })
  })

  it('splits only at the first pipe', () => {
    expect(parsePerformersListLine('A | B | C')).toEqual({
      type: 'performer',
      name: 'A',
      instrument: 'B | C',
    })
  })

  it('omits a blank trailing-pipe instrument', () => {
    expect(parsePerformersListLine('Tianwa Yang |')).toEqual({
      type: 'performer',
      name: 'Tianwa Yang',
    })
  })

  it('uses a pipe-less line as an ensemble group', () => {
    expect(parsePerformersListLine('Trio Catch')).toEqual({
      type: 'ensembleGroup',
      groupName: 'Trio Catch',
    })
  })

  it('rejects a performer with an empty left side', () => {
    expect(parsePerformersListLine('| Violine')).toEqual({
      type: 'invalid',
      reason: 'Performer name is required',
    })
  })

  it('trims ordinary and non-breaking whitespace', () => {
    expect(parsePerformersListLine('\u00A0 Tianwa Yang \u00A0|\u00A0 Violine \u00A0')).toEqual({
      type: 'performer',
      name: 'Tianwa Yang',
      instrument: 'Violine',
    })
  })

  it('rejects whitespace-only input', () => {
    expect(parsePerformersListLine('\u00A0 \t\n')).toEqual({
      type: 'invalid',
      reason: 'Line must not be empty',
    })
  })

  it('removes control characters from parsed values', () => {
    expect(parsePerformersListLine('\u0000Tianwa\u009F Yang | Vio\u001Fline')).toEqual({
      type: 'performer',
      name: 'Tianwa Yang',
      instrument: 'Violine',
    })
  })
})
