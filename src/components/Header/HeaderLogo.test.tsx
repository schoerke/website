// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('@/services/media.server', () => ({
  getImageByFilename: vi.fn(),
}))

vi.mock('@/services/media', () => ({
  LOGO_FULL_FILENAME: 'schoerke-icon-short-logo.svg',
  LOGO_ICON_FILENAME: 'schoerke-icon-logo.svg',
}))

vi.mock('@/components/Header/ScrollAwareLogo', () => ({
  default: ({
    iconUrl,
    iconAlt,
    fullUrl,
    fullAlt,
  }: {
    iconUrl: string
    iconAlt: string
    fullUrl: string
    fullAlt: string
  }) =>
    React.createElement('div', {
      'data-testid': 'scroll-aware-logo',
      'data-icon-url': iconUrl,
      'data-icon-alt': iconAlt,
      'data-full-url': fullUrl,
      'data-full-alt': fullAlt,
    }),
}))

import type { Image as PayloadImage } from '@/payload-types'
import { getImageByFilename } from '@/services/media.server'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import HeaderLogo from './HeaderLogo'

const mockFull: Partial<PayloadImage> = { url: 'https://cdn.example.com/full.svg', alt: 'Full logo' }
const mockIcon: Partial<PayloadImage> = { url: 'https://cdn.example.com/icon.svg', alt: 'Icon logo' }

beforeEach(() => {
  vi.mocked(getImageByFilename).mockImplementation(async (filename) => {
    if (filename === 'schoerke-icon-short-logo.svg') return mockFull as PayloadImage
    if (filename === 'schoerke-icon-logo.svg') return mockIcon as PayloadImage
    return null
  })
})

describe('HeaderLogo', () => {
  it('passes full logo URL to ScrollAwareLogo', async () => {
    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-full-url', mockFull.url)
  })

  it('passes icon logo URL to ScrollAwareLogo', async () => {
    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-icon-url', mockIcon.url)
  })

  it('passes alt text to ScrollAwareLogo', async () => {
    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-full-alt', mockFull.alt)
  })

  it('falls back to empty string URL when image is unavailable', async () => {
    vi.mocked(getImageByFilename).mockResolvedValue(null)

    render(await HeaderLogo())

    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-full-url', '')
    expect(screen.getByTestId('scroll-aware-logo')).toHaveAttribute('data-icon-url', '')
  })
})
