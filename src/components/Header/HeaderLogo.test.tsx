// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('@/services/media.server', () => ({
  getImageByFilename: vi.fn(),
}))

vi.mock('@/services/media', () => ({
  LOGO_ICON_FILENAME: 'schoerke-icon-logo.svg',
  LOGO_FULL_FILENAME: 'schoerke-icon-short-logo.svg',
}))

vi.mock('@/components/Header/ScrollAwareLogo', () => ({
  default: ({ iconUrl, iconAlt, fullUrl, fullAlt }: {
    iconUrl: string
    iconAlt: string
    fullUrl: string
    fullAlt: string
  }) => React.createElement('div', { 'data-testid': 'scroll-aware-logo', 'data-icon-url': iconUrl, 'data-full-url': fullUrl, 'data-icon-alt': iconAlt, 'data-full-alt': fullAlt }),
}))

import { getImageByFilename } from '@/services/media.server'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import HeaderLogo from './HeaderLogo'

const mockIcon = { url: 'https://cdn.example.com/icon.svg', alt: 'Icon' }
const mockFull = { url: 'https://cdn.example.com/full.svg', alt: 'Full logo' }

beforeEach(() => {
  vi.mocked(getImageByFilename).mockResolvedValue(null)
})

describe('HeaderLogo', () => {
  it('passes icon and full logo URLs to ScrollAwareLogo', async () => {
    vi.mocked(getImageByFilename)
      .mockResolvedValueOnce(mockIcon as never)
      .mockResolvedValueOnce(mockFull as never)

    render(await HeaderLogo())

    const logo = screen.getByTestId('scroll-aware-logo')
    expect(logo).toHaveAttribute('data-icon-url', mockIcon.url)
    expect(logo).toHaveAttribute('data-full-url', mockFull.url)
  })

  it('passes alt text to ScrollAwareLogo', async () => {
    vi.mocked(getImageByFilename)
      .mockResolvedValueOnce(mockIcon as never)
      .mockResolvedValueOnce(mockFull as never)

    render(await HeaderLogo())

    const logo = screen.getByTestId('scroll-aware-logo')
    expect(logo).toHaveAttribute('data-icon-alt', mockIcon.alt)
    expect(logo).toHaveAttribute('data-full-alt', mockFull.alt)
  })

  it('falls back to empty string URLs when images are unavailable', async () => {
    render(await HeaderLogo())

    const logo = screen.getByTestId('scroll-aware-logo')
    expect(logo).toHaveAttribute('data-icon-url', '')
    expect(logo).toHaveAttribute('data-full-url', '')
  })
})
