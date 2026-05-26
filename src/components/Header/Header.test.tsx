// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: vi.fn().mockImplementation(() => (key: string) => {
    const messages: Record<string, string> = {
      skipToMainContent: 'Skip to main content',
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

  it('renders skip-to-content link for accessibility', () => {
    render(<Header logo={<div>Logo</div>} />)

    const skip = screen.getByText('Skip to main content')
    expect(skip).toBeInTheDocument()
    expect(skip).toHaveAttribute('href', '#main-content')
  })
})
