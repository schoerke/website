/**
 * LocaleSwitcher Component Tests
 *
 * Tests the one-click language toggle:
 * - Renders a single "DE / EN" button (current locale bold)
 * - Single click switches directly to the other locale (no drawer)
 * - Accessibility features (ARIA labels, screen reader announcements)
 * - Localized slug resolution on news/projects detail routes
 *
 * @vitest-environment happy-dom
 */
import { useLocale } from 'next-intl'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LocaleSwitcher from './LocaleSwitcher'

// Mock next-intl navigation
vi.mock('@/i18n/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
  })),
}))

// Mock next-intl locale hook
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'de'),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
}))

// Mock actions/posts (used for locale-aware slug resolution on news detail pages)
vi.mock('@/actions/posts', () => ({
  resolvePostSlugInLocale: vi.fn(() => Promise.resolve(null)),
}))

describe('LocaleSwitcher', () => {
  const buildMockRouter = (mockReplace = vi.fn()) => ({
    push: vi.fn(),
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    bfcacheId: 'mock-bfcache',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLocale).mockReturnValue('de')
  })

  describe('Initial Rendering', () => {
    it('renders a single button with DE/EN codes', () => {
      render(<LocaleSwitcher />)

      const button = screen.getByRole('button', { name: /switch to/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('DE')
      expect(button).toHaveTextContent('EN')
    })

    it('does not render a drawer with language options', () => {
      render(<LocaleSwitcher />)

      expect(screen.queryByRole('navigation', { name: 'Language selector' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Deutsch' })).not.toBeInTheDocument()
    })

    it('has no aria-expanded attribute (not a disclosure)', () => {
      render(<LocaleSwitcher />)

      const button = screen.getByRole('button', { name: /switch to/i })
      expect(button).not.toHaveAttribute('aria-expanded')
    })

    it('shows current locale in bold', () => {
      render(<LocaleSwitcher />)

      const button = screen.getByRole('button', { name: /switch to/i })
      const boldText = button.querySelector('.font-bold')
      expect(boldText).toHaveTextContent('DE')
    })

    it('describes the switch target in the aria-label', () => {
      render(<LocaleSwitcher />)

      expect(screen.getByRole('button', { name: /switch to English/i })).toBeInTheDocument()
    })
  })

  describe('Single-Click Switching', () => {
    it('switches to English in one click when German is current', async () => {
      const user = userEvent.setup()
      const { useRouter } = await import('@/i18n/navigation')
      const mockReplace = vi.fn()
      vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))

      render(<LocaleSwitcher />)

      await user.click(screen.getByRole('button', { name: /switch to/i }))

      expect(mockReplace).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/', params: {} }, { locale: 'en', scroll: false })
    })

    it('switches to German in one click when English is current', async () => {
      const user = userEvent.setup()
      const { useRouter } = await import('@/i18n/navigation')
      const mockReplace = vi.fn()
      vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
      vi.mocked(useLocale).mockReturnValue('en')

      render(<LocaleSwitcher />)

      await user.click(screen.getByRole('button', { name: /switch to/i }))

      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/', params: {} }, { locale: 'de', scroll: false })
    })

    it('announces the target locale to screen readers', async () => {
      const user = userEvent.setup()

      render(<LocaleSwitcher />)

      await user.click(screen.getByRole('button', { name: /switch to/i }))

      await waitFor(() => {
        const liveRegion = document.querySelector('output')
        expect(liveRegion).toHaveTextContent('Language changed to English')
      })
    })
  })

  describe('Localized Slug Resolution', () => {
    it.each(['/news/[slug]', '/projects/[slug]'] as const)(
      'resolves target-locale slug before navigating on %s routes',
      async (routePathname) => {
        const user = userEvent.setup()
        const { useRouter, usePathname } = await import('@/i18n/navigation')
        const { useParams } = await import('next/navigation')
        const { resolvePostSlugInLocale } = await import('@/actions/posts')

        const mockReplace = vi.fn()
        vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
        vi.mocked(usePathname).mockReturnValue(routePathname)
        vi.mocked(useParams).mockReturnValue({ locale: 'de', slug: 'konzert-in-wien' })
        vi.mocked(resolvePostSlugInLocale).mockResolvedValue('concert-in-vienna')

        render(<LocaleSwitcher />)
        await user.click(screen.getByRole('button', { name: /switch to/i }))

        await waitFor(() => {
          expect(resolvePostSlugInLocale).toHaveBeenCalledWith('konzert-in-wien', 'de', 'en')
          expect(mockReplace).toHaveBeenCalledWith(
            { pathname: routePathname, params: { slug: 'concert-in-vienna' } },
            { locale: 'en', scroll: false }
          )
        })
      }
    )

    it('falls back to original slug when resolvePostSlugInLocale returns null', async () => {
      const user = userEvent.setup()
      const { useRouter, usePathname } = await import('@/i18n/navigation')
      const { useParams } = await import('next/navigation')
      const { resolvePostSlugInLocale } = await import('@/actions/posts')

      const mockReplace = vi.fn()
      vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
      vi.mocked(usePathname).mockReturnValue('/news/[slug]')
      vi.mocked(useParams).mockReturnValue({ locale: 'de', slug: 'german-only-post' })
      vi.mocked(resolvePostSlugInLocale).mockResolvedValue(null)

      render(<LocaleSwitcher />)
      await user.click(screen.getByRole('button', { name: /switch to/i }))

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          { pathname: '/news/[slug]', params: { slug: 'german-only-post' } },
          { locale: 'en', scroll: false }
        )
      })
    })

    it('does not call resolvePostSlugInLocale on non-news routes', async () => {
      const user = userEvent.setup()
      const { useRouter, usePathname } = await import('@/i18n/navigation')
      const { resolvePostSlugInLocale } = await import('@/actions/posts')

      vi.mocked(useRouter).mockReturnValue(buildMockRouter())
      vi.mocked(usePathname).mockReturnValue('/artists/[slug]')

      render(<LocaleSwitcher />)
      await user.click(screen.getByRole('button', { name: /switch to/i }))

      await waitFor(() => {
        expect(resolvePostSlugInLocale).not.toHaveBeenCalled()
      })
    })
  })
})
