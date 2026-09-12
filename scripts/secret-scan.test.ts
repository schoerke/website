// @vitest-environment node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildScanArgs,
  computePushRanges,
  gitleaksAvailable,
  main,
  parsePushRefs,
  runScan,
  scanPushedRefs,
  verifyRange,
} from './secret-scan'

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

beforeEach(() => {
  vi.resetAllMocks()
})

describe('parsePushRefs', () => {
  it('parses a single pushed ref', () => {
    const stdin =
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    const refs = parsePushRefs(stdin)
    expect(refs).toEqual([
      {
        localRef: 'refs/heads/main',
        localSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        remoteRef: 'refs/heads/main',
        remoteSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    ])
  })

  it('parses multiple refs and ignores blank lines', () => {
    const stdin = [
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      '',
      'refs/heads/feature cccccccccccccccccccccccccccccccccccccccc refs/heads/feature dddddddddddddddddddddddddddddddddddddddd',
      '',
    ].join('\n')
    const refs = parsePushRefs(stdin)
    expect(refs).toHaveLength(2)
  })

  it('skips deleted refs (all-zero local sha)', () => {
    const stdin =
      'refs/heads/old 0000000000000000000000000000000000000000 refs/heads/old eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\n'
    const refs = parsePushRefs(stdin)
    expect(refs).toEqual([])
  })

  it('throws on malformed lines', () => {
    expect(() => parsePushRefs('only-two-tokens\n')).toThrow(/Malformed pre-push ref line/)
  })
})

describe('computePushRanges', () => {
  it('computes base..head for a normal push via merge-base', () => {
    mockExec.mockReturnValue('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
    const refs = parsePushRefs(
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    )
    const ranges = computePushRanges(refs)
    expect(ranges).toEqual([
      {
        ref: refs[0],
        logOpts: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb..aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    ])
  })

  it('uses --not --remotes for a new branch (zero remote sha)', () => {
    const refs = parsePushRefs(
      'refs/heads/new aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/new 0000000000000000000000000000000000000000\n'
    )
    const ranges = computePushRanges(refs)
    expect(ranges[0].logOpts).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --not --remotes')
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('falls back to --not --remotes when remote sha is not in local object DB', () => {
    mockExec.mockImplementation(() => {
      throw new Error('fatal: not a valid object name')
    })
    const refs = parsePushRefs(
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    )
    const ranges = computePushRanges(refs)
    expect(ranges[0].logOpts).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --not --remotes')
  })

  it('returns one range per ref for a multi-ref push', () => {
    mockExec.mockReturnValue('0000000000000000000000000000000000000000')
    const stdin = [
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'refs/heads/feature cccccccccccccccccccccccccccccccccccccccc refs/heads/feature dddddddddddddddddddddddddddddddddddddddd',
    ].join('\n')
    const ranges = computePushRanges(parsePushRefs(stdin))
    expect(ranges).toHaveLength(2)
  })
})

describe('verifyRange', () => {
  it('returns the commit count from git rev-list --count', () => {
    mockExec.mockReturnValue('5')
    expect(verifyRange({ ref: {} as never, logOpts: 'base..head' })).toBe(5)
    expect(mockExec).toHaveBeenCalledWith('git', ['rev-list', '--count', 'base..head'], expect.anything())
  })

  it('returns 0 for an empty range', () => {
    mockExec.mockReturnValue('0')
    expect(verifyRange({ ref: {} as never, logOpts: 'base..head' })).toBe(0)
  })

  it('throws on unexpected output', () => {
    mockExec.mockReturnValue('not-a-number')
    expect(() => verifyRange({ ref: {} as never, logOpts: 'base..head' })).toThrow(/unexpected output/)
  })
})

describe('buildScanArgs', () => {
  it('builds --log-opts base..head for push mode', () => {
    const args = buildScanArgs('push', { ref: {} as never, logOpts: 'base..head' })
    expect(args).toEqual(['git', '--log-opts', 'base..head', '--redact'])
  })

  it('builds --all --full-history for full mode', () => {
    expect(buildScanArgs('full')).toEqual(['git', '--log-opts', '--all --full-history', '--redact'])
  })

  it('throws in push mode without a range', () => {
    expect(() => buildScanArgs('push')).toThrow(/requires a PushRange/)
  })
})

describe('gitleaksAvailable', () => {
  it('returns true when gitleaks is on PATH', () => {
    mockSpawn.mockReturnValue({ status: 0, stdout: 'gitleaks\n', stderr: '' } as never)
    expect(gitleaksAvailable()).toBe(true)
  })

  it('returns true when gitleaks exists at a Homebrew path', () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: '', stderr: '' } as never)
    mockExists.mockImplementation((path) => path === '/opt/homebrew/bin/gitleaks')
    expect(gitleaksAvailable()).toBe(true)
  })

  it('returns false when gitleaks is nowhere', () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: '', stderr: '' } as never)
    mockExists.mockReturnValue(false)
    expect(gitleaksAvailable()).toBe(false)
  })
})

describe('runScan', () => {
  it('reports a leak when gitleaks exits nonzero', () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: '', stderr: '' } as never)
    expect(runScan(['git']).leaksFound).toBe(true)
  })

  it('fails closed when gitleaks reports 0 commits scanned', () => {
    mockSpawn.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: 'INFO 0000-00-00 0 commits scanned.\n',
    } as never)
    const result = runScan(['git'])
    expect(result.scannedCommits).toBe(0)
    expect(result.leaksFound).toBe(true)
  })

  it('passes when gitleaks scans commits and exits 0', () => {
    mockSpawn.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: 'INFO 0000-00-00 5 commits scanned.\n',
    } as never)
    const result = runScan(['git'])
    expect(result.scannedCommits).toBe(5)
    expect(result.leaksFound).toBe(false)
  })

  it('parses the scanned count from stdout as well as stderr', () => {
    mockSpawn.mockReturnValue({
      status: 0,
      stdout: 'INFO 0000-00-00 3 commits scanned.\n',
      stderr: '',
    } as never)
    expect(runScan(['git']).scannedCommits).toBe(3)
  })

  it('fails closed when the scanned count is indeterminate', () => {
    mockSpawn.mockReturnValue({ status: 0, stdout: '', stderr: '' } as never)
    const result = runScan(['git'])
    expect(result.scannedCommits).toBe(-1)
    expect(result.leaksFound).toBe(true)
  })
})

describe('scanPushedRefs', () => {
  it('returns 1 when a range cannot be verified', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      return { status: 0 } as never
    })
    mockExec.mockImplementation((cmd, args) => {
      if (args?.[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      throw new Error('fatal: bad object')
    })
    const refs = parsePushRefs(
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    )
    expect(scanPushedRefs(refs)).toBe(1)
  })

  it('returns 0 with a warning when there are no refs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(scanPushedRefs([])).toBe(0)
    expect(warn).toHaveBeenCalledWith('No refs to scan')
    warn.mockRestore()
  })

  it('returns 0 with a warning when gitleaks is missing', () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: '', stderr: '' } as never)
    mockExists.mockReturnValue(false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const refs = parsePushRefs(
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    )
    expect(scanPushedRefs(refs)).toBe(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gitleaks not installed'))
    warn.mockRestore()
  })
})

describe('main', () => {
  it('returns 0 with a warning when gitleaks is missing', () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: '', stderr: '' } as never)
    mockExists.mockReturnValue(false)
    const code = main(['--full'])
    expect(code).toBe(0)
  })

  it('returns 0 for a clean full scan', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 0, stdout: '', stderr: '5 commits scanned.\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--full'])).toBe(0)
  })

  it('returns 1 when the full scan finds a leak', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 1, stdout: '', stderr: 'Leak found\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--full'])).toBe(1)
  })

  it('returns 1 when the push scan finds a leak', () => {
    const stdin =
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    vi.mocked(readFileSync).mockReturnValue(stdin)
    mockExec.mockImplementation((cmd, args) => {
      if (args?.[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      if (args?.[0] === 'rev-list') return '3'
      return ''
    })
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 1, stdout: '', stderr: 'Leak found\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--push'])).toBe(1)
  })

  it('returns 1 when the push range cannot be verified', () => {
    const stdin =
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    vi.mocked(readFileSync).mockReturnValue(stdin)
    mockExec.mockImplementation(() => {
      throw new Error('boom')
    })
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      return { status: 0 } as never
    })
    expect(main(['--push'])).toBe(1)
  })

  it('returns 0 with a warning when --push has no refs', () => {
    vi.mocked(readFileSync).mockReturnValue('')
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 0, stdout: '', stderr: '5 commits scanned.\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--push'])).toBe(0)
  })

  it('returns 2 for an unknown mode', () => {
    mockSpawn.mockImplementation((cmd, _args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      return { status: 0 } as never
    })
    expect(main(['--bogus'])).toBe(2)
  })
})
