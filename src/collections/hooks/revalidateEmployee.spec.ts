import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateEmployeeOnChange, revalidateEmployeeOnDelete } from './revalidateEmployee'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook>[0]

const CONTACT_PAGES = ['/de/contact', '/en/contact', '/de/kontakt', '/en/kontakt']

const createMockDoc = (overrides = {}) => ({
  id: 1,
  name: 'Test Employee',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const createMockReq = (context = {}) =>
  ({
    context,
    payload: {},
  }) as unknown as ChangeHookArgs['req']

describe('revalidateEmployee hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateEmployeeOnChange', () => {
    it('revalidates all contact pages on change', () => {
      const doc = createMockDoc()
      revalidateEmployeeOnChange({ doc, req: createMockReq() } as ChangeHookArgs)

      expect(revalidatePath).toHaveBeenCalledTimes(4)
      for (const path of CONTACT_PAGES) {
        expect(revalidatePath).toHaveBeenCalledWith(path)
      }
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateEmployeeOnChange({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as ChangeHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateEmployeeOnChange({ doc, req: createMockReq() } as ChangeHookArgs)
      expect(result).toBe(doc)
    })
  })

  describe('revalidateEmployeeOnDelete', () => {
    it('revalidates all contact pages on delete', () => {
      const doc = createMockDoc()
      revalidateEmployeeOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)

      expect(revalidatePath).toHaveBeenCalledTimes(4)
      for (const path of CONTACT_PAGES) {
        expect(revalidatePath).toHaveBeenCalledWith(path)
      }
    })

    it('skips revalidation when skipRevalidation context flag is set', () => {
      const doc = createMockDoc()
      revalidateEmployeeOnDelete({
        doc,
        req: createMockReq({ skipRevalidation: true }),
      } as unknown as DeleteHookArgs)

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', () => {
      const doc = createMockDoc()
      const result = revalidateEmployeeOnDelete({ doc, req: createMockReq() } as unknown as DeleteHookArgs)
      expect(result).toBe(doc)
    })
  })
})
