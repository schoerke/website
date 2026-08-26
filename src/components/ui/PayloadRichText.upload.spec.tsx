// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { versionedUploadJSXConverter } from './PayloadRichText'

const UPDATED_AT = '2026-08-26T10:00:00.000Z'
const VERSION = '?v=2026-08-26T10%3A00%3A00.000Z'

function imageDoc(overrides: Record<string, unknown> = {}) {
  return {
    url: '/api/images/file/photo.jpg',
    updatedAt: UPDATED_AT,
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    alt: 'Photo',
    sizes: {},
    ...overrides,
  }
}

describe('versionedUploadJSXConverter', () => {
  it('renders a versioned img for an image without sizes', () => {
    render(versionedUploadJSXConverter({ node: { value: imageDoc() } as never }))

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', `/api/images/file/photo.jpg${VERSION}`)
    expect(img).toHaveAttribute('width', '800')
    expect(img).toHaveAttribute('height', '600')
  })

  it('renders a versioned picture element (source srcSet + img) when sizes exist', () => {
    render(
      versionedUploadJSXConverter({
        node: {
          value: imageDoc({
            sizes: {
              thumbnail: {
                url: '/api/images/file/photo-400x300.webp',
                width: 400,
                height: 300,
                mimeType: 'image/webp',
                filesize: 15000,
                filename: 'photo-400x300.webp',
              },
            },
          }),
        } as never,
      })
    )

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', `/api/images/file/photo.jpg${VERSION}`)
    const source = document.querySelector('picture source')
    expect(source).not.toBeNull()
    expect(source).toHaveAttribute('srcSet', `/api/images/file/photo-400x300.webp${VERSION}`)
    expect(source).toHaveAttribute('type', 'image/webp')
    expect(source).toHaveAttribute('media', '(max-width: 400px)')
  })

  it('prefers the node-level alt over the doc alt', () => {
    render(
      versionedUploadJSXConverter({
        node: { value: imageDoc({ alt: 'Doc alt' }), fields: { alt: 'Node alt' } } as never,
      })
    )
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Node alt')
  })

  it('leaves the URL unchanged when updatedAt is missing', () => {
    render(versionedUploadJSXConverter({ node: { value: imageDoc({ updatedAt: undefined }) } as never }))
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/images/file/photo.jpg')
  })

  it('renders a link for non-image uploads without versioning', () => {
    render(
      versionedUploadJSXConverter({
        node: {
          value: { url: '/api/documents/file/report.pdf', filename: 'report.pdf', mimeType: 'application/pdf' },
        } as never,
      })
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/api/documents/file/report.pdf')
    expect(link).toHaveTextContent('report.pdf')
  })

  it('returns null for an unpopulated upload value (ID only)', () => {
    expect(versionedUploadJSXConverter({ node: { value: 42 } as never })).toBeNull()
    expect(versionedUploadJSXConverter({ node: { value: null } as never })).toBeNull()
  })
})
