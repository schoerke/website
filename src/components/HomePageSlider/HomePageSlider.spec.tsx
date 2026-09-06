/**
 * @vitest-environment happy-dom
 */

import { act, render, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
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

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'news.title': 'News',
      'projects.title': 'Projekte',
    }
    return map[key] ?? key
  },
}))

const slides: HomePageSlide[] = [
  { src: '/img1.jpg', title: 'News One', destination: { type: 'internal', href: '/news/one' } },
  { src: '/img2.jpg', title: 'News Two', destination: { type: 'internal', href: '/news/two' } },
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

describe('HomePageSlider autoplay', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function activeSlideHref(): string | null {
    const links = Array.from(document.querySelectorAll('a'))
    const active = links.find((l) => l.getAttribute('aria-hidden') === 'false')
    return active ? active.getAttribute('href') : null
  }

  function progressWidth(): number {
    const bar = document.querySelector('[style*="width"]') as HTMLElement | null
    return parseFloat(bar?.style.width ?? '0') || 0
  }

  it('advances to the next slide after the interval', () => {
    render(<HomePageSlider slides={slides} interval={9000} />)
    expect(activeSlideHref()).toBe('/news/one')

    // Advance past a full interval + one rAF frame: the fake rAF timestamp lags the clock slightly
    act(() => vi.advanceTimersByTime(9500))
    expect(activeSlideHref()).toBe('/news/two')
  })

  it('animates the progress bar to 100% before advancing', () => {
    render(<HomePageSlider slides={slides} interval={9000} />)
    expect(progressWidth()).toBe(0)

    act(() => vi.advanceTimersByTime(4500))
    expect(progressWidth()).toBeGreaterThan(48)
    expect(progressWidth()).toBeLessThan(52)

    // After a full interval (+frame) it wraps: progress resets and the slide advances
    act(() => vi.advanceTimersByTime(5000))
    expect(progressWidth()).toBe(0)
    expect(activeSlideHref()).toBe('/news/two')
  })

  it('does not auto-advance a single slide', () => {
    const single = [slides[0]]
    render(<HomePageSlider slides={single} interval={9000} />)

    act(() => vi.advanceTimersByTime(9000 * 3))
    expect(activeSlideHref()).toBe('/news/one')
  })

  it('pauses while hovering and resumes from the accumulated position', () => {
    const { container } = render(<HomePageSlider slides={slides} interval={9000} />)

    act(() => vi.advanceTimersByTime(3000))
    fireEvent.mouseEnter(container.firstChild as HTMLElement)
    act(() => vi.advanceTimersByTime(9000))
    // Hover pause: no advance, no progress change
    expect(activeSlideHref()).toBe('/news/one')
    expect(progressWidth()).toBeGreaterThan(31)
    expect(progressWidth()).toBeLessThan(35)

    fireEvent.mouseLeave(container.firstChild as HTMLElement)
    act(() => vi.advanceTimersByTime(6000))
    expect(activeSlideHref()).toBe('/news/two')
  })

  it('pauses while focused (keyboard) and resumes after blur', () => {
    const { container } = render(<HomePageSlider slides={slides} interval={9000} />)

    act(() => vi.advanceTimersByTime(3000))
    fireEvent.focus(container.firstChild as HTMLElement)
    act(() => vi.advanceTimersByTime(9000))
    expect(activeSlideHref()).toBe('/news/one')

    fireEvent.blur(container.firstChild as HTMLElement)
    act(() => vi.advanceTimersByTime(6000))
    expect(activeSlideHref()).toBe('/news/two')
  })

  it('stops autoplay for the session after a dot click', () => {
    const { getByRole } = render(<HomePageSlider slides={slides} interval={9000} />)

    fireEvent.click(getByRole('button', { name: 'Go to slide 2' }))
    expect(activeSlideHref()).toBe('/news/two')

    act(() => vi.advanceTimersByTime(9000 * 3))
    expect(activeSlideHref()).toBe('/news/two')
  })

  it('stops autoplay for the session after activating a slide link', () => {
    const { getByRole } = render(<HomePageSlider slides={slides} interval={9000} />)

    fireEvent.click(getByRole('link', { name: 'News One' }))
    act(() => vi.advanceTimersByTime(9000 * 3))
    expect(activeSlideHref()).toBe('/news/one')
  })
})
