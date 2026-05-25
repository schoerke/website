// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: React.forwardRef(
    ({ src, alt, style, className }: { src: string; alt: string; style?: React.CSSProperties; className?: string }, ref: React.Ref<HTMLImageElement>) =>
      React.createElement('img', { src, alt, style, className, ref }),
  ),
}))

import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import ScrollAwareLogo from './ScrollAwareLogo'

const defaultProps = {
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

  it('renders at full height (80px) at scroll top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    expect(screen.getByAltText('Full logo')).toHaveStyle({ height: '80px' })
  })

  it('renders at minimum height (64px) when fully scrolled past range', () => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 200 })
    render(<ScrollAwareLogo {...defaultProps} />)

    const img = screen.getByAltText('Full logo') as HTMLElement
    expect(img.style.height).toBe('64px')
  })

  it('interpolates height continuously between 80px and 64px', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 40 }) // 50% of 80px range
      window.dispatchEvent(new Event('scroll'))
    })

    const img = screen.getByAltText('Full logo') as HTMLElement
    // At 50% scroll: 80 - 0.5 * (80 - 64) = 72px
    expect(img.style.height).toBe('72px')
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

    expect((screen.getByAltText('Full logo') as HTMLElement).style.height).toBe('80px')
  })

  it('syncs height on mount when page is already scrolled', () => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 80 })

    render(<ScrollAwareLogo {...defaultProps} />)

    expect((screen.getByAltText('Full logo') as HTMLElement).style.height).toBe('64px')
  })

  it('renders fallback text when fullUrl is empty', () => {
    render(<ScrollAwareLogo fullUrl="" fullAlt="Logo" />)

    expect(screen.getByText('KSSchoerke')).toBeInTheDocument()
  })

  it('removes scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<ScrollAwareLogo {...defaultProps} />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
