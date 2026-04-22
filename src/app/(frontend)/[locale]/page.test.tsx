/* @vitest-environment jsdom */

import { vi } from 'vitest'

vi.mock('@/services/homePage', () => ({ getHomePage: vi.fn() }))
vi.mock('@/services/artist', () => ({ getArtistListData: vi.fn() }))
vi.mock('@/services/post', () => ({ getPaginatedPosts: vi.fn() }))
vi.mock('@/services/media', () => ({ getDefaultAvatar: vi.fn().mockReturnValue('/avatar.jpg') }))
vi.mock('@/components/HomePageSlider/HomePageSlider', () => ({
  default: ({ slides }: { slides: { title: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'homepage-slider' },
      slides.map((s) => React.createElement('span', { key: s.title }, s.title))
    ),
}))
vi.mock('@/components/Artist/ArtistMasonryGrid', () => ({
  default: ({ artists }: { artists: { id: string; name: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'artist-masonry-grid' },
      artists.map((a) => React.createElement('span', { key: a.id }, a.name))
    ),
}))
vi.mock('@/components/ui/SchoerkeLink', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(() => (key: string) => key),
  setRequestLocale: vi.fn(),
}))
vi.mock('next-intl', () => ({ useTranslations: vi.fn().mockImplementation(() => (key: string) => key) }))
vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['de', 'en'],
    defaultLocale: 'de',
    pathnames: {
      '/kontakt': { de: '/kontakt', en: '/contact' },
    },
  },
}))

import { getArtistListData } from '@/services/artist'
import { getHomePage } from '@/services/homePage'
import { getPaginatedPosts } from '@/services/post'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import HomePage from './page'

const makeParams = (locale = 'en') => Promise.resolve({ locale })

const mockHomePageGlobal = { artistsIntro: '', teamIntro: '', contactIntro: '' }

const mockPost = (id: string, title: string) => ({
  id,
  title,
  slug: `slug-${id}`,
  categories: ['home'],
  image: { url: `/img/${id}.jpg`, focalX: 50, focalY: 50 },
})

const mockArtist = (id: string, name: string) => ({ id, name })

beforeEach(() => {
  vi.mocked(getHomePage).mockResolvedValue(mockHomePageGlobal as never)
  vi.mocked(getPaginatedPosts).mockResolvedValue({ docs: [], totalDocs: 0, totalPages: 0, page: 1 } as never)
  vi.mocked(getArtistListData).mockResolvedValue({ docs: [], totalDocs: 0 } as never)
})

describe('HomePage', () => {
  describe('news section', () => {
    it('renders the news slider when posts are returned', async () => {
      vi.mocked(getPaginatedPosts).mockResolvedValue({
        docs: [mockPost('1', 'Post One'), mockPost('2', 'Post Two')],
        totalDocs: 2,
        totalPages: 1,
        page: 1,
      } as never)

      render(await HomePage({ params: makeParams() }))

      expect(screen.getByTestId('homepage-slider')).toBeInTheDocument()
      expect(screen.getByText('Post One')).toBeInTheDocument()
      expect(screen.getByText('Post Two')).toBeInTheDocument()
    })

    it('does not render the news section when there are no posts', async () => {
      render(await HomePage({ params: makeParams() }))

      expect(screen.queryByTestId('homepage-slider')).not.toBeInTheDocument()
      expect(screen.queryByText('newsHeading')).not.toBeInTheDocument()
    })

    it('falls back to placeholder image when post has no valid image url', async () => {
      const postNoImage = { ...mockPost('3', 'No Image Post'), image: null }
      vi.mocked(getPaginatedPosts).mockResolvedValue({
        docs: [postNoImage],
        totalDocs: 1,
        totalPages: 1,
        page: 1,
      } as never)

      // Should render without throwing
      render(await HomePage({ params: makeParams() }))
      expect(screen.getByTestId('homepage-slider')).toBeInTheDocument()
    })

    it('categorises posts with "projects" category as /projects/ links', async () => {
      const projectPost = { ...mockPost('4', 'Project Post'), categories: ['projects'], slug: 'my-project' }
      vi.mocked(getPaginatedPosts).mockResolvedValue({
        docs: [projectPost],
        totalDocs: 1,
        totalPages: 1,
        page: 1,
      } as never)

      render(await HomePage({ params: makeParams() }))
      expect(screen.getByTestId('homepage-slider')).toBeInTheDocument()
    })
  })

  describe('artist roster section', () => {
    it('renders the masonry grid when artists are returned', async () => {
      vi.mocked(getArtistListData).mockResolvedValue({
        docs: [mockArtist('a1', 'Artist One'), mockArtist('a2', 'Artist Two')],
        totalDocs: 2,
      } as never)

      render(await HomePage({ params: makeParams() }))

      expect(screen.getByTestId('artist-masonry-grid')).toBeInTheDocument()
      expect(screen.getByText('Artist One')).toBeInTheDocument()
      expect(screen.getByText('Artist Two')).toBeInTheDocument()
    })

    it('does not render the artist section when there are no artists', async () => {
      render(await HomePage({ params: makeParams() }))

      expect(screen.queryByTestId('artist-masonry-grid')).not.toBeInTheDocument()
    })
  })

  describe('team and contact sections', () => {
    it('always renders the team and contact CTA sections', async () => {
      render(await HomePage({ params: makeParams() }))

      expect(screen.getByText('teamHeading')).toBeInTheDocument()
      expect(screen.getByText('contactHeading')).toBeInTheDocument()
    })

    it('renders custom artistsIntro from CMS when provided', async () => {
      vi.mocked(getHomePage).mockResolvedValue({ ...mockHomePageGlobal, artistsIntro: 'Custom artist intro' } as never)
      vi.mocked(getArtistListData).mockResolvedValue({ docs: [mockArtist('a1', 'Someone')], totalDocs: 1 } as never)

      render(await HomePage({ params: makeParams() }))

      expect(screen.getByText('Custom artist intro')).toBeInTheDocument()
    })

    it('falls back to translation key when artistsIntro is empty', async () => {
      vi.mocked(getArtistListData).mockResolvedValue({ docs: [mockArtist('a1', 'Someone')], totalDocs: 1 } as never)

      render(await HomePage({ params: makeParams() }))

      expect(screen.getByText('artistsBlurb')).toBeInTheDocument()
    })

    it('renders custom teamIntro from CMS when provided', async () => {
      vi.mocked(getHomePage).mockResolvedValue({ ...mockHomePageGlobal, teamIntro: 'Custom team intro' } as never)

      render(await HomePage({ params: makeParams() }))

      expect(screen.getByText('Custom team intro')).toBeInTheDocument()
    })

    it('renders custom contactIntro from CMS when provided', async () => {
      vi.mocked(getHomePage).mockResolvedValue({ ...mockHomePageGlobal, contactIntro: 'Custom contact intro' } as never)

      render(await HomePage({ params: makeParams() }))

      expect(screen.getByText('Custom contact intro')).toBeInTheDocument()
    })
  })

  describe('locale handling', () => {
    it('accepts a valid "de" locale', async () => {
      render(await HomePage({ params: makeParams('de') }))
      expect(screen.getByText('teamHeading')).toBeInTheDocument()
    })

    it('falls back to default locale for an unknown locale', async () => {
      render(await HomePage({ params: makeParams('fr') }))
      expect(screen.getByText('teamHeading')).toBeInTheDocument()
    })
  })
})
