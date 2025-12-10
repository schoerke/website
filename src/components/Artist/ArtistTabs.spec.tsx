// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/components/__test-utils__/NextIntlProvider'
import type { Artist, Recording, Repertoire } from '@/payload-types'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArtistTabs from './ArtistTabs'

// Mock server actions
vi.mock('@/actions/recordings', () => ({
  fetchRecordingsByArtist: vi.fn(),
}))

vi.mock('@/actions/repertoires', () => ({
  fetchRepertoiresByArtist: vi.fn(),
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
vi.mock('./ArtistTabContent', () => ({
  BiographyTab: ({ content, quote }: { content?: any; quote?: string }) => (
    <div data-testid="biography-tab">
      Biography: {content ? 'Has content' : 'No bio'} - Quote: {quote || 'No quote'}
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
  VideoTab: ({ videos, emptyMessage }: { videos?: Array<{ url: string }>; emptyMessage: string }) => (
    <div data-testid="video-tab">{videos && videos.length > 0 ? `${videos.length} videos` : emptyMessage}</div>
  ),
  ConcertDatesTab: ({ externalCalendarURL, buttonText }: { externalCalendarURL: string; buttonText: string }) => (
    <div data-testid="concert-dates-tab">
      Calendar: {externalCalendarURL} - {buttonText}
    </div>
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
          video: 'Video',
          news: 'News',
          projects: 'Projects',
          concertDates: 'Concert Dates',
        },
        empty: {
          repertoire: 'No repertoire available',
          discography: 'No recordings available',
          video: 'No videos available',
          news: 'No news available',
          projects: 'No projects available',
        },
        concertDates: {
          button: 'View Calendar',
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
  youtubeLinks: [{ label: 'Test Video', url: 'https://youtube.com/watch?v=123' }],
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
  const { fetchRepertoiresByArtist } = await import('@/actions/repertoires')

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.location.hash
    window.location.hash = ''
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Initial rendering', () => {
    it('should render biography tab by default', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
      expect(screen.getByText(/Biography: Has content/)).toBeInTheDocument()
    })

    it('should render all tab buttons', () => {
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getAllByText('Biography')).toHaveLength(2) // Desktop + Mobile
      expect(screen.getAllByText('Repertoire')).toHaveLength(2)
      expect(screen.getAllByText('Discography')).toHaveLength(2)
      expect(screen.getAllByText('Video')).toHaveLength(2)
      expect(screen.getAllByText('News')).toHaveLength(2)
      expect(screen.getAllByText('Projects')).toHaveLength(2)
    })

    it('should render concert dates tab when externalCalendarURL is provided', () => {
      const artist = createMockArtist({ externalCalendarURL: 'https://calendar.example.com' })
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getAllByText('Concert Dates')).toHaveLength(2) // Desktop + Mobile
    })

    it('should not render concert dates tab when externalCalendarURL is missing', () => {
      const artist = createMockArtist({ externalCalendarURL: undefined })
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.queryByText('Concert Dates')).not.toBeInTheDocument()
    })
  })

  describe('Tab switching', () => {
    it('should switch to repertoire tab when clicked', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRepertoiresByArtist).mockResolvedValue({
        docs: [createMockRepertoire()],
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

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      // Click repertoire tab (use first one - desktop)
      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('repertoire-tab')).toBeInTheDocument()
      })
    })

    it('should switch to video tab when clicked', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const videoTabs = screen.getAllByText('Video')
      await user.click(videoTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('video-tab')).toBeInTheDocument()
      })
    })

    it('should update URL hash when tab changes', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const videoTabs = screen.getAllByText('Video')
      await user.click(videoTabs[0])

      expect(window.location.hash).toBe('#video')
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

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

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

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      // Click discography tab
      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledTimes(1)
      })

      // Switch to another tab
      const videoTabs = screen.getAllByText('Video')
      await user.click(videoTabs[0])

      // Switch back to discography
      await user.click(discographyTabs[0])

      // Should not fetch again
      expect(fetchRecordingsByArtist).toHaveBeenCalledTimes(1)
    })

    it('should handle recordings fetch error gracefully', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRecordingsByArtist).mockRejectedValue(new Error('Network error'))

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

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

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(screen.getByText('No recordings available')).toBeInTheDocument()
      })
    })
  })

  describe('Lazy loading - Repertoires', () => {
    it('should fetch repertoires when repertoire tab is clicked', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      const mockRepertoires = [createMockRepertoire({ id: 1 }), createMockRepertoire({ id: 2 })]

      vi.mocked(fetchRepertoiresByArtist).mockResolvedValue({
        docs: mockRepertoires,
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

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(fetchRepertoiresByArtist).not.toHaveBeenCalled()

      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('repertoire-tab')).toBeInTheDocument()
      })

      expect(fetchRepertoiresByArtist).toHaveBeenCalledWith('1', 'en')

      await waitFor(() => {
        expect(screen.getByText('2 repertoires')).toBeInTheDocument()
      })
    })

    it('should not fetch repertoires again when switching back', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRepertoiresByArtist).mockResolvedValue({
        docs: [createMockRepertoire()],
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

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(fetchRepertoiresByArtist).toHaveBeenCalledTimes(1)
      })

      const videoTabs = screen.getAllByText('Video')
      await user.click(videoTabs[0])
      await user.click(repertoireTabs[0])

      expect(fetchRepertoiresByArtist).toHaveBeenCalledTimes(1)
    })

    it('should handle repertoires fetch error gracefully', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()

      vi.mocked(fetchRepertoiresByArtist).mockRejectedValue(new Error('Network error'))

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const repertoireTabs = screen.getAllByText('Repertoire')
      await user.click(repertoireTabs[0])

      await waitFor(() => {
        expect(screen.getByText('No repertoire available')).toBeInTheDocument()
      })

      expect(console.error).toHaveBeenCalledWith('Failed to fetch repertoires:', expect.any(Error))
    })
  })

  describe('URL hash handling', () => {
    it('should initialize with tab from URL hash', () => {
      window.location.hash = '#video'
      const artist = createMockArtist()

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getByTestId('video-tab')).toBeInTheDocument()
    })

    it('should default to biography for invalid hash', () => {
      window.location.hash = '#invalid'
      const artist = createMockArtist()

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
    })

    it('should handle concertDates hash when calendar URL exists', () => {
      window.location.hash = '#concertDates'
      const artist = createMockArtist({ externalCalendarURL: 'https://calendar.example.com' })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getByTestId('concert-dates-tab')).toBeInTheDocument()
    })

    it('should default to biography for concertDates hash without calendar URL', () => {
      window.location.hash = '#concertDates'
      const artist = createMockArtist({ externalCalendarURL: undefined })

      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
    })
  })

  describe('Locale-based reset', () => {
    it('should reset state when locale changes', async () => {
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

      const { rerender } = renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      // Switch to discography tab
      const user = userEvent.setup()
      const discographyTabs = screen.getAllByText('Discography')
      await user.click(discographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledWith('1', 'en')
      })

      // Change locale - should reset to biography tab
      // Clear hash to simulate navigation or explicit reset
      window.location.hash = ''

      rerender(
        <NextIntlTestProvider messages={testMessages} locale="de">
          <ArtistTabs artist={artist} locale="de" />
        </NextIntlTestProvider>,
      )

      // Should show biography tab (initial state)
      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()

      // If we switch to discography again, it should fetch with new locale
      const newDiscographyTabs = screen.getAllByText('Discography')
      await user.click(newDiscographyTabs[0])

      await waitFor(() => {
        expect(fetchRecordingsByArtist).toHaveBeenCalledWith('1', 'de')
      })
    })
  })

  describe('NewsFeed integration', () => {
    it('should render news feed for news tab', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const newsTabs = screen.getAllByText('News')
      await user.click(newsTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('newsfeed-news')).toBeInTheDocument()
        expect(screen.getByText(/Artist: 1/)).toBeInTheDocument()
      })
    })

    it('should render news feed for projects tab', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist()
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const projectsTabs = screen.getAllByText('Projects')
      await user.click(projectsTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('newsfeed-projects')).toBeInTheDocument()
      })
    })
  })

  describe('Concert dates integration', () => {
    it('should render concert dates tab with calendar URL', async () => {
      const user = userEvent.setup()
      const artist = createMockArtist({ externalCalendarURL: 'https://calendar.example.com' })
      renderWithIntl(<ArtistTabs artist={artist} locale="en" />)

      const concertDatesTabs = screen.getAllByText('Concert Dates')
      await user.click(concertDatesTabs[0])

      await waitFor(() => {
        expect(screen.getByTestId('concert-dates-tab')).toBeInTheDocument()
        expect(screen.getByText(/Calendar: https:\/\/calendar\.example\.com/)).toBeInTheDocument()
      })
    })
  })
})
