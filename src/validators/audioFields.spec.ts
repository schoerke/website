import { describe, expect, it } from 'vitest'
import { validateAudioURL, validateEmbedCode } from './audioFields'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>`

describe('validateAudioURL', () => {
  it('accepts a Spotify track URL', () => {
    expect(validateAudioURL('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toBe(true)
  })

  it('accepts an Apple Music album URL', () => {
    expect(validateAudioURL('https://music.apple.com/us/album/example/1234567890')).toBe(true)
  })

  it('accepts an empty url when sibling embedCode is present', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })).toBe(
      true
    )
  })

  it('rejects an empty url when sibling embedCode is also empty', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '' } })).toBe(
      'Please enter either an audio URL or an embed code'
    )
  })

  it('rejects an invalid url even when embedCode is present', () => {
    expect(
      validateAudioURL('not-a-url', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe('Please enter a valid URL format')
  })

  it('accepts an undefined url when sibling embedCode is present', () => {
    expect(
      validateAudioURL(undefined, { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe(true)
  })

  it('accepts a null url when sibling embedCode is present', () => {
    expect(validateAudioURL(null, { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })).toBe(
      true
    )
  })

  it('rejects an undefined url when sibling embedCode is also empty', () => {
    expect(validateAudioURL(undefined, { siblingData: { embedCode: '' } })).toBe(
      'Please enter either an audio URL or an embed code'
    )
  })

  it('rejects both url and embedCode being set to whitespace', () => {
    expect(validateAudioURL('   ', { siblingData: { embedCode: '   ' } })).toBe(
      'Please enter either an audio URL or an embed code'
    )
  })
})

describe('validateEmbedCode', () => {
  it('accepts an iframe snippet from an allowlisted host', () => {
    expect(validateEmbedCode(RTS_SNIPPET)).toBe(true)
  })

  it('accepts a snippet from a subdomain of an allowlisted host', () => {
    expect(validateEmbedCode('<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>')).toBe(true)
  })

  it('rejects an iframe from a non-allowlisted host', () => {
    expect(validateEmbedCode('<iframe src="https://evil.example.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
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
    expect(validateEmbedCode('<iframe src="http://rts.ch/play/embed?urn=x"></iframe>')).toBe(
      'Please enter a valid embed code'
    )
  })

  it('ignores src attributes outside the iframe tag', () => {
    expect(
      validateEmbedCode('<img src="https://evil.example.com/x"><iframe src="https://www.rts.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects javascript and data URLs', () => {
    expect(validateEmbedCode('<iframe src="javascript:alert(1)"></iframe>')).toBe('Please enter a valid embed code')
    expect(validateEmbedCode('<iframe src="data:text/html,x"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('accepts an empty embed code when sibling url is present', () => {
    expect(
      validateEmbedCode('', { siblingData: { url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' } })
    ).toBe(true)
  })

  it('rejects an empty embed code when sibling url is also empty', () => {
    expect(validateEmbedCode('', { siblingData: { url: '' } })).toBe(
      'Please enter either an audio URL or an embed code'
    )
  })

  it('rejects non-string values', () => {
    expect(validateEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(null)).toBe('Please enter either an audio URL or an embed code')
    expect(validateEmbedCode(undefined)).toBe('Please enter either an audio URL or an embed code')
  })
})
