# AGENTS.md

## Build, Lint, and Format Commands

- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Test:** _No automated test scripts or test files present._

## Code Style Guidelines

- **Indentation:** 2 spaces (see .editorconfig)
- **Line endings:** LF, UTF-8, trim trailing whitespace, insert final newline
- **Formatting:**
  - Use Prettier (`pnpm format`):
    - Single quotes
    - No semicolons
    - Trailing commas
    - Print width: 120
    - Organize imports (prettier-plugin-organize-imports)
    - Tailwind CSS plugin enabled
- **Imports:** Use ES module syntax; imports are auto-organized
- **Types:** Use TypeScript for all new code
- **Naming:** Use descriptive, camelCase for variables/functions, PascalCase for types/components
- **Error Handling:** Prefer explicit error handling; avoid silent failures
- **Linting:** Follows Next.js, Prettier, and TypeScript ESLint rules
- **Ignore:** build, dist, node_modules, temp, .git, .yarn, .tmp

_This file is for agentic coding agents. Update if project conventions change._
