// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { enable, disable } = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('next/headers', () => ({
  draftMode: vi.fn().mockResolvedValue({ isEnabled: false, enable, disable }),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

vi.mock('payload', () => ({ getPayload: vi.fn() }))

vi.mock('@/payload.config', () => ({ default: {} }))

import { GET } from './route'

const makeReq = (params = '') => ({ url: `https://example.com/api/preview?${params}` }) as unknown as Request

describe('GET /api/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when previewSecret is missing', async () => {
    const res = await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo'))
    expect(res.status).toBe(403)
  })

  it('returns 403 when previewSecret is wrong', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo&previewSecret=wrong'))
    expect(res.status).toBe(403)
  })

  it('returns 400 when path is missing', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('previewSecret=secret-123'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for protocol-relative path', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('path=%2F%2Fevil.com&previewSecret=secret-123'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for backslash path bypass', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('path=%2F%5Cevil.com&previewSecret=secret-123'))
    expect(res.status).toBe(400)
  })

  it('calls disable and returns 403 when session is unauthenticated', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue({ auth: vi.fn().mockResolvedValue(null) } as never)

    const res = await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo&previewSecret=secret-123'))

    expect(res.status).toBe(403)
    expect(disable).toHaveBeenCalled()
  })

  it('enables draft mode and redirects when authenticated', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue({ auth: vi.fn().mockResolvedValue({ id: 1 }) } as never)

    const { redirect } = await import('next/navigation')

    await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo&previewSecret=secret-123'))

    expect(enable).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/de/preview/foo')
  })
})
