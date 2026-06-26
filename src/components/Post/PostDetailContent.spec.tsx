// @vitest-environment happy-dom
import type { Post } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostDetailContent from './PostDetailContent'

// Mock next/image
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// Mock navigation components
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/ui/BackButton', () => ({
  default: ({ label }: { label: string }) => <button>{label}</button>,
}))

vi.mock('@/components/ui/PayloadRichText', () => ({
  default: () => <div>content</div>,
}))

vi.mock('@/components/ui/SchoerkeLink', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

const baseProps = {
  title: 'Test Post',
  content: {
    root: {
      type: 'root',
      children: [],
      direction: null,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  } as Post['content'],
  createdAt: '2024-06-15T00:00:00.000Z',
  imageUrl: null,
  locale: 'en' as const,
  relatedArtists: [],
  backHref: '/news',
  backLabel: 'All News',
  backButtonLabel: 'Go back',
  relatedArtistLabel: 'Related Artist',
  relatedArtistsLabel: 'Related Artists',
}

describe('PostDetailContent', () => {
  it('should show date by default', () => {
    render(<PostDetailContent {...baseProps} />)

    expect(screen.getByRole('time')).toBeInTheDocument()
    expect(screen.getByRole('time')).toHaveTextContent('June 15, 2024')
  })

  it('should show date when showDate is true', () => {
    render(<PostDetailContent {...baseProps} showDate={true} />)

    expect(screen.getByRole('time')).toBeInTheDocument()
  })

  it('should hide date when showDate is false', () => {
    render(<PostDetailContent {...baseProps} showDate={false} />)

    expect(screen.queryByRole('time')).not.toBeInTheDocument()
  })

  it('should render title', () => {
    render(<PostDetailContent {...baseProps} title="My Project Title" />)

    expect(screen.getByRole('heading', { name: 'My Project Title' })).toBeInTheDocument()
  })
})
