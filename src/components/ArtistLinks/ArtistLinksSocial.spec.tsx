// @vitest-environment happy-dom

import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ArtistLinksSocial from './ArtistLinksSocial'

const testMessages = {
  custom: {
    pages: {
      artist: {
        artistLinks: {
          ariaLabels: {
            facebook: 'Visit Facebook profile',
            twitter: 'Visit X (Twitter) profile',
            instagram: 'Visit Instagram profile',
            youtube: 'Visit YouTube channel',
            spotify: 'Visit Spotify profile',
          },
        },
      },
    },
  },
}

describe('ArtistLinksSocial', () => {
  it('returns null when all props are undefined', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('returns null when all social URLs are null', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial
          facebookURL={null}
          twitterURL={null}
          instagramURL={null}
          youtubeURL={null}
          spotifyURL={null}
        />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders only Facebook icon when only Facebook URL exists', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial
          facebookURL="https://facebook.com/artist"
          twitterURL={null}
          instagramURL={null}
          youtubeURL={null}
          spotifyURL={null}
        />
      </NextIntlTestProvider>,
    )

    const link = screen.getByRole('link', { name: 'Visit Facebook profile' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://facebook.com/artist')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders multiple icons when multiple URLs exist', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial
          facebookURL="https://facebook.com/artist"
          twitterURL="https://twitter.com/artist"
          instagramURL="https://instagram.com/artist"
          youtubeURL={null}
          spotifyURL={null}
        />
      </NextIntlTestProvider>,
    )

    expect(screen.getByRole('link', { name: 'Visit Facebook profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit X (Twitter) profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit Instagram profile' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visit YouTube channel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visit Spotify profile' })).not.toBeInTheDocument()
  })

  it('renders all social media icons when all URLs exist', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial
          facebookURL="https://facebook.com/artist"
          twitterURL="https://twitter.com/artist"
          instagramURL="https://instagram.com/artist"
          youtubeURL="https://youtube.com/artist"
          spotifyURL="https://spotify.com/artist"
        />
      </NextIntlTestProvider>,
    )

    expect(screen.getByRole('link', { name: 'Visit Facebook profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit X (Twitter) profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit Instagram profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit YouTube channel' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit Spotify profile' })).toBeInTheDocument()
  })

  it('links have correct URLs', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial
          facebookURL="https://facebook.com/test-artist"
          twitterURL="https://twitter.com/test_artist"
          instagramURL="https://instagram.com/test.artist"
          youtubeURL="https://youtube.com/@testartist"
          spotifyURL="https://open.spotify.com/artist/abc123"
        />
      </NextIntlTestProvider>,
    )

    expect(screen.getByRole('link', { name: 'Visit Facebook profile' })).toHaveAttribute(
      'href',
      'https://facebook.com/test-artist',
    )
    expect(screen.getByRole('link', { name: 'Visit X (Twitter) profile' })).toHaveAttribute(
      'href',
      'https://twitter.com/test_artist',
    )
    expect(screen.getByRole('link', { name: 'Visit Instagram profile' })).toHaveAttribute(
      'href',
      'https://instagram.com/test.artist',
    )
    expect(screen.getByRole('link', { name: 'Visit YouTube channel' })).toHaveAttribute(
      'href',
      'https://youtube.com/@testartist',
    )
    expect(screen.getByRole('link', { name: 'Visit Spotify profile' })).toHaveAttribute(
      'href',
      'https://open.spotify.com/artist/abc123',
    )
  })

  it('all links open in new tab with security attributes', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksSocial
          facebookURL="https://facebook.com/artist"
          twitterURL="https://twitter.com/artist"
          instagramURL="https://instagram.com/artist"
          youtubeURL="https://youtube.com/artist"
          spotifyURL="https://spotify.com/artist"
        />
      </NextIntlTestProvider>,
    )

    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})
