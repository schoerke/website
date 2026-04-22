/**
 * @vitest-environment happy-dom
 */

import { render, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePageSlider from './HomePageSlider'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onLoad,
    onError,
    priority,
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src as string}
        alt={alt}
        data-priority={priority ? 'true' : undefined}
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
    )
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href as string} {...props}>
      {children}
    </a>
  ),
}))

const slides = [
  { src: '/img1.jpg', alt: 'Slide 1', title: 'News One', href: '/news/one' },
  { src: '/img2.jpg', alt: 'Slide 2', title: 'News Two', href: '/news/two' },
]

describe('HomePageSlider skeleton', () => {
  it('should show a skeleton before the first image loads', () => {
    render(<HomePageSlider slides={slides} />)
    expect(document.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('should remove the skeleton after the first image fires onLoad', () => {
    render(<HomePageSlider slides={slides} />)
    const firstImg = document.querySelector('img[src="/img1.jpg"]') as HTMLImageElement
    fireEvent.load(firstImg)
    expect(document.querySelector('.animate-pulse')).toBeNull()
  })

  it('should remove the skeleton after the first image fires onError', () => {
    render(<HomePageSlider slides={slides} />)
    const firstImg = document.querySelector('img[src="/img1.jpg"]') as HTMLImageElement
    fireEvent.error(firstImg)
    expect(document.querySelector('.animate-pulse')).toBeNull()
  })
})
