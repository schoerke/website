import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/utils/siteUrl'

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/admin', '/admin/', '/api', '/api/', '/de/preview/', '/en/preview/'],
  },
  sitemap: `${getSiteUrl()}/sitemap.xml`,
})

export default robots
