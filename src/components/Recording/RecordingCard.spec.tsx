// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RecordingCard from '@/components/Recording/RecordingCard'
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

describe('RecordingCard', () => {
  it('renders the recording title', async () => {
    const recording = createMockRecording({ title: 'Beethoven - Violin Concerto' })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByText('Beethoven - Violin Concerto')).toBeInTheDocument()
  })

  it('renders label and catalog number joined by a bullet', async () => {
    const recording = createMockRecording({
      recordingLabel: 'Deutsche Grammophon',
      catalogNumber: 'DG 123456',
    })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByText('Deutsche Grammophon • DG 123456')).toBeInTheDocument()
  })

  it('renders only label when catalog and year are absent with no dangling separator', async () => {
    const recording = createMockRecording({
      recordingLabel: 'Deutsche Grammophon',
      catalogNumber: null,
      recordingYear: null,
    })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByText('Deutsche Grammophon')).toBeInTheDocument()
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders only year when label and catalog are absent with no dangling separator', async () => {
    const recording = createMockRecording({
      recordingLabel: null,
      catalogNumber: null,
      recordingYear: 2021,
    })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByText('2021')).toBeInTheDocument()
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders the year separately from label/catalog', async () => {
    const recording = createMockRecording({ recordingYear: 2021 })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByText('2021')).toBeInTheDocument()
  })

  it('renders no metadata row when label, catalog, and year are all absent', async () => {
    const recording = createMockRecording({
      title: 'Solo Title',
      recordingLabel: null,
      catalogNumber: null,
      recordingYear: null,
    })
    const component = await RecordingCard({ recording })
    render(component)

    // Only the title should be present — no label, catalog, or year text
    expect(screen.getByText('Solo Title')).toBeInTheDocument()
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('renders Spotify link when spotifyURL is provided', async () => {
    const recording = createMockRecording({
      title: 'Beethoven - Violin Concerto',
      spotifyURL: 'https://open.spotify.com/album/123',
    })
    const component = await RecordingCard({ recording })
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
    const component = await RecordingCard({ recording })
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
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByRole('link', { name: 'Listen on Spotify: Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('sets aria-label with interpolated title for Apple Music link', async () => {
    const recording = createMockRecording({
      title: 'Beethoven - Violin Concerto',
      appleMusicURL: 'https://music.apple.com/album/123',
    })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByRole('link', { name: 'Listen on Apple Music: Beethoven - Violin Concerto' })).toBeInTheDocument()
  })

  it('renders no streaming links when none are provided', async () => {
    const recording = createMockRecording({ spotifyURL: null, appleMusicURL: null })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.queryByText('Listen on Spotify')).not.toBeInTheDocument()
    expect(screen.queryByText('Listen on Apple Music')).not.toBeInTheDocument()
  })

  it('renders both streaming links when both URLs are provided', async () => {
    const recording = createMockRecording({
      spotifyURL: 'https://open.spotify.com/album/123',
      appleMusicURL: 'https://music.apple.com/album/123',
    })
    const component = await RecordingCard({ recording })
    render(component)

    expect(screen.getByText('Listen on Spotify')).toBeInTheDocument()
    expect(screen.getByText('Listen on Apple Music')).toBeInTheDocument()
  })
})
