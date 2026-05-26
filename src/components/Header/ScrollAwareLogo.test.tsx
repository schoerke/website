// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: React.forwardRef(
    (
      { src, alt, style, className }: { src: string; alt: string; style?: React.CSSProperties; className?: string },
      ref: React.Ref<HTMLImageElement>
    ) => React.createElement('img', { src, alt, style, className, ref })
  ),
}))

import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import ScrollAwareLogo from './ScrollAwareLogo'

const defaultProps = {
  iconUrl: '/icon.svg',
  iconAlt: 'Icon logo',
  fullUrl: '/full.svg',
  fullAlt: 'Full logo',
}

describe('ScrollAwareLogo', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the full logo', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    expect(screen.getByAltText('Full logo')).toBeInTheDocument()
  })

  it('renders the icon logo', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    expect(screen.getByAltText('Icon logo')).toBeInTheDocument()
  })

  it('icon logo is visible on mobile (sm:hidden)', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    const icon = screen.getByAltText('Icon logo')
    expect(icon.closest('div') ?? icon).toHaveClass('sm:hidden')
  })

  it('full logo is hidden on mobile (hidden sm:block)', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    const full = screen.getByAltText('Full logo')
    expect(full.closest('div') ?? full).toHaveClass('hidden')
    expect(full.closest('div') ?? full).toHaveClass('sm:block')
  })

  it('renders at full height (64px) at scroll top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    expect(screen.getByAltText('Full logo')).toHaveStyle({ height: '64px' })
  })

  it('renders at minimum height (48px) when fully scrolled past range', () => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 200 })
    render(<ScrollAwareLogo {...defaultProps} />)

    const img = screen.getByAltText('Full logo') as HTMLElement
    expect(img.style.height).toBe('48px')
  })

  it('interpolates height continuously between 64px and 48px', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 40 }) // 50% of 80px range
      window.dispatchEvent(new Event('scroll'))
    })

    const img = screen.getByAltText('Full logo') as HTMLElement
    // At 50% scroll: 64 - 0.5 * (64 - 48) = 56px
    expect(img.style.height).toBe('56px')
  })

  it('restores to full height when scrolling back to top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 80 })
      window.dispatchEvent(new Event('scroll'))
    })

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 0 })
      window.dispatchEvent(new Event('scroll'))
    })

    expect((screen.getByAltText('Full logo') as HTMLElement).style.height).toBe('64px')
  })

  it('syncs height on mount when page is already scrolled', () => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 80 })

    render(<ScrollAwareLogo {...defaultProps} />)

    expect((screen.getByAltText('Full logo') as HTMLElement).style.height).toBe('48px')
  })

  it('renders fallback text when iconUrl is empty', () => {
    render(<ScrollAwareLogo iconUrl="" iconAlt="Logo" fullUrl="/full.svg" fullAlt="Full logo" />)

    expect(screen.getByText('KSSchoerke')).toBeInTheDocument()
  })

  it('renders nothing in desktop slot when fullUrl is empty', () => {
    render(<ScrollAwareLogo iconUrl="/icon.svg" iconAlt="Icon" fullUrl="" fullAlt="Logo" />)

    // Desktop div exists but contains no image
    expect(screen.queryByAltText('Logo')).not.toBeInTheDocument()
  })

  it('removes scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<ScrollAwareLogo {...defaultProps} />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
