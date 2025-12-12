// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ArtistLinksHomepage from './ArtistLinksHomepage'

const testMessages = {
  custom: {
    pages: {
      artist: {
        artistLinks: {
          homepage: 'Homepage',
          ariaLabels: {
            visitHomepage: 'Visit artist homepage',
          },
        },
      },
    },
  },
}

describe('ArtistLinksHomepage', () => {
  it('renders nothing when homepageURL is null', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL={null} />
      </NextIntlTestProvider>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when homepageURL is undefined', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage />
      </NextIntlTestProvider>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders homepage link with correct URL', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="https://www.example.com" />
      </NextIntlTestProvider>,
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://www.example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('displays clean domain without protocol and www', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="https://www.example.com/path" />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('example.com/path')).toBeInTheDocument()
  })

  it('displays clean domain without protocol (no www)', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="https://example.com" />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('displays clean domain with http protocol', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="http://www.example.com" />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('renders Homepage header', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="https://example.com" />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('Homepage')).toBeInTheDocument()
  })

  it('has accessible aria-label', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="https://example.com" />
      </NextIntlTestProvider>,
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('aria-label', 'Visit artist homepage')
  })

  it('renders external link icon', () => {
    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksHomepage homepageURL="https://example.com" />
      </NextIntlTestProvider>,
    )

    // Icon should have aria-hidden
    const icon = screen.getByRole('link').querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
