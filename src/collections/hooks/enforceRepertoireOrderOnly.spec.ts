import type { Artist } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enforceRepertoireOrderOnly } from './enforceRepertoireOrderOnly'

type HookArgs = Parameters<CollectionBeforeChangeHook>[0]

const createMockArtist = (overrides?: Partial<Artist>): Artist =>
  ({
    id: 456,
    name: 'Test Artist',
    slug: 'test-artist',
    instrument: [],
    repertoire: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as Artist

describe('enforceRepertoireOrderOnly hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow reordering repertoire (same set of IDs)', async () => {
    const originalDoc = createMockArtist({ repertoire: [10, 20, 30] })
    const data = createMockArtist({ repertoire: [30, 10, 20] })

    const result = await enforceRepertoireOrderOnly({
      data,
      originalDoc,
      operation: 'update',
      context: {},
      req: {} as unknown as HookArgs['req'],
    } as unknown as HookArgs)

    expect(result).toEqual(data)
  })

  it('should block removing a repertoire doc from the artist list', async () => {
    const originalDoc = createMockArtist({ repertoire: [10, 20, 30] })
    const data = createMockArtist({ repertoire: [10, 20] })

    await expect(
      enforceRepertoireOrderOnly({
        data,
        originalDoc,
        operation: 'update',
        context: {},
        req: {} as unknown as HookArgs['req'],
      } as unknown as HookArgs)
    ).rejects.toThrow(
      'Repertoire lists are managed on the Repertoire document. Link or unlink artists there, then reorder the list here.'
    )
  })

  it('should block adding a repertoire doc from the artist list', async () => {
    const originalDoc = createMockArtist({ repertoire: [10, 20] })
    const data = createMockArtist({ repertoire: [10, 20, 30] })

    await expect(
      enforceRepertoireOrderOnly({
        data,
        originalDoc,
        operation: 'update',
        context: {},
        req: {} as unknown as HookArgs['req'],
      } as unknown as HookArgs)
    ).rejects.toThrow(
      'Repertoire lists are managed on the Repertoire document. Link or unlink artists there, then reorder the list here.'
    )
  })

  it('should allow updates when context.syncingRepertoire is set (our sync hooks)', async () => {
    const originalDoc = createMockArtist({ repertoire: [10, 20, 30] })
    const data = createMockArtist({ repertoire: [10, 20] }) // removal, normally blocked

    const result = await enforceRepertoireOrderOnly({
      data,
      originalDoc,
      operation: 'update',
      context: { syncingRepertoire: true },
      req: {} as unknown as HookArgs['req'],
    } as unknown as HookArgs)

    expect(result).toEqual(data)
  })

  it('should allow create operations', async () => {
    const data = createMockArtist({ repertoire: [10, 20] })

    const result = await enforceRepertoireOrderOnly({
      data,
      operation: 'create',
      context: {},
      req: {} as unknown as HookArgs['req'],
    } as unknown as HookArgs)

    expect(result).toEqual(data)
  })

  it('should allow update with no originalDoc (should not happen but be safe)', async () => {
    const data = createMockArtist({ repertoire: [10, 20] })

    const result = await enforceRepertoireOrderOnly({
      data,
      operation: 'update',
      context: {},
      req: {} as unknown as HookArgs['req'],
    } as unknown as HookArgs)

    expect(result).toEqual(data)
  })

  it('should handle null repertoire in originalDoc', async () => {
    const originalDoc = createMockArtist({ repertoire: null as unknown as number[] })
    const data = createMockArtist({ repertoire: [10] })

    await expect(
      enforceRepertoireOrderOnly({
        data,
        originalDoc,
        operation: 'update',
        context: {},
        req: {} as unknown as HookArgs['req'],
      } as unknown as HookArgs)
    ).rejects.toThrow()
  })

  it('should handle populated object values in originalDoc', async () => {
    const populated = [
      { id: 10, title: 'Solo', content: {} },
      { id: 20, title: 'Chamber', content: {} },
    ] as unknown as number[]
    const originalDoc = createMockArtist({ repertoire: populated })
    const data = createMockArtist({ repertoire: [20, 10] }) // reorder of populated objects

    const result = await enforceRepertoireOrderOnly({
      data,
      originalDoc,
      operation: 'update',
      context: {},
      req: {} as unknown as HookArgs['req'],
    } as unknown as HookArgs)

    expect(result).toEqual(data)
  })
})
