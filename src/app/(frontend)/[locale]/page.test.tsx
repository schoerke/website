/* @vitest-environment jsdom */

import { vi } from 'vitest'

vi.mock('@/services/homePage', () => ({ getHomePage: vi.fn() }))
vi.mock('@/services/artist', () => ({ getArtistListData: vi.fn() }))
vi.mock('@/services/post', () => ({ getPaginatedPosts: vi.fn() }))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(() => (key: string) => key),
  setRequestLocale: vi.fn(),
}))
vi.mock('next-intl', () => ({ useTranslations: vi.fn().mockImplementation(() => (key: string) => key) }))

const makeParams = (locale = 'en') => Promise.resolve({ locale })

// All homepage tests removed as requested
