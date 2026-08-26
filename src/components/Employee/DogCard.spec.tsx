// @vitest-environment happy-dom

import { createMockImage } from '@/tests/utils/payloadMocks'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DogCard from './DogCard'

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

const dogImage = createMockImage({ id: 99, url: '/dog.jpg', alt: 'Yuki' })

const renderDog = () => render(<DogCard image={dogImage} name="Yuki" title="Office Dog" />)

describe('DogCard', () => {
  it('renders name and title in the resting scrim only; overlay carries Woof! alone', () => {
    renderDog()
    const scrim = screen.getByTestId('employee-card-name')
    expect(within(scrim).getByText('Yuki')).toBeInTheDocument()
    expect(within(scrim).getByText('Office Dog')).toBeInTheDocument()
    const overlay = screen.getByTestId('employee-card-overlay-content')
    expect(within(overlay).queryByText('Yuki')).not.toBeInTheDocument()
    expect(within(overlay).queryByText('Office Dog')).not.toBeInTheDocument()
  })

  it('keeps the resting scrim name/title on top and never fades it on hover', () => {
    renderDog()
    expect(screen.getByTestId('employee-card-name').parentElement).toHaveClass('pointer-events-none', 'z-10')
    expect(screen.getByTestId('employee-card-name')).not.toHaveClass('group-hover:opacity-0')
  })

  it('renders the dog photo grayscale', () => {
    renderDog()
    const img = screen.getByAltText('Yuki')
    expect(img).toHaveAttribute('src', '/dog.jpg?v=2024-01-01T00%3A00%3A00.000Z')
    expect(img).toHaveAttribute('class', expect.stringContaining('grayscale'))
  })

  it('says Woof! with a bone icon in the desktop-only overlay', () => {
    renderDog()
    const overlay = screen.getByTestId('employee-card-overlay-content')
    expect(overlay).toHaveClass(
      'hidden',
      'sm:block',
      'inset-0',
      'opacity-0',
      'sm:group-hover:opacity-100',
      'sm:group-hover:pointer-events-auto'
    )
    expect(within(overlay).getByText('Woof!')).toBeInTheDocument()
    expect(overlay.querySelector('svg')).not.toBeNull()
  })

  it('places the bone icon before the Woof! label', () => {
    renderDog()
    const overlay = screen.getByTestId('employee-card-overlay-content')
    const woofRow = within(overlay).getByText('Woof!').parentElement
    expect(woofRow?.firstElementChild?.tagName).toBe('svg')
  })

  it('does not reveal Woof! on mobile (name and title only)', () => {
    renderDog()
    const overlay = screen.getByTestId('employee-card-overlay-content')
    expect(overlay).toHaveClass('hidden')
  })

  it('renders a localized woof label', () => {
    render(<DogCard image={dogImage} name="Yuki" title="Office Dog" woofLabel="Wuff!" />)
    expect(screen.getByText('Wuff!')).toBeInTheDocument()
  })

  it('falls back to the placeholder when the image is missing', () => {
    render(<DogCard name="Yuki" title="Office Dog" />)
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
    expect(screen.getByText('Woof!')).toBeInTheDocument()
  })
})
