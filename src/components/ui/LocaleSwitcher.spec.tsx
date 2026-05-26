/**
 * LocaleSwitcher Component Tests
 *
 * Tests the language switching component including:
 * - Visual rendering and layout
 * - Keyboard interactions (Escape key)
 * - Focus management
 * - Accessibility features (ARIA attributes, screen reader announcements)
 * - Click outside to close behavior
 * - Route change behavior
 *
 * @vitest-environment happy-dom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
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
  // Controlled wrapper — LocaleSwitcher now requires open/onOpenChange props
  function LocaleSwitcherWrapper() {
    const [open, setOpen] = React.useState(false)
    return <LocaleSwitcher open={open} onOpenChange={setOpen} />
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders closed state with DE/EN button', () => {
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('DE')
      expect(button).toHaveTextContent('EN')
    })

    it('shows current locale in bold', () => {
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      const boldText = button.querySelector('.font-bold')
      expect(boldText).toHaveTextContent('DE')
    })

    it('has aria-expanded=false when closed', () => {
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('includes current language in aria-label', () => {
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /current: Deutsch/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Opening the Drawer', () => {
    it('shows language options when clicked', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      await user.click(button)

      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    })

    it('has aria-expanded=true when open', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('displays navigation with aria-label', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      await user.click(button)

      const nav = screen.getByRole('navigation', { name: 'Language selector' })
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Language Options', () => {
    it('marks current language with aria-current', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))

      const deutschButton = screen.getByRole('button', { name: 'Deutsch' })
      expect(deutschButton).toHaveAttribute('aria-current', 'page')
    })

    it('applies bold styling to current language', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))

      const deutschButton = screen.getByRole('button', { name: 'Deutsch' })
      expect(deutschButton).toHaveClass('font-bold', 'text-gray-900')
    })

    it('has lang attribute for each language option', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))

      const deutschButton = screen.getByRole('button', { name: 'Deutsch' })
      const englishButton = screen.getByRole('button', { name: 'English' })

      expect(deutschButton).toHaveAttribute('lang', 'de')
      expect(englishButton).toHaveAttribute('lang', 'en')
    })
  })

  describe('Keyboard Interactions', () => {
    it('closes drawer on Escape key', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      // Open drawer
      const button = screen.getByRole('button', { name: /Select language/i })
      await user.click(button)
      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()

      // Press Escape
      await user.keyboard('{Escape}')

      // Drawer should be closed
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Deutsch' })).not.toBeInTheDocument()
      })
    })

    it('does not close on Escape when already closed', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })

      // Press Escape while closed
      await user.keyboard('{Escape}')

      // Button should still be there
      expect(button).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('focuses first language option when drawer opens', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      await user.click(button)

      await waitFor(() => {
        const deutschButton = screen.getByRole('button', { name: 'Deutsch' })
        expect(deutschButton).toHaveFocus()
      })
    })
  })

  describe('Click Outside Behavior', () => {
    it('closes drawer when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <LocaleSwitcherWrapper />
          <div data-testid="outside">Outside element</div>
        </div>
      )

      // Open drawer
      await user.click(screen.getByRole('button', { name: /Select language/i }))
      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()

      // Click outside
      const outside = screen.getByTestId('outside')
      await user.click(outside)

      // Drawer should be closed
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Deutsch' })).not.toBeInTheDocument()
      })
    })

    it('stays open when clicking inside drawer', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      // Open drawer
      await user.click(screen.getByRole('button', { name: /Select language/i }))

      // Click on a language option area (but not the button)
      const nav = screen.getByRole('navigation', { name: 'Language selector' })
      await user.click(nav)

      // Drawer should still be open
      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('has ARIA live region for announcements', () => {
      render(<LocaleSwitcherWrapper />)

      const liveRegion = document.querySelector('output[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('has sr-only class on announcement region', () => {
      render(<LocaleSwitcherWrapper />)

      const liveRegion = document.querySelector('output')
      expect(liveRegion).toHaveClass('sr-only')
    })

    it('announces language change when switching locales', async () => {
      const user = userEvent.setup()
      const { useRouter } = await import('@/i18n/navigation')
      const mockReplace = vi.fn()
      const mockRouter = {
        push: vi.fn(),
        replace: mockReplace,
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
      }
      vi.mocked(useRouter).mockReturnValue(mockRouter)

      render(<LocaleSwitcherWrapper />)

      // Open drawer and click English
      await user.click(screen.getByRole('button', { name: /Select language/i }))
      await user.click(screen.getByRole('button', { name: 'English' }))

      // Check that announcement was made
      await waitFor(() => {
        const liveRegion = document.querySelector('output')
        expect(liveRegion).toHaveTextContent('Language changed to English')
      })
    })
  })

  describe('Locale Switching', () => {
    it('calls router.replace with correct locale when clicking language', async () => {
      const user = userEvent.setup()
      const { useRouter } = await import('@/i18n/navigation')
      const mockReplace = vi.fn()
      const mockRouter = {
        push: vi.fn(),
        replace: mockReplace,
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
      }
      vi.mocked(useRouter).mockReturnValue(mockRouter)

      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))
      await user.click(screen.getByRole('button', { name: 'English' }))

      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/', params: {} }, { locale: 'en', scroll: false })
    })

    it('closes drawer after selecting a language', async () => {
      const user = userEvent.setup()
      const { useRouter } = await import('@/i18n/navigation')
      const mockReplace = vi.fn()
      const mockRouter = {
        push: vi.fn(),
        replace: mockReplace,
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
      }
      vi.mocked(useRouter).mockReturnValue(mockRouter)

      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))
      await user.click(screen.getByRole('button', { name: 'English' }))

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Deutsch' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Route Change Behavior', () => {
    it('closes drawer when pathname changes', async () => {
      const user = userEvent.setup()
      const { usePathname } = await import('@/i18n/navigation')

      // Start with pathname '/'
      vi.mocked(usePathname).mockReturnValue('/')

      const { rerender } = render(<LocaleSwitcherWrapper />)

      // Open drawer
      await user.click(screen.getByRole('button', { name: /Select language/i }))
      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()

      // Simulate pathname change
      vi.mocked(usePathname).mockReturnValue('/artists')
      rerender(<LocaleSwitcherWrapper />)

      // Drawer should be closed
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Deutsch' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Visual Styling', () => {
    it('has consistent padding in both states', () => {
      render(<LocaleSwitcherWrapper />)

      const container = document.querySelector('.px-4')
      expect(container).toBeInTheDocument()
    })

    it('expands to correct width when open', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      const button = screen.getByRole('button', { name: /Select language/i })
      await user.click(button)

      const expandedContainer = document.querySelector('.w-56')
      expect(expandedContainer).toBeInTheDocument()
    })

    it('uses justify-end for consistent positioning', () => {
      render(<LocaleSwitcherWrapper />)

      const container = document.querySelector('.justify-end')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Localized Slug Resolution', () => {
    const buildMockRouter = (mockReplace = vi.fn()) => ({
      push: vi.fn(),
      replace: mockReplace,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    })

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

        render(<LocaleSwitcherWrapper />)
        await user.click(screen.getByRole('button', { name: /Select language/i }))
        await user.click(screen.getByRole('button', { name: 'English' }))

        await waitFor(() => {
          expect(resolvePostSlugInLocale).toHaveBeenCalledWith('konzert-in-wien', 'de', 'en')
          expect(mockReplace).toHaveBeenCalledWith(
            { pathname: routePathname, params: { locale: 'de', slug: 'concert-in-vienna' } },
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

      render(<LocaleSwitcherWrapper />)
      await user.click(screen.getByRole('button', { name: /Select language/i }))
      await user.click(screen.getByRole('button', { name: 'English' }))

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          { pathname: '/news/[slug]', params: { locale: 'de', slug: 'german-only-post' } },
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

      render(<LocaleSwitcherWrapper />)
      await user.click(screen.getByRole('button', { name: /Select language/i }))
      await user.click(screen.getByRole('button', { name: 'English' }))

      await waitFor(() => {
        expect(resolvePostSlugInLocale).not.toHaveBeenCalled()
      })
    })
  })

  describe('Configuration', () => {
    it('supports German and English locales', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))

      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    })

    it('displays native language names', async () => {
      const user = userEvent.setup()
      render(<LocaleSwitcherWrapper />)

      await user.click(screen.getByRole('button', { name: /Select language/i }))

      // Should say "Deutsch" not "German"
      expect(screen.getByRole('button', { name: 'Deutsch' })).toBeInTheDocument()
      // Should say "English" not "Englisch"
      expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    })
  })
})
