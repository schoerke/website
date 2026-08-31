# Mobile ContactPersons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-only (< md, below 768px) icon-button variant of `ContactPersons`, rendered alongside the
existing desktop/tablet markup (unchanged), gated purely by Tailwind `hidden`/`md:hidden` classes — no JS
breakpoint detection.

**Architecture:** All 4 components (`EmptyContactPersons`, `ContactPersons`, `MobileEmptyContactPersons`,
`MobileContactPersons`) live in the single existing file `src/components/Artist/ContactPersons.tsx`. Desktop
components get `hidden md:block` prepended to their root `<section>` className (otherwise untouched). New mobile
components render icon-only contact links (`Mail`/`Phone`/`Smartphone` from `lucide-react`) in a `md:hidden`
section, name/title on the left of each row, icon buttons on the right. Both sections render simultaneously in the
DOM (SSR-safe); `hidden` is `display:none`, correctly removing content from the accessibility tree and tab order.

**Tech Stack:** Next.js (React), TypeScript, Tailwind CSS, `lucide-react` (already installed), Vitest +
`@testing-library/react` (`happy-dom` environment).

**Reference spec:** `docs/superpowers/specs/2026-08-31-mobile-contact-persons-design.md`

---

## Important test-isolation note (read before starting)

The existing test file uses `screen.getByRole('link', { name: /email jane smith/i })` — a **global** query across
the whole rendered tree. Once mobile duplicates the same `aria-label` text (e.g. `Email Jane Smith`) in a second
DOM subtree, these global queries will start matching **two** elements and throw `"Found multiple elements"`.

To keep tests scoped and unambiguous, both root `<section>` elements get a `data-testid`:
- Desktop root: `data-testid="contact-persons-desktop"`
- Mobile root: `data-testid="contact-persons-mobile"`

Tests then use `within(screen.getByTestId('contact-persons-desktop'))` / `within(screen.getByTestId('contact-persons-mobile'))` to scope queries. This is a test-only addition (attribute has no visual/behavioral effect) and does not violate the spec's "desktop markup unchanged except `hidden md:block`" constraint in any way that affects rendering.

---

### Task 1: Add data-testid + `hidden md:block` to existing desktop sections (no behavior change)

**Files:**
- Modify: `src/components/Artist/ContactPersons.tsx:17,57`
- Test: `src/components/Artist/ContactPersons.spec.tsx` (scope existing global queries)

- [ ] **Step 1: Read current file to confirm line numbers**

Run: `sed -n '1,110p' src/components/Artist/ContactPersons.tsx` — confirm the two `<section className="sm:text-left md:text-right">` lines (one in `EmptyContactPersons`, one in `ContactPersons`).

- [ ] **Step 2: Update `EmptyContactPersons` root section**

Change:
```tsx
  return (
    <section className="sm:text-left md:text-right">
```
to:
```tsx
  return (
    <section className="hidden sm:text-left md:block md:text-right" data-testid="contact-persons-desktop">
```

- [ ] **Step 3: Update `ContactPersons` root section (the complete-employee-rendering branch)**

Change:
```tsx
  return (
    <section className="sm:text-left md:text-right">
```
(the second occurrence, inside the main `ContactPersons` component)
to:
```tsx
  return (
    <section className="hidden sm:text-left md:block md:text-right" data-testid="contact-persons-desktop">
```

- [ ] **Step 4: Update existing spec file to scope queries to the desktop testid**

Add `within` to the import:
```tsx
import { render, screen, within } from '@testing-library/react'
```

Update every test in `ContactPersons.spec.tsx` that calls `screen.getByText(...)` or `screen.getByRole('link', ...)`
or `screen.queryByText(...)` at the top level to instead query within the desktop section. Example transformation
for the empty-state test:

```tsx
it('renders general contact when no employees provided', () => {
  render(<ContactPersons />)

  const desktop = within(screen.getByTestId('contact-persons-desktop'))
  expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()

  const emailLink = desktop.getByRole('link', { name: /email.*künstlersekretariat/i })
  expect(emailLink).toHaveAttribute('href', `mailto:${GENERAL_CONTACT.email}`)
  expect(emailLink).toHaveTextContent(GENERAL_CONTACT.email)

  const phoneLink = desktop.getByRole('link', { name: /phone.*künstlersekretariat/i })
  expect(phoneLink).toHaveAttribute('href', `tel:${GENERAL_CONTACT.phone}`)
  expect(phoneLink).toHaveTextContent(GENERAL_CONTACT.phone)
})
```

Apply the same `within(screen.getByTestId('contact-persons-desktop'))` scoping pattern to every other test in the
file that queries by text/role at the top level (all tests in `Empty state`, `Field validation`, `Complete
employee rendering`, `Accessibility`, `Layout` describe blocks). For tests using `container.querySelector(...)`
(e.g. `'uses semantic address element'`, `'renders in a section element'`, `'uses list for multiple employees'`),
scope the query to the desktop testid element specifically:

```tsx
it('uses semantic address element', () => {
  const employee = createMockEmployee()
  const { container } = render(<ContactPersons employees={[employee]} />)

  const desktopSection = container.querySelector('[data-testid="contact-persons-desktop"]')
  const addresses = desktopSection?.querySelectorAll('address')
  expect(addresses).toHaveLength(1)
})
```

```tsx
it('renders in a section element', () => {
  const employee = createMockEmployee()
  render(<ContactPersons employees={[employee]} />)

  const section = screen.getByTestId('contact-persons-desktop')
  expect(section.tagName).toBe('SECTION')
})
```

```tsx
it('uses list for multiple employees', () => {
  const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
  render(<ContactPersons employees={employees} />)

  const desktop = within(screen.getByTestId('contact-persons-desktop'))
  const list = desktop.getByRole('list')
  expect(list).toBeInTheDocument()

  const listItems = desktop.getAllByRole('listitem')
  expect(listItems).toHaveLength(2)
})
```

For the `'has focus styles on all links'` test, scope `getAllByRole('link')` to desktop:
```tsx
it('has focus styles on all links', () => {
  const employee = createMockEmployee()
  render(<ContactPersons employees={[employee]} />)

  const desktop = within(screen.getByTestId('contact-persons-desktop'))
  const links = desktop.getAllByRole('link')
  links.forEach((link) => {
    expect(link).toHaveClass('focus:ring-2')
  })
})
```

- [ ] **Step 5: Run tests to verify they still pass after scoping (mobile component doesn't exist yet, so this just confirms scoping didn't break anything)**

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx`
Expected: All existing tests PASS (same assertions, now scoped to `contact-persons-desktop`).

- [ ] **Step 6: Add a test asserting the desktop section has the new hidden/md:block classes**

Add to the `Layout` describe block:
```tsx
it('desktop section is hidden below md and visible at md and up', () => {
  const employee = createMockEmployee()
  render(<ContactPersons employees={[employee]} />)

  const section = screen.getByTestId('contact-persons-desktop')
  expect(section).toHaveClass('hidden')
  expect(section).toHaveClass('md:block')
})
```

- [ ] **Step 7: Run tests again**

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx`
Expected: All tests PASS, including the new one.

- [ ] **Step 8: Format and lint**

Run: `pnpm format && pnpm lint`
Expected: no errors; accept oxfmt's class-ordering output as final.

- [ ] **Step 9: Commit**

```bash
git add src/components/Artist/ContactPersons.tsx src/components/Artist/ContactPersons.spec.tsx
git commit -m "test: scope ContactPersons tests to desktop testid, gate desktop by md breakpoint"
```

---

### Task 2: Add `MobileEmptyContactPersons` component + test

**Files:**
- Modify: `src/components/Artist/ContactPersons.tsx` (add import, add component after `EmptyContactPersons`)
- Test: `src/components/Artist/ContactPersons.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Add a new top-level describe block to `ContactPersons.spec.tsx` (after the closing of the existing `describe('ContactPersons', ...)` block, or as a new nested describe inside it — place it as a sibling top-level describe for clarity):

```tsx
describe('MobileContactPersons (rendered via ContactPersons)', () => {
  describe('Empty state', () => {
    it('renders general contact with Mail and Phone icon links, no mobile field', () => {
      render(<ContactPersons />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()

      const emailLink = mobile.getByRole('link', { name: /email.*künstlersekretariat/i })
      expect(emailLink).toHaveAttribute('href', `mailto:${GENERAL_CONTACT.email}`)

      const phoneLink = mobile.getByRole('link', { name: /phone.*künstlersekretariat/i })
      expect(phoneLink).toHaveAttribute('href', `tel:${GENERAL_CONTACT.phone}`)

      // No mobile icon for general contact (no mobile field in GeneralContactInfo)
      expect(mobile.queryByRole('link', { name: /mobile.*künstlersekretariat/i })).not.toBeInTheDocument()
    })

    it('mobile section is visible below md and hidden at md and up', () => {
      render(<ContactPersons />)

      const section = screen.getByTestId('contact-persons-mobile')
      expect(section).toHaveClass('md:hidden')
    })

    it('mobile icons are decorative (aria-hidden) since parent link has aria-label', () => {
      const { container } = render(<ContactPersons />)

      const mobileSection = container.querySelector('[data-testid="contact-persons-mobile"]')
      const icons = mobileSection?.querySelectorAll('svg')
      expect(icons?.length).toBeGreaterThan(0)
      icons?.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx -t "MobileContactPersons"`
Expected: FAIL — `Unable to find an element by: [data-testid="contact-persons-mobile"]` (mobile component doesn't exist yet).

- [ ] **Step 3: Add `Mail`/`Phone`/`Smartphone` import and `MobileEmptyContactPersons` component**

At the top of `src/components/Artist/ContactPersons.tsx`, update imports:
```tsx
import { GENERAL_CONTACT } from '@/constants/contact'
import type { Employee } from '@/payload-types'
import { Mail, Phone, Smartphone } from 'lucide-react'
import React from 'react'
```

After the existing `EmptyContactPersons` component (before `const ContactPersons: React.FC<...`), add:

```tsx
const MobileEmptyContactPersons: React.FC = () => {
  return (
    <section className="md:hidden" data-testid="contact-persons-mobile">
      <ul className="flex flex-col gap-4">
        <li className="flex items-center justify-between gap-3">
          <div>
            <strong>{GENERAL_CONTACT.name}</strong>
          </div>
          <address className="flex gap-2 not-italic">
            <a
              href={`mailto:${GENERAL_CONTACT.email}`}
              aria-label={`Email ${GENERAL_CONTACT.name}`}
              className="rounded-full border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
            <a
              href={`tel:${GENERAL_CONTACT.phone}`}
              aria-label={`Phone ${GENERAL_CONTACT.name}`}
              className="rounded-full border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          </address>
        </li>
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Wire `MobileEmptyContactPersons` into the exported `ContactPersons` wrapper (empty branch only for now)**

Find the current `if (showGeneral) { return <EmptyContactPersons /> }` branch in `ContactPersons` and change it to
render both:
```tsx
  if (showGeneral) {
    return (
      <>
        <EmptyContactPersons />
        <MobileEmptyContactPersons />
      </>
    )
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx -t "MobileContactPersons"`
Expected: PASS (3 new tests). Also run the full file to confirm no regressions:

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx`
Expected: all PASS.

- [ ] **Step 6: Format and lint**

Run: `pnpm format && pnpm lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Artist/ContactPersons.tsx src/components/Artist/ContactPersons.spec.tsx
git commit -m "feat: add MobileEmptyContactPersons for artist mobile view"
```

---

### Task 3: Add `MobileContactPersons` component (main employee list) + tests

**Files:**
- Modify: `src/components/Artist/ContactPersons.tsx` (add component, wire into `ContactPersons` wrapper)
- Test: `src/components/Artist/ContactPersons.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the `MobileContactPersons (rendered via ContactPersons)` describe block from Task 2, a new nested describe:

```tsx
  describe('Complete employee rendering', () => {
    it('renders single employee with icon links for email, phone, mobile', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))

      expect(mobile.getByText('Jane Smith')).toBeInTheDocument()
      expect(mobile.getByText('Artist Manager')).toBeInTheDocument()

      const emailLink = mobile.getByRole('link', { name: /email jane smith/i })
      expect(emailLink).toHaveAttribute('href', 'mailto:jane@example.com')

      const phoneLink = mobile.getByRole('link', { name: /phone jane smith/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:+49 123 456789')

      const mobileLink = mobile.getByRole('link', { name: /mobile jane smith/i })
      expect(mobileLink).toHaveAttribute('href', 'tel:+49 987 654321')
    })

    it('renders multiple complete employees', () => {
      const employees = [
        createMockEmployee({ id: 1, name: 'Jane Smith', title: 'Manager' }),
        createMockEmployee({ id: 2, name: 'John Doe', title: 'Assistant', email: 'john@example.com' }),
      ]
      render(<ContactPersons employees={employees} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))

      expect(mobile.getByText('Jane Smith')).toBeInTheDocument()
      expect(mobile.getByText('Manager')).toBeInTheDocument()
      expect(mobile.getByText('John Doe')).toBeInTheDocument()
      expect(mobile.getByText('Assistant')).toBeInTheDocument()
      expect(mobile.queryByText(GENERAL_CONTACT.name)).not.toBeInTheDocument()
    })

    it('uses semantic address element per employee', () => {
      const employee = createMockEmployee()
      const { container } = render(<ContactPersons employees={[employee]} />)

      const mobileSection = container.querySelector('[data-testid="contact-persons-mobile"]')
      const addresses = mobileSection?.querySelectorAll('address')
      expect(addresses).toHaveLength(1)
    })

    it('uses list for multiple employees', () => {
      const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
      render(<ContactPersons employees={employees} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      const list = mobile.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = mobile.getAllByRole('listitem')
      expect(listItems).toHaveLength(2)
    })

    it('has focus styles on all mobile links', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      const links = mobile.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveClass('focus:ring-2')
      })
    })
  })

  describe('Field validation (falls back to MobileEmptyContactPersons)', () => {
    it('renders general contact when employee missing name', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, name: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(mobile.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('renders general contact when employee missing title', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, title: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing email', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, email: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing phone', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, phone: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing mobile', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, mobile: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const mobile = within(screen.getByTestId('contact-persons-mobile'))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })
  })

  describe('Desktop/mobile parity', () => {
    it('renders the same set of mailto/tel links on desktop and mobile', () => {
      const employees = [
        createMockEmployee({ id: 1, name: 'Jane Smith' }),
        createMockEmployee({ id: 2, name: 'John Doe', email: 'john@example.com' }),
      ]
      render(<ContactPersons employees={employees} />)

      const desktop = within(screen.getByTestId('contact-persons-desktop'))
      const mobile = within(screen.getByTestId('contact-persons-mobile'))

      const desktopHrefs = desktop
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .sort()
      const mobileHrefs = mobile
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .sort()

      expect(mobileHrefs).toEqual(desktopHrefs)
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx -t "Complete employee rendering"`
Expected: FAIL — mobile employee rows don't exist yet (`MobileContactPersons` not implemented; `showGeneral ===
false` branch still only renders desktop).

- [ ] **Step 3: Add `MobileContactPersons` component**

After `MobileEmptyContactPersons` (from Task 2) and before the exported `ContactPersons`, add:

```tsx
export type MobileContactPersonsProps = {
  employees: Employee[]
}

const MobileContactPersons: React.FC<MobileContactPersonsProps> = ({ employees }) => {
  return (
    <section className="md:hidden" data-testid="contact-persons-mobile">
      <ul className="flex flex-col gap-4">
        {employees.map((emp) => (
          <li key={emp.id} className="flex items-center justify-between gap-3">
            <div>
              <strong>{emp.name}</strong>
              <div className="text-sm text-gray-600">{emp.title}</div>
            </div>
            <address className="flex gap-2 not-italic">
              <a
                href={`mailto:${emp.email}`}
                aria-label={`Email ${emp.name}`}
                className="rounded-full border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
              <a
                href={`tel:${emp.phone}`}
                aria-label={`Phone ${emp.name}`}
                className="rounded-full border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
              <a
                href={`tel:${emp.mobile}`}
                aria-label={`Mobile ${emp.name}`}
                className="rounded-full border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Smartphone className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
            </address>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Wire `MobileContactPersons` into the exported `ContactPersons` wrapper (non-empty branch)**

Find the final `return (<section className="hidden sm:text-left md:block md:text-right" ...>...)` in `ContactPersons`
(the non-`showGeneral` branch that maps over `employees`) and wrap it together with the new mobile component using
a fragment:

```tsx
  return (
    <>
      <section className="hidden sm:text-left md:block md:text-right" data-testid="contact-persons-desktop">
        <ul className="flex gap-6 md:flex-col md:gap-4">
          {employees.map((emp) => {
            return (
              <li key={emp.id}>
                {/* ... existing unchanged JSX for this branch ... */}
              </li>
            )
          })}
        </ul>
      </section>
      <MobileContactPersons employees={employees} />
    </>
  )
```

(Keep the existing inner JSX for the desktop `<li>` exactly as it is today — only the outer `return (...)` wrapper
changes from a single `<section>` to a fragment containing that `<section>` plus `<MobileContactPersons />`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/components/Artist/ContactPersons.spec.tsx`
Expected: ALL tests PASS (existing desktop tests, Task 2 mobile-empty tests, Task 3 mobile-complete tests, parity
test).

- [ ] **Step 6: Format and lint**

Run: `pnpm format && pnpm lint`
Expected: no errors.

- [ ] **Step 7: Run full test suite to check for regressions elsewhere**

Run: `pnpm test`
Expected: all tests PASS (no other file imports/snapshots `ContactPersons` in a way that would break — confirm via
the command output).

- [ ] **Step 8: Commit**

```bash
git add src/components/Artist/ContactPersons.tsx src/components/Artist/ContactPersons.spec.tsx
git commit -m "feat: add MobileContactPersons icon-button view for artist detail page"
```

---

### Task 4: Manual verification in browser

**Files:** none (manual QA step, no code changes)

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Visit an artist detail page with employees**

Navigate to `http://localhost:3000/de/artists/<slug-with-employees>` (pick any artist with populated
`contactPersons` — check via `pnpm dump artists` or admin UI if unsure which slug has employees).

- [ ] **Step 3: Resize browser to below 768px width**

Confirm: name/title + 3 circular icon buttons (mail/phone/mobile) show, no desktop text-link version visible, tap
targets look reasonably sized (icon buttons ~36px min, adjust `p-2` if too small on real device testing).

- [ ] **Step 4: Resize browser to 768px and above**

Confirm: original desktop text-link layout appears exactly as before this change (right-aligned on md+, address
block with mailto/tel text links), mobile icon view is gone.

- [ ] **Step 5: Test an artist with NO employees (or all-incomplete employee data) to see general contact fallback**

Confirm mobile view shows `Künstlersekretariat Astrid Schoerke GmbH` with Mail + Phone icon buttons only (no third
icon), desktop view unchanged.

- [ ] **Step 6: Stop dev server**

Run: `Ctrl+C` in the terminal running `pnpm dev` (per project policy: always shut down dev servers started for
testing).

- [ ] **Step 7: Report findings to user**

Summarize what was verified (or any visual issues found, e.g. icon button size/spacing needing adjustment) before
requesting final commit/PR approval — no `git commit` beyond Tasks 1–3 without explicit user confirmation per
project's git commit policy.

---

## Notes for the executing engineer

- **Do not touch `src/app/(frontend)/[locale]/artists/[slug]/page.tsx`.** The `<ContactPersons employees={employees} />`
  call site does not change — `ContactPersons` internally renders both desktop and mobile now.
- **Do not extract shared util functions.** `hasAllFields`/`REQUIRED_FIELDS`/`GENERAL_CONTACT` stay used as-is from
  module scope; `MobileContactPersons`/`MobileEmptyContactPersons` are new JSX only, not new logic.
- **Every `git commit` requires this to already be reviewed/tested by you as the implementer** (run the test suite
  before each commit per the steps above) — but per this repo's `AGENTS.md`, actual `git commit` execution during
  autonomous work is fine since the user asked to proceed with implementation; do NOT `git push` under any
  circumstances without explicit user confirmation.
- If `pnpm format` reorders Tailwind classes differently than shown in this plan's code blocks, accept the
  formatter's output — it is the source of truth for class ordering, not this plan.
