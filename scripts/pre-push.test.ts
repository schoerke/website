// @vitest-environment node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runAll } from './pre-push'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
  spawnSync: vi.fn(),
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, existsSync: vi.fn(), readFileSync: vi.fn() }
})

const mockExec = vi.mocked(execFileSync)
const mockSpawn = vi.mocked(spawnSync)
const mockExists = vi.mocked(existsSync)

const REF_LINE =
  'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'

beforeEach(() => {
  vi.resetAllMocks()
  mockExec.mockImplementation((cmd, args) => {
    if (args?.[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    if (args?.[0] === 'rev-list') return '3'
    return ''
  })
})

describe('runAll', () => {
  it('runs lint, typecheck, then tests in order on success', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 1, stdout: '', stderr: '' } as never
      if (cmd === 'pnpm') return { status: 0 } as never
      return { status: 0 } as never
    })
    mockExists.mockReturnValue(false)
    const code = runAll(REF_LINE)
    expect(code).toBe(0)
    const pnpmCalls = mockSpawn.mock.calls.filter(([cmd]) => cmd === 'pnpm')
    expect(pnpmCalls.map(([, args]) => args)).toEqual([['lint'], ['typecheck'], ['test']])
  })

  it('skips the secret scan with a warning when gitleaks is missing', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 1, stdout: '', stderr: '' } as never
      if (cmd === 'pnpm') return { status: 0 } as never
      return { status: 0 } as never
    })
    mockExists.mockReturnValue(false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(runAll(REF_LINE)).toBe(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gitleaks not installed'))
    warn.mockRestore()
  })

  it('blocks the push when the secret scan finds a leak and skips lint', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 1, stdout: '', stderr: 'Leak found\n' } as never
      return { status: 0 } as never
    })
    const code = runAll(REF_LINE)
    expect(code).toBe(1)
    expect(mockSpawn.mock.calls.some(([cmd]) => cmd === 'pnpm')).toBe(false)
  })

  it('runs the secret scan only for refs with new commits', () => {
    mockExec.mockImplementation((cmd, args) => {
      if (args?.[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      if (args?.[0] === 'rev-list') return '0'
      return ''
    })
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'pnpm') return { status: 0 } as never
      return { status: 0 } as never
    })
    expect(runAll(REF_LINE)).toBe(0)
    expect(mockSpawn.mock.calls.some(([cmd]) => cmd === 'gitleaks')).toBe(false)
  })

  it('returns the failing check exit code and stops', () => {
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 1, stdout: '', stderr: '' } as never
      if (cmd === 'pnpm' && args?.[0] === 'lint') return { status: 2 } as never
      return { status: 0 } as never
    })
    mockExists.mockReturnValue(false)
    const code = runAll(REF_LINE)
    expect(code).toBe(2)
    const pnpmCalls = mockSpawn.mock.calls.filter(([cmd]) => cmd === 'pnpm')
    expect(pnpmCalls).toHaveLength(1)
  })
})
