import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateRecordingOnChange, revalidateRecordingOnDelete } from './revalidateRecording'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook>[0]

const createMockDoc = (overrides = {}) => ({
  id: 1,
  title: 'Test Recording',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockReq = (context = {}) =>
  ({
    context,
    payload: {},
  }) as unknown as ChangeHookArgs['req']

describe('revalidateRecording hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateRecordingOnChange', () => {
    it('purges the artists subtree on change', () => {
      const doc = createMockDoc()
      revalidateRecordingOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateRecordingOnChange({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as ChangeHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateRecordingOnChange({ doc, req: createMockReq() } as ChangeHookArgs)
      expect(result).toBe(doc)
    })
  })

  describe('revalidateRecordingOnDelete', () => {
    it('purges the artists subtree on delete', () => {
      const doc = createMockDoc()
      revalidateRecordingOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateRecordingOnDelete({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as unknown as DeleteHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateRecordingOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)
      expect(result).toBe(doc)
    })
  })
})
