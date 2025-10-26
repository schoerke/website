# Schoerke Website

A modern, TypeScript-based web application for the Schoerke project, built with [Next.js](https://nextjs.org/) and
[Payload CMS](https://payloadcms.com/). This repository provides a robust, maintainable, and extensible platform for
managing content, media, and team information, with a focus on developer experience, code quality, and clear
documentation.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Setup & Installation](#setup--installation)
- [Build, Lint, and Format Commands](#build-lint-and-format-commands)
- [Code Style & Contribution Guidelines](#code-style--contribution-guidelines)
- [Development Workflow](#development-workflow)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [License](#license)

---

## Project Overview

This project powers the Schoerke website, providing a performant, scalable, and content-driven platform. It leverages
Next.js for the frontend, Payload CMS for content management, and TypeScript for type safety and maintainability. The
codebase is structured for clarity, ease of contribution, and long-term sustainability.

---

## Key Features

- **Modern Frontend:** Built with Next.js, supporting server-side rendering and static site generation.
- **Type-Safe Backend:** Uses Payload CMS with TypeScript for robust content modeling and API integration.
- **Content Collections:** Modular collections for Artists, Employees, Media, Posts, Users, and Newsletter Contacts.
- **Internationalization:** Support for multiple languages (e.g., `en`, `de`).
- **Custom Components:** Reusable UI components for typography, colors, and layout.
- **Developer Experience:** Pre-configured linting, formatting, and code style enforcement.
- **Containerization:** Docker and Docker Compose support for consistent local and production environments.
- **Extensive Documentation:** Architectural decision records, component documentation, and design plans.

---

## Architecture Overview

- **Frontend:**
  - Located in `src/app/(frontend)/`
  - Implements all public-facing pages (artists, brand, contact, news, projects, team)
  - Uses modular React components and Tailwind CSS for styling

- **Backend/API:**
  - Located in `src/app/(payload)/`
  - Payload CMS configuration in `src/payload.config.ts`
  - API routes for REST and GraphQL in `src/app/(payload)/api/`
  - Admin interface and import utilities

- **Collections:**
  - Defined in `src/collections/`
  - Type-safe models for all major content types

- **Scripts:**
  - Data migration and utility scripts in `scripts/data/`

- **Documentation:**
  - Architectural decisions, plans, and component docs in `docs/`

---

## Directory Structure

```
.
├── data/                  # Static data files (e.g., media.xml)
├── docs/                  # Documentation (ADRs, plans, components, issues, questions, todos)
│   ├── adr/
│   ├── plans/
│   ├── components.md
│   └── ...
├── scripts/               # Data migration and utility scripts
│   └── data/
├── src/                   # Main application source code
│   ├── access/            # Access control utilities
│   ├── app/               # Next.js app directory
│   │   ├── (frontend)/    # Public-facing pages and layout
│   │   └── (payload)/     # Payload CMS admin, API, and utilities
│   ├── collections/       # Payload CMS collection definitions
│   ├── components/        # Shared React components
│   ├── data/              # App-specific data and options
│   ├── i18n/              # Internationalization files
│   ├── services/          # Business logic and data services
│   ├── payload-types.ts   # Generated Payload types
│   └── payload.config.ts  # Payload CMS configuration
├── .editorconfig
├── .gitignore
├── .markdownlint.json
├── .prettierignore
├── AGENTS.md              # Agent and code quality guidelines
├── Dockerfile
├── docker-compose.yml
├── eslint.config.mjs
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── prettier.config.mjs
├── README.md              # (You are here)
├── tailwind.config.js
└── tsconfig.json
```

---

## Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (preferred package manager)
- [Docker](https://www.docker.com/) (for containerized development)
- [Payload CMS](https://payloadcms.com/) (configured via `src/payload.config.ts`)

### 1. Clone the Repository

```sh
git clone https://github.com/your-org/schoerke-website.git
cd schoerke-website
```

### 2. Install Dependencies

```sh
pnpm install
```

### 3. Configure Environment

- Copy and edit any required `.env` files (not included in repo).
- Review `next.config.mjs` and `payload.config.ts` for environment-specific settings.

### 4. Run in Development

```sh
pnpm dev
```

Or, using Docker Compose:

```sh
docker-compose up --build
```

### 5. Build for Production

```sh
pnpm build
```

---

## Build, Lint, and Format Commands

| Task   | Command       | Description                     |
| ------ | ------------- | ------------------------------- |
| Build  | `pnpm build`  | Build the application           |
| Lint   | `pnpm lint`   | Run ESLint on the codebase      |
| Format | `pnpm format` | Format code using Prettier      |
| Test   | _Not present_ | No automated test scripts/files |

---

## Code Style & Contribution Guidelines

- **Indentation:** 2 spaces (see `.editorconfig`)
- **Line endings:** LF, UTF-8, trim trailing whitespace, insert final newline
- **Formatting:**
  - Use Prettier (`pnpm format`)
  - Single quotes, no semicolons, trailing commas, print width 120
  - Organize imports (prettier-plugin-organize-imports)
  - Tailwind CSS plugin enabled
- **Imports:** Use ES module syntax; imports are auto-organized
- **Types:** Use TypeScript for all new code
- **Naming:**
  - camelCase for variables/functions
  - PascalCase for types/components
- **Error Handling:** Prefer explicit error handling; avoid silent failures
- **Linting:** Follows Next.js, Prettier, and TypeScript ESLint rules
- **Ignore:** build, dist, node_modules, temp, .git, .yarn, .tmp

**Contribution Process:**

1. Fork and clone the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Follow code style and commit message conventions.
4. Run lint and format checks before committing.
5. Open a pull request with a clear description.

---

## Development Workflow

- **Install dependencies:** `pnpm install`
- **Start development server:** `pnpm dev`
- **Build for production:** `pnpm build`
- **Lint code:** `pnpm lint`
- **Format code:** `pnpm format`
- **Dockerized workflow:** Use `docker-compose up --build` for full-stack local development.

---

## Troubleshooting & FAQ

- **No automated tests?**  
  There are currently no automated test scripts or test files present. Please add tests for new features where
  appropriate.

- **Formatting issues?**  
  Run `pnpm format` to auto-format codebase.

- **Linting errors?**  
  Run `pnpm lint` and fix reported issues.

- **Environment variables missing?**  
  Ensure all required `.env` files are present and configured.

- **Payload CMS issues?**  
  Check `src/payload.config.ts` and the [Payload CMS documentation](https://payloadcms.com/docs/).

---

## License

_This project is proprietary. Please contact the maintainers for licensing information._

---

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Payload CMS](https://payloadcms.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)

---

_For more details, see the [docs/](./docs/) directory and [AGENTS.md](./AGENTS.md)._
