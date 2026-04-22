# Pre-Push Git Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tracked pre-push git hook that runs lint, typecheck, and tests before every push.

**Architecture:** A `.git-hooks/pre-push` shell script is committed to the repo. A `prepare` script in `package.json` runs `git config core.hooksPath .git-hooks` on `pnpm install`, wiring up the hooks directory automatically for all contributors.

**Tech Stack:** bash, git, pnpm, oxlint, tsc, vitest

---

## File Map

| Action | File |
|--------|------|
| Create | `.git-hooks/pre-push` |
| Modify | `package.json` — add/update `prepare` script |

---

### Task 1: Create `.git-hooks/pre-push`

**Files:**
- Create: `.git-hooks/pre-push`

- [ ] **Step 1: Create the `.git-hooks/` directory and write the hook script**

Create `.git-hooks/pre-push` with this exact content:

```bash
#!/bin/sh
set -e

echo "Running pre-push checks..."

echo "\n▶ Lint"
pnpm lint

echo "\n▶ Typecheck"
pnpm typecheck

echo "\n▶ Tests"
pnpm test

echo "\nAll checks passed."
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x .git-hooks/pre-push
```

- [ ] **Step 3: Verify the script runs manually**

```bash
sh .git-hooks/pre-push
```

Expected: lint, typecheck, and tests all run and pass (or fail with their own output — the hook itself should not error out).

---

### Task 2: Wire up the hooks directory via `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Check whether a `prepare` script already exists**

Open `package.json` and look at the `"scripts"` section. As of the current state of the repo, there is no `prepare` script.

- [ ] **Step 2: Add `prepare` script to `package.json`**

In the `"scripts"` block, add:

```json
"prepare": "git config core.hooksPath .git-hooks"
```

The scripts section should look like:

```json
"scripts": {
  "prepare": "git config core.hooksPath .git-hooks",
  "build": "...",
  ...
}
```

- [ ] **Step 3: Activate the hooks directory in the current local repo**

```bash
git config core.hooksPath .git-hooks
```

Expected: no output. Verify with:

```bash
git config core.hooksPath
```

Expected output: `.git-hooks`

- [ ] **Step 4: Verify the hook is active by doing a dry run**

```bash
git push --dry-run 2>&1 || true
```

The pre-push script should fire and print `Running pre-push checks...` before git attempts the push.

---

### Task 3: Commit

**Files:**
- `.git-hooks/pre-push`
- `package.json`
- `docs/superpowers/specs/2026-04-22-pre-push-hook-design.md`
- `docs/superpowers/plans/2026-04-22-pre-push-hook.md`

- [ ] **Step 1: Stage files**

```bash
git add .git-hooks/pre-push package.json docs/superpowers/specs/2026-04-22-pre-push-hook-design.md docs/superpowers/plans/2026-04-22-pre-push-hook.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: add pre-push hook running lint, typecheck, and tests"
```

Expected: commit succeeds. The pre-push hook does NOT run on commit — only on push.
