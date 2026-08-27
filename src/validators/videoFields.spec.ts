import { describe, expect, it } from 'vitest'
import { validateVideoEmbedCode } from './videoFields'

const RSI_SNIPPET = `<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761" width="392" height="58" allowfullscreen></iframe>`

describe('validateVideoEmbedCode', () => {
  it('accepts an iframe snippet from an allowlisted host', () => {
    expect(validateVideoEmbedCode(RSI_SNIPPET)).toBe(true)
  })

  it('accepts a snippet from a subdomain of an allowlisted host', () => {
    expect(
      validateVideoEmbedCode(
        '<iframe src="https://www.ardmediathek.de/embed/Y3JpZDovL2FyZC5kZS92aWRlby0xNjA4Nw?clientType=ardde"></iframe>'
      )
    ).toBe(true)
  })

  it('accepts rts.ch iframes (shared with audio)', () => {
    expect(validateVideoEmbedCode('<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>')).toBe(true)
  })

  it('rejects an iframe from a non-allowlisted host', () => {
    expect(validateVideoEmbedCode('<iframe src="https://evil.example.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects a lookalike host', () => {
    expect(validateVideoEmbedCode('<iframe src="https://rsi-ch.evil.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects text that is not an iframe', () => {
    expect(validateVideoEmbedCode('just some text')).toBe('Please enter a valid embed code')
    expect(validateVideoEmbedCode('<div>hi</div>')).toBe('Please enter a valid embed code')
  })

  it('rejects a snippet without src', () => {
    expect(validateVideoEmbedCode('<iframe width="392"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('validates the real src, not a data-src attribute', () => {
    expect(
      validateVideoEmbedCode('<iframe data-src="https://www.rsi.ch/x" src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
    expect(
      validateVideoEmbedCode('<iframe data-src="https://evil.example.com/x" src="https://www.rsi.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects non-https src', () => {
    expect(validateVideoEmbedCode('<iframe src="http://rsi.ch/play/embed?urn=x"></iframe>')).toBe(
      'Please enter a valid embed code'
    )
  })

  it('rejects javascript and data URLs', () => {
    expect(validateVideoEmbedCode('<iframe src="javascript:alert(1)"></iframe>')).toBe(
      'Please enter a valid embed code'
    )
    expect(validateVideoEmbedCode('<iframe src="data:text/html,x"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('accepts an empty embed code when sibling url is present', () => {
    expect(validateVideoEmbedCode('', { siblingData: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })).toBe(
      true
    )
  })

  it('rejects an empty embed code when sibling url is also empty', () => {
    expect(validateVideoEmbedCode('', { siblingData: { url: '' } })).toBe(
      'Please enter either a video URL or an embed code'
    )
  })

  it('rejects non-string values', () => {
    expect(validateVideoEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateVideoEmbedCode(null)).toBe('Please enter either a video URL or an embed code')
    expect(validateVideoEmbedCode(undefined)).toBe('Please enter either a video URL or an embed code')
  })
})
