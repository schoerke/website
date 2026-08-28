import { describe, expect, it, vi } from 'vitest'

import { down, up } from './20260828_210415_add_artist_quote_source'

function migrationArgs(run: ReturnType<typeof vi.fn>): Parameters<typeof up>[0] {
  return { db: { run } } as unknown as Parameters<typeof up>[0]
}

describe('20260828_210415_add_artist_quote_source', () => {
  it('does not add the column when it already exists', async () => {
    const run = vi.fn().mockResolvedValue({ rows: [{ c: 1 }] })

    await up(migrationArgs(run))

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('adds the column when it does not exist', async () => {
    const run = vi.fn().mockResolvedValueOnce({ rows: [{ c: 0 }] }).mockResolvedValueOnce({ rows: [] })

    await up(migrationArgs(run))

    expect(run).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(run.mock.calls[1][0])).toContain('ALTER TABLE artists_locales ADD COLUMN quote_source text')
  })

  it('does not drop the column when it is absent', async () => {
    const run = vi.fn().mockResolvedValue({ rows: [{ c: 0 }] })

    await down(migrationArgs(run))

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('drops the column when it exists', async () => {
    const run = vi.fn().mockResolvedValueOnce({ rows: [{ c: 1 }] }).mockResolvedValueOnce({ rows: [] })

    await down(migrationArgs(run))

    expect(run).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(run.mock.calls[1][0])).toContain('ALTER TABLE artists_locales DROP COLUMN quote_source')
  })
})
