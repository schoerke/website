import { describe, expect, it } from 'vitest'
import { validateAudioURL, validateEmbedCode, validateFileURL } from './audioFields'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>`
const SPOTIFY_URL = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'
const DROPBOX_URL = 'https://www.dropbox.com/s/abc123/recording.mp3?dl=0'

describe('validateAudioURL', () => {
  it('accepts a Spotify track URL', () => {
    expect(validateAudioURL(SPOTIFY_URL)).toBe(true)
  })

  it('accepts an Apple Music album URL', () => {
    expect(validateAudioURL('https://music.apple.com/us/album/example/1234567890')).toBe(true)
  })

  it('accepts an empty url when sibling embedCode is present', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })).toBe(
      true
    )
  })

  it('accepts an empty url when sibling fileUrl is present', () => {
    expect(validateAudioURL('', { siblingData: { fileUrl: DROPBOX_URL } })).toBe(true)
  })

  it('rejects an empty url when no sibling field is set', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
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

  it('rejects an undefined url when no sibling field is set', () => {
    expect(validateAudioURL(undefined, { siblingData: { embedCode: '' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects all three fields being whitespace', () => {
    expect(validateAudioURL('   ', { siblingData: { embedCode: '   ', fileUrl: '   ' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects url set together with embedCode, naming the conflicting field', () => {
    expect(
      validateAudioURL(SPOTIFY_URL, { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe('Clear the Embed Code field first')
  })

  it('rejects url set together with fileUrl, naming the conflicting field', () => {
    expect(validateAudioURL(SPOTIFY_URL, { siblingData: { fileUrl: DROPBOX_URL } })).toBe(
      'Clear the Audio File URL field first'
    )
  })

  it('rejects url set together with both other fields, naming both', () => {
    expect(
      validateAudioURL(SPOTIFY_URL, {
        siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>', fileUrl: DROPBOX_URL },
      })
    ).toBe('Clear the Embed Code and Audio File URL fields first')
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
    expect(validateEmbedCode('', { siblingData: { url: SPOTIFY_URL } })).toBe(true)
  })

  it('accepts an empty embed code when sibling fileUrl is present', () => {
    expect(validateEmbedCode('', { siblingData: { fileUrl: DROPBOX_URL } })).toBe(true)
  })

  it('rejects an empty embed code when no sibling field is set', () => {
    expect(validateEmbedCode('', { siblingData: { url: '' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects non-string values', () => {
    expect(validateEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(null)).toBe('Please enter an audio URL, embed code, or audio file URL')
    expect(validateEmbedCode(undefined)).toBe('Please enter an audio URL, embed code, or audio file URL')
  })

  it('rejects embedCode set together with url, naming the conflicting field', () => {
    expect(validateEmbedCode(RTS_SNIPPET, { siblingData: { url: SPOTIFY_URL } })).toBe(
      'Clear the Audio URL field first'
    )
  })

  it('rejects embedCode set together with fileUrl, naming the conflicting field', () => {
    expect(validateEmbedCode(RTS_SNIPPET, { siblingData: { fileUrl: DROPBOX_URL } })).toBe(
      'Clear the Audio File URL field first'
    )
  })
})

describe('validateFileURL', () => {
  it('accepts a valid https URL', () => {
    expect(validateFileURL(DROPBOX_URL)).toBe(true)
  })

  it('accepts an empty fileUrl when sibling url is present', () => {
    expect(validateFileURL('', { siblingData: { url: SPOTIFY_URL } })).toBe(true)
  })

  it('accepts an empty fileUrl when sibling embedCode is present', () => {
    expect(validateFileURL('', { siblingData: { embedCode: RTS_SNIPPET } })).toBe(true)
  })

  it('rejects an empty fileUrl when no sibling field is set', () => {
    expect(validateFileURL('')).toBe('Please enter an audio URL, embed code, or audio file URL')
  })

  it('rejects a malformed URL', () => {
    expect(validateFileURL('not-a-url')).toBe('Please enter a valid URL format')
  })

  it('rejects a non-https scheme', () => {
    expect(validateFileURL('http://example.com/file.mp3')).toBe('Please enter a valid audio file URL (https only)')
    expect(validateFileURL('javascript:alert(1)')).toBe('Please enter a valid audio file URL (https only)')
    expect(validateFileURL('data:text/html,x')).toBe('Please enter a valid audio file URL (https only)')
  })

  it('rejects non-string values', () => {
    expect(validateFileURL(123)).toBe('Please enter a valid audio file URL')
  })

  it('rejects fileUrl set together with url, naming the conflicting field', () => {
    expect(validateFileURL(DROPBOX_URL, { siblingData: { url: SPOTIFY_URL } })).toBe('Clear the Audio URL field first')
  })

  it('rejects fileUrl set together with embedCode, naming the conflicting field', () => {
    expect(validateFileURL(DROPBOX_URL, { siblingData: { embedCode: RTS_SNIPPET } })).toBe(
      'Clear the Embed Code field first'
    )
  })

  it('rejects fileUrl set together with both other fields, naming both', () => {
    expect(validateFileURL(DROPBOX_URL, { siblingData: { url: SPOTIFY_URL, embedCode: RTS_SNIPPET } })).toBe(
      'Clear the Audio URL and Embed Code fields first'
    )
  })
})
