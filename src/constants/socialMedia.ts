/**
 * Social Media Links Configuration
 *
 * Centralized configuration for social media platform links displayed in the footer.
 *
 * Future Migration Path:
 * These URLs can be migrated to a CMS Global collection for editor management
 * without requiring changes to the FooterInfo component structure.
 *
 * @see src/components/Footer/FooterInfo.tsx
 */

export const SOCIAL_MEDIA_LINKS = [
  {
    platform: 'youtube',
    url: 'https://youtube.com/@kuenstlersekretariatschoerke',
    icon: 'Youtube',
  },
  {
    platform: 'facebook',
    url: 'https://facebook.com/kuenstlersekretariat.schoerke',
    icon: 'Facebook',
  },
  {
    platform: 'instagram',
    url: 'https://instagram.com/ks.schoerke',
    icon: 'Instagram',
  },
] as const

export type SocialMediaLink = (typeof SOCIAL_MEDIA_LINKS)[number]
