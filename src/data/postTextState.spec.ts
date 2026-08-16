import { describe, expect, it } from 'vitest'

import { postTextState, resolveTextStateStyle } from './postTextState'

describe('postTextState', () => {
  it('groups all options under one style stateKey', () => {
    expect(Object.keys(postTextState)).toEqual(['style'])
  })

  it('offers only contrast-safe highlight options', () => {
    // brand colors as plain text fail contrast on white; only highlights are offered
    for (const key of Object.keys(postTextState.style)) {
      expect(key.startsWith('highlight-')).toBe(true)
    }
  })

  it('pre-composes brand backgrounds with accessible text colors', () => {
    expect(postTextState.style['highlight-yellow']).toEqual({
      label: 'Yellow Highlight',
      css: { 'background-color': '#FCC302', color: '#222126' },
    })
    // light backgrounds pair with dark text
    expect(postTextState.style['highlight-silver'].css.color).toBe('#222126')
    expect(postTextState.style['highlight-platinum'].css.color).toBe('#222126')
    // dark background pairs with light text
    expect(postTextState.style['highlight-dark'].css).toEqual({
      'background-color': '#222126',
      color: '#FFFFFF',
    })
  })

  describe('resolveTextStateStyle', () => {
    it('returns background and color css for a highlight value', () => {
      expect(resolveTextStateStyle({ style: 'highlight-yellow' })).toEqual({
        'background-color': '#FCC302',
        color: '#222126',
      })
    })

    it('returns an empty object for unknown state values', () => {
      expect(resolveTextStateStyle({ style: 'text-mikado-yellow' })).toEqual({})
      expect(resolveTextStateStyle({ style: 'not-a-style' })).toEqual({})
    })

    it('returns an empty object for unknown state keys', () => {
      expect(resolveTextStateStyle({ color: 'highlight-yellow' })).toEqual({})
    })
  })
})