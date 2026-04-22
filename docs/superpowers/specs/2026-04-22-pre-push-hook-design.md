# Pre-Push Git Hook — Design Spec

**Date:** 2026-04-22

## Overview

Add a pre-push git hook that runs the full test suite (`pnpm test`) before any push. Uses plain git hook infrastructure — no additional dependencies.

## Components

### `.git-hooks/pre-push`

An executable shell script tracked in the repository. Runs three checks in sequence:

1. `pnpm lint` — oxlint, fast
2. `pnpm typecheck` — tsc --noEmit
3. `pnpm test` — vitest run, all tests

Each step must pass before the next runs. Exits with a non-zero code on any failure, blocking the push.

### `package.json` `prepare` script

Runs `git config core.hooksPath .git-hooks` so the hook directory is automatically registered after `pnpm install`. This ensures anyone cloning the repo gets the hook wired up without manual steps.

### `.git-hooks/` directory

Tracked in git. Contains the `pre-push` script. Any future hooks (pre-commit, commit-msg, etc.) can be added here.

## Behavior

- `git push` → runs `pnpm lint`, then `pnpm typecheck`, then `pnpm test` → all pass: push proceeds / any fail: push blocked
- `pnpm install` on a fresh clone → `prepare` script configures `core.hooksPath` automatically
- `git push --no-verify` → skips the hook (escape hatch for WIP or CI environments)

## Out of Scope

- Running only changed-file tests (full suite was explicitly chosen)
- lint or typecheck in the hook — included, running before tests
- Other hook types (pre-commit, etc.)

## Implementation Steps

1. Create `.git-hooks/` directory
2. Write `.git-hooks/pre-push` shell script (executable)
3. Add/update `prepare` script in `package.json`
4. Run `git config core.hooksPath .git-hooks` locally to activate immediately
