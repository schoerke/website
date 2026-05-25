// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ src, alt, style, className }: { src: string; alt: string; style?: React.CSSProperties; className?: string }) =>
    React.createElement('img', { src, alt, style, className }),
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

  it('renders both icon and full logo images', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    expect(screen.getByAltText('Icon logo')).toBeInTheDocument()
    expect(screen.getByAltText('Full logo')).toBeInTheDocument()
  })

  it('shows full logo and hides icon logo at scroll top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    const icon = screen.getByAltText('Icon logo')
    const full = screen.getByAltText('Full logo')

    expect(icon.className).toContain('opacity-0')
    expect(full.className).toContain('opacity-100')
  })

  it('shows icon logo and hides full logo after scroll', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 50 })
      window.dispatchEvent(new Event('scroll'))
    })

    const icon = screen.getByAltText('Icon logo')
    const full = screen.getByAltText('Full logo')

    expect(icon.className).toContain('opacity-100')
    expect(full.className).toContain('opacity-0')
  })

  it('reverts to full logo when scrolled back to top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 50 })
      window.dispatchEvent(new Event('scroll'))
    })

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 0 })
      window.dispatchEvent(new Event('scroll'))
    })

    const full = screen.getByAltText('Full logo')
    expect(full.className).toContain('opacity-100')
  })

  it('icon is smaller than full logo (height style differs)', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    const icon = screen.getByAltText('Icon logo')
    const full = screen.getByAltText('Full logo')

    expect(icon).toHaveStyle({ height: '40px' })
    expect(full).toHaveStyle({ height: '80px' })
  })

  it('removes scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<ScrollAwareLogo {...defaultProps} />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
