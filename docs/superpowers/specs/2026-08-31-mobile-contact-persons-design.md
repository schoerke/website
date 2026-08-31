# Mobile ContactPersons Design

## Goal

Add a mobile-only (< md, i.e. below 768px) variant of the `ContactPersons` component rendered on the artist
detail page. Desktop/tablet (md+) rendering stays byte-for-byte identical to current behavior.

## Context

`ContactPersons` (`src/components/Artist/ContactPersons.tsx`) renders contact info for an artist's employees,
or falls back to `EmptyContactPersons` (general contact) when no employees are fully populated. It's rendered
once from `src/app/(frontend)/[locale]/artists/[slug]/page.tsx:86` — that call site is NOT changed by this work.

The dual-render-by-breakpoint technique itself is already precedented in this codebase: `page.tsx` renders two
copies of `ArtistLinks` (one `className="hidden md:block"`, one `md:hidden`) around the same `md` breakpoint. This
spec follows that same established pattern rather than introducing a new technique.

**Known limitation carried over from existing code (do not fix as a drive-by):** the parent only mounts
`ContactPersons` when `employees && employees.length > 0` (`page.tsx:86`). This means the `!employees ||
employees.length === 0` branch of `showGeneral` (and its mobile equivalent) is unreachable in production — the
general-contact fallback can only actually trigger via `employees.some(emp => !hasAllFields(emp))`. This is
pre-existing behavior, not introduced by this change; `MobileEmptyContactPersons` still needs to exist for parity
and isolated component tests, but no extra effort should go into the empty-array case beyond matching existing
dead-code behavior.

## Approach

Everything lives in the existing `src/components/Artist/ContactPersons.tsx` file — no new files. The file grows
from 2 components to 4:

1. `EmptyContactPersons` (existing, unchanged) — desktop/tablet general-contact fallback.
2. `ContactPersons` (existing, unchanged logic) — desktop/tablet main component.
3. `MobileEmptyContactPersons` (new) — mobile general-contact fallback.
4. `MobileContactPersons` (new) — mobile main component; this is what gets rendered alongside the desktop
   components, gated by breakpoint classes.

### Breakpoint gating

- Desktop components' root `<section>` gets `hidden md:block` prepended to existing classes (in addition to
  existing `sm:text-left md:text-right`), so the JSX/markup itself is otherwise untouched.
- Mobile components' root `<section>` uses `md:hidden` (visible by default below md, hidden at md+).
- Both sets of components render simultaneously in the DOM; Tailwind classes control visibility per breakpoint.
  No JS/matchMedia — SSR-safe, no hydration mismatch.

### `ContactPersons` (exported, used by page.tsx) becomes a wrapper

The default-exported `ContactPersons` component renders both the desktop logic (existing branch) and the new
`MobileContactPersons` component, e.g.:

```tsx
const ContactPersons: React.FC<ContactPersonsProps> = ({ employees }) => {
  const showGeneral = !employees || employees.length === 0 || employees.some((emp) => !hasAllFields(emp))

  return (
    <>
      {showGeneral ? <EmptyContactPersons /> : <DesktopContactPersonsList employees={employees} />}
      {showGeneral ? <MobileEmptyContactPersons /> : <MobileContactPersons employees={employees} />}
    </>
  )
}
```

(Exact internal naming/structure is an implementation detail — the constraint is: desktop JSX markup must be
unchanged except for the added `hidden md:block` class, and mobile markup (JSX only) is new and self-contained
in the same file. "Self-contained" refers to markup, not logic: `MobileContactPersons`/`MobileEmptyContactPersons`
still read `hasAllFields`/`REQUIRED_FIELDS`/`GENERAL_CONTACT` from the same module scope — no duplication of that
logic, only of the JSX/layout.)

### Why full markup duplication instead of one shared, prop-styled component

`ArtistLinks` (the existing precedent) is a single component rendered twice with a `className` prop controlling
layout — no duplicated JSX. This spec deliberately does NOT follow that exact pattern for `ContactPersons`,
because the desktop and mobile layouts differ structurally, not just stylistically: desktop renders `<address>`
blocks with full text links (email address, phone number as visible text); mobile renders icon-only buttons in a
row layout. A single component with conditional className would need internal branching for icon-vs-text
rendering anyway, which is no simpler than two components. Tradeoff accepted: `emp.name`/`emp.title`/href-building
logic exists in two places (`ContactPersons` and `MobileContactPersons`) and must be kept in sync manually if
employee data shape changes. The "parity" test described in Testing below exists specifically to catch drift
between the two.

### `MobileContactPersons` markup

```tsx
export type MobileContactPersonsProps = {
  employees: Employee[]
}

const MobileContactPersons: React.FC<MobileContactPersonsProps> = ({ employees }) => {
  return (
    <section className="md:hidden">
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

- Icons: `Mail`, `Phone`, `Smartphone` from `lucide-react` (already a project dependency). These specific icons and
  the circular icon-button style are **new** to this codebase — there is no existing icon-button component or
  precedent to reuse under `src/components/Artist/*` (verified via grep; existing icon usage there is
  `UserRound`/`ImageIcon`/`ChevronDown` with `className="h-4 w-4"`-style Tailwind sizing + `aria-hidden="true"`,
  which this spec follows for consistency: icons use Tailwind-based sizing (`h-[18px] w-[18px]`, not the `size={}`
  prop) and `aria-hidden="true"` since the accessible name is already provided by the parent `aria-label`).
- Each icon is a tappable link (`mailto:`/`tel:`) with `aria-label` for accessibility, circular button styling,
  focus ring matching existing desktop link style, wrapped in `<address>` to preserve the same semantic element
  desktop uses (existing test suite asserts "uses semantic address element"; mobile keeps parity here).
- Name + title shown on the left of each row; icon button group on the right (per employee).
- Run `pnpm format` after implementation and accept its class-ordering output as final — do not hand-guess final
  class string order in the diff.

### `MobileEmptyContactPersons` markup

Same row layout, single entry for `GENERAL_CONTACT`, only `Mail` + `Phone` icon buttons (no mobile field — general
contact data has no mobile number).

```tsx
const MobileEmptyContactPersons: React.FC = () => {
  return (
    <section className="md:hidden">
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

## Non-goals / constraints

- No changes to `page.tsx` — `<ContactPersons employees={employees} />` call site stays as-is.
- No shared util extraction — `hasAllFields`/`REQUIRED_FIELDS` logic is reused as-is from the existing module
  scope (already shared within the file; no duplication needed since mobile and desktop are in the same file).
- Desktop markup/classes must remain identical except for the added `hidden md:block` wrapper class.
- Breakpoint cutoff: `md` (768px), matching the existing `md:` usage in this file and the parent page layout.
- No new dependencies — `lucide-react` already installed.
- Both sections render server-side simultaneously, duplicating name/title text in the DOM (page-fragment-level,
  not full-page duplication). This is the same accepted tradeoff already present for `ArtistLinks` in production
  — not a new risk introduced by this spec.

## Testing

- Update/extend `ContactPersons.spec.tsx` to cover:
  - Mobile markup renders icon buttons with correct `href` (`mailto:`/`tel:`) and `aria-label` per employee.
  - Mobile fallback (`MobileEmptyContactPersons`) renders general contact with Mail + Phone icons only.
  - Desktop markup/classes unchanged (existing assertions should still pass, plus assert `hidden md:block` class
    present on desktop root).
  - Mobile root asserts `md:hidden` class present (mirror of the desktop assertion above).
  - Mobile path exercises the same "missing field" scenarios already covered for desktop (missing name/title/
    email/phone/mobile each fall through to `MobileEmptyContactPersons`) — mirror the existing per-field test
    cases onto the mobile fallback, not just the desktop one.
  - Multiple-employee case rendered on the mobile path (mirrors existing "renders multiple complete employees"
    desktop test).
  - Mobile markup uses a semantic `<address>` element (mirrors existing "uses semantic address element" test).
  - Both desktop and mobile sections render simultaneously (both in DOM; visibility is CSS-only).
  - Parity test: given the same employee list, assert desktop and mobile render the same number of contact links
    with matching `href` values (e.g. same set of `mailto:`/`tel:` targets) — guards against the two JSX trees
    drifting apart over time, given they're maintained as separate markup (see "Why full markup duplication"
    above).
