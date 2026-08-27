import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateDocumentOnChange, revalidateDocumentOnDelete } from './revalidateDocument'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook>[0]

const createMockDoc = (overrides = {}) => ({
  id: 1,
  title: 'Bio PDF',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockReq = (context = {}) =>
  ({
    context,
    payload: {},
  }) as unknown as ChangeHookArgs['req']

describe('revalidateDocument hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateDocumentOnChange', () => {
    it('purges the artists subtree on change', () => {
      const doc = createMockDoc()
      revalidateDocumentOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateDocumentOnChange({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as ChangeHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateDocumentOnChange({ doc, req: createMockReq() } as ChangeHookArgs)
      expect(result).toBe(doc)
    })
  })

  describe('revalidateDocumentOnDelete', () => {
    it('purges the artists subtree on delete', () => {
      const doc = createMockDoc()
      revalidateDocumentOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateDocumentOnDelete({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as unknown as DeleteHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateDocumentOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)
      expect(result).toBe(doc)
    })
  })
})
