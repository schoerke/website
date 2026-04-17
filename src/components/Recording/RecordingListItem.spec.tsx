// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import RecordingListItem from '@/components/Recording/RecordingListItem'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockRecording } from '@/tests/utils/payloadMocks'

const messages = {
  custom: {
    pages: {
      artist: {
        discography: {
          listenOnSpotify: 'Listen on Spotify',
          listenOnAppleMusic: 'Listen on Apple Music',
          opensInNewTab: 'opens in new tab',
          listenOnSpotifyFor: 'Listen on Spotify: {title}',
          listenOnAppleMusicFor: 'Listen on Apple Music: {title}',
        },
      },
    },
  },
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

  it('renders subtitle with label, catalog number, and year separated by bullets', () => {
    renderItem(
      createMockRecording({
        recordingLabel: 'Deutsche Grammophon',
        catalogNumber: 'DG 123456',
        recordingYear: 2020,
      })
    )

    expect(screen.getByText('Deutsche Grammophon • DG 123456 • 2020')).toBeInTheDocument()
  })

  it('omits missing subtitle fields with no dangling separator', () => {
    renderItem(
      createMockRecording({
        recordingLabel: 'Deutsche Grammophon',
        catalogNumber: null,
        recordingYear: null,
      })
    )

    expect(screen.getByText('Deutsche Grammophon')).toBeInTheDocument()
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders only catalog number when label and year are absent', () => {
    renderItem(
      createMockRecording({
        recordingLabel: null,
        catalogNumber: 'DG 123456',
        recordingYear: null,
      })
    )

    expect(screen.getByText('DG 123456')).toBeInTheDocument()
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders only year when label and catalog are absent', () => {
    renderItem(
      createMockRecording({
        recordingLabel: null,
        catalogNumber: null,
        recordingYear: 2020,
      })
    )

    expect(screen.getByText('2020')).toBeInTheDocument()
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders no subtitle when all subtitle fields are absent', () => {
    renderItem(
      createMockRecording({
        recordingLabel: null,
        catalogNumber: null,
        recordingYear: null,
      })
    )

    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders Spotify link when spotifyURL is provided', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        spotifyURL: 'https://open.spotify.com/album/123',
      })
    )

    const link = screen.getByText('Listen on Spotify')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://open.spotify.com/album/123')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Apple Music link when appleMusicURL is provided', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )

    const link = screen.getByText('Listen on Apple Music')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://music.apple.com/album/123')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sets aria-label with interpolated title for Spotify link', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        spotifyURL: 'https://open.spotify.com/album/123',
      })
    )

    expect(screen.getByRole('link', { name: 'Listen on Spotify: Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('sets aria-label with interpolated title for Apple Music link', () => {
    renderItem(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )

    expect(screen.getByRole('link', { name: 'Listen on Apple Music: Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('renders no streaming links when none are provided', () => {
    renderItem(createMockRecording({ spotifyURL: null, appleMusicURL: null }))

    expect(screen.queryByText('Listen on Spotify')).not.toBeInTheDocument()
    expect(screen.queryByText('Listen on Apple Music')).not.toBeInTheDocument()
  })

  it('renders both streaming links when both URLs are provided', () => {
    renderItem(
      createMockRecording({
        spotifyURL: 'https://open.spotify.com/album/123',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )

    expect(screen.getByText('Listen on Spotify')).toBeInTheDocument()
    expect(screen.getByText('Listen on Apple Music')).toBeInTheDocument()
  })
})
