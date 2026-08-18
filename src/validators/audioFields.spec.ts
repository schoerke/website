import { describe, expect, it } from 'vitest'
import { validateEmbedCode } from './audioFields'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>`

describe('validateEmbedCode', () => {
  it('accepts an iframe snippet from an allowlisted host', () => {
    expect(validateEmbedCode(RTS_SNIPPET)).toBe(true)
  })

  it('accepts a snippet from a subdomain of an allowlisted host', () => {
    expect(
      validateEmbedCode('<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>')
    ).toBe(true)
  })

  it('rejects an iframe from a non-allowlisted host', () => {
    expect(
      validateEmbedCode('<iframe src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
  })

  it('rejects a lookalike host', () => {
    expect(validateEmbedCode('<iframe src="https://rts-ch.evil.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects text that is not an iframe', () => {
    expect(validateEmbedCode('just some text')).toBe('Please enter a valid embed code')
    expect(validateEmbedCode('<div>hi</div>')).toBe('Please enter a valid embed code')
  })

  it('rejects a snippet without src', () => {
    expect(validateEmbedCode('<iframe width="392"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('validates the real src, not a data-src attribute', () => {
    // data-src must not be mistaken for src
    expect(
      validateEmbedCode('<iframe data-src="https://www.rts.ch/x" src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
    expect(
      validateEmbedCode('<iframe data-src="https://evil.example.com/x" src="https://www.rts.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects non-https src', () => {
    expect(
      validateEmbedCode('<iframe src="http://rts.ch/play/embed?urn=x"></iframe>')
    ).toBe('Please enter a valid embed code')
  })

  it('rejects non-string values', () => {
    expect(validateEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(null)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(undefined)).toBe('Please enter a valid embed code')
  })
})
