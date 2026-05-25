// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('@/services/media.server', () => ({
  getImageByFilename: vi.fn(),
}))

vi.mock('@/services/media', () => ({
  LOGO_FULL_FILENAME: 'schoerke-icon-short-logo.svg',
}))

vi.mock('@/components/Header/ScrollAwareLogo', () => ({
  default: ({ fullUrl, fullAlt }: { fullUrl: string; fullAlt: string }) =>
    React.createElement('div', { 'data-testid': 'scroll-aware-logo', 'data-full-url': fullUrl, 'data-full-alt': fullAlt }),
}))

import type { Image as PayloadImage } from '@/payload-types'
import { getImageByFilename } from '@/services/media.server'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import HeaderLogo from './HeaderLogo'

const mockFull: Partial<PayloadImage> = { url: 'https://cdn.example.com/full.svg', alt: 'Full logo' }

beforeEach(() => {
  vi.mocked(getImageByFilename).mockResolvedValue(null)
})

describe('HeaderLogo', () => {
  it('passes full logo URL to ScrollAwareLogo', async () => {
    vi.mocked(getImageByFilename).mockResolvedValueOnce(mockFull as PayloadImage)

    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-full-url', mockFull.url)
  })

  it('passes alt text to ScrollAwareLogo', async () => {
    vi.mocked(getImageByFilename).mockResolvedValueOnce(mockFull as PayloadImage)

    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-full-alt', mockFull.alt)
  })

  it('falls back to empty string URL when image is unavailable', async () => {
    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-full-url', '')
  })
})
