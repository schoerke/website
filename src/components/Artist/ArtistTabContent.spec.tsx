import type { Artist, Recording, Repertoire } from '@/payload-types'
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  BiographyTab,
  ConcertDatesTab,
  DiscographyTab,
  RecordingsTab,
  RepertoireTab,
  VideoTab,
} from './ArtistTabContent'

// Mock child components
vi.mock('@/components/ui/PayloadRichText', () => ({
  default: ({ content }: { content: unknown }) => <div data-testid="rich-text">{JSON.stringify(content)}</div>,
}))

vi.mock('@/components/Recording/EmptyRecordings', () => ({
  default: () => <div data-testid="empty-recordings">No recordings found</div>,
}))

vi.mock('@/components/Recording/RecordingList', () => ({
  default: ({ recordings }: { recordings: Recording[] }) => (
    <div data-testid="recording-list">{recordings.length} recordings</div>
  ),
}))

vi.mock('@/components/Recording/RoleFilter', () => ({
  default: ({
    roles,
    selected,
    onChange,
  }: {
    roles: string[]
    selected: string | null
    onChange: (role: string | null) => void
  }) => (
    <div data-testid="role-filter">
      {roles.map((role) => (
        <button key={role} onClick={() => onChange(role)}>
          {role}
        </button>
      ))}
      <button onClick={() => onChange(null)}>All</button>
    </div>
  ),
}))

vi.mock('./VideoAccordion', () => ({
  default: ({ videos, emptyMessage }: { videos: Artist['youtubeLinks']; emptyMessage: string }) => (
    <div data-testid="video-accordion">{videos && videos.length > 0 ? `${videos.length} videos` : emptyMessage}</div>
  ),
}))

// Mock factories
const createMockBiography = (): Artist['biography'] => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Test biography content', version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const createMockRepertoire = (overrides?: Partial<Repertoire>): Repertoire => ({
  id: 1,
  title: 'Orchestral Works',
  content: {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Test repertoire content', version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  },
  artists: [1],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
})

const createMockRecording = (overrides?: Partial<Recording>): Recording => ({
  id: 1,
  title: 'Test Recording',
  roles: ['conductor'],
  artists: [1],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
})

describe('ArtistTabContent', () => {
  describe('BiographyTab', () => {
    it('should render biography content', () => {
      const content = createMockBiography()
      render(<BiographyTab content={content} />)

      expect(screen.getByTestId('rich-text')).toBeInTheDocument()
    })

    it('should render quote when provided', () => {
      const content = createMockBiography()
      const quote = 'Music is the universal language of mankind'

      render(<BiographyTab content={content} quote={quote} />)

      expect(screen.getByText(quote)).toBeInTheDocument()
      expect(screen.getByText(quote).tagName).toBe('BLOCKQUOTE')
    })

    it('should not render quote when null', () => {
      const content = createMockBiography()
      render(<BiographyTab content={content} quote={null} />)

      expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
    })

    it('should not render quote when undefined', () => {
      const content = createMockBiography()
      render(<BiographyTab content={content} />)

      expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
    })
  })

  describe('RepertoireTab', () => {
    it('should render loading state', () => {
      const { container } = render(<RepertoireTab repertoires={[]} loading={true} emptyMessage="No repertoire" />)

      // Check for loading skeletons by looking for animate-pulse class
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render empty message when no repertoires', () => {
      const emptyMessage = 'No repertoire available'
      render(<RepertoireTab repertoires={[]} loading={false} emptyMessage={emptyMessage} />)

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })

    it('should render single repertoire without toggle group', () => {
      const repertoires = [createMockRepertoire()]
      render(<RepertoireTab repertoires={repertoires} loading={false} emptyMessage="No repertoire" />)

      expect(screen.getByTestId('rich-text')).toBeInTheDocument()
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    })

    it('should render multiple repertoires with toggle group', () => {
      const repertoires = [
        createMockRepertoire({ id: 1, title: 'Orchestral Works' }),
        createMockRepertoire({ id: 2, title: 'Chamber Music' }),
      ]
      render(<RepertoireTab repertoires={repertoires} loading={false} emptyMessage="No repertoire" />)

      expect(screen.getByText('Orchestral Works')).toBeInTheDocument()
      expect(screen.getByText('Chamber Music')).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Filter repertoire by section' })).toBeInTheDocument()
    })

    it('should switch between repertoire sections', async () => {
      const user = userEvent.setup()
      const repertoires = [
        createMockRepertoire({ id: 1, title: 'Orchestral Works' }),
        createMockRepertoire({ id: 2, title: 'Chamber Music' }),
      ]
      render(<RepertoireTab repertoires={repertoires} loading={false} emptyMessage="No repertoire" />)

      const chamberMusicButton = screen.getByText('Chamber Music')
      await user.click(chamberMusicButton)

      // Rich text component should still be present (just showing different content)
      expect(screen.getByTestId('rich-text')).toBeInTheDocument()
    })
  })

  describe('DiscographyTab', () => {
    it('should render empty message when no content', () => {
      const emptyMessage = 'No discography available'
      render(<DiscographyTab content={[]} emptyMessage={emptyMessage} />)

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })

    it('should render empty message when content is undefined', () => {
      const emptyMessage = 'No discography available'
      render(<DiscographyTab content={undefined} emptyMessage={emptyMessage} />)

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })

    it('should render discography sections', () => {
      const content: Artist['discography'] = [
        {
          id: '1',
          role: 'conductor',
          recordings: createMockBiography(),
        },
      ]
      render(<DiscographyTab content={content} emptyMessage="No discography" />)

      expect(screen.getByText('conductor')).toBeInTheDocument()
      expect(screen.getByTestId('rich-text')).toBeInTheDocument()
    })

    it('should format role names with underscores', () => {
      const content: Artist['discography'] = [
        {
          id: '1',
          role: 'ensemble_member',
          recordings: createMockBiography(),
        },
      ]
      render(<DiscographyTab content={content} emptyMessage="No discography" />)

      expect(screen.getByText('ensemble member')).toBeInTheDocument()
    })

    it('should render multiple sections', () => {
      const content: Artist['discography'] = [
        {
          id: '1',
          role: 'conductor',
          recordings: createMockBiography(),
        },
        {
          id: '2',
          role: 'soloist',
          recordings: createMockBiography(),
        },
      ]
      render(<DiscographyTab content={content} emptyMessage="No discography" />)

      expect(screen.getByText('conductor')).toBeInTheDocument()
      expect(screen.getByText('soloist')).toBeInTheDocument()
    })
  })

  describe('VideoTab', () => {
    it('should render empty message when no videos', () => {
      const emptyMessage = 'No videos available'
      render(<VideoTab videos={[]} emptyMessage={emptyMessage} />)

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })

    it('should render video accordion with videos', () => {
      const videos: Artist['youtubeLinks'] = [
        { label: 'Performance 1', url: 'https://youtube.com/watch?v=123' },
        { label: 'Performance 2', url: 'https://youtube.com/watch?v=456' },
      ]
      render(<VideoTab videos={videos} emptyMessage="No videos" />)

      expect(screen.getByText('2 videos')).toBeInTheDocument()
    })

    it('should handle undefined videos', () => {
      const emptyMessage = 'No videos available'
      render(<VideoTab videos={undefined} emptyMessage={emptyMessage} />)

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })
  })

  describe('ConcertDatesTab', () => {
    it('should render external link button', () => {
      const url = 'https://calendar.example.com'
      const buttonText = 'View Concert Dates'

      render(<ConcertDatesTab externalCalendarURL={url} buttonText={buttonText} />)

      const link = screen.getByRole('link', { name: /View Concert Dates/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', url)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render external link icon', () => {
      render(<ConcertDatesTab externalCalendarURL="https://calendar.example.com" buttonText="View Dates" />)

      const link = screen.getByRole('link')
      const svg = link.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('RecordingsTab', () => {
    it('should render loading state', () => {
      const { container } = render(
        <RecordingsTab
          recordings={[]}
          loading={true}
          emptyMessage="No recordings"
          availableRoles={[]}
          selectedRole={null}
          onRoleFilterChange={vi.fn()}
        />,
      )

      // Check for loading skeletons by looking for animate-pulse class
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render empty recordings component when no recordings and no filter', () => {
      render(
        <RecordingsTab
          recordings={[]}
          loading={false}
          emptyMessage="No recordings"
          availableRoles={[]}
          selectedRole={null}
          onRoleFilterChange={vi.fn()}
        />,
      )

      expect(screen.getByTestId('empty-recordings')).toBeInTheDocument()
    })

    it('should render empty message when no recordings match filter', () => {
      const emptyMessage = 'No recordings found for this role'
      render(
        <RecordingsTab
          recordings={[]}
          loading={false}
          emptyMessage={emptyMessage}
          availableRoles={['conductor', 'soloist']}
          selectedRole="conductor"
          onRoleFilterChange={vi.fn()}
        />,
      )

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })

    it('should render recording list', () => {
      const recordings = [createMockRecording(), createMockRecording({ id: 2 })]
      render(
        <RecordingsTab
          recordings={recordings}
          loading={false}
          emptyMessage="No recordings"
          availableRoles={['conductor']}
          selectedRole={null}
          onRoleFilterChange={vi.fn()}
        />,
      )

      expect(screen.getByTestId('recording-list')).toBeInTheDocument()
      expect(screen.getByText('2 recordings')).toBeInTheDocument()
    })

    it('should render role filter when multiple roles available', () => {
      const recordings = [createMockRecording()]
      const availableRoles = ['conductor', 'soloist']

      render(
        <RecordingsTab
          recordings={recordings}
          loading={false}
          emptyMessage="No recordings"
          availableRoles={availableRoles}
          selectedRole={null}
          onRoleFilterChange={vi.fn()}
        />,
      )

      expect(screen.getByTestId('role-filter')).toBeInTheDocument()
      expect(screen.getByText('conductor')).toBeInTheDocument()
      expect(screen.getByText('soloist')).toBeInTheDocument()
    })

    it('should not render role filter when single role', () => {
      const recordings = [createMockRecording()]

      render(
        <RecordingsTab
          recordings={recordings}
          loading={false}
          emptyMessage="No recordings"
          availableRoles={['conductor']}
          selectedRole={null}
          onRoleFilterChange={vi.fn()}
        />,
      )

      expect(screen.queryByTestId('role-filter')).not.toBeInTheDocument()
    })

    it('should call onRoleFilterChange when role is selected', async () => {
      const user = userEvent.setup()
      const onRoleFilterChange = vi.fn()
      const recordings = [createMockRecording()]
      const availableRoles = ['conductor', 'soloist']

      render(
        <RecordingsTab
          recordings={recordings}
          loading={false}
          emptyMessage="No recordings"
          availableRoles={availableRoles}
          selectedRole={null}
          onRoleFilterChange={onRoleFilterChange}
        />,
      )

      const soloistButton = screen.getByText('soloist')
      await user.click(soloistButton)

      expect(onRoleFilterChange).toHaveBeenCalledWith('soloist')
    })

    it('should pass filterKey to RecordingList', () => {
      const recordings = [createMockRecording()]
      const selectedRole = 'conductor'

      render(
        <RecordingsTab
          recordings={recordings}
          loading={false}
          emptyMessage="No recordings"
          availableRoles={['conductor', 'soloist']}
          selectedRole={selectedRole}
          onRoleFilterChange={vi.fn()}
        />,
      )

      expect(screen.getByTestId('recording-list')).toBeInTheDocument()
    })
  })
})
