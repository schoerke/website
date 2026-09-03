// @vitest-environment happy-dom
import type { Artist } from '@/payload-types'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ArtistGrid from './ArtistGrid'

// Mock child components
vi.mock('@/components/Artist/ArtistCard', () => ({
  default: ({ name }: { name: string }) => <div data-testid={`artist-card-${name}`}>{name}</div>,
}))

interface SliderImage {
  alt: string
  src: string
  bannerText?: string
  slug?: string
  sizesAttr?: string
  focalX?: number | null
  focalY?: number | null
}

vi.mock('@/components/ui/ImageSlider', () => ({
  default: ({ images, eagerLoadCount }: { images: SliderImage[]; eagerLoadCount?: number }) => (
    <div data-testid="image-slider">
      <span data-testid="slider-eager-load-count">{eagerLoadCount}</span>
      {images.map((img, i) => (
        <div key={i} data-testid="slider-image">
          {img.alt}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Artist/InstrumentFilter', () => ({
  default: ({
    instruments,
    selected,
    onChange,
  }: {
    instruments: string[]
    selected: string[]
    onChange: (val: string[]) => void
  }) => (
    <div data-testid="instrument-filter">
      {instruments.map((inst) => (
        <button
          key={inst}
          data-testid={`filter-${inst}`}
          onClick={() => {
            const isSelected = selected.includes(inst)
            onChange(isSelected ? selected.filter((s) => s !== inst) : [...selected, inst])
          }}
        >
          {inst}
        </button>
      ))}
    </div>
  ),
}))

// Mock factory for artists
function createMockArtist(overrides?: Partial<Artist>): Artist {
  return {
    id: 1,
    name: 'Test Artist',
    slug: 'test-artist',
    instrument: ['violin'],
    image: null,
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
    quote: null,
    contactPersons: null,
    repertoire: null,
    downloads: undefined,
    videoLinks: null,
    homepageURL: null,
    externalCalendarURL: null,
    facebookURL: null,
    instagramURL: null,
    twitterURL: null,
    youtubeURL: null,
    spotifyURL: null,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ArtistGrid', () => {
  describe('Basic rendering', () => {
    it('renders instrument filter', () => {
      const artists = [createMockArtist({ id: 1 })]
      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      expect(screen.getByTestId('instrument-filter')).toBeInTheDocument()
    })

    it('renders all artists when no filter selected', () => {
      const artists = [createMockArtist({ id: 1, name: 'Artist One' }), createMockArtist({ id: 2, name: 'Artist Two' })]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      expect(screen.getByTestId('artist-card-Artist One')).toHaveTextContent('Artist One')
      expect(screen.getByTestId('artist-card-Artist Two')).toHaveTextContent('Artist Two')
    })

    it('renders empty state when no artists provided', () => {
      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={[]} instruments={[]} />
        </NextIntlTestProvider>
      )

      expect(screen.getByText(/no artists found/i)).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('filters artists by selected instrument', async () => {
      const user = userEvent.setup()
      const artists = [
        createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] }),
        createMockArtist({ id: 2, name: 'Pianist', instrument: ['piano'] }),
        createMockArtist({ id: 3, name: 'Cellist', instrument: ['cello'] }),
      ]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'piano', 'cello']} />
        </NextIntlTestProvider>
      )

      // Click piano filter
      await user.click(screen.getByTestId('filter-piano'))

      // Only pianist should be visible
      expect(screen.queryByTestId('artist-card-Violinist')).not.toBeInTheDocument()
      expect(screen.getByTestId('artist-card-Pianist')).toHaveTextContent('Pianist')
      expect(screen.queryByTestId('artist-card-Cellist')).not.toBeInTheDocument()
    })

    it('shows artists with ANY of the selected instruments', async () => {
      const user = userEvent.setup()
      const artists = [
        createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] }),
        createMockArtist({ id: 2, name: 'Pianist', instrument: ['piano'] }),
        createMockArtist({ id: 3, name: 'Multi', instrument: ['violin', 'piano'] }),
      ]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'piano']} />
        </NextIntlTestProvider>
      )

      // Select violin
      await user.click(screen.getByTestId('filter-violin'))

      // Violinist and Multi should show
      expect(screen.getByTestId('artist-card-Violinist')).toBeInTheDocument()
      expect(screen.queryByTestId('artist-card-Pianist')).not.toBeInTheDocument()
      expect(screen.getByTestId('artist-card-Multi')).toBeInTheDocument()
    })

    it('shows empty state when filter has no matches', async () => {
      const user = userEvent.setup()
      const artists = [createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] })]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'piano']} />
        </NextIntlTestProvider>
      )

      await user.click(screen.getByTestId('filter-piano'))

      expect(screen.getByText(/no artists found/i)).toBeInTheDocument()
      expect(screen.queryByTestId('artist-card-Violinist')).not.toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('sorts by instrument priority', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'Cellist', instrument: ['cello'] }), // Priority 5
        createMockArtist({ id: 2, name: 'Conductor', instrument: ['conductor'] }), // Priority 1
        createMockArtist({ id: 3, name: 'Violinist', instrument: ['violin'] }), // Priority 3
        createMockArtist({ id: 4, name: 'Pianist', instrument: ['piano'] }), // Priority 2
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['conductor', 'piano', 'violin', 'cello']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      expect(cards[0]).toHaveTextContent('Conductor')
      expect(cards[1]).toHaveTextContent('Pianist')
      expect(cards[2]).toHaveTextContent('Violinist')
      expect(cards[3]).toHaveTextContent('Cellist')
    })

    it('sorts by last name within same priority', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'John Zimmerman', instrument: ['violin'] }),
        createMockArtist({ id: 2, name: 'Jane Anderson', instrument: ['violin'] }),
        createMockArtist({ id: 3, name: 'Bob Miller', instrument: ['violin'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      expect(cards[0]).toHaveTextContent('Jane Anderson')
      expect(cards[1]).toHaveTextContent('Bob Miller')
      expect(cards[2]).toHaveTextContent('John Zimmerman')
    })

    it('places artists without instruments last', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'No Instrument', instrument: [] }),
        createMockArtist({ id: 2, name: 'Violinist', instrument: ['violin'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      expect(cards[0]).toHaveTextContent('Violinist')
      expect(cards[1]).toHaveTextContent('No Instrument')
    })

    it('orders viola before cello', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'Cellist', instrument: ['cello'] }),
        createMockArtist({ id: 2, name: 'Violist', instrument: ['viola'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['cello', 'viola']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      expect(cards[0]).toHaveTextContent('Violist')
      expect(cards[1]).toHaveTextContent('Cellist')
    })

    it('groups multi-instrument artists by highest-priority instrument', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'Pianist', instrument: ['piano'] }),
        createMockArtist({ id: 2, name: 'Multi', instrument: ['piano', 'conductor'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['piano', 'conductor']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      expect(cards[0]).toHaveTextContent('Multi') // Conductor group (priority 1)
      expect(cards[1]).toHaveTextContent('Pianist') // Piano group (priority 2)
    })

    it('splits horn and chamber music, sorting chamber music by ensemble name', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'Zehetmair Quartett', instrument: ['chamber-music'] }),
        createMockArtist({ id: 2, name: 'Monet Quintett', instrument: ['chamber-music'] }),
        createMockArtist({ id: 3, name: 'Marc Gruber', instrument: ['horn'] }),
        createMockArtist({ id: 4, name: 'Trio Gaspard', instrument: ['chamber-music'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['horn', 'chamber-music']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      // Horn before chamber music
      expect(cards[0]).toHaveTextContent('Marc Gruber')
      // Chamber music ordered by first word of ensemble name
      expect(cards[1]).toHaveTextContent('Monet Quintett')
      expect(cards[2]).toHaveTextContent('Trio Gaspard')
      expect(cards[3]).toHaveTextContent('Zehetmair Quartett')
    })

    it('sorts horn players by last name', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'Marie-Luise Neunecker', instrument: ['horn'] }),
        createMockArtist({ id: 2, name: 'Marc Gruber', instrument: ['horn'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['horn']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      expect(cards[0]).toHaveTextContent('Marc Gruber')
      expect(cards[1]).toHaveTextContent('Marie-Luise Neunecker')
    })

    it('sorts ensembles with extra solo instruments by ensemble name', () => {
      const artists = [
        // Groups with violinists (priority 3) but must sort by ensemble name, not last word "Paul"
        createMockArtist({ id: 1, name: 'Trio Jean Paul', instrument: ['chamber-music', 'violin'] }),
        createMockArtist({ id: 2, name: 'Alice Smith', instrument: ['violin'] }),
        // Pure chamber-music ensemble stays in its own group (priority 8)
        createMockArtist({ id: 3, name: 'Monet Quintett', instrument: ['chamber-music'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'chamber-music']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      // "Smith" < "Trio Jean Paul", so Smith first (old last-word logic would put Trio first via "Paul")
      expect(cards[0]).toHaveTextContent('Alice Smith')
      expect(cards[1]).toHaveTextContent('Trio Jean Paul')
      // Mixed-instrument ensemble groups with violinists, before the pure chamber-music group
      expect(cards[2]).toHaveTextContent('Monet Quintett')
    })

    it('treats piano-forte same as piano priority', () => {
      const artists = [
        createMockArtist({ id: 1, name: 'Fortepianist', instrument: ['piano-forte'] }),
        createMockArtist({ id: 2, name: 'Violinist', instrument: ['violin'] }),
        createMockArtist({ id: 3, name: 'Pianist', instrument: ['piano'] }),
      ]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['piano', 'piano-forte', 'violin']} />
        </NextIntlTestProvider>
      )

      const cards = container.querySelectorAll('[data-testid^="artist-card-"]')
      // Piano and piano-forte should be before violin (priority 2 vs 3)
      expect(cards[0].textContent).toMatch(/pianist|fortepianist/i)
      expect(cards[1].textContent).toMatch(/pianist|fortepianist/i)
      expect(cards[2]).toHaveTextContent('Violinist')
    })
  })

  describe('Image slider', () => {
    it('shows slider with artists not in filtered results', async () => {
      const user = userEvent.setup()
      const artists = [
        createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] }),
        createMockArtist({ id: 2, name: 'Pianist', instrument: ['piano'] }),
      ]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'piano']} />
        </NextIntlTestProvider>
      )

      // Filter to only violinists
      await user.click(screen.getByTestId('filter-violin'))

      // Now slider should show the pianist
      expect(screen.getByTestId('image-slider')).toBeInTheDocument()
    })

    it('eager-loads the first three slider images', async () => {
      const user = userEvent.setup()
      const artists = [
        createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] }),
        createMockArtist({ id: 2, name: 'Pianist', instrument: ['piano'] }),
      ]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'piano']} />
        </NextIntlTestProvider>
      )

      await user.click(screen.getByTestId('filter-violin'))

      expect(screen.getByTestId('slider-eager-load-count')).toHaveTextContent('3')
    })

    it('hides slider when all artists are shown in grid', () => {
      const artists = [createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] })]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      // All artists shown in grid, no slider
      expect(screen.queryByTestId('image-slider')).not.toBeInTheDocument()
    })

    it('renders "Discover More" heading when slider shown', async () => {
      const user = userEvent.setup()
      const artists = [
        createMockArtist({ id: 1, name: 'Violinist', instrument: ['violin'] }),
        createMockArtist({ id: 2, name: 'Pianist', instrument: ['piano'] }),
      ]

      render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin', 'piano']} />
        </NextIntlTestProvider>
      )

      await user.click(screen.getByTestId('filter-violin'))

      expect(screen.getByText(/discover more/i)).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('applies grid layout classes', () => {
      const artists = [createMockArtist({ id: 1 }), createMockArtist({ id: 2 })]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
      expect(grid).toHaveClass('xl:grid-cols-4')
    })

    it('applies fade-in animation on filter change', () => {
      const artists = [createMockArtist({ id: 1 })]

      const { container } = render(
        <NextIntlTestProvider>
          <ArtistGrid artists={artists} instruments={['violin']} />
        </NextIntlTestProvider>
      )

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('animate-in')
      expect(grid).toHaveClass('fade-in')
    })
  })
})
