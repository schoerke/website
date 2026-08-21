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
  it('renders name and title in the resting overlay like other team members', () => {
    renderDog()
    expect(screen.getByText('Yuki')).toBeInTheDocument()
    expect(screen.getByText('Office Dog')).toBeInTheDocument()
  })

  it('renders the dog photo grayscale', () => {
    renderDog()
    const img = screen.getByAltText('Yuki')
    expect(img).toHaveAttribute('src', '/dog.jpg')
    expect(img).toHaveAttribute('class', expect.stringContaining('grayscale'))
  })

  it('says Woof! with a bone icon in the desktop-only overlay', () => {
    renderDog()
    const overlay = screen.getByTestId('employee-card-overlay-content')
    expect(overlay).toHaveClass('hidden', 'sm:block', 'translate-y-full', 'sm:group-hover:translate-y-0')
    expect(within(overlay).getByText('Woof!')).toBeInTheDocument()
    expect(overlay.querySelector('svg')).not.toBeNull()
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
