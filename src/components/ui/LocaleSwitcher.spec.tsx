/**
 * LocaleSwitcher component tests.
 *
 * @vitest-environment happy-dom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocale } from 'next-intl'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LocaleSwitcher from './LocaleSwitcher'

vi.mock('@/i18n/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  getPathname: vi.fn(({ href, locale }) => `/${locale}${href.pathname}`),
}))

vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'de'),
}))

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
}))

vi.mock('@/actions/posts', () => ({
  resolvePostSlugInLocale: vi.fn(() => Promise.resolve(null)),
}))

const buildMockRouter = (replace = vi.fn()) => ({
  push: vi.fn(),
  replace,
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  bfcacheId: 'mock-bfcache',
})

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLocale).mockReturnValue('de')
    window.location.hash = ''
  })

  it('renders a single button with DE/EN codes', () => {
    render(<LocaleSwitcher />)

    const button = screen.getByRole('button', { name: /switch to English/i })
    expect(button).toHaveTextContent('DE')
    expect(button).toHaveTextContent('EN')
    expect(button.querySelector('.font-bold')).toHaveTextContent('DE')
  })

  it('switches to English in one click', async () => {
    const user = userEvent.setup()
    const { useRouter } = await import('next/navigation')
    const mockReplace = vi.fn()
    vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))

    render(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch to/i }))

    expect(mockReplace).toHaveBeenCalledWith('/en/', { scroll: false })
  })

  it('navigates to localized artist path with active hash', async () => {
    const user = userEvent.setup()
    const { getPathname, usePathname } = await import('@/i18n/navigation')
    const { useParams, useRouter } = await import('next/navigation')
    const mockReplace = vi.fn()
    vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
    vi.mocked(usePathname).mockReturnValue('/artists/[slug]')
    vi.mocked(useParams).mockReturnValue({ locale: 'en', slug: 'test-artist' })
    vi.mocked(useLocale).mockReturnValue('en')
    vi.mocked(getPathname).mockReturnValue('/de/artists/test-artist')
    window.location.hash = '#discography'

    render(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch to/i }))

    expect(mockReplace).toHaveBeenCalledWith('/de/artists/test-artist#discography', { scroll: false })
  })

  it('uses generated localized target and latest hash after delayed post slug resolution', async () => {
    const user = userEvent.setup()
    const { getPathname, usePathname } = await import('@/i18n/navigation')
    const { useParams, useRouter } = await import('next/navigation')
    const { resolvePostSlugInLocale } = await import('@/actions/posts')
    const mockReplace = vi.fn()
    let resolveSlug: (slug: string) => void
    const slugPromise = new Promise<string>((resolve) => {
      resolveSlug = resolve
    })
    vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
    vi.mocked(usePathname).mockReturnValue('/news/[slug]')
    vi.mocked(useParams).mockReturnValue({ locale: 'de', slug: 'konzert-in-wien' })
    vi.mocked(resolvePostSlugInLocale).mockReturnValue(slugPromise)
    vi.mocked(getPathname).mockReturnValue('/en/news/concert-in-vienna')
    window.location.hash = '#biography'

    render(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch to/i }))
    window.location.hash = '#discography'
    resolveSlug!('concert-in-vienna')

    await waitFor(() => {
      expect(getPathname).toHaveBeenCalledWith({
        href: { pathname: '/news/[slug]', params: { slug: 'concert-in-vienna' } },
        locale: 'en',
        forcePrefix: true,
      })
      expect(mockReplace).toHaveBeenCalledWith('/en/news/concert-in-vienna#discography', { scroll: false })
    })
  })

  it('starts one slug resolution while navigation is pending', async () => {
    const user = userEvent.setup()
    const { usePathname } = await import('@/i18n/navigation')
    const { useParams } = await import('next/navigation')
    const { resolvePostSlugInLocale } = await import('@/actions/posts')
    let resolveSlug: (slug: string) => void
    const slugPromise = new Promise<string>((resolve) => {
      resolveSlug = resolve
    })
    vi.mocked(usePathname).mockReturnValue('/news/[slug]')
    vi.mocked(useParams).mockReturnValue({ locale: 'de', slug: 'konzert-in-wien' })
    vi.mocked(resolvePostSlugInLocale).mockReturnValue(slugPromise)

    render(<LocaleSwitcher />)
    const button = screen.getByRole('button', { name: /switch to/i })
    await user.click(button)
    await user.click(button)

    expect(resolvePostSlugInLocale).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    resolveSlug!('concert-in-vienna')
  })

  it('navigates once after deferred slug resolution in StrictMode', async () => {
    const user = userEvent.setup()
    const { usePathname } = await import('@/i18n/navigation')
    const { useParams, useRouter } = await import('next/navigation')
    const { resolvePostSlugInLocale } = await import('@/actions/posts')
    const mockReplace = vi.fn()
    let resolveSlug: (slug: string) => void
    const slugPromise = new Promise<string>((resolve) => {
      resolveSlug = resolve
    })
    vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
    vi.mocked(usePathname).mockReturnValue('/news/[slug]')
    vi.mocked(useParams).mockReturnValue({ locale: 'de', slug: 'konzert-in-wien' })
    vi.mocked(resolvePostSlugInLocale).mockReturnValue(slugPromise)

    render(
      <StrictMode>
        <LocaleSwitcher />
      </StrictMode>
    )
    await user.click(screen.getByRole('button', { name: /switch to/i }))
    resolveSlug!('concert-in-vienna')

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
  })

  it('does not navigate when slug resolution completes after unmount', async () => {
    const user = userEvent.setup()
    const { usePathname } = await import('@/i18n/navigation')
    const { useParams, useRouter } = await import('next/navigation')
    const { resolvePostSlugInLocale } = await import('@/actions/posts')
    const mockReplace = vi.fn()
    let resolveSlug: (slug: string) => void
    const slugPromise = new Promise<string>((resolve) => {
      resolveSlug = resolve
    })
    vi.mocked(useRouter).mockReturnValue(buildMockRouter(mockReplace))
    vi.mocked(usePathname).mockReturnValue('/news/[slug]')
    vi.mocked(useParams).mockReturnValue({ locale: 'de', slug: 'konzert-in-wien' })
    vi.mocked(resolvePostSlugInLocale).mockReturnValue(slugPromise)

    const { unmount } = render(<LocaleSwitcher />)
    await user.click(screen.getByRole('button', { name: /switch to/i }))
    unmount()
    resolveSlug!('concert-in-vienna')

    await Promise.resolve()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
