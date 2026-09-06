// @vitest-environment happy-dom

import type { Document } from '@/payload-types'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ArtistLinks from '.'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

const messages = {
  custom: {
    pages: {
      artist: {
        artistLinks: {
          heading: 'Links & Downloads',
          ariaLabels: {
            visitHomepage: 'Visit artist homepage',
            calendar: 'View concert dates',
            facebook: 'Visit Facebook profile',
            instagram: 'Visit Instagram profile',
            twitter: 'Visit Twitter/X profile',
            youtube: 'Visit YouTube channel',
            spotify: 'Listen on Spotify',
          },
          downloads: {
            biography: 'Biography PDF',
            gallery: 'Photo Gallery ZIP',
          },
        },
      },
    },
  },
}

const biography: Document = {
  id: 1,
  title: 'Biography PDF',
  filename: 'biography.pdf',
  mimeType: 'application/pdf',
  filesize: 1024,
  url: '/media/biography.pdf',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

describe('ArtistLinks', () => {
  it('renders one shared heading and direct, right-aligned desktop download links', () => {
    render(
      <NextIntlTestProvider messages={messages}>
        <ArtistLinks homepageURL="https://example.com" downloads={{ biographyPdf: biography }} />
      </NextIntlTestProvider>
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Links & Downloads' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Links' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /downloads/i })).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Biography PDF' })
    expect(link.parentElement).toHaveClass('md:flex', 'md:justify-end')
    expect(link.querySelector('span')).toHaveClass('md:order-first')
  })
})
