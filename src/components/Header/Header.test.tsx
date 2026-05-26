// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: vi.fn().mockImplementation(() => (key: string) => {
    const messages: Record<string, string> = {
      'accessibility.skipToMainContent': 'Skip to main content',
    }
    return messages[key] ?? key
  }),
}))

vi.mock('../ui/AppControls', () => ({
  default: () => React.createElement('div', { 'data-testid': 'app-controls' }),
}))

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import Header from './Header'

describe('Header', () => {
  it('renders the logo slot', () => {
    render(<Header logo={<div data-testid="logo">Logo</div>} />)

    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders AppControls', () => {
    render(<Header logo={<div>Logo</div>} />)

    expect(screen.getByTestId('app-controls')).toBeInTheDocument()
  })

  it('renders the nav slot when provided', () => {
    render(<Header logo={<div>Logo</div>} nav={<nav data-testid="header-nav">Nav</nav>} />)

    expect(screen.getByTestId('header-nav')).toBeInTheDocument()
  })

  it('renders nothing in nav position when nav prop is omitted', () => {
    render(<Header logo={<div>Logo</div>} />)

    // nav slot absent — only app-controls and logo present
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('renders skip-to-content link for accessibility', () => {
    render(<Header logo={<div>Logo</div>} />)

    const skip = screen.getByText('skipToMainContent')
    expect(skip).toBeInTheDocument()
    expect(skip).toHaveAttribute('href', '#main-content')
  })

  it('nav slot and AppControls are in the same right-side container', () => {
    render(<Header logo={<div>Logo</div>} nav={<span data-testid="nav-slot">Nav</span>} />)

    const nav = screen.getByTestId('nav-slot')
    const controls = screen.getByTestId('app-controls')

    // Nav is wrapped in a visibility div; both share the same grandparent flex container
    expect(nav.closest('.flex.items-center.gap-8')).toBe(controls.closest('.flex.items-center.gap-8'))
  })
})
