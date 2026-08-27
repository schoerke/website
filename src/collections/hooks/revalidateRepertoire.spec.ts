import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateRepertoireOnChange, revalidateRepertoireOnDelete } from './revalidateRepertoire'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook>[0]

const createMockDoc = (overrides = {}) => ({
  id: 1,
  title: 'Test Repertoire',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockReq = (context = {}) =>
  ({
    context,
    payload: {},
  }) as unknown as ChangeHookArgs['req']

describe('revalidateRepertoire hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateRepertoireOnChange', () => {
    it('purges the artists subtree on change', () => {
      const doc = createMockDoc()
      revalidateRepertoireOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateRepertoireOnChange({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as ChangeHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateRepertoireOnChange({ doc, req: createMockReq() } as ChangeHookArgs)
      expect(result).toBe(doc)
    })
  })

  describe('revalidateRepertoireOnDelete', () => {
    it('purges the artists subtree on delete', () => {
      const doc = createMockDoc()
      revalidateRepertoireOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateRepertoireOnDelete({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as unknown as DeleteHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateRepertoireOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)
      expect(result).toBe(doc)
    })
  })
})
