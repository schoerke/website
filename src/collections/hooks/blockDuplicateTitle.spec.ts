import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { blockDuplicateTitle } from './blockDuplicateTitle'

const createMockRequest = (
  findResult: { totalDocs: number; docs: { id: number; _status?: string }[] },
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

const baseData = { title: 'Mein Konzert' }

describe('blockDuplicateTitle', () => {
  it('throws APIError when another post holds the same title (create)', async () => {
    const req = createMockRequest({ totalDocs: 1, docs: [{ id: 12 }] }, 'en')
    await expect(
      blockDuplicateTitle({ data: baseData, originalDoc: undefined, req, operation: 'create' } as never)
    ).rejects.toThrow('This title is already being used')
  })

  it('throws German message when req.locale is de', async () => {
    const req = createMockRequest({ totalDocs: 1, docs: [{ id: 12 }] }, 'de')
    await expect(
      blockDuplicateTitle({ data: baseData, originalDoc: undefined, req, operation: 'create' } as never)
    ).rejects.toThrow('Dieser Titel wird bereits verwendet')
  })

  it('throws on update when title changed to an existing one', async () => {
    const req = createMockRequest({ totalDocs: 1, docs: [{ id: 12 }] }, 'en')
    await expect(
      blockDuplicateTitle({
        data: { title: 'Konzert 2026' },
        originalDoc: { id: 5, title: 'Alter Titel' },
        req,
        operation: 'update',
      } as never)
    ).rejects.toThrow('This title is already being used')
  })

  it('throws when the matching doc is a draft-status row', async () => {
    const req = createMockRequest({ totalDocs: 1, docs: [{ id: 12, _status: 'draft' }] }, 'en')
    await expect(
      blockDuplicateTitle({ data: baseData, originalDoc: undefined, req, operation: 'create' } as never)
    ).rejects.toThrow('This title is already being used')
  })

  it('skips the query when title is unchanged on update (string originalDoc.title)', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const result = await blockDuplicateTitle({
      data: { title: 'Unverändert' },
      originalDoc: { id: 5, title: 'Unverändert' },
      req,
      operation: 'update',
    } as never)
    expect(result).toEqual({ title: 'Unverändert' })
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('skips the query when title is unchanged on update (localized originalDoc.title object)', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] }, 'de')
    const result = await blockDuplicateTitle({
      data: { title: 'Unverändert' },
      originalDoc: { id: 5, title: { de: 'Unverändert', en: 'Unchanged' } },
      req,
      operation: 'update',
    } as never)
    expect(result).toEqual({ title: 'Unverändert' })
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('does not query when title is missing, empty, or whitespace-only', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const r1 = await blockDuplicateTitle({ data: {}, originalDoc: undefined, req, operation: 'create' } as never)
    expect(r1).toEqual({})
    const r2 = await blockDuplicateTitle({ data: { title: '   ' }, originalDoc: undefined, req, operation: 'create' } as never)
    expect(r2).toEqual({ title: '   ' })
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('queries with normalized title (diacritic-insensitive)', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    await blockDuplicateTitle({ data: { title: 'Müller' }, originalDoc: undefined, req, operation: 'create' } as never)
    const findMock = req.payload.find as ReturnType<typeof vi.fn>
    const args = findMock.mock.calls[0][0] as { where: { and: unknown[] } }
    const firstClause = args.where.and[0] as Record<string, unknown>
    expect(firstClause).toEqual({ normalizedTitle: { equals: 'muller' } })
  })

  it('scopes the query to the active locale', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] }, 'en')
    await blockDuplicateTitle({ data: baseData, originalDoc: undefined, req, operation: 'create' } as never)
    const findMock = req.payload.find as ReturnType<typeof vi.fn>
    const args = findMock.mock.calls[0][0] as { locale: string }
    expect(args.locale).toBe('en')
  })

  it('excludes the current doc from the collision query via id not_equals', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const result = await blockDuplicateTitle({
      data: { title: 'Neuer Titel' },
      originalDoc: { id: 5, title: 'Alter Titel' },
      req,
      operation: 'update',
    } as never)
    expect(result).toEqual({ title: 'Neuer Titel' })
    const findMock = req.payload.find as ReturnType<typeof vi.fn>
    const args = findMock.mock.calls[0][0] as { where: { and: unknown[] } }
    expect(args.where.and).toContainEqual({ id: { not_equals: 5 } })
  })

  it('passes when no other post uses the title', async () => {
    const req = createMockRequest({ totalDocs: 0, docs: [] })
    const result = await blockDuplicateTitle({
      data: baseData,
      originalDoc: undefined,
      req,
      operation: 'create',
    } as never)
    expect(result).toEqual(baseData)
  })

  it('falls through (no throw) when the payload query fails', async () => {
    const req = {
      payload: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        find: vi.fn().mockRejectedValue(new Error('db down')),
      },
      locale: 'de',
    } as unknown as PayloadRequest
    const result = await blockDuplicateTitle({
      data: baseData,
      originalDoc: undefined,
      req,
      operation: 'create',
    } as never)
    expect(result).toEqual(baseData)
  })
})