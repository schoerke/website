# Secret Scanning for Pre-Push Hook — Design

Date: 2026-09-12
Status: Approved

## Overview

Add secret scanning to the pre-push git hook. The existing `.git-hooks/pre-push`
shell script (lint + typecheck + tests) is converted to a full TypeScript
orchestrator. A gitleaks scan of the pushed commits runs first, blocking the
push if a secret is found. An on-demand `pnpm scan:secrets` command runs a
full-history scan.

## Decisions

- **Engine:** gitleaks, installed via Homebrew (global binary, not a repo
  dependency).
- **Scope (default):** only the commits being pushed. Computed from the refs git
  writes to the hook's stdin.
- **On-demand full-history scan:** `pnpm scan:secrets` runs gitleaks over all
  commits.
- **Failure behavior:** gitleaks missing → warn + continue (exit 0).
  gitleaks finds a secret → block push (nonzero exit).
- **False positives:** committed `.gitleaks.toml` with `useDefault = true` and a
  small allowlist for known-safe content (test fixtures, placeholder/example
  keys in docs). Extended reactively as new false positives appear.
- **Structure:** full-TS hook. One-line sh shim + `scripts/pre-push.ts`
  orchestrator + `scripts/secret-scan.ts` library/CLI. Orchestration tested
  with vitest.

## Components

### `.git-hooks/pre-push`

Shell shim. Git invokes hooks with a minimal PATH (no shell profile), so
Homebrew dirs are prepended explicitly — on Apple Silicon gitleaks lives in
`/opt/homebrew/bin`, Intel in `/usr/local/bin`:

```sh
#!/bin/sh
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
exec pnpm exec tsx scripts/pre-push.ts
```

`set -e` is belt-and-suspenders (nothing runs after `exec`). Git passes the
pushed refs on stdin; `exec` preserves them for the child (correct pattern —
do NOT pipe/redirect). Git runs the hook with the repo root as cwd, so the
relative script path resolves.

### `scripts/pre-push.ts` (orchestrator)

1. Read stdin refs (git pre-push format: `<local ref> <local sha> <remote ref>
   <remote sha>` per line).
2. Run one gitleaks scan per pushed ref over that ref's commit range (see
   below). On leak → print summary, exit nonzero.
3. Run lint, then typecheck, then tests via `spawnSync` with
   `stdio: 'inherit'`. Propagate the exit code of the first failing step.
   `spawnSync` is preferred over async `spawn`: deterministic sequential
   blocking + exit-code propagation, no signal-handling complexity. Optional
   timeout wrapper guards against a hung child.
4. Print `All checks passed.` when everything succeeds.

Note: the orchestrator consumes stdin to compute ranges before spawning
children; `pnpm lint`/`typecheck`/`test` don't read stdin so this is safe.
Documented footgun — future children must not rely on stdin.

### `scripts/secret-scan.ts` (library + CLI)

Exported functions (pure, unit-testable, side-effect-free at import):

- `parsePushRefs(stdin: string): PushRef[]` — parse stdin lines, skip lines
  with all-zero local sha (deleted refs).
- `computePushRanges(refs: PushRef[]): PushRange[]` — returns one range per
  pushed ref (multi-ref pushes have disjoint ranges; do not collapse):
  - remote sha non-zero: base = `git merge-base <remote sha> <local sha>`,
    head = `<local sha>`.
  - remote sha all-zero (new branch): commits not reachable from any remote
    ref (`git rev-list <local sha> --not --remotes`).
  - If the remote sha is not in the local object DB (diverged remote since
    last fetch), `merge-base` fails → fall back to the `--not --remotes` new
    branch path. If the range still cannot be verified, the scan for that ref
    BLOCKS the push (fail-closed — unverifiable coverage is not trusted).
  - Empty range (no new commits) → the ref contributes no range and its
    invocation is skipped entirely. Never rely on gitleaks' exit code to
    detect an empty range — gitleaks can exit 0 having scanned nothing.
- `buildScanArgs(mode: 'push', base: string, head: string): string[]` —
  `['git', '--log-opts', '<base>..<head>', '--redact']`. gitleaks' `git`
  subcommand uses `--log-opts` (the `--from`/`--to` flags were removed in
  v8; passing them exits 126 and blocks every push). Two-dot `base..head` is
  the correct semantics for "commits being pushed".
- `buildScanArgs(mode: 'full')` — `['git', '--log-opts', '--all --full-history', '--redact']`.
- `gitleaksAvailable(): boolean` — probe `command -v gitleaks` plus explicit
  checks for `/opt/homebrew/bin/gitleaks` and `/usr/local/bin/gitleaks`
  (Homebrew paths not on the hook's minimal PATH).
- `verifyRange(base: string, head: string): number` — `git rev-list --count
  <base>..<head>`. Zero → skip scan for that ref. Also validates the base
  resolves, covering the diverged-remote case.
- `runScan(args: string[]): ScanResult` — spawn gitleaks; honor exit code.
  **Fail closed:** treat gitleaks stdout's `0 commits scanned` progress line
  as a scan failure, not a pass (gitleaks exits 0 with no findings when its
  `git log -p` produced no commits on stderr — issue #2129 — or on an invalid
  range — issues #1450/#1464). Any finding → exit code signals leak (gitleaks
  conflates errors with findings at exit 1; nonzero always blocks).

CLI entry — guarded so importing the module does not execute it:

```ts
if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  await main(process.argv.slice(2))
}
```

Modes:

- `--push` — read stdin, compute ranges, scan each. Used for
  tests/inspection. With no stdin, exit 0 with a warning (never a misleading
  nonzero).
- `--full` — full-history scan. Exit code reflects findings.

Used by `pnpm scan:secrets`.

All output uses gitleaks' `--redact` (secret values masked; file paths, commit
SHAs, rule IDs still print — acceptable for a local hook, but never re-derive
raw values in the orchestrator).

### `.gitleaks.toml`

Auto-discovery looks for `.gitleaks.toml` (dotfile) at the scanned path — a
bare `gitleaks.toml` is silently ignored. Committed at repo root (cwd for
both hook and `pnpm scan:secrets`):

```toml
[extend]
useDefault = true
# Reactive allowlist: add [[allowlists]] entries only for verified false positives.
```

Shipped minimal (verified on gitleaks 8.30.1): gitleaks 8.25+ renamed the
allowlist section to `[[allowlists]]` and **rejects an empty `regexes = []`**
(validation error). The plan's original `[[allowlist]]` block was invalid —
add real `[[allowlists]]` entries only when a false positive is reported.
`.env` and real credentials are never committed, so gitleaks only ever scans
committed content. Note the allowlist is itself a manipulation vector (a dev
could whitelist a real secret) — keep it minimal, review additions; the
full-history scan uses the same allowlist so it is not fully independent.

Live smoke-test learning (gitleaks 8.30.1): default AWS rule allowlists keys
ending in `EXAMPLE` (test keys like `AKIAIOSFODNN7EXAMPLE` pass silently);
slack tokens (`xoxb-...`) are reliably flagged. When hand-crafting smoke-test
secrets, use a format gitleaks actually flags.

### `package.json`

Add script:

```json
"scan:secrets": "tsx scripts/secret-scan.ts --full"
```

## Behavior

- gitleaks missing → warn `gitleaks not installed — skipping secret scan (brew
  install gitleaks)`, continue. **Known bypass:** the hook is a deterrent, not
  a control — a dev can skip scanning by not installing/uninstalling gitleaks.
  Documented team requirement. Protection is only as good as each dev's
  Homebrew setup.
- gitleaks finds leak → print leak summary, block push.
- Empty range (no new commits) → scan skipped for that ref, rest of hook
  proceeds.
- **Fail closed:** a scan that reports `0 commits scanned` is treated as a
  failure — a clean-looking pass that scanned nothing must never be trusted.
- `--redact` everywhere so detected secret values never print.

## Error Handling

- Parse and range functions are pure and exported; failures throw with clear
  messages.
- `spawnSync` failures wrapped; gitleaks exit code honored (nonzero → block).
- Missing local remote sha → fallback `--not --remotes` scan; if that fails,
  the push is BLOCKED (fail-closed). This overrides the earlier fail-open
  intent ("warn + continue") — an unverifiable range means the push's secret
  coverage cannot be confirmed, so it is safer to block than to proceed.
- Orchestrator stops at first failing check and exits with that step's code.

## Testing (vitest)

Mock `spawnSync`, gitleaks binary availability, and `git rev-list --count`.

**vitest config:** extend `test.include` in `vitest.config.ts` to cover
`scripts/*.{test,spec}.ts` — the current include patterns (`src/**`,
`scripts/db/**`) silently skip tests at the `scripts/` root, making `pnpm test`
pass while running nothing.

- `parsePushRefs`: normal refs, deleted refs (zero local sha), malformed lines.
- `computePushRanges`: fast-forward, non-fast-forward (merge-base), new branch
  (zero remote sha), diverged remote (unresolvable remote sha → fallback), no
  new commits → empty, multi-ref push → one range per ref.
- `buildScanArgs`: push (`--log-opts <base>..<head>`) vs full
  (`--log-opts --all --full-history`).
- `runScan`: `0 commits scanned` → treated as failure; leak exit code → block;
  missing binary path probes.
- Orchestrator: missing gitleaks → exit 0; leak found → exit 1; lint failure
  stops before typecheck/tests; success path invokes all three in order.
- CLI-main guard: importing `secret-scan.ts` does not execute `main()`.

## Files

- New: `scripts/secret-scan.ts`, `scripts/secret-scan.test.ts`,
  `scripts/pre-push.ts`, `scripts/pre-push.test.ts`, `.gitleaks.toml`
- Modified: `.git-hooks/pre-push`, `package.json`, `vitest.config.ts`

## Conventions

- Permanent `scripts/` files get full JSDoc (AGENTS.md): purpose, usage
  `@example`, env requirements, `@see` cross-references.
- No `dotenv/config` import — the hook touches no env vars, Payload, or DB.
- `tsc --noEmit` typechecks `scripts/*.ts` (not excluded by tsconfig) — keep
  strict-clean, no `any`.
- gitleaks is a global Homebrew binary, unpinned: default rules drift between
  releases and a previously-clean allowlist may flag after an upgrade. Run
  `pnpm scan:secrets` as the periodic reconciliation check. Tested against
  gitleaks 8.30.1 (installed at `/opt/homebrew/bin/gitleaks`).