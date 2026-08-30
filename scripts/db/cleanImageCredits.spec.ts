import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  applyManifest,
  buildEntries,
  createManifest,
  execute,
  isDirectExecution,
  parseArguments,
  validateManifest,
} from './cleanImageCredits'

function createPayload(images: Array<{ id: number; filename: string; credit: unknown }>) {
  return {
    find: vi.fn().mockResolvedValue({ docs: images }),
    findByID: vi.fn().mockImplementation(({ id }: { id: number }) => {
      const image = images.find((candidate) => candidate.id === id)
      if (!image) throw new Error('not found')
      return image
    }),
    update: vi.fn().mockResolvedValue({}),
  }
}

describe('cleanImageCredits', () => {
  it('accepts only manifest mode arguments', () => {
    expect(parseArguments(['--manifest', 'credits.json'])).toEqual({
      apply: false,
      manifestPath: 'credits.json',
    })
    expect(parseArguments(['--apply', '--manifest', 'credits.json'])).toEqual({
      apply: true,
      manifestPath: 'credits.json',
    })
    expect(() => parseArguments([])).toThrow('Usage:')
    expect(() => parseArguments(['--apply'])).toThrow('Usage:')
    expect(() => parseArguments(['--manifest', 'credits.json', '--extra'])).toThrow('Usage:')
  })

  it('only executes when module URL matches CLI entry path', () => {
    expect(
      isDirectExecution('/repo/scripts/db/cleanImageCredits.ts', 'file:///repo/scripts/db/cleanImageCredits.ts')
    ).toBe(true)
    expect(
      isDirectExecution('/repo/node_modules/vitest/vitest.mjs', 'file:///repo/scripts/db/cleanImageCredits.ts')
    ).toBe(false)
  })

  it('builds sorted cleanup entries only when normalization changes credit', () => {
    expect(
      buildEntries([
        { id: 8, filename: 'z.jpg', credit: '(c)   ' },
        { id: 2, filename: 'a.jpg', credit: '(C) Ada Lovelace' },
        { id: 6, filename: 'unchanged.jpg', credit: 'Grace Hopper' },
        { id: 4, filename: 'none.jpg', credit: null },
      ])
    ).toEqual([
      { id: 2, filename: 'a.jpg', oldCredit: '(C) Ada Lovelace', newCredit: 'Ada Lovelace' },
      { id: 8, filename: 'z.jpg', oldCredit: '(c)   ', newCredit: null },
    ])
  })

  it('creates and validates a digest over JSON serialized entries', () => {
    const entries = [{ id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' }]
    const manifest = createManifest(entries)

    expect(manifest).toEqual({
      entries,
      digest: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
    })
    expect(validateManifest(manifest)).toEqual(entries)
    expect(() => validateManifest({ ...manifest, digest: 'tampered' })).toThrow('digest')
  })

  it('rejects malformed manifest entries', () => {
    expect(() => validateManifest({ entries: [{}], digest: 'a' })).toThrow('Invalid manifest')
  })

  it('rejects validly hashed entries that are not ascending by numeric ID', () => {
    const entries = [
      { id: 8, filename: 'z.jpg', oldCredit: '(c) Zed', newCredit: 'Zed' },
      { id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' },
    ]

    expect(() => validateManifest(createManifest(entries))).toThrow('ascending')
  })

  it('rejects validly hashed arbitrary replacement credits', async () => {
    const getPayload = vi.fn()
    const manifest = createManifest([{ id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Eve' }])

    await expect(
      execute(['--apply', '--manifest', 'credits.json'], {
        databaseUri: '',
        nodeEnv: 'development',
        getPayload,
        readManifest: vi.fn().mockResolvedValue(JSON.stringify(manifest)),
        writeManifest: vi.fn(),
      })
    ).rejects.toThrow('normalization')
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('re-queries the exact eligible set before applying credit-only updates', async () => {
    const payload = createPayload([{ id: 2, filename: 'a.jpg', credit: '(c) Ada' }])
    const entries = [{ id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' }]

    await applyManifest(payload, entries)

    expect(payload.find).toHaveBeenCalledWith({
      collection: 'images',
      where: { credit: { exists: true } },
      depth: 0,
      pagination: false,
      limit: 0,
    })
    expect(payload.findByID).toHaveBeenCalledWith({ collection: 'images', id: 2, depth: 0 })
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'images',
      id: 2,
      data: { credit: 'Ada' },
      context: { skipRevalidation: true },
    })
  })

  it('aborts before updates when query results differ from manifest', async () => {
    const payload = createPayload([{ id: 2, filename: 'a.jpg', credit: '(c) Changed' }])
    const entries = [{ id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' }]

    await expect(applyManifest(payload, entries)).rejects.toThrow('changed since manifest')
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('stops when an image filename changes after manifest re-query', async () => {
    const payload = createPayload([{ id: 2, filename: 'a.jpg', credit: '(c) Ada' }])
    payload.findByID.mockResolvedValue({ id: 2, filename: 'renamed.jpg', credit: '(c) Ada' })
    const entries = [{ id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' }]

    await expect(applyManifest(payload, entries)).rejects.toThrow('filename changed')
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('validates every image before first update', async () => {
    const payload = createPayload([
      { id: 2, filename: 'a.jpg', credit: '(c) Ada' },
      { id: 4, filename: 'b.jpg', credit: '(c) Bea' },
    ])
    payload.findByID.mockImplementation(({ id }: { id: number }) =>
      id === 4 ? { id, filename: 'b.jpg', credit: '(c) Changed' } : { id, filename: 'a.jpg', credit: '(c) Ada' }
    )
    const entries = [
      { id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' },
      { id: 4, filename: 'b.jpg', oldCredit: '(c) Bea', newCredit: 'Bea' },
    ]

    await expect(applyManifest(payload, entries)).rejects.toThrow('credit changed')
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('checks production environment before Payload initialization', async () => {
    const getPayload = vi.fn()

    await expect(
      execute(['--manifest', 'credits.json'], {
        databaseUri: 'libsql://ksschoerke-production',
        nodeEnv: 'development',
        getPayload,
        readManifest: vi.fn(),
        writeManifest: vi.fn(),
      })
    ).rejects.toThrow('requires NODE_ENV=production')
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('rejects malformed apply manifest before Payload initialization', async () => {
    const getPayload = vi.fn()

    await expect(
      execute(['--apply', '--manifest', 'credits.json'], {
        databaseUri: '',
        nodeEnv: 'production',
        getPayload,
        readManifest: vi.fn().mockResolvedValue('{'),
        writeManifest: vi.fn(),
      })
    ).rejects.toThrow()
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('destroys initialized Payload once after dry-run success', async () => {
    const payload = { ...createPayload([{ id: 2, filename: 'a.jpg', credit: '(c) Ada' }]), db: { destroy: vi.fn() } }

    await execute(['--manifest', 'credits.json'], {
      databaseUri: '',
      nodeEnv: 'development',
      getPayload: vi.fn().mockResolvedValue(payload),
      readManifest: vi.fn(),
      writeManifest: vi.fn(),
    })

    expect(payload.db.destroy).toHaveBeenCalledTimes(1)
  })

  it('destroys initialized Payload once after apply failure', async () => {
    const payload = {
      ...createPayload([{ id: 2, filename: 'a.jpg', credit: '(c) Changed' }]),
      db: { destroy: vi.fn() },
    }
    const manifest = createManifest([{ id: 2, filename: 'a.jpg', oldCredit: '(c) Ada', newCredit: 'Ada' }])

    await expect(
      execute(['--apply', '--manifest', 'credits.json'], {
        databaseUri: '',
        nodeEnv: 'development',
        getPayload: vi.fn().mockResolvedValue(payload),
        readManifest: vi.fn().mockResolvedValue(JSON.stringify(manifest)),
        writeManifest: vi.fn(),
      })
    ).rejects.toThrow('changed since manifest')

    expect(payload.db.destroy).toHaveBeenCalledTimes(1)
  })
})
