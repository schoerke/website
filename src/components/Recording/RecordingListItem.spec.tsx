// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RecordingListItem from '@/components/Recording/RecordingListItem'
import { createMockRecording } from '@/tests/utils/payloadMocks'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, params?: Record<string, string>) => {
    const messages: Record<string, string> = {
      listenOnSpotify: 'Listen on Spotify',
      listenOnAppleMusic: 'Listen on Apple Music',
      opensInNewTab: 'opens in new tab',
    }
    if (key === 'listenOnSpotifyFor') return `Listen on Spotify: ${params?.title}`
    if (key === 'listenOnAppleMusicFor') return `Listen on Apple Music: ${params?.title}`
    return messages[key] ?? key
  }),
}))

describe('RecordingListItem', () => {
  it('renders the recording title', async () => {
    const recording = createMockRecording({ title: 'Beethoven - Violin Concerto' })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.getByText('Beethoven - Violin Concerto')).toBeInTheDocument()
  })

  it('renders subtitle with label, catalog number, and year separated by bullets', async () => {
    const recording = createMockRecording({
      recordingLabel: 'Deutsche Grammophon',
      catalogNumber: 'DG 123456',
      recordingYear: 2020,
    })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.getByText('Deutsche Grammophon • DG 123456 • 2020')).toBeInTheDocument()
  })

  it('omits missing subtitle fields', async () => {
    const recording = createMockRecording({
      recordingLabel: 'Deutsche Grammophon',
      catalogNumber: null,
      recordingYear: null,
    })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.getByText('Deutsche Grammophon')).toBeInTheDocument()
  })

  it('renders no subtitle when all subtitle fields are absent', async () => {
    const recording = createMockRecording({
      recordingLabel: null,
      catalogNumber: null,
      recordingYear: null,
    })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders Spotify link when spotifyURL is provided', async () => {
    const recording = createMockRecording({
      title: 'Beethoven - Violin Concerto',
      spotifyURL: 'https://open.spotify.com/album/123',
    })
    const component = await RecordingListItem({ recording })
    render(component)

    const link = screen.getByText('Listen on Spotify')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://open.spotify.com/album/123')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Apple Music link when appleMusicURL is provided', async () => {
    const recording = createMockRecording({
      title: 'Beethoven - Violin Concerto',
      appleMusicURL: 'https://music.apple.com/album/123',
    })
    const component = await RecordingListItem({ recording })
    render(component)

    const link = screen.getByText('Listen on Apple Music')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://music.apple.com/album/123')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sets aria-label with interpolated title for Spotify link', async () => {
    const recording = createMockRecording({
      title: 'Beethoven - Violin Concerto',
      spotifyURL: 'https://open.spotify.com/album/123',
    })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.getByRole('link', { name: 'Listen on Spotify: Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('sets aria-label with interpolated title for Apple Music link', async () => {
    const recording = createMockRecording({
      title: 'Beethoven - Violin Concerto',
      appleMusicURL: 'https://music.apple.com/album/123',
    })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.getByRole('link', { name: 'Listen on Apple Music: Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('renders no streaming links when none are provided', async () => {
    const recording = createMockRecording({ spotifyURL: null, appleMusicURL: null })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.queryByText('Listen on Spotify')).not.toBeInTheDocument()
    expect(screen.queryByText('Listen on Apple Music')).not.toBeInTheDocument()
  })

  it('renders both streaming links when both URLs are provided', async () => {
    const recording = createMockRecording({
      spotifyURL: 'https://open.spotify.com/album/123',
      appleMusicURL: 'https://music.apple.com/album/123',
    })
    const component = await RecordingListItem({ recording })
    render(component)

    expect(screen.getByText('Listen on Spotify')).toBeInTheDocument()
    expect(screen.getByText('Listen on Apple Music')).toBeInTheDocument()
  })
})
