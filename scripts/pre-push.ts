import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { parsePushRefs, scanPushedRefs } from './secret-scan'

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
  const stdin = readFileSync(0, 'utf8')
  process.exitCode = runAll(stdin)
}
