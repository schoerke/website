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
