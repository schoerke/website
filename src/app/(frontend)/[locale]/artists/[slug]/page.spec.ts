// @vitest-environment happy-dom
import type { Artist, Repertoire } from '@/payload-types'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  artistTabs: vi.fn(),
  getArtistBySlug: vi.fn(),
  getNewsPostCountByArtist: vi.fn(),
  getRecordingCountByArtist: vi.fn(),
  getRecordingVersionByArtist: vi.fn(),
}))

vi.mock('@/components/Artist/ArtistTabs', () => ({
  default: (props: unknown) => {
    mocks.artistTabs(props)
    return null
  },
}))
vi.mock('@/components/Artist/ContactPersons', () => ({ default: () => null, MobileContactPersonsSection: () => null }))
vi.mock('@/components/ArtistLinks', () => ({ default: () => null }))
vi.mock('@/components/ui/ImageWithSkeleton', () => ({ default: () => null }))
vi.mock('@/components/ui/SchoerkeLink', () => ({ default: () => null }))
vi.mock('@/services/artist', () => ({ getArtistBySlug: mocks.getArtistBySlug, getArtistSlugs: vi.fn() }))
vi.mock('@/services/post', () => ({ getNewsPostCountByArtist: mocks.getNewsPostCountByArtist }))
vi.mock('@/services/recording', () => ({
  getRecordingCountByArtist: mocks.getRecordingCountByArtist,
  getRecordingVersionByArtist: mocks.getRecordingVersionByArtist,
}))
vi.mock('lucide-react', () => ({ ChevronLeft: () => null }))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}))
vi.mock('next/navigation', () => ({ notFound: vi.fn() }))

import ArtistDetailPage, { revalidate } from './page'

function lexicalText(text: string): Artist['biography'] {
  return {
    root: {
      type: 'root',
      children: [{ type: 'text', text, version: 1 }],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function createArtist(): Artist {
  const repertoire: Repertoire = {
    id: 2,
    title: 'Program',
    artists: [],
    content: lexicalText('Bach'),
    updatedAt: '',
    createdAt: '',
  }

  return {
    id: 1,
    name: 'Test Artist',
    slug: 'test-artist',
    instrument: [],
    biography: lexicalText('Biography'),
    repertoire: [repertoire],
    galleryImages: [{ image: { id: 3, alt: 'Photo', url: '/photo.jpg', updatedAt: '', createdAt: '' } }, { image: 4 }],
    videoLinks: [
      { label: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { label: 'Invalid', url: 'not-a-url' },
    ],
    contactPersons: [],
    updatedAt: '',
    createdAt: '',
  }
}

function findArtistTabsProps(node: React.ReactNode): Record<string, unknown> | undefined {
  if (!React.isValidElement<Record<string, unknown>>(node)) return undefined
  if ('hasRecordings' in node.props) return node.props as Record<string, unknown>

  for (const child of React.Children.toArray(node.props.children as React.ReactNode)) {
    const props = findArtistTabsProps(child)
    if (props) return props
  }

  return undefined
}

describe('ArtistDetailPage', () => {
  it('revalidates within one day so the derived concert season updates', () => {
    expect(revalidate).toBe(86400)
  })

  it('passes availability derived from rendered artist content to ArtistTabs', async () => {
    mocks.getArtistBySlug.mockResolvedValue(createArtist())
    mocks.getNewsPostCountByArtist.mockResolvedValue(1)
    mocks.getRecordingCountByArtist.mockResolvedValue(1)
    mocks.getRecordingVersionByArtist.mockResolvedValue('2026-09-04T12:00:00.000Z')

    const page = await ArtistDetailPage({ params: Promise.resolve({ slug: 'test-artist', locale: 'en' }) })

    expect(mocks.getNewsPostCountByArtist).toHaveBeenCalledWith(1, 'en')
    expect(mocks.getRecordingCountByArtist).toHaveBeenCalledWith(1, 'en')
    expect(mocks.getRecordingVersionByArtist).toHaveBeenCalledWith(1, 'en')
    expect(findArtistTabsProps(page)).toMatchObject({
      hasBiography: true,
      hasRepertoire: true,
      hasRecordings: true,
      hasImages: true,
      hasVideos: true,
      hasNews: true,
      hasProjects: false,
      recordingsVersion: '2026-09-04T12:00:00.000Z',
      recordingsCount: 1,
    })
  })

  it('hides repertoire tab availability when every repertoire is empty', async () => {
    const artist = createArtist()
    artist.repertoire = [
      {
        id: 2,
        title: 'Empty program',
        artists: [],
        content: lexicalText('   '),
        updatedAt: '',
        createdAt: '',
      },
    ]
    mocks.getArtistBySlug.mockResolvedValue(artist)
    mocks.getNewsPostCountByArtist.mockResolvedValue(0)
    mocks.getRecordingCountByArtist.mockResolvedValue(0)

    const page = await ArtistDetailPage({ params: Promise.resolve({ slug: 'test-artist', locale: 'en' }) })

    expect(findArtistTabsProps(page)).toMatchObject({ hasRepertoire: false })
  })
})
