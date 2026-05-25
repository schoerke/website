// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(({ namespace }: { namespace: string }) => {
    const messages: Record<string, string> = {
      'custom.pages.artists.title': 'Artists',
      'custom.pages.contact.title': 'Contact',
      'custom.header.navigationLabel': 'Header navigation',
    }
    return Promise.resolve((key: string) => messages[`${namespace}.${key}`] ?? key)
  }),
}))

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import HeaderNavigation from './HeaderNavigation'

describe('HeaderNavigation', () => {
  it('renders Artists and Contact links', async () => {
    render(await HeaderNavigation({ locale: 'en' }))

    expect(screen.getByRole('link', { name: 'Artists' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument()
  })

  it('Artists link points to /artists', async () => {
    render(await HeaderNavigation({ locale: 'en' }))

    expect(screen.getByRole('link', { name: 'Artists' })).toHaveAttribute('href', '/artists')
  })

  it('Contact link points to /kontakt', async () => {
    render(await HeaderNavigation({ locale: 'en' }))

    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/kontakt')
  })

  it('nav has localized aria-label', async () => {
    render(await HeaderNavigation({ locale: 'en' }))

    expect(screen.getByRole('navigation', { name: 'Header navigation' })).toBeInTheDocument()
  })

  it('renders translated link text for DE locale', async () => {
    vi.mocked(
      (await import('next-intl/server')).getTranslations,
    ).mockImplementation(({ namespace }: { namespace: string }) => {
      const messages: Record<string, string> = {
        'custom.pages.artists.title': 'Künstler:innen',
        'custom.pages.contact.title': 'Kontakt',
        'custom.header.navigationLabel': 'Header-Navigation',
      }
      return Promise.resolve((key: string) => messages[`${namespace}.${key}`] ?? key)
    })

    render(await HeaderNavigation({ locale: 'de' }))

    expect(screen.getByRole('link', { name: 'Künstler:innen' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kontakt' })).toBeInTheDocument()
  })

  it('nav is hidden on mobile via hidden class', async () => {
    render(await HeaderNavigation({ locale: 'en' }))

    const nav = screen.getByRole('navigation')
    expect(nav.className).toContain('hidden')
    expect(nav.className).toContain('lg:flex')
  })
})
