import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateImageOnChange, revalidateImageOnDelete } from './revalidateImage'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook>[0]

const createMockDoc = (overrides = {}) => ({
  id: 1,
  alt: 'Test Image',
  filename: 'test.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockReq = (context = {}) =>
  ({
    context,
    payload: {},
  }) as unknown as ChangeHookArgs['req']

describe('revalidateImage hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateImageOnChange', () => {
    it('purges the localized frontend layout (all pages beneath)', () => {
      const doc = createMockDoc()
      revalidateImageOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]', 'layout')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateImageOnChange({ doc, req: createMockReq({ skipRevalidation: true }) } as ChangeHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateImageOnChange({ doc, req: createMockReq() } as ChangeHookArgs)
      expect(result).toBe(doc)
    })
  })

  describe('revalidateImageOnDelete', () => {
    it('purges the localized frontend layout on delete', () => {
      const doc = createMockDoc()
      revalidateImageOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]', 'layout')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })

    it('skips revalidation on delete when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateImageOnDelete({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as unknown as DeleteHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateImageOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)
      expect(result).toBe(doc)
    })
  })
})
