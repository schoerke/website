import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setPublishedDate } from './setPublishedDate'

type HookArgs = Parameters<typeof setPublishedDate>[0]

const makeArgs = (overrides: Partial<HookArgs>): HookArgs =>
  ({
    value: undefined,
    operation: 'update',
    siblingData: {},
    data: {},
    originalDoc: undefined,
    req: undefined,
    ...overrides,
  }) as HookArgs

describe('setPublishedDate', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-12T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes through a set value (create)', () => {
    expect(setPublishedDate(makeArgs({ value: '2026-09-01T00:00:00.000Z', operation: 'create' }))).toBe(
      '2026-09-01T00:00:00.000Z'
    )
  })

  it('uses an API-supplied createdAt on create when provided', () => {
    expect(
      setPublishedDate(
        makeArgs({
          value: undefined,
          operation: 'create',
          siblingData: { createdAt: '2026-09-05T00:00:00.000Z' },
        })
      )
    ).toBe('2026-09-05T00:00:00.000Z')
  })

  it('falls back to now on create when createdAt is absent', () => {
    expect(setPublishedDate(makeArgs({ value: undefined, operation: 'create' }))).toBe('2026-09-12T00:00:00.000Z')
  })

  it('resets to originalDoc.createdAt on explicit null (admin clear)', () => {
    expect(
      setPublishedDate(
        makeArgs({ value: null, operation: 'update', originalDoc: { createdAt: '2026-01-01T00:00:00.000Z' } })
      )
    ).toBe('2026-01-01T00:00:00.000Z')
  })

  it('no-ops when absent on update (partial save keeps stored value)', () => {
    expect(
      setPublishedDate(
        makeArgs({
          value: undefined,
          operation: 'update',
          siblingData: { title: 'changed' },
          originalDoc: { publishedDate: '2026-03-03T00:00:00.000Z' },
        })
      )
    ).toBeUndefined()
  })

  it('preserves the current backdate during version restore of a legacy version', () => {
    // Restore of a legacy version delivers value: null (its version_published_date column is NULL),
    // not undefined. The restore-preserve branch must win over the explicit-clear branch.
    expect(
      setPublishedDate(
        makeArgs({
          value: null,
          operation: 'update',
          req: { context: { isRestoringVersion: true } } as unknown as HookArgs['req'],
          originalDoc: { publishedDate: '2026-02-02T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' },
        })
      )
    ).toBe('2026-02-02T00:00:00.000Z')
  })

  it('falls back to createdAt on legacy-version restore when there is no current backdate', () => {
    expect(
      setPublishedDate(
        makeArgs({
          value: null,
          operation: 'update',
          req: { context: { isRestoringVersion: true } } as unknown as HookArgs['req'],
          originalDoc: { createdAt: '2026-01-01T00:00:00.000Z' },
        })
      )
    ).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns undefined on restore when the current doc has no publishedDate', () => {
    expect(
      setPublishedDate(
        makeArgs({
          value: undefined,
          operation: 'update',
          req: { context: { isRestoringVersion: true } } as unknown as HookArgs['req'],
          originalDoc: { createdAt: '2026-01-01T00:00:00.000Z' },
        })
      )
    ).toBeUndefined()
  })

  it('passes through a version that itself carries a publishedDate during restore', () => {
    expect(
      setPublishedDate(
        makeArgs({
          value: '2025-01-01T00:00:00.000Z',
          operation: 'update',
          req: { context: { isRestoringVersion: true } } as unknown as HookArgs['req'],
          originalDoc: { publishedDate: '2026-02-02T00:00:00.000Z' },
        })
      )
    ).toBe('2025-01-01T00:00:00.000Z')
  })
})
