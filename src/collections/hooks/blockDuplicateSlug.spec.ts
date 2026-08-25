import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { blockDuplicateSlug } from './blockDuplicateSlug'

const createMockRequest = (
  findResult: { totalDocs: number; docs: { id: number }[] },
  locale = 'de'
): PayloadRequest => {
  return {
    payload: {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      find: vi.fn().mockResolvedValue(findResult),
    },
    locale,
  } as unknown as PayloadRequest
}

const baseData = { slug: 'mein-slug' }

describe('blockDuplicateSlug', () => {
  it('throws APIError when another post holds the slug (create)', async () => {
    const req = createMockRequest({ totalDocs: 1, docs: [{ id: 12 }] })
    await expect(
      blockDuplicateSlug({ data: baseData, originalDoc: undefined, req, operation: 'create' } as never)
    ).rejects.toThrow('This slug is already being used')
  })

  it('throws APIError when another post holds the slug (update)', async () => {
    const req = createMockRequest({ totalDocs: 1, docs: [{ id: 12 }] })
    await expect(
      blockDuplicateSlug({
        data: { slug: 'christian-poltera' },
        originalDoc: { id: 5, slug: 'alter-slug' },
        req,
        operation: 'update',
      } as never)
    ).rejects.toThrow('This slug is already being used')
  })

  it('passes when the slug belongs to the current doc only (self-collision)', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const result = await blockDuplicateSlug({
      data: { slug: 'eigener-slug' },
      originalDoc: { id: 5, slug: 'eigener-slug' },
      req,
      operation: 'update',
    } as never)
    expect(result).toEqual({ slug: 'eigener-slug' })
  })

  it('passes when no other post uses the slug', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const result = await blockDuplicateSlug({
      data: baseData,
      originalDoc: undefined,
      req,
      operation: 'create',
    } as never)
    expect(result).toEqual(baseData)
  })

  it('passes through when slug is missing or not a string', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const r1 = await blockDuplicateSlug({ data: {}, originalDoc: undefined, req, operation: 'create' } as never)
    expect(r1).toEqual({})
    const r2 = await blockDuplicateSlug({
      data: { slug: 123 },
      originalDoc: undefined,
      req,
      operation: 'create',
    } as never)
    expect(r2).toEqual({ slug: 123 })
  })

  it('skips the query when the slug is unchanged on update', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const result = await blockDuplicateSlug({
      data: { slug: 'unverändert' },
      originalDoc: { id: 5, slug: 'unverändert' },
      req,
      operation: 'update',
    } as never)
    expect(result).toEqual({ slug: 'unverändert' })
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('falls through (no throw) when the payload query fails', async () => {
    const req = {
      payload: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        find: vi.fn().mockRejectedValue(new Error('db down')),
      },
      locale: 'de',
    } as unknown as PayloadRequest
    const result = await blockDuplicateSlug({
      data: baseData,
      originalDoc: undefined,
      req,
      operation: 'create',
    } as never)
    expect(result).toEqual(baseData)
  })
})
