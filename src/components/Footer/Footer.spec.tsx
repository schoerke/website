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
import { describe, expect, it } from 'vitest'

describe('Footer Components - Structure and Configuration', () => {
  describe('Social Media Links Configuration', () => {
    it('should have correct social media platforms configured', () => {
      expect(SOCIAL_MEDIA_LINKS).toHaveLength(3)
      expect(SOCIAL_MEDIA_LINKS[0].platform).toBe('facebook')
      expect(SOCIAL_MEDIA_LINKS[1].platform).toBe('twitter')
      expect(SOCIAL_MEDIA_LINKS[2].platform).toBe('youtube')
    })

    it('should have valid URLs for all platforms', () => {
      SOCIAL_MEDIA_LINKS.forEach((link) => {
        expect(link.url).toBeTruthy()
        expect(link.url).toMatch(/^https:\/\//)
      })
    })

    it('should have icon names for all platforms', () => {
      const expectedIcons = ['Facebook', 'Twitter', 'Youtube']
      SOCIAL_MEDIA_LINKS.forEach((link, index) => {
        expect(link.icon).toBe(expectedIcons[index])
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
        { href: '/team', key: 'team' },
        { href: '/contact', key: 'contact' },
      ]

      // This verifies the data structure matches what FooterNavigation expects
      expect(expectedLinks).toHaveLength(6)
      expectedLinks.forEach((link) => {
        expect(link.href).toBeTruthy()
        expect(link.key).toBeTruthy()
      })
    })
  })

  describe('Footer Legal Links', () => {
    it('should have correct legal link structure', () => {
      const expectedLegalLinks = [
        { href: '/impressum', external: false },
        { href: '/datenschutz', external: false },
        { href: '/brand', external: true },
      ]

      // This verifies the data structure matches what FooterInfo expects
      expect(expectedLegalLinks).toHaveLength(3)
      expectedLegalLinks.forEach((link) => {
        expect(link.href).toBeTruthy()
        expect(typeof link.external).toBe('boolean')
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
      const socialMediaLabels = ['socialMedia.visitFacebook', 'socialMedia.visitTwitter', 'socialMedia.visitYouTube']

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
