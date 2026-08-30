/**
 * @vitest-environment happy-dom
 */

import { render, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomePageSlider, { type HomePageSlide } from './HomePageSlider'

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
    return (
      <img // oxlint-disable-line eslint-plugin-next/no-img-element
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
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string; params: { slug: string } }
    children: React.ReactNode
  }) => (
    <a href={typeof href === 'string' ? href : href.pathname.replace('[slug]', href.params.slug)} {...props}>
      {children}
    </a>
  ),
}))

const slides: HomePageSlide[] = [
  { src: '/img1.jpg', alt: 'Slide 1', title: 'News One', destination: { type: 'internal', href: '/news/one' } },
  { src: '/img2.jpg', alt: 'Slide 2', title: 'News Two', destination: { type: 'internal', href: '/news/two' } },
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

describe('HomePageSlider focal point', () => {
  it('falls back to object-position top when no focal point is provided', () => {
    render(<HomePageSlider slides={slides} />)
    const img = document.querySelector('img[src="/img1.jpg"]') as HTMLImageElement
    expect(img.style.objectPosition).toBe('top')
  })

  it('applies the slide focal point as object-position', () => {
    const focalSlides = [{ ...slides[0], focalX: 42, focalY: 68 }]
    render(<HomePageSlider slides={focalSlides} />)
    const img = document.querySelector('img[src="/img1.jpg"]') as HTMLImageElement
    expect(img.style.objectPosition).toBe('42% 68%')
  })
})

describe('HomePageSlider destinations', () => {
  it('passes a next-intl pathname object to its slide link', () => {
    const destination = { pathname: '/news/[slug]', params: { slug: 'news-one' } }
    const destinationSlides: HomePageSlide[] = [{ ...slides[0], destination: { type: 'internal', href: destination } }]

    const { getByRole } = render(<HomePageSlider slides={destinationSlides} />)

    expect(getByRole('link', { name: 'News One' })).toHaveAttribute('href', '/news/news-one')
  })
})
