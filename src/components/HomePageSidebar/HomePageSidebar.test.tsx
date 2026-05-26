// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(({ namespace }: { namespace: string }) => {
    const messages: Record<string, string> = {
      'custom.pages.artists.title': 'Artists',
      'custom.pages.news.title': 'News',
      'custom.pages.projects.title': 'Projects',
      'custom.pages.contact.title': 'Contact',
    }
    return Promise.resolve((key: string) => messages[`${namespace}.${key}`] ?? key)
  }),
}))

vi.mock('@/components/ui/SchoerkeLink', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import HomePageSidebar from './HomePageSidebar'

describe('HomePageSidebar', () => {
  it('renders agency name heading', async () => {
    render(await HomePageSidebar({ locale: 'en' }))
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })

  it('renders street address', async () => {
    render(await HomePageSidebar({ locale: 'en' }))
    expect(screen.getByText('Emanuel-Geibel-Str. 10')).toBeInTheDocument()
  })

  it('renders city', async () => {
    render(await HomePageSidebar({ locale: 'en' }))
    expect(screen.getByText('D-65185 Wiesbaden')).toBeInTheDocument()
  })

  it('renders email link', async () => {
    render(await HomePageSidebar({ locale: 'en' }))
    const link = screen.getByText('info@ks-schoerke.de').closest('a')
    expect(link).toHaveAttribute('href', 'mailto:info@ks-schoerke.de')
  })

  it('renders phone link', async () => {
    render(await HomePageSidebar({ locale: 'en' }))
    const link = screen.getByText('+49 (0)611-50 58 90 50').closest('a')
    expect(link).toHaveAttribute('href', 'tel:+4906115058950')
  })

  it('renders nav links', async () => {
    render(await HomePageSidebar({ locale: 'en' }))
    expect(screen.getByRole('link', { name: 'Artists' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'News' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument()
  })

  it('has hidden class on mobile (lg:flex)', async () => {
    const { container } = render(await HomePageSidebar({ locale: 'en' }))
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('hidden')
    expect(aside?.className).toContain('lg:flex')
  })
})
