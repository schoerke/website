import { describe, expect, it } from 'vitest'
import { getAspectRatioPadding, getVideoEmbedData } from './videoEmbed'

describe('getVideoEmbedData', () => {
  describe('YouTube URLs', () => {
    it('extracts ID from standard watch URL', () => {
      expect(getVideoEmbedData('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      })
    })

    it('extracts ID from youtu.be short URL', () => {
      const data = getVideoEmbedData('https://youtu.be/jNQXAC9IVRw')
      expect(data?.platform).toBe('youtube')
      expect(data?.videoId).toBe('jNQXAC9IVRw')
    })

    it('extracts ID from live URL ignoring share params', () => {
      expect(getVideoEmbedData('https://www.youtube.com/live/S3ozsKGx864?si=rXYcx6VPNwbLIxx3')).toEqual({
        platform: 'youtube',
        videoId: 'S3ozsKGx864',
        embedUrl: 'https://www.youtube-nocookie.com/embed/S3ozsKGx864',
      })
    })

    it('extracts ID from embed URL', () => {
      const data = getVideoEmbedData('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(data?.videoId).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from shorts URL', () => {
      const data = getVideoEmbedData('https://www.youtube.com/shorts/dQw4w9WgXcQ')
      expect(data?.videoId).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from live URL with trailing slash', () => {
      const data = getVideoEmbedData('https://www.youtube.com/live/S3ozsKGx864/')
      expect(data?.videoId).toBe('S3ozsKGx864')
    })

    it('extracts ID from mobile (m.youtube.com) URL', () => {
      const data = getVideoEmbedData('https://m.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(data?.videoId).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from music.youtube.com URL', () => {
      const data = getVideoEmbedData('https://music.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(data?.videoId).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID with hyphens from live URL', () => {
      const data = getVideoEmbedData('https://www.youtube.com/live/aB3-De_5XyZ')
      expect(data?.videoId).toBe('aB3-De_5XyZ')
    })

    it('prefers ?v= query param over path format', () => {
      const data = getVideoEmbedData('https://www.youtube.com/live/S3ozsKGx864?v=dQw4w9WgXcQ')
      expect(data?.videoId).toBe('dQw4w9WgXcQ')
    })

    it('rejects when ?v= is present but invalid (no path fallback)', () => {
      expect(getVideoEmbedData('https://www.youtube.com/live/S3ozsKGx864?v=toolongvideoid')).toBeNull()
    })

    it('rejects live path with extra segments after the ID', () => {
      expect(getVideoEmbedData('https://www.youtube.com/live/S3ozsKGx864/stats')).toBeNull()
    })

    it('rejects live path with ID over 11 characters (no truncation)', () => {
      expect(getVideoEmbedData('https://www.youtube.com/live/1234567890123')).toBeNull()
    })

    it('rejects /watch/ID path format', () => {
      expect(getVideoEmbedData('https://www.youtube.com/watch/S3ozsKGx864')).toBeNull()
    })

    it('rejects youtube lookalike hostnames', () => {
      expect(getVideoEmbedData('https://notyoutube.com/live/S3ozsKGx864')).toBeNull()
      expect(getVideoEmbedData('https://youtube.com.evil.io/live/S3ozsKGx864')).toBeNull()
    })
  })

  describe('arte.tv URLs', () => {
    it('extracts arte ID and locale from URL', () => {
      const data = getVideoEmbedData('https://www.arte.tv/de/videos/129940-002-A/jose-gonzalez/')
      expect(data?.platform).toBe('arte')
      expect(data?.videoId).toBe('129940-002-A')
      expect(data?.embedUrl).toContain('config%2Fde%2F129940-002-A')
    })

    it('respects locale override', () => {
      const data = getVideoEmbedData('https://www.arte.tv/de/videos/129940-002-A/jose-gonzalez/', 'en')
      expect(data?.embedUrl).toContain('config%2Fen%2F129940-002-A')
    })
  })

  describe('invalid URLs', () => {
    it('returns null for unsupported platforms', () => {
      expect(getVideoEmbedData('https://vimeo.com/1234')).toBeNull()
    })

    it('returns null for youtube URLs without an ID', () => {
      expect(getVideoEmbedData('https://www.youtube.com/watch')).toBeNull()
      expect(getVideoEmbedData('https://www.youtube.com/live/')).toBeNull()
    })

    it('returns null for malformed URLs', () => {
      expect(getVideoEmbedData('not-a-url')).toBeNull()
    })
  })
})

describe('getAspectRatioPadding', () => {
  it('computes padding for 16:9', () => {
    expect(getAspectRatioPadding('16:9')).toBe(56.25)
  })

  it('computes padding for 4:3', () => {
    expect(getAspectRatioPadding('4:3')).toBe(75)
  })

  it('defaults to 16:9 for invalid ratios', () => {
    expect(getAspectRatioPadding('bogus')).toBe(56.25)
  })
})
