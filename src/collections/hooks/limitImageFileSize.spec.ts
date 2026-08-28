import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'
import { describe, expect, it } from 'vitest'
import { limitImageFileSize, MAX_IMAGE_FILE_SIZE } from './limitImageFileSize'

type HookArgs = Parameters<CollectionBeforeChangeHook>[0]

const runHook = (data: Record<string, unknown>, req?: unknown) => limitImageFileSize({ data, req } as HookArgs)

describe('limitImageFileSize', () => {
  it('allows files at or below the 15MB cap', () => {
    expect(runHook({ filesize: MAX_IMAGE_FILE_SIZE })).toEqual({ filesize: MAX_IMAGE_FILE_SIZE })
    expect(runHook({ filesize: 1 })).toEqual({ filesize: 1 })
  })

  it('rejects files above the 15MB cap via declared size', () => {
    const oversized = MAX_IMAGE_FILE_SIZE + 1
    const req = { file: { data: Buffer.alloc(1024), name: 'big.jpg' } }
    expect(() => runHook({ filesize: oversized }, req)).toThrow('15 MB limit')
  })

  it('rejects when actual bytes exceed cap despite a small declared size', () => {
    const req = { file: { data: Buffer.alloc(MAX_IMAGE_FILE_SIZE + 1), name: 'huge.jpg' } }
    expect(() => runHook({ filesize: 1024 }, req)).toThrow('15 MB limit')
  })

  it('rejects when declared size exceeds cap even if actual bytes are small', () => {
    const req = { file: { data: Buffer.alloc(1024), name: 'small.jpg' } }
    expect(() => runHook({ filesize: MAX_IMAGE_FILE_SIZE + 1 }, req)).toThrow('15 MB limit')
  })

  it('allows a metadata-only update of a pre-existing oversized image', () => {
    // No req.file → no new file being uploaded. The stale declared filesize
    // (from an image uploaded before the 15MB hook shipped) must not reject.
    expect(runHook({ filesize: MAX_IMAGE_FILE_SIZE + 1 })).toEqual({
      filesize: MAX_IMAGE_FILE_SIZE + 1,
    })
  })

  it('throws a public APIError with status 400', () => {
    try {
      const req = { file: { data: Buffer.alloc(1024), name: 'big.jpg' } }
      runHook({ filesize: MAX_IMAGE_FILE_SIZE + 1 }, req)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(APIError)
      const apiError = err as APIError
      expect(apiError.status).toBe(400)
      expect(apiError.isPublic).toBe(true)
    }
  })

  it('allows documents without a filesize', () => {
    expect(runHook({})).toEqual({})
    expect(runHook({ filesize: null })).toEqual({ filesize: null })
  })
})
