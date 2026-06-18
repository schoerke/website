import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateArtistOnChange, revalidateArtistOnDelete } from './revalidateArtist'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook>[0]

const createMockDoc = (overrides = {}) => ({
  id: 1,
  name: 'Test Artist',
  slug: 'test-artist',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockReq = (context = {}) =>
  ({
    context,
    payload: {},
  }) as unknown as ChangeHookArgs['req']

describe('revalidateArtist hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateArtistOnChange', () => {
    it('revalidates artists list and homepage for all locales', () => {
      const doc = createMockDoc({ slug: 'test-artist' })
      revalidateArtistOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/de/artists')
      expect(revalidatePath).toHaveBeenCalledWith('/en/artists')
      expect(revalidatePath).toHaveBeenCalledWith('/de')
      expect(revalidatePath).toHaveBeenCalledWith('/en')
    })

    it('revalidates artist detail pages for both locales', () => {
      const doc = createMockDoc({ slug: 'anne-sophie-mutter' })
      revalidateArtistOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/de/artists/anne-sophie-mutter')
      expect(revalidatePath).toHaveBeenCalledWith('/en/artists/anne-sophie-mutter')
    })

    it('skips detail revalidation when slug is missing', () => {
      const doc = createMockDoc({ slug: undefined })
      revalidateArtistOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      // List + home pages still revalidated, but no detail pages
      expect(revalidatePath).toHaveBeenCalledWith('/de/artists')
      expect(revalidatePath).toHaveBeenCalledWith('/en/artists')
      const calls = vi.mocked(revalidatePath).mock.calls.map(([p]) => p)
      expect(calls.some((p) => p.includes('/artists/'))).toBe(false)
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateArtistOnChange({ doc, req: createMockReq({ skipRevalidation: true }) } as ChangeHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateArtistOnChange({ doc, req: createMockReq() } as ChangeHookArgs)
      expect(result).toBe(doc)
    })
  })

  describe('revalidateArtistOnDelete', () => {
    it('revalidates artists list, homepage, and detail for both locales', () => {
      const doc = createMockDoc({ slug: 'test-artist' })
      revalidateArtistOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/de/artists')
      expect(revalidatePath).toHaveBeenCalledWith('/en/artists')
      expect(revalidatePath).toHaveBeenCalledWith('/de')
      expect(revalidatePath).toHaveBeenCalledWith('/en')
      expect(revalidatePath).toHaveBeenCalledWith('/de/artists/test-artist')
      expect(revalidatePath).toHaveBeenCalledWith('/en/artists/test-artist')
    })

    it('skips detail revalidation when slug is missing', () => {
      const doc = createMockDoc({ slug: null })
      revalidateArtistOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      const calls = vi.mocked(revalidatePath).mock.calls.map(([p]) => p)
      expect(calls.some((p) => p.includes('/artists/'))).toBe(false)
    })

    it('skips revalidation on delete when skipRevalidation context flag is set', () => {
      const doc = createMockDoc({ slug: 'test-artist' })
      revalidateArtistOnDelete({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as unknown as DeleteHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateArtistOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)
      expect(result).toBe(doc)
    })
  })
})
