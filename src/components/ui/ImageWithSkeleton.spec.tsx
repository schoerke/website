// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ImageWithSkeleton from './ImageWithSkeleton'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
    onLoad,
    onError,
    ref,
  }: {
    src: string
    alt: string
    className?: string
    onLoad?: () => void
    onError?: () => void
    ref?: (node: HTMLImageElement | null) => void
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} ref={ref} onLoad={onLoad} onError={onError} />
  ),
}))

describe('ImageWithSkeleton', () => {
  it('shows a skeleton and keeps the image transparent while loading', () => {
    render(<ImageWithSkeleton src="/wiesbaden.jpg" alt="Wiesbaden" />)

    expect(document.getElementsByClassName('animate-pulse').length).toBe(1)
    expect(screen.getByAltText('Wiesbaden')).toHaveAttribute('class', expect.stringContaining('opacity-0'))
  })

  it('removes the skeleton and fades the image in once loaded', () => {
    render(<ImageWithSkeleton src="/wiesbaden.jpg" alt="Wiesbaden" />)

    fireEvent.load(screen.getByAltText('Wiesbaden'))

    expect(document.getElementsByClassName('animate-pulse').length).toBe(0)
    expect(screen.getByAltText('Wiesbaden')).toHaveAttribute('class', expect.stringContaining('opacity-100'))
  })

  it('replaces the skeleton with a stable fallback when the image fails', () => {
    render(<ImageWithSkeleton src="/wiesbaden.jpg" alt="Wiesbaden" />)

    fireEvent.error(screen.getByAltText('Wiesbaden'))

    expect(document.getElementsByClassName('animate-pulse').length).toBe(0)
    expect(screen.getByTestId('image-with-skeleton-error')).toBeInTheDocument()
  })

  it('renders the image with the requested aspect ratio and priority', () => {
    render(<ImageWithSkeleton src="/wiesbaden.jpg" alt="Wiesbaden" aspectRatio="3 / 2" priority />)

    const img = screen.getByAltText('Wiesbaden')
    expect(img).toHaveAttribute('src', '/wiesbaden.jpg')
  })
})
