// @vitest-environment happy-dom

import { Document } from '@/payload-types'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ArtistLinksDownloads from './ArtistLinksDownloads'

const testMessages = {
  custom: {
    pages: {
      artist: {
        artistLinks: {
          downloads: {
            heading: 'Downloads',
            biography: 'Biography PDF',
            gallery: 'Photo Gallery',
          },
        },
      },
    },
  },
}

describe('ArtistLinksDownloads', () => {
  it('returns null when downloads is undefined', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('returns null when both download fields are null', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: null, galleryZIP: null }} />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('returns null when both download fields are undefined', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{}} />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('returns null when both downloads are numbers (unresolved relationships)', () => {
    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: 123, galleryZIP: 456 }} />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders only biography link when only biographyPDF exists', () => {
    const biographyDoc: Document = {
      id: 1,
      title: 'Biography PDF',
      filename: 'biography.pdf',
      mimeType: 'application/pdf',
      filesize: 1024,
      url: '/media/biography.pdf',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: biographyDoc, galleryZIP: null }} />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('Downloads')).toBeInTheDocument()
    const biographyLink = screen.getByRole('link', { name: /Biography PDF/i })
    expect(biographyLink).toBeInTheDocument()
    expect(biographyLink).toHaveAttribute('href', '/media/biography.pdf')
    expect(biographyLink).toHaveAttribute('target', '_blank')
    expect(biographyLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: /Photo Gallery/i })).not.toBeInTheDocument()
  })

  it('renders only gallery link when only galleryZIP exists', () => {
    const galleryDoc: Document = {
      id: 2,
      title: 'Photo Gallery',
      filename: 'gallery.zip',
      mimeType: 'application/zip',
      filesize: 2048,
      url: '/media/gallery.zip',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: null, galleryZIP: galleryDoc }} />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('Downloads')).toBeInTheDocument()
    const galleryLink = screen.getByRole('link', { name: /Photo Gallery/i })
    expect(galleryLink).toBeInTheDocument()
    expect(galleryLink).toHaveAttribute('href', '/media/gallery.zip')
    expect(galleryLink).toHaveAttribute('target', '_blank')
    expect(galleryLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: /Biography PDF/i })).not.toBeInTheDocument()
  })

  it('renders both links when both downloads exist', () => {
    const biographyDoc: Document = {
      id: 1,
      title: 'Biography PDF',
      filename: 'biography.pdf',
      mimeType: 'application/pdf',
      filesize: 1024,
      url: '/media/biography.pdf',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const galleryDoc: Document = {
      id: 2,
      title: 'Photo Gallery',
      filename: 'gallery.zip',
      mimeType: 'application/zip',
      filesize: 2048,
      url: '/media/gallery.zip',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: biographyDoc, galleryZIP: galleryDoc }} />
      </NextIntlTestProvider>,
    )

    expect(screen.getByText('Downloads')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Biography PDF/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Photo Gallery/i })).toBeInTheDocument()
  })

  it('links have correct URLs', () => {
    const biographyDoc: Document = {
      id: 1,
      title: 'Artist Biography',
      filename: 'artist-bio.pdf',
      mimeType: 'application/pdf',
      filesize: 1024,
      url: '/downloads/artist-biography.pdf',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const galleryDoc: Document = {
      id: 2,
      title: 'Artist Photo Gallery',
      filename: 'photos.zip',
      mimeType: 'application/zip',
      filesize: 2048,
      url: '/downloads/photo-gallery.zip',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: biographyDoc, galleryZIP: galleryDoc }} />
      </NextIntlTestProvider>,
    )

    expect(screen.getByRole('link', { name: /Biography PDF/i })).toHaveAttribute(
      'href',
      '/downloads/artist-biography.pdf',
    )
    expect(screen.getByRole('link', { name: /Photo Gallery/i })).toHaveAttribute('href', '/downloads/photo-gallery.zip')
  })

  it('all links open in new tab with security attributes', () => {
    const biographyDoc: Document = {
      id: 1,
      title: 'Biography PDF',
      filename: 'biography.pdf',
      mimeType: 'application/pdf',
      filesize: 1024,
      url: '/media/biography.pdf',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const galleryDoc: Document = {
      id: 2,
      title: 'Photo Gallery',
      filename: 'gallery.zip',
      mimeType: 'application/zip',
      filesize: 2048,
      url: '/media/gallery.zip',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: biographyDoc, galleryZIP: galleryDoc }} />
      </NextIntlTestProvider>,
    )

    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('returns null when document has no url property', () => {
    const docWithoutURL: Document = {
      id: 1,
      title: 'Biography PDF',
      filename: 'biography.pdf',
      mimeType: 'application/pdf',
      filesize: 1024,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    const { container } = render(
      <NextIntlTestProvider messages={testMessages}>
        <ArtistLinksDownloads downloads={{ biographyPDF: docWithoutURL, galleryZIP: null }} />
      </NextIntlTestProvider>,
    )

    expect(container.firstChild).toBeNull()
  })
})
