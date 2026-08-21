// @vitest-environment happy-dom

import { createMockEmployee } from '@/tests/utils/payloadMocks'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeamMemberCard from './TeamMemberCard'

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

const defaultEmployee = createMockEmployee({
  id: 1,
  name: 'Jane Smith',
  title: 'Senior Manager',
  email: 'jane@example.com',
  phone: '+49 611 111111',
  mobile: '+49 171 222222',
  image: { id: 10, url: '/jane.jpg', alt: 'Jane', updatedAt: '', createdAt: '' },
})

const renderCard = (overrides: Record<string, unknown> = {}) => {
  const utils = render(<TeamMemberCard {...defaultEmployee} {...(overrides as Partial<typeof defaultEmployee>)} />)
  const overlay = screen.queryByTestId('employee-card-overlay-content')
  const mobileButtons = screen.getByTestId('employee-card-mobile-buttons')
  return { ...utils, overlay, mobileButtons }
}

describe('TeamMemberCard', () => {
  it('renders name and title in the resting scrim only; overlay carries contact alone', () => {
    renderCard()
    const scrim = screen.getByTestId('employee-card-name')
    expect(within(scrim).getByText('Jane Smith')).toBeInTheDocument()
    expect(within(scrim).getByText('Senior Manager')).toBeInTheDocument()
    const overlay = screen.getByTestId('employee-card-overlay-content')
    expect(within(overlay).queryByText('Jane Smith')).not.toBeInTheDocument()
    expect(within(overlay).queryByText('Senior Manager')).not.toBeInTheDocument()
  })

  it('fades the bottom gradient out on desktop hover when contact exists', () => {
    renderCard()
    const gradient = screen.getByTestId('employee-card-gradient')
    expect(gradient).toHaveClass('bg-gradient-to-t', 'transition-opacity', 'duration-300', 'sm:group-hover:opacity-0')
  })

  it('keeps the bottom gradient static when no contact exists', () => {
    renderCard({ email: '', phone: '', mobile: '' })
    expect(screen.getByTestId('employee-card-gradient')).not.toHaveClass('sm:group-hover:opacity-0')
  })

  it('keeps the resting scrim name/title on top and never fades it on hover', () => {
    renderCard()
    const nameWrapper = screen.getByTestId('employee-card-name')
    expect(nameWrapper.parentElement).toHaveClass('pointer-events-none', 'z-10')
    expect(nameWrapper).not.toHaveClass('group-hover:opacity-0')
  })

  it('renders no overlay when no contact exists', () => {
    renderCard({ email: '', phone: '', mobile: '' })
    expect(screen.getByTestId('employee-card-name')).toBeInTheDocument()
    expect(screen.queryByTestId('employee-card-overlay-content')).not.toBeInTheDocument()
  })

  it('keeps the desktop contact list hidden until hover', () => {
    const { overlay } = renderCard()
    expect(overlay).toHaveClass(
      'hidden',
      'sm:block',
      'absolute',
      'inset-0',
      'opacity-0',
      'sm:group-hover:opacity-100',
      'sm:group-hover:pointer-events-auto'
    )
  })

  it('renders email as mailto link in the desktop list', () => {
    const { overlay } = renderCard()
    const link = within(overlay!).getByRole('link', { name: 'jane@example.com' })
    expect(link).toHaveAttribute('href', 'mailto:jane@example.com')
  })

  it('renders phone as tel link in the desktop list', () => {
    const { overlay } = renderCard()
    const link = within(overlay!).getByRole('link', { name: '+49 611 111111' })
    expect(link).toHaveAttribute('href', 'tel:+49 611 111111')
  })

  it('renders mobile as tel link in the desktop list', () => {
    const { overlay } = renderCard()
    const link = within(overlay!).getByRole('link', { name: '+49 171 222222' })
    expect(link).toHaveAttribute('href', 'tel:+49 171 222222')
  })

  it('renders Mail, Phone and Smartphone brand-yellow icons on the desktop links', () => {
    const { overlay } = renderCard()
    const icons = overlay!.querySelectorAll('svg')
    expect(icons.length).toBe(3)
    for (const icon of icons) {
      expect(icon).toHaveAttribute('class', expect.stringContaining('text-primary-yellow'))
    }
  })

  it('pins circular icon-only buttons on the right for mobile', () => {
    const { mobileButtons } = renderCard()
    const links = within(mobileButtons).getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(mobileButtons).toHaveClass('flex', 'flex-row', 'items-end', 'gap-2', 'pointer-events-auto', 'sm:hidden')
    for (const link of links) {
      expect(link).toHaveAttribute('class', expect.stringContaining('rounded-full'))
      expect(link).toHaveAttribute('class', expect.stringContaining('h-10'))
      expect(link).toHaveAttribute('class', expect.stringContaining('bg-primary-black/80'))
      expect(link.querySelector('svg')).toHaveAttribute('class', expect.stringContaining('text-primary-yellow'))
    }
  })

  it('mobile buttons link to mailto and tel targets with icon-only labels', () => {
    const { mobileButtons } = renderCard()
    const mail = within(mobileButtons).getByRole('link', { name: 'jane@example.com' })
    expect(mail).toHaveAttribute('href', 'mailto:jane@example.com')
    expect(mail.querySelector('svg')).not.toBeNull()
    const phoneLink = within(mobileButtons).getByRole('link', { name: '+49 611 111111' })
    expect(phoneLink).toHaveAttribute('href', 'tel:+49 611 111111')
    const mobileLink = within(mobileButtons).getByRole('link', { name: '+49 171 222222' })
    expect(mobileLink).toHaveAttribute('href', 'tel:+49 171 222222')
  })

  it('renders image when populated relationship is provided', () => {
    renderCard()
    const img = screen.getByAltText('Jane Smith')
    expect(img).toHaveAttribute('src', '/jane.jpg')
  })

  it('falls back to a UserRound icon placeholder when image is a numeric ID (unpopulated)', () => {
    renderCard({ image: 5 })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when image is null', () => {
    renderCard({ image: null })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when image URL is missing', () => {
    renderCard({ image: { id: 10, alt: 'Jane', updatedAt: '', createdAt: '' } })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when image URL is the /null artifact', () => {
    renderCard({ image: { id: 10, url: '/api/images/file/null', alt: 'Jane', updatedAt: '', createdAt: '' } })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('does not render email link when email is empty', () => {
    const { overlay } = renderCard({ email: '' })
    expect(within(overlay!).queryByRole('link', { name: 'jane@example.com' })).not.toBeInTheDocument()
  })

  it('does not render phone when phone is empty', () => {
    const { overlay } = renderCard({ phone: '' })
    expect(within(overlay!).queryByRole('link', { name: '+49 611 111111' })).not.toBeInTheDocument()
  })

  it('does not render mobile when mobile is empty', () => {
    const { overlay } = renderCard({ mobile: '' })
    expect(within(overlay!).queryByRole('link', { name: '+49 171 222222' })).not.toBeInTheDocument()
  })

  it('first card uses priority image loading', () => {
    renderCard({ priority: true })
    expect(screen.getByAltText('Jane Smith')).toBeInTheDocument()
  })

  it('applies grayscale class to image when grayscale prop is true', () => {
    renderCard({ grayscale: true })
    const img = screen.getByAltText('Jane Smith')
    expect(img).toHaveAttribute('class', expect.stringContaining('grayscale'))
  })

  it('omits grayscale class when grayscale prop is false', () => {
    renderCard()
    const img = screen.getByAltText('Jane Smith')
    expect(img).not.toHaveAttribute('class', expect.stringContaining('grayscale'))
  })
})
