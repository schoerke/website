# Header Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Artists" and "Contact" nav links to the desktop header, right-aligned next to AppControls, styled identically to the footer nav.

**Architecture:** Create a new `HeaderNavigation` async server component (two links, locale-aware, desktop-only via `hidden lg:flex`). Add a `nav` slot prop to the `Header` client component. Pass `<HeaderNavigation />` from the locale layout alongside the existing logo slot.

**Tech Stack:** Next.js App Router, next-intl, Tailwind CSS, TypeScript

---

### Task 1: Add i18n keys for header navigation label

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/de.ts`

- [ ] **Step 1: Add `navigationLabel` to the `footer` sibling `header` key in EN**

In `src/i18n/en.ts`, find the `footer:` block (line ~173) and add a `header` key at the same level:

```typescript
    footer: {
      copyright: 'All rights reserved.',
      navigationLabel: 'Footer navigation',
      legalNavigationLabel: 'Legal navigation',
      socialMedia: {
        visitFacebook: 'Visit us on Facebook',
        visitInstagram: 'Visit us on Instagram',
        visitTwitter: 'Visit us on Twitter',
        visitYouTube: 'Visit us on YouTube',
      },
    },
    header: {
      navigationLabel: 'Header navigation',
    },
    accessibility: {
```

- [ ] **Step 2: Add the same key in DE**

In `src/i18n/de.ts`, find the `footer:` block (line ~176) and add a `header` key at the same level:

```typescript
    footer: {
      // ... existing footer keys unchanged
    },
    header: {
      navigationLabel: 'Header-Navigation',
    },
    accessibility: {
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors related to i18n types.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/de.ts
git commit -m "feat: add header.navigationLabel i18n keys (EN + DE)"
```

---

### Task 2: Create HeaderNavigation server component

**Files:**
- Create: `src/components/Header/HeaderNavigation.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

interface HeaderNavigationProps {
  locale: string
}

const HeaderNavigation = async ({ locale }: HeaderNavigationProps) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })
  const tHeader = await getTranslations({ locale, namespace: 'custom.header' })

  const navigationLinks = [
    { text: t('artists.title'), href: '/artists' as const },
    { text: t('contact.title'), href: '/kontakt' as const },
  ]

  return (
    <nav aria-label={tHeader('navigationLabel')} className="hidden lg:flex">
      <ul className="flex gap-x-8 text-sm uppercase lg:text-lg">
        {navigationLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="focus-visible:outline-primary-yellow after:bg-primary-yellow relative text-gray-600 transition duration-150 ease-in-out after:absolute after:-bottom-2 after:left-1/2 after:h-1 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 hover:text-gray-800 hover:after:w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {link.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default HeaderNavigation
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header/HeaderNavigation.tsx
git commit -m "feat: add HeaderNavigation server component (desktop-only, Artists + Contact)"
```

---

### Task 3: Add nav slot to Header and wire up in layout

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/app/(frontend)/[locale]/layout.tsx`

- [ ] **Step 1: Update Header to accept a nav slot**

Replace `src/components/Header/Header.tsx` with:

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'
import AppControls from '../ui/AppControls'

interface HeaderProps {
  logo: ReactNode
  nav?: ReactNode
}

const Header: React.FC<HeaderProps> = ({ logo, nav }) => {
  const t = useTranslations('custom.accessibility')

  return (
    <header className="w-full">
      {/* Skip navigation link for keyboard and screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
      >
        {t('skipToMainContent')}
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo Branding */}
        {logo}

        {/* Primary Navigation */}
        {nav}

        {/* App Controls - unified locale switcher + kbar */}
        <AppControls />
      </div>
    </header>
  )
}

export default Header
```

- [ ] **Step 2: Pass HeaderNavigation from the layout**

In `src/app/(frontend)/[locale]/layout.tsx`, add the import and update the Header usage:

```typescript
import ErrorBoundary from '@/components/ErrorBoundary'
import Footer from '@/components/Footer/Footer'
import Header from '@/components/Header/Header'
import HeaderLogo from '@/components/Header/HeaderLogo'
import HeaderNavigation from '@/components/Header/HeaderNavigation'
import SearchProvider from '@/components/Search/SearchProvider'
import { routing } from '@/i18n/routing'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import '../globals.css'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ErrorBoundary>
            <SearchProvider>
              <Header logo={<HeaderLogo />} nav={<HeaderNavigation locale={locale} />} />
              <main id="main-content" className="flex-1">
                {children}
              </main>
            </SearchProvider>
          </ErrorBoundary>
          <ErrorBoundary>
            <Footer locale={locale} />
          </ErrorBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Verify lint passes**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 5: Build to confirm no runtime issues**

```bash
pnpm build
```

Expected: successful build, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header/Header.tsx src/app/(frontend)/[locale]/layout.tsx
git commit -m "feat: wire HeaderNavigation into Header and locale layout"
```
