import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { buildScanArgs, computePushRanges, gitleaksAvailable, parsePushRefs, runScan, verifyRange } from './secret-scan'

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
