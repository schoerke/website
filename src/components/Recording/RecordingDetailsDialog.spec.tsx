// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RecordingDetailsDialog from '@/components/Recording/RecordingDetailsDialog'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockImage, createMockRecording } from '@/tests/utils/payloadMocks'

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}))

vi.mock('@/components/ui/PayloadRichText', () => ({
  default: ({ content }: { content: { root: { children: { text?: string }[] } } }) => {
    const texts = content?.root?.children
      ? content.root.children
          .map((c) => (c as { text?: string }).text ?? '')
          .filter(Boolean)
          .join(' ')
      : ''
    return <div data-testid="rich-text">{texts}</div>
  },
}))

const messages = {
  custom: {
    pages: {
      artist: {
        discography: {
          details: 'Details',
          roles: 'Roles',
          listenOnSpotify: 'Listen on Spotify',
          listenOnAppleMusic: 'Listen on Apple Music',
          listenOnSpotifyFor: 'Listen to {title} on Spotify',
          listenOnAppleMusicFor: 'Listen to {title} on Apple Music',
          opensInNewTab: 'opens in new tab',
        },
      },
    },
    recordingRoles: {
      soloist: 'Soloist',
      conductor: 'Conductor',
    },
  },
}

function descriptionWithText(text: string) {
  return {
    root: {
      type: 'root',
      children: [{ type: 'text', text }],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

// The trigger (and hence the open dialog) is only rendered when the recording has visible description text.
// To assert modal content in every case, give the recording visible description text so the trigger renders,
// then open the dialog so the lazy-mounted modal content is available.
function openDialog(recording: ReturnType<typeof createMockRecording>) {
  const utils = render(
    <NextIntlTestProvider messages={messages}>
      <RecordingDetailsDialog
        recording={{ ...recording, description: recording.description ?? descriptionWithText('Program notes') }}
      />
    </NextIntlTestProvider>
  )
  const trigger = screen.getByRole('button', { name: 'Details' })
  fireEvent.click(trigger)
  return utils
}

function renderDialog(recording: ReturnType<typeof createMockRecording>) {
  openDialog(recording)
}

describe('RecordingDetailsDialog', () => {
  it('renders the recording title', () => {
    renderDialog(createMockRecording({ title: 'Beethoven - Violin Concerto' }))
    expect(screen.getByText('Beethoven - Violin Concerto')).toBeInTheDocument()
  })

  it('renders roles via the recordingRoles translation namespace', () => {
    renderDialog(createMockRecording({ roles: ['soloist', 'conductor'] }))
    expect(screen.getByText('Soloist')).toBeInTheDocument()
    expect(screen.getByText('Conductor')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
  })

  it('omits the roles overline label when roles is empty', () => {
    renderDialog(createMockRecording({ roles: [] }))
    expect(screen.queryByText('Roles')).not.toBeInTheDocument()
  })

  it('renders metadata (year, label, catalog)', () => {
    renderDialog(
      createMockRecording({
        recordingLabel: 'Deutsche Grammophon',
        catalogNumber: 'DG 123456',
        recordingYear: 2020,
      })
    )
    expect(screen.getByText('Deutsche Grammophon')).toBeInTheDocument()
    expect(screen.getByText('DG 123456')).toBeInTheDocument()
    expect(screen.getByText('2020')).toBeInTheDocument()
  })

  it('renders the rich text description body', () => {
    renderDialog(createMockRecording({ description: descriptionWithText('Some program notes') }))
    expect(screen.getByTestId('rich-text')).toBeInTheDocument()
    expect(screen.getByText('Some program notes')).toBeInTheDocument()
  })

  it('renders Spotify and Apple Music links', () => {
    renderDialog(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        spotifyURL: 'https://open.spotify.com/album/123',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )
    expect(screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Spotify' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Apple Music' })
    ).toBeInTheDocument()
  })

  it('renders a placeholder when no cover art is present', () => {
    renderDialog(createMockRecording({ coverArt: undefined }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('recording-details-cover-placeholder')).toBeInTheDocument()
  })

  it('renders the cover image when coverArt is populated', () => {
    renderDialog(
      createMockRecording({ coverArt: createMockImage({ alt: 'Album cover', url: '/api/images/file/cover.jpg' }) })
    )
    const img = screen.getByRole('img', { name: 'Album cover' })
    expect(img).toHaveAttribute('src', expect.stringContaining('cover.jpg'))
  })
})
