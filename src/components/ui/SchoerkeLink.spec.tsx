// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SchoerkeLink from './SchoerkeLink'

// Mock the i18n Link component
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

describe('SchoerkeLink', () => {
  describe('internal vs external links', () => {
    it('uses Next.js Link for internal paths', () => {
      render(<SchoerkeLink href="/artists">Internal Link</SchoerkeLink>)
      const link = screen.getByRole('link', { name: 'Internal Link' })
      expect(link).toHaveAttribute('href', '/artists')
    })

    it('uses anchor tag for external URLs', () => {
      render(<SchoerkeLink href="https://example.com">External Link</SchoerkeLink>)
      const link = screen.getByRole('link', { name: 'External Link' })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })
  })

  describe('animated variant (default)', () => {
    it('renders with animated underline classes', () => {
      render(<SchoerkeLink href="/test">Click me</SchoerkeLink>)
      const link = screen.getByRole('link', { name: 'Click me' })

      expect(link).toHaveClass('text-primary-black')
      expect(link).toHaveClass('hover:text-primary-black/70')
      expect(link).toHaveClass('relative')
      expect(link).toHaveClass('after:bg-primary-yellow')
    })

    it('renders children', () => {
      render(<SchoerkeLink href="/test">Link Text</SchoerkeLink>)
      expect(screen.getByText('Link Text')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <SchoerkeLink href="/test" className="text-sm">
          Link
        </SchoerkeLink>,
      )
      const link = screen.getByRole('link')
      expect(link).toHaveClass('text-sm')
    })
  })

  describe('with-icon variant', () => {
    it('renders with inline-flex and gap classes', () => {
      render(
        <SchoerkeLink href="/test" variant="with-icon">
          <span>Icon</span>
          <span>Text</span>
        </SchoerkeLink>,
      )
      const link = screen.getByRole('link')

      expect(link).toHaveClass('inline-flex')
      expect(link).toHaveClass('items-center')
      expect(link).toHaveClass('gap-2')
    })

    it('does not have animated underline classes', () => {
      render(
        <SchoerkeLink href="/test" variant="with-icon">
          Content
        </SchoerkeLink>,
      )
      const link = screen.getByRole('link')

      expect(link).not.toHaveClass('relative')
      expect(link).not.toHaveClass('after:bg-primary-yellow')
    })
  })

  describe('icon-only variant', () => {
    it('renders with base styles only', () => {
      render(
        <SchoerkeLink href="/test" variant="icon-only" aria-label="Icon link">
          Icon
        </SchoerkeLink>,
      )
      const link = screen.getByRole('link', { name: 'Icon link' })

      expect(link).toHaveClass('text-primary-black')
      expect(link).toHaveClass('hover:text-primary-black/70')
    })

    it('does not have inline-flex or animated classes', () => {
      render(
        <SchoerkeLink href="/test" variant="icon-only">
          Icon
        </SchoerkeLink>,
      )
      const link = screen.getByRole('link')

      expect(link).not.toHaveClass('inline-flex')
      expect(link).not.toHaveClass('relative')
    })
  })

  describe('accessibility', () => {
    it('applies focus-visible outline classes', () => {
      render(<SchoerkeLink href="/test">Link</SchoerkeLink>)
      const link = screen.getByRole('link')

      expect(link).toHaveClass('focus-visible:outline')
      expect(link).toHaveClass('focus-visible:outline-primary-yellow')
      expect(link).toHaveClass('focus-visible:outline-2')
      expect(link).toHaveClass('focus-visible:outline-offset-4')
    })

    it('supports aria-label for icon-only links', () => {
      render(
        <SchoerkeLink href="/test" variant="icon-only" aria-label="Social media">
          Icon
        </SchoerkeLink>,
      )
      expect(screen.getByRole('link', { name: 'Social media' })).toBeInTheDocument()
    })
  })

  describe('external links', () => {
    it('supports target and rel attributes', () => {
      render(
        <SchoerkeLink href="https://example.com" target="_blank" rel="noopener noreferrer">
          External
        </SchoerkeLink>,
      )
      const link = screen.getByRole('link')

      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('href attribute', () => {
    it('renders with correct href for internal links', () => {
      render(<SchoerkeLink href="/artists">Artists</SchoerkeLink>)
      const link = screen.getByRole('link')

      expect(link).toHaveAttribute('href', '/artists')
    })

    it('renders with correct href for external links', () => {
      render(<SchoerkeLink href="https://example.com">Example</SchoerkeLink>)
      const link = screen.getByRole('link')

      expect(link).toHaveAttribute('href', 'https://example.com')
    })
  })
})
