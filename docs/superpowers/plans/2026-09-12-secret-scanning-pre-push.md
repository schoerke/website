# Secret Scanning for Pre-Push Hook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gitleaks secret scanning to the pre-push hook and convert the whole hook to a TypeScript orchestrator.

**Architecture:** `.git-hooks/pre-push` becomes a one-line sh shim (with Homebrew PATH prepended) that `exec`s `pnpm exec tsx scripts/pre-push.ts`. The orchestrator parses the pushed refs from stdin, runs one gitleaks scan per ref over `git rev-list`-derived ranges (fail-closed on `0 commits scanned`), then runs lint → typecheck → tests, propagating exit codes. `scripts/secret-scan.ts` is a pure-function library + guarded CLI; `pnpm scan:secrets` runs a full-history scan.

**Tech Stack:** TypeScript (tsx), Node `child_process`, gitleaks (Homebrew, global), vitest 4, oxlint, oxfmt.

---

## Environment facts (verified)

- gitleaks **8.30.1** installed at `/opt/homebrew/bin/gitleaks` (Homebrew). `gitleaksAvailable()` will return true via the `/opt/homebrew/bin` probe under the hook's minimal PATH.
- `pnpm` resolves from mise shims; the existing hook already calls `pnpm`, so prepending `/opt/homebrew/bin:/usr/local/bin` (for gitleaks) in the shim does not disturb pnpm resolution.
- `.gitleaks.toml` is not in `.gitignore`.
- vitest config `test.include` currently covers `src/**` and `scripts/db/**` only — top-level `scripts/*.test.ts` must be added or tests silently never run.
- tsconfig `include: ["**/*.ts", ...]`, `exclude: ["node_modules", "scripts/db", "scripts/wordpress", "scripts/archive", "tmp"]` — so `scripts/*.ts` IS typechecked by `pnpm typecheck`. Files must be strict-clean, no `any`.
- Test style: explicit `import { describe, expect, it } from 'vitest'`, `// @vitest-environment node` directive as first line.

## File structure

- Modify `vitest.config.ts` — add `scripts/*.{test,spec}.*` to `test.include`.
- Create `scripts/secret-scan.ts` — pure functions (`parsePushRefs`, `computePushRanges`, `buildScanArgs`, `verifyRange`, `gitleaksAvailable`, `runScan`) + `main` CLI guarded by `import.meta.url` check.
- Create `scripts/secret-scan.test.ts` — unit tests for the above.
- Create `scripts/pre-push.ts` — `runAll(stdin)` orchestrator + guarded CLI entry.
- Create `scripts/pre-push.test.ts` — orchestrator tests.
- Create `.gitleaks.toml` — gitleaks config with `[extend] useDefault = true` + empty allowlist.
- Modify `package.json` — add `"scan:secrets"` script.
- Modify `.git-hooks/pre-push` — one-line shim.

---

## Task 1: vitest include + secret-scan pure functions

**Files:**
- Modify: `vitest.config.ts:21-24`
- Create: `scripts/secret-scan.ts`
- Create: `scripts/secret-scan.test.ts`

- [ ] **Step 1: Extend vitest include**

Edit `vitest.config.ts` `test.include`:

```ts
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/db/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
```

- [ ] **Step 2: Write the failing tests**

Create `scripts/secret-scan.test.ts`:

```ts
// @vitest-environment node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  buildScanArgs,
  computePushRanges,
  gitleaksAvailable,
  main,
  parsePushRefs,
  runScan,
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
    mockExists.mockImplementation((path: string) => path === '/opt/homebrew/bin/gitleaks')
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
})

describe('main', () => {
  it('returns 0 with a warning when gitleaks is missing', () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: '', stderr: '' } as never)
    mockExists.mockReturnValue(false)
    const code = main(['--full'])
    expect(code).toBe(0)
  })

  it('returns 0 for a clean full scan', () => {
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 0, stdout: '', stderr: '5 commits scanned.\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--full'])).toBe(0)
  })

  it('returns 1 when the full scan finds a leak', () => {
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 1, stdout: '', stderr: 'Leak found\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--full'])).toBe(1)
  })

  it('returns 1 when the push scan finds a leak', () => {
    const stdin =
      'refs/heads/main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa refs/heads/main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n'
    const { readFileSync } = await import('node:fs')
    vi.mocked(readFileSync).mockReturnValue(stdin)
    mockExec.mockImplementation((cmd, args) => {
      if (args[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      if (args[0] === 'rev-list') return '3'
      return ''
    })
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 1, stdout: '', stderr: 'Leak found\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--push'])).toBe(1)
  })

  it('returns 0 with a warning when --push has no refs', () => {
    const { readFileSync } = await import('node:fs')
    vi.mocked(readFileSync).mockReturnValue('')
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      if (cmd === 'gitleaks') return { status: 0, stdout: '', stderr: '5 commits scanned.\n' } as never
      return { status: 0 } as never
    })
    expect(main(['--push'])).toBe(0)
  })

  it('returns 2 for an unknown mode', () => {
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 0, stdout: 'gitleaks\n', stderr: '' } as never
      return { status: 0 } as never
    })
    expect(main(['--bogus'])).toBe(2)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test scripts/secret-scan.test.ts`
Expected: FAIL — module `./secret-scan` not found (no source file yet).

- [ ] **Step 4: Write minimal implementation**

Create `scripts/secret-scan.ts`:

```ts
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export interface PushRef {
  localRef: string
  localSha: string
  remoteRef: string
  remoteSha: string
}

export interface PushRange {
  ref: PushRef
  logOpts: string
}

export interface ScanResult {
  leaksFound: boolean
  scannedCommits: number
}

export type ScanMode = 'push' | 'full'

const ZERO_SHA = /^0{40}$/

/**
 * Whether a sha is the all-zero sha git uses for deleted refs / new branches.
 */
export function isZeroSha(sha: string): boolean {
  return ZERO_SHA.test(sha)
}

/**
 * Parse git pre-push stdin lines into refs. Lines with an all-zero local sha
 * (deleted refs) are skipped. Malformed lines throw.
 */
export function parsePushRefs(stdin: string): PushRef[] {
  const refs: PushRef[] = []
  for (const [index, rawLine] of stdin.split('\n').entries()) {
    const line = rawLine.trim()
    if (!line) continue
    const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/)
    if (!localRef || !localSha || !remoteRef || !remoteSha) {
      throw new Error(`Malformed pre-push ref line ${index + 1}: "${rawLine}"`)
    }
    if (isZeroSha(localSha)) continue
    refs.push({ localRef, localSha, remoteRef, remoteSha })
  }
  return refs
}

/**
 * Compute one git-log argument string per pushed ref. Normal pushes scan the
 * merge-base..head range; new branches (zero remote sha) and diverged remotes
 * (remote sha unknown locally) scan commits not reachable from any remote ref.
 */
export function computePushRanges(refs: PushRef[]): PushRange[] {
  const ranges: PushRange[] = []
  for (const ref of refs) {
    if (isZeroSha(ref.remoteSha)) {
      ranges.push({ ref, logOpts: `${ref.localSha} --not --remotes` })
      continue
    }
    let base: string
    try {
      base = runGit(['merge-base', ref.remoteSha, ref.localSha])
    } catch {
      ranges.push({ ref, logOpts: `${ref.localSha} --not --remotes` })
      continue
    }
    ranges.push({ ref, logOpts: `${base}..${ref.localSha}` })
  }
  return ranges
}

/**
 * Count the commits a range would scan. 0 means "nothing new" — the caller
 * must skip the scan entirely rather than trust gitleaks' exit code.
 */
export function verifyRange(range: PushRange): number {
  const args = ['rev-list', '--count', ...range.logOpts.split(' ')]
  const output = runGit(args)
  const count = Number.parseInt(output, 10)
  if (Number.isNaN(count)) {
    throw new Error(`git rev-list --count returned unexpected output: "${output}"`)
  }
  return count
}

/**
 * Build the gitleaks arguments for a scan mode. The `git` subcommand takes
 * ranges via `--log-opts` (the v8-era `--from`/`--to` flags were removed).
 */
export function buildScanArgs(mode: ScanMode, range?: PushRange): string[] {
  if (mode === 'full') return ['git', '--log-opts', '--all --full-history', '--redact']
  if (!range) throw new Error('push mode requires a PushRange')
  return ['git', '--log-opts', range.logOpts, '--redact']
}

/**
 * Whether gitleaks is installed. Probes PATH plus the two Homebrew prefixes
 * because git invokes hooks with a minimal PATH that excludes Homebrew dirs.
 */
export function gitleaksAvailable(): boolean {
  const which = spawnSync('sh', ['-c', 'command -v gitleaks'], { encoding: 'utf8' })
  if (which.status === 0 && (which.stdout ?? '').trim()) return true
  return existsSync('/opt/homebrew/bin/gitleaks') || existsSync('/usr/local/bin/gitleaks')
}

/**
 * Run a gitleaks scan. Fail closed: exit code 0 with "0 commits scanned" is a
 * scan that silently did nothing (gitleaks issue #2129, #1450) and is treated
 * as a leak so an empty scan can never pass.
 */
export function runScan(args: string[]): ScanResult {
  const result = spawnSync('gitleaks', args, { encoding: 'utf8' })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  const scannedMatch = `${stdout}\n${stderr}`.match(/(\d+) commits scanned/)
  const scannedCommits = scannedMatch ? Number.parseInt(scannedMatch[1], 10) : -1
  const leaksFound = result.status !== 0 || scannedCommits === 0
  return { leaksFound, scannedCommits }
}

function runGit(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

/**
 * CLI entry. `--push` reads refs from stdin; `--full` scans all history.
 * Returns the process exit code.
 */
export function main(argv: string[]): number {
  const mode = argv[0]
  if (!gitleaksAvailable()) {
    console.warn('gitleaks not installed — skipping secret scan (brew install gitleaks)')
    return 0
  }
  if (mode === '--push') {
    const stdin = readFileSync(0, 'utf8')
    const refs = parsePushRefs(stdin)
    if (refs.length === 0) {
      console.warn('No refs to scan')
      return 0
    }
    for (const range of computePushRanges(refs)) {
      if (verifyRange(range) === 0) continue
      const result = runScan(buildScanArgs('push', range))
      if (result.leaksFound) {
        console.error(`Secret scan found potential leaks in ${range.ref.localRef}`)
        return 1
      }
    }
    return 0
  }
  if (mode === '--full') {
    const result = runScan(buildScanArgs('full'))
    if (result.leaksFound) {
      console.error('Secret scan found potential leaks')
      return 1
    }
    return 0
  }
  console.error('Usage: tsx scripts/secret-scan.ts <--push|--full>')
  return 2
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  process.exitCode = main(process.argv.slice(2))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test scripts/secret-scan.test.ts`
Expected: PASS (15 tests). If a `main` test reports "Leak found" twice or stderr pollution, note that `console.error`/`console.warn` in `main` write to test output — that is expected; only failures matter.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts scripts/secret-scan.ts scripts/secret-scan.test.ts
git commit -m "feat(hooks): gitleaks secret-scan library + vitest coverage"
```

---

## Task 2: pre-push orchestrator

**Files:**
- Create: `scripts/pre-push.ts`
- Create: `scripts/pre-push.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `scripts/pre-push.test.ts`:

```ts
// @vitest-environment node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

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
    if (args[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    if (args[0] === 'rev-list') return '3'
    return ''
  })
})

describe('runAll', () => {
  it('runs lint, typecheck, then tests in order on success', () => {
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 1, stdout: '', stderr: '' } as never
      if (cmd === 'pnpm') return { status: 0 } as never
      return { status: 0 } as never
    })
    mockExists.mockReturnValue(false)
    const code = runAll(REF_LINE)
    expect(code).toBe(0)
    const pnpmCalls = mockSpawn.mock.calls.filter(([cmd]) => cmd === 'pnpm')
    expect(pnpmCalls.map(([, args]) => args)).toEqual([
      ['lint'],
      ['typecheck'],
      ['test'],
    ])
  })

  it('skips the secret scan with a warning when gitleaks is missing', () => {
    mockSpawn.mockImplementation((cmd, args) => {
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
    mockSpawn.mockImplementation((cmd, args) => {
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
      if (args[0] === 'merge-base') return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      if (args[0] === 'rev-list') return '0'
      return ''
    })
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 1, stdout: '', stderr: '' } as never
      if (cmd === 'pnpm') return { status: 0 } as never
      return { status: 0 } as never
    })
    mockExists.mockReturnValue(false)
    expect(runAll(REF_LINE)).toBe(0)
    expect(mockSpawn.mock.calls.some(([cmd]) => cmd === 'gitleaks')).toBe(false)
  })

  it('returns the failing check exit code and stops', () => {
    mockSpawn.mockImplementation((cmd, args) => {
      if (cmd === 'sh') return { status: 1, stdout: '', stderr: '' } as never
      if (cmd === 'pnpm' && args[0] === 'lint') return { status: 2 } as never
      return { status: 0 } as never
    })
    mockExists.mockReturnValue(false)
    const code = runAll(REF_LINE)
    expect(code).toBe(2)
    const pnpmCalls = mockSpawn.mock.calls.filter(([cmd]) => cmd === 'pnpm')
    expect(pnpmCalls).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test scripts/pre-push.test.ts`
Expected: FAIL — module `./pre-push` not found.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/pre-push.ts`:

```ts
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import {
  buildScanArgs,
  computePushRanges,
  gitleaksAvailable,
  parsePushRefs,
  runScan,
  verifyRange,
} from './secret-scan'

interface Check {
  label: string
  cmd: string
  args: string[]
}

const CHECKS: Check[] = [
  { label: 'Lint', cmd: 'pnpm', args: ['lint'] },
  { label: 'Typecheck', cmd: 'pnpm', args: ['typecheck'] },
  { label: 'Tests', cmd: 'pnpm', args: ['test'] },
]

/**
 * Run the full pre-push gate for the given pre-push stdin: gitleaks scan of
 * pushed refs first, then lint → typecheck → tests. Returns the process exit
 * code; stops at the first failing check.
 */
export function runAll(stdin: string): number {
  const refs = parsePushRefs(stdin)
  const ranges = computePushRanges(refs)
  for (const range of ranges) {
    if (verifyRange(range) === 0) continue
    console.log(`\n▶ Secret scan (${range.ref.localRef})`)
    if (!gitleaksAvailable()) {
      console.warn('gitleaks not installed — skipping secret scan (brew install gitleaks)')
      break
    }
    const result = runScan(buildScanArgs('push', range))
    if (result.leaksFound) {
      console.error(`\nSecret scan found potential leaks in ${range.ref.localRef}. Push blocked.`)
      return 1
    }
  }
  for (const check of CHECKS) {
    console.log(`\n▶ ${check.label}`)
    const result = spawnSync(check.cmd, check.args, { stdio: 'inherit' })
    if (result.status !== 0) return result.status ?? 1
  }
  console.log('\nAll checks passed.')
  return 0
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const stdin = readFileSync(0, 'utf8')
  process.exitCode = runAll(stdin)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test scripts/pre-push.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/pre-push.ts scripts/pre-push.test.ts
git commit -m "feat(hooks): TS pre-push orchestrator"
```

---

## Task 3: hook shim, gitleaks config, npm script

**Files:**
- Modify: `.git-hooks/pre-push`
- Create: `.gitleaks.toml`
- Modify: `package.json:33` (insert `scan:secrets` script)

- [ ] **Step 1: Replace the hook with the shim**

Rewrite `.git-hooks/pre-push`:

```sh
#!/bin/sh
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
exec pnpm exec tsx scripts/pre-push.ts
```

Git runs the hook with the repo root as cwd and the pushed refs on stdin;
`exec` preserves both for tsx. Homebrew dirs are prepended so gitleaks (and
any future brew tool) resolves under git's minimal PATH.

- [ ] **Step 2: Add the gitleaks config**

Create `.gitleaks.toml`:

```toml
[extend]
useDefault = true

[[allowlist]]
description = "Known-safe content (test fixtures, example/placeholder keys)"
regexes = []
```

gitleaks auto-discovers `.gitleaks.toml` (dotfile) at the repo root, which is
the cwd for both the hook and `pnpm scan:secrets`. Keep `regexes` empty until a
false positive is reported, then add the offending pattern here.

- [ ] **Step 3: Add the npm script**

Edit `package.json` scripts (insert after `"dump:recordings"`):

```json
    "scan:secrets": "tsx scripts/secret-scan.ts --full",
```

- [ ] **Step 4: Verify the repo is clean**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS — oxlint clean, tsc no errors (note `scripts/*.ts` is now typechecked).

Run: `pnpm test`
Expected: PASS — all existing tests plus the 20 new ones.

- [ ] **Step 5: Verify the hook path resolves**

Run: `git config core.hooksPath`
Expected: `.git-hooks`

- [ ] **Step 6: Manual smoke test of the hook (gitleaks installed)**

Use real shas so the range resolves:

```bash
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse HEAD^)
printf 'refs/heads/main %s refs/heads/main %s\n' "$LOCAL" "$REMOTE" | pnpm exec tsx scripts/pre-push.ts
```

Expected: `▶ Secret scan (refs/heads/main)` runs gitleaks over `HEAD^..HEAD`
(first), then lint/typecheck/tests. If gitleaks reports a finding in that
range, it is a real result — handle it (fix or allowlist) before continuing.

- [ ] **Step 7: Commit**

```bash
git add .git-hooks/pre-push .gitleaks.toml package.json
git commit -m "feat(hooks): gitleaks pre-push integration + scan:secrets script"
```

---

## Task 4: Live gitleaks smoke tests

gitleaks 8.30.1 is installed, so the scan path can be exercised against a real
binary. No code changes; scratch work lives in `tmp/`.

**Files:** none committed.

- [ ] **Step 1: Full-history scan of this repo**

Run: `pnpm scan:secrets`
Expected: exit 0, output shows a commit count; if it reports `0 commits
scanned` or leaks, investigate (this repo predates the hook — pre-existing
findings are expected to be allowlisted or fixed in a follow-up).

- [ ] **Step 2: Scratch-repo leak smoke test**

```bash
mkdir -p tmp/secretsmoke && cd tmp/secretsmoke
git init
git config user.email "test@example.com"
git config user.name "test"
printf 'AKIAIOSFODNN7EXAMPLE\n' > secret.txt
git add secret.txt && git commit -m test
HEAD_SHA=$(git rev-parse HEAD)
printf 'refs/heads/main %s refs/heads/main 0000000000000000000000000000000000000000\n' "$HEAD_SHA" | pnpm exec tsx scripts/pre-push.ts
```

Expected: secret scan detects the AWS key, prints the finding, and `runAll`
returns before lint (scan runs first). Then remove the scratch repo: `rm -rf
tmp/secretsmoke`.

- [ ] **Step 3: Report results**

Summarize what passed; do not commit anything.

---

## Self-review notes

- **Spec coverage:** `.gitleaks.toml` auto-discovery + dotfile naming (Task 3), fail-closed `0 commits scanned` (Task 1 runScan), multi-ref per-ref ranges (computePushRanges), diverged-remote fallback (computePushRanges), PATH hardening + binary probes (shim + gitleaksAvailable), CLI-main guard (both entry files), vitest include fix (Task 1), `pnpm scan:secrets` (Task 3), JSDoc on permanent scripts, no `dotenv/config` (none of these files import it).
- **Type consistency:** `PushRef`/`PushRange`/`ScanResult`/`ScanMode` used consistently across `secret-scan.ts`, `pre-push.ts`, and both test files. `runAll(stdin)` signature matches all pre-push tests. `buildScanArgs(mode, range?)` optional range matches `main` and `runAll` call sites.
- **Bypass vectors documented in spec:** missing gitleaks → fail-open warn (tested Task 2); allowlist manipulation (config comment); empty range skip (tested).