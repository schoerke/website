import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { parsePushRefs, scanPushedRefs } from './secret-scan'

/**
 * git pre-push hook orchestrator: secret scan of pushed refs, then
 * lint → typecheck → tests. Exits nonzero on the first failing check and
 * blocks the push.
 *
 * @example
 * // invoked by .git-hooks/pre-push; git feeds pre-push refs via stdin
 * pnpm exec tsx scripts/pre-push.ts
 *
 * No environment variables required.
 *
 * @see scripts/secret-scan.ts
 */
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
  const scanCode = scanPushedRefs(parsePushRefs(stdin))
  if (scanCode !== 0) return scanCode
  for (const check of CHECKS) {
    console.log(`\n▶ ${check.label}`)
    const result = spawnSync(check.cmd, check.args, { stdio: ['ignore', 'inherit', 'inherit'] })
    if (result.error) {
      console.error(`Failed to run ${check.label}: ${result.error.message}`)
      return 1
    }
    if (result.status !== 0) return result.status ?? 1
  }
  console.log('\nAll checks passed.')
  return 0
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  try {
    const stdin = readFileSync(0, 'utf8')
    process.exitCode = runAll(stdin)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Pre-push check failed: ${message}`)
    process.exitCode = 1
  }
}
