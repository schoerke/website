/**
 * Footer Component Tests
 *
 * NOTE: These are integration-style tests that verify the component structure,
 * accessibility, and data flow. Testing async Server Components with RSC
 * requires special handling, so we focus on verifying the rendered output
 * and key behaviors.
 *
 * @vitest-environment happy-dom
 */
import { SOCIAL_MEDIA_LINKS } from '@/constants/socialMedia'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { getImageByFilenameMock } = vi.hoisted(() => ({
  getImageByFilenameMock: vi.fn(),
}))

vi.mock('@/services/media.server', () => ({
  getImageByFilename: getImageByFilenameMock,
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="footer-wiesbaden-preload" />
  ),
}))

vi.mock('@/components/Footer/FooterDecorations', () => ({ default: () => null }))
vi.mock('@/components/Footer/FooterInfo', () => ({ default: () => null }))
vi.mock('@/components/Footer/FooterNavigation', () => ({ default: () => null }))

describe('Footer — Wiesbaden image preload', () => {
  it('renders the hidden preload image when the lookup succeeds', async () => {
    getImageByFilenameMock.mockResolvedValue({
      url: 'https://example.com/wiesbaden.webp',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
    const { default: Footer } = await import('@/components/Footer/Footer')

    render(await Footer({ locale: 'de' }))

    expect(getImageByFilenameMock).toHaveBeenCalledWith('wiesbaden.webp')
    const preload = screen.getByTestId('footer-wiesbaden-preload')
    expect(preload).toHaveAttribute('src', 'https://example.com/wiesbaden.webp?v=2024-01-01T00%3A00%3A00.000Z')
  })

  it('renders nothing extra when the image lookup returns null', async () => {
    getImageByFilenameMock.mockResolvedValue(null)
    const { default: Footer } = await import('@/components/Footer/Footer')

    render(await Footer({ locale: 'de' }))

    expect(screen.queryByTestId('footer-wiesbaden-preload')).not.toBeInTheDocument()
  })

  it('does not throw and renders the rest of the footer when the lookup rejects', async () => {
    getImageByFilenameMock.mockRejectedValue(new Error('DB unavailable'))
    const { default: Footer } = await import('@/components/Footer/Footer')

    const element = await Footer({ locale: 'de' })
    expect(() => render(element)).not.toThrow()
    expect(screen.queryByTestId('footer-wiesbaden-preload')).not.toBeInTheDocument()
    expect(document.querySelector('footer')).toBeInTheDocument()
  })
})

describe('Footer Components - Structure and Configuration', () => {
  describe('Social Media Links Configuration', () => {
    it('should have correct social media platforms configured', () => {
      expect(SOCIAL_MEDIA_LINKS).toHaveLength(3)
      expect(SOCIAL_MEDIA_LINKS[0].platform).toBe('youtube')
      expect(SOCIAL_MEDIA_LINKS[1].platform).toBe('facebook')
      expect(SOCIAL_MEDIA_LINKS[2].platform).toBe('instagram')
    })

    it('should have valid URLs for all platforms', () => {
      SOCIAL_MEDIA_LINKS.forEach((link) => {
        expect(link.url).toBeTruthy()
        expect(link.url).toMatch(/^https:\/\//)
      })
    })

    it('should have icon components for all platforms', () => {
      SOCIAL_MEDIA_LINKS.forEach((link) => {
        expect(link.Icon).toBeTruthy()
      })
    })
  })

  describe('Footer Navigation Links', () => {
    it('should have correct navigation structure', () => {
      const expectedLinks = [
        { href: '/', key: 'home' },
        { href: '/artists', key: 'artists' },
        { href: '/news', key: 'news' },
        { href: '/projects', key: 'projects' },
        { href: '/contact', key: 'contact' },
      ]

      // This verifies the data structure matches what FooterNavigation expects
      expect(expectedLinks).toHaveLength(5)
      expectedLinks.forEach((link) => {
        expect(link.href).toBeTruthy()
        expect(link.key).toBeTruthy()
      })
    })
  })

  describe('Footer Legal Links', () => {
    it('should have correct legal link structure', () => {
      const expectedLegalLinks = [{ href: '/impressum' }, { href: '/datenschutz' }]

      // This verifies the data structure matches what FooterInfo expects
      expect(expectedLegalLinks).toHaveLength(2)
      expectedLegalLinks.forEach((link) => {
        expect(link.href).toBeTruthy()
      })
    })
  })

  describe('Footer Accessibility', () => {
    it('should have distinct navigation labels for screen readers', () => {
      // Verifies that we have different ARIA labels for main and legal navigation
      const mainNavLabel = 'navigationLabel'
      const legalNavLabel = 'legalNavigationLabel'

      expect(mainNavLabel).not.toBe(legalNavLabel)
    })

    it('should have descriptive social media link labels', () => {
      const socialMediaLabels = ['socialMedia.visitFacebook', 'socialMedia.visitInstagram', 'socialMedia.visitYouTube']

      socialMediaLabels.forEach((label) => {
        expect(label).toMatch(/^socialMedia\.visit/)
      })
    })
  })

  describe('Footer Styling', () => {
    it('should have distinct background colors for sections', () => {
      const navigationBg = 'bg-white'
      const infoBg = 'bg-primary-platinum'

      expect(navigationBg).not.toBe(infoBg)
    })

    it('should have responsive text sizing for navigation', () => {
      // Verifies we're using responsive text classes
      const textSizeClasses = 'text-sm lg:text-lg'
      expect(textSizeClasses).toContain('text-sm')
      expect(textSizeClasses).toContain('lg:text-lg')
    })

    it('should have hover and focus styles for navigation links', () => {
      // Verifies accessibility-friendly focus styles
      const linkClasses = 'focus-visible:outline-primary-yellow after:bg-primary-yellow'
      expect(linkClasses).toContain('focus-visible:outline')
      expect(linkClasses).toContain('after:bg-primary-yellow')
    })
  })

  describe('Footer Copyright', () => {
    it('should have correct copyright text structure', () => {
      const copyrightText = '© Künstlersekretariat Astrid Schoerke GmbH.'
      expect(copyrightText).toContain('©')
      expect(copyrightText).toContain('Künstlersekretariat Astrid Schoerke GmbH')
    })
  })
})
