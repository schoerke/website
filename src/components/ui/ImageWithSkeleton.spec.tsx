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
    fill: _fill,
    priority: _priority,
    quality: _quality,
    ...rest
  }: {
    src: string
    alt: string
    className?: string
    onLoad?: () => void
    onError?: () => void
    ref?: (node: HTMLImageElement | null) => void
    fill?: boolean
    priority?: boolean
    quality?: number
    sizes?: string
    style?: React.CSSProperties
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} ref={ref} onLoad={onLoad} onError={onError} {...rest} />
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
    const { container } = render(
      <ImageWithSkeleton src="/wiesbaden.jpg" alt="Wiesbaden" aspectRatio="3 / 2" priority />
    )

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.aspectRatio).toBe('3 / 2')
    expect(screen.getByAltText('Wiesbaden')).toHaveAttribute('src', '/wiesbaden.jpg')
  })

  it('applies the object position to the image', () => {
    render(<ImageWithSkeleton src="/artist.jpg" alt="Artist" objectPosition="50% 20%" quality={80} />)

    const img = screen.getByAltText('Artist')
    expect(img).toHaveStyle({ objectPosition: '50% 20%' })
  })

  it('calls the onError prop when the image fails', () => {
    const onError = vi.fn()
    render(<ImageWithSkeleton src="/wiesbaden.jpg" alt="Wiesbaden" onError={onError} />)

    fireEvent.error(screen.getByAltText('Wiesbaden'))

    expect(onError).toHaveBeenCalledTimes(1)
  })
})
