/**
 * Test utilities for mocking Next.js and next-intl dependencies in component tests
 */

import { vi } from 'vitest'

/**
 * Mock next-intl's getTranslations for testing
 * Returns a translation function that returns the key or a preset value
 */
export const mockGetTranslations = (mockTranslations: Record<string, string> = {}) => {
  return vi.fn(async ({ namespace }: { namespace: string }) => {
    return (key: string) => {
      const fullKey = `${namespace}.${key}`
      return mockTranslations[fullKey] || key
    }
  })
}

/**
 * Mock next/image component for testing
 */
export const MockImage = ({ src, alt, ...props }: any) => {
  return <img src={src} alt={alt} {...props} />
}

/**
 * Mock next-intl Link component for testing
 */
export const MockLink = ({ href, children, ...props }: any) => {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}

/**
 * Setup common mocks for Footer component tests
 */
export const setupFooterMocks = () => {
  // Mock next/image
  vi.mock('next/image', () => ({
    default: MockImage,
  }))

  // Mock @/i18n/navigation
  vi.mock('@/i18n/navigation', () => ({
    Link: MockLink,
  }))

  // Mock next-intl
  vi.mock('next-intl/server', () => ({
    getTranslations: mockGetTranslations({
      'custom.pages.home.title': 'Home',
      'custom.pages.artists.title': 'Artists',
      'custom.pages.news.title': 'News',
      'custom.pages.projects.title': 'Projects',
      'custom.pages.team.title': 'Team',
      'custom.pages.contact.title': 'Contact',
      'custom.pages.impressum.title': 'Legal Notice',
      'custom.pages.datenschutz.title': 'Privacy',
      'custom.pages.brand.title': 'Branding',
      'custom.footer.navigationLabel': 'Main Navigation',
      'custom.footer.legalNavigationLabel': 'Legal Navigation',
      'custom.footer.socialMedia.visitFacebook': 'Visit us on Facebook',
      'custom.footer.socialMedia.visitTwitter': 'Visit us on Twitter',
      'custom.footer.socialMedia.visitYouTube': 'Visit us on YouTube',
    }),
  }))
}
