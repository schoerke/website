// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Recording } from '@/payload-types'
import RecordingListItem from '@/components/Recording/RecordingListItem'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockImage, createMockRecording } from '@/tests/utils/payloadMocks'

const messages = {
  custom: {
    pages: {
      artist: {
        discography: {
          details: 'More details',
          listenOnSpotify: 'Listen on Spotify',
          listenOnAppleMusic: 'Listen on Apple Music',
          opensInNewTab: 'opens in new tab',
          listenOnSpotifyFor: 'Listen to {title} on Spotify',
          listenOnAppleMusicFor: 'Listen to {title} on Apple Music',
        },
      },
    },
  },
}

function descriptionWithText(text: string): NonNullable<Recording['description']> {
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

function renderItem(recording: ReturnType<typeof createMockRecording>) {
  return render(
    <NextIntlTestProvider messages={messages}>
      <RecordingListItem recording={recording} />
    </NextIntlTestProvider>
  )
}

describe('RecordingListItem', () => {
  it('renders the recording title', () => {
    renderItem(createMockRecording({ title: 'Beethoven - Violin Concerto' }))

    expect(screen.getByText('Beethoven - Violin Concerto')).toBeInTheDocument()
  })

  it('renders Spotify link when spotifyURL is provided', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        spotifyURL: 'https://open.spotify.com/album/123',
      })
    )

    const link = screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Spotify' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://open.spotify.com/album/123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Apple Music link when appleMusicURL is provided', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )

    const link = screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Apple Music' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://music.apple.com/album/123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sets aria-label with interpolated title for Spotify link', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        spotifyURL: 'https://open.spotify.com/album/123',
      })
    )

    expect(screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Spotify' })).toBeInTheDocument()
  })

  it('sets aria-label with interpolated title for Apple Music link', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )

    expect(
      screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Apple Music' })
    ).toBeInTheDocument()
  })

  it('renders no streaming links when none are provided', () => {
    renderItem(createMockRecording({ spotifyURL: null, appleMusicURL: null }))

    expect(screen.queryByRole('link', { name: /Listen to .* on Spotify/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Listen to .* on Apple Music/ })).not.toBeInTheDocument()
  })

  it('renders both streaming links when both URLs are provided', () => {
    renderItem(
      createMockRecording({
        spotifyURL: 'https://open.spotify.com/album/123',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )

    expect(screen.getByRole('link', { name: /Listen to .* on Spotify/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Listen to .* on Apple Music/ })).toBeInTheDocument()
  })

  it('renders visible Spotify label before the icon, hidden below lg breakpoint', () => {
    renderItem(createMockRecording({ spotifyURL: 'https://open.spotify.com/album/123' }))

    const label = screen.getByText('Listen on Spotify')
    expect(label).toBeInTheDocument()
    expect(label).toHaveClass('hidden', 'lg:inline')
  })

  it('renders visible Apple Music label before the icon, hidden below lg breakpoint', () => {
    renderItem(createMockRecording({ appleMusicURL: 'https://music.apple.com/album/123' }))

    const label = screen.getByText('Listen on Apple Music')
    expect(label).toBeInTheDocument()
    expect(label).toHaveClass('hidden', 'lg:inline')
  })

  it('renders cover art image when coverArt is a populated Image object', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        coverArt: createMockImage({ alt: 'Album cover art', url: '/api/images/file/cover.jpg' }),
      })
    )

    const img = screen.getByRole('img', { name: 'Album cover art' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringContaining('cover.jpg'))
  })

  it('falls back to recording title as alt text when coverArt has no alt', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        coverArt: createMockImage({ alt: '', url: '/api/images/file/cover.jpg' }),
      })
    )

    expect(screen.getByRole('img', { name: 'Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('renders a placeholder when coverArt is absent', () => {
    renderItem(createMockRecording({ coverArt: undefined }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('recording-cover-placeholder')).toBeInTheDocument()
  })

  it('renders a placeholder when coverArt is an unpopulated ID (not an object)', () => {
    renderItem(createMockRecording({ coverArt: 42 }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('recording-cover-placeholder')).toBeInTheDocument()
  })

  it('renders a placeholder when coverArt is explicitly null', () => {
    renderItem(createMockRecording({ coverArt: null }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('recording-cover-placeholder')).toBeInTheDocument()
  })

  it('prefers the thumbnail size url over the full image url when both are present', () => {
    renderItem(
      createMockRecording({
        coverArt: createMockImage({
          url: '/api/images/file/cover-full.jpg',
          sizes: { thumbnail: { url: '/api/images/file/cover-thumbnail.jpg' } },
        }),
      })
    )

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('cover-thumbnail.jpg'))
  })

  it('sets a responsive sizes attribute matching the mobile/desktop thumbnail box sizes', () => {
    renderItem(createMockRecording({ coverArt: createMockImage({ url: '/api/images/file/cover.jpg' }) }))

    expect(screen.getByRole('img')).toHaveAttribute('sizes', '(min-width: 768px) 48px, 80px')
  })

  it('renders a larger cover art box on mobile that shrinks down at the md breakpoint', () => {
    renderItem(createMockRecording({ coverArt: createMockImage({ url: '/api/images/file/cover.jpg' }) }))

    expect(screen.getByRole('img').parentElement).toHaveClass('h-20', 'w-20', 'md:h-12', 'md:w-12')
  })

  it('falls back to the placeholder when the image fails to load', async () => {
    renderItem(createMockRecording({ coverArt: createMockImage({ url: '/api/images/file/cover.jpg' }) }))

    const img = screen.getByRole('img')
    fireEvent.error(img)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('recording-cover-placeholder')).toBeInTheDocument()
  })

  it('renders metadata and More details link when description exists', () => {
    renderItem(
      createMockRecording({
        recordingLabel: 'Deutsche Grammophon',
        recordingYear: 2020,
        description: descriptionWithText('Some info'),
      })
    )
    expect(screen.getByText(/Deutsche Grammophon • 2020 •/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More details' })).toBeInTheDocument()
  })

  it('shows only the More details link when no metadata but description exists', () => {
    renderItem(createMockRecording({ description: descriptionWithText('Some info') }))
    expect(screen.getByRole('button', { name: 'More details' })).toBeInTheDocument()
  })

  it('shows metadata without More details link when no description', () => {
    renderItem(createMockRecording({ recordingLabel: 'DG', recordingYear: 2020, description: null }))
    expect(screen.getByText('DG • 2020')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More details' })).not.toBeInTheDocument()
  })

  it('renders no subtitle when no metadata and no description', () => {
    renderItem(createMockRecording({ recordingLabel: null, recordingYear: null, description: null }))
    expect(screen.queryByRole('button', { name: 'More details' })).not.toBeInTheDocument()
  })
})
