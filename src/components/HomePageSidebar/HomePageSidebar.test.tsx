// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import HomePageSidebar from './HomePageSidebar'

vi.mock('@/components/ui/SchoerkeLink', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

describe('HomePageSidebar', () => {
  it('renders agency name', () => {
    render(<HomePageSidebar />)
    expect(screen.getByText('Künstlersekretariat Astrid Schoerke GmbH')).toBeInTheDocument()
  })

  it('renders street address', () => {
    render(<HomePageSidebar />)
    expect(screen.getByText('Emanuel-Geibel-Str. 10')).toBeInTheDocument()
  })

  it('renders city', () => {
    render(<HomePageSidebar />)
    expect(screen.getByText('D-65185 Wiesbaden')).toBeInTheDocument()
  })

  it('renders email link', () => {
    render(<HomePageSidebar />)
    const link = screen.getByText('info@ks-schoerke.de').closest('a')
    expect(link).toHaveAttribute('href', 'mailto:info@ks-schoerke.de')
  })

  it('renders phone link', () => {
    render(<HomePageSidebar />)
    const link = screen.getByText('+49 (0)611-50 58 90 50').closest('a')
    expect(link).toHaveAttribute('href', 'tel:+4906115058950')
  })

  it('has hidden class on mobile (lg:flex)', () => {
    const { container } = render(<HomePageSidebar />)
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('hidden')
    expect(aside?.className).toContain('lg:flex')
  })
})
