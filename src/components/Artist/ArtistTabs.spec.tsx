// @vitest-environment happy-dom
import type { Artist, Recording, Repertoire } from '@/payload-types'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArtistTabs from './ArtistTabs'

// Radix Select relies on pointer-capture / scrollIntoView APIs that
// happy-dom doesn't implement — stub them so the mobile dropdown can open
// in tests.
beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false)
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {})
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {})
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})
})

/**
 * Opens the mobile tab dropdown by clicking its trigger button (the button
 * whose accessible name matches the currently active tab label).
 */
async function openMobileTabSelect(user: ReturnType<typeof userEvent.setup>, activeLabel: string) {
  const trigger = screen.getByRole('combobox', { name: activeLabel })
  await user.click(trigger)
}

// Mock server actions
vi.mock('@/actions/recordings', () => ({
  fetchRecordingsByArtist: vi.fn(),
}))

// Mock NewsFeedClient
vi.mock('../NewsFeed/NewsFeedClient', () => ({
  default: ({ category, artistId, emptyMessage }: { category: string; artistId: string; emptyMessage: string }) => (
    <div data-testid={`newsfeed-${category}`}>
      NewsFeed: {category} - Artist: {artistId} - {emptyMessage}
    </div>
  ),
}))

// Mock ArtistTabContent components
interface BiographyContent {
  root: {
    type: string
    children: unknown[]
    direction: ('ltr' | 'rtl') | null
    format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | ''
    indent: number
    version: number
  }
  [k: string]: unknown
}

vi.mock('./ArtistTabContent', () => ({
  BiographyTab: ({
    content,
    quote,
    season,
    quoteSource,
    image,
  }: {
    content?: BiographyContent
    quote?: string | null
    season?: string
    quoteSource?: string | null
    image?: Artist['image']
  }) => (
    <div data-testid="biography-tab">
      Biography: {content ? 'Has content' : 'No bio'} - Quote: {quote || 'No quote'} - Season: {season || 'No season'}
      - Source: {quoteSource || 'No source'} - Image: {image ? 'Has image' : 'No image'}
    </div>
  ),
  RepertoireTab: ({
    repertoires,
    loading,
    emptyMessage,
  }: {
    repertoires: Repertoire[]
    loading: boolean
    emptyMessage: string
  }) => (
    <div data-testid="repertoire-tab">
      {loading ? 'Loading...' : repertoires.length > 0 ? `${repertoires.length} repertoires` : emptyMessage}
    </div>
  ),
  RecordingsTab: ({
    recordings,
    loading,
    emptyMessage,
  }: {
    recordings: Recording[]
    loading: boolean
    emptyMessage: string
  }) => (
    <div data-testid="recordings-tab">
      {loading ? 'Loading...' : recordings.length > 0 ? `${recordings.length} recordings` : emptyMessage}
    </div>
  ),
  MediaTab: ({
    images,
    videos,
    emptyMessage,
    section,
  }: {
    images?: unknown[]
    videos?: Array<{ url: string }>
    emptyMessage: string
    section?: string
    onSectionChange?: (section: string) => void
  }) => (
    <div data-testid="media-tab">
      {section === 'videos'
        ? videos && videos.length > 0
          ? `${videos.length} videos`
          : emptyMessage
        : images && images.length > 0
          ? `${images.length} images`
          : emptyMessage}
    </div>
  ),
  ProjectsTab: ({ projects, emptyMessage }: { projects: unknown[]; emptyMessage: string }) => (
    <div data-testid="projects-tab">{projects.length > 0 ? `${projects.length} projects` : emptyMessage}</div>
  ),
}))

const testMessages = {
  custom: {
    pages: {
      artist: {
        tabs: {
          biography: 'Biography',
          repertoire: 'Repertoire',
          discography: 'Discography',
          media: 'Media',
          news: 'News',
          projects: 'Projects',
        },
        empty: {
          repertoire: 'No repertoire available',
          discography: 'No recordings available',
          media: 'No media available',
          news: 'No news available',
          projects: 'No projects available',
        },
      },
    },
  },
}

const createMockArtist = (overrides?: Partial<Artist>): Artist => ({
  id: 1,
  name: 'Test Artist',
  slug: 'test-artist',
  biography: {
    root: {
      type: 'root',
      children: [],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  },
  quote: 'Test quote',
  instrument: [],
  videoLinks: [{ label: 'Test Video', url: 'https://youtube.com/watch?v=123' }],
  galleryImages: [],
  contactPersons: [],
  updatedAt: '2023-01-01T00:00:00.000Z',
  createdAt: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

const createMockRecording = (overrides?: Partial<Recording>): Recording => ({
  id: 1,
  title: 'Test Recording',
  artists: [],
  roles: ['conductor'],
  updatedAt: '2023-01-01T00:00:00.000Z',
  createdAt: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

const createMockRepertoire = (overrides?: Partial<Repertoire>): Repertoire => ({
  id: 1,
  title: 'Test Piece',
  artists: [],
  content: {
    root: {
      type: 'root',
      children: [],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  },
  updatedAt: '2023-01-01T00:00:00.000Z',
  createdAt: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<NextIntlTestProvider messages={testMessages}>{ui}</NextIntlTestProvider>)
}

describe('ArtistTabs', async () => {
  const { fetchRecordingsByArtist } = await import('@/actions/recordings')

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.location.hash
    window.location.hash = ''
    sessionStorage.clear()
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Initial rendering', () => {
    it('should render biography tab by default', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      expect(screen.getByText(/Biography: Has content/)).toBeInTheDocument()
    })

    it('forwards biography footer props', () => {
      const image = { id: 1, alt: 'Portrait', url: '/portrait.jpg', updatedAt: '', createdAt: '' }
      const artist = createMockArtist({ quoteSource: 'Interview', image })

      renderWithIntl(
        <ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} season="2026/2027" />
      )

      expect(screen.getByTestId('biography-tab')).toHaveTextContent(/Season: 2026\/2027- Source: Interview - Image: Has image/)
    })

    it('should render all tab buttons', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      // Desktop always renders every tab as a button. The mobile dropdown
      // only shows the active tab's label in its closed trigger — other
      // labels aren't in the DOM until the dropdown is opened.
      expect(screen.getAllByText('Biography')).toHaveLength(2) // Desktop button + mobile trigger
      expect(screen.getAllByText('Repertoire')).toHaveLength(1)
      expect(screen.getAllByText('Discography')).toHaveLength(1)
      expect(screen.getAllByText('Media')).toHaveLength(1)
      expect(screen.getAllByText('News')).toHaveLength(1)
      expect(screen.getAllByText('Projects')).toHaveLength(1)
    })

    it('should reveal every tab option when the mobile dropdown is opened', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      await openMobileTabSelect(user, 'Biography')

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Repertoire' })).toBeInTheDocument()
      })
      expect(screen.getByRole('option', { name: 'Discography' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Media' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'News' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Projects' })).toBeInTheDocument()
    })

    it('should switch tabs when an option is selected from the mobile dropdown', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist({ repertoire: [createMockRepertoire()] })
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      await openMobileTabSelect(user, 'Biography')
      await user.click(await screen.findByRole('option', { name: 'Repertoire' }))

      await waitFor(() => {
        expect(screen.getByTestId('repertoire-tab')).toBeInTheDocument()
      })
      // Trigger should now reflect the newly selected tab
      expect(screen.getByRole('combobox', { name: 'Repertoire' })).toBeInTheDocument()
    })
  })

  describe('Tab switching', () => {
    it('should switch to repertoire tab when clicked', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist({ repertoire: [createMockRepertoire()] })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      // Click repertoire tab (use first one - desktop)
      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('repertoire-tab')).toBeInTheDocument()
      })
    })

    it('should switch to media tab when clicked', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const mediaTabs = screen.getAllByText('Media')
      await user.click(mediaTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('media-tab')).toBeInTheDocument()
      })
    })

    it('should update URL hash when tab changes', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const mediaTabs = screen.getAllByText('Media')
      await user.click(mediaTabs[0])

      expect(window.location.hash).toBe('#media-images')
    })
  })

  describe('Lazy loading - Recordings', () => {
    it('should fetch recordings when discography tab is clicked', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      const mockRecordings = [createMockRecording({ id: 1 }), createMockRecording({ id: 2 })]

      vi.mocked(fetchRecordingsByArtist).mockResolvedValue({
        docs: mockRecordings,
        totalDocs: 2,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      // Initially, recordings should not be fetched
      expect(fetchRecordingsByArtist).not.toHaveBeenCalled()

      // Click discography tab
      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('recordings-tab')).toBeInTheDocument()
      })

      // Should fetch recordings
      expect(fetchRecordingsByArtist).toHaveBeenCalledWith('1', 'en')

      // Should display recordings
      await waitFor(() => {
        expect(screen.getByText('2 recordings')).toBeInTheDocument()
      })
    })

    it('should not fetch recordings again when switching back to discography tab', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist).mockResolvedValue({
        docs: [createMockRecording()],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      // Click discography tab
      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledTimes(1)
      })

      // Switch to another tab
      const mediaTabs = screen.getAllByText('Media')
      await user.click(mediaTabs[0])

      // Switch back to discography
      await user.click(discographyTabs[0])

      // Should not fetch again
      expect(fetchRecordingsByArtist).toHaveBeenCalledTimes(1)
    })

    it('should handle recordings fetch error gracefully', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist).mockRejectedValue(new Error('Network error'))

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(screen.getByText('No recordings available')).toBeInTheDocument()
      })

      expect(console.error).toHaveBeenCalledWith('Failed to fetch recordings:', expect.any(Error))
    })

    it('should show empty message when no recordings', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist).mockResolvedValue({
        docs: [],
        totalDocs: 0,
        limit: 10,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(screen.getByText('No recordings available')).toBeInTheDocument()
      })
    })

    it('should refetch recordings when navigating to a different artist while on discography', async () => {
      const user = userEvent.setup()
      const artistA = createMockArtist({ id: 1 })
      const artistB = createMockArtist({ id: 2 })

      vi.mocked(fetchRecordingsByArtist).mockResolvedValue({
        docs: [createMockRecording()],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const { rerender } = renderWithIntl(<ArtistTabs artist={artistA} locale="en" hasNews={true} hasProjects={true} />)

      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledWith('1', 'en')
      })

      // Navigate to a different artist (same locale) — recordings must refetch
      rerender(
        <NextIntlTestProvider messages={testMessages} locale="en">
          <ArtistTabs artist={artistB} locale="en" hasNews={true} hasProjects={true} />
        </NextIntlTestProvider>
      )

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledWith('2', 'en')
      })
    })

    it('should retry recordings fetch after an error when revisiting the discography tab', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          docs: [createMockRecording()],
          totalDocs: 1,
          limit: 10,
          totalPages: 1,
          page: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(screen.getByText('No recordings available')).toBeInTheDocument()
      })

      // Leave and re-enter the tab — should retry the failed fetch
      await user.click(screen.getAllByText('Media')[0])
      await user.click(screen.getAllByText('Discography')[0])

      await waitFor(() => {
        expect(screen.getByText('1 recordings')).toBeInTheDocument()
      })
      expect(fetchRecordingsByArtist).toHaveBeenCalledTimes(2)
    })

    it('should keep current recordings visible while refetching after a locale change', async () => {
      type RecordingsResult = Awaited<ReturnType<typeof fetchRecordingsByArtist>>
      const user = userEvent.setup()
      const artist = createMockArtist()

      let resolveFirstFetch: ((value: RecordingsResult) => void) | undefined
      vi.mocked(fetchRecordingsByArtist).mockImplementation(
        () =>
          new Promise<RecordingsResult>((resolve) => {
            resolveFirstFetch = resolve
          })
      )

      const { rerender } = renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalled()
      })

      resolveFirstFetch?.({
        docs: [createMockRecording()],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      await waitFor(() => {
        expect(screen.getByText('1 recordings')).toBeInTheDocument()
      })

      // Locale change triggers a refetch, but existing data stays visible (no loading flash)
      rerender(
        <NextIntlTestProvider messages={testMessages} locale="de">
          <ArtistTabs artist={artist} locale="de" hasNews={true} hasProjects={true} />
        </NextIntlTestProvider>
      )

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByText('1 recordings')).toBeInTheDocument()
    })
  })

  describe('Repertoire tab', () => {
    it('should render repertoire sections from artist prop', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist({
        repertoire: [createMockRepertoire({ id: 1 }), createMockRepertoire({ id: 2 })],
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('repertoire-tab')).toBeInTheDocument()
        expect(screen.getByText('2 repertoires')).toBeInTheDocument()
      })
    })

    it('should show empty message when artist has no repertoire', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist({ repertoire: [] })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(screen.getByText('No repertoire available')).toBeInTheDocument()
      })
    })
  })

  describe('URL hash handling', () => {
    it('should initialize with tab from URL hash', () => {
      window.location.hash = '#media'
      const artist = createMockArtist()

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('media-tab')).toBeInTheDocument()
    })

    it('should default to biography for invalid hash', () => {
      window.location.hash = '#invalid'
      const artist = createMockArtist()

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
    })

    it('should initialize media tab to videos section from #media-videos hash', () => {
      window.location.hash = '#media-videos'
      const artist = createMockArtist({
        videoLinks: [{ label: 'Test', url: 'https://youtube.com/watch?v=abc' }],
        galleryImages: [],
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('media-tab')).toBeInTheDocument()
      expect(screen.getByText('1 videos')).toBeInTheDocument()
    })

    it('should initialize media tab to images section from #media-images hash', () => {
      window.location.hash = '#media-images'
      const artist = createMockArtist({
        galleryImages: [{ id: 'img1', image: { id: 1, alt: 'Photo', url: '/p.jpg', updatedAt: '', createdAt: '' } }],
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('media-tab')).toBeInTheDocument()
      expect(screen.getByText('1 images')).toBeInTheDocument()
    })
  })

  describe('Locale change', () => {
    it('should keep the active tab when locale changes', async () => {
      const artist = createMockArtist()

      const { rerender } = renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const user = userEvent.setup()
      const mediaTabs = screen.getAllByText('Media')
      await user.click(mediaTabs[0])
      expect(screen.getByTestId('media-tab')).toBeInTheDocument()

      // Change locale - active tab should be preserved
      // Hash cleared to simulate next-intl navigation (which drops the hash)
      window.location.hash = ''
      rerender(
        <NextIntlTestProvider messages={testMessages} locale="de">
          <ArtistTabs artist={artist} locale="de" hasNews={true} hasProjects={true} />
        </NextIntlTestProvider>
      )

      expect(screen.getByTestId('media-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('biography-tab')).not.toBeInTheDocument()
    })

    it('should refetch recordings in the new locale when on discography tab', async () => {
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist).mockResolvedValue({
        docs: [createMockRecording()],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const { rerender } = renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const user = userEvent.setup()
      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledWith('1', 'en')
      })

      // Change locale while on discography - should refetch for the new locale
      // Hash cleared to simulate next-intl navigation (which drops the hash)
      window.location.hash = ''
      rerender(
        <NextIntlTestProvider messages={testMessages} locale="de">
          <ArtistTabs artist={artist} locale="de" hasNews={true} hasProjects={true} />
        </NextIntlTestProvider>
      )

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledWith('1', 'de')
      })

      expect(screen.getByTestId('recordings-tab')).toBeInTheDocument()
    })

    it('should not refetch recordings when locale changes on a non-discography tab', async () => {
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist).mockResolvedValue({
        docs: [createMockRecording()],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      })

      const { rerender } = renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const user = userEvent.setup()
      const mediaTabs = screen.getAllByText('Media')
      await user.click(mediaTabs[0])

      // Change locale while on media tab
      // Hash cleared to simulate next-intl navigation (which drops the hash)
      window.location.hash = ''
      rerender(
        <NextIntlTestProvider messages={testMessages} locale="de">
          <ArtistTabs artist={artist} locale="de" hasNews={true} hasProjects={true} />
        </NextIntlTestProvider>
      )

      expect(fetchRecordingsByArtist).not.toHaveBeenCalled()
    })
  })

  describe('Tab persistence', () => {
    it('persists the active tab to sessionStorage when the tab changes', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      window.history.replaceState({}, '', '/de/artists/test-artist')

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const mediaTabs = screen.getAllByText('Media')
      await user.click(mediaTabs[0])

      const stored = JSON.parse(sessionStorage.getItem('/artists/test-artist') ?? 'null')
      expect(stored).toEqual({ tab: 'media', mediaSection: 'images' })
    })

    it('forces biography and clears the marker when arriving from the artist list', () => {
      window.history.replaceState({}, '', '/de/artists/test-artist')
      sessionStorage.setItem('artist-tab-from-list', 'test-artist')
      sessionStorage.setItem('/artists/test-artist', JSON.stringify({ tab: 'media', mediaSection: 'videos' }))

      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('media-tab')).not.toBeInTheDocument()
      expect(sessionStorage.getItem('artist-tab-from-list')).toBeNull()
    })

    it('forces biography under StrictMode double-effect (regression for dev)', () => {
      // React StrictMode double-invokes effects in dev. The marker is cleared
      // on the first pass; without a one-shot guard the second pass would
      // restore the stored tab instead of staying on biography.
      window.history.replaceState({}, '', '/de/artists/test-artist')
      sessionStorage.setItem('artist-tab-from-list', 'test-artist')
      sessionStorage.setItem('/artists/test-artist', JSON.stringify({ tab: 'media', mediaSection: 'videos' }))

      const artist = createMockArtist()
      renderWithIntl(
        <StrictMode>
          <ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />
        </StrictMode>
      )

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('media-tab')).not.toBeInTheDocument()
    })

    it('ignores a list marker for a different artist slug', () => {
      window.history.replaceState({}, '', '/de/artists/test-artist')
      sessionStorage.setItem('artist-tab-from-list', 'other-artist')
      sessionStorage.setItem('/artists/test-artist', JSON.stringify({ tab: 'media', mediaSection: 'videos' }))

      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('media-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('biography-tab')).not.toBeInTheDocument()
    })

    it('restores the last-viewed tab when no hash or list marker is present (e.g. back from article)', () => {
      window.history.replaceState({}, '', '/de/artists/test-artist')
      sessionStorage.setItem('/artists/test-artist', JSON.stringify({ tab: 'media', mediaSection: 'videos' }))

      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('media-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('biography-tab')).not.toBeInTheDocument()
    })

    it('restores the news tab after navigating away and back (journey)', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      window.history.replaceState({}, '', '/de/artists/test-artist')

      // First visit: click the News tab, which persists it to sessionStorage
      const first = renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      await user.click(screen.getAllByText('News')[0])
      expect(screen.getByTestId('newsfeed-news')).toBeInTheDocument()

      const stored = JSON.parse(sessionStorage.getItem('/artists/test-artist') ?? 'null')
      expect(stored).toEqual({ tab: 'news', mediaSection: 'images' })

      // Simulate navigating to a news article (artist page unmounts) and Back
      // (artist page remounts with a clean URL, no hash)
      first.unmount()
      window.location.hash = ''
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('newsfeed-news')).toBeInTheDocument()
        expect(screen.queryByTestId('biography-tab')).not.toBeInTheDocument()
      })
    })

    it('falls back to biography when the stored tab is no longer available', () => {
      window.history.replaceState({}, '', '/de/artists/test-artist')
      sessionStorage.setItem('/artists/test-artist', JSON.stringify({ tab: 'news', mediaSection: 'images' }))

      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={true} />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('newsfeed-news')).not.toBeInTheDocument()
    })

    it('syncs the media section on popstate', async () => {
      window.history.replaceState({}, '', '/de/artists/test-artist')
      window.location.hash = '#media-videos'
      const artist = createMockArtist({
        galleryImages: [
          { id: 'img1', image: { id: 1, alt: 'Photo', url: '/p.jpg', updatedAt: '', createdAt: '' } },
          { id: 'img2', image: { id: 2, alt: 'Photo', url: '/p2.jpg', updatedAt: '', createdAt: '' } },
        ],
        videoLinks: [
          { label: 'V1', url: 'https://youtube.com/watch?v=a' },
          { label: 'V2', url: 'https://youtube.com/watch?v=b' },
        ],
      })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)
      expect(screen.getByText('2 videos')).toBeInTheDocument()

      // Browser Back reverts the URL to #media-images and fires popstate
      window.location.hash = '#media-images'
      window.dispatchEvent(new PopStateEvent('popstate'))

      await waitFor(() => {
        expect(screen.getByText('2 images')).toBeInTheDocument()
        expect(screen.queryByText('2 videos')).not.toBeInTheDocument()
      })
    })

    it('syncs the active tab on back/forward popstate within the artist page', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      window.history.replaceState({}, '', '/de/artists/test-artist')

      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      // Land on News tab, then switch to Media (each click pushes a hash entry)
      await user.click(screen.getAllByText('News')[0])
      expect(screen.getByTestId('newsfeed-news')).toBeInTheDocument()

      await user.click(screen.getAllByText('Media')[0])
      expect(screen.getByTestId('media-tab')).toBeInTheDocument()

      // Browser Back reverts the URL to #news and fires popstate
      window.location.hash = '#news'
      window.dispatchEvent(new PopStateEvent('popstate'))

      await waitFor(() => {
        expect(screen.getByTestId('newsfeed-news')).toBeInTheDocument()
        expect(screen.queryByTestId('media-tab')).not.toBeInTheDocument()
      })
    })

    it('uses the URL hash when present', () => {
      window.history.replaceState({}, '', '/de/artists/test-artist')
      window.location.hash = '#repertoire'

      const artist = createMockArtist({ repertoire: [createMockRepertoire()] })
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getByTestId('repertoire-tab')).toBeInTheDocument()
      expect(screen.queryByTestId('biography-tab')).not.toBeInTheDocument()
    })
  })

  describe('NewsFeed integration', () => {
    it('should render news feed for news tab', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const newsTabs = screen.getAllByText('News')
      await user.click(newsTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('newsfeed-news')).toBeInTheDocument()
        expect(screen.getByText(/Artist: 1/)).toBeInTheDocument()
      })
    })

    it('should render projects tab', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      const projectsTabs = screen.getAllByText('Projects')
      await user.click(projectsTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('projects-tab')).toBeInTheDocument()
      })
    })
  })

  describe('Conditional tab visibility', () => {
    it('should hide News tab when hasNews is false', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={true} />)

      expect(screen.queryAllByText('News')).toHaveLength(0)
      expect(screen.getAllByText('Projects')).toHaveLength(1) // Desktop only — not the active mobile trigger
    })

    it('should show News tab when hasNews is true', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getAllByText('News')).toHaveLength(1)
    })

    it('should hide Projects tab when hasProjects is false', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={false} />)

      expect(screen.queryAllByText('Projects')).toHaveLength(0)
      expect(screen.getAllByText('News')).toHaveLength(1)
    })

    it('should show Projects tab when hasProjects is true', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

      expect(screen.getAllByText('Projects')).toHaveLength(1)
    })

    it('should hide both News and Projects tabs when both are false', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={false} />)

      expect(screen.queryAllByText('News')).toHaveLength(0)
      expect(screen.queryAllByText('Projects')).toHaveLength(0)
      expect(screen.getAllByText('Biography')).toHaveLength(2)
    })

    it('should fall back to biography tab when hash points to hidden News tab', async () => {
      window.location.hash = '#news'
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      })
    })

    it('should fall back to biography tab when hash points to hidden Projects tab', async () => {
      window.location.hash = '#projects'
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={false} />)

      await waitFor(() => {
        expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      })
    })
  })
})
