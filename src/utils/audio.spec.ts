import { describe, expect, it } from 'vitest'
import { normalizeAudioFileUrl } from './audio'

describe('normalizeAudioFileUrl', () => {
  it('converts a legacy dl=0 Dropbox link to dl=1', () => {
    expect(normalizeAudioFileUrl('https://www.dropbox.com/s/abc123/recording.mp3?dl=0')).toBe(
      'https://www.dropbox.com/s/abc123/recording.mp3?dl=1'
    )
  })

  it('preserves other query params on the new /scl/fi/ share format', () => {
    expect(normalizeAudioFileUrl('https://www.dropbox.com/scl/fi/abc/recording.mp3?rlkey=xyz&dl=0')).toBe(
      'https://www.dropbox.com/scl/fi/abc/recording.mp3?rlkey=xyz&dl=1'
    )
  })

  it('appends dl=1 when there is no query string at all', () => {
    expect(normalizeAudioFileUrl('https://www.dropbox.com/s/abc123/recording.mp3')).toBe(
      'https://www.dropbox.com/s/abc123/recording.mp3?dl=1'
    )
  })

  it('matches the bare dropbox.com host (no www)', () => {
    expect(normalizeAudioFileUrl('https://dropbox.com/s/abc123/recording.mp3?dl=0')).toBe(
      'https://dropbox.com/s/abc123/recording.mp3?dl=1'
    )
  })

  it('leaves an already-direct dl.dropboxusercontent.com link unchanged', () => {
    const direct = 'https://dl.dropboxusercontent.com/s/abc123/recording.mp3'
    expect(normalizeAudioFileUrl(direct)).toBe(direct)
  })

  it('leaves a non-Dropbox URL unchanged', () => {
    const external = 'https://example.com/audio/recording.mp3'
    expect(normalizeAudioFileUrl(external)).toBe(external)
  })

  it('returns malformed input unchanged rather than throwing', () => {
    expect(normalizeAudioFileUrl('not a url')).toBe('not a url')
  })
})
