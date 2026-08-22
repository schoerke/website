// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { generatePostPreviewPath } from './url'

const baseReq = { locale: 'en' } as never

describe('generatePostPreviewPath', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com'
    process.env.PREVIEW_SECRET = 'secret-123'
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('builds a /api/preview URL with encoded slug and locale', () => {
    const url = generatePostPreviewPath({ data: { slug: 'hello world' }, req: baseReq, collection: 'posts' })

    expect(url).toBe(
      'https://example.com/api/preview?path=%2Fen%2Fpreview%2Fhello%20world&previewSecret=secret-123&collection=posts'
    )
  })

  it('uses de when req.locale is missing', () => {
    const url = generatePostPreviewPath({ data: { slug: 'foo' }, req: {} as never, collection: 'posts' })

    expect(url).toContain('path=%2Fde%2Fpreview%2Ffoo')
  })

  it('returns undefined when data has no slug', () => {
    const url = generatePostPreviewPath({ data: {} as never, req: baseReq, collection: 'posts' })

    expect(url).toBeUndefined()
  })
})
