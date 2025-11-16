/**
 * next-intl Navigation Helpers
 *
 * This file exports locale-aware navigation utilities that should be used
 * instead of Next.js's default navigation components. These helpers automatically
 * maintain the current locale when navigating between pages.
 *
 * Usage:
 * - Use `Link` from this file instead of `next/link` for internal navigation
 * - Use `useRouter`, `usePathname` for locale-aware routing in client components
 * - Use `redirect` for locale-aware redirects in server components
 *
 * @see https://next-intl.dev/docs/routing/navigation
 */
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
